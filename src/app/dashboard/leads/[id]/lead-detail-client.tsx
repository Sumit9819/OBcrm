"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
    ArrowLeft, Phone, Mail, Globe, BookOpen, FileText, Briefcase,
    MoreHorizontal, Edit, MessageSquare, Archive, CheckCircle, Clock,
    UserPlus, CheckSquare, GraduationCap, Plus, Calendar, Flag,
    Loader2, User, MapPin,
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import {
    updateLeadStatus, updateLead, addActivity, archiveLead,
    assignLead, convertToStudent, createLeadTask, updateTaskStatus,
} from "./actions"
import Link from "next/link"

const statusColors: Record<string, string> = {
    'New': 'bg-blue-500/10 text-blue-600',
    'Contacted': 'bg-amber-500/10 text-amber-600',
    'Application': 'bg-purple-500/10 text-purple-600',
    'Offer': 'bg-emerald-500/10 text-emerald-600',
    'Visa': 'bg-indigo-500/10 text-indigo-600',
    'Enrolled': 'bg-teal-500/10 text-teal-600',
}
const activityIcons: Record<string, any> = {
    'note': MessageSquare, 'call': Phone, 'email': Mail, 'stage_change': CheckCircle,
}
const priorityColors: Record<string, string> = {
    low: 'text-slate-500', medium: 'text-amber-500', high: 'text-red-500',
}
const STATUSES = ['New', 'Contacted', 'Application', 'Offer', 'Visa', 'Enrolled']

type Props = {
    lead: any
    activities: any[]
    documents: any[]
    applications: any[]
    tasks: any[]
    staffList: any[]
    customFields: any[]
    pipelineStages: any[]
    currentUserId: string
}

export function LeadDetailClient({ lead, activities, documents, applications, tasks, staffList, customFields, pipelineStages, currentUserId }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    // Merge default statuses with custom pipeline stages from DB
    const DEFAULT_STATUSES = ['New', 'Contacted', 'Application', 'Offer', 'Visa', 'Enrolled']
    const customStageNames = pipelineStages.map((s: any) => s.name)
    const ALL_STATUSES = [...DEFAULT_STATUSES, ...customStageNames.filter((n: string) => !DEFAULT_STATUSES.includes(n))]

    // Dialog states
    const [showNote, setShowNote] = useState(false)
    const [showCall, setShowCall] = useState(false)
    const [showEdit, setShowEdit] = useState(false)
    const [showTask, setShowTask] = useState(false)

    // Form states
    const [noteText, setNoteText] = useState("")
    const [callNotes, setCallNotes] = useState("")
    const [editData, setEditData] = useState({
        first_name: lead.first_name || "", last_name: lead.last_name || "",
        email: lead.email || "", phone: lead.phone || "",
        destination_country: lead.destination_country || "",
        course_interest: lead.course_interest || "",
        nationality: lead.nationality || "", notes: lead.notes || "",
    })
    // Custom field values for edit dialog
    const [editCustomData, setEditCustomData] = useState<Record<string, any>>(() => lead.custom_data || {})
    const [taskForm, setTaskForm] = useState({
        title: "", description: "", due_date: "",
        priority: "medium", assigned_to: currentUserId,
    })

    const run = (fn: () => Promise<any>, onSuccess?: () => void) => {
        startTransition(async () => {
            const r = await fn()
            if (r?.error) toast.error(r.error)
            else { onSuccess?.() }
        })
    }

    const handleStatusChange = (status: string) => run(
        () => updateLeadStatus(lead.id, status),
        () => toast.success(`Status → ${status}`)
    )

    const handleAssign = (userId: string) => run(
        () => assignLead(lead.id, userId || null),
        () => toast.success("Lead assigned successfully")
    )

    const handleConvertToStudent = () => {
        if (!confirm(`Convert ${lead.first_name} ${lead.last_name} to an enrolled student? This will set status to Enrolled.`)) return
        run(
            () => convertToStudent(lead.id),
            () => { toast.success("Lead converted to student!"); router.refresh() }
        )
    }

    return (
        <div className="flex-1 space-y-5 p-4 pt-6 md:p-8 max-w-6xl mx-auto">

            {/* ── Header ─────────────────────────────────── */}
            <div className="flex items-start gap-4 flex-wrap">
                <Link href="/dashboard/leads/all">
                    <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0"><ArrowLeft className="h-4 w-4" /></Button>
                </Link>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                            {lead.first_name?.charAt(0)}{lead.last_name?.charAt(0)}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">{lead.first_name} {lead.last_name}</h1>
                            <p className="text-sm text-muted-foreground flex items-center gap-3 flex-wrap">
                                {lead.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</span>}
                                {lead.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</span>}
                                {lead.nationality && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{lead.nationality}</span>}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Select value={lead.status} onValueChange={handleStatusChange} disabled={isPending}>
                        <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" disabled={isPending}><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => setShowEdit(true)}><Edit className="h-3.5 w-3.5 mr-2" />Edit Lead</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setShowNote(true)}><MessageSquare className="h-3.5 w-3.5 mr-2" />Add Note</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setShowCall(true)}><Phone className="h-3.5 w-3.5 mr-2" />Log Call</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setShowTask(true)}><CheckSquare className="h-3.5 w-3.5 mr-2" />Add Task</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleConvertToStudent} className="text-emerald-600">
                                <GraduationCap className="h-3.5 w-3.5 mr-2" />Convert to Student
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => { if (confirm("Delete this lead?")) run(() => archiveLead(lead.id), () => router.push("/dashboard/leads/all")) }}
                                className="text-red-500"
                            >
                                <Archive className="h-3.5 w-3.5 mr-2" />Delete Lead
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* ── Pipeline Progress ──────────────────────── */}
            <div className="space-y-1.5">
                <div className="flex gap-1.5">
                    {ALL_STATUSES.map((s, i) => (
                        <div key={s} className="flex-1 space-y-1">
                            <div className={`h-2 rounded-full transition-all ${ALL_STATUSES.indexOf(lead.status) >= i
                                ? i === ALL_STATUSES.length - 1 ? 'bg-emerald-500' : 'bg-primary'
                                : 'bg-muted'}`}
                            />
                        </div>
                    ))}
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground">
                    {ALL_STATUSES.map(s => <span key={s} className={lead.status === s ? 'font-semibold text-foreground' : ''}>{s}</span>)}
                </div>
            </div>

            {/* ── Info Row ───────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card><CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Destination</p>
                    <p className="font-semibold mt-0.5 flex items-center gap-1"><Globe className="h-3.5 w-3.5 text-muted-foreground" />{lead.destination_country || '—'}</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Course</p>
                    <p className="font-semibold mt-0.5 flex items-center gap-1"><BookOpen className="h-3.5 w-3.5 text-muted-foreground" />{lead.course_interest || '—'}</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Assigned To</p>
                    <div className="mt-0.5">
                        <Select
                            value={lead.assigned_to || "unassigned"}
                            onValueChange={v => handleAssign(v === "unassigned" ? "" : v)}
                            disabled={isPending}
                        >
                            <SelectTrigger className="h-7 text-sm border-none p-0 shadow-none font-semibold">
                                <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                {staffList.map(s => (
                                    <SelectItem key={s.id} value={s.id}>
                                        {s.first_name} {s.last_name}
                                        {s.job_title && <span className="text-muted-foreground ml-1">· {s.job_title}</span>}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Added</p>
                    <p className="font-semibold mt-0.5">{format(new Date(lead.created_at), 'MMM dd, yyyy')}</p>
                    {lead.referrer && <p className="text-xs text-muted-foreground">via {lead.referrer.first_name} {lead.referrer.last_name}</p>}
                </CardContent></Card>
            </div>

            {/* ── Tabs ───────────────────────────────────── */}
            <Tabs defaultValue="timeline" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="timeline">Timeline ({activities.length})</TabsTrigger>
                    <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
                    <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
                    <TabsTrigger value="applications">Applications ({applications.length})</TabsTrigger>
                    {customFields.length > 0 && <TabsTrigger value="details">Extra Details</TabsTrigger>}
                </TabsList>

                {/* ── Timeline ─────────────── */}
                <TabsContent value="timeline" className="space-y-3">
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowNote(true)}>
                            <MessageSquare className="h-3.5 w-3.5" /> Add Note
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowCall(true)}>
                            <Phone className="h-3.5 w-3.5" /> Log Call
                        </Button>
                    </div>
                    {activities.length === 0 ? (
                        <Card><CardContent className="p-12 text-center text-muted-foreground text-sm">No activities yet. Start by adding a note or logging a call.</CardContent></Card>
                    ) : (
                        <div className="space-y-3">
                            {activities.map((a: any) => {
                                const Icon = activityIcons[a.type] || Clock
                                const iconClass = a.type === 'call' ? 'bg-blue-100 text-blue-600' : a.type === 'note' ? 'bg-amber-100 text-amber-600' : a.type === 'stage_change' ? 'bg-emerald-100 text-emerald-600' : 'bg-purple-100 text-purple-600'
                                return (
                                    <div key={a.id} className="flex gap-3 p-4 rounded-lg border bg-card hover:bg-muted/20 transition-colors">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${iconClass}`}>
                                            <Icon className="h-3.5 w-3.5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <Badge variant="outline" className="text-xs capitalize">{a.type.replace('_', ' ')}</Badge>
                                                <span className="text-xs text-muted-foreground">by {a.users?.first_name} {a.users?.last_name}</span>
                                            </div>
                                            <p className="text-sm">{a.description}</p>
                                            <p className="text-xs text-muted-foreground mt-1">{format(new Date(a.created_at), 'MMM dd, yyyy · hh:mm a')}</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </TabsContent>

                {/* ── Tasks ────────────────── */}
                <TabsContent value="tasks" className="space-y-3">
                    <div className="flex justify-end">
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowTask(true)}>
                            <Plus className="h-3.5 w-3.5" /> Add Task
                        </Button>
                    </div>
                    {tasks.length === 0 ? (
                        <Card><CardContent className="p-12 text-center text-muted-foreground text-sm">No tasks linked to this lead. Add one to track follow-ups.</CardContent></Card>
                    ) : (
                        <div className="space-y-2">
                            {tasks.map((t: any) => (
                                <div key={t.id} className={`flex items-center gap-3 p-3 rounded-lg border bg-card ${t.status === 'done' ? 'opacity-60' : ''}`}>
                                    <button
                                        onClick={() => run(() => updateTaskStatus(t.id, t.status === 'done' ? 'open' : 'done'))}
                                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${t.status === 'done' ? 'bg-emerald-500 border-emerald-500' : 'border-muted-foreground hover:border-primary'}`}
                                    >
                                        {t.status === 'done' && <CheckCircle className="h-3 w-3 text-white" />}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium ${t.status === 'done' ? 'line-through' : ''}`}>{t.title}</p>
                                        {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                                        <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                                            {t.due_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(t.due_date), 'MMM dd, yyyy')}</span>}
                                            {t.assigned_user && <span className="flex items-center gap-1"><User className="h-3 w-3" />{t.assigned_user.first_name}</span>}
                                        </p>
                                    </div>
                                    <Flag className={`h-3.5 w-3.5 shrink-0 ${priorityColors[t.priority]}`} />
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* ── Documents ────────────── */}
                <TabsContent value="documents">
                    {documents.length === 0 ? (
                        <Card><CardContent className="p-12 text-center text-muted-foreground text-sm">
                            No documents uploaded.{' '}
                            <Link href="/dashboard/documents" className="text-primary hover:underline">Go to Documents →</Link>
                        </CardContent></Card>
                    ) : (
                        <div className="rounded-lg border overflow-hidden">
                            {documents.map((d: any, i: number) => (
                                <div key={d.id} className={`flex items-center gap-3 p-3 ${i < documents.length - 1 ? 'border-b' : ''}`}>
                                    <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                                    <div className="flex-1"><p className="text-sm font-medium">{d.name}</p><p className="text-xs text-muted-foreground">{d.doc_type?.replace('_', ' ')}{d.expiry_date ? ` · Expires ${format(new Date(d.expiry_date), 'MMM dd, yyyy')}` : ''}</p></div>
                                    <span className="text-xs text-muted-foreground">{format(new Date(d.created_at), 'MMM dd, yyyy')}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* ── Applications ─────────── */}
                <TabsContent value="applications">
                    {applications.length === 0 ? (
                        <Card><CardContent className="p-12 text-center text-muted-foreground text-sm">No applications yet.</CardContent></Card>
                    ) : (
                        <div className="rounded-lg border overflow-hidden">
                            {applications.map((a: any, i: number) => (
                                <div key={a.id} className={`flex items-center gap-3 p-3 ${i < applications.length - 1 ? 'border-b' : ''}`}>
                                    <Briefcase className="h-4 w-4 text-indigo-500 shrink-0" />
                                    <div className="flex-1"><p className="text-sm font-medium">{a.university_name || '—'}</p><p className="text-xs text-muted-foreground">{a.course_name}{a.intake_season ? ` · ${a.intake_season}` : ''}</p></div>
                                    <Badge variant="secondary" className="text-xs">{a.status}</Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* ── Custom Fields ─────────── */}
                {customFields.length > 0 && (
                    <TabsContent value="details">
                        <Card><CardContent className="p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
                            {customFields.map((f: any) => (
                                <div key={f.id}>
                                    <p className="text-xs text-muted-foreground">{f.field_label}</p>
                                    <p className="font-medium text-sm mt-0.5">
                                        {lead.custom_data?.[f.field_key] !== undefined && lead.custom_data[f.field_key] !== ""
                                            ? String(lead.custom_data[f.field_key])
                                            : '—'}
                                    </p>
                                </div>
                            ))}
                        </CardContent></Card>
                    </TabsContent>
                )}
            </Tabs>

            {/* ── Add Note Dialog ─────── */}
            <Dialog open={showNote} onOpenChange={setShowNote}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Add Note</DialogTitle><DialogDescription>Add a note to {lead.first_name}'s timeline.</DialogDescription></DialogHeader>
                    <Textarea placeholder="Enter your note..." value={noteText} onChange={e => setNoteText(e.target.value)} rows={4} />
                    <DialogFooter>
                        <Button onClick={() => run(() => addActivity(lead.id, 'note', noteText), () => { toast.success("Note added"); setNoteText(""); setShowNote(false) })} disabled={isPending || !noteText.trim()}>
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Note"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Log Call Dialog ─────── */}
            <Dialog open={showCall} onOpenChange={setShowCall}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Log a Call</DialogTitle><DialogDescription>Record call details with {lead.first_name}.</DialogDescription></DialogHeader>
                    <Textarea placeholder="What was discussed?" value={callNotes} onChange={e => setCallNotes(e.target.value)} rows={4} />
                    <DialogFooter>
                        <Button onClick={() => run(() => addActivity(lead.id, 'call', callNotes), () => { toast.success("Call logged"); setCallNotes(""); setShowCall(false) })} disabled={isPending || !callNotes.trim()}>
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log Call"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Edit Lead Dialog ─────── */}
            <Dialog open={showEdit} onOpenChange={setShowEdit}>
                <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>Edit Lead</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-1.5"><Label>First Name</Label><Input value={editData.first_name} onChange={e => setEditData({ ...editData, first_name: e.target.value })} /></div>
                            <div className="grid gap-1.5"><Label>Last Name</Label><Input value={editData.last_name} onChange={e => setEditData({ ...editData, last_name: e.target.value })} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-1.5"><Label>Email</Label><Input type="email" value={editData.email} onChange={e => setEditData({ ...editData, email: e.target.value })} /></div>
                            <div className="grid gap-1.5"><Label>Phone</Label><Input value={editData.phone} onChange={e => setEditData({ ...editData, phone: e.target.value })} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-1.5"><Label>Destination</Label><Input value={editData.destination_country} onChange={e => setEditData({ ...editData, destination_country: e.target.value })} /></div>
                            <div className="grid gap-1.5"><Label>Nationality</Label><Input value={editData.nationality} onChange={e => setEditData({ ...editData, nationality: e.target.value })} /></div>
                        </div>
                        <div className="grid gap-1.5"><Label>Course Interest</Label><Input value={editData.course_interest} onChange={e => setEditData({ ...editData, course_interest: e.target.value })} /></div>
                        <div className="grid gap-1.5"><Label>Internal Notes</Label><Textarea value={editData.notes} onChange={e => setEditData({ ...editData, notes: e.target.value })} rows={2} /></div>
                        {/* Custom fields in edit dialog */}
                        {customFields.length > 0 && (
                            <div className="border-t pt-3 space-y-3">
                                <p className="text-sm font-medium text-muted-foreground">Additional Details</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {customFields.map((f: any) => (
                                        <div key={f.id} className="grid gap-1.5">
                                            <Label className="text-xs">{f.field_label}{f.is_required && <span className="text-red-500 ml-1">*</span>}</Label>
                                            {f.field_type === 'select' && f.options ? (
                                                <select
                                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                                                    value={editCustomData[f.field_key] || ''}
                                                    onChange={e => setEditCustomData(prev => ({ ...prev, [f.field_key]: e.target.value }))}
                                                >
                                                    <option value="">Select...</option>
                                                    {f.options.map((o: string) => <option key={o} value={o}>{o}</option>)}
                                                </select>
                                            ) : f.field_type === 'boolean' ? (
                                                <div className="flex items-center gap-2 h-9">
                                                    <input type="checkbox" checked={!!editCustomData[f.field_key]}
                                                        onChange={e => setEditCustomData(prev => ({ ...prev, [f.field_key]: e.target.checked }))}
                                                        className="h-4 w-4 rounded border-input" />
                                                    <span className="text-sm text-muted-foreground">Yes</span>
                                                </div>
                                            ) : (
                                                <Input
                                                    type={f.field_type === 'number' ? 'number' : f.field_type === 'date' ? 'date' : 'text'}
                                                    value={editCustomData[f.field_key] || ''}
                                                    onChange={e => setEditCustomData(prev => ({ ...prev, [f.field_key]: e.target.value }))}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button onClick={() => run(
                            () => updateLead(lead.id, { ...editData, custom_data: Object.keys(editCustomData).length > 0 ? editCustomData : undefined }),
                            () => { toast.success("Lead updated"); setShowEdit(false) }
                        )} disabled={isPending}>
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Add Task Dialog ─────── */}
            <Dialog open={showTask} onOpenChange={setShowTask}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Add Task</DialogTitle><DialogDescription>Create a task linked to {lead.first_name}.</DialogDescription></DialogHeader>
                    <div className="grid gap-3 py-2">
                        <div className="grid gap-1.5"><Label>Task Title *</Label><Input placeholder="e.g. Follow up on documents" value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} /></div>
                        <div className="grid gap-1.5"><Label>Notes</Label><Textarea placeholder="Additional details..." value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} rows={2} /></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-1.5">
                                <Label>Due Date</Label>
                                <Input type="datetime-local" value={taskForm.due_date} onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })} />
                            </div>
                            <div className="grid gap-1.5">
                                <Label>Priority</Label>
                                <Select value={taskForm.priority} onValueChange={v => setTaskForm({ ...taskForm, priority: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid gap-1.5">
                            <Label>Assign To</Label>
                            <Select value={taskForm.assigned_to} onValueChange={v => setTaskForm({ ...taskForm, assigned_to: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {staffList.map(s => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            onClick={() => run(
                                () => createLeadTask(lead.id, taskForm),
                                () => { toast.success("Task created!"); setShowTask(false); setTaskForm({ title: "", description: "", due_date: "", priority: "medium", assigned_to: currentUserId }) }
                            )}
                            disabled={isPending || !taskForm.title.trim()}
                        >
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Task"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
