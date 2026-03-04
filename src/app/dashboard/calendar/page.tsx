"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarDays, ChevronLeft, ChevronRight, Plus, X, Clock, Video, MapPin, Bell } from "lucide-react"
import { toast } from "sonner"
import {
    format, startOfMonth, endOfMonth, eachDayOfInterval,
    startOfWeek, endOfWeek, isSameMonth, isSameDay, parseISO, isToday,
} from "date-fns"

type CalendarEvent = {
    id: string; title: string; description?: string
    start_at: string; end_at?: string
    event_type: string; color: string
    meeting_id?: string
}

const typeConfig: Record<string, { dot: string; bg: string; label: string; icon: any }> = {
    event: { dot: "bg-slate-500", bg: "bg-slate-100 text-slate-700", label: "Event", icon: CalendarDays },
    meeting: { dot: "bg-blue-500", bg: "bg-blue-100 text-blue-700", label: "Meeting", icon: Video },
    follow_up: { dot: "bg-emerald-500", bg: "bg-emerald-100 text-emerald-700", label: "Follow-up", icon: MapPin },
    deadline: { dot: "bg-red-500", bg: "bg-red-100 text-red-600", label: "Deadline", icon: Clock },
    reminder: { dot: "bg-amber-500", bg: "bg-amber-100 text-amber-700", label: "Reminder", icon: Bell },
}

export default function CalendarPage() {
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [events, setEvents] = useState<CalendarEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)
    const [selectedDay, setSelectedDay] = useState<Date | null>(null)
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({
        title: "", description: "", date: "", time: "", end_time: "", event_type: "event",
    })
    const supabase = createClient()

    const load = useCallback(async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
            .from('users').select('id, agency_id, role').eq('id', user.id).single()
        setCurrentUser(profile)

        // Load this month's events (±1 month buffer for calendar edges)
        const from = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 })
        const to = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 })

        const { data } = await supabase
            .from('calendar_events')
            .select('*')
            .eq('agency_id', profile?.agency_id)
            .gte('start_at', from.toISOString())
            .lte('start_at', to.toISOString())
            .order('start_at', { ascending: true })

        setEvents(data || [])
        setLoading(false)
    }, [currentMonth])

    useEffect(() => { load() }, [load])

    const addEvent = async () => {
        if (!form.title || !form.date) { toast.error("Title and date required"); return }
        setSaving(true)

        const start_at = form.time
            ? new Date(`${form.date}T${form.time}`).toISOString()
            : new Date(`${form.date}T00:00:00`).toISOString()
        const end_at = form.end_time
            ? new Date(`${form.date}T${form.end_time}`).toISOString()
            : null

        const { error } = await supabase.from('calendar_events').insert({
            agency_id: currentUser?.agency_id,
            user_id: currentUser?.id,
            title: form.title.trim(),
            description: form.description.trim() || null,
            start_at,
            end_at,
            event_type: form.event_type,
            color: typeConfig[form.event_type]?.dot.replace('bg-', '#').replace('-500', '') || '#6366f1',
        })

        if (error) toast.error("Failed: " + error.message)
        else {
            toast.success("Event added!")
            setForm({ title: "", description: "", date: "", time: "", end_time: "", event_type: "event" })
            setOpen(false)
            load()
        }
        setSaving(false)
    }

    const deleteEvent = async (id: string) => {
        await supabase.from('calendar_events').delete().eq('id', id)
        setEvents(prev => prev.filter(e => e.id !== id))
        toast.info("Event removed")
    }

    // Calendar grid setup
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
    const calDays = eachDayOfInterval({ start: calStart, end: calEnd })

    const getEvents = (day: Date) =>
        events.filter(e => isSameDay(parseISO(e.start_at), day))

    const selectedEvents = selectedDay ? getEvents(selectedDay) : []

    const openAdd = (day: Date) => {
        setSelectedDay(day)
        setForm(f => ({ ...f, date: format(day, "yyyy-MM-dd") }))
        setOpen(true)
    }

    // Stats for this month
    const monthStr = format(currentMonth, "yyyy-MM")
    const thisMonthEvents = events.filter(e => e.start_at.startsWith(monthStr))
    const meetingCount = thisMonthEvents.filter(e => e.event_type === 'meeting').length
    const deadlineCount = thisMonthEvents.filter(e => e.event_type === 'deadline').length
    const reminderCount = thisMonthEvents.filter(e => e.event_type === 'reminder').length

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 bg-slate-50/50 min-h-screen">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                        <CalendarDays className="h-6 w-6 text-primary" /> Calendar
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                        All meetings scheduled auto-appear here. Add your own events too.
                    </p>
                </div>
                <Button onClick={() => openAdd(new Date())} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Event
                </Button>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: "Meetings", value: meetingCount, color: "text-blue-600", bg: "bg-blue-50" },
                    { label: "Deadlines", value: deadlineCount, color: "text-red-600", bg: "bg-red-50" },
                    { label: "Reminders", value: reminderCount, color: "text-amber-600", bg: "bg-amber-50" },
                ].map(s => (
                    <Card key={s.label} className={`shadow-sm border-none ${s.bg}`}>
                        <CardContent className="p-3 text-center">
                            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                            <p className="text-xs text-muted-foreground">{s.label} this month</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar Grid */}
                <Card className="lg:col-span-2 shadow-sm overflow-hidden">
                    <CardHeader className="py-3 border-b flex flex-row items-center justify-between">
                        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1))}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <CardTitle className="text-base font-bold">{format(currentMonth, "MMMM yyyy")}</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1))}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="p-3">
                        {/* Day labels */}
                        <div className="grid grid-cols-7 gap-1 mb-1">
                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                                <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">{d}</div>
                            ))}
                        </div>
                        {/* Day cells */}
                        <div className="grid grid-cols-7 gap-1">
                            {calDays.map(day => {
                                const dayEvents = getEvents(day)
                                const todayFlag = isToday(day)
                                const inMonth = isSameMonth(day, currentMonth)
                                const isSelected = selectedDay && isSameDay(day, selectedDay)
                                return (
                                    <button
                                        key={day.toISOString()}
                                        onClick={() => setSelectedDay(day)}
                                        onDoubleClick={() => openAdd(day)}
                                        title="Click to view · Double-click to add"
                                        className={`min-h-[70px] rounded-lg p-1 text-left transition-all border ${isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-transparent hover:bg-slate-100"
                                            } ${!inMonth ? "opacity-25" : ""}`}
                                    >
                                        <span className={`text-xs font-semibold flex items-center justify-center w-6 h-6 rounded-full ${todayFlag ? "bg-primary text-white" : "text-slate-700"}`}>
                                            {format(day, "d")}
                                        </span>
                                        <div className="mt-1 space-y-0.5">
                                            {dayEvents.slice(0, 2).map(ev => {
                                                const cfg = typeConfig[ev.event_type] || typeConfig.event
                                                return (
                                                    <div key={ev.id} className={`text-[9px] px-1 py-0.5 rounded truncate font-medium ${cfg.bg}`}>
                                                        {ev.title}
                                                    </div>
                                                )
                                            })}
                                            {dayEvents.length > 2 && (
                                                <span className="text-[9px] text-muted-foreground pl-1">+{dayEvents.length - 2} more</span>
                                            )}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Side Panel */}
                <div className="space-y-4">
                    {/* Legend */}
                    <Card className="shadow-sm">
                        <CardHeader className="py-2 border-b">
                            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Event Types</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 space-y-2">
                            {Object.entries(typeConfig).map(([k, v]) => {
                                const Icon = v.icon
                                return (
                                    <div key={k} className="flex items-center gap-2">
                                        <div className={`w-2.5 h-2.5 rounded-full ${v.dot}`} />
                                        <Icon className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-sm">{v.label}</span>
                                    </div>
                                )
                            })}
                        </CardContent>
                    </Card>

                    {/* Selected Day Events */}
                    <Card className="shadow-sm">
                        <CardHeader className="py-2 border-b flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-bold">
                                {selectedDay ? format(selectedDay, "EEE, MMM dd") : "Select a day"}
                            </CardTitle>
                            {selectedDay && (
                                <Button size="sm" variant="outline" onClick={() => openAdd(selectedDay)} className="h-7 text-xs gap-1">
                                    <Plus className="h-3 w-3" /> Add
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="p-3">
                            {!selectedDay ? (
                                <p className="text-sm text-muted-foreground text-center py-4">Click a day to view events</p>
                            ) : loading ? (
                                <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
                            ) : selectedEvents.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">No events — double-click to add</p>
                            ) : (
                                <div className="space-y-2">
                                    {selectedEvents.map(ev => {
                                        const cfg = typeConfig[ev.event_type] || typeConfig.event
                                        const Icon = cfg.icon
                                        return (
                                            <div key={ev.id} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border group">
                                                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${cfg.dot}`} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{ev.title}</p>
                                                    {ev.start_at && (
                                                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                            <Clock className="h-3 w-3" />
                                                            {format(parseISO(ev.start_at), "HH:mm")}
                                                            {ev.end_at && ` – ${format(parseISO(ev.end_at), "HH:mm")}`}
                                                        </p>
                                                    )}
                                                    {ev.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{ev.description}</p>}
                                                    <Badge className={`text-[10px] mt-1 border-none shadow-none flex items-center gap-1 w-fit ${cfg.bg}`}>
                                                        <Icon className="h-3 w-3" />{cfg.label}
                                                        {ev.meeting_id && " (auto)"}
                                                    </Badge>
                                                </div>
                                                {!ev.meeting_id && (
                                                    <button onClick={() => deleteEvent(ev.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Add Event Dialog */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Add Calendar Event</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label>Title *</Label>
                            <Input placeholder="Event title..." value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <Label>Date *</Label>
                                <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Start</Label>
                                <Input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>End</Label>
                                <Input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Type</Label>
                            <Select value={form.event_type} onValueChange={v => setForm({ ...form, event_type: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="event">Event</SelectItem>
                                    <SelectItem value="meeting">Meeting</SelectItem>
                                    <SelectItem value="follow_up">Follow-up</SelectItem>
                                    <SelectItem value="deadline">Deadline</SelectItem>
                                    <SelectItem value="reminder">Reminder</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Description</Label>
                            <Textarea placeholder="Optional notes..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="resize-none h-20" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button onClick={addEvent} disabled={saving}>{saving ? "Adding..." : "Add Event"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
