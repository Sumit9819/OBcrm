"use client"

import { useState, useTransition, useEffect } from "react"
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
import { PipelineStepper } from "@/components/ui/pipeline-stepper"
import {
    ArrowLeft, Phone, Mail, Globe, BookOpen, FileText, Briefcase,
    MoreHorizontal, Edit, MessageSquare, Archive, CheckCircle, Clock,
    UserPlus, CheckSquare, GraduationCap, Plus, Calendar, Flag,
    Loader2, User, MapPin, PhoneCall, PhoneOff, FlaskConical, AlertTriangle, Send
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import {
    updateLeadStatus, updateLead, addActivity, archiveLead,
    assignLead, convertToStudent, createLeadTask, updateTaskStatus,
    getMatchingCourses
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

type Props = {
    lead: any
    activities: any[]
    documents: any[]
    applications: any[]
    tasks: any[]
    staffList: any[]
    customFields: any[]
    pipelineStages: any[]
    documentTemplates: any[]
    currentUserId: string
    callLogs?: any[]
}

export function LeadDetailClient({ lead, activities, documents, applications, tasks, staffList, customFields, pipelineStages, documentTemplates, currentUserId, callLogs = [] }: Props) {
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
    const [showConvert, setShowConvert] = useState(false)
    const [paymentBlocked, setPaymentBlocked] = useState(false)
    const [paymentBlockedMsg, setPaymentBlockedMsg] = useState("")

    // Call log form state
    const [callAnswered, setCallAnswered] = useState<boolean | null>(null)
    const [callFeedback, setCallFeedback] = useState("")
    const [callComment, setCallComment] = useState("")
    const [callFollowup, setCallFollowup] = useState("")
    const [localCallLogs, setLocalCallLogs] = useState<any[]>(callLogs)

    // Form states
    const [noteText, setNoteText] = useState("")
    const [quickNoteText, setQuickNoteText] = useState("")
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
    const [quickActionMode, setQuickActionMode] = useState<'note' | 'call_answered' | 'call_missed'>('note')

    // Matcher State
    const [matchedCourses, setMatchedCourses] = useState<any[]>([])
    const [loadingCourses, setLoadingCourses] = useState(false)
    const hasAcademicData = !!(lead.calculated_gpa || lead.english_test_score)

    useEffect(() => {
        if (hasAcademicData) {
            setLoadingCourses(true)
            getMatchingCourses(lead.id).then(res => {
                if (res?.data) setMatchedCourses(res.data)
                setLoadingCourses(false)
            })
        }
    }, [hasAcademicData, lead.id])

    const run = (fn: () => Promise<any>, onSuccess?: () => void) => {
        startTransition(async () => {
            const r = await fn()
            if (r?.error) toast.error(r.error)
            else { onSuccess?.() }
        })
    }

    const handleQuickActionSubmit = async () => {
        if (!quickNoteText.trim() && quickActionMode === 'note') return;

        startTransition(async () => {
            if (quickActionMode === 'note') {
                const r = await addActivity(lead.id, 'note', quickNoteText.trim());
                if (r?.error) toast.error(r.error);
                else {
                    toast.success("Note added");
                    setQuickNoteText("");
                    router.refresh();
                }
            } else {
                // Determine if answered
                const isAnswered = quickActionMode === 'call_answered';

                const supabase = (await import("@/lib/supabase/client")).createClient()
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return
                const { data: profile } = await supabase.from("users").select("agency_id").eq("id", user.id).single()

                // Insert into call logs
                const { data, error } = await supabase.from("call_logs").insert({
                    lead_id: lead.id,
                    agency_id: profile?.agency_id,
                    logged_by: user.id,
                    answered: isAnswered,
                    feedback: quickNoteText.trim() || null,
                }).select("*, logged_by_user:users!call_logs_logged_by_fkey(first_name, last_name)").single()

                if (error) { toast.error(error.message); return }

                toast.success("Call logged!");
                setLocalCallLogs(prev => [data, ...prev]);

                // Add summary to activity timeline
                await addActivity(lead.id, 'call', `${isAnswered ? '\u2705 Answered' : '\u274c Not Answered'} \u2014 ${quickNoteText.trim() || 'No quick comment'}`)

                setQuickNoteText("");
                setQuickActionMode('note'); // reset back to normal note
                router.refresh();
            }
        });
    }

    const handleStatusChange = (status: string) => {
        // Validate required documents
        const targetStage = pipelineStages.find((s: any) => s.name === status)
        if (targetStage) {
            const requiredDocs = documentTemplates.filter((t: any) => t.stage_id === targetStage.id && t.is_mandatory)
            const missingDocs = requiredDocs.filter((t: any) =>
                !documents.some((d: any) => d.name.toLowerCase() === t.name.toLowerCase())
            )

            if (missingDocs.length > 0) {
                toast.error(`Cannot move to ${status}. Missing mandatory documents: ${missingDocs.map((d: any) => d.name).join(", ")}`)
                return
            }
        }

        run(
            () => updateLeadStatus(lead.id, status),
            () => toast.success(`Status \u2192 ${status}`)
        )
    }

    const handleAssign = (userId: string) => run(
        () => assignLead(lead.id, userId || null),
        () => toast.success("Lead assigned successfully")
    )

    const handleConvertToStudent = (type: 'abroad' | 'test_prep', override = false) => {
        startTransition(async () => {
            const r = await convertToStudent(lead.id, type, override)
            if (r?.error === 'PAYMENT_REQUIRED') {
                // Show payment warning inside the dialog
                setPaymentBlocked(true)
                setPaymentBlockedMsg((r as any).message || 'Payment required.')
            } else if (r?.error) {
                toast.error(r.error)
            } else {
                toast.success(type === 'abroad' ? "Converted to Student (Abroad)!" : "Converted to Learner (Test Prep)!")
                setShowConvert(false)
                setPaymentBlocked(false)
                router.refresh()
            }
        })
    }

    const handleLogCall = async () => {
        if (callAnswered === null) { toast.error("Please select if the call was answered"); return }
        const supabase = (await import("@/lib/supabase/client")).createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: profile } = await supabase.from("users").select("agency_id").eq("id", user.id).single()

        const { data, error } = await supabase.from("call_logs").insert({
            lead_id: lead.id,
            agency_id: profile?.agency_id,
            logged_by: user.id,
            answered: callAnswered,
            feedback: callFeedback.trim() || null,
            comment: callComment.trim() || null,
            next_followup_at: callFollowup || null,
        }).select("*, logged_by_user:users!call_logs_logged_by_fkey(first_name, last_name)").single()

        if (error) { toast.error(error.message); return }
        toast.success("Call logged!")
        setLocalCallLogs(prev => [data, ...prev])
        // Also add as activity
        await addActivity(lead.id, 'call', `${callAnswered ? '\u2705 Answered' : '\u274c Not Answered'} \u2014 ${callFeedback || 'No feedback'}`)
        setCallAnswered(null); setCallFeedback(""); setCallComment(""); setCallFollowup("")
        setShowCall(false)
        router.refresh()
    }

    return (
        <div className="flex-1 p-4 pt-6 md:p-8 max-w-[1600px] mx-auto w-full space-y-6" >

            {/* \u2500\u2500 Header \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
            < div className="flex items-start gap-4 flex-wrap" >
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
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="hidden sm:flex" disabled={isPending}><MoreHorizontal className="h-4 w-4 mr-2" /> Actions</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => setShowEdit(true)}><Edit className="h-3.5 w-3.5 mr-2" />Edit Lead</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setShowNote(true)}><MessageSquare className="h-3.5 w-3.5 mr-2" />Add Note</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setShowCall(true)}><Phone className="h-3.5 w-3.5 mr-2" />Log Call</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setShowTask(true)}><CheckSquare className="h-3.5 w-3.5 mr-2" />Add Task</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setShowConvert(true)} className="text-emerald-600">
                                <GraduationCap className="h-3.5 w-3.5 mr-2" />Convert Lead
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
            </div >

            {/* \u2500\u2500 Pipeline Progress \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
            < div className="bg-card border rounded-xl overflow-hidden" >
                <PipelineStepper
                    currentStatus={lead.status}
                    statuses={ALL_STATUSES}
                    onStatusChange={handleStatusChange}
                    disabled={isPending}
                />
            </div >

            {/* \u2500\u2500 3-Column Layout \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
            < div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_350px] xl:grid-cols-[320px_1fr_380px] gap-6 items-start mt-6" >

                {/* \u2500\u2500 Left Column: Identity Profile \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
                < div className="space-y-4 flex flex-col sm:sticky sm:top-6" >
                    {/* Alerts */}
                    {
                        (() => {
                            const currentStage = pipelineStages.find((s: any) => s.name === lead.status);
                            const stageDocs = documentTemplates.filter((t: any) => t.stage_id === currentStage?.id);
                            const missingDocs = stageDocs.filter((t: any) => t.is_mandatory && !documents.some((d: any) => d.name.toLowerCase() === t.name.toLowerCase()));
                            if (missingDocs.length > 0) {
                                return (
                                    <div className="p-3 border border-rose-200 bg-rose-50 rounded-lg shadow-sm">
                                        <h4 className="text-sm font-semibold text-rose-800 flex items-center gap-1.5 mb-1.5">
                                            <AlertTriangle className="h-4 w-4" /> Missing Docs
                                        </h4>
                                        <ul className="space-y-1">
                                            {missingDocs.map((d: any) => (
                                                <li key={d.id} className="text-xs font-medium text-rose-900">• {d.name}</li>
                                            ))}
                                        </ul>
                                    </div>
                                );
                            }
                            return null;
                        })()
                    }

                    <Card>
                        <CardHeader className="pb-3 border-b"><CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Properties</CardTitle></CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <div>
                                <p className="text-xs text-muted-foreground whitespace-nowrap">Destination</p>
                                <p className="text-sm font-medium mt-0.5 flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-muted-foreground" />{lead.destination_country || '—'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground whitespace-nowrap">Course Interest</p>
                                <p className="text-sm font-medium mt-0.5 flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5 text-muted-foreground" />{lead.course_interest || '—'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground whitespace-nowrap mb-1">Assigned To</p>
                                <Select
                                    value={lead.assigned_to || "unassigned"}
                                    onValueChange={v => handleAssign(v === "unassigned" ? "" : v)}
                                    disabled={isPending}
                                >
                                    <SelectTrigger className="h-8 text-sm font-medium">
                                        <SelectValue placeholder="Unassigned" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unassigned">Unassigned</SelectItem>
                                        {staffList.map(s => (
                                            <SelectItem key={s.id} value={s.id}>
                                                {s.first_name} {s.last_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="pt-3 border-t text-xs text-muted-foreground">
                                Added {format(new Date(lead.created_at), 'MMM dd, yyyy')}
                                {lead.referrer && ` via ${lead.referrer.first_name}`}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="p-4 pb-2 border-b"><CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Quick Actions</CardTitle></CardHeader>
                        <CardContent className="p-4 grid gap-2">
                            <Button variant="secondary" className="w-full justify-start text-sm font-medium" onClick={() => setShowCall(true)}><Phone className="h-4 w-4 mr-2" /> Log a Call</Button>
                            <Button variant="secondary" className="w-full justify-start text-sm font-medium" onClick={() => setShowTask(true)}><CheckSquare className="h-4 w-4 mr-2" /> Add a Task</Button>
                            <Button variant="secondary" className="w-full justify-start text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 text-sm font-medium" onClick={() => setShowConvert(true)}><GraduationCap className="h-4 w-4 mr-2" /> Convert Lead</Button>
                        </CardContent>
                    </Card>
                </div >

                {/* \u2500\u2500 Middle Column: Working Area \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
                < div className="min-w-0 bg-card border rounded-xl overflow-hidden shadow-sm" >
                    <Tabs defaultValue="tasks" className="w-full">
                        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent overflow-x-auto flex-nowrap">
                            <TabsTrigger value="tasks" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 whitespace-nowrap">Tasks ({tasks.length})</TabsTrigger>
                            <TabsTrigger value="docs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 whitespace-nowrap">Documents ({documents.length})</TabsTrigger>
                            <TabsTrigger value="matcher" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent px-4 py-3 whitespace-nowrap text-emerald-700 font-medium">Course Matcher \u2728</TabsTrigger>
                            <TabsTrigger value="applications" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 whitespace-nowrap">Applications ({applications.length})</TabsTrigger>
                            {customFields.length > 0 && <TabsTrigger value="details" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 whitespace-nowrap">Information</TabsTrigger>}
                        </TabsList>

                        <div className="p-6">
                            {/* Course Matcher Tab */}
                            <TabsContent value="matcher" className="m-0 space-y-4 outline-none">
                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <h3 className="font-semibold text-lg flex items-center gap-2">
                                            Smart Matcher
                                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">BETA</Badge>
                                        </h3>
                                        <p className="text-sm text-muted-foreground">Auto-suggested courses based on {lead.first_name}'s academic profile (GPA: {lead.calculated_gpa || 'N/A'}, {lead.english_test_type || 'English'}: {lead.english_test_score || 'N/A'})</p>
                                    </div>
                                    <Button variant="outline" size="sm" className="gap-2">
                                        <Globe className="h-4 w-4" /> Filter Matcher
                                    </Button>
                                </div>

                                {!(lead.calculated_gpa || lead.english_test_score) ? (
                                    <div className="p-8 text-center border border-dashed rounded-lg bg-emerald-50/30">
                                        <FlaskConical className="h-8 w-8 text-emerald-400 mx-auto mb-3" />
                                        <h4 className="font-medium text-emerald-900">Need More Academic Data</h4>
                                        <p className="text-sm text-emerald-700/80 mt-1 max-w-sm mx-auto">Update the student's Academics profile with their GPA or English test scores to unlock automatic course matching.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {loadingCourses ? (
                                            <div className="p-8 text-center border border-dashed rounded-lg bg-slate-50/50">
                                                <Loader2 className="h-8 w-8 text-slate-400 animate-spin mx-auto mb-3" />
                                                <h4 className="font-medium text-slate-700">Finding Best Matches...</h4>
                                            </div>
                                        ) : matchedCourses.length === 0 ? (
                                            <div className="p-8 text-center border border-dashed rounded-lg bg-slate-50/50">
                                                <GraduationCap className="h-8 w-8 text-slate-400 mx-auto mb-3" />
                                                <h4 className="font-medium text-slate-700">No matching courses found</h4>
                                                <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">Try adding more university courses or updating the lead's academic profile.</p>
                                            </div>
                                        ) : (
                                            matchedCourses.map((course) => (
                                                <div key={course.id} className="p-4 border rounded-xl bg-background hover:border-emerald-200 transition-colors flex items-center justify-between gap-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-lg bg-slate-100 border flex items-center justify-center font-bold text-slate-400 text-xl">
                                                            {course.universities?.name?.charAt(0) || 'U'}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold">{course.name}</h4>
                                                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                                                                <MapPin className="h-3 w-3" /> {course.universities?.name}, {course.universities?.country}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col items-end gap-2">
                                                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
                                                            Perfect Match \u2713
                                                        </Badge>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <span>Intake: {course.intakes || 'Any'}</span>
                                                            {course.tuition_fee && (
                                                                <>
                                                                    <span>\u2022</span>
                                                                    <span>${course.tuition_fee}/yr</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </TabsContent>

                            {/* Academics Tab */}
                            <TabsContent value="academics" className="m-0 space-y-4 outline-none">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-semibold text-lg">Academic Profile</h3>
                                </div>

                                {/* Top stats for auto-matching */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                    <div className="p-3 border rounded-xl bg-slate-50/50">
                                        <p className="text-xs text-muted-foreground mb-1">Calculated GPA</p>
                                        <p className="text-xl font-bold">{lead.calculated_gpa || '\u2014'}</p>
                                    </div>
                                    <div className="p-3 border rounded-xl bg-slate-50/50">
                                        <p className="text-xs text-muted-foreground mb-1">English Test Type</p>
                                        <p className="text-xl font-bold">{lead.english_test_type || '\u2014'}</p>
                                    </div>
                                    <div className="p-3 border rounded-xl bg-slate-50/50">
                                        <p className="text-xs text-muted-foreground mb-1">Test Score</p>
                                        <p className="text-xl font-bold">{lead.english_test_score || '\u2014'}</p>
                                    </div>
                                    <div className="p-3 border rounded-xl bg-slate-50/50 flex flex-col justify-center">
                                        <Button variant="outline" size="sm" className="w-full">
                                            Edit Stats
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center mb-2 mt-8">
                                    <h3 className="font-semibold">Previous Qualifications</h3>
                                    <Button variant="outline" size="sm" className="gap-1.5">
                                        <Plus className="h-3.5 w-3.5" /> Add Qualification
                                    </Button>
                                </div>
                                <div className="p-8 text-center border border-dashed rounded-lg text-muted-foreground text-sm">
                                    No qualifications added yet. Detailed qualifications list will appear here.
                                </div>
                            </TabsContent>
                            {/* Tasks Tab */}
                            <TabsContent value="tasks" className="m-0 space-y-4 outline-none">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-semibold">Ongoing Tasks</h3>
                                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowTask(true)}>
                                        <Plus className="h-3.5 w-3.5" /> Add Task
                                    </Button>
                                </div>
                                {tasks.length === 0 ? (
                                    <div className="p-8 text-center border border-dashed rounded-lg text-muted-foreground text-sm">No tasks linked to this lead. Add one to track follow-ups.</div>
                                ) : (
                                    <div className="space-y-2">
                                        {tasks.map((t: any) => (
                                            <div key={t.id} className={`flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted/30 transition-colors ${t.status === 'done' ? 'opacity-60 bg-muted/20' : ''}`}>
                                                <button
                                                    onClick={() => run(() => updateTaskStatus(t.id, t.status === 'done' ? 'open' : 'done'))}
                                                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${t.status === 'done' ? 'bg-emerald-500 border-emerald-500' : 'border-muted-foreground hover:border-primary'}`}
                                                >
                                                    {t.status === 'done' && <CheckCircle className="h-3 w-3 text-white" />}
                                                </button>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-medium ${t.status === 'done' ? 'line-through' : ''}`}>{t.title}</p>
                                                    {t.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.description}</p>}
                                                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                                        {t.due_date && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="h-3 w-3" />{format(new Date(t.due_date), 'MMM dd, yyyy')}</span>}
                                                        {t.assigned_user && <span className="flex items-center gap-1 text-xs text-muted-foreground"><User className="h-3 w-3" />{t.assigned_user.first_name}</span>}
                                                    </div>
                                                </div>
                                                <Flag className={`h-4 w-4 shrink-0 ${priorityColors[t.priority]}`} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>

                            {/* Documents Tab */}
                            <TabsContent value="documents" className="m-0 space-y-4 outline-none">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-semibold">Uploaded Documents</h3>
                                </div>
                                {documents.length === 0 ? (
                                    <div className="p-8 text-center border border-dashed rounded-lg text-muted-foreground text-sm">
                                        No documents uploaded. <Link href="/dashboard/documents" className="text-primary hover:underline font-medium">Go to Documents \u2192</Link>
                                    </div>
                                ) : (
                                    <div className="rounded-lg border overflow-hidden bg-background">
                                        {documents.map((d: any, i: number) => (
                                            <div key={d.id} className={`flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors ${i < documents.length - 1 ? 'border-b' : ''}`}>
                                                <div className="bg-blue-100 p-2 rounded-md">
                                                    <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                                                </div>
                                                <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{d.name}</p><p className="text-xs text-muted-foreground capitalize">{d.doc_type?.replace('_', ' ')}{d.expiry_date ? ` \u00b7 Expires ${format(new Date(d.expiry_date), 'MMM dd, yyyy')}` : ''}</p></div>
                                                <div className="text-right">
                                                    <span className="text-xs text-muted-foreground block">{format(new Date(d.created_at), 'MMM dd, yyyy')}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>

                            {/* Applications Tab */}
                            <TabsContent value="applications" className="m-0 space-y-4 outline-none">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-semibold">Applications</h3>
                                </div>
                                {applications.length === 0 ? (
                                    <div className="p-8 text-center border border-dashed rounded-lg text-muted-foreground text-sm">No applications yet.</div>
                                ) : (
                                    <div className="rounded-lg border overflow-hidden bg-background">
                                        {applications.map((a: any, i: number) => (
                                            <div key={a.id} className={`flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors ${i < applications.length - 1 ? 'border-b' : ''}`}>
                                                <div className="bg-indigo-100 p-2 rounded-md">
                                                    <Briefcase className="h-4 w-4 text-indigo-600 shrink-0" />
                                                </div>
                                                <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{a.university_name || '\u2014'}</p><p className="text-xs text-muted-foreground">{a.course_name}{a.intake_season ? ` \u00b7 ${a.intake_season}` : ''}</p></div>
                                                <Badge variant="secondary" className="text-xs">{a.status}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>

                            {/* Details Tab */}
                            {customFields.length > 0 && (
                                <TabsContent value="details" className="m-0 space-y-4 outline-none">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-semibold">Custom Information</h3>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border rounded-lg p-4 bg-background">
                                        {customFields.map((f: any) => (
                                            <div key={f.id} className="pb-2 border-b last:border-0 sm:last:border-b-0 sm:nth-last-2:border-0">
                                                <p className="text-xs text-muted-foreground">{f.field_label}</p>
                                                <p className="font-medium text-sm mt-0.5 break-words">
                                                    {lead.custom_data?.[f.field_key] !== undefined && lead.custom_data[f.field_key] !== ""
                                                        ? String(lead.custom_data[f.field_key])
                                                        : '\u2014'}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </TabsContent>
                            )}
                        </div>
                    </Tabs>
                </div >

                {/* \u2500\u2500 Right Column: Timeline \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
                < div className="flex flex-col sm:h-[calc(100vh-120px)] sm:sticky sm:top-6" >
                    <Card className="flex flex-col h-[500px] sm:h-full overflow-hidden shadow-sm">
                        <CardHeader className="py-3 px-4 border-b bg-muted/30 shrink-0">
                            <CardTitle className="text-sm font-medium flex justify-between items-center">
                                Omnichannel Timeline
                                <Badge variant="secondary" className="text-[10px]">{activities.length + localCallLogs.length} Events</Badge>
                            </CardTitle>
                        </CardHeader>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {(() => {
                                const allEvents = [
                                    ...activities.map((a: any) => ({ ...a, eventType: 'activity' as const, dateStr: a.created_at })),
                                    ...localCallLogs.map((c: any) => ({ ...c, eventType: 'call' as const, dateStr: c.created_at }))
                                ].sort((a, b) => new Date(b.dateStr).getTime() - new Date(a.dateStr).getTime());

                                if (allEvents.length === 0) {
                                    return <div className="text-center text-muted-foreground text-sm py-8 block">No history yet. Start by sending a message or adding a note.</div>
                                }

                                return allEvents.map((event, index) => {
                                    const isLast = index === allEvents.length - 1;

                                    if (event.eventType === 'activity') {
                                        const a = event;
                                        const Icon = activityIcons[a.type] || Clock
                                        const iconClass = a.type === 'call' ? 'bg-blue-100 text-blue-600' : a.type === 'note' ? 'bg-amber-100 text-amber-600' : a.type === 'stage_change' ? 'bg-emerald-100 text-emerald-600' : 'bg-purple-100 text-purple-600'
                                        return (
                                            <div key={`act-${a.id}`} className="flex gap-3 relative">
                                                {!isLast && <div className="absolute left-[15px] top-8 bottom-[-16px] w-[2px] bg-border z-0" />}
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${iconClass} ring-4 ring-card`}>
                                                    <Icon className="h-3.5 w-3.5" />
                                                </div>
                                                <div className="flex-1 min-w-0 bg-muted/30 rounded-lg p-3 border">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-semibold capitalize text-foreground">{a.type.replace('_', ' ')}</span>
                                                        </div>
                                                        <span className="text-[10px] text-muted-foreground">{format(new Date(a.created_at), 'MMM dd, h:mm a')}</span>
                                                    </div>
                                                    <p className="text-sm text-foreground/90">{a.description}</p>
                                                    <p className="text-[10px] text-muted-foreground mt-2 font-medium">by {a.users?.first_name || 'System'}</p>
                                                </div>
                                            </div>
                                        )
                                    } else {
                                        const cl = event;
                                        return (
                                            <div key={`call-${cl.id}`} className="flex gap-3 relative">
                                                {!isLast && <div className="absolute left-[15px] top-8 bottom-[-16px] w-[2px] bg-border z-0" />}
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ring-4 ring-card ${cl.answered ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500'}`}>
                                                    {cl.answered ? <PhoneCall className="h-3.5 w-3.5" /> : <PhoneOff className="h-3.5 w-3.5" />}
                                                </div>
                                                <div className="flex-1 min-w-0 bg-muted/30 rounded-lg p-3 border-l-4 border-l-blue-400 border-y border-r border border-r-border border-y-border">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-semibold text-foreground">{cl.answered ? 'Call Answered' : 'Call Missed'}</span>
                                                        </div>
                                                        <span className="text-[10px] text-muted-foreground">{format(new Date(cl.created_at), 'MMM dd, h:mm a')}</span>
                                                    </div>
                                                    {cl.feedback && <p className="text-sm text-foreground/90 font-medium">{cl.feedback}</p>}
                                                    {cl.comment && <p className="text-xs text-muted-foreground mt-1">{cl.comment}</p>}
                                                    {cl.next_followup_at && (
                                                        <div className="mt-2 bg-blue-50/80 rounded px-2 py-1 border border-blue-100 inline-block">
                                                            <p className="text-[10px] text-blue-700 flex items-center gap-1 font-medium">
                                                                <Calendar className="h-3 w-3" /> Follow up: {format(new Date(cl.next_followup_at), 'MMM dd')}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    }
                                })
                            })()}
                        </div>

                        {/* Universal Quick Input / Inline Logging */}
                        <div className="p-3 bg-muted/20 border-t shrink-0">
                            {/* Action Type Selectors */}
                            <div className="flex items-center gap-1 mb-2">
                                <button
                                    onClick={() => setQuickActionMode('note')}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${quickActionMode === 'note' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                                >
                                    <MessageSquare className="h-3.5 w-3.5" /> Note
                                </button>
                                <button
                                    onClick={() => setQuickActionMode('call_answered')}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${quickActionMode === 'call_answered' ? 'bg-emerald-500 text-white shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                                >
                                    <PhoneCall className="h-3.5 w-3.5" /> Answered
                                </button>
                                <button
                                    onClick={() => setQuickActionMode('call_missed')}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${quickActionMode === 'call_missed' ? 'bg-rose-500 text-white shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                                >
                                    <PhoneOff className="h-3.5 w-3.5" /> Missed
                                </button>
                            </div>

                            <div className="relative">
                                <Textarea
                                    className={`pr-12 min-h-[60px] text-sm resize-none focus-visible:ring-1 bg-background ${quickActionMode === 'call_answered' ? 'border-emerald-200 focus-visible:ring-emerald-500' : quickActionMode === 'call_missed' ? 'border-rose-200 focus-visible:ring-rose-500' : ''}`}
                                    placeholder={quickActionMode === 'note' ? "Type a quick note..." : quickActionMode === 'call_answered' ? "What did they say?" : "Any comment on the missed call?"}
                                    value={quickNoteText}
                                    onChange={e => setQuickNoteText(e.target.value)}
                                    disabled={isPending}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleQuickActionSubmit();
                                        }
                                    }}
                                />
                                <Button
                                    size="icon"
                                    className={`absolute bottom-2 right-2 h-7 w-7 rounded-sm ${quickActionMode === 'call_answered' ? 'bg-emerald-500 hover:bg-emerald-600' : quickActionMode === 'call_missed' ? 'bg-rose-500 hover:bg-rose-600' : ''}`}
                                    disabled={(!quickNoteText.trim() && quickActionMode === 'note') || isPending}
                                    onClick={handleQuickActionSubmit}
                                >
                                    {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                </Button>
                            </div>
                            <div className="flex justify-between mt-1.5 px-1">
                                <span className="text-[10px] text-muted-foreground">Press Enter to save</span>
                            </div>
                        </div>
                    </Card>
                </div >

            </div >

            {/* \u2500\u2500 Add Note Dialog \u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
            < Dialog open={showNote} onOpenChange={setShowNote} >
                <DialogContent>
                    <DialogHeader><DialogTitle>Add Note</DialogTitle><DialogDescription>Add a note to {lead.first_name}'s timeline.</DialogDescription></DialogHeader>
                    <Textarea placeholder="Enter your note..." value={noteText} onChange={e => setNoteText(e.target.value)} rows={4} />
                    <DialogFooter>
                        <Button onClick={() => run(() => addActivity(lead.id, 'note', noteText), () => { toast.success("Note added"); setNoteText(""); setShowNote(false); router.refresh() })} disabled={isPending || !noteText.trim()}>
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Note"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            {/* \u2500\u2500 Log Call Dialog \u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
            < Dialog open={showCall} onOpenChange={setShowCall} >
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Log a Call</DialogTitle><DialogDescription>Record call details with {lead.first_name}.</DialogDescription></DialogHeader>
                    <div className="space-y-4 py-1">
                        {/* Answered? */}
                        <div className="space-y-1.5">
                            <Label>Was the call answered? *</Label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCallAnswered(true)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors ${callAnswered === true ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'hover:bg-muted'
                                        }`}
                                >
                                    <PhoneCall className="h-4 w-4" /> Yes, Answered
                                </button>
                                <button
                                    onClick={() => setCallAnswered(false)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors ${callAnswered === false ? 'bg-red-50 border-red-400 text-red-600' : 'hover:bg-muted'
                                        }`}
                                >
                                    <PhoneOff className="h-4 w-4" /> Not Answered
                                </button>
                            </div>
                        </div>
                        {/* Feedback */}
                        <div className="space-y-1.5">
                            <Label>Feedback / Interest Level</Label>
                            <Input placeholder="e.g. Very interested, asked about visa timeline..." value={callFeedback} onChange={e => setCallFeedback(e.target.value)} />
                        </div>
                        {/* Comment */}
                        <div className="space-y-1.5">
                            <Label>Internal Comment</Label>
                            <Textarea placeholder="Internal notes about this call..." value={callComment} onChange={e => setCallComment(e.target.value)} rows={2} />
                        </div>
                        {/* Next Followup */}
                        <div className="space-y-1.5">
                            <Label>Next Follow-up Date & Time</Label>
                            <Input type="datetime-local" value={callFollowup} onChange={e => setCallFollowup(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCall(false)}>Cancel</Button>
                        <Button onClick={handleLogCall} disabled={isPending || callAnswered === null}>
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Phone className="h-4 w-4 mr-2" />}
                            Log Call
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            {/* \u2500\u2500 Edit Lead Dialog \u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
            < Dialog open={showEdit} onOpenChange={setShowEdit} >
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
                            () => { toast.success("Lead updated"); setShowEdit(false); router.refresh() }
                        )} disabled={isPending}>
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            {/* \u2500\u2500 Add Task Dialog \u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
            < Dialog open={showTask} onOpenChange={setShowTask} >
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
                                () => { toast.success("Task created!"); setShowTask(false); setTaskForm({ title: "", description: "", due_date: "", priority: "medium", assigned_to: currentUserId }); router.refresh() }
                            )}
                            disabled={isPending || !taskForm.title.trim()}
                        >
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Task"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            {/* \u2500\u2500 Convert Lead Dialog \u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
            < Dialog open={showConvert} onOpenChange={(o) => { setShowConvert(o); if (!o) setPaymentBlocked(false) }
            }>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <GraduationCap className="h-5 w-5 text-emerald-600" /> Convert Lead
                        </DialogTitle>
                        {!paymentBlocked ? (
                            <DialogDescription>
                                Converting <strong>{lead.first_name} {lead.last_name}</strong> will set their status to Enrolled. Choose the type:
                            </DialogDescription>
                        ) : (
                            <DialogDescription className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm mt-1">
                                <span>\u26a0\ufe0f</span>
                                <span>{paymentBlockedMsg}</span>
                            </DialogDescription>
                        )}
                    </DialogHeader>

                    {!paymentBlocked ? (
                        <div className="grid grid-cols-2 gap-3 py-2">
                            <button
                                onClick={() => handleConvertToStudent('abroad')}
                                disabled={isPending}
                                className="group flex flex-col items-center gap-3 p-5 rounded-xl border-2 hover:border-emerald-400 hover:bg-emerald-50/60 transition-all text-center"
                            >
                                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                                    <GraduationCap className="h-6 w-6 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm">Student</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Study Abroad<br />(University, College)</p>
                                </div>
                            </button>
                            <button
                                onClick={() => handleConvertToStudent('test_prep')}
                                disabled={isPending}
                                className="group flex flex-col items-center gap-3 p-5 rounded-xl border-2 hover:border-violet-400 hover:bg-violet-50/60 transition-all text-center"
                            >
                                <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center group-hover:bg-violet-200 transition-colors">
                                    <FlaskConical className="h-6 w-6 text-violet-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm">Learner</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Test Prep<br />(IELTS, TOEFL, PTE)</p>
                                </div>
                            </button>
                        </div>
                    ) : (
                        /* Payment blocked state \u2014 show override option */
                        <div className="space-y-3 py-2">
                            <p className="text-sm text-muted-foreground">Admin override \u2014 select conversion type to proceed without payment:</p>
                            <div className="grid grid-cols-2 gap-2">
                                <Button variant="outline" className="border-emerald-300 text-emerald-700 text-xs" onClick={() => handleConvertToStudent('abroad', true)} disabled={isPending}>
                                    {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : '\ud83c\udf93'} Override \u2192 Student
                                </Button>
                                <Button variant="outline" className="border-violet-300 text-violet-700 text-xs" onClick={() => handleConvertToStudent('test_prep', true)} disabled={isPending}>
                                    {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : '\ud83d\udd2c'} Override \u2192 Learner
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">This override will be logged in the activity timeline.</p>
                        </div>
                    )}

                    {isPending && !paymentBlocked && (
                        <div className="flex justify-center py-2">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setShowConvert(false); setPaymentBlocked(false) }}>Cancel</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >
        </div >
    )
}
