'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const invoiceSchema = z.object({
    leadId: z.string().optional(),
    universityId: z.string().optional(),
    type: z.enum(['student_tuition', 'student_visa', 'student_service', 'university_commission']),
    amount: z.coerce.number().positive("Amount must be positive"),
    currency: z.string().default('USD'),
    dueDate: z.string(),
    notes: z.string().optional(),
})

export async function createInvoice(prevState: any, formData: FormData) {
    const supabase = await createClient()

    // Verify auth & permissions
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: userData } = await supabase
        .from('users')
        .select('agency_id, role')
        .eq('id', user.id)
        .single()

    if (!userData || !['super_admin', 'agency_admin', 'accountant'].includes(userData.role)) {
        return { error: 'Insufficient permissions' }
    }

    // Parse and validate
    const rawData = {
        leadId: formData.get('leadId') || undefined,
        universityId: formData.get('universityId') || undefined,
        type: formData.get('type'),
        amount: formData.get('amount'),
        currency: formData.get('currency'),
        dueDate: formData.get('dueDate'),
        notes: formData.get('notes') || undefined,
    }

    const validatedFields = invoiceSchema.safeParse(rawData)

    if (!validatedFields.success) {
        return {
            error: 'Validation failed',
            fields: validatedFields.error.flatten().fieldErrors,
        }
    }

    const data = validatedFields.data

    // Insert Record
    const { error } = await supabase
        .from('invoices')
        .insert({
            agency_id: userData.agency_id,
            created_by: user.id,
            lead_id: data.leadId,
            university_id: data.universityId,
            type: data.type,
            amount: data.amount,
            currency: data.currency,
            due_date: data.dueDate,
            notes: data.notes,
            status: 'sent' // Automatically assume 'sent' for 1-click generation MVP
        })

    if (error) {
        console.error("Invoice Creation Error:", error)
        return { error: 'Failed to generate invoice: ' + error.message }
    }

    revalidatePath('/dashboard/finances')
    return { success: true }
}

export async function verifyPayment(invoiceId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: userData } = await supabase.from('users').select('agency_id').eq('id', user.id).single()

    // Update invoice status to paid
    const { error } = await supabase
        .from('invoices')
        .update({
            status: 'paid',
            paid_at: new Date().toISOString()
        })
        .eq('id', invoiceId)
        .eq('agency_id', userData?.agency_id)

    if (error) {
        console.error("Payment Verification Error:", error)
        return { error: 'Failed to verify payment: ' + error.message }
    }

    revalidatePath('/dashboard/finances')
    return { success: true }
}
