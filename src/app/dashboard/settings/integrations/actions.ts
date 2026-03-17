'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Fetch all integrations connected to the user's agency.
 */
export async function getAgencyIntegrations() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: 'Unauthorized' }

    // RLS will automatically restrict this to the user's agency_id
    const { data, error } = await supabase
        .from('agency_integrations')
        .select('*')
        .eq('is_active', true)

    if (error) {
        console.error('Error fetching integrations:', error)
        return { data: null, error: error.message }
    }

    return { data, error: null }
}

/**
 * Save or Update an integration
 */
export async function saveIntegration(
    provider: 'google' | 'whatsapp' | 'twilio',
    credentials: {
        accessToken?: string;
        refreshToken?: string;
        config?: any;
    }
) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // Get the user's agency_id explicitly to insert
    const { data: profile, error: profileErr } = await supabase
        .from('users')
        .select('agency_id')
        .eq('id', user.id)
        .single()

    if (profileErr || !profile?.agency_id) {
        return { error: 'Could not find your agency.' }
    }

    const { error: upsertError } = await supabase
        .from('agency_integrations')
        .upsert({
            agency_id: profile.agency_id,
            provider: provider,
            access_token: credentials.accessToken,
            refresh_token: credentials.refreshToken,
            config: credentials.config,
            is_active: true,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'agency_id, provider'
        })

    if (upsertError) {
        console.error(`Error saving ${provider} integration:`, upsertError)
        return { error: upsertError.message }
    }

    revalidatePath('/dashboard/settings/integrations')
    return { success: true }
}

/**
 * Disconnect an integration
 */
export async function removeIntegration(provider: 'google' | 'whatsapp' | 'twilio') {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: profile } = await supabase
        .from('users')
        .select('agency_id')
        .eq('id', user.id)
        .single()

    if (!profile?.agency_id) {
        return { error: 'Could not find your agency.' }
    }

    const { error } = await supabase
        .from('agency_integrations')
        .delete()
        .eq('agency_id', profile.agency_id)
        .eq('provider', provider)

    if (error) {
        console.error(`Error removing ${provider} integration:`, error)
        return { error: error.message }
    }

    revalidatePath('/dashboard/settings/integrations')
    return { success: true }
}
