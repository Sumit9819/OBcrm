'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateLeadStatus(leadId: string, status: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: userData } = await supabase.from('users').select('agency_id').eq('id', user.id).single()

    const { error } = await supabase.from('leads').update({ status }).eq('id', leadId)
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
    custom_data?: Record<string, any>
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { error } = await supabase.from('leads').update(data).eq('id', leadId)
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

    const { error } = await supabase.from('leads').delete().eq('id', leadId)
    if (error) return { error: error.message }

    revalidatePath('/dashboard/leads/all')
    revalidatePath('/dashboard/leads/private')
    return { success: true }
}

export async function assignLead(leadId: string, assignedTo: string | null) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { error } = await supabase
        .from('leads')
        .update({ assigned_to: assignedTo || null })
        .eq('id', leadId)
    if (error) return { error: error.message }

    revalidatePath(`/dashboard/leads/${leadId}`)
    return { success: true }
}

export async function convertToStudent(leadId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: userData } = await supabase.from('users').select('agency_id').eq('id', user.id).single()

    // Set status to Enrolled (triggers commission if applicable)
    const { error } = await supabase
        .from('leads')
        .update({ status: 'Enrolled' })
        .eq('id', leadId)
    if (error) return { error: error.message }

    // Log conversion activity
    await supabase.from('activities').insert({
        agency_id: userData?.agency_id,
        lead_id: leadId,
        user_id: user.id,
        type: 'stage_change',
        description: '🎓 Lead converted to enrolled student',
    })

    revalidatePath(`/dashboard/leads/${leadId}`)
    revalidatePath('/dashboard/leads/all')
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

    const { error } = await supabase.from('tasks').update({ status, updated_at: new Date().toISOString() }).eq('id', taskId)
    if (error) return { error: error.message }

    revalidatePath('/dashboard/tasks')
    return { success: true }
}
