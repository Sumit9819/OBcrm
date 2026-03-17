import { TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Briefcase, CalendarClock, CheckCircle2, CircleDot, XCircle } from "lucide-react"
import { format } from "date-fns"

interface Application {
    id: string
    university_name?: string
    course_name?: string
    intake_season?: string
    intake_date?: string
    status: string
    offer_conditions?: string
    rejection_reason?: string
    visa_number?: string
    applied_at?: string
    enrolled_at?: string
    created_at?: string
}

interface TabApplicationsProps {
    applications: Application[]
}

const STATUS_COLORS: Record<string, string> = {
    Draft: "bg-slate-100 text-slate-700",
    Applied: "bg-blue-100 text-blue-700",
    Lodged: "bg-blue-100 text-blue-700",
    "Conditional Offer": "bg-amber-100 text-amber-700",
    "Unconditional Offer": "bg-emerald-100 text-emerald-700",
    "Visa Filed": "bg-indigo-100 text-indigo-700",
    "Visa Approved": "bg-green-100 text-green-700",
    "Visa Denied": "bg-red-100 text-red-700",
    Rejected: "bg-rose-100 text-rose-700",
    Enrolled: "bg-teal-100 text-teal-700",
    Withdrawn: "bg-zinc-100 text-zinc-700",
}

const APP_FLOW = ["Applied", "Conditional Offer", "Unconditional Offer", "Visa Filed", "Visa Approved", "Enrolled"]

function getStepIndex(status: string) {
    if (status === "Draft") return -1
    if (status === "Lodged") return 0
    return APP_FLOW.indexOf(status)
}

function stageDot(isComplete: boolean, isCurrent: boolean) {
    if (isComplete) return <CheckCircle2 className="h-4 w-4 text-emerald-600" />
    if (isCurrent) return <CircleDot className="h-4 w-4 text-indigo-600" />
    return <CircleDot className="h-4 w-4 text-slate-300" />
}

export function TabApplications({ applications }: TabApplicationsProps) {
    return (
        <TabsContent value="applications" className="m-0 space-y-4 outline-none">
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">Applications</h3>
            </div>
            {applications.length === 0 ? (
                <div className="p-8 text-center border border-dashed rounded-lg text-muted-foreground text-sm">No applications yet.</div>
            ) : (
                <div className="space-y-3">
                    {applications.map((a) => {
                        const stepIndex = getStepIndex(a.status)
                        const isFailed = a.status === "Rejected" || a.status === "Visa Denied" || a.status === "Withdrawn"
                        return (
                            <div key={a.id} className="rounded-lg border bg-background p-4 space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className="bg-indigo-100 p-2 rounded-md">
                                        <Briefcase className="h-4 w-4 text-indigo-600 shrink-0" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold truncate">{a.university_name || 'Unknown University'}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {a.course_name || 'Course not set'}
                                            {a.intake_season ? ` · ${a.intake_season}` : ''}
                                            {a.intake_date ? ` · ${format(new Date(a.intake_date), 'MMM yyyy')}` : ''}
                                        </p>
                                    </div>
                                    <Badge className={`text-xs border-none shadow-none ${STATUS_COLORS[a.status] || "bg-slate-100 text-slate-700"}`}>
                                        {a.status}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                        <CalendarClock className="h-3.5 w-3.5" />
                                        Applied: {a.applied_at ? format(new Date(a.applied_at), 'MMM dd, yyyy') : (a.created_at ? format(new Date(a.created_at), 'MMM dd, yyyy') : '—')}
                                    </div>
                                    <div>
                                        Visa No: {a.visa_number || '—'}
                                    </div>
                                    <div>
                                        Enrolled: {a.enrolled_at ? format(new Date(a.enrolled_at), 'MMM dd, yyyy') : '—'}
                                    </div>
                                </div>

                                {a.offer_conditions && (
                                    <div className="text-xs bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 text-amber-800">
                                        Offer conditions: {a.offer_conditions}
                                    </div>
                                )}

                                {isFailed && (
                                    <div className="text-xs bg-rose-50 border border-rose-200 rounded-md px-2 py-1.5 text-rose-700 flex items-center gap-1.5">
                                        <XCircle className="h-3.5 w-3.5" />
                                        {a.rejection_reason || `${a.status} on this application.`}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 md:grid-cols-6 gap-2 pt-1">
                                    {APP_FLOW.map((stage, index) => {
                                        const isComplete = stepIndex >= index
                                        const isCurrent = stepIndex === index
                                        return (
                                            <div key={stage} className={`rounded-md border px-2 py-1.5 text-[11px] ${isCurrent ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-slate-50'}`}>
                                                <div className="flex items-center gap-1 mb-0.5">
                                                    {stageDot(isComplete, isCurrent)}
                                                    <span className="font-medium truncate">{stage}</span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </TabsContent>
    )
}
