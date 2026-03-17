"use client"

import { useEffect, useState } from "react"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Globe, Lock, MoreHorizontal, Search, Plus, LayoutGrid, Flame } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { ImportLeadsDialog } from "@/components/leads/import-leads-dialog"

type Lead = {
    id: string; first_name: string; last_name: string; email?: string; phone?: string
    course_interest?: string; destination_country?: string
    status: string; is_shared_with_company: boolean; created_at: string
    lead_score?: number | null
    next_followup_at?: string | null
    assigned_to?: string | null
}

const statusColors: Record<string, string> = {
    New: 'bg-blue-500/10 text-blue-600',
    Contacted: 'bg-yellow-500/10 text-yellow-600',
    Application: 'bg-purple-500/10 text-purple-600',
    Offer: 'bg-orange-500/10 text-orange-600',
    Visa: 'bg-indigo-500/10 text-indigo-600',
    Enrolled: 'bg-emerald-500/10 text-emerald-600',
    Lost: 'bg-rose-500/10 text-rose-600',
}

const DEFAULT_STATUSES = ["New", "Contacted", "Application", "Offer", "Visa", "Enrolled", "Lost"]

export function PrivateLeadsClient({ initialLeads }: { initialLeads: Lead[] }) {
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [visFilter, setVisFilter] = useState("all")
    const [quickView, setQuickView] = useState<"all" | "today" | "hot" | "unassigned" | "lost">("all")
    const [page, setPage] = useState(1)
    const PAGE_SIZE = 30

    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const endOfToday = new Date(startOfToday)
    endOfToday.setDate(endOfToday.getDate() + 1)

    const statusOptions = Array.from(new Set([...DEFAULT_STATUSES, ...initialLeads.map(l => l.status).filter(Boolean)]))

    const filtered = initialLeads.filter(l => {
        const txt = `${l.first_name} ${l.last_name} ${l.email || ''} ${l.phone || ''} ${l.course_interest || ''}`.toLowerCase()
        const matchSearch = !search || txt.includes(search.toLowerCase())
        const matchStatus = statusFilter === 'all' || l.status === statusFilter
        const matchVis = visFilter === 'all' || (visFilter === 'shared' ? l.is_shared_with_company : !l.is_shared_with_company)
        const nextFollowup = l.next_followup_at ? new Date(l.next_followup_at) : null
        const matchQuick =
            quickView === "all" ? true :
                quickView === "today" ? !!nextFollowup && nextFollowup >= startOfToday && nextFollowup < endOfToday :
                    quickView === "hot" ? Number(l.lead_score || 0) >= 67 :
                        quickView === "unassigned" ? !l.assigned_to :
                            l.status === "Lost"
        return matchSearch && matchStatus && matchVis && matchQuick
    })

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const currentPage = Math.min(page, totalPages)
    const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

    useEffect(() => {
        setPage(1)
    }, [search, statusFilter, visFilter, quickView])

    return (
        <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">My Private Leads</h2>
                    <p className="text-muted-foreground mt-1 text-sm">
                        {filtered.length} of {initialLeads.length} leads shown
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/dashboard/leads/kanban">
                        <Button variant="outline" size="sm" className="gap-1.5">
                            <LayoutGrid className="h-4 w-4" />
                            Kanban
                        </Button>
                    </Link>
                    <ImportLeadsDialog onImported={() => window.location.reload()} />
                    <Link href="/dashboard/leads/new">
                        <Button className="gap-2"><Plus className="h-4 w-4" /> Add Lead</Button>
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        className="pl-9"
                        placeholder="Search by name, email, phone, course..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {statusOptions.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={visFilter} onValueChange={setVisFilter}>
                    <SelectTrigger className="w-36"><SelectValue placeholder="Visibility" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                        <SelectItem value="shared">Shared</SelectItem>
                    </SelectContent>
                </Select>
                {(search || statusFilter !== 'all' || visFilter !== 'all' || quickView !== 'all') && (
                    <Button variant="ghost" onClick={() => { setSearch(""); setStatusFilter("all"); setVisFilter("all"); setQuickView("all") }}>
                        Clear
                    </Button>
                )}
            </div>

            <div className="flex flex-wrap gap-2">
                <Button variant={quickView === "all" ? "default" : "outline"} size="sm" onClick={() => setQuickView("all")}>All</Button>
                <Button variant={quickView === "today" ? "default" : "outline"} size="sm" onClick={() => setQuickView("today")}>Today&apos;s Follow-ups</Button>
                <Button variant={quickView === "hot" ? "default" : "outline"} size="sm" onClick={() => setQuickView("hot")} className="gap-1.5">
                    <Flame className="h-3.5 w-3.5" /> Hot Leads
                </Button>
                <Button variant={quickView === "unassigned" ? "default" : "outline"} size="sm" onClick={() => setQuickView("unassigned")}>Unassigned</Button>
                <Button variant={quickView === "lost" ? "default" : "outline"} size="sm" onClick={() => setQuickView("lost")}>Lost</Button>
            </div>

            {/* Table */}
            <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50">
                            <TableHead>#</TableHead>
                            <TableHead>Student Name</TableHead>
                            <TableHead>Course Interest</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Score</TableHead>
                            <TableHead>Next Action</TableHead>
                            <TableHead>Visibility</TableHead>
                            <TableHead>Date Added</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginated.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                                    {search ? "No leads match your search." : "No leads yet."}
                                    {!search && (
                                        <div className="mt-2">
                                            <Link href="/dashboard/leads/new">
                                                <Button variant="outline" size="sm">Create your first lead</Button>
                                            </Link>
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        ) : paginated.map((lead, i) => (
                            <TableRow key={lead.id} className={`hover:bg-muted/30 ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}>
                                <TableCell className="text-muted-foreground font-medium text-sm">{(currentPage - 1) * PAGE_SIZE + i + 1}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <Link href={`/dashboard/leads/${lead.id}`} className="font-medium text-sm hover:text-primary hover:underline">
                                            {lead.first_name} {lead.last_name}
                                        </Link>
                                        <span className="text-xs text-muted-foreground">{lead.email}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="text-sm">{lead.course_interest || "—"}</span>
                                        <span className="text-xs text-muted-foreground">{lead.destination_country || ""}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge className={`text-xs font-semibold border-none shadow-none ${statusColors[lead.status] || 'bg-slate-100 text-slate-600'}`}>
                                        {lead.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${Number(lead.lead_score || 0) >= 67
                                        ? "bg-rose-100 text-rose-700"
                                        : Number(lead.lead_score || 0) >= 34
                                            ? "bg-amber-100 text-amber-700"
                                            : "bg-slate-100 text-slate-700"
                                        }`}>
                                        {lead.lead_score ?? 0}
                                    </span>
                                </TableCell>
                                <TableCell className="text-muted-foreground text-xs">
                                    {lead.next_followup_at ? format(new Date(lead.next_followup_at), 'MMM dd, p') : 'No follow-up'}
                                </TableCell>
                                <TableCell>
                                    {lead.is_shared_with_company ? (
                                        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full w-fit">
                                            <Globe className="h-3 w-3" /> Shared
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full w-fit">
                                            <Lock className="h-3 w-3" /> Private
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                    {format(new Date(lead.created_at), 'MMM dd, yyyy')}
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuItem asChild><Link href={`/dashboard/leads/${lead.id}`}>View Profile</Link></DropdownMenuItem>
                                            <DropdownMenuItem asChild><Link href={`/dashboard/leads/${lead.id}`}>Edit Lead</Link></DropdownMenuItem>
                                            <DropdownMenuItem asChild><Link href={`/dashboard/leads/${lead.id}`}>Log Activity</Link></DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive focus:bg-destructive/10">Archive</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</p>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= totalPages}
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    )
}
