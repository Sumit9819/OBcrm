'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function savePartner(data: {
    id?: string;
    name: string;
    country?: string;
    website?: string;
    base_commission_rate?: number;
    partner_type: string;
    pipeline_id?: string;
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Unauthorized" }

    const { data: userData } = await supabase
        .from('users')
        .select('agency_id, role')
        .eq('id', user.id)
        .single()

    if (!userData) return { error: "User profile not found" }
    if (userData.role !== 'super_admin' && userData.role !== 'agency_admin') {
        return { error: "Only admins can manage partners" }
    }

    const payload = {
        agency_id: userData.agency_id,
        name: data.name,
        country: data.country || null,
        website: data.website || null,
        base_commission_rate: data.base_commission_rate !== undefined ? data.base_commission_rate : null,
        partner_type: data.partner_type,
        pipeline_id: data.pipeline_id || null,
    }

    if (data.id) {
        const { error } = await supabase
            .from('universities')
            .update(payload)
            .eq('id', data.id)
            .eq('agency_id', userData.agency_id)
        if (error) return { error: error.message }
    } else {
        const { error } = await supabase
            .from('universities')
            .insert(payload)
        if (error) return { error: error.message }
    }

    revalidatePath('/dashboard/settings/partners')
    return { success: true }
}

export async function deletePartner(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Unauthorized" }

    const { data: userData } = await supabase.from('users').select('agency_id, role').eq('id', user.id).single()
    if (!userData || (userData.role !== 'super_admin' && userData.role !== 'agency_admin')) {
        return { error: "Unauthorized" }
    }

    const { error } = await supabase
        .from('universities')
        .delete()
        .eq('id', id)
        .eq('agency_id', userData.agency_id)

    if (error) return { error: error.message }

    revalidatePath('/dashboard/settings/partners')
    return { success: true }
}

export async function saveCourse(data: {
    id?: string;
    university_id: string;
    name: string;
    level?: string;
    intake_months?: string[];
    tuition_fee?: number;
    currency?: string;
    min_gpa_required?: number;
    min_ielts_required?: number;
    min_pte_required?: number;
    min_toefl_required?: number;
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Unauthorized" }

    const { data: userData } = await supabase.from('users').select('agency_id, role').eq('id', user.id).single()
    if (!userData || (userData.role !== 'super_admin' && userData.role !== 'agency_admin')) {
        return { error: "Only admins can manage courses" }
    }

    const payload = {
        agency_id: userData.agency_id,
        university_id: data.university_id,
        name: data.name,
        level: data.level || null,
        intake_months: data.intake_months || [],
        tuition_fee: data.tuition_fee || null,
        currency: data.currency || 'USD',
        min_gpa_required: data.min_gpa_required !== undefined ? data.min_gpa_required : null,
        min_ielts_required: data.min_ielts_required !== undefined ? data.min_ielts_required : null,
        min_pte_required: data.min_pte_required !== undefined ? data.min_pte_required : null,
        min_toefl_required: data.min_toefl_required !== undefined ? data.min_toefl_required : null,
    }

    if (data.id) {
        const { error } = await supabase.from('university_courses').update(payload).eq('id', data.id).eq('agency_id', userData.agency_id)
        if (error) return { error: error.message }
    } else {
        const { error } = await supabase.from('university_courses').insert(payload)
        if (error) return { error: error.message }
    }

    revalidatePath(`/dashboard/settings/partners/${data.university_id}`)
    return { success: true }
}

export async function deleteCourse(id: string, universityId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Unauthorized" }

    const { data: userData } = await supabase.from('users').select('agency_id, role').eq('id', user.id).single()
    if (!userData || (userData.role !== 'super_admin' && userData.role !== 'agency_admin')) {
        return { error: "Unauthorized" }
    }

    const { error } = await supabase.from('university_courses').delete().eq('id', id).eq('agency_id', userData.agency_id)
    if (error) return { error: error.message }

    revalidatePath(`/dashboard/settings/partners/${universityId}`)
    return { success: true }
}
