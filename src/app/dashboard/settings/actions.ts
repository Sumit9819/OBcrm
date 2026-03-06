'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function getAdminUser(supabase: any) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: userData } = await supabase
        .from('users')
        .select('agency_id, role')
        .eq('id', user.id)
        .single()

    if (!userData) return null
    return { user, userData }
}

export async function updateAgencyProfile(formData: FormData) {
    const supabase = await createClient()
    const auth = await getAdminUser(supabase)
    if (!auth) return { error: 'Unauthorized' }
    if (!['super_admin', 'agency_admin'].includes(auth.userData.role)) return { error: 'Insufficient permissions' }

    const companyName = formData.get('companyName') as string

    const { error } = await supabase
        .from('agencies')
        .update({ company_name: companyName })
        .eq('id', auth.userData.agency_id)

    if (error) return { error: error.message }

    revalidatePath('/dashboard', 'layout')
    return { success: true }
}

export async function updateBranding(formData: FormData) {
    const supabase = await createClient()
    const auth = await getAdminUser(supabase)
    if (!auth) return { error: 'Unauthorized' }
    if (!['super_admin', 'agency_admin'].includes(auth.userData.role)) return { error: 'Insufficient permissions' }

    const primaryColor = formData.get('primaryColor') as string
    const sidebarColor = formData.get('sidebarColor') as string
    const sidebarTextColor = formData.get('sidebarTextColor') as string
    const showBrandName = formData.get('showBrandName') === 'true'

    const updates: Record<string, any> = {}
    if (primaryColor) updates.branding_primary_color = primaryColor
    if (sidebarColor) updates.sidebar_color = sidebarColor
    // Allow empty string to reset to auto-detect
    updates.sidebar_text_color = sidebarTextColor || null
    updates.show_brand_name = showBrandName

    const { error } = await supabase
        .from('agencies')
        .update(updates)
        .eq('id', auth.userData.agency_id)

    if (error) return { error: error.message }

    revalidatePath('/dashboard', 'layout')
    return { success: true }
}

export async function uploadLogo(formData: FormData) {
    const supabase = await createClient()
    const auth = await getAdminUser(supabase)
    if (!auth) return { error: 'Unauthorized' }
    if (!['super_admin', 'agency_admin'].includes(auth.userData.role)) return { error: 'Insufficient permissions' }

    const file = formData.get('logo') as File
    if (!file || file.size === 0) return { error: 'No file selected' }
    if (file.size > 2 * 1024 * 1024) return { error: 'File too large. Max size is 2MB.' }

    // Use dedicated public logos bucket
    const ext = file.name.split('.').pop()
    const filePath = `${auth.userData.agency_id}/logo_${Date.now()}.${ext}`

    // Remove old logo first (upsert)
    const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file, { upsert: true })

    if (uploadError) return { error: uploadError.message }

    const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath)

    const { error: updateError } = await supabase
        .from('agencies')
        .update({ logo_url: publicUrl })
        .eq('id', auth.userData.agency_id)

    if (updateError) return { error: updateError.message }

    revalidatePath('/dashboard', 'layout')
    return { success: true, url: publicUrl }
}

export async function connectDomain(formData: FormData) {
    const supabase = await createClient()
    const auth = await getAdminUser(supabase)
    if (!auth) return { error: 'Unauthorized' }
    if (!['super_admin', 'agency_admin'].includes(auth.userData.role)) return { error: 'Insufficient permissions' }

    const domain = formData.get('domain') as string
    if (!domain) return { error: 'Domain is required' }

    const { error } = await supabase
        .from('agencies')
        .update({ custom_domain: domain })
        .eq('id', auth.userData.agency_id)

    if (error) return { error: error.message }

    revalidatePath('/dashboard', 'layout')
    return { success: true }
}

export async function createEmployee(formData: FormData) {
    const supabase = await createClient()
    const auth = await getAdminUser(supabase)
    if (!auth) return { error: 'Unauthorized' }
    if (!['super_admin', 'agency_admin'].includes(auth.userData.role)) return { error: 'Insufficient permissions' }

    const email = formData.get('email') as string
    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string
    const role = formData.get('role') as string
    const position = formData.get('position') as string
    const department = formData.get('department') as string
    const phone = formData.get('phone') as string
    const joinDate = formData.get('joinDate') as string

    if (!email || !firstName) return { error: 'Name and email are required' }

    // Use admin client to create auth user
    const adminSupabase = createAdminClient()

    const { data: newUser, error: authError } = await adminSupabase.auth.admin.createUser({
        email,
        password: Math.random().toString(36).slice(-10) + 'A1!', // Temp password
        email_confirm: true,
        user_metadata: { first_name: firstName, last_name: lastName },
    })

    if (authError) return { error: authError.message }

    // Insert into users table
    const { error: profileError } = await adminSupabase
        .from('users')
        .insert({
            id: newUser.user.id,
            agency_id: auth.userData.agency_id,
            email,
            first_name: firstName,
            last_name: lastName,
            role: role || 'agent',
            position: position || null,
            department: department || null,
            phone: phone || null,
            join_date: joinDate || null,
        })

    if (profileError) {
        // Rollback: delete the auth user
        await adminSupabase.auth.admin.deleteUser(newUser.user.id)
        return { error: profileError.message }
    }

    // Send password reset email so employee can set their own password
    await adminSupabase.auth.admin.generateLink({
        type: 'recovery',
        email,
    })

    revalidatePath('/dashboard/settings/employees')
    return { success: true }
}

export async function updateEmployee(formData: FormData) {
    const supabase = await createClient()
    const auth = await getAdminUser(supabase)
    if (!auth) return { error: 'Unauthorized' }
    if (!['super_admin', 'agency_admin'].includes(auth.userData.role)) return { error: 'Insufficient permissions' }

    const id = formData.get('id') as string
    const role = formData.get('role') as string
    const position = formData.get('position') as string
    const department = formData.get('department') as string
    const phone = formData.get('phone') as string
    const joinDate = formData.get('joinDate') as string
    const status = formData.get('status') as string

    const { error } = await supabase
        .from('users')
        .update({
            role,
            position: position || null,
            department: department || null,
            phone: phone || null,
            join_date: joinDate || null,
            status: status || 'active',
        })
        .eq('id', id)
        .eq('agency_id', auth.userData.agency_id)

    if (error) return { error: error.message }

    revalidatePath('/dashboard/settings/employees')
    return { success: true }
}
