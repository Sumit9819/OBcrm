"use client"

import React, { useState, useTransition } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, Loader2, Globe, CalendarDays } from "lucide-react"
import { updateLeadStatus } from "@/app/dashboard/leads/[id]/actions"
import { format } from "date-fns"
import { toast } from "sonner"

type Stage = {
    id: string
    name: string
    color: string
    sort_order: number
}

type Lead = {
    id: string
    first_name: string
    last_name: string
    status: string
    destination_country?: string
    created_at: string
    is_shared_with_company?: boolean
    owner?: { first_name: string; last_name: string } | null
}

const DEFAULT_STAGES = [
    { id: "New", name: "New", color: "#3b82f6", sort_order: 1 },
    { id: "Contacted", name: "Contacted", color: "#8b5cf6", sort_order: 2 },
    { id: "Application", name: "Application", color: "#f59e0b", sort_order: 3 },
    { id: "Offer", name: "Offer", color: "#f97316", sort_order: 4 },
    { id: "Visa", name: "Visa", color: "#6366f1", sort_order: 5 },
    { id: "Enrolled", name: "Enrolled", color: "#10b981", sort_order: 6 },
]

const PRIORITY_COLORS: Record<string, string> = {
    New: "#3b82f6",
    Contacted: "#8b5cf6",
    Application: "#f59e0b",
    Offer: "#f97316",
    Visa: "#6366f1",
    Enrolled: "#10b981",
}

function LeadCard({ lead }: { lead: Lead }) {
    return (
        <div
            className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing select-none"
            draggable
            onDragStart={(e) => {
                e.dataTransfer.setData("leadId", lead.id)
                e.dataTransfer.setData("currentStatus", lead.status)
                e.dataTransfer.effectAllowed = "move"
            }}
        >
            <Link
                href={`/dashboard/leads/${lead.id}`}
                className="block mb-2"
                onClick={(e) => e.stopPropagation()}
                draggable={false}
            >
                <p className="text-sm font-semibold text-slate-800 hover:text-indigo-600 transition-colors truncate">
                    {lead.first_name} {lead.last_name}
                </p>
            </Link>

            {lead.destination_country && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
                    <Globe className="h-3 w-3 shrink-0" />
                    <span className="truncate">{lead.destination_country}</span>
                </div>
            )}

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <CalendarDays className="h-3 w-3" />
                    {format(new Date(lead.created_at), "MMM d")}
                </div>
                {lead.owner && (
                    <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                        {lead.owner.first_name}
                    </span>
                )}
            </div>
        </div>
    )
}

function KanbanColumn({
    stage,
    leads,
    onDrop,
    isOver,
    onDragOver,
    onDragLeave,
}: {
    stage: Stage
    leads: Lead[]
    onDrop: (leadId: string, newStatus: string) => void
    isOver: boolean
    onDragOver: () => void
    onDragLeave: () => void
}) {
    return (
        <div
            className={`flex flex-col min-w-[260px] max-w-[280px] rounded-xl border transition-colors ${isOver ? "border-indigo-400 bg-indigo-50/60" : "border-slate-200 bg-slate-50/60"
                }`}
            onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = "move"
                onDragOver()
            }}
            onDragLeave={onDragLeave}
            onDrop={(e) => {
                e.preventDefault()
                const leadId = e.dataTransfer.getData("leadId")
                if (leadId) onDrop(leadId, stage.name)
            }}
        >
            {/* Column Header */}
            <div className="flex items-center justify-between px-3 py-2.5 rounded-t-xl border-b border-slate-200">
                <div className="flex items-center gap-2">
                    <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: stage.color || PRIORITY_COLORS[stage.name] || "#94a3b8" }}
                    />
                    <span className="text-sm font-semibold text-slate-700">{stage.name}</span>
                </div>
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                    {leads.length}
                </Badge>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2 p-2 flex-1 overflow-y-auto max-h-[calc(100vh-260px)]">
                {leads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <p className="text-xs text-muted-foreground/60">No leads</p>
                        <p className="text-[10px] text-muted-foreground/40 mt-0.5">Drag leads here</p>
                    </div>
                ) : (
                    leads.map((lead) => <LeadCard key={lead.id} lead={lead} />)
                )}
            </div>

            {/* Add link */}
            <div className="px-2 py-2 border-t border-slate-200">
                <Link
                    href="/dashboard/leads/new"
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-indigo-600 transition-colors px-1 py-1 rounded hover:bg-indigo-50 w-full"
                >
                    <Plus className="h-3 w-3" />
                    Add lead
                </Link>
            </div>
        </div>
    )
}

export function LeadsKanbanBoard({
    initialLeads,
    pipelineStages,
}: {
    initialLeads: Lead[]
    pipelineStages: Stage[]
}) {
    const stages = pipelineStages.length > 0 ? pipelineStages : (DEFAULT_STAGES as Stage[])
    const [leads, setLeads] = useState<Lead[]>(initialLeads)
    const [overStage, setOverStage] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const [movingId, setMovingId] = useState<string | null>(null)

    const handleDrop = (leadId: string, newStatus: string) => {
        setOverStage(null)
        const lead = leads.find(l => l.id === leadId)
        if (!lead || lead.status === newStatus) return

        // Optimistic update
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l))
        setMovingId(leadId)

        startTransition(async () => {
            const result = await updateLeadStatus(leadId, newStatus)
            setMovingId(null)
            if (result?.error) {
                // Rollback on error
                setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: lead.status } : l))
                toast.error("Failed to update lead status")
            } else {
                toast.success(`Lead moved to ${newStatus}`)
            }
        })
    }

    const getLeadsForStage = (stageName: string) =>
        leads.filter(l => l.status === stageName)

    return (
        <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: "calc(100vh - 200px)" }}>
            {isPending && movingId && (
                <div className="fixed top-4 right-4 z-50 bg-white border border-slate-200 rounded-full shadow-lg px-3 py-1.5 flex items-center gap-2 text-sm text-slate-600">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
                    Updating...
                </div>
            )}
            {stages.map(stage => (
                <KanbanColumn
                    key={stage.id}
                    stage={stage}
                    leads={getLeadsForStage(stage.name)}
                    onDrop={handleDrop}
                    isOver={overStage === stage.name}
                    onDragOver={() => setOverStage(stage.name)}
                    onDragLeave={() => setOverStage(null)}
                />
            ))}
        </div>
    )
}
