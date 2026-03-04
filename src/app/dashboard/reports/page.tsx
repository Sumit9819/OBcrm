"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, TrendingUp, Users, FileText, Banknote, ClipboardList, BarChart3, CalendarDays } from "lucide-react"
import { format, subMonths, startOfMonth } from "date-fns"
import { toast } from "sonner"

const LEAD_STATUSES = ['New', 'Contacted', 'Application', 'Offer', 'Visa', 'Enrolled']
const STATUS_COLORS: Record<string, string> = {
    'New': '#3b82f6', 'Contacted': '#f59e0b', 'Application': '#8b5cf6',
    'Offer': '#10b981', 'Visa': '#6366f1', 'Enrolled': '#14b8a6',
}

type ExportOption = "leads" | "attendance" | "cash" | "tickets" | "leave"

function downloadCSV(rows: Record<string, any>[], filename: string) {
    if (!rows.length) { toast.error("No data to export"); return }
    const headers = Object.keys(rows[0])
    const csv = [
        headers.join(','),
        ...rows.map(row => headers.map(h => `"${(row[h] ?? '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`✅ ${filename} downloaded!`)
}

export default function ReportsPage() {
    const [pipelineCounts, setPipelineCounts] = useState<Record<string, number>>({})
    const [totalLeads, setTotalLeads] = useState(0)
    const [totalApps, setTotalApps] = useState(0)
    const [totalRevenue, setTotalRevenue] = useState(0)
    const [totalCash, setTotalCash] = useState(0)
    const [totalTickets, setTotalTickets] = useState(0)
    const [resolvedTickets, setResolvedTickets] = useState(0)
    const [monthlyCounts, setMonthlyCounts] = useState<{ month: string; leads: number; cash: number }[]>([])
    const [agentPerformance, setAgentPerformance] = useState<{ name: string; leads: number; enrolled: number }[]>([])
    const [loading, setLoading] = useState(true)
    const [exporting, setExporting] = useState<ExportOption | null>(null)
    const [currentUser, setCurrentUser] = useState<any>(null)

    const supabase = createClient()

    const fetchData = useCallback(async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase.from('users').select('id, agency_id, role').eq('id', user.id).single()
        setCurrentUser(profile)
        const agencyId = profile?.agency_id

        // 1. Leads by status
        const { data: leads } = await supabase
            .from('leads').select('id, status, created_at, assigned_to')
            .eq('agency_id', agencyId)

        if (leads) {
            setTotalLeads(leads.length)
            const counts: Record<string, number> = {}
            LEAD_STATUSES.forEach(s => counts[s] = 0)
            leads.forEach(l => { if (counts[l.status] !== undefined) counts[l.status]++ })
            setPipelineCounts(counts)
        }

        // 2. Applications
        const { count: appCount } = await supabase.from('applications').select('*', { count: 'exact', head: true })
        setTotalApps(appCount || 0)

        // 3. Revenue (invoices)
        const { data: invoices } = await supabase.from('invoices').select('amount, status').eq('agency_id', agencyId)
        if (invoices) {
            setTotalRevenue(invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (Number(i.amount) || 0), 0))
        }

        // 4. Cash received
        const { data: cash } = await supabase.from('cash_entries').select('amount').eq('agency_id', agencyId)
        if (cash) setTotalCash(cash.reduce((s, c) => s + (Number(c.amount) || 0), 0))

        // 5. Tickets
        const { data: tickets } = await supabase.from('tickets').select('status').eq('agency_id', agencyId)
        if (tickets) {
            setTotalTickets(tickets.length)
            setResolvedTickets(tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length)
        }

        // 6. Monthly trend (last 6 months) — leads + cash
        const months = Array.from({ length: 6 }, (_, i) => {
            const d = subMonths(new Date(), 5 - i)
            return format(startOfMonth(d), 'yyyy-MM')
        })

        const { data: cashEntries } = await supabase.from('cash_entries')
            .select('amount, payment_date').eq('agency_id', agencyId)

        const monthlyData = months.map(month => ({
            month,
            leads: (leads || []).filter(l => l.created_at.startsWith(month)).length,
            cash: (cashEntries || []).filter(c => c.payment_date.startsWith(month)).reduce((s, c) => s + Number(c.amount), 0),
        }))
        setMonthlyCounts(monthlyData)

        // 7. Agent performance
        const { data: agents } = await supabase.from('users')
            .select('id, first_name, last_name').eq('agency_id', agencyId).eq('role', 'agent')

        if (agents && leads) {
            const perf = agents.map(a => ({
                name: `${a.first_name} ${a.last_name}`,
                leads: leads.filter(l => l.assigned_to === a.id).length,
                enrolled: leads.filter(l => l.assigned_to === a.id && l.status === 'Enrolled').length,
            })).sort((a, b) => b.leads - a.leads)
            setAgentPerformance(perf)
        }

        setLoading(false)
    }, [])

    useEffect(() => { fetchData() }, [])

    // --- CSV Export Functions ---
    const exportLeads = async () => {
        setExporting("leads")
        const { data } = await supabase.from('leads')
            .select('first_name, last_name, email, phone, status, destination_country, course_interest, nationality, source, created_at')
            .eq('agency_id', currentUser?.agency_id)
            .order('created_at', { ascending: false })
        downloadCSV(data || [], `leads_${format(new Date(), 'yyyy-MM-dd')}.csv`)
        setExporting(null)
    }

    const exportAttendance = async () => {
        setExporting("attendance")
        const { data } = await supabase.from('attendance')
            .select('date, status, user:user_id(first_name, last_name)')
            .eq('agency_id', currentUser?.agency_id)
            .order('date', { ascending: false })

        const rows = (data || []).map((r: any) => ({
            Employee: r.user ? `${r.user.first_name} ${r.user.last_name}` : 'Unknown',
            Date: r.date,
            Status: r.status,
        }))
        downloadCSV(rows, `attendance_${format(new Date(), 'yyyy-MM-dd')}.csv`)
        setExporting(null)
    }

    const exportCash = async () => {
        setExporting("cash")
        const { data } = await supabase.from('cash_entries')
            .select('payer_name, amount, currency, payment_date, method, purpose, receiver:received_by(first_name, last_name)')
            .eq('agency_id', currentUser?.agency_id)
            .order('payment_date', { ascending: false })

        const rows = (data || []).map((r: any) => ({
            Payer: r.payer_name,
            Amount: r.amount,
            Currency: r.currency,
            Date: r.payment_date,
            Method: r.method,
            Purpose: r.purpose || '',
            'Received By': r.receiver ? `${r.receiver.first_name} ${r.receiver.last_name}` : '',
        }))
        downloadCSV(rows, `cash_received_${format(new Date(), 'yyyy-MM-dd')}.csv`)
        setExporting(null)
    }

    const exportTickets = async () => {
        setExporting("tickets")
        const { data } = await supabase.from('tickets')
            .select('ticket_no, subject, category, priority, status, created_at, resolved_at, submitter:submitted_by(first_name, last_name)')
            .eq('agency_id', currentUser?.agency_id)
            .order('created_at', { ascending: false })

        const rows = (data || []).map((r: any) => ({
            'Ticket #': r.ticket_no,
            Subject: r.subject,
            Category: r.category,
            Priority: r.priority,
            Status: r.status,
            'Submitted By': r.submitter ? `${r.submitter.first_name} ${r.submitter.last_name}` : '',
            'Created At': r.created_at ? format(new Date(r.created_at), 'yyyy-MM-dd') : '',
            'Resolved At': r.resolved_at ? format(new Date(r.resolved_at), 'yyyy-MM-dd') : '',
        }))
        downloadCSV(rows, `tickets_${format(new Date(), 'yyyy-MM-dd')}.csv`)
        setExporting(null)
    }

    const exportLeave = async () => {
        setExporting("leave")
        const { data } = await supabase.from('leave_requests')
            .select('leave_type, from_date, to_date, status, reason, created_at, user:user_id(first_name, last_name)')
            .eq('agency_id', currentUser?.agency_id)
            .order('created_at', { ascending: false })

        const rows = (data || []).map((r: any) => ({
            Employee: r.user ? `${r.user.first_name} ${r.user.last_name}` : '',
            Type: r.leave_type,
            From: r.from_date,
            To: r.to_date,
            Status: r.status,
            Reason: r.reason || '',
            Applied: r.created_at ? format(new Date(r.created_at), 'yyyy-MM-dd') : '',
        }))
        downloadCSV(rows, `leave_${format(new Date(), 'yyyy-MM-dd')}.csv`)
        setExporting(null)
    }

    const maxPipeline = Math.max(...Object.values(pipelineCounts), 1)
    const maxMonthlyLeads = Math.max(...monthlyCounts.map(m => m.leads), 1)
    const conversionRate = totalLeads > 0 ? ((pipelineCounts['Enrolled'] || 0) / totalLeads * 100).toFixed(1) : '0'

    const exports: { key: ExportOption; label: string; icon: any; fn: () => void; color: string }[] = [
        { key: "leads", label: "Leads CSV", icon: Users, fn: exportLeads, color: "border-blue-200 text-blue-700 hover:bg-blue-50" },
        { key: "cash", label: "Cash Received", icon: Banknote, fn: exportCash, color: "border-emerald-200 text-emerald-700 hover:bg-emerald-50" },
        { key: "attendance", label: "Attendance", icon: ClipboardList, fn: exportAttendance, color: "border-indigo-200 text-indigo-700 hover:bg-indigo-50" },
        { key: "tickets", label: "Tickets", icon: FileText, fn: exportTickets, color: "border-amber-200 text-amber-700 hover:bg-amber-50" },
        { key: "leave", label: "Leave Requests", icon: CalendarDays, fn: exportLeave, color: "border-purple-200 text-purple-700 hover:bg-purple-50" },
    ]

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 bg-slate-50/50 min-h-screen">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                        <BarChart3 className="h-6 w-6 text-primary" /> Reports & Analytics
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">Business intelligence, pipeline metrics, and CSV exports.</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                    { label: "Total Leads", value: totalLeads, icon: Users, color: "bg-blue-500/10 text-blue-500" },
                    { label: "Applications", value: totalApps, icon: FileText, color: "bg-purple-500/10 text-purple-500" },
                    { label: "Revenue (paid)", value: `$${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: "bg-emerald-500/10 text-emerald-500" },
                    { label: "Cash Received", value: `$${totalCash.toLocaleString()}`, icon: Banknote, color: "bg-teal-500/10 text-teal-500" },
                    { label: "Conversion", value: `${conversionRate}%`, icon: BarChart3, color: "bg-indigo-500/10 text-indigo-500" },
                ].map(kpi => {
                    const Icon = kpi.icon
                    return (
                        <Card key={kpi.label} className="shadow-sm">
                            <CardContent className="p-4">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${kpi.color}`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <p className="text-xl font-bold">{loading ? "—" : kpi.value}</p>
                                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Pipeline Funnel */}
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Lead Pipeline</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {LEAD_STATUSES.map(status => {
                            const count = pipelineCounts[status] || 0
                            const pct = totalLeads > 0 ? ((count / totalLeads) * 100).toFixed(0) : '0'
                            return (
                                <div key={status}>
                                    <div className="flex items-center justify-between text-sm mb-1">
                                        <span className="font-medium">{status}</span>
                                        <span className="text-muted-foreground text-xs">{count} ({pct}%)</span>
                                    </div>
                                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-700"
                                            style={{ width: `${(count / maxPipeline) * 100}%`, backgroundColor: STATUS_COLORS[status] }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </CardContent>
                </Card>

                {/* Monthly Trend */}
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">New Leads — Last 6 Months</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-2 h-44">
                            {monthlyCounts.map(({ month, leads }) => (
                                <div key={month} className="flex-1 flex flex-col items-center gap-1">
                                    <span className="text-xs font-semibold text-slate-700">{leads}</span>
                                    <div
                                        className="w-full bg-primary/80 rounded-t-md transition-all duration-700"
                                        style={{ height: `${Math.max((leads / maxMonthlyLeads) * 100, 4)}%` }}
                                    />
                                    <span className="text-[10px] text-muted-foreground">
                                        {new Date(month + '-01').toLocaleString('default', { month: 'short' })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Agent Performance */}
                {agentPerformance.length > 0 && (
                    <Card className="shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Agent Performance</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {agentPerformance.map((agent, i) => (
                                <div key={agent.name} className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                        {i + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium truncate">{agent.name}</span>
                                            <div className="flex gap-2 text-xs ml-2">
                                                <Badge className="bg-blue-50 text-blue-700 border-none shadow-none">{agent.leads} leads</Badge>
                                                <Badge className="bg-emerald-50 text-emerald-700 border-none shadow-none">{agent.enrolled} enrolled</Badge>
                                            </div>
                                        </div>
                                        <div className="h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                            <div className="h-full bg-primary rounded-full" style={{ width: `${agentPerformance[0].leads > 0 ? (agent.leads / agentPerformance[0].leads) * 100 : 0}%` }} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {/* Tickets Summary */}
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Support Tickets</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-4 rounded-xl bg-slate-50">
                                <p className="text-2xl font-bold">{totalTickets}</p>
                                <p className="text-xs text-muted-foreground">Total</p>
                            </div>
                            <div className="text-center p-4 rounded-xl bg-emerald-50">
                                <p className="text-2xl font-bold text-emerald-600">{resolvedTickets}</p>
                                <p className="text-xs text-muted-foreground">Resolved</p>
                            </div>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                                style={{ width: `${totalTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0}%` }}
                            />
                        </div>
                        <p className="text-xs text-center text-muted-foreground">
                            {totalTickets > 0 ? ((resolvedTickets / totalTickets) * 100).toFixed(0) : 0}% resolution rate
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* CSV Exports */}
            <Card className="shadow-sm">
                <CardHeader className="pb-2 border-b">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Download className="h-4 w-4" /> Export Data as CSV
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    <div className="flex flex-wrap gap-3">
                        {exports.map(exp => {
                            const Icon = exp.icon
                            return (
                                <Button
                                    key={exp.key}
                                    variant="outline"
                                    className={`gap-2 ${exp.color}`}
                                    onClick={exp.fn}
                                    disabled={exporting !== null}
                                >
                                    {exporting === exp.key ? (
                                        <span className="animate-spin">⏳</span>
                                    ) : (
                                        <Icon className="h-4 w-4" />
                                    )}
                                    {exp.label}
                                    <Download className="h-3 w-3 opacity-50" />
                                </Button>
                            )
                        })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                        All exports are agency-scoped and include data visible to your account.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
