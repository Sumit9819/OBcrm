import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AgencyDetailClient from './agency-detail-client'

export default async function AgencyDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    const { data: agency } = await supabase
        .from('agencies')
        .select('*')
        .eq('id', id)
        .single()

    if (!agency) notFound()

    const { data: users } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, role, created_at')
        .eq('agency_id', id)
        .order('created_at', { ascending: false })

    const { data: invitations } = await supabase
        .from('agency_invitations')
        .select('id, email, role, expires_at, accepted_at, created_at')
        .eq('agency_id', id)
        .order('created_at', { ascending: false })

    return (
        <AgencyDetailClient
            agency={agency}
            users={users ?? []}
            invitations={invitations ?? []}
        />
    )
}
