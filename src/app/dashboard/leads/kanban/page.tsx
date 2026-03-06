import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { LeadsKanbanBoard } from "@/components/leads/leads-kanban-board"
import { Button } from "@/components/ui/button"
import { Plus, TableProperties } from "lucide-react"
import Link from "next/link"

export default async function LeadsKanbanPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    const { data: profile } = await supabase
        .from("users")
        .select("role, agency_id")
        .eq("id", user.id)
        .single()

    if (!profile) redirect("/login")

    const isAdmin = ["super_admin", "agency_admin"].includes(profile.role)

    // Fetch pipeline stages for this agency
    const { data: pipelineStages } = await supabase
        .from("pipeline_stages")
        .select("id, name, color, sort_order")
        .eq("agency_id", profile.agency_id)
        .eq("is_active", true)
        .order("sort_order")

    // Fetch leads — all agency leads for admins, own leads for agents
    let leadsQuery = supabase
        .from("leads")
        .select("id, first_name, last_name, status, destination_country, created_at, is_shared_with_company, owner:users!leads_owner_id_fkey(first_name, last_name)")
        .order("created_at", { ascending: false })

    if (!isAdmin) {
        leadsQuery = leadsQuery.eq("owner_id", user.id)
    }

    const { data: leads } = await leadsQuery

    return (
        <div className="flex flex-col gap-4 p-4 md:p-8 min-h-screen bg-slate-50/50">
            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                        Leads Pipeline
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                        Drag and drop leads between stages to update their status.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href={isAdmin ? "/dashboard/leads/all" : "/dashboard/leads/private"}>
                        <Button variant="outline" size="sm" className="gap-1.5">
                            <TableProperties className="h-4 w-4" />
                            Table View
                        </Button>
                    </Link>
                    <Link href="/dashboard/leads/new">
                        <Button size="sm" className="gap-1.5">
                            <Plus className="h-4 w-4" />
                            Add Lead
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats bar */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="font-medium text-slate-700">{leads?.length ?? 0} total leads</span>
                <span>·</span>
                <span>{pipelineStages?.length ?? 6} stages</span>
                {!isAdmin && <span>· Showing your leads only</span>}
            </div>

            {/* Kanban board */}
            <LeadsKanbanBoard
                initialLeads={(leads || []) as any}
                pipelineStages={(pipelineStages || []) as any}
            />
        </div>
    )
}
