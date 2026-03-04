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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { title: "TOTAL REVENUE", value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-500/10", href: "/dashboard/finances" },
                        { title: "THIS MONTH", value: `$${thisMonthRevenue.toLocaleString()}`, icon: TrendingUp, color: "text-blue-500", bg: "bg-blue-500/10", href: "/dashboard/finances" },
                        { title: "PENDING INVOICES", value: String(pending), icon: FileText, color: "text-amber-500", bg: "bg-amber-500/10", href: "/dashboard/finances" },
                    ].map((stat, i) => (
                        <Link key={i} href={stat.href}>
                            <Card className="shadow-sm hover:shadow-md transition-all cursor-pointer group border-slate-200">
                                <CardContent className="p-6 flex items-center gap-4">
                                    <div className={`p-3 rounded-full ${stat.bg} ${stat.color}`}>
                                        <stat.icon className="h-6 w-6" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase">{stat.title}</p>
                                        <h4 className="text-2xl font-bold">{stat.value}</h4>
                                    </div>
                                    <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                    <Card className="shadow-sm">
                        <CardHeader className="py-4 border-b">
                            <CardTitle className="text-sm font-bold text-primary uppercase">Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            <Link href="/dashboard/finances"><Button variant="outline" className="w-full justify-start gap-2 h-10"><FileText className="w-4 h-4 text-emerald-500" /> Invoices & Receipts</Button></Link>
                            <Link href="/dashboard/settings/cash-received"><Button variant="outline" className="w-full justify-start gap-2 h-10 mt-2"><DollarSign className="w-4 h-4 text-blue-500" /> Cash Received Log</Button></Link>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    // ── SUPER ADMIN / AGENCY ADMIN dashboard
    if (role === 'super_admin' || role === 'agency_admin') {
        const [leadsRes, appsRes, callsRes, teamRes, revenueRes] = await Promise.all([
            supabase.from('leads').select('id', { count: 'exact', head: true }),
            supabase.from('applications').select('id', { count: 'exact', head: true }),
            supabase.from('activities').select('id', { count: 'exact', head: true }).eq('type', 'call'),
            supabase.from('users').select('id', { count: 'exact', head: true }),
            supabase.from('invoices').select('amount, status'),
        ])

        const totalRevenue = revenueRes.data?.filter(i => i.status === 'paid').reduce((s, i) => s + (i.amount || 0), 0) ?? 0

        // All leads (not scoped to owner) with agent info
        const { data: allLeads } = await supabase
            .from('leads')
            .select('id, first_name, last_name, status, is_shared_with_company, created_at, users!leads_owner_id_fkey(first_name, last_name)')
            .order('created_at', { ascending: false })
            .limit(10)

        // Agent performance
        const { data: agents } = await supabase
            .from('users')
            .select('id, first_name, last_name, role, position')
            .in('role', ['agent', 'agency_admin'])
            .order('created_at', { ascending: true })
            .limit(8)

        let agentStats: any[] = []
        if (agents) {
            for (const agent of agents.slice(0, 6)) {
                const { count } = await supabase
                    .from('leads')
                    .select('id', { count: 'exact', head: true })
                    .eq('owner_id', agent.id)
                agentStats.push({ ...agent, leadCount: count ?? 0 })
            }
        }

        const stats = [
            { title: "TEAM MEMBERS", value: String(teamRes.count ?? 0), icon: Users, color: "text-emerald-500", bg: "bg-emerald-500/10", href: "/dashboard/settings/employees" },
            { title: "TOTAL LEADS", value: String(leadsRes.count ?? 0), icon: TrendingUp, color: "text-purple-500", bg: "bg-purple-500/10", href: "/dashboard/leads/all" },
            { title: "APPLICATIONS", value: String(appsRes.count ?? 0), icon: Briefcase, color: "text-indigo-500", bg: "bg-indigo-500/10", href: "/dashboard/applications/offers" },
            { title: "CALL LOGS", value: String(callsRes.count ?? 0), icon: Phone, color: "text-blue-500", bg: "bg-blue-500/10", href: "/dashboard/calls" },
            { title: "REVENUE", value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-teal-500", bg: "bg-teal-500/10", href: "/dashboard/finances" },
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
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {stats.map((stat, i) => (
                        <Link key={i} href={stat.href}>
                            <Card className="shadow-sm border-slate-200 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group">
                                <CardContent className="p-4 flex items-center gap-3">
                                    <div className={`p-2.5 rounded-full ${stat.bg} ${stat.color}`}>
                                        <stat.icon className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-semibold text-muted-foreground uppercase truncate">{stat.title}</p>
                                        <h4 className="text-xl font-bold">{stat.value}</h4>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>

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
                                <TableRow className="bg-indigo-600 hover:bg-indigo-600">
                                    <TableHead className="text-white">#</TableHead>
                                    <TableHead className="text-white">Lead</TableHead>
                                    <TableHead className="text-white">Status</TableHead>
                                    <TableHead className="text-white">Agent</TableHead>
                                    <TableHead className="text-white">Visibility</TableHead>
                                    <TableHead className="text-white">Created</TableHead>
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
                                    <TableRow className="bg-slate-50">
                                        <TableHead>#</TableHead>
                                        <TableHead>Agent</TableHead>
                                        <TableHead>Position</TableHead>
                                        <TableHead>Leads Owned</TableHead>
                                        <TableHead>Performance</TableHead>
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

                {/* Quick Actions */}
                <div className="grid lg:grid-cols-3 gap-6 pb-12">
                    <Card className="lg:col-span-2 shadow-sm border-slate-200">
                        <CardHeader className="py-4 border-b">
                            <CardTitle className="text-sm font-bold uppercase">{format(today, "MMMM yyyy")}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 flex justify-center">
                            <Calendar
                                mode="single"
                                selected={today}
                                className="w-full flex"
                                classNames={{
                                    months: "flex w-full flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                                    month: "space-y-4 w-full",
                                    table: "w-full border-collapse space-y-1",
                                    head_row: "flex w-full",
                                    head_cell: "text-muted-foreground rounded-md w-full font-medium text-[0.8rem]",
                                    row: "flex w-full mt-2",
                                    cell: "h-14 w-full text-center text-sm p-1 relative flex items-start justify-end border border-slate-100",
                                    day: "h-7 w-7 p-0 font-normal aria-selected:opacity-100 rounded-full flex items-center justify-center",
                                    day_selected: "bg-blue-600 text-white hover:bg-blue-600 hover:text-white",
                                    day_today: "bg-accent text-accent-foreground",
                                }}
                            />
                        </CardContent>
                    </Card>
                    <div className="space-y-4">
                        <Card className="shadow-sm">
                            <CardHeader className="py-4 border-b">
                                <CardTitle className="text-sm font-bold text-primary uppercase">Admin Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-2">
                                <Link href="/dashboard/leads/all"><Button variant="outline" className="w-full justify-start gap-2 h-10"><Users className="w-4 h-4 text-purple-500" /> All Leads</Button></Link>
                                <Link href="/dashboard/settings/employees"><Button variant="outline" className="w-full justify-start gap-2 h-10"><UserCheck className="w-4 h-4 text-blue-500" /> Manage Employees</Button></Link>
                                <Link href="/dashboard/reports"><Button variant="outline" className="w-full justify-start gap-2 h-10"><TrendingUp className="w-4 h-4 text-emerald-500" /> Reports</Button></Link>
                                <Link href="/dashboard/finances"><Button variant="outline" className="w-full justify-start gap-2 h-10"><DollarSign className="w-4 h-4 text-teal-500" /> Finances</Button></Link>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        )
    }

    // ── AGENT dashboard (default for 'agent' role)
    const [leadsRes, appsRes, callsRes] = await Promise.all([
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('owner_id', user.id),
        supabase.from('applications').select('id', { count: 'exact', head: true }),
        supabase.from('activities').select('id', { count: 'exact', head: true }).eq('type', 'call').eq('user_id', user.id),
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

    const agentStats = [
        { title: "MY LEADS", value: String(leadsRes.count ?? 0), icon: Users, color: "text-purple-500", bg: "bg-purple-500/10", href: "/dashboard/leads/private" },
        { title: "APPLICATIONS", value: String(appsRes.count ?? 0), icon: Briefcase, color: "text-indigo-500", bg: "bg-indigo-500/10", href: "/dashboard/applications/offers" },
        { title: "MY CALLS", value: String(callsRes.count ?? 0), icon: Phone, color: "text-blue-500", bg: "bg-blue-500/10", href: "/dashboard/calls" },
        { title: "TASKS", value: "—", icon: CheckSquare, color: "text-emerald-500", bg: "bg-emerald-500/10", href: "/dashboard/tasks" },
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {agentStats.map((stat, i) => (
                    <Link key={i} href={stat.href}>
                        <Card className="shadow-sm border-slate-200 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className={`p-3 rounded-full ${stat.bg} ${stat.color}`}>
                                    <stat.icon className="h-6 w-6" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase">{stat.title}</p>
                                    <h4 className="text-2xl font-bold">{stat.value}</h4>
                                </div>
                                <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

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

            {/* Quick Actions */}
            <Card className="shadow-sm">
                <CardHeader className="py-4 border-b">
                    <CardTitle className="text-sm font-bold text-primary uppercase">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="p-4 flex flex-wrap gap-3">
                    <Link href="/dashboard/leads/new"><Button variant="outline" className="gap-2 h-10"><Users className="w-4 h-4 text-purple-500" /> Add New Lead</Button></Link>
                    <Link href="/dashboard/tasks"><Button variant="outline" className="gap-2 h-10"><CheckSquare className="w-4 h-4 text-emerald-500" /> My Tasks</Button></Link>
                    <Link href="/dashboard/reminders"><Button variant="outline" className="gap-2 h-10"><Bell className="w-4 h-4 text-amber-500" /> My Reminders</Button></Link>
                    <Link href="/dashboard/chat"><Button variant="outline" className="gap-2 h-10"><FileText className="w-4 h-4 text-blue-500" /> Open Chat</Button></Link>
                </CardContent>
            </Card>
        </div>
    )
}
