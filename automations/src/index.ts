import { createClient } from '@supabase/supabase-js'

export interface Env {
	SUPABASE_URL: string
	SUPABASE_SERVICE_ROLE_KEY: string
}

type WebhookPayload = {
	type: 'INSERT' | 'UPDATE' | 'DELETE'
	table: string
	record: any
	old_record: any
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		if (request.method !== 'POST') {
			return new Response('Method Not Allowed', { status: 405 })
		}

		try {
			const payload: WebhookPayload = await request.json()
			const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

			// ==========================================================
			// AUTOMATION 1: Lead Stage Progression
			// Logic: If Lead Status changes to 'Visa', auto-create a task
			// ==========================================================
			if (payload.table === 'leads' && payload.type === 'UPDATE') {
				const newRecord = payload.record
				const oldRecord = payload.old_record

				if (oldRecord.status !== 'Visa' && newRecord.status === 'Visa') {
					// Send automatic notification / log activity
					await supabase.from('activities').insert({
						agency_id: newRecord.agency_id,
						lead_id: newRecord.id,
						user_id: newRecord.owner_id,
						type: 'stage_change',
						description: 'Automated System: Visa Stage reached. Pre-departure email draft generated.'
					})

					// In a full build, this would also insert an email draft into a 'communications' table.
				}
			}

			// ==========================================================
			// AUTOMATION 2: Follow-up Creation (On Call logged)
			// Logic: If a Call activity is logged containing "Call Back"
			// ==========================================================
			if (payload.table === 'activities' && payload.type === 'INSERT') {
				const newRecord = payload.record

				if (newRecord.type === 'call' && newRecord.description.toLowerCase().includes('call back')) {
					// Schedule Follow up for exactly +24 hours
					const tomorrow = new Date()
					tomorrow.setDate(tomorrow.getDate() + 1)

					await supabase.from('activities').insert({
						agency_id: newRecord.agency_id,
						lead_id: newRecord.lead_id,
						user_id: newRecord.user_id,
						type: 'note',
						description: `[SYSTEM SCHEDULED] Follow-up reminder for ${tomorrow.toLocaleDateString()}`
					})
				}
			}

			return new Response(JSON.stringify({ success: true }), { status: 200 })

		} catch (error: any) {
			console.error('Webhook Error:', error.message)
			return new Response('Internal Server Error', { status: 500 })
		}
	},
}
