"use client"

import { useState, useTransition } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Loader2, Send, Phone, PhoneCall, PhoneOff, AlertTriangle, FileText, GraduationCap, FlaskConical, CheckSquare, Mail, MessageSquare
} from "lucide-react"
import { updateLead, createLeadTask, sendWhatsappMessage, sendEmailMessage, sendSmsMessage, addActivity } from "../actions"

// Types needed from the parent
type Props = {
    lead: any
    currentUserId: string
    currentUserRole: string
    staffList: any[]
    customFields: any[]

    // Visibility states
    showNote: boolean
    setShowNote: (val: boolean) => void
    showWhatsapp: boolean
    setShowWhatsapp: (val: boolean) => void
    showSms: boolean
    setShowSms: (val: boolean) => void
    showEmail: boolean
    setShowEmail: (val: boolean) => void
    showCall: boolean
    setShowCall: (val: boolean) => void
    showEdit: boolean
    setShowEdit: (val: boolean) => void
    showTask: boolean
    setShowTask: (val: boolean) => void
    showConvert: boolean
    setShowConvert: (val: boolean) => void

    // Handle functions - optional or provided by parent
    handleConvertToStudent?: (type: 'abroad' | 'test_prep', override?: boolean) => void | Promise<void>

    // State and utilities
    paymentBlocked: boolean
    setPaymentBlocked: (val: boolean) => void
    paymentBlockedMsg: string
    localCallLogs: any[]
    setLocalCallLogs: (val: any[]) => void
    router: any
}

export function LeadDialogManager({
    lead,
    currentUserId,
    currentUserRole,
    staffList,
    customFields,
    showNote, setShowNote,
    showWhatsapp, setShowWhatsapp,
    showSms, setShowSms,
    showEmail, setShowEmail,
    showCall, setShowCall,
    showEdit, setShowEdit,
    showTask, setShowTask,
    showConvert, setShowConvert,
    handleConvertToStudent,
    paymentBlocked, setPaymentBlocked,
    paymentBlockedMsg,
    localCallLogs,
    setLocalCallLogs,
    router
}: Props) {
    const [isPending, startTransition] = useTransition()
    const isAdmin = currentUserRole === 'super_admin' || currentUserRole === 'agency_admin'

    // Internal Form States (Moved from parent to here for better isolation)
    const [whatsappMessage, setWhatsappMessage] = useState("")
    const [smsMessage, setSmsMessage] = useState("")
    const [emailSubject, setEmailSubject] = useState("")
    const [emailBody, setEmailBody] = useState("")
    const [noteText, setNoteText] = useState("")

    const [callAnswered, setCallAnswered] = useState<boolean | null>(null)
    const [callFeedback, setCallFeedback] = useState("")
    const [callComment, setCallComment] = useState("")
    const [callFollowup, setCallFollowup] = useState("")

    const [editData, setEditData] = useState({
        first_name: lead.first_name || "", last_name: lead.last_name || "",
        email: lead.email || "", phone: lead.phone || "",
        destination_country: lead.destination_country || "",
        nationality: lead.nationality || "", course_interest: lead.course_interest || "",
        notes: lead.notes || "",
        lead_score: lead.lead_score || 0,
        next_followup_at: lead.next_followup_at || ""
    })
    const [editCustomData, setEditCustomData] = useState<any>(lead.custom_data || {})

    const [taskForm, setTaskForm] = useState({
        title: "", description: "", due_date: "", priority: "medium", assigned_to: currentUserId
    })

    // ── Handler functions ────────────────────────────────────────────────
    async function handleSendWhatsapp(message: string) {
        startTransition(async () => {
            const result = await sendWhatsappMessage(lead.id, message)
            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success("WhatsApp message sent!")
                setShowWhatsapp(false)
                router.refresh()
            }
        })
    }

    async function handleSendEmail(subject: string, body: string) {
        startTransition(async () => {
            const result = await sendEmailMessage(lead.id, subject, body)
            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success("Email sent successfully!")
                setShowEmail(false)
                router.refresh()
            }
        })
    }

    async function handleSendSms(message: string) {
        startTransition(async () => {
            const result = await sendSmsMessage(lead.id, message)
            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success("SMS sent successfully!")
                setShowSms(false)
                router.refresh()
            }
        })
    }

    async function handleLogCall(data: { answered: boolean | null; feedback: string; comment: string; next_followup_at: string }) {
        startTransition(async () => {
            const status = data.answered ? "Answered" : "Not Answered"
            const parts = [`Call ${status}`]
            if (data.feedback.trim()) parts.push(`Feedback: ${data.feedback}`)
            if (data.comment.trim()) parts.push(`Comment: ${data.comment}`)
            const description = parts.join(" | ")

            const result = await addActivity(lead.id, 'call', description)
            if (result?.error) {
                toast.error(result.error)
                return
            }

            // Update next follow-up date if provided
            if (data.next_followup_at) {
                await updateLead(lead.id, { next_followup_at: data.next_followup_at })
            }

            // Optimistically append to local call logs
            setLocalCallLogs([
                ...localCallLogs,
                {
                    id: Date.now().toString(),
                    answered: data.answered,
                    feedback: data.feedback,
                    comment: data.comment,
                    next_followup_at: data.next_followup_at,
                    created_at: new Date().toISOString(),
                }
            ])

            toast.success("Call logged successfully!")
            setShowCall(false)
            router.refresh()
        })
    }

    return (
        <>
            {/* ── WhatsApp Dialog ─────── */}
            <Dialog open={showWhatsapp} onOpenChange={setShowWhatsapp}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Send WhatsApp Message</DialogTitle>
                        <DialogDescription>
                            Send a message directly to {lead.first_name}'s WhatsApp ({lead.phone}).
                        </DialogDescription>
                    </DialogHeader>
                    <Textarea
                        placeholder="Type your message..."
                        value={whatsappMessage}
                        onChange={e => setWhatsappMessage(e.target.value)}
                        rows={4}
                    />
                    <DialogFooter>
                        <Button
                            onClick={async () => {
                                await handleSendWhatsapp(whatsappMessage)
                                setWhatsappMessage("")
                            }}
                            disabled={isPending || !whatsappMessage.trim() || !lead.phone}
                            variant="default"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> Send</>}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── SMS Dialog ─────── */}
            <Dialog open={showSms} onOpenChange={setShowSms}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Send SMS</DialogTitle>
                        <DialogDescription>
                            Send an SMS directly to {lead.first_name} ({lead.phone}).
                        </DialogDescription>
                    </DialogHeader>
                    <Textarea
                        placeholder="Type your SMS..."
                        value={smsMessage}
                        onChange={e => setSmsMessage(e.target.value)}
                        rows={4}
                    />
                    <DialogFooter>
                        <Button
                            onClick={async () => {
                                await handleSendSms(smsMessage)
                                setSmsMessage("")
                            }}
                            disabled={isPending || !smsMessage.trim() || !lead.phone}
                            variant="default"
                            className="bg-sky-600 hover:bg-sky-700 text-white"
                        >
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> Send SMS</>}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Email Dialog ─────── */}
            <Dialog open={showEmail} onOpenChange={setShowEmail}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Send Email</DialogTitle>
                        <DialogDescription>
                            Send an email to {lead.first_name} ({lead.email}).
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label>Subject</Label>
                            <Input
                                placeholder="Message Subject"
                                value={emailSubject}
                                onChange={e => setEmailSubject(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Message</Label>
                            <Textarea
                                placeholder="Write your email body..."
                                value={emailBody}
                                onChange={e => setEmailBody(e.target.value)}
                                rows={6}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            onClick={async () => {
                                await handleSendEmail(emailSubject, emailBody)
                                setEmailSubject(""); setEmailBody("")
                            }}
                            disabled={isPending || !emailSubject.trim() || !emailBody.trim() || !lead.email}
                            variant="default"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> Send Email</>}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Add Note Dialog ─────── */}
            <Dialog open={showNote} onOpenChange={setShowNote}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Add Note</DialogTitle><DialogDescription>Add a note to {lead.first_name}'s timeline.</DialogDescription></DialogHeader>
                    <Textarea placeholder="Enter your note..." value={noteText} onChange={e => setNoteText(e.target.value)} rows={4} />
                    <DialogFooter>
                        <Button
                            onClick={async () => {
                                startTransition(async () => {
                                    const result = await addActivity(lead.id, 'note', noteText.trim())
                                    if (result?.error) {
                                        toast.error(result.error)
                                        return
                                    }
                                    toast.success("Note added")
                                    setNoteText("")
                                    setShowNote(false)
                                    router.refresh()
                                })
                            }}
                            disabled={isPending || !noteText.trim()}
                        >
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Note"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Log Call Dialog ─────── */}
            <Dialog open={showCall} onOpenChange={setShowCall}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Log a Call</DialogTitle><DialogDescription>Record call details with {lead.first_name}.</DialogDescription></DialogHeader>
                    <div className="space-y-4 py-1">
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
                        <div className="space-y-1.5">
                            <Label>Feedback / Interest Level</Label>
                            <Input placeholder="e.g. Very interested..." value={callFeedback} onChange={e => setCallFeedback(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Internal Comment</Label>
                            <Textarea placeholder="Internal notes..." value={callComment} onChange={e => setCallComment(e.target.value)} rows={2} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Next Follow-up Date & Time</Label>
                            <Input type="datetime-local" value={callFollowup} onChange={e => setCallFollowup(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCall(false)}>Cancel</Button>
                        <Button
                            onClick={async () => {
                                await handleLogCall({ answered: callAnswered, feedback: callFeedback, comment: callComment, next_followup_at: callFollowup })
                                setCallAnswered(null); setCallFeedback(""); setCallComment(""); setCallFollowup("")
                            }}
                            disabled={isPending || callAnswered === null}
                        >
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Phone className="h-4 w-4 mr-2" />}
                            Log Call
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
                            <div className="grid gap-1.5">
                                <Label>Lead Score (0-100)</Label>
                                <Input type="number" min="0" max="100" value={editData.lead_score} onChange={e => setEditData({ ...editData, lead_score: parseInt(e.target.value) || 0 })} />
                            </div>
                            <div className="grid gap-1.5">
                                <Label>Next Follow-up</Label>
                                <Input type="datetime-local" value={editData.next_followup_at} onChange={e => setEditData({ ...editData, next_followup_at: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid gap-1.5"><Label>Course Interest</Label><Input value={editData.course_interest} onChange={e => setEditData({ ...editData, course_interest: e.target.value })} /></div>
                        {/* Custom fields */}
                        {customFields.length > 0 && (
                            <div className="border-t pt-3 space-y-3">
                                <p className="text-sm font-medium text-muted-foreground">Additional Details</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {customFields.map((f: any) => (
                                        <div key={f.id} className="grid gap-1.5">
                                            <Label className="text-xs">{f.field_label}</Label>
                                            <Input
                                                type={f.field_type === 'number' ? 'number' : f.field_type === 'date' ? 'date' : 'text'}
                                                value={editCustomData[f.field_key] || ''}
                                                onChange={e => setEditCustomData((prev: any) => ({ ...prev, [f.field_key]: e.target.value }))}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            onClick={() => {
                                startTransition(async () => {
                                    const result = await updateLead(lead.id, { ...editData, custom_data: editCustomData })
                                    if (result?.error) {
                                        toast.error(result.error)
                                    } else {
                                        toast.success("Lead updated successfully")
                                        setShowEdit(false)
                                        router.refresh()
                                    }
                                })
                            }}
                            disabled={isPending}
                        >
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
                        <div className="grid gap-1.5"><Label>Task Title *</Label><Input placeholder="e.g. Follow up..." value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} /></div>
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
                            onClick={() => {
                                if (!taskForm.title.trim()) return
                                startTransition(async () => {
                                    const result = await createLeadTask(lead.id, taskForm)
                                    if (result?.error) {
                                        toast.error(result.error)
                                    } else {
                                        toast.success("Task created successfully")
                                        setTaskForm({ title: "", description: "", due_date: "", priority: "medium", assigned_to: currentUserId })
                                        setShowTask(false)
                                        router.refresh()
                                    }
                                })
                            }}
                            disabled={isPending || !taskForm.title.trim()}
                        >
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Task"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Convert Lead Dialog ─────── */}
            <Dialog open={showConvert} onOpenChange={(o) => { setShowConvert(o); if (!o) setPaymentBlocked(false) }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <GraduationCap className="h-5 w-5 text-emerald-600" /> Convert Lead
                        </DialogTitle>
                        {!paymentBlocked ? (
                            <DialogDescription>
                                Converting <strong>{lead.first_name} {lead.last_name}</strong>. Choose the type:
                            </DialogDescription>
                        ) : (
                            <DialogDescription className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm mt-1">
                                <span>⚠️</span>
                                <span>{paymentBlockedMsg}</span>
                            </DialogDescription>
                        )}
                    </DialogHeader>

                    {!paymentBlocked ? (
                        <div className="grid grid-cols-2 gap-3 py-2">
                            <button
                                onClick={() => handleConvertToStudent?.('abroad')}
                                disabled={isPending}
                                className="group flex flex-col items-center gap-3 p-5 rounded-xl border-2 hover:border-emerald-400 hover:bg-emerald-50/60 transition-all text-center"
                            >
                                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                                    <GraduationCap className="h-6 w-6 text-emerald-600" />
                                </div>
                                <p className="font-semibold text-sm">Student</p>
                            </button>
                            <button
                                onClick={() => handleConvertToStudent?.('test_prep')}
                                disabled={isPending}
                                className="group flex flex-col items-center gap-3 p-5 rounded-xl border-2 hover:border-violet-400 hover:bg-violet-50/60 transition-all text-center"
                            >
                                <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center group-hover:bg-violet-200 transition-colors">
                                    <FlaskConical className="h-6 w-6 text-violet-600" />
                                </div>
                                <p className="font-semibold text-sm">Learner</p>
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3 py-2">
                            {isAdmin ? (
                                <>
                                    <p className="text-sm text-muted-foreground">Admin override:</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button variant="outline" className="border-emerald-300 text-emerald-700 text-xs" onClick={() => handleConvertToStudent?.('abroad', true)} disabled={isPending}>
                                            Override Student
                                        </Button>
                                        <Button variant="outline" className="border-violet-300 text-violet-700 text-xs" onClick={() => handleConvertToStudent?.('test_prep', true)} disabled={isPending}>
                                            Override Learner
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <p className="text-xs text-muted-foreground">Ask an agency admin to verify payment or perform an approved override.</p>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setShowConvert(false); setPaymentBlocked(false) }}>Cancel</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
