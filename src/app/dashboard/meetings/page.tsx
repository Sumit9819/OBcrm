"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { CalendarClock, Plus, MapPin, Link as LinkIcon, Users, Trash2, Clock, Video } from "lucide-react"
import { toast } from "sonner"
import { format, parseISO } from "date-fns"

type Meeting = {
    id: string; title: string; description?: string
    meeting_type: string; status: string
    start_at: string; end_at?: string
    location?: string; meeting_link?: string
    attendees?: string[]; created_at: string
    creator?: { first_name: string; last_name: string }
}

const typeConfig: Record<string, { icon: any; color: string; label: string }> = {
    in_person: { icon: MapPin, color: "bg-purple-100 text-purple-700", label: "In-Person" },
    online: { icon: Video, color: "bg-blue-100 text-blue-700", label: "Online" },
    hybrid: { icon: Users, color: "bg-teal-100 text-teal-700", label: "Hybrid" },
}

export default function MeetingsPage() {
    const [meetings, setMeetings] = useState<Meeting[]>([])
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)
    const [tab, setTab] = useState<"upcoming" | "completed" | "cancelled">("upcoming")
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [form, setForm] = useState({
        title: "", description: "", date: "", time: "", end_time: "",
        meeting_type: "online", location: "", meeting_link: "", attendees: "",
    })
    const [saving, setSaving] = useState(false)
    const supabase = createClient()

    const load = useCallback(async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
            .from('users')
            .select('id, role, agency_id')
            .eq('id', user.id)
            .single()

        setCurrentUser(profile)

        const { data } = await supabase
            .from('meetings')
            .select('*, creator:created_by(first_name, last_name)')
            .eq('agency_id', profile?.agency_id)
            .order('start_at', { ascending: true })

        setMeetings(data || [])
        setLoading(false)
    }, [])

    useEffect(() => { load() }, [])

    const submit = async () => {
        if (!form.title || !form.date || !form.time) { toast.error("Title, date and time required"); return }
        setSaving(true)

        const start_at = new Date(`${form.date}T${form.time}`).toISOString()
        const end_at = form.end_time ? new Date(`${form.date}T${form.end_time}`).toISOString() : null
        const attendees = form.attendees.split(',').map(a => a.trim()).filter(Boolean)

        const { error } = await supabase.from('meetings').insert({
            agency_id: currentUser?.agency_id,
            created_by: currentUser?.id,
            title: form.title.trim(),
            description: form.description.trim() || null,
            meeting_type: form.meeting_type,
            start_at,
            end_at,
            location: form.location || null,
            meeting_link: form.meeting_link || null,
            attendees: attendees.length > 0 ? attendees : null,
            status: 'upcoming',
        })

        if (error) toast.error("Failed: " + error.message)
        else {
            toast.success("Meeting scheduled! Calendar event auto-created ✅")
            setForm({ title: "", description: "", date: "", time: "", end_time: "", meeting_type: "online", location: "", meeting_link: "", attendees: "" })
            setOpen(false)
            load()
        }
        setSaving(false)
    }

    const updateStatus = async (id: string, status: "completed" | "cancelled") => {
        const { error } = await supabase.from('meetings').update({ status }).eq('id', id)
        if (error) toast.error("Failed")
        else {
            toast.success(`Meeting marked as ${status}`)
            setMeetings(prev => prev.map(m => m.id === id ? { ...m, status } : m))
        }
    }

    const deleteMeeting = async (id: string) => {
        await supabase.from('meetings').delete().eq('id', id)
        setMeetings(prev => prev.filter(m => m.id !== id))
        toast.info("Deleted")
    }

    const visible = meetings.filter(m => m.status === tab)
    const counts = {
        upcoming: meetings.filter(m => m.status === "upcoming").length,
        completed: meetings.filter(m => m.status === "completed").length,
        cancelled: meetings.filter(m => m.status === "cancelled").length,
    }

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 bg-slate-50/50 min-h-screen">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                        <CalendarClock className="h-6 w-6 text-primary" /> Meetings & Events
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                        Scheduling a meeting auto-creates a Calendar event too.
                    </p>
                </div>
                <Button onClick={() => setOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" /> Schedule Meeting
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
                {(["upcoming", "completed", "cancelled"] as const).map(t => (
                    <Button key={t} variant={tab === t ? "default" : "outline"} size="sm" onClick={() => setTab(t)} className="capitalize">
                        {t} ({counts[t]})
                    </Button>
                ))}
            </div>

            {/* Meetings List */}
            <div className="space-y-3">
                {loading ? (
                    <div className="text-center py-16 text-muted-foreground text-sm">Loading meetings...</div>
                ) : visible.length === 0 ? (
                    <Card className="shadow-sm">
                        <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                            <CalendarClock className="h-10 w-10 opacity-20" />
                            <p>No {tab} meetings. {tab === "upcoming" && "Schedule one to get started."}</p>
                        </CardContent>
                    </Card>
                ) : (
                    visible.map(meeting => {
                        const TypeIcon = typeConfig[meeting.meeting_type]?.icon || Video
                        const creatorName = meeting.creator
                            ? `${meeting.creator.first_name} ${meeting.creator.last_name}`
                            : 'Unknown'
                        return (
                            <Card key={meeting.id} className={`shadow-sm border-l-4 ${meeting.status === "cancelled" ? "border-l-red-400 opacity-60" : meeting.status === "completed" ? "border-l-emerald-400" : "border-l-primary"}`}>
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-xl ${meeting.status === "upcoming" ? "bg-primary/10" : "bg-slate-100"} shrink-0`}>
                                            <CalendarClock className={`h-5 w-5 ${meeting.status === "upcoming" ? "text-primary" : "text-slate-400"}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-semibold">{meeting.title}</h3>
                                                <Badge className={`text-[10px] border-none shadow-none ${typeConfig[meeting.meeting_type]?.color || ''}`}>
                                                    <TypeIcon className="h-3 w-3 mr-1" />{typeConfig[meeting.meeting_type]?.label}
                                                </Badge>
                                            </div>
                                            {meeting.description && <p className="text-sm text-muted-foreground mt-1">{meeting.description}</p>}
                                            <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {format(parseISO(meeting.start_at), "MMM dd, yyyy 'at' HH:mm")}
                                                    {meeting.end_at && ` – ${format(parseISO(meeting.end_at), "HH:mm")}`}
                                                </span>
                                                {meeting.location && (
                                                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{meeting.location}</span>
                                                )}
                                                {meeting.meeting_link && (
                                                    <a href={meeting.meeting_link} target="_blank" rel="noopener" className="flex items-center gap-1 text-primary hover:underline">
                                                        <LinkIcon className="h-3 w-3" />Join Link
                                                    </a>
                                                )}
                                                {meeting.attendees && meeting.attendees.length > 0 && (
                                                    <span className="flex items-center gap-1">
                                                        <Users className="h-3 w-3" />{meeting.attendees.join(', ')}
                                                    </span>
                                                )}
                                                <span>by {creatorName}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            {meeting.status === "upcoming" && (
                                                <>
                                                    <Button size="sm" variant="outline" onClick={() => updateStatus(meeting.id, "completed")} className="h-7 text-xs text-emerald-600 border-emerald-200">Complete</Button>
                                                    <Button size="sm" variant="outline" onClick={() => updateStatus(meeting.id, "cancelled")} className="h-7 text-xs text-red-500 border-red-200">Cancel</Button>
                                                </>
                                            )}
                                            <button onClick={() => deleteMeeting(meeting.id)} className="text-red-400 hover:text-red-600 ml-1">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })
                )}
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>Schedule Meeting</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label>Title *</Label>
                            <Input placeholder="Meeting title..." value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <Label>Date *</Label>
                                <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Start *</Label>
                                <Input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>End</Label>
                                <Input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Type</Label>
                                <Select value={form.meeting_type} onValueChange={v => setForm({ ...form, meeting_type: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="online">Online</SelectItem>
                                        <SelectItem value="in_person">In-Person</SelectItem>
                                        <SelectItem value="hybrid">Hybrid</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Location / Room</Label>
                                <Input placeholder="Office / Room" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Meeting Link</Label>
                            <Input placeholder="https://meet.google.com/..." value={form.meeting_link} onChange={e => setForm({ ...form, meeting_link: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Attendees</Label>
                            <Input placeholder="John, Jane, Raj (comma-separated)" value={form.attendees} onChange={e => setForm({ ...form, attendees: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Description / Agenda</Label>
                            <Textarea placeholder="Meeting agenda or notes..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="resize-none h-20" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button onClick={submit} disabled={saving}>{saving ? "Scheduling..." : "Schedule"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
