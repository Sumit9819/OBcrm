"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Phone, Bell } from "lucide-react"
import { addActivity } from "@/app/dashboard/leads/[id]/actions"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { addDays } from "date-fns"

type Lead = { id: string; first_name: string; last_name: string }

const FOLLOWUP_OPTIONS = [
    { label: "No follow-up", value: "0" },
    { label: "Tomorrow", value: "1" },
    { label: "In 3 days", value: "3" },
    { label: "In 1 week", value: "7" },
    { label: "In 2 weeks", value: "14" },
]

export function LogCallDialog({
    leads,
    defaultLeadId,
    onLogged,
    triggerLabel = "Log a Call",
    triggerVariant = "outline",
}: {
    leads?: Lead[]
    defaultLeadId?: string
    onLogged?: () => void
    triggerLabel?: string
    triggerVariant?: "outline" | "default" | "secondary" | "ghost"
}) {
    const [open, setOpen] = useState(false)
    const [leadId, setLeadId] = useState(defaultLeadId || "")
    const [notes, setNotes] = useState("")
    const [followUpDays, setFollowUpDays] = useState("0")
    const [followUpNote, setFollowUpNote] = useState("")
    const [saving, setSaving] = useState(false)

    const supabase = createClient()

    const handleSubmit = async () => {
        if (!leadId || !notes.trim()) return
        setSaving(true)

        // 1. Log the call activity
        const result = await addActivity(leadId, 'call', notes)

        if (result.error) {
            toast.error("Failed to log call: " + result.error)
            setSaving(false)
            return
        }

        // 2. Auto-create follow-up reminder if requested
        if (followUpDays !== "0") {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase.from('users').select('agency_id').eq('id', user.id).single()
                const remindAt = addDays(new Date(), parseInt(followUpDays))
                remindAt.setHours(9, 0, 0, 0) // default to 9am

                // Find lead name for reminder title
                const leadName = leads?.find(l => l.id === leadId)
                const leadTitle = leadName ? `${leadName.first_name} ${leadName.last_name}` : 'lead'

                await supabase.from('reminders').insert({
                    user_id: user.id,
                    agency_id: profile?.agency_id,
                    lead_id: leadId,
                    title: `Follow up with ${leadTitle}`,
                    note: followUpNote.trim() || notes.trim(),
                    remind_at: remindAt.toISOString(),
                    done: false,
                })

                toast.success(`✅ Call logged + reminder set for ${FOLLOWUP_OPTIONS.find(o => o.value === followUpDays)?.label.toLowerCase()}`)
            }
        } else {
            toast.success("Call logged successfully")
        }

        setOpen(false)
        setNotes("")
        setFollowUpDays("0")
        setFollowUpNote("")
        if (!defaultLeadId) setLeadId("")
        onLogged?.()
        setSaving(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant={triggerVariant} className="gap-2">
                    <Phone className="w-4 h-4" /> {triggerLabel}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Log a Call</DialogTitle>
                    <DialogDescription>Record the details of a phone call with a lead.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {leads && !defaultLeadId && (
                        <div className="grid gap-2">
                            <Label>Lead</Label>
                            <Select value={leadId} onValueChange={setLeadId}>
                                <SelectTrigger><SelectValue placeholder="Select a lead..." /></SelectTrigger>
                                <SelectContent>
                                    {leads.map(l => (
                                        <SelectItem key={l.id} value={l.id}>{l.first_name} {l.last_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <div className="grid gap-2">
                        <Label>Call Notes</Label>
                        <Textarea
                            placeholder="What was discussed? Any follow-up needed?"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={4}
                        />
                    </div>

                    {/* Auto follow-up reminder */}
                    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 space-y-3">
                        <div className="flex items-center gap-2">
                            <Bell className="h-4 w-4 text-amber-500" />
                            <Label className="text-sm font-semibold text-amber-700">Schedule Follow-up Reminder</Label>
                        </div>
                        <Select value={followUpDays} onValueChange={setFollowUpDays}>
                            <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {FOLLOWUP_OPTIONS.map(o => (
                                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {followUpDays !== "0" && (
                            <Input
                                placeholder="Optional reminder note..."
                                value={followUpNote}
                                onChange={e => setFollowUpNote(e.target.value)}
                                className="bg-white text-sm"
                            />
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSubmit} disabled={saving || !leadId || !notes.trim()}>
                        {saving ? "Saving..." : followUpDays !== "0" ? "Log Call & Set Reminder" : "Log Call"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
