import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { LeadDetailClient } from "./lead-detail-client"

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Fetch lead first (we need agency_id for subsequent queries)
    const { data: lead, error } = await supabase
        .from("leads")
        .select(`*,
            assigned_user:users!leads_assigned_to_fkey(id, first_name, last_name, job_title),
            owner_user:users!leads_owner_id_fkey(id, first_name, last_name, job_title),
            referrer:users!leads_referred_by_fkey(id, first_name, last_name)
        `)
        .eq("id", id)
        .single()

    if (error || !lead) notFound()

    // Fetch all related data in parallel
    const [
        staffRes,
        activitiesRes,
        documentsRes,
        applicationsRes,
        tasksRes,
        customFieldsRes,
        pipelineStagesRes,
        callLogsRes,
    ] = await Promise.all([
        supabase
            .from("users")
            .select("id, first_name, last_name, job_title, role")
            .not("role", "in", '("agent","student")')
            .eq("agency_id", lead.agency_id)
            .order("first_name"),
        supabase
            .from("activities")
            .select("*, users!activities_user_id_fkey(first_name, last_name, job_title)")
            .eq("lead_id", id)
            .order("created_at", { ascending: false }),
        supabase
            .from("documents")
            .select("*")
            .eq("lead_id", id)
            .order("created_at", { ascending: false }),
        supabase
            .from("applications")
            .select("*")
            .eq("lead_id", id)
            .order("created_at", { ascending: false }),
        supabase
            .from("tasks")
            .select("*, assigned_user:users!tasks_assigned_to_fkey(first_name, last_name)")
            .eq("lead_id", id)
            .order("due_date", { ascending: true }),
        supabase
            .from("custom_fields")
            .select("*")
            .eq("agency_id", lead.agency_id)
            .eq("is_active", true)
            .order("sort_order"),
        supabase
            .from("pipeline_stages")
            .select("id, name, color, sort_order, is_terminal")
            .eq("agency_id", lead.agency_id)
            .eq("is_active", true)
            .order("sort_order"),
        supabase
            .from("call_logs")
            .select("*")
            .eq("lead_id", id)
            .order("created_at", { ascending: false }),
    ])

    const currentUserId = user?.id || ''

    return (
        <LeadDetailClient
            lead={lead}
            activities={activitiesRes.data || []}
            documents={documentsRes.data || []}
            applications={applicationsRes.data || []}
            tasks={tasksRes.data || []}
            staffList={staffRes.data || []}
            customFields={customFieldsRes.data || []}
            pipelineStages={pipelineStagesRes.data || []}
            currentUserId={currentUserId}
            callLogs={callLogsRes.data || []}
        />
    )
}

