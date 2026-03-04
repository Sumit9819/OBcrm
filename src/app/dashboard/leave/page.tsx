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
import { Coffee, Plus, CheckCircle, XCircle, Clock, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { format, differenceInDays, parseISO } from "date-fns"

type LeaveRequest = {
    id: string
    user_id: string
    leave_type: string
    from_date: string
    to_date: string
    reason?: string
    status: "pending" | "approved" | "rejected"
    created_at: string
    user?: { first_name: string; last_name: string; email: string }
}

type Employee = { id: string; first_name: string; last_name: string; email: string }

const typeColors: Record<string, string> = {
    annual: "bg-blue-100 text-blue-700",
    sick: "bg-red-100 text-red-600",
    casual: "bg-purple-100 text-purple-700",
    maternity: "bg-pink-100 text-pink-700",
    unpaid: "bg-slate-100 text-slate-600",
}
const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-600",
}

export default function LeavePage() {
    const [leaves, setLeaves] = useState<LeaveRequest[]>([])
    const [employees, setEmployees] = useState<Employee[]>([])
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)
    const [tab, setTab] = useState<"all" | "pending" | "approved" | "rejected">("all")
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [userRole, setUserRole] = useState("")
    const [form, setForm] = useState({ user_id: "", leave_type: "annual", from_date: "", to_date: "", reason: "" })
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

        // Load employees for admin use
        const { data: emps } = await supabase
            .from('users')
            .select('id, first_name, last_name, email')
            .eq('agency_id', profile?.agency_id)
            .in('role', ['agent', 'accountant', 'agency_admin', 'super_admin'])

        setEmployees(emps || [])

        // Load leave requests
        let query = supabase
            .from('leave_requests')
            .select('*, user:user_id(first_name, last_name, email)')
            .order('created_at', { ascending: false })

        // Agents only see their own
        if (profile?.role === 'agent' || profile?.role === 'accountant') {
            query = query.eq('user_id', user.id)
        } else {
            query = query.eq('agency_id', profile?.agency_id)
        }

        const { data } = await query
        setLeaves(data || [])
        setLoading(false)
    }, [])

    useEffect(() => { load() }, [])

    const submit = async () => {
        const targetUserId = form.user_id || currentUser?.id
        if (!targetUserId || !form.from_date || !form.to_date) {
            toast.error("Please fill all required fields"); return
        }
        setSaving(true)

        const { error } = await supabase.from('leave_requests').insert({
            user_id: targetUserId,
            agency_id: currentUser?.agency_id,
            leave_type: form.leave_type,
            from_date: form.from_date,
            to_date: form.to_date,
            reason: form.reason || null,
            status: 'pending',
        })

        if (error) toast.error("Failed to submit: " + error.message)
        else {
            toast.success("Leave request submitted! Admins have been notified.")
            setForm({ user_id: "", leave_type: "annual", from_date: "", to_date: "", reason: "" })
            setOpen(false)
            load()
        }
        setSaving(false)
    }

    const updateStatus = async (id: string, status: "approved" | "rejected") => {
        const { error } = await supabase
            .from('leave_requests')
            .update({
                status,
                approved_by: currentUser?.id,
                approved_at: new Date().toISOString()
            })
            .eq('id', id)

        if (error) toast.error("Failed to update")
        else {
            // DB trigger will auto-fill attendance if approved + auto-notify requester
            toast.success(`Leave ${status}! ${status === 'approved' ? 'Attendance auto-updated ✅' : ''}`)
            load()
        }
    }

    const deleteLeave = async (id: string) => {
        await supabase.from('leave_requests').delete().eq('id', id)
        setLeaves(prev => prev.filter(l => l.id !== id))
        toast.info("Deleted")
    }

    const visible = tab === "all" ? leaves : leaves.filter(l => l.status === tab)
    const isAdmin = ['super_admin', 'agency_admin'].includes(userRole)

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 bg-slate-50/50 min-h-screen">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                        <Coffee className="h-6 w-6 text-primary" /> Leave Management
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                        {isAdmin ? "Manage team leave requests." : "Apply for leave and track your requests."}
                        {" "}When leave is approved, attendance is auto-updated.
                    </p>
                </div>
                <Button onClick={() => setOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" /> Apply for Leave
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(["all", "pending", "approved", "rejected"] as const).map(s => (
                    <Card key={s} className={`cursor-pointer border-2 transition-all ${tab === s ? "border-primary shadow-md" : "border-transparent"}`} onClick={() => setTab(s)}>
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className={`p-2 rounded-full ${s === "approved" ? "bg-emerald-100" : s === "rejected" ? "bg-red-100" : s === "pending" ? "bg-amber-100" : "bg-slate-100"}`}>
                                {s === "approved" ? <CheckCircle className="h-5 w-5 text-emerald-500" /> : s === "rejected" ? <XCircle className="h-5 w-5 text-red-500" /> : s === "pending" ? <Clock className="h-5 w-5 text-amber-500" /> : <Coffee className="h-5 w-5 text-slate-500" />}
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{s === "all" ? leaves.length : leaves.filter(l => l.status === s).length}</p>
                                <p className="text-xs text-muted-foreground capitalize">{s}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="shadow-sm">
                <CardHeader className="py-3 border-b">
                    <CardTitle className="text-sm font-bold uppercase text-primary">Leave Requests ({visible.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="py-16 text-center text-muted-foreground text-sm">Loading...</div>
                    ) : visible.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                            <Coffee className="h-10 w-10 opacity-20" />
                            <p>No leave requests found.</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {visible.map(leave => {
                                const days = differenceInDays(parseISO(leave.to_date), parseISO(leave.from_date)) + 1
                                const name = leave.user
                                    ? `${leave.user.first_name} ${leave.user.last_name}`
                                    : 'Unknown'
                                return (
                                    <div key={leave.id} className="flex items-start gap-4 px-4 py-4 hover:bg-slate-50 transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                                            {name.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-semibold text-sm">{name}</p>
                                                <Badge className={`text-[10px] border-none shadow-none ${typeColors[leave.leave_type] || ''}`}>{leave.leave_type}</Badge>
                                                <Badge className={`text-[10px] border-none shadow-none ${statusColors[leave.status]}`}>{leave.status}</Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {format(parseISO(leave.from_date), "MMM dd")} – {format(parseISO(leave.to_date), "MMM dd, yyyy")} · {days} day{days !== 1 ? "s" : ""}
                                            </p>
                                            {leave.reason && <p className="text-xs text-slate-500 mt-1 truncate">{leave.reason}</p>}
                                        </div>
                                        {isAdmin && leave.status === "pending" && (
                                            <div className="flex gap-1 shrink-0">
                                                <Button size="sm" onClick={() => updateStatus(leave.id, "approved")} className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700">
                                                    <CheckCircle className="h-3 w-3 mr-1" /> Approve
                                                </Button>
                                                <Button size="sm" variant="destructive" onClick={() => updateStatus(leave.id, "rejected")} className="h-7 px-2 text-xs">
                                                    <XCircle className="h-3 w-3 mr-1" /> Reject
                                                </Button>
                                            </div>
                                        )}
                                        <button onClick={() => deleteLeave(leave.id)} className="text-red-400 hover:text-red-600 shrink-0 mt-1">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Apply for Leave</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        {isAdmin && (
                            <div className="space-y-1.5">
                                <Label>Employee *</Label>
                                <Select value={form.user_id} onValueChange={v => setForm({ ...form, user_id: v })}>
                                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                                    <SelectContent>
                                        {employees.map(e => (
                                            <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Leave Type *</Label>
                                <Select value={form.leave_type} onValueChange={v => setForm({ ...form, leave_type: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="annual">Annual</SelectItem>
                                        <SelectItem value="sick">Sick</SelectItem>
                                        <SelectItem value="casual">Casual</SelectItem>
                                        <SelectItem value="maternity">Maternity</SelectItem>
                                        <SelectItem value="unpaid">Unpaid</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div />
                            <div className="space-y-1.5">
                                <Label>From *</Label>
                                <Input type="date" value={form.from_date} onChange={e => setForm({ ...form, from_date: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>To *</Label>
                                <Input type="date" value={form.to_date} onChange={e => setForm({ ...form, to_date: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Reason</Label>
                            <Textarea placeholder="Reason for leave..." value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className="resize-none h-20" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button onClick={submit} disabled={saving}>{saving ? "Submitting..." : "Submit Request"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
