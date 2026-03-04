"use client"

import { useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

const STATUS_EMOJIS: Record<string, string> = {
    New: "🔵",
    Contacted: "🟡",
    Application: "🟣",
    Offer: "🟠",
    Visa: "🔷",
    Enrolled: "🎓",
}

/**
 * AgentLeadNotifications
 * Subscribes via Supabase Realtime to any status changes on leads referred by this agent.
 * Shows a toast notification whenever a lead they submitted moves to a new stage.
 */
export function AgentLeadNotifications({ agentId }: { agentId: string }) {
    const supabase = createClient()
    // Track which leads have shown a notification to avoid duplicates on mount
    const seenRef = useRef<Set<string>>(new Set())

    useEffect(() => {
        if (!agentId) return

        const channel = supabase
            .channel(`agent-leads-${agentId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'leads',
                    filter: `referred_by=eq.${agentId}`,
                },
                (payload) => {
                    const lead = payload.new as any
                    const old = payload.old as any

                    // Only notify if status actually changed
                    if (!lead.status || lead.status === old?.status) return

                    const key = `${lead.id}-${lead.status}`
                    if (seenRef.current.has(key)) return
                    seenRef.current.add(key)

                    const emoji = STATUS_EMOJIS[lead.status] || "📋"
                    const name = `${lead.first_name || ''} ${lead.last_name || ''}`.trim()

                    toast.info(
                        `${emoji} Lead Update`,
                        {
                            description: `${name}'s status changed to "${lead.status}"`,
                            duration: 6000,
                            action: {
                                label: "View",
                                onClick: () => { /* agents can't navigate to /dashboard */ }
                            }
                        }
                    )
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [agentId])

    // Renders nothing — purely side-effect component
    return null
}
