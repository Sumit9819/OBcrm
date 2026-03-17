import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    Users, FileText, Phone, Briefcase, TrendingUp, ArrowUpRight,
    UserCheck, DollarSign, CheckSquare, BookOpen, Bell
} from "lucide-react"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { AddEventDialog } from "@/components/dashboard/events/add-event-dialog"
import { SummaryCards } from "@/components/dashboard/summary-cards"

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

    const role = profile?.role || 'agent'
    const fullName = profile
        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email
        : "User"
    const today = new Date()
    const hour = today.getHours()
    const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening"

    // ── STUDENT: should never reach here (middleware redirects them), but just in case
    if (role === 'student') redirect('/student-portal')

    // Fetch upcoming events for the agency
    let upcomingEvents = []
    if (profile?.agency_id) {
        const { data: events } = await supabase
            .from('calendar_events')
            .select('*')
            .eq('agency_id', profile.agency_id)
            .gte('start_at', new Date().toISOString())
            .order('start_at', { ascending: true })
            .limit(5)
        upcomingEvents = events || []
    }

    // ── ACCOUNTANT dashboard
    if (role === 'accountant') {
        const { data: invoices } = await supabase.from('invoices').select('amount, status, created_at')
        const totalRevenue = invoices?.filter(i => i.status === 'paid').reduce((s, i) => s + (i.amount || 0), 0) ?? 0
        const pending = invoices?.filter(i => i.status === 'sent' || i.status === 'overdue').length ?? 0
        const thisMonthRevenue = invoices?.filter(i => i.status === 'paid' && i.created_at?.startsWith(format(today, 'yyyy-MM'))).reduce((s, i) => s + (i.amount || 0), 0) ?? 0

        return (
            <div className="flex-1 space-y-6 p-4 md:p-8 bg-slate-50/50 min-h-screen">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-slate-800">{greeting}, {fullName}!</h2>
                        <p className="text-muted-foreground text-sm">Finance & Accounting Overview</p>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-medium text-muted-foreground">{format(today, "EEEE, MMMM d, yyyy")}</div>
                        <Badge className="bg-emerald-600 text-white mt-1">Accountant</Badge>
                    </div>
                </div>

                <SummaryCards className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6" stats={[
                    { title: "TOTAL REVENUE", value: `$${totalRevenue.toLocaleString()}`, icon: "dollar", href: "/dashboard/finances" },
                    { title: "THIS MONTH", value: `$${thisMonthRevenue.toLocaleString()}`, icon: "trending", href: "/dashboard/finances" },
                    { title: "PENDING INVOICES", value: String(pending), icon: "file", href: "/dashboard/finances" },
                ]} />

                {/* Bottom Widgets Row */}
                <div className="grid lg:grid-cols-3 gap-6 pb-12">
                    {/* Calendar & Events */}
                    <Card className="shadow-none border border-slate-200 rounded-xl flex flex-col">
                        <CardHeader className="py-4 border-b flex flex-row items-center justify-between">
                            <CardTitle className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">Calendar & Events</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 flex flex-col gap-4">
                            <div className="flex justify-center">
                                <Calendar
                                    mode="single"
                                    selected={today}
                                    className="bg-transparent pointer-events-none"
                                    classNames={{
                                        day_selected: "bg-slate-800 text-white font-medium",
                                        day_today: "bg-slate-100 text-slate-900 font-bold",
                                    }}
                                />
                            </div>

                            <div className="pt-4 border-t">
                                <h4 className="text-xs font-semibold uppercase text-slate-500 mb-3">Upcoming Events</h4>
                                {!upcomingEvents || upcomingEvents.length === 0 ? (
                                    <p className="text-xs text-muted-foreground text-center py-2">No upcoming events.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {upcomingEvents.map(evt => (
                                            <div key={evt.id} className="flex gap-3 items-start">
                                                <div className="w-2 rounded-full mt-1.5 h-2 shrink-0" style={{ backgroundColor: evt.color || '#6366f1' }} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-700 truncate">{evt.title}</p>
                                                    <p className="text-xs text-muted-foreground">{format(new Date(evt.start_at), "MMM d, h:mm a")}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Pending Invoices Reminder */}
                    <Card className="shadow-none border border-slate-200 rounded-xl flex flex-col">
                        <CardHeader className="py-4 border-b flex flex-row items-center justify-between">
                            <CardTitle className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">Action Needed</CardTitle>
                            <Link href="/dashboard/finances"><Button variant="ghost" size="sm" className="h-6 text-[10px] uppercase text-indigo-600 hover:bg-indigo-50">View All</Button></Link>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 flex flex-col">
                            <div className="flex-1 flex flex-col justify-center items-center text-center p-6 text-slate-500">
                                {pending > 0 ? (
                                    <>
                                        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-3">
                                            <FileText className="w-6 h-6 text-amber-600" strokeWidth={1.5} />
                                        </div>
                                        <p className="text-sm font-medium text-slate-700">{pending} Pending {pending === 1 ? 'Invoice' : 'Invoices'}</p>
                                        <p className="text-xs mt-1">Review and send reminders.</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                                            <CheckSquare className="w-6 h-6 text-emerald-600" strokeWidth={1.5} />
                                        </div>
                                        <p className="text-sm font-medium text-slate-700">All caught up!</p>
                                        <p className="text-xs mt-1">No pending invoices.</p>
                                    </>
                                )}
                                <Link href="/dashboard/finances">
                                    <Button variant="outline" size="sm" className="mt-4 text-xs h-8">Go to Finances</Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Access */}
                    <Card className="shadow-none border border-slate-200 rounded-xl flex flex-col">
                        <CardHeader className="py-4 border-b">
                            <CardTitle className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            <Link href="/dashboard/finances">
                                <Button variant="outline" className="w-full justify-start gap-3 h-11 border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/50 transition-colors text-slate-600">
                                    <div className="w-6 h-6 rounded bg-emerald-100 flex items-center justify-center"><FileText className="w-3.5 h-3.5 text-emerald-600" /></div>
                                    <span className="font-medium text-sm">Invoices & Receipts</span>
                                </Button>
                            </Link>
                            <Link href="/dashboard/settings/cash-received">
                                <Button variant="outline" className="w-full justify-start gap-3 h-11 border-slate-200 hover:border-blue-200 hover:bg-blue-50/50 transition-colors text-slate-600">
                                    <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center"><DollarSign className="w-3.5 h-3.5 text-blue-600" /></div>
                                    <span className="font-medium text-sm">Cash Received Log</span>
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    // ── SUPER ADMIN / AGENCY ADMIN dashboard
    if (role === 'super_admin' || role === 'agency_admin') {
        const [leadsRes, appsRes, callsRes, teamRes, revenueRes, upcomingTasksRes] = await Promise.all([
            supabase.from('leads').select('id', { count: 'exact', head: true }),
            supabase.from('applications').select('id', { count: 'exact', head: true }),
            supabase.from('activities').select('id', { count: 'exact', head: true }).eq('type', 'call'),
            supabase.from('users').select('id', { count: 'exact', head: true }),
            supabase.from('invoices').select('amount, status'),
            supabase.from('tasks').select('id, title, due_date, priority, status').eq('agency_id', profile?.agency_id).neq('status', 'done').order('due_date', { ascending: true }).limit(5),
        ])

        const totalRevenue = revenueRes.data?.filter(i => i.status === 'paid').reduce((s, i) => s + (i.amount || 0), 0) ?? 0

        // All leads (not scoped to owner) with agent info
        const { data: allLeads } = await supabase
            .from('leads')
            .select('id, first_name, last_name, status, is_shared_with_company, created_at, users!leads_owner_id_fkey(first_name, last_name)')
            .order('created_at', { ascending: false })
            .limit(10)

        // Agent performance — single batch query instead of N+1 loop
        const { data: agents } = await supabase
            .from('users')
            .select('id, first_name, last_name, role, position')
            .in('role', ['agent', 'agency_admin'])
            .order('created_at', { ascending: true })
            .limit(8)

        let agentStats: any[] = []
        if (agents && agents.length > 0) {
            const agentIds = agents.slice(0, 6).map(a => a.id)
            const { data: agentLeads } = await supabase
                .from('leads')
                .select('owner_id')
                .in('owner_id', agentIds)
            const countMap: Record<string, number> = {}
            agentLeads?.forEach(l => { countMap[l.owner_id] = (countMap[l.owner_id] || 0) + 1 })
            agentStats = agents.slice(0, 6).map(a => ({ ...a, leadCount: countMap[a.id] ?? 0 }))
        }

        const stats: any = [
            { title: "TEAM MEMBERS", value: String(teamRes.count ?? 0), icon: "users", href: "/dashboard/settings/employees" },
            { title: "TOTAL LEADS", value: String(leadsRes.count ?? 0), icon: "trending", href: "/dashboard/leads/all" },
            { title: "APPLICATIONS", value: String(appsRes.count ?? 0), icon: "briefcase", href: "/dashboard/applications/offers" },
            { title: "CALL LOGS", value: String(callsRes.count ?? 0), icon: "phone", href: "/dashboard/calls" },
            { title: "REVENUE", value: `$${totalRevenue.toLocaleString()}`, icon: "dollar", href: "/dashboard/finances" },
        ]

        return (
            <div className="flex-1 space-y-6 p-4 md:p-8 bg-slate-50/50 min-h-screen">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-slate-800">{greeting}, {fullName}!</h2>
                        <p className="text-muted-foreground text-sm">Full agency overview — all teams and leads.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <div className="text-sm font-medium text-muted-foreground">{format(today, "EEEE, MMMM d, yyyy")}</div>
                            <Badge className="bg-indigo-600 text-white mt-1">
                                {role === 'super_admin' ? 'Super Admin' : 'Agency Admin'}
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* KPI Grid */}
                <SummaryCards className="grid grid-cols-2 md:grid-cols-5 gap-4" stats={stats} />

                {/* All Leads (admin view) */}
                <Card className="shadow-sm">
                    <CardHeader className="py-3 border-b">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold text-primary uppercase">Recent Leads — All Agents</CardTitle>
                            <Link href="/dashboard/leads/all">
                                <Button variant="ghost" size="sm" className="h-7 text-xs">View All</Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-b border-border bg-transparent hover:bg-transparent">
                                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">#</TableHead>
                                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Lead</TableHead>
                                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Status</TableHead>
                                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Agent</TableHead>
                                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Visibility</TableHead>
                                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Created</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {!allLeads || allLeads.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No leads yet.</TableCell></TableRow>
                                ) : allLeads.map((lead: any, i) => (
                                    <TableRow key={lead.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                                        <TableCell className="text-muted-foreground font-medium">{i + 1}</TableCell>
                                        <TableCell>
                                            <Link href={`/dashboard/leads/${lead.id}`} className="font-medium text-blue-600 hover:underline">
                                                {lead.first_name} {lead.last_name}
                                            </Link>
                                        </TableCell>
                                        <TableCell><Badge variant="secondary" className="text-xs">{lead.status}</Badge></TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {(lead.users as any)?.first_name} {(lead.users as any)?.last_name}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={`text-[10px] ${lead.is_shared_with_company ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                                {lead.is_shared_with_company ? "Shared" : "Private"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {format(new Date(lead.created_at), "MMM dd, yyyy")}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Agent Performance */}
                {agentStats.length > 0 && (
                    <Card className="shadow-sm">
                        <CardHeader className="py-4 border-b">
                            <CardTitle className="text-sm font-bold text-primary uppercase">Agent Performance</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b border-border bg-transparent hover:bg-transparent">
                                        <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">#</TableHead>
                                        <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Agent</TableHead>
                                        <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Position</TableHead>
                                        <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Leads Owned</TableHead>
                                        <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Performance</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {agentStats.map((agent, i) => {
                                        const max = Math.max(...agentStats.map(a => a.leadCount), 1)
                                        return (
                                            <TableRow key={agent.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                                                <TableCell className="font-medium text-muted-foreground">{i + 1}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                                                            {agent.first_name?.charAt(0)}{agent.last_name?.charAt(0)}
                                                        </div>
                                                        <span className="font-medium text-sm">{agent.first_name} {agent.last_name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">{agent.position || "—"}</TableCell>
                                                <TableCell>
                                                    <Badge className="bg-purple-500/10 text-purple-600 shadow-none border-none">{agent.leadCount} leads</Badge>
                                                </TableCell>
                                                <TableCell className="w-48">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${(agent.leadCount / max) * 100}%` }} />
                                                        </div>
                                                        <span className="text-xs text-muted-foreground">{max > 0 ? Math.round((agent.leadCount / max) * 100) : 0}%</span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {/* Additional Widgets Row */}
                <div className="grid lg:grid-cols-3 gap-6 pb-12">
                    {/* Calendar & Events */}
                    <Card className="shadow-none border border-slate-200 rounded-xl flex flex-col">
                        <CardHeader className="py-4 border-b flex flex-row items-center justify-between">
                            <CardTitle className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">Calendar & Events</CardTitle>
                            <AddEventDialog />
                        </CardHeader>
                        <CardContent className="p-4 flex flex-col gap-4">
                            <div className="flex justify-center">
                                <Calendar
                                    mode="single"
                                    selected={today}
                                    className="bg-transparent pointer-events-none"
                                    classNames={{
                                        day_selected: "bg-slate-800 text-white font-medium",
                                        day_today: "bg-slate-100 text-slate-900 font-bold",
                                    }}
                                />
                            </div>

                            <div className="pt-4 border-t">
                                <h4 className="text-xs font-semibold uppercase text-slate-500 mb-3">Upcoming Events</h4>
                                {!upcomingEvents || upcomingEvents.length === 0 ? (
                                    <p className="text-xs text-muted-foreground text-center py-2">No upcoming events.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {upcomingEvents.map(evt => (
                                            <div key={evt.id} className="flex gap-3 items-start">
                                                <div className="w-2 rounded-full mt-1.5 h-2 shrink-0" style={{ backgroundColor: evt.color || '#6366f1' }} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-700 truncate">{evt.title}</p>
                                                    <p className="text-xs text-muted-foreground">{format(new Date(evt.start_at), "MMM d, h:mm a")}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Pending Tasks / Quick Reminders */}
                    <Card className="shadow-none border border-slate-200 rounded-xl flex flex-col">
                        <CardHeader className="py-4 border-b flex flex-row items-center justify-between">
                            <CardTitle className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">Upcoming Tasks</CardTitle>
                            <Link href="/dashboard/tasks"><Button variant="ghost" size="sm" className="h-6 text-[10px] uppercase text-indigo-600 hover:bg-indigo-50">View All</Button></Link>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 flex flex-col">
                            {!upcomingTasksRes.data || upcomingTasksRes.data.length === 0 ? (
                                <div className="flex-1 flex flex-col justify-center items-center text-center p-6 text-slate-500">
                                    <CheckSquare className="w-8 h-8 mb-3 text-slate-300" strokeWidth={1.5} />
                                    <p className="text-sm font-medium text-slate-700">All caught up!</p>
                                    <p className="text-xs mt-1">No pending tasks right now.</p>
                                    <Link href="/dashboard/tasks">
                                        <Button variant="outline" size="sm" className="mt-4 text-xs h-8">Add Task</Button>
                                    </Link>
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {upcomingTasksRes.data.map((task: any) => (
                                        <div key={task.id} className="flex items-start gap-3 px-4 py-3">
                                            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${task.priority === 'high' ? 'bg-red-500' :
                                                task.priority === 'medium' ? 'bg-amber-500' : 'bg-slate-300'
                                                }`} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-700 truncate">{task.title}</p>
                                                {task.due_date && (
                                                    <p className="text-xs text-muted-foreground">
                                                        Due {format(new Date(task.due_date), 'MMM d')}
                                                    </p>
                                                )}
                                            </div>
                                            <Badge variant="secondary" className="text-[10px] shrink-0 capitalize">{task.priority}</Badge>
                                        </div>
                                    ))}
                                    <div className="px-4 py-3">
                                        <Link href="/dashboard/tasks">
                                            <Button variant="ghost" size="sm" className="h-7 text-xs w-full">View All Tasks</Button>
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Access */}
                    <Card className="shadow-none border border-slate-200 rounded-xl flex flex-col">
                        <CardHeader className="py-4 border-b">
                            <CardTitle className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">Quick Access</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            <Link href="/dashboard/leads/new">
                                <Button variant="outline" className="w-full justify-start gap-3 h-11 border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50 transition-colors text-slate-600">
                                    <div className="w-6 h-6 rounded bg-indigo-100 flex items-center justify-center"><Users className="w-3.5 h-3.5 text-indigo-600" /></div>
                                    <span className="font-medium text-sm">Add New Lead</span>
                                </Button>
                            </Link>
                            <Link href="/dashboard/settings/employees">
                                <Button variant="outline" className="w-full justify-start gap-3 h-11 border-slate-200 hover:border-blue-200 hover:bg-blue-50/50 transition-colors text-slate-600">
                                    <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center"><UserCheck className="w-3.5 h-3.5 text-blue-600" /></div>
                                    <span className="font-medium text-sm">Manage Employees</span>
                                </Button>
                            </Link>
                            <Link href="/dashboard/reports">
                                <Button variant="outline" className="w-full justify-start gap-3 h-11 border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/50 transition-colors text-slate-600">
                                    <div className="w-6 h-6 rounded bg-emerald-100 flex items-center justify-center"><TrendingUp className="w-3.5 h-3.5 text-emerald-600" /></div>
                                    <span className="font-medium text-sm">View Reports</span>
                                </Button>
                            </Link>
                            <Link href="/dashboard/finances">
                                <Button variant="outline" className="w-full justify-start gap-3 h-11 border-slate-200 hover:border-amber-200 hover:bg-amber-50/50 transition-colors text-slate-600">
                                    <div className="w-6 h-6 rounded bg-amber-100 flex items-center justify-center"><DollarSign className="w-3.5 h-3.5 text-amber-600" /></div>
                                    <span className="font-medium text-sm">Billing & Finances</span>
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    // ── AGENT dashboard (default for 'agent' role)
    const [leadsRes, appsRes, callsRes, agentTasksRes] = await Promise.all([
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('owner_id', user.id),
        supabase.from('applications').select('id', { count: 'exact', head: true }),
        supabase.from('activities').select('id', { count: 'exact', head: true }).eq('type', 'call').eq('user_id', user.id),
        supabase.from('tasks').select('id, title, due_date, priority, status').eq('assigned_to', user.id).neq('status', 'done').order('due_date', { ascending: true }).limit(5),
    ])

    // My private leads (today's follow-ups)
    const { data: myLeads } = await supabase
        .from('leads')
        .select('id, first_name, last_name, status, created_at')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(6)

    // Today's scheduled calls
    const { data: todayActivities } = await supabase
        .from('activities')
        .select('*, leads(first_name, last_name)')
        .eq('user_id', user.id)
        .eq('type', 'call')
        .order('created_at', { ascending: false })
        .limit(5)

    const agentStats: any = [
        { title: "MY LEADS", value: String(leadsRes.count ?? 0), icon: "users", href: "/dashboard/leads/private" },
        { title: "APPLICATIONS", value: String(appsRes.count ?? 0), icon: "briefcase", href: "/dashboard/applications/offers" },
        { title: "MY CALLS", value: String(callsRes.count ?? 0), icon: "phone", href: "/dashboard/calls" },
        { title: "TASKS", value: "—", icon: "checksquare", href: "/dashboard/tasks" },
    ]

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 bg-slate-50/50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800">{greeting}, {fullName}!</h2>
                    <p className="text-muted-foreground text-sm">Your personal pipeline and daily targets.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <div className="text-sm font-medium text-muted-foreground">{format(today, "EEEE, MMMM d, yyyy")}</div>
                        <Badge className="bg-blue-600 text-white mt-1">
                            {role.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Agent KPIs */}
            <SummaryCards className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6" stats={agentStats} />

            <div className="grid lg:grid-cols-2 gap-6">
                {/* My Recent Leads */}
                <Card className="shadow-sm">
                    <CardHeader className="py-3 border-b">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold text-primary uppercase">My Recent Leads</CardTitle>
                            <Link href="/dashboard/leads/private"><Button variant="ghost" size="sm" className="h-7 text-xs">View All</Button></Link>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {!myLeads || myLeads.length === 0 ? (
                            <div className="py-12 text-center text-muted-foreground text-sm">
                                No leads yet. <Link href="/dashboard/leads/new" className="text-primary hover:underline">Add your first lead</Link>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {myLeads.map(lead => (
                                    <Link key={lead.id} href={`/dashboard/leads/${lead.id}`}>
                                        <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">
                                                {lead.first_name?.charAt(0)}{lead.last_name?.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{lead.first_name} {lead.last_name}</p>
                                                <p className="text-xs text-muted-foreground">{format(new Date(lead.created_at), "MMM dd, yyyy")}</p>
                                            </div>
                                            <Badge variant="secondary" className="text-[10px] shrink-0">{lead.status}</Badge>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Call Activity */}
                <Card className="shadow-sm">
                    <CardHeader className="py-3 border-b">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold text-primary uppercase">Recent Call Activity</CardTitle>
                            <Link href="/dashboard/calls"><Button variant="ghost" size="sm" className="h-7 text-xs">View All</Button></Link>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {!todayActivities || todayActivities.length === 0 ? (
                            <div className="py-12 text-center text-muted-foreground text-sm">No call logs yet.</div>
                        ) : (
                            <div className="divide-y">
                                {todayActivities.map((act: any) => (
                                    <div key={act.id} className="flex items-start gap-3 px-4 py-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                            <Phone className="h-3.5 w-3.5 text-blue-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{act.leads?.first_name} {act.leads?.last_name}</p>
                                            <p className="text-xs text-muted-foreground truncate">{act.description}</p>
                                        </div>
                                        <span className="text-xs text-muted-foreground shrink-0">{format(new Date(act.created_at), "MMM dd")}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Widgets Row */}
            <div className="grid lg:grid-cols-3 gap-6 pb-12">
                {/* Calendar & Events */}
                <Card className="shadow-none border border-slate-200 rounded-xl flex flex-col">
                    <CardHeader className="py-4 border-b flex flex-row items-center justify-between">
                        <CardTitle className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">Calendar & Events</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 flex flex-col gap-4">
                        <div className="flex justify-center">
                            <Calendar
                                mode="single"
                                selected={today}
                                className="bg-transparent pointer-events-none"
                                classNames={{
                                    day_selected: "bg-slate-800 text-white font-medium",
                                    day_today: "bg-slate-100 text-slate-900 font-bold",
                                }}
                            />
                        </div>

                        <div className="pt-4 border-t">
                            <h4 className="text-xs font-semibold uppercase text-slate-500 mb-3">Upcoming Events</h4>
                            {!upcomingEvents || upcomingEvents.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-2">No upcoming events.</p>
                            ) : (
                                <div className="space-y-3">
                                    {upcomingEvents.map(evt => (
                                        <div key={evt.id} className="flex gap-3 items-start">
                                            <div className="w-2 rounded-full mt-1.5 h-2 shrink-0" style={{ backgroundColor: evt.color || '#6366f1' }} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-700 truncate">{evt.title}</p>
                                                <p className="text-xs text-muted-foreground">{format(new Date(evt.start_at), "MMM d, h:mm a")}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Pending Tasks / Quick Reminders */}
                <Card className="shadow-none border border-slate-200 rounded-xl flex flex-col">
                    <CardHeader className="py-4 border-b flex flex-row items-center justify-between">
                        <CardTitle className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">Upcoming Tasks</CardTitle>
                        <Link href="/dashboard/tasks"><Button variant="ghost" size="sm" className="h-6 text-[10px] uppercase text-indigo-600 hover:bg-indigo-50">View All</Button></Link>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 flex flex-col">
                        {!agentTasksRes.data || agentTasksRes.data.length === 0 ? (
                            <div className="flex-1 flex flex-col justify-center items-center text-center p-6 text-slate-500">
                                <CheckSquare className="w-8 h-8 mb-3 text-slate-300" strokeWidth={1.5} />
                                <p className="text-sm font-medium text-slate-700">All caught up!</p>
                                <p className="text-xs mt-1">No pending tasks right now.</p>
                                <Link href="/dashboard/tasks">
                                    <Button variant="outline" size="sm" className="mt-4 text-xs h-8">Add Task</Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {agentTasksRes.data.map((task: any) => (
                                    <div key={task.id} className="flex items-start gap-3 px-4 py-3">
                                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${task.priority === 'high' ? 'bg-red-500' :
                                            task.priority === 'medium' ? 'bg-amber-500' : 'bg-slate-300'
                                            }`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-700 truncate">{task.title}</p>
                                            {task.due_date && (
                                                <p className="text-xs text-muted-foreground">
                                                    Due {format(new Date(task.due_date), 'MMM d')}
                                                </p>
                                            )}
                                        </div>
                                        <Badge variant="secondary" className="text-[10px] shrink-0 capitalize">{task.priority}</Badge>
                                    </div>
                                ))}
                                <div className="px-4 py-3">
                                    <Link href="/dashboard/tasks">
                                        <Button variant="ghost" size="sm" className="h-7 text-xs w-full">View All Tasks</Button>
                                    </Link>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Access */}
                <Card className="shadow-none border border-slate-200 rounded-xl flex flex-col">
                    <CardHeader className="py-4 border-b">
                        <CardTitle className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                        <Link href="/dashboard/leads/new">
                            <Button variant="outline" className="w-full justify-start gap-3 h-11 border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50 transition-colors text-slate-600">
                                <div className="w-6 h-6 rounded bg-indigo-100 flex items-center justify-center"><Users className="w-3.5 h-3.5 text-indigo-600" /></div>
                                <span className="font-medium text-sm">Add New Lead</span>
                            </Button>
                        </Link>
                        <Link href="/dashboard/tasks">
                            <Button variant="outline" className="w-full justify-start gap-3 h-11 border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/50 transition-colors text-slate-600">
                                <div className="w-6 h-6 rounded bg-emerald-100 flex items-center justify-center"><CheckSquare className="w-3.5 h-3.5 text-emerald-600" /></div>
                                <span className="font-medium text-sm">My Tasks</span>
                            </Button>
                        </Link>
                        <Link href="/dashboard/reminders">
                            <Button variant="outline" className="w-full justify-start gap-3 h-11 border-slate-200 hover:border-amber-200 hover:bg-amber-50/50 transition-colors text-slate-600">
                                <div className="w-6 h-6 rounded bg-amber-100 flex items-center justify-center"><Bell className="w-3.5 h-3.5 text-amber-600" /></div>
                                <span className="font-medium text-sm">My Reminders</span>
                            </Button>
                        </Link>
                        <Link href="/dashboard/chat">
                            <Button variant="outline" className="w-full justify-start gap-3 h-11 border-slate-200 hover:border-blue-200 hover:bg-blue-50/50 transition-colors text-slate-600">
                                <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center"><FileText className="w-3.5 h-3.5 text-blue-600" /></div>
                                <span className="font-medium text-sm">Open Chat</span>
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
