'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type PaymentEvidence = {
    id: string
    amount: number
    currency: string
    paid_at: string
}

async function getPaidInvoiceEvidence(supabase: any, agencyId: string, leadId: string): Promise<PaymentEvidence | null> {
    const { data: paidInvoice, error } = await supabase
        .from('invoices')
        .select('id, amount, currency, paid_at, updated_at, created_at')
        .eq('agency_id', agencyId)
        .eq('lead_id', leadId)
        .eq('status', 'paid')
        .not('paid_at', 'is', null)
        .order('paid_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (error) {
        throw new Error(error.message)
    }

    if (paidInvoice) {
        return {
            id: paidInvoice.id,
            amount: Number(paidInvoice.amount || 0),
            currency: paidInvoice.currency || 'USD',
            paid_at: paidInvoice.paid_at,
        }
    }

    // Legacy fallback: older records may have status=paid with no paid_at.
    const { data: legacyPaidInvoice, error: legacyError } = await supabase
        .from('invoices')
        .select('id, amount, currency, paid_at, updated_at, created_at')
        .eq('agency_id', agencyId)
        .eq('lead_id', leadId)
        .eq('status', 'paid')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (legacyError) {
        throw new Error(legacyError.message)
    }

    if (!legacyPaidInvoice) return null

    const inferredPaidAt =
        legacyPaidInvoice.paid_at ||
        legacyPaidInvoice.updated_at ||
        legacyPaidInvoice.created_at ||
        new Date().toISOString()

    return {
        id: legacyPaidInvoice.id,
        amount: Number(legacyPaidInvoice.amount || 0),
        currency: legacyPaidInvoice.currency || 'USD',
        paid_at: inferredPaidAt,
    }
}

export async function updateLeadStatus(leadId: string, status: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: leadData } = await supabase.from('leads').select('agency_id, pipeline_id').eq('id', leadId).single()
    if (!leadData) return { error: 'Lead not found' }

    // Fetch the target stage to check document requirements
    const { data: targetStage } = await supabase
        .from('pipeline_stages')
        .select('id')
        .eq('agency_id', leadData.agency_id)
        .eq('pipeline_id', leadData.pipeline_id)
        .eq('name', status)
        .single()

    if (targetStage) {
        // Fetch mandatory document templates for this stage
        const { data: requiredDocs } = await supabase
            .from('document_templates')
            .select('name')
            .eq('stage_id', targetStage.id)
            .eq('is_mandatory', true)

        if (requiredDocs && requiredDocs.length > 0) {
            // Fetch uploaded documents for this lead
            const { data: uploadedDocs } = await supabase
                .from('documents')
                .select('name')
                .eq('lead_id', leadId)

            const uploadedDocNames = (uploadedDocs || []).map(d => d.name.toLowerCase())
            const missingDocs = requiredDocs.filter(t => !uploadedDocNames.includes(t.name.toLowerCase()))

            if (missingDocs.length > 0) {
                const missingNames = missingDocs.map(d => d.name).join(', ')
                return { error: `Cannot move to ${status}. Missing mandatory documents: ${missingNames}` }
            }
        }
    }

    const { data: userData } = await supabase.from('users').select('agency_id, role').eq('id', user.id).single()

    // Any path to Enrolled must satisfy the payment guard.
    if (status === 'Enrolled' && userData?.agency_id) {
        try {
            const evidence = await getPaidInvoiceEvidence(supabase, userData.agency_id, leadId)
            if (!evidence) {
                return {
                    error: 'PAYMENT_REQUIRED',
                    message: 'No paid invoice found for this lead. Please record payment first.',
                }
            }
        } catch (err: any) {
            return { error: err?.message || 'Failed to validate payment evidence' }
        }
    }

    const { error } = await supabase.from('leads').update({ status }).eq('id', leadId).eq('agency_id', userData?.agency_id)
    if (error) return { error: error.message }

    await supabase.from('activities').insert({
        agency_id: userData?.agency_id,
        lead_id: leadId,
        user_id: user.id,
        type: 'stage_change',
        description: `Status changed to ${status}`,
    })

    revalidatePath(`/dashboard/leads/${leadId}`)
    revalidatePath('/dashboard/leads/all')
    revalidatePath('/dashboard/leads/private')
    return { success: true }
}



export async function updateLead(leadId: string, data: {
    first_name?: string; last_name?: string; email?: string; phone?: string
    destination_country?: string; course_interest?: string
    is_shared_with_company?: boolean; nationality?: string; notes?: string
    lead_score?: number; next_followup_at?: string; ai_category?: 'Hot' | 'Warm' | 'Cold'
    custom_data?: Record<string, any>
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: userData } = await supabase.from('users').select('agency_id').eq('id', user.id).single()

    const { error } = await supabase.from('leads').update(data).eq('id', leadId).eq('agency_id', userData?.agency_id)
    if (error) return { error: error.message }

    revalidatePath(`/dashboard/leads/${leadId}`)
    revalidatePath('/dashboard/leads/all')
    return { success: true }
}

export async function addActivity(leadId: string, type: 'note' | 'call' | 'email', description: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: userData } = await supabase.from('users').select('agency_id').eq('id', user.id).single()

    const { error } = await supabase.from('activities').insert({
        agency_id: userData?.agency_id,
        lead_id: leadId,
        user_id: user.id,
        type,
        description,
    })
    if (error) return { error: error.message }

    revalidatePath(`/dashboard/leads/${leadId}`)
    return { success: true }
}

export async function archiveLead(leadId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: userData } = await supabase.from('users').select('agency_id').eq('id', user.id).single()

    const { error } = await supabase.from('leads').delete().eq('id', leadId).eq('agency_id', userData?.agency_id)
    if (error) return { error: error.message }

    revalidatePath('/dashboard/leads/all')
    revalidatePath('/dashboard/leads/private')
    return { success: true }
}

export async function assignLead(leadId: string, assignedTo: string | null) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }
    const { data: userData } = await supabase.from('users').select('agency_id').eq('id', user.id).single()

    const { error } = await supabase
        .from('leads')
        .update({ assigned_to: assignedTo || null })
        .eq('id', leadId)
        .eq('agency_id', userData?.agency_id)
    if (error) return { error: error.message }

    revalidatePath(`/dashboard/leads/${leadId}`)
    return { success: true }
}

export async function convertToStudent(
    leadId: string,
    studentType: 'abroad' | 'test_prep',
    overridePaymentCheck = false,
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: userData } = await supabase
        .from('users')
        .select('agency_id, role')
        .eq('id', user.id)
        .single()

    if (!userData?.agency_id) return { error: 'Could not load user profile' }

    const { data: leadData, error: leadErr } = await supabase
        .from('leads')
        .select('id, status, student_type, agency_id')
        .eq('id', leadId)
        .eq('agency_id', userData.agency_id)
        .single()

    if (leadErr || !leadData) return { error: 'Lead not found or unauthorized' }

    if (leadData.status === 'Enrolled') {
        return { error: 'Lead is already enrolled' }
    }

    const isAdmin = userData?.role === 'super_admin' || userData?.role === 'agency_admin'

    if (overridePaymentCheck && !isAdmin) {
        return { error: 'Only super_admin or agency_admin can bypass payment checks.' }
    }

    let paymentEvidence: PaymentEvidence | null = null

    // Payment gate: require paid invoice evidence unless admin is explicitly overriding.
    if (!overridePaymentCheck) {
        try {
            paymentEvidence = await getPaidInvoiceEvidence(supabase, userData.agency_id, leadId)
        } catch (err: any) {
            return { error: err?.message || 'Failed to validate payment evidence' }
        }

        if (!paymentEvidence) {
            return {
                error: 'PAYMENT_REQUIRED',
                message: 'No paid invoice found for this lead. Please record payment first before converting.',
            }
        }
    }

    // Set status to Enrolled and student_type
    const { error } = await supabase
        .from('leads')
        .update({ status: 'Enrolled', student_type: studentType })
        .eq('id', leadId)
        .eq('agency_id', userData.agency_id)
    if (error) return { error: error.message }

    const label = studentType === 'abroad' ? '🎓 Study Abroad Student' : '🔬 Test Prep Learner'
    const conversionMeta = {
        converted_by: user.id,
        override_used: overridePaymentCheck,
        payment_evidence: paymentEvidence
            ? {
                invoice_id: paymentEvidence.id,
                paid_at: paymentEvidence.paid_at,
                amount: paymentEvidence.amount,
                currency: paymentEvidence.currency,
            }
            : null,
    }

    // Log conversion activity
    const { data: activityData, error: activityErr } = await supabase.from('activities').insert({
        agency_id: userData.agency_id,
        lead_id: leadId,
        user_id: user.id,
        type: 'stage_change',
        description: `Lead converted to ${label}${overridePaymentCheck && isAdmin ? ' (Admin override — payment bypassed)' : ''}. Meta: ${JSON.stringify(conversionMeta)}`,
    }).select('id').single()

    if (activityErr) {
        const { error: rollbackError } = await supabase
            .from('leads')
            .update({ status: leadData.status, student_type: leadData.student_type || null })
            .eq('id', leadId)
            .eq('agency_id', userData.agency_id)

        if (rollbackError) {
            return {
                error: `Lead converted but audit log failed and rollback failed. Activity error: ${activityErr.message}. Rollback error: ${rollbackError.message}`,
            }
        }

        return { error: `Conversion audit log failed: ${activityErr.message}. Changes were rolled back.` }
    }

    let paymentRecordError: any = null
    if (paymentEvidence) {
        const { error } = await supabase
            .from('lead_payment_records')
            .upsert({
                agency_id: userData.agency_id,
                lead_id: leadId,
                invoice_id: paymentEvidence.id,
                amount: paymentEvidence.amount,
                currency: paymentEvidence.currency,
                paid_at: paymentEvidence.paid_at,
                source: 'invoice_paid',
                recorded_by: user.id,
            }, { onConflict: 'lead_id,invoice_id' })
        paymentRecordError = error
    } else if (overridePaymentCheck) {
        const { error } = await supabase
            .from('lead_payment_records')
            .insert({
                agency_id: userData.agency_id,
                lead_id: leadId,
                invoice_id: null,
                amount: 0,
                currency: 'USD',
                paid_at: new Date().toISOString(),
                source: 'manual_override',
                recorded_by: user.id,
            })
        paymentRecordError = error
    }

    if (paymentRecordError) {
        const { error: rollbackError } = await supabase
            .from('leads')
            .update({ status: leadData.status, student_type: leadData.student_type || null })
            .eq('id', leadId)
            .eq('agency_id', userData.agency_id)

        if (activityData?.id) {
            await supabase.from('activities').delete().eq('id', activityData.id).eq('agency_id', userData.agency_id)
        }

        if (rollbackError) {
            return {
                error: `Lead converted but payment record failed and rollback failed. Payment record error: ${paymentRecordError.message}. Rollback error: ${rollbackError.message}`,
            }
        }

        return { error: `Payment record creation failed: ${paymentRecordError.message}. Changes were rolled back.` }
    }

    revalidatePath(`/dashboard/leads/${leadId}`)
    revalidatePath('/dashboard/leads/all')
    revalidatePath('/dashboard/students')
    revalidatePath('/dashboard/learners')
    return { success: true }
}

export async function createLeadTask(leadId: string, data: {
    title: string; description?: string; due_date?: string; priority: string; assigned_to?: string
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: userData } = await supabase.from('users').select('agency_id').eq('id', user.id).single()
    if (!userData?.agency_id) return { error: 'Could not load profile' }

    const { error } = await supabase.from('tasks').insert({
        agency_id: userData.agency_id,
        lead_id: leadId,
        title: data.title,
        description: data.description || null,
        due_date: data.due_date || null,
        priority: data.priority,
        assigned_to: data.assigned_to || user.id,
        created_by: user.id,
        status: 'open',
    })
    if (error) return { error: error.message }

    revalidatePath(`/dashboard/leads/${leadId}`)
    revalidatePath('/dashboard/tasks')
    return { success: true }
}

export async function updateTaskStatus(taskId: string, status: 'open' | 'in_progress' | 'done') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: userData } = await supabase.from('users').select('agency_id').eq('id', user.id).single()

    const { error } = await supabase.from('tasks').update({ status, updated_at: new Date().toISOString() }).eq('id', taskId).eq('agency_id', userData?.agency_id)
    if (error) return { error: error.message }

    revalidatePath('/dashboard/tasks')
    return { success: true }
}

export async function getMatchingCourses(leadId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: lead } = await supabase
        .from('leads')
        .select('calculated_gpa, english_test_type, english_test_score')
        .eq('id', leadId)
        .single()

    if (!lead) return { error: 'Lead not found' }

    const { calculated_gpa, english_test_type, english_test_score } = lead

    // If no academics are set, return empty
    if (!calculated_gpa && !english_test_score) return { data: [] }

    let query = supabase
        .from('university_courses')
        .select(`
            *,
            universities (
                name,
                country
            )
        `)

    if (calculated_gpa) {
        // Find courses where the required GPA is <= the lead's GPA, or where no GPA is required
        query = query.or(`min_gpa_required.lte.${calculated_gpa},min_gpa_required.is.null`)
    }

    if (english_test_score && english_test_type) {
        if (english_test_type.toLowerCase() === 'ielts') {
            query = query.or(`min_ielts_required.lte.${english_test_score},min_ielts_required.is.null`)
        } else if (english_test_type.toLowerCase() === 'toefl') {
            query = query.or(`min_toefl_required.lte.${english_test_score},min_toefl_required.is.null`)
        } else if (english_test_type.toLowerCase() === 'pte') {
            query = query.or(`min_pte_required.lte.${english_test_score},min_pte_required.is.null`)
        }
    }

    try {
        const { data: courses, error } = await query

        if (error) return { data: [], error: error.message }
        return { data: courses, error: null }
    } catch (err: any) {
        console.error("Error matching courses:", err)
        return { data: [], error: err.message }
    }
}

export async function sendWhatsappMessage(leadId: string, message: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // Get user's agency explicitly
    const { data: profile } = await supabase.from('users').select('agency_id').eq('id', user.id).single()
    if (!profile?.agency_id) return { error: 'Agency not found' }

    // Get lead and verify access and get lead phone
    const { data: leadData } = await supabase
        .from('leads')
        .select('agency_id, phone, first_name, last_name')
        .eq('id', leadId)
        .eq('agency_id', profile.agency_id)
        .single()

    if (!leadData) return { error: 'Lead not found or unauthorized' }
    if (!leadData.phone) return { error: 'Lead does not have a phone number' }

    // Fetch WhatsApp integration for this agency
    const { data: integration } = await supabase
        .from('agency_integrations')
        .select('config')
        .eq('agency_id', profile.agency_id)
        .eq('provider', 'whatsapp')
        .eq('is_active', true)
        .single()

    if (!integration || !integration.config || !integration.config.systemToken || !integration.config.phoneId) {
        return { error: 'WhatsApp integration is not configured for your agency. Go to Settings > Integrations.' }
    }

    const { systemToken, phoneId } = integration.config

    // Format phone number (remove +, spaces, dashes - WhatsApp requires numbers only, including country code)
    const formattedPhone = leadData.phone.replace(/[^0-9]/g, '')

    try {
        const response = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${systemToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: formattedPhone,
                type: 'text',
                text: {
                    preview_url: false,
                    body: message
                }
            })
        })

        const data = await response.json()

        if (!response.ok) {
            console.error('WhatsApp API Error:', data)
            return { error: data.error?.message || 'Failed to send WhatsApp message via Meta API' }
        }

        // Log the activity
        await supabase
            .from('activities')
            .insert({
                lead_id: leadId,
                agency_id: profile.agency_id,
                user_id: user.id,
                type: 'note',
                description: `WhatsApp Message Sent: ${message}`,
            })

        // Log as Message for Unified Chat
        await supabase.from('messages').insert({
            agency_id: profile.agency_id,
            sender_id: user.id,
            lead_id: leadId,
            content: message,
            is_from_lead: false
        })

        revalidatePath(`/dashboard/leads/${leadId}`)
        return { success: true }
    } catch (err: any) {
        console.error('WhatsApp fetch error:', err)
        return { error: 'A network error occurred while sending the message' }
    }
}

export async function sendEmailMessage(leadId: string, subject: string, message: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Unauthorized' }
    }

    const { data: profile } = await supabase
        .from('users')
        .select('agency_id')
        .eq('id', user.id)
        .single()

    if (!profile?.agency_id) {
        return { error: 'No agency found for user' }
    }

    // Get the Google (Gmail) credentials
    const { data: integration } = await supabase
        .from('agency_integrations')
        .select('config')
        .eq('agency_id', profile.agency_id)
        .eq('provider', 'google')
        .single()

    if (!integration || !integration.config || !integration.config.email || !integration.config.appPassword) {
        return { error: 'Gmail is not configured for this agency. Please set it up in Integrations.' }
    }

    const { email: senderEmail, appPassword } = integration.config

    // Get the lead to fetch recipient email
    const { data: lead } = await supabase
        .from('leads')
        .select('email, first_name')
        .eq('id', leadId)
        .single()

    if (!lead) {
        return { error: 'Lead not found' }
    }

    if (!lead.email) {
        return { error: 'This lead does not have an email address.' }
    }

    try {
        const nodemailer = await import('nodemailer');

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: senderEmail,
                pass: appPassword
            }
        });

        // Send mail
        await transporter.sendMail({
            from: senderEmail,
            to: lead.email,
            subject: subject,
            text: message, // plain text body
            html: message.replace(/\n/g, '<br>'), // basic html body mapping
        });

        // Log the activity
        await supabase
            .from('activities')
            .insert({
                lead_id: leadId,
                agency_id: profile.agency_id,
                user_id: user.id,
                type: 'email',
                description: `Email Sent: ${subject}\n\n${message}`,
            })

        // Log as Message for Unified Chat
        await supabase.from('messages').insert({
            agency_id: profile.agency_id,
            sender_id: user.id,
            lead_id: leadId,
            content: `Subject: ${subject}\n\n${message}`,
            is_from_lead: false
        })

        revalidatePath(`/dashboard/leads/${leadId}`)
        return { success: true }
    } catch (err: any) {
        console.error('Email sending error:', err)
        return { error: err.message || 'A network error occurred while sending the email' }
    }
}

export async function sendSmsMessage(leadId: string, message: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: profile } = await supabase
        .from('users')
        .select('agency_id')
        .eq('id', user.id)
        .single()

    if (!profile?.agency_id) return { error: 'Agency not found' }

    const { data: leadData } = await supabase
        .from('leads')
        .select('id, phone, first_name, last_name, agency_id')
        .eq('id', leadId)
        .eq('agency_id', profile.agency_id)
        .single()

    if (!leadData) return { error: 'Lead not found or unauthorized' }
    if (!leadData.phone) return { error: 'Lead does not have a phone number' }

    const { data: integration } = await supabase
        .from('agency_integrations')
        .select('config')
        .eq('agency_id', profile.agency_id)
        .eq('provider', 'twilio')
        .eq('is_active', true)
        .single()

    const accountSid = integration?.config?.accountSid
    const authToken = integration?.config?.authToken
    const fromNumber = integration?.config?.fromNumber

    if (!accountSid || !authToken || !fromNumber) {
        return { error: 'Twilio is not configured for your agency. Go to Settings > Integrations.' }
    }

    const toPhone = leadData.phone

    try {
        const body = new URLSearchParams({
            To: toPhone,
            From: fromNumber,
            Body: message,
        })

        const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
        const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${authHeader}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
        })

        const data = await response.json()

        if (!response.ok) {
            await supabase.from('sms_logs').insert({
                agency_id: profile.agency_id,
                lead_id: leadId,
                sender_user_id: user.id,
                to_phone: toPhone,
                from_phone: fromNumber,
                provider: 'twilio',
                direction: 'outbound',
                status: 'failed',
                message: message,
                error_message: data?.message || 'Twilio API error',
            })

            return { error: data?.message || 'Failed to send SMS via Twilio' }
        }

        await supabase.from('sms_logs').insert({
            agency_id: profile.agency_id,
            lead_id: leadId,
            sender_user_id: user.id,
            to_phone: toPhone,
            from_phone: fromNumber,
            provider: 'twilio',
            direction: 'outbound',
            status: data?.status || 'sent',
            message_sid: data?.sid || null,
            message,
        })

        await supabase.from('activities').insert({
            lead_id: leadId,
            agency_id: profile.agency_id,
            user_id: user.id,
            type: 'note',
            description: `SMS Sent: ${message}`,
        })

        await supabase.from('messages').insert({
            agency_id: profile.agency_id,
            sender_id: user.id,
            lead_id: leadId,
            content: `[SMS] ${message}`,
            is_from_lead: false,
        })

        revalidatePath(`/dashboard/leads/${leadId}`)
        return { success: true }
    } catch (err: any) {
        console.error('SMS sending error:', err)
        return { error: err?.message || 'A network error occurred while sending SMS' }
    }
}
