'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createAgency(formData: FormData) {
    const supabase = await createClient()

    // Verify caller is super_admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'super_admin') return { error: 'Unauthorized' }

    const companyName = formData.get('company_name') as string
    const slug = formData.get('slug') as string
    const subdomain = formData.get('subdomain') as string
    const customDomain = (formData.get('custom_domain') as string) || null
    const primaryColor = (formData.get('primary_color') as string) || '#6366f1'
    const plan = formData.get('plan') as string || 'starter'
    const timezone = formData.get('timezone') as string || 'UTC'
    const maxUsers = parseInt(formData.get('max_users') as string || '10', 10)
    const adminEmail = (formData.get('admin_email') as string) || null

    if (!companyName || !slug || !subdomain) {
        return { error: 'Company name, slug, and subdomain are required' }
    }

    // Check uniqueness
    const { data: existing } = await supabase
        .from('agencies')
        .select('id')
        .or(`slug.eq.${slug},subdomain.eq.${subdomain}${customDomain ? `,custom_domain.eq.${customDomain}` : ''}`)
        .maybeSingle()

    if (existing) {
        return { error: 'An agency with this slug, subdomain, or custom domain already exists' }
    }

    const { data: agency, error } = await supabase
        .from('agencies')
        .insert({
            company_name: companyName,
            slug,
            subdomain,
            custom_domain: customDomain,
            branding_primary_color: primaryColor,
            plan,
            timezone,
            max_users: maxUsers,
            is_active: true,
        })
        .select('id')
        .single()

    if (error) {
        return { error: error.message }
    }

    // Optionally create an invitation for the first admin
    if (adminEmail && agency) {
        await supabase.from('agency_invitations').insert({
            agency_id: agency.id,
            invited_by: user.id,
            email: adminEmail,
            role: 'agency_admin',
        })
    }

    revalidatePath('/admin/agencies')
    redirect(`/admin/agencies/${agency!.id}`)
}

export async function toggleAgencyStatus(agencyId: string, isActive: boolean) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'super_admin') return { error: 'Unauthorized' }

    const { error } = await supabase
        .from('agencies')
        .update({ is_active: isActive })
        .eq('id', agencyId)

    if (error) return { error: error.message }

    revalidatePath('/admin/agencies')
    return { success: true }
}
