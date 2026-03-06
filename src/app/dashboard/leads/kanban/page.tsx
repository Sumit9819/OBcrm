import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { LeadsKanbanBoard } from "@/components/leads/leads-kanban-board"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, TableProperties } from "lucide-react"
import Link from "next/link"

export default async function LeadsKanbanPage(props: { searchParams: Promise<{ pipeline?: string }> }) {
    const searchParams = await props.searchParams;
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

    // Fetch all pipelines for the agency
    const { data: pipelines } = await supabase
        .from("pipelines")
        .select("*")
        .eq("agency_id", profile.agency_id)
        .order("is_default", { ascending: false })
        .order("name", { ascending: true })

    // Determine selected pipeline
    const selectedPipelineId = searchParams.pipeline || pipelines?.[0]?.id;

    // Fetch pipeline stages for selected pipeline
    const { data: pipelineStages } = await supabase
        .from("pipeline_stages")
        .select("id, name, color, sort_order")
        .eq("agency_id", profile.agency_id)
        .eq("pipeline_id", selectedPipelineId)
        .eq("is_active", true)
        .order("sort_order")

    // Fetch leads for this pipeline
    let leadsQuery = supabase
        .from("leads")
        .select("id, first_name, last_name, status, destination_country, created_at, is_shared_with_company, owner:users!leads_owner_id_fkey(first_name, last_name)")
        .or(`pipeline_id.eq.${selectedPipelineId},pipeline_id.is.null`) // Include leads missing a pipeline temporarily
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

            {/* Pipeline Tabs */}
            {pipelines && pipelines.length > 0 && (
                <div className="flex gap-2 border-b border-slate-200 pb-2 mb-2 overflow-x-auto">
                    {pipelines.map(p => (
                        <Link key={p.id} href={`/dashboard/leads/kanban?pipeline=${p.id}`}>
                            <Badge variant={p.id === selectedPipelineId ? "default" : "secondary"} className="cursor-pointer whitespace-nowrap text-sm px-3 py-1">
                                {p.name} {p.country && `(${p.country})`}
                            </Badge>
                        </Link>
                    ))}
                </div>
            )}

            {/* Stats bar */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                <span className="font-medium text-slate-700">{leads?.length ?? 0} total leads in this pipeline</span>
                <span>·</span>
                <span>{pipelineStages?.length ?? 0} stages</span>
                {!isAdmin && <span>· Showing your leads only</span>}
            </div>

            {/* Kanban board */}
            {(!pipelineStages || pipelineStages.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl border border-dashed shadow-sm">
                    <h3 className="text-lg font-medium text-slate-900 mb-1">No Stages Defined</h3>
                    <p className="text-slate-500 mb-4 max-w-md">This pipeline doesn't have any stages yet. Go to Settings &gt; CRM Pipeline to add stages before tracking leads here.</p>
                    <Link href="/dashboard/settings/pipeline">
                        <Button size="sm">Configure Pipeline</Button>
                    </Link>
                </div>
            ) : (
                <LeadsKanbanBoard
                    initialLeads={(leads || []) as any}
                    pipelineStages={(pipelineStages || []) as any}
                />
            )}
        </div>
    )
}
