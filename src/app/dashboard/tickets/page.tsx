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
import { Ticket, Plus, AlertCircle, Clock, CheckCircle2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

type SupportTicket = {
    id: string; ticket_no: string; subject: string; description?: string
    category: string; priority: string; status: string
    submitted_by: string; created_at: string; resolved_at?: string
    submitter?: { first_name: string; last_name: string }
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    open: { label: "Open", color: "bg-blue-100 text-blue-700", icon: AlertCircle },
    in_progress: { label: "In Progress", color: "bg-amber-100 text-amber-700", icon: Clock },
    resolved: { label: "Resolved", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
    closed: { label: "Closed", color: "bg-slate-100 text-slate-500", icon: CheckCircle2 },
}

const priorityColors: Record<string, string> = {
    low: "bg-slate-100 text-slate-600",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-orange-100 text-orange-700",
    urgent: "bg-red-100 text-red-700",
}

export default function TicketsPage() {
    const [tickets, setTickets] = useState<SupportTicket[]>([])
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)
    const [tab, setTab] = useState<"open" | "in_progress" | "resolved" | "closed" | "all">("open")
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [userRole, setUserRole] = useState("")
    const [form, setForm] = useState({ subject: "", description: "", category: "general", priority: "medium" })
    const [saving, setSaving] = useState(false)

    const supabase = createClient()

    const load = useCallback(async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
            .from('users')
            .select('id, role, agency_id, first_name, last_name')
            .eq('id', user.id)
            .single()

        setCurrentUser(profile)
        setUserRole(profile?.role || '')

        const { data } = await supabase
            .from('tickets')
            .select('*, submitter:submitted_by(first_name, last_name)')
            .eq('agency_id', profile?.agency_id)
            .order('created_at', { ascending: false })

        setTickets(data || [])
        setLoading(false)
    }, [])

    useEffect(() => { load() }, [])

    const submit = async () => {
        if (!form.subject.trim()) { toast.error("Subject is required"); return }
        setSaving(true)

        const { error } = await supabase.from('tickets').insert({
            agency_id: currentUser?.agency_id,
            subject: form.subject.trim(),
            description: form.description.trim() || null,
            category: form.category,
            priority: form.priority,
            status: 'open',
            submitted_by: currentUser?.id,
            ticket_no: '', // auto-set by DB trigger trg_ticket_no
        })

        if (error) toast.error("Failed: " + error.message)
        else {
            toast.success("Ticket submitted! Admins have been notified.")
            setForm({ subject: "", description: "", category: "general", priority: "medium" })
            setOpen(false)
            load()
        }
        setSaving(false)
    }

    const updateStatus = async (id: string, status: string) => {
        const updates: any = { status }
        if (status === 'resolved') updates.resolved_at = new Date().toISOString()

        const { error } = await supabase.from('tickets').update(updates).eq('id', id)
        if (error) toast.error("Failed to update")
        else {
            toast.success(`Status → ${status}`)
            setTickets(prev => prev.map(t => t.id === id ? { ...t, status, ...updates } : t))
        }
    }

    const deleteTicket = async (id: string) => {
        await supabase.from('tickets').delete().eq('id', id)
        setTickets(prev => prev.filter(t => t.id !== id))
        toast.info("Deleted")
    }

    const visible = tab === "all" ? tickets : tickets.filter(t => t.status === tab)
    const counts = {
        all: tickets.length,
        open: tickets.filter(t => t.status === "open").length,
        in_progress: tickets.filter(t => t.status === "in_progress").length,
        resolved: tickets.filter(t => t.status === "resolved").length,
        closed: tickets.filter(t => t.status === "closed").length,
    }
    const isAdmin = ['super_admin', 'agency_admin'].includes(userRole)

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 bg-slate-50/50 min-h-screen">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                        <Ticket className="h-6 w-6 text-primary" /> Support Tickets
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">Raise and track internal support requests. Admins are notified automatically.</p>
                </div>
                <Button onClick={() => setOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" /> Raise Ticket
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {(["all", "open", "in_progress", "resolved", "closed"] as const).map(s => {
                    const cfg = s !== "all" ? statusConfig[s] : null
                    const Icon = cfg?.icon || Ticket
                    return (
                        <Card key={s} className={`cursor-pointer border-2 transition-all ${tab === s ? "border-primary shadow-md" : "border-transparent"}`} onClick={() => setTab(s)}>
                            <CardContent className="p-3 flex items-center gap-2">
                                <div className={`p-1.5 rounded-full ${s === "open" ? "bg-blue-100" : s === "in_progress" ? "bg-amber-100" : s === "resolved" ? "bg-emerald-100" : s === "closed" ? "bg-slate-100" : "bg-primary/10"}`}>
                                    <Icon className={`h-4 w-4 ${s === "open" ? "text-blue-600" : s === "in_progress" ? "text-amber-600" : s === "resolved" ? "text-emerald-600" : s === "closed" ? "text-slate-500" : "text-primary"}`} />
                                </div>
                                <div>
                                    <p className="text-xl font-bold leading-none">{counts[s]}</p>
                                    <p className="text-[10px] text-muted-foreground capitalize mt-0.5">{s.replace("_", " ")}</p>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* Ticket List */}
            <Card className="shadow-sm">
                <CardHeader className="py-3 border-b">
                    <CardTitle className="text-sm font-bold uppercase text-primary">
                        {tab.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())} Tickets ({visible.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="py-16 text-center text-muted-foreground text-sm">Loading tickets...</div>
                    ) : visible.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                            <Ticket className="h-10 w-10 opacity-20" />
                            <p>No tickets found.</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {visible.map(ticket => {
                                const StatusIcon = statusConfig[ticket.status]?.icon || Ticket
                                const submitterName = ticket.submitter
                                    ? `${ticket.submitter.first_name} ${ticket.submitter.last_name}`
                                    : 'Unknown'
                                return (
                                    <div key={ticket.id} className="flex items-start gap-4 px-4 py-4 hover:bg-slate-50 transition-colors">
                                        <div className="min-w-[70px]">
                                            <span className="text-xs font-mono font-semibold text-primary">{ticket.ticket_no || 'TKT-???'}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-semibold text-sm">{ticket.subject}</p>
                                                <Badge className={`text-[10px] border-none shadow-none ${priorityColors[ticket.priority] || ''}`}>{ticket.priority}</Badge>
                                                <Badge className={`text-[10px] border-none shadow-none flex items-center gap-1 ${statusConfig[ticket.status]?.color || ''}`}>
                                                    <StatusIcon className="h-3 w-3" />{statusConfig[ticket.status]?.label}
                                                </Badge>
                                            </div>
                                            {ticket.description && <p className="text-xs text-muted-foreground mt-1 truncate">{ticket.description}</p>}
                                            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                                                <span>By <span className="font-medium">{submitterName}</span></span>
                                                <Badge variant="outline" className="text-[10px] capitalize">{ticket.category}</Badge>
                                                <span>{format(new Date(ticket.created_at), "MMM dd, yyyy")}</span>
                                                {ticket.resolved_at && <span className="text-emerald-600">Resolved {format(new Date(ticket.resolved_at), "MMM dd")}</span>}
                                            </div>
                                        </div>
                                        {isAdmin && (
                                            <div className="flex items-center gap-1 shrink-0">
                                                {ticket.status === "open" && (
                                                    <Button size="sm" variant="outline" onClick={() => updateStatus(ticket.id, "in_progress")} className="h-7 text-xs">Start</Button>
                                                )}
                                                {ticket.status === "in_progress" && (
                                                    <Button size="sm" onClick={() => updateStatus(ticket.id, "resolved")} className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700">Resolve</Button>
                                                )}
                                                {ticket.status === "resolved" && (
                                                    <Button size="sm" variant="outline" onClick={() => updateStatus(ticket.id, "closed")} className="h-7 text-xs">Close</Button>
                                                )}
                                                <button onClick={() => deleteTicket(ticket.id)} className="text-red-400 hover:text-red-600 ml-1">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Raise Support Ticket</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label>Subject *</Label>
                            <Input placeholder="Brief description of the issue..." value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Category</Label>
                                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="technical">Technical</SelectItem>
                                        <SelectItem value="billing">Billing</SelectItem>
                                        <SelectItem value="hr">HR</SelectItem>
                                        <SelectItem value="general">General</SelectItem>
                                        <SelectItem value="access">Access / Permissions</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Priority</Label>
                                <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                        <SelectItem value="urgent">Urgent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Description</Label>
                            <Textarea placeholder="Describe the issue in detail..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="resize-none h-24" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button onClick={submit} disabled={saving}>{saving ? "Submitting..." : "Submit Ticket"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
