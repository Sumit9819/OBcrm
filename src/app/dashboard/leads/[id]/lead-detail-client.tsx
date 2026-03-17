"use client"

import { useState, useTransition, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PipelineStepper } from "@/components/ui/pipeline-stepper"
import {
    Phone, Mail, Globe, BookOpen, FileText,
    MessageSquare, CheckCircle, Clock,
    CheckSquare, Flag, MapPin, AlertTriangle, History
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import {
    updateLeadStatus, archiveLead,
    assignLead, convertToStudent, updateTaskStatus,
    getMatchingCourses, addActivity, updateLead
} from "./actions"
import { TabTimeline } from "./components/tab-timeline"
import { TabMessages } from "./components/tab-messages"
import { TabMatcher } from "./components/tab-matcher"
import { TabAcademics } from "./components/tab-academics"
import { TabTasks } from "./components/tab-tasks"
import { TabDocuments } from "./components/tab-documents"
import { TabApplications } from "./components/tab-applications"
import { TabDetails } from "./components/tab-details"
import { LeadHeroHeader } from "./components/lead-hero-header"
import { LeadActionSidebar } from "./components/lead-action-sidebar"
import { LeadDialogManager } from "./components/lead-dialog-manager"

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
    currentUserRole: string
    callLogs?: any[]
    initialMessages?: any[]
}

export function LeadDetailClient({ lead, activities, documents, applications, tasks, staffList, customFields, pipelineStages, documentTemplates, currentUserId, currentUserRole, callLogs = [], initialMessages = [] }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [messages, setMessages] = useState<any[]>(initialMessages || [])
    const scrollRef = useRef<HTMLDivElement>(null)

    // Auto-scroll to bottom for messages
    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }

    useEffect(() => {
        if (messages.length > 0) {
            scrollToBottom()
        }
    }, [messages])

    // Real-time messages subscription
    useEffect(() => {
        const supabase = (async () => {
            const { createClient } = await import("@/lib/supabase/client")
            return createClient()
        })()

        const channel = (async () => {
            const client = await supabase
            return client
                .channel(`lead-messages-${lead.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'messages',
                        filter: `lead_id=eq.${lead.id}`
                    },
                    (payload) => {
                        setMessages(prev => [...prev, payload.new])
                    }
                )
                .subscribe()
        })()

        return () => {
            channel.then(c => c.unsubscribe())
        }
    }, [lead.id])

    // Pipeline Logic
    const DEFAULT_STATUSES = ['New', 'Contacted', 'Application', 'Offer', 'Visa', 'Enrolled', 'Lost']
    const customStageNames = pipelineStages.map((s: any) => s.name)
    const ALL_STATUSES = [...DEFAULT_STATUSES, ...customStageNames.filter((n: string) => !DEFAULT_STATUSES.includes(n))]

    // Dialog state (Managed here vs in components)
    const [showNote, setShowNote] = useState(false)
    const [showWhatsapp, setShowWhatsapp] = useState(false)
    const [showSms, setShowSms] = useState(false)
    const [showEmail, setShowEmail] = useState(false)
    const [showCall, setShowCall] = useState(false)
    const [showEdit, setShowEdit] = useState(false)
    const [showTask, setShowTask] = useState(false)
    const [showConvert, setShowConvert] = useState(false)

    // State needed for conversion logic
    const [paymentBlocked, setPaymentBlocked] = useState(false)
    const [paymentBlockedMsg, setPaymentBlockedMsg] = useState("")

    // Local state for UI updates
    const [localCallLogs, setLocalCallLogs] = useState<any[]>(callLogs)
    const [quickNoteText, setQuickNoteText] = useState("")
    const [quickActionMode, setQuickActionMode] = useState<'note' | 'call_answered' | 'call_missed'>('note')

    // Course Matcher State
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
            if (r?.error) toast.error(r?.message || r.error)
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
                const isAnswered = quickActionMode === 'call_answered';
                const supabase = (await import("@/lib/supabase/client")).createClient()
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return
                const { data: profile } = await supabase.from("users").select("agency_id").eq("id", user.id).single()

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
                await addActivity(lead.id, 'call', `${isAnswered ? 'Answered' : 'Not Answered'} — ${quickNoteText.trim() || 'No quick comment'}`)
                setQuickNoteText("");
                setQuickActionMode('note');
                router.refresh();
            }
        });
    }

    const handleStatusChange = (status: string) => {
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
        run(() => updateLeadStatus(lead.id, status), () => toast.success(`Status updated to ${status}`))
    }

    const handleAssign = (userId: string) => run(
        () => assignLead(lead.id, userId || null),
        () => toast.success("Lead assigned successfully")
    )

    const handleConvertToStudent = (type: 'abroad' | 'test_prep', override = false) => {
        startTransition(async () => {
            const r = await convertToStudent(lead.id, type, override)
            if (r?.error === 'PAYMENT_REQUIRED') {
                setPaymentBlocked(true)
                setPaymentBlockedMsg((r as any).message || 'Payment required.')
            } else if (r?.error) {
                toast.error(r.error)
            } else {
                toast.success("Converted successfully!")
                setShowConvert(false)
                setPaymentBlocked(false)
                router.refresh()
            }
        })
    }

    return (
        <div className="flex-1 p-4 pt-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">

            <LeadHeroHeader
                lead={lead}
                quickNoteText={quickNoteText}
                setQuickNoteText={setQuickNoteText}
                handleQuickActionSubmit={handleQuickActionSubmit}
                isPending={isPending}
                setShowEdit={setShowEdit}
            />

            <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* Sidebar */}
                <div className="w-full lg:w-[280px] shrink-0 flex flex-col gap-6 lg:sticky lg:top-6">
                    <LeadActionSidebar
                        lead={lead}
                        isPending={isPending}
                        setShowEdit={setShowEdit}
                        setShowConvert={setShowConvert}
                        setShowEmail={setShowEmail}
                        setShowWhatsapp={setShowWhatsapp}
                        handleDelete={() => { if (confirm("Delete this lead?")) run(() => archiveLead(lead.id), () => router.push("/dashboard/leads")) }}
                        callLogsCount={localCallLogs.length}
                    />

                    <Card className="border-none shadow-sm bg-muted/20">
                        <CardHeader className="pb-3 border-b border-border/50">
                            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Properties</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Pipeline Stage</p>
                                <Select value={lead.status} onValueChange={handleStatusChange} disabled={isPending}>
                                    <SelectTrigger className="h-8 text-sm font-medium border-border/50 bg-background">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Assigned To</p>
                                <Select value={lead.assigned_to || "unassigned"} onValueChange={v => handleAssign(v === "unassigned" ? "" : v)} disabled={isPending}>
                                    <SelectTrigger className="h-8 text-sm font-medium border-border/50 bg-background">
                                        <SelectValue placeholder="Unassigned" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unassigned">Unassigned</SelectItem>
                                        {staffList.map(s => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="pt-3 border-t border-border/50 space-y-3">
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1.5">Lead Score</p>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={lead.lead_score || 0}
                                            onChange={(e) => {
                                                const newScore = parseInt(e.target.value) || 0
                                                run(() => updateLead(lead.id, { lead_score: newScore }), () => { toast.success("Score updated") })
                                            }}
                                            disabled={isPending}
                                            className="h-8 text-sm font-medium border border-border/50 bg-background rounded px-2 py-1 flex-1"
                                        />
                                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                                            {Number(lead.lead_score || 0) >= 67 ? '🔥 Hot' : Number(lead.lead_score || 0) >= 34 ? '⚡ Warm' : '❄️ Cold'}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1.5">Next Follow-up</p>
                                    <input
                                        type="datetime-local"
                                        value={lead.next_followup_at ? new Date(lead.next_followup_at).toISOString().slice(0, 16) : ''}
                                        onChange={(e) => {
                                            const datetime = e.target.value ? new Date(e.target.value).toISOString() : undefined
                                            run(() => updateLead(lead.id, { next_followup_at: datetime }), () => { toast.success("Follow-up updated") })
                                        }}
                                        disabled={isPending}
                                        className="h-8 w-full text-sm font-medium border border-border/50 bg-background rounded px-2 py-1"
                                    />
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    Added {format(new Date(lead.created_at), 'MMM dd, yyyy')}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content */}
                <div className="min-w-0 flex-1 flex flex-col gap-6 w-full">
                    <div className="bg-muted/20 border border-slate-100 p-4 rounded-xl shadow-sm overflow-hidden">
                        <PipelineStepper
                            currentStatus={lead.status}
                            statuses={ALL_STATUSES}
                            onStatusChange={handleStatusChange}
                            disabled={isPending}
                        />
                    </div>

                    <Tabs defaultValue="timeline" className="w-full">
                        <TabsList className="w-full justify-start border-b border-border/40 rounded-none h-auto p-0 bg-transparent overflow-x-auto flex-nowrap scrollbar-hide">
                            <TabsTrigger value="timeline" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 whitespace-nowrap font-medium">Overview</TabsTrigger>
                            <TabsTrigger value="messages" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 whitespace-nowrap text-muted-foreground">Messages ({messages.length})</TabsTrigger>
                            <TabsTrigger value="tasks" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 whitespace-nowrap text-muted-foreground">Tasks ({tasks.length})</TabsTrigger>
                            <TabsTrigger value="docs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 whitespace-nowrap text-muted-foreground">Docs ({documents.length})</TabsTrigger>
                            <TabsTrigger value="matcher" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent px-4 py-3 whitespace-nowrap text-emerald-700 font-medium">Course Matcher ✨</TabsTrigger>
                            <TabsTrigger value="applications" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 whitespace-nowrap text-muted-foreground">Apps ({applications.length})</TabsTrigger>
                            {customFields.length > 0 && <TabsTrigger value="details" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 whitespace-nowrap text-muted-foreground">Data</TabsTrigger>}
                        </TabsList>

                        <div className="py-6">
                            <TabTimeline
                                quickActionMode={quickActionMode}
                                setQuickActionMode={setQuickActionMode}
                                quickNoteText={quickNoteText}
                                setQuickNoteText={setQuickNoteText}
                                isPending={isPending}
                                handleQuickActionSubmit={handleQuickActionSubmit}
                                activities={activities}
                                localCallLogs={localCallLogs}
                                activityIcons={activityIcons}
                            />
                            <TabMessages
                                messages={messages}
                                scrollRef={scrollRef}
                                setShowWhatsapp={setShowWhatsapp}
                                setShowSms={setShowSms}
                                setShowEmail={setShowEmail}
                            />
                            <TabMatcher lead={lead} loadingCourses={loadingCourses} matchedCourses={matchedCourses} />
                            <TabAcademics lead={lead} />
                            <TabTasks tasks={tasks} setShowTask={setShowTask} updateTaskStatus={updateTaskStatus} priorityColors={priorityColors} run={run} />
                            <TabDocuments documents={documents} />
                            <TabApplications applications={applications} />
                            <TabDetails lead={lead} customFields={customFields} />
                        </div>
                    </Tabs>
                </div>
            </div>

            <LeadDialogManager
                lead={lead}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                staffList={staffList}
                customFields={customFields}
                showNote={showNote} setShowNote={setShowNote}
                showWhatsapp={showWhatsapp} setShowWhatsapp={setShowWhatsapp}
                showSms={showSms} setShowSms={setShowSms}
                showEmail={showEmail} setShowEmail={setShowEmail}
                showCall={showCall} setShowCall={setShowCall}
                showEdit={showEdit} setShowEdit={setShowEdit}
                showTask={showTask} setShowTask={setShowTask}
                showConvert={showConvert} setShowConvert={setShowConvert}
                paymentBlocked={paymentBlocked} setPaymentBlocked={setPaymentBlocked}
                paymentBlockedMsg={paymentBlockedMsg}
                handleConvertToStudent={handleConvertToStudent}
                localCallLogs={localCallLogs}
                setLocalCallLogs={setLocalCallLogs}
                router={router}
            />
        </div>
    )
}
