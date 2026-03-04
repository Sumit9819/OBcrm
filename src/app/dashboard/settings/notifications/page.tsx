"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { BellRing, Save } from "lucide-react"
import { toast } from "sonner"

const NOTIFICATION_GROUPS = [
    {
        group: 'Messages & Chat',
        items: [
            { key: 'message', label: 'New direct message', desc: 'When someone sends you a DM' },
            { key: 'channel_message', label: 'New channel message', desc: 'When someone posts in a channel you are in' },
            { key: 'mention', label: 'Mentions (@you)', desc: 'When someone @mentions you' },
        ]
    },
    {
        group: 'Leads',
        items: [
            { key: 'lead_assigned', label: 'Lead assigned to you', desc: 'When a new lead is assigned to your name' },
            { key: 'lead_status', label: 'Lead status changed', desc: 'When one of your leads moves to a new stage' },
            { key: 'lead_note', label: 'Note added to your lead', desc: 'When a colleague adds a note to your lead' },
        ]
    },
    {
        group: 'Tasks & Meetings',
        items: [
            { key: 'task_due', label: 'Task due reminder', desc: '24 hours before a task is due' },
            { key: 'meeting_reminder', label: 'Meeting reminder', desc: '1 hour before a scheduled meeting' },
            { key: 'task_assigned', label: 'Task assigned to you', desc: 'When a task is assigned to you' },
        ]
    },
    {
        group: 'HR & Leave',
        items: [
            { key: 'leave_approved', label: 'Leave approved/rejected', desc: 'Status update on your leave request' },
            { key: 'leave_new', label: 'New leave request', desc: 'Admins: when a team member applies for leave' },
        ]
    },
    {
        group: 'Tickets',
        items: [
            { key: 'ticket_new', label: 'New ticket raised', desc: 'Admins: when a new ticket is opened' },
            { key: 'ticket_reply', label: 'Reply on your ticket', desc: 'When someone replies to your ticket' },
        ]
    },
    {
        group: 'Documents',
        items: [
            { key: 'doc_expiry', label: 'Document expiry alert', desc: '7 days before a document expires' },
            { key: 'doc_uploaded', label: 'New document uploaded', desc: 'When a document is added to your lead' },
        ]
    },
]

const DEFAULT_PREFS: Record<string, boolean> = Object.fromEntries(
    NOTIFICATION_GROUPS.flatMap(g => g.items.map(i => [i.key, true]))
)

export default function NotificationPrefsPage() {
    const [prefs, setPrefs] = useState<Record<string, boolean>>(DEFAULT_PREFS)
    const [saving, setSaving] = useState(false)
    const [userId, setUserId] = useState("")
    const [agencyId, setAgencyId] = useState("")
    const supabase = createClient()

    useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            setUserId(user.id)
            const { data: profile } = await supabase.from('users').select('agency_id').eq('id', user.id).single()
            setAgencyId(profile?.agency_id || "")
            const { data } = await supabase.from('notification_preferences').select('preferences').eq('user_id', user.id).single()
            if (data?.preferences) setPrefs({ ...DEFAULT_PREFS, ...data.preferences })
        }
        load()
    }, [])

    const toggle = (key: string) => setPrefs(prev => ({ ...prev, [key]: !prev[key] }))

    const handleSave = async () => {
        setSaving(true)
        const { error } = await supabase.from('notification_preferences').upsert(
            { user_id: userId, agency_id: agencyId, preferences: prefs, updated_at: new Date().toISOString() },
            { onConflict: 'user_id' }
        )
        if (error) toast.error(error.message)
        else toast.success("Notification preferences saved!")
        setSaving(false)
    }

    const enabledCount = Object.values(prefs).filter(Boolean).length
    const total = Object.keys(prefs).length

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold flex items-center gap-2"><BellRing className="h-5 w-5 text-primary" /> Notification Preferences</h3>
                    <p className="text-sm text-muted-foreground mt-1">Choose which events notify you. ({enabledCount}/{total} enabled)</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPrefs(Object.fromEntries(Object.keys(prefs).map(k => [k, false])))}>Mute All</Button>
                    <Button variant="outline" size="sm" onClick={() => setPrefs(DEFAULT_PREFS)}>Enable All</Button>
                    <Button onClick={handleSave} disabled={saving} className="gap-2">
                        <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save"}
                    </Button>
                </div>
            </div>

            <div className="space-y-4">
                {NOTIFICATION_GROUPS.map(group => (
                    <Card key={group.group}>
                        <CardHeader className="py-3 px-4 border-b bg-muted/30">
                            <CardTitle className="text-sm font-semibold">{group.group}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {group.items.map((item, i) => (
                                <div key={item.key} className={`flex items-center justify-between px-4 py-3 hover:bg-muted/20 ${i < group.items.length - 1 ? 'border-b' : ''}`}>
                                    <div>
                                        <p className="text-sm font-medium">{item.label}</p>
                                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                                    </div>
                                    <Switch checked={!!prefs[item.key]} onCheckedChange={() => toggle(item.key)} />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
