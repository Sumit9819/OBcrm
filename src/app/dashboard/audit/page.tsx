import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AuditLogClient } from "./audit-log-client"

export default async function AuditLogPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    const { data: profile } = await supabase
        .from("users")
        .select("role, agency_id")
        .eq("id", user.id)
        .single()

    if (!["super_admin", "agency_admin"].includes(profile?.role)) {
        redirect("/dashboard")
    }

    // Fetch recent activities across entire agency
    const { data: activities } = await supabase
        .from("activities")
        .select(`
            id, type, description, created_at,
            lead:leads(id, first_name, last_name),
            actor:users(id, first_name, last_name, role)
        `)
        .order("created_at", { ascending: false })
        .limit(200)

    return <AuditLogClient activities={activities || []} />
}
