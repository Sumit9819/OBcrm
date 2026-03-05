'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateAgencyProfile(formData: FormData) {
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

    const companyName = formData.get('companyName') as string

    const { error } = await supabase
        .from('agencies')
        .update({ company_name: companyName })
        .eq('id', userData.agency_id)

    if (error) return { error: error.message }

    revalidatePath('/dashboard/settings')
    return { success: true }
}

export async function updateBranding(formData: FormData) {
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

    const primaryColor = formData.get('primaryColor') as string
    const sidebarColor = formData.get('sidebarColor') as string

    const updates: any = {};
    if (primaryColor) updates.branding_primary_color = primaryColor;
    if (sidebarColor) updates.sidebar_color = sidebarColor;

    const { error } = await supabase
        .from('agencies')
        .update(updates)
        .eq('id', userData.agency_id)

    if (error) return { error: error.message }

    revalidatePath('/dashboard/settings')
    return { success: true }
}

export async function uploadLogo(formData: FormData) {
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

    const file = formData.get('logo') as File
    if (!file || file.size === 0) return { error: 'No file selected' }

    const filePath = `logos/${userData.agency_id}/${Date.now()}_${file.name}`
    const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

    if (uploadError) return { error: uploadError.message }

    const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

    const { error: updateError } = await supabase
        .from('agencies')
        .update({ logo_url: publicUrl })
        .eq('id', userData.agency_id)

    if (updateError) return { error: updateError.message }

    revalidatePath('/dashboard/settings')
    return { success: true }
}

export async function connectDomain(formData: FormData) {
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

    const domain = formData.get('domain') as string
    if (!domain) return { error: 'Domain is required' }

    const { error } = await supabase
        .from('agencies')
        .update({ custom_domain: domain })
        .eq('id', userData.agency_id)

    if (error) return { error: error.message }

    revalidatePath('/dashboard/settings')
    return { success: true }
}
