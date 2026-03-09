'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createBatch(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: userData } = await supabase
        .from('users')
        .select('agency_id, role')
        .eq('id', user.id)
        .single()

    if (!userData || !['super_admin', 'agency_admin'].includes(userData.role)) {
        return { error: 'Insufficient permissions' }
    }

    const { error } = await supabase.from('batches').insert({
        agency_id: userData.agency_id,
        name: formData.get('name') as string,
        type: formData.get('type') as string || 'General',
        start_date: formData.get('startDate') as string || null,
        end_date: formData.get('endDate') as string || null,
        max_students: parseInt(formData.get('maxStudents') as string) || 30,
    })

    if (error) return { error: error.message }

    revalidatePath('/dashboard/classes')
    return { success: true }
}

export async function enrollStudent(batchId: string, leadId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: userData } = await supabase.from('users').select('agency_id').eq('id', user.id).single()

    // Assuming batch_enrollments can have agency_id implicitly via batch, 
    // but checking if the lead belongs to the agency is safer.
    const { data: lead } = await supabase.from('leads').select('id').eq('id', leadId).eq('agency_id', userData?.agency_id).single()
    if (!lead) return { error: 'Lead not found or unauthorized' }

    const { error } = await supabase.from('batch_enrollments').insert({
        batch_id: batchId,
        lead_id: leadId,
    })

    if (error) return { error: error.message }

    revalidatePath('/dashboard/classes')
    return { success: true }
}

export async function deleteBatch(batchId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: userData } = await supabase.from('users').select('agency_id').eq('id', user.id).single()

    const { error } = await supabase
        .from('batches')
        .delete()
        .eq('id', batchId)
        .eq('agency_id', userData?.agency_id)

    if (error) return { error: error.message }

    revalidatePath('/dashboard/classes')
    return { success: true }
}
