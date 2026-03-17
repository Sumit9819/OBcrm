import { Button } from "@/components/ui/button"
import { TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import {
    Clock, Phone, MessageSquare, PhoneCall, PhoneOff, Calendar, History, User,
    ChevronRight, ArrowUpRight, Activity
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface ActivityItem {
    id: string
    type: string
    description: string
    created_at: string
    users?: {
        first_name: string
    }
}

interface CallLog {
    id: string
    answered: boolean
    feedback?: string
    comment?: string
    next_followup_at?: string
    created_at: string
}

interface TabTimelineProps {
    activities: ActivityItem[]
    localCallLogs: CallLog[]
    activityIcons: Record<string, React.ElementType>
    // These are still passed but maybe less prominent since Hero has a quick note
    quickActionMode: 'note' | 'call_answered' | 'call_missed'
    setQuickActionMode: (m: 'note' | 'call_answered' | 'call_missed') => void
    quickNoteText: string
    setQuickNoteText: (t: string) => void
    isPending: boolean
    handleQuickActionSubmit: () => void
}

export function TabTimeline({
    activities,
    localCallLogs,
    activityIcons,
}: TabTimelineProps) {
    const allEvents = [
        ...activities.map((a) => ({ ...a, eventType: 'activity' as const, dateStr: a.created_at })),
        ...localCallLogs.map((c) => ({ ...c, eventType: 'call' as const, dateStr: c.created_at }))
    ].sort((a, b) => new Date(b.dateStr).getTime() - new Date(a.dateStr).getTime());

    const notes = activities.filter(a => a.type === 'note')
    const systemActivities = allEvents.filter(e => e.eventType === 'activity' && e.type !== 'note')
    const calls = allEvents.filter(e => e.eventType === 'call')

    return (
        <TabsContent value="timeline" className="m-0 focus-visible:ring-0 outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* ── Left Column: Notes & Key Information ────────────────── */}
                <div className="space-y-6">
                    <Card className="border-none shadow-sm bg-background/50">
                        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/50 bg-muted/5">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-md bg-amber-100 text-amber-600">
                                    <MessageSquare className="h-4 w-4" />
                                </div>
                                <CardTitle className="text-sm font-semibold uppercase tracking-wider">Internal Notes</CardTitle>
                            </div>
                            <Badge variant="outline" className="text-[10px] font-bold">{notes.length}</Badge>
                        </CardHeader>
                        <CardContent className="p-0">
                            {notes.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground text-sm italic">
                                    No internal notes yet.
                                </div>
                            ) : (
                                <div className="divide-y divide-border/40">
                                    {notes.map((n) => (
                                        <div key={n.id} className="p-4 hover:bg-muted/10 transition-colors group">
                                            <div className="flex justify-between items-start mb-1.5">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[11px] font-bold text-foreground/70 uppercase tracking-tight">{n.users?.first_name || 'System'}</span>
                                                    <span className="text-muted-foreground/30">•</span>
                                                    <span className="text-[10px] text-muted-foreground">{format(new Date(n.created_at), 'MMM dd, yyyy')}</span>
                                                </div>
                                            </div>
                                            <p className="text-sm text-foreground/90 leading-relaxed">{n.description}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-background/50">
                        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/50 bg-muted/5">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-md bg-indigo-100 text-indigo-600">
                                    <Phone className="h-4 w-4" />
                                </div>
                                <CardTitle className="text-sm font-semibold uppercase tracking-wider">Call Summary</CardTitle>
                            </div>
                            <Badge variant="outline" className="text-[10px] font-bold">{localCallLogs.length}</Badge>
                        </CardHeader>
                        <CardContent className="p-0">
                            {localCallLogs.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground text-sm italic">
                                    No calls logged yet.
                                </div>
                            ) : (
                                <div className="divide-y divide-border/40">
                                    {localCallLogs.slice(0, 5).map((cl) => (
                                        <div key={cl.id} className="p-4 hover:bg-muted/10 transition-colors">
                                            <div className="flex justify-between items-center mb-1">
                                                <Badge variant="outline" className={`text-[10px] uppercase px-1.5 h-4 ${cl.answered ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-rose-200 text-rose-700 bg-rose-50'}`}>
                                                    {cl.answered ? 'Reached' : 'No Answer'}
                                                </Badge>
                                                <span className="text-[10px] text-muted-foreground">{format(new Date(cl.created_at), 'MMM dd')}</span>
                                            </div>
                                            <p className="text-xs font-medium text-foreground/90 truncate">{cl.feedback || 'Call recorded'}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* ── Right Column: Activity Stream ────────────────── */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2 mb-2">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                            <History className="h-3 w-3" /> Recent Activity
                        </h4>
                    </div>

                    <div className="space-y-4 relative before:absolute before:left-5 before:top-2 before:bottom-2 before:w-[1px] before:bg-border/60">
                        {allEvents.length === 0 ? (
                            <div className="text-center py-12 border border-dashed rounded-xl bg-muted/5 ml-10">
                                <p className="text-xs text-muted-foreground uppercase tracking-widest">Quiet period</p>
                            </div>
                        ) : (
                            allEvents.map((event, index) => {
                                if (event.eventType === 'activity') {
                                    const a = event as any;
                                    const Icon = activityIcons[a.type] || Activity
                                    const iconColors = a.type === 'stage_change' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'

                                    return (
                                        <div key={`act-${a.id}`} className="flex gap-4 relative items-start group">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 ${iconColors} shadow-sm ring-4 ring-background transition-all group-hover:scale-110`}>
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <div className="flex-1 pt-1.5">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className="text-xs font-bold uppercase tracking-tight text-foreground/80">{a.type.replace('_', ' ')}</span>
                                                        <span className="text-[10px] font-medium text-muted-foreground">• {format(new Date(a.created_at), 'MMM dd, h:mm a')}</span>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground leading-snug">{a.description}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                } else {
                                    const cl = event as any;
                                    return (
                                        <div key={`call-${cl.id}`} className="flex gap-4 relative items-start group">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 ring-4 ring-background shadow-sm transition-all group-hover:scale-110 ${cl.answered ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500'}`}>
                                                {cl.answered ? <PhoneCall className="h-4 w-4" /> : <PhoneOff className="h-4 w-4" />}
                                            </div>
                                            <div className="flex-1 pt-1.5">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className={`text-xs font-bold uppercase tracking-tight ${cl.answered ? 'text-emerald-700' : 'text-rose-700'}`}>{cl.answered ? 'Call Reached' : 'Call Attempt'}</span>
                                                        <span className="text-[10px] font-medium text-muted-foreground">• {format(new Date(cl.created_at), 'MMM dd, h:mm a')}</span>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground leading-snug font-medium">{cl.feedback || 'No feedback left'}</p>
                                                    {cl.comment && <p className="text-xs text-muted-foreground/70 italic mt-0.5">"{cl.comment}"</p>}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                }
                            })
                        )}
                    </div>
                </div>
            </div>
        </TabsContent>
    )
}
