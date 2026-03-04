import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { LeadDetailClient } from "./lead-detail-client"

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Fetch lead with assigned user + referrer
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

    // All internal staff for assignment dropdown
    const { data: staffList } = await supabase
        .from("users")
        .select("id, first_name, last_name, job_title, role")
        .not("role", "in", '("agent","student")')
        .eq("agency_id", lead.agency_id)
        .order("first_name")

    // Activities timeline
    const { data: activities } = await supabase
        .from("activities")
        .select("*, users!activities_user_id_fkey(first_name, last_name, job_title)")
        .eq("lead_id", id)
        .order("created_at", { ascending: false })

    // Documents
    const { data: documents } = await supabase
        .from("documents")
        .select("*")
        .eq("lead_id", id)
        .order("created_at", { ascending: false })

    // Applications
    const { data: applications } = await supabase
        .from("applications")
        .select("*")
        .eq("lead_id", id)
        .order("created_at", { ascending: false })

    // Tasks linked to this lead
    const { data: tasks } = await supabase
        .from("tasks")
        .select("*, assigned_user:users!tasks_assigned_to_fkey(first_name, last_name)")
        .eq("lead_id", id)
        .order("due_date", { ascending: true })

    // Custom fields for this agency
    const { data: customFields } = await supabase
        .from("custom_fields")
        .select("*")
        .eq("agency_id", lead.agency_id)
        .eq("is_active", true)
        .order("sort_order")

    // Pipeline stages for this agency (to merge into status dropdown)
    const { data: pipelineStages } = await supabase
        .from("pipeline_stages")
        .select("id, name, color, sort_order, is_terminal")
        .eq("agency_id", lead.agency_id)
        .eq("is_active", true)
        .order("sort_order")

    const currentUserId = user?.id || ''

    return (
        <LeadDetailClient
            lead={lead}
            activities={activities || []}
            documents={documents || []}
            applications={applications || []}
            tasks={tasks || []}
            staffList={staffList || []}
            customFields={customFields || []}
            pipelineStages={pipelineStages || []}
            currentUserId={currentUserId}
        />
    )
}
