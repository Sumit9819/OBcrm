"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { GraduationCap, UserCheck, Mail, MessageSquare, Archive, Phone, Clock, Users } from "lucide-react"

type Props = {
    lead: any
    isPending: boolean
    setShowEdit: (val: boolean) => void
    setShowConvert: (val: boolean) => void
    setShowEmail: (val: boolean) => void
    setShowWhatsapp: (val: boolean) => void
    openTeamThread: () => void
    handleDelete: () => void
    callLogsCount?: number
}

export function LeadActionSidebar({ lead, isPending, setShowEdit, setShowConvert, setShowEmail, setShowWhatsapp, openTeamThread, handleDelete, callLogsCount = 0 }: Props) {
    const [activeTab, setActiveTab] = useState<'visits' | 'calls'>('visits')

    return (
        <div className="space-y-6">

            {/* Primary Action Menu */}
            <Card className="border-none shadow-sm bg-white overflow-hidden ring-1 ring-border/50">
                <div className="bg-primary/95 px-4 py-3">
                    <h3 className="text-white font-bold text-[11px] uppercase tracking-widest">Core Actions</h3>
                </div>
                <CardContent className="p-0">
                    <div className="flex flex-col">
                        <button
                            className="flex items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-slate-50 transition-colors border-b border-slate-100 text-left group"
                            onClick={() => setShowConvert(true)}
                            disabled={isPending}
                        >
                            <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                                <GraduationCap className="h-4 w-4" />
                            </div>
                            <span>Convert as Student</span>
                        </button>

                        <button
                            className="flex items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-slate-50 transition-colors border-b border-slate-100 text-left group"
                            onClick={() => setShowEdit(true)}
                            disabled={isPending}
                        >
                            <div className="p-1.5 rounded-md bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                                <UserCheck className="h-4 w-4" />
                            </div>
                            <span>Change Assignee</span>
                        </button>

                        <button
                            className="flex items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-slate-50 transition-colors border-b border-slate-100 text-left w-full group"
                            onClick={() => setShowEmail(true)}
                            disabled={isPending}
                        >
                            <div className="p-1.5 rounded-md bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition-colors">
                                <Mail className="h-4 w-4" />
                            </div>
                            <span>Send Email</span>
                        </button>

                        <button
                            className="flex items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-slate-50 transition-colors border-b border-slate-100 text-left w-full group"
                            onClick={() => setShowWhatsapp(true)}
                            disabled={isPending}
                        >
                            <div className="p-1.5 rounded-md bg-green-50 text-green-600 group-hover:bg-green-100 transition-colors">
                                <MessageSquare className="h-4 w-4" />
                            </div>
                            <span>Send WhatsApp</span>
                        </button>

                        <button
                            className="flex items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-slate-50 transition-colors border-b border-slate-100 text-left w-full group"
                            onClick={openTeamThread}
                            disabled={isPending}
                        >
                            <div className="p-1.5 rounded-md bg-violet-50 text-violet-600 group-hover:bg-violet-100 transition-colors">
                                <Users className="h-4 w-4" />
                            </div>
                            <span>Open Team Thread</span>
                        </button>

                        <button
                            className="flex items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-rose-50 text-rose-600 transition-colors text-left w-full group"
                            onClick={handleDelete}
                            disabled={isPending}
                        >
                            <div className="p-1.5 rounded-md bg-rose-100 text-rose-600">
                                <Archive className="h-4 w-4" />
                            </div>
                            <span>Archive / Delete</span>
                        </button>
                    </div>
                </CardContent>
            </Card>

            {/* Quick Metrics / Summary Box */}
            <Card className="border-none shadow-sm bg-white overflow-hidden ring-1 ring-border/50">
                <div className="flex border-b border-border/40">
                    <button
                        onClick={() => setActiveTab('visits')}
                        className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-wider text-center transition-all ${activeTab === 'visits' ? 'border-b-2 border-primary text-primary bg-primary/5' : 'text-muted-foreground hover:bg-slate-50'}`}
                    >
                        Visits
                    </button>
                    <button
                        onClick={() => setActiveTab('calls')}
                        className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-wider text-center transition-all ${activeTab === 'calls' ? 'border-b-2 border-primary text-primary bg-primary/5' : 'text-muted-foreground hover:bg-slate-50'}`}
                    >
                        Calls ({callLogsCount})
                    </button>
                </div>
                <CardContent className="p-0">
                    {activeTab === 'visits' ? (
                        <div className="p-6 text-center text-xs text-muted-foreground italic flex flex-col items-center justify-center min-h-[140px] gap-2">
                            <Clock className="h-5 w-5 text-slate-300" />
                            No office visits found.
                        </div>
                    ) : (
                        <div className="divide-y divide-border/30">
                            {callLogsCount === 0 ? (
                                <div className="p-6 text-center text-xs text-muted-foreground italic flex flex-col items-center justify-center min-h-[140px] gap-2">
                                    <Phone className="h-5 w-5 text-slate-300" />
                                    No call history.
                                </div>
                            ) : (
                                <div className="p-4 space-y-3">
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Recent Attempts</p>
                                    <div className="space-y-3">
                                        {/* Since we don't have the full call logs list here yet, we just show a generic summary or we could pass them down if needed. For now informative. */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium">Total Logs</span>
                                            <span className="text-xs font-bold text-primary">{callLogsCount}</span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground italic leading-relaxed">View detailed logs in the Overview tab or Messages section.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
