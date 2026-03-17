import { createClient } from '@supabase/supabase-js'

export interface Env {
	SUPABASE_URL: string
	SUPABASE_SERVICE_ROLE_KEY: string
}

type DbRecord = Record<string, unknown>

type WebhookPayload = {
	type: 'INSERT' | 'UPDATE' | 'DELETE'
	table: string
	record: DbRecord | null
	old_record: DbRecord | null
}

type LeadContacts = {
	ownerId?: string
	assignedTo?: string
	agencyId?: string
	email?: string
	name?: string
}

const trackedLeadStatuses = new Set(['Applied', 'Visa Filed', 'Visa Approved', 'Visa Denied', 'Enrolled', 'Lost'])
const trackedApplicationStatuses = new Set([
	'Applied',
	'Conditional Offer',
	'Unconditional Offer',
	'Visa Filed',
	'Visa Approved',
	'Visa Denied',
	'Enrolled',
	'Rejected',
	'Withdrawn',
])
const trackedInvoiceStatuses = new Set(['sent', 'paid', 'overdue', 'cancelled'])

function asString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined
	const trimmed = value.trim()
	return trimmed.length > 0 ? trimmed : undefined
}

function asDate(value: unknown): Date | undefined {
	const text = asString(value)
	if (!text) return undefined
	const date = new Date(text)
	if (Number.isNaN(date.getTime())) return undefined
	return date
}

function leadDisplayName(record: DbRecord | null | undefined): string {
	if (!record) return 'Lead'
	const first = asString(record.first_name)
	const last = asString(record.last_name)
	const full = [first, last].filter(Boolean).join(' ').trim()
	return full || asString(record.email) || 'Lead'
}

function leadLink(leadId: string | undefined): string {
	return leadId ? `/dashboard/leads/${leadId}` : '/dashboard/leads'
}

function appLink(applicationId: string | undefined): string {
	return applicationId ? `/dashboard/applications/${applicationId}` : '/dashboard/applications'
}

function invoiceLink(invoiceId: string | undefined): string {
	return invoiceId ? `/dashboard/finances/invoices/${invoiceId}` : '/dashboard/finances'
}

async function insertActivity(
	supabase: any,
	activity: { agencyId?: string; leadId?: string; userId?: string; type: string; description: string }
): Promise<void> {
	if (!activity.agencyId || !activity.leadId || !activity.userId) return
	const { error } = await supabase.from('activities').insert({
		agency_id: activity.agencyId,
		lead_id: activity.leadId,
		user_id: activity.userId,
		type: activity.type,
		description: activity.description,
	})
	if (error) {
		console.error('Failed to insert activity', error.message)
	}
}

async function insertNotificationOnce(
	supabase: any,
	notification: {
		agencyId?: string
		userId?: string
		title: string
		message: string
		type: string
		link: string
	}
): Promise<void> {
	if (!notification.agencyId || !notification.userId) return

	const dedupeSince = new Date(Date.now() - 5 * 60 * 1000).toISOString()
	const { data: existing, error: existingError } = await supabase
		.from('notifications')
		.select('id')
		.eq('agency_id', notification.agencyId)
		.eq('user_id', notification.userId)
		.eq('type', notification.type)
		.eq('title', notification.title)
		.eq('message', notification.message)
		.eq('link', notification.link)
		.gte('created_at', dedupeSince)
		.limit(1)

	if (existingError) {
		console.error('Failed to check notification dedupe', existingError.message)
		return
	}

	if (existing && existing.length > 0) return

	const { error } = await supabase.from('notifications').insert({
		agency_id: notification.agencyId,
		user_id: notification.userId,
		title: notification.title,
		message: notification.message,
		type: notification.type,
		link: notification.link,
	})

	if (error) {
		console.error('Failed to insert notification', error.message)
	}
}

async function getLeadContacts(
	supabase: any,
	leadId: string | undefined
): Promise<LeadContacts> {
	if (!leadId) return {}
	const { data, error } = await supabase
		.from('leads')
		.select('owner_id, assigned_to, agency_id, email, first_name, last_name')
		.eq('id', leadId)
		.maybeSingle()

	if (error || !data) {
		if (error) console.error('Failed to fetch lead contacts', error.message)
		return {}
	}

	return {
		ownerId: asString(data.owner_id),
		assignedTo: asString(data.assigned_to),
		agencyId: asString(data.agency_id),
		email: asString(data.email),
		name: [asString(data.first_name), asString(data.last_name)].filter(Boolean).join(' ').trim() || 'Student',
	}
}

async function insertEmailAutomationLog(
	supabase: any,
	entry: {
		agencyId?: string
		leadId?: string
		senderUserId?: string
		toEmail?: string
		subject: string
		message: string
		status?: string
	}
): Promise<void> {
	if (!entry.agencyId || !entry.toEmail || !entry.leadId) return

	const { error } = await supabase.from('email_logs').insert({
		agency_id: entry.agencyId,
		lead_id: entry.leadId,
		sender_user_id: entry.senderUserId || null,
		to_email: entry.toEmail,
		subject: entry.subject,
		message: entry.message,
		provider: 'automation',
		direction: 'outbound',
		status: entry.status || 'triggered',
	})

	if (error) {
		console.error('Failed to insert email automation log', error.message)
	}
}

async function handleLeadInsert(supabase: any, record: DbRecord): Promise<void> {
	const leadId = asString(record.id)
	const agencyId = asString(record.agency_id)
	const ownerId = asString(record.owner_id)
	const assignedTo = asString(record.assigned_to)
	const leadName = leadDisplayName(record)

	if (ownerId) {
		await insertActivity(supabase, {
			agencyId,
			leadId,
			userId: ownerId,
			type: 'note',
			description: `Automated System: New lead ${leadName} entered the pipeline.`,
		})
	}

	if (assignedTo) {
		await insertNotificationOnce(supabase, {
			agencyId,
			userId: assignedTo,
			type: 'lead_assignment',
			title: 'New Lead Assigned',
			message: `${leadName} has been assigned to you.`,
			link: leadLink(leadId),
		})
	}
}

async function handleLeadUpdate(
	supabase: any,
	newRecord: DbRecord,
	oldRecord: DbRecord
): Promise<void> {
	const leadId = asString(newRecord.id)
	const agencyId = asString(newRecord.agency_id)
	const ownerId = asString(newRecord.owner_id)
	const assignedTo = asString(newRecord.assigned_to)
	const oldAssignedTo = asString(oldRecord.assigned_to)
	const leadName = leadDisplayName(newRecord)

	const newStatus = asString(newRecord.status)
	const oldStatus = asString(oldRecord.status)
	if (newStatus && oldStatus !== newStatus) {
		const actor = assignedTo || ownerId
		await insertActivity(supabase, {
			agencyId,
			leadId,
			userId: actor,
			type: 'stage_change',
			description: `Automated System: Lead status changed from ${oldStatus || 'Unknown'} to ${newStatus}.`,
		})

		if (trackedLeadStatuses.has(newStatus)) {
			for (const userId of [assignedTo, ownerId]) {
				await insertNotificationOnce(supabase, {
					agencyId,
					userId,
					type: 'lead_milestone',
					title: `Lead moved to ${newStatus}`,
					message: `${leadName} reached the ${newStatus} stage.`,
					link: leadLink(leadId),
				})
			}
		}

		if (newStatus === 'Visa Approved') {
			const contacts = await getLeadContacts(supabase, leadId)
			await insertEmailAutomationLog(supabase, {
				agencyId: contacts.agencyId,
				leadId,
				senderUserId: actor,
				toEmail: contacts.email,
				subject: 'Visa Approved - Next Steps',
				message: `${contacts.name || leadName}, your visa status is now approved. Please check your dashboard for next steps.`,
			})
		}
	}

	if (assignedTo && assignedTo !== oldAssignedTo) {
		await insertNotificationOnce(supabase, {
			agencyId,
			userId: assignedTo,
			type: 'lead_assignment',
			title: 'Lead Assignment Updated',
			message: `${leadName} is now assigned to you.`,
			link: leadLink(leadId),
		})

		await insertActivity(supabase, {
			agencyId,
			leadId,
			userId: assignedTo,
			type: 'note',
			description: 'Automated System: Lead ownership assignment updated.',
		})
	}

	const newFollowup = asDate(newRecord.next_followup_at)
	const oldFollowup = asDate(oldRecord.next_followup_at)
	if (newFollowup && newFollowup.getTime() !== oldFollowup?.getTime()) {
		const isOverdue = newFollowup.getTime() < Date.now()
		for (const userId of [assignedTo, ownerId]) {
			await insertNotificationOnce(supabase, {
				agencyId,
				userId,
				type: isOverdue ? 'followup_overdue' : 'followup',
				title: isOverdue ? 'Follow-up Overdue' : 'Follow-up Scheduled',
				message: isOverdue
					? `${leadName} has an overdue follow-up.`
					: `${leadName} follow-up is scheduled for ${newFollowup.toLocaleString()}.`,
				link: leadLink(leadId),
			})
		}
	}
}

async function handleActivityInsert(supabase: any, record: DbRecord): Promise<void> {
	const activityType = asString(record.type)?.toLowerCase()
	const description = asString(record.description)?.toLowerCase()
	if (!activityType || !description) return

	if (activityType === 'call' && description.includes('call back')) {
		const tomorrow = new Date()
		tomorrow.setDate(tomorrow.getDate() + 1)

		await insertActivity(supabase, {
			agencyId: asString(record.agency_id),
			leadId: asString(record.lead_id),
			userId: asString(record.user_id),
			type: 'note',
			description: `[SYSTEM SCHEDULED] Follow-up reminder for ${tomorrow.toLocaleDateString()}`,
		})
	}
}

async function handleApplicationInsert(supabase: any, record: DbRecord): Promise<void> {
	const leadId = asString(record.lead_id)
	const contacts = await getLeadContacts(supabase, leadId)
	const university = asString(record.university_name) || 'University'
	const course = asString(record.course_name) || 'Course'

	await insertActivity(supabase, {
		agencyId: contacts.agencyId,
		leadId,
		userId: contacts.assignedTo || contacts.ownerId,
		type: 'note',
		description: `Automated System: Application created for ${university} (${course}).`,
	})

	for (const userId of [contacts.assignedTo, contacts.ownerId]) {
		await insertNotificationOnce(supabase, {
			agencyId: contacts.agencyId,
			userId,
			type: 'application_update',
			title: 'Application Created',
			message: `${university} application has been created for this lead.`,
			link: appLink(asString(record.id)),
		})
	}

	await insertEmailAutomationLog(supabase, {
		agencyId: contacts.agencyId,
		leadId,
		senderUserId: contacts.assignedTo || contacts.ownerId,
		toEmail: contacts.email,
		subject: 'Application Submitted',
		message: `Your application for ${university} (${course}) has been submitted.`,
	})
}

async function handleApplicationUpdate(
	supabase: any,
	newRecord: DbRecord,
	oldRecord: DbRecord
): Promise<void> {
	const newStatus = asString(newRecord.status)
	const oldStatus = asString(oldRecord.status)
	if (!newStatus || oldStatus === newStatus || !trackedApplicationStatuses.has(newStatus)) return

	const leadId = asString(newRecord.lead_id)
	const contacts = await getLeadContacts(supabase, leadId)

	await insertActivity(supabase, {
		agencyId: contacts.agencyId,
		leadId,
		userId: contacts.assignedTo || contacts.ownerId,
		type: 'stage_change',
		description: `Automated System: Application status changed from ${oldStatus || 'Unknown'} to ${newStatus}.`,
	})

	for (const userId of [contacts.assignedTo, contacts.ownerId]) {
		await insertNotificationOnce(supabase, {
			agencyId: contacts.agencyId,
			userId,
			type: 'application_milestone',
			title: `Application moved to ${newStatus}`,
			message: `Application status is now ${newStatus}.`,
			link: appLink(asString(newRecord.id)),
		})
	}

	if (newStatus.toLowerCase().includes('offer')) {
		await insertEmailAutomationLog(supabase, {
			agencyId: contacts.agencyId,
			leadId,
			senderUserId: contacts.assignedTo || contacts.ownerId,
			toEmail: contacts.email,
			subject: 'Offer Letter Update',
			message: `Your application has reached ${newStatus}. Please review your offer details with the team.`,
		})
	}
}

async function handleInvoiceInsert(supabase: any, record: DbRecord): Promise<void> {
	const status = asString(record.status)
	if (status !== 'sent') return

	const leadId = asString(record.lead_id)
	const contacts = await getLeadContacts(supabase, leadId)
	const amount = asString(record.amount) || '0'
	const currency = asString(record.currency) || 'USD'

	for (const userId of [contacts.assignedTo, contacts.ownerId, asString(record.created_by)]) {
		await insertNotificationOnce(supabase, {
			agencyId: contacts.agencyId || asString(record.agency_id),
			userId,
			type: 'invoice_update',
			title: 'Invoice Sent',
			message: `Invoice of ${amount} ${currency} has been sent.`,
			link: invoiceLink(asString(record.id)),
		})
	}

	await insertEmailAutomationLog(supabase, {
		agencyId: contacts.agencyId || asString(record.agency_id),
		leadId,
		senderUserId: asString(record.created_by) || contacts.assignedTo || contacts.ownerId,
		toEmail: contacts.email,
		subject: 'Invoice Generated',
		message: `A new invoice of ${amount} ${currency} has been generated for your application.`,
	})
}

async function handleInvoiceUpdate(
	supabase: any,
	newRecord: DbRecord,
	oldRecord: DbRecord
): Promise<void> {
	const newStatus = asString(newRecord.status)
	const oldStatus = asString(oldRecord.status)
	if (!newStatus || oldStatus === newStatus || !trackedInvoiceStatuses.has(newStatus)) return

	const leadId = asString(newRecord.lead_id)
	const contacts = await getLeadContacts(supabase, leadId)

	await insertActivity(supabase, {
		agencyId: contacts.agencyId || asString(newRecord.agency_id),
		leadId,
		userId: contacts.assignedTo || contacts.ownerId,
		type: 'note',
		description: `Automated System: Invoice status changed from ${oldStatus || 'Unknown'} to ${newStatus}.`,
	})

	for (const userId of [contacts.assignedTo, contacts.ownerId, asString(newRecord.created_by)]) {
		await insertNotificationOnce(supabase, {
			agencyId: contacts.agencyId || asString(newRecord.agency_id),
			userId,
			type: 'invoice_milestone',
			title: `Invoice marked ${newStatus}`,
			message: `Invoice status is now ${newStatus}.`,
			link: invoiceLink(asString(newRecord.id)),
		})
	}

	if (newStatus === 'paid') {
		const amount = asString(newRecord.amount) || '0'
		const currency = asString(newRecord.currency) || 'USD'
		await insertEmailAutomationLog(supabase, {
			agencyId: contacts.agencyId || asString(newRecord.agency_id),
			leadId,
			senderUserId: asString(newRecord.created_by) || contacts.assignedTo || contacts.ownerId,
			toEmail: contacts.email,
			subject: 'Payment Confirmation',
			message: `Payment of ${amount} ${currency} has been received and confirmed.`,
			status: 'sent',
		})
	}
}

async function processWebhook(supabase: any, payload: WebhookPayload): Promise<void> {
	const record = payload.record
	const oldRecord = payload.old_record

	if (payload.table === 'leads' && payload.type === 'INSERT' && record) {
		await handleLeadInsert(supabase, record)
		return
	}

	if (payload.table === 'leads' && payload.type === 'UPDATE' && record && oldRecord) {
		await handleLeadUpdate(supabase, record, oldRecord)
		return
	}

	if (payload.table === 'activities' && payload.type === 'INSERT' && record) {
		await handleActivityInsert(supabase, record)
		return
	}

	if (payload.table === 'applications' && payload.type === 'INSERT' && record) {
		await handleApplicationInsert(supabase, record)
		return
	}

	if (payload.table === 'applications' && payload.type === 'UPDATE' && record && oldRecord) {
		await handleApplicationUpdate(supabase, record, oldRecord)
		return
	}

	if (payload.table === 'invoices' && payload.type === 'INSERT' && record) {
		await handleInvoiceInsert(supabase, record)
		return
	}

	if (payload.table === 'invoices' && payload.type === 'UPDATE' && record && oldRecord) {
		await handleInvoiceUpdate(supabase, record, oldRecord)
	}
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		if (request.method !== 'POST') {
			return new Response('Method Not Allowed', { status: 405 })
		}

		try {
			const payload: WebhookPayload = await request.json()
			const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

			ctx.waitUntil(processWebhook(supabase, payload))

			console.log(
				JSON.stringify({
					event: 'automation_webhook_received',
					table: payload.table,
					type: payload.type,
					record_id: asString(payload.record?.id),
				})
			)

			return new Response(JSON.stringify({ success: true, queued: true }), { status: 200 })
		} catch (error: any) {
			console.error('Webhook Error:', error.message)
			return new Response('Internal Server Error', { status: 500 })
		}
	},
}
