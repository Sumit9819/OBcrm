"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Bell, Plus, Check, Trash2, AlarmClock, Clock } from "lucide-react"
import { format, isPast, isToday, isTomorrow, formatDistanceToNow } from "date-fns"
import { toast } from "sonner"

type Reminder = {
    id: string; title: string; note?: string
    remind_at: string; done: boolean; created_at: string
}

function ReminderCard({ r, onDone, onDelete }: { r: Reminder; onDone: () => void; onDelete: () => void }) {
    const dt = new Date(r.remind_at)
    const overdue = !r.done && isPast(dt)
    const soonLabel = isToday(dt) ? `Today ${format(dt, 'HH:mm')}` :
        isTomorrow(dt) ? `Tomorrow ${format(dt, 'HH:mm')}` :
            format(dt, 'MMM d · HH:mm')

    return (
        <div className={`group p-4 rounded-xl border bg-background shadow-sm hover:shadow-md transition-all
            ${r.done ? 'opacity-50 bg-slate-50' : overdue ? 'border-red-200 bg-red-50/30' : 'border-slate-200'}`}>
            <div className="flex items-start gap-3">
                <div
                    onClick={onDone}
                    className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center cursor-pointer shrink-0 transition-colors
                        ${r.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-emerald-400'}`}
                >
                    {r.done && <Check className="h-3 w-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm ${r.done ? 'line-through text-muted-foreground' : ''}`}>{r.title}</p>
                    {r.note && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.note}</p>}
                    <div className="flex items-center gap-1.5 mt-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className={`text-xs font-medium ${overdue && !r.done ? 'text-red-500' : 'text-muted-foreground'}`}>
                            {soonLabel}
                        </span>
                        {overdue && !r.done && (
                            <Badge className="text-[10px] bg-red-100 text-red-600 border-none px-1.5 py-0">Overdue</Badge>
                        )}
                    </div>
                </div>
                <button
                    onClick={onDelete}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all p-1"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    )
}

export default function RemindersPage() {
    const [reminders, setReminders] = useState<Reminder[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [newTitle, setNewTitle] = useState("")
    const [newNote, setNewNote] = useState("")
    const [newDate, setNewDate] = useState("")
    const [newTime, setNewTime] = useState("09:00")
    const [saving, setSaving] = useState(false)

    const supabase = createClient()

    const load = useCallback(async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
            .from('reminders')
            .select('*')
            .eq('user_id', user.id)
            .order('remind_at', { ascending: true })

        if (data) setReminders(data)
        setLoading(false)
    }, [])

    useEffect(() => { load() }, [])

    const create = async () => {
        if (!newTitle.trim() || !newDate) return
        setSaving(true)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: profile } = await supabase.from('users').select('agency_id').eq('id', user.id).single()

        const remind_at = new Date(`${newDate}T${newTime}`).toISOString()

        const { error } = await supabase.from('reminders').insert({
            user_id: user.id,
            agency_id: profile?.agency_id,
            title: newTitle.trim(),
            note: newNote.trim() || null,
            remind_at,
            done: false,
        })

        if (error) toast.error("Failed to create reminder")
        else {
            toast.success("Reminder set!")
            setNewTitle(""); setNewNote(""); setNewDate(""); setNewTime("09:00")
            setDialogOpen(false)
            load()
        }
        setSaving(false)
    }

    const markDone = async (id: string, done: boolean) => {
        await supabase.from('reminders').update({ done: !done }).eq('id', id)
        setReminders(prev => prev.map(r => r.id === id ? { ...r, done: !done } : r))
        if (!done) toast.success("Reminder marked as done ✅")
    }

    const deleteReminder = async (id: string) => {
        await supabase.from('reminders').delete().eq('id', id)
        setReminders(prev => prev.filter(r => r.id !== id))
        toast.info("Reminder deleted")
    }

    const upcoming = reminders.filter(r => !r.done && !isPast(new Date(r.remind_at)))
    const overdue = reminders.filter(r => !r.done && isPast(new Date(r.remind_at)))
    const done = reminders.filter(r => r.done)

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 bg-slate-50/50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Bell className="h-6 w-6 text-amber-500" /> My Reminders
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {upcoming.length} upcoming · {overdue.length} overdue
                    </p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2"><Plus className="h-4 w-4" /> New Reminder</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Set a Reminder</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-2">
                            <div className="space-y-1.5">
                                <Label>Reminder Title *</Label>
                                <Input placeholder="e.g. Follow up with John Smith" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Note</Label>
                                <Input placeholder="Optional note..." value={newNote} onChange={e => setNewNote(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label>Date *</Label>
                                    <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Time</Label>
                                    <Input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={create} disabled={saving || !newTitle.trim() || !newDate}>
                                {saving ? "Saving..." : "Set Reminder"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {loading ? (
                <div className="text-center py-20 text-muted-foreground">Loading reminders...</div>
            ) : (
                <div className="space-y-6">
                    {/* Overdue */}
                    {overdue.length > 0 && (
                        <section>
                            <h3 className="text-sm font-bold text-red-500 mb-3 flex items-center gap-1.5">
                                <AlarmClock className="h-4 w-4" /> Overdue ({overdue.length})
                            </h3>
                            <div className="space-y-2">
                                {overdue.map(r => (
                                    <ReminderCard key={r.id} r={r} onDone={() => markDone(r.id, r.done)} onDelete={() => deleteReminder(r.id)} />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Upcoming */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                            <Bell className="h-4 w-4 text-amber-500" /> Upcoming ({upcoming.length})
                        </h3>
                        {upcoming.length === 0 ? (
                            <Card className="shadow-sm">
                                <CardContent className="py-12 text-center text-muted-foreground text-sm">
                                    No upcoming reminders. <button className="text-primary hover:underline" onClick={() => setDialogOpen(true)}>Add one</button>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-2">
                                {upcoming.map(r => (
                                    <ReminderCard key={r.id} r={r} onDone={() => markDone(r.id, r.done)} onDelete={() => deleteReminder(r.id)} />
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Done */}
                    {done.length > 0 && (
                        <section>
                            <h3 className="text-sm font-bold text-emerald-600 mb-3 flex items-center gap-1.5">
                                <Check className="h-4 w-4" /> Done ({done.length})
                            </h3>
                            <div className="space-y-2">
                                {done.slice(0, 5).map(r => (
                                    <ReminderCard key={r.id} r={r} onDone={() => markDone(r.id, r.done)} onDelete={() => deleteReminder(r.id)} />
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            )}
        </div>
    )
}
