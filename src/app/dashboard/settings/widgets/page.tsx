"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Save } from "lucide-react"
import { toast } from "sonner"

type Widget = {
    id: string
    label: string
    description: string
    icon: string
    enabled: boolean
    group: string
}

const ALL_WIDGETS: Omit<Widget, 'enabled'>[] = [
    // Stats
    { id: 'kpi_leads', label: 'Total Leads', description: 'Count of all leads', icon: '👥', group: 'KPIs' },
    { id: 'kpi_revenue', label: 'Revenue', description: 'Total paid invoice amount', icon: '💰', group: 'KPIs' },
    { id: 'kpi_tasks', label: 'Pending Tasks', description: 'Tasks assigned to you due soon', icon: '✅', group: 'KPIs' },
    { id: 'kpi_tickets', label: 'Open Tickets', description: 'Unresolved support tickets', icon: '🎫', group: 'KPIs' },
    { id: 'kpi_cash', label: 'Cash Received', description: 'Total cash received this month', icon: '💵', group: 'KPIs' },
    // Charts
    { id: 'chart_pipeline', label: 'Pipeline Funnel', description: 'Lead count by status', icon: '📊', group: 'Charts' },
    { id: 'chart_monthly', label: 'Monthly Leads Trend', description: 'New leads over last 6 months', icon: '📈', group: 'Charts' },
    { id: 'chart_agents', label: 'Agent Performance', description: 'Leads & enrolled per agent', icon: '🏆', group: 'Charts' },
    // Activity
    { id: 'activity_feed', label: 'Activity Feed', description: 'Recent CRM events in real time', icon: '⚡', group: 'Activity' },
    { id: 'upcoming_tasks', label: 'Upcoming Tasks', description: 'Your tasks due within 7 days', icon: '📋', group: 'Activity' },
    { id: 'calendar_mini', label: 'Mini Calendar', description: 'Upcoming meetings at a glance', icon: '📅', group: 'Activity' },
    { id: 'expiring_docs', label: 'Expiring Documents', description: 'Student docs expiring within 30 days', icon: '📁', group: 'Activity' },
    { id: 'recent_leads', label: 'Recent Leads', description: 'Latest leads added to the system', icon: '🆕', group: 'Activity' },
]

export default function DashboardWidgetsPage() {
    const [widgets, setWidgets] = useState<Widget[]>([])
    const [saving, setSaving] = useState(false)
    const [agencyId, setAgencyId] = useState("")
    const [userId, setUserId] = useState("")
    const [loaded, setLoaded] = useState(false)

    const supabase = createClient()

    const loadPrefs = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setUserId(user.id)
        const { data: profile } = await supabase.from('users').select('agency_id').eq('id', user.id).single()
        setAgencyId(profile?.agency_id || "")

        const { data: prefs } = await supabase.from('dashboard_preferences').select('widgets').eq('user_id', user.id).single()
        const savedWidgets: { id: string; enabled: boolean }[] = prefs?.widgets || []

        const merged = ALL_WIDGETS.map(w => {
            const saved = savedWidgets.find(sw => sw.id === w.id)
            return { ...w, enabled: saved ? saved.enabled : true } // default: all on
        })
        setWidgets(merged)
        setLoaded(true)
    }, [])

    useEffect(() => { loadPrefs() }, [])

    const toggle = (id: string) => {
        setWidgets(prev => prev.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w))
    }

    const handleSave = async () => {
        setSaving(true)
        const payload = widgets.map(w => ({ id: w.id, enabled: w.enabled }))
        const { error } = await supabase.from('dashboard_preferences').upsert(
            { user_id: userId, agency_id: agencyId, widgets: payload, updated_at: new Date().toISOString() },
            { onConflict: 'user_id' }
        )
        if (error) toast.error(error.message)
        else toast.success("Dashboard preferences saved!")
        setSaving(false)
    }

    const groups = Array.from(new Set(ALL_WIDGETS.map(w => w.group)))

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold flex items-center gap-2"><LayoutDashboard className="h-5 w-5 text-primary" /> Dashboard Widgets</h3>
                    <p className="text-sm text-muted-foreground mt-1">Choose which widgets appear on your personal dashboard. This is per-user.</p>
                </div>
                <Button onClick={handleSave} disabled={saving || !loaded} className="gap-2">
                    <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Preferences"}
                </Button>
            </div>

            {groups.map(group => (
                <Card key={group}>
                    <CardHeader className="pb-2 pt-4">
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{group}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {widgets.filter(w => w.group === group).map(w => (
                            <div key={w.id} className="flex items-center justify-between py-2 border-b last:border-none">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">{w.icon}</span>
                                    <div>
                                        <p className="font-medium text-sm">{w.label}</p>
                                        <p className="text-xs text-muted-foreground">{w.description}</p>
                                    </div>
                                </div>
                                <Switch checked={w.enabled} onCheckedChange={() => toggle(w.id)} />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
