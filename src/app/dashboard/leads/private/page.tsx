import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PrivateLeadsClient } from "./private-leads-client"

export default async function PrivateLeadsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Get the user's role
    const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

    // Admins should see all leads, not just their own
    if (['super_admin', 'agency_admin'].includes(profile?.role || '')) {
        redirect('/dashboard/leads/all')
    }

    // Agents: only fetch their own leads (explicit owner_id filter + RLS)
    const { data: leads } = await supabase
        .from("leads")
        .select("*")
        .eq("owner_id", user.id)       // ← strict agent isolation
        .order("created_at", { ascending: false })

    return <PrivateLeadsClient initialLeads={leads || []} />
}
