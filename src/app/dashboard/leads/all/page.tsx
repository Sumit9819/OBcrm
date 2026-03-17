"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
    Search, Users, Globe, UserCheck, CheckSquare, Square, Upload,
    RefreshCw, UserCog, Download, Plus, LayoutGrid, Flame,
} from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import { toast } from "sonner"
import { LeadForm } from "@/components/leads/lead-form"

const statusColors: Record<string, string> = {
    New: "bg-blue-100 text-blue-700",
    Contacted: "bg-purple-100 text-purple-700",
    Application: "bg-amber-100 text-amber-700",
    Offer: "bg-orange-100 text-orange-700",
    Visa: "bg-indigo-100 text-indigo-700",
    Enrolled: "bg-emerald-100 text-emerald-700",
    Lost: "bg-rose-100 text-rose-700",
}

const DEFAULT_STATUSES = ["New", "Contacted", "Application", "Offer", "Visa", "Enrolled", "Lost"]

// ── CSV Lead Import helpers ──────────────────────────────────────
function parseCSV(text: string): Record<string, string>[] {
    const lines = text.trim().split("\n")
    if (lines.length < 2) return []
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/ /g, "_"))
    return lines.slice(1).map(line => {
        const cols = line.split(",")
        const obj: Record<string, string> = {}
        headers.forEach((h, i) => { obj[h] = cols[i]?.trim() || "" })
        return obj
    })
}

export default function AllLeadsPage() {
    const [leads, setLeads] = useState<any[]>([])
    const [agents, setAgents] = useState<any[]>([])
    const [staff, setStaff] = useState<any[]>([])
    const [currentUserId, setCurrentUserId] = useState("")
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [agentFilter, setAgentFilter] = useState("all")
    const [statusFilter, setStatusFilter] = useState("all")
    const [visibilityFilter, setVisibilityFilter] = useState("all")
    const [quickView, setQuickView] = useState<"all" | "my" | "today" | "hot" | "unassigned" | "lost">("all")
    const [page, setPage] = useState(1)
    const PAGE_SIZE = 50

    // Bulk action state
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [bulkStatus, setBulkStatus] = useState("")
    const [bulkAssignTo, setBulkAssignTo] = useState("")
    const [bulkPending, setBulkPending] = useState(false)

    // CSV import state
    const [showCSV, setShowCSV] = useState(false)
    const [csvRows, setCSVRows] = useState<Record<string, string>[]>([])
    const [csvPending, setCSVPending] = useState(false)
    const [pipelines, setPipelines] = useState<any[]>([])
    const [selectedPipelineId, setSelectedPipelineId] = useState("")

    // Add Lead dialog
    const [showAddLead, setShowAddLead] = useState(false)

    const supabase = createClient()

    const load = useCallback(async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setCurrentUserId(user.id)

        const { data: profile } = await supabase.from("users").select("role, agency_id").eq("id", user.id).single()
        if (!["super_admin", "agency_admin"].includes(profile?.role)) {
            window.location.href = "/dashboard"
            return
        }

        const [leadsRes, agentsRes, staffRes, pipelinesRes] = await Promise.all([
            supabase.from("leads").select(`
                *,
                owner:users!leads_owner_id_fkey(id, first_name, last_name),
                referrer:users!leads_referred_by_fkey(id, first_name, last_name),
                assignee:users!leads_assigned_to_fkey(id, first_name, last_name)
            `).order("created_at", { ascending: false }),
            supabase.from("users").select("id, first_name, last_name").eq("role", "agent"),
            supabase.from("users").select("id, first_name, last_name, job_title").not("role", "in", '("agent","student")'),
            supabase.from("pipelines").select("id, name, is_default").eq('agency_id', profile?.agency_id).order('is_default', { ascending: false }),
        ])

        setLeads(leadsRes.data || [])
        setAgents(agentsRes.data || [])
        setStaff(staffRes.data || [])
        const fetchedPipelines = pipelinesRes.data || []
        setPipelines(fetchedPipelines)
        if (fetchedPipelines.length > 0) {
            const defaultPl = fetchedPipelines.find(p => p.is_default)
            setSelectedPipelineId(defaultPl ? defaultPl.id : fetchedPipelines[0].id)
        }
        setLoading(false)
    }, [])

    useEffect(() => { load() }, [load])

    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const endOfToday = new Date(startOfToday)
    endOfToday.setDate(endOfToday.getDate() + 1)

    const statusOptions = Array.from(new Set([...DEFAULT_STATUSES, ...leads.map(l => l.status).filter(Boolean)]))

    const filtered = leads.filter(l => {
        const name = `${l.first_name} ${l.last_name} ${l.email || ""} ${l.phone || ""}`.toLowerCase()
        const matchSearch = name.includes(search.toLowerCase())
        const matchAgent = agentFilter === "all" || l.referrer?.id === agentFilter
        const matchStatus = statusFilter === "all" || l.status === statusFilter
        const matchVisibility = visibilityFilter === "all" ||
            (visibilityFilter === "shared" && l.is_shared_with_company) ||
            (visibilityFilter === "private" && !l.is_shared_with_company)

        const nextFollowup = l.next_followup_at ? new Date(l.next_followup_at) : null
        const matchQuickView =
            quickView === "all" ? true :
                quickView === "my" ? l.assigned_to === currentUserId :
                    quickView === "today" ? !!nextFollowup && nextFollowup >= startOfToday && nextFollowup < endOfToday :
                        quickView === "hot" ? Number(l.lead_score || 0) >= 67 :
                            quickView === "unassigned" ? !l.assigned_to :
                                l.status === "Lost"

        return matchSearch && matchAgent && matchStatus && matchVisibility && matchQuickView
    })

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const currentPage = Math.min(page, totalPages)
    const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

    useEffect(() => {
        setPage(1)
    }, [search, agentFilter, statusFilter, visibilityFilter, quickView])

    const allPageSelected = paginated.length > 0 && paginated.every(l => selected.has(l.id))

    const toggleAll = () => {
        if (allPageSelected) {
            setSelected(prev => { const n = new Set(prev); paginated.forEach(l => n.delete(l.id)); return n })
        } else {
            setSelected(prev => { const n = new Set(prev); paginated.forEach(l => n.add(l.id)); return n })
        }
    }

    const toggleOne = (id: string) => {
        setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
    }

    const handleBulkAction = async () => {
        if (selected.size === 0) return
        setBulkPending(true)
        const ids = [...selected]

        try {
            if (bulkStatus) {
                const { error } = await supabase.from("leads").update({ status: bulkStatus }).in("id", ids)
                if (error) throw error
                toast.success(`Status updated to ${bulkStatus} for ${ids.length} leads`)
            }
            if (bulkAssignTo) {
                const { error } = await supabase.from("leads").update({ assigned_to: bulkAssignTo || null }).in("id", ids)
                if (error) throw error
                toast.success(`Assigned ${ids.length} leads`)
            }
            setSelected(new Set())
            setBulkStatus("")
            setBulkAssignTo("")
            await load()
        } catch (e: any) {
            toast.error(e.message || "Bulk action failed")
        } finally {
            setBulkPending(false)
        }
    }

    const handleCSVFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = ev => {
            const rows = parseCSV(ev.target?.result as string)
            setCSVRows(rows)
        }
        reader.readAsText(file)
    }

    const importCSV = async () => {
        if (csvRows.length === 0) return
        setCSVPending(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { data: profile } = await supabase.from("users").select("agency_id").eq("id", user!.id).single()

            const targetPipelineId = selectedPipelineId || null

            // Get first stage for default status
            let startingStatus = "New"
            if (targetPipelineId) {
                const { data: stages } = await supabase.from('pipeline_stages')
                    .select('name')
                    .eq('pipeline_id', targetPipelineId)
                    .order('sort_order')
                    .limit(1)
                if (stages && stages[0]) startingStatus = stages[0].name
            }

            const records = csvRows.map(row => ({
                agency_id: profile?.agency_id,
                owner_id: user!.id,
                first_name: row.first_name || row.firstname || row.name?.split(" ")[0] || "Unknown",
                last_name: row.last_name || row.lastname || row.name?.split(" ").slice(1).join(" ") || "",
                email: row.email || "",
                phone: row.phone || row.mobile || "",
                destination_country: row.destination_country || row.destination || row.country || "",
                course_interest: row.course_interest || row.course || "",
                nationality: row.nationality || "",
                status: startingStatus,
                pipeline_id: targetPipelineId,
                is_shared_with_company: true,
            }))

            const { error } = await supabase.from("leads").insert(records)
            if (error) throw error
            toast.success(`Imported ${records.length} leads!`)
            setShowCSV(false)
            setCSVRows([])
            await load()
        } catch (e: any) {
            toast.error(e.message || "Import failed")
        } finally {
            setCSVPending(false)
        }
    }

    const exportCSV = () => {
        const headers = ["Name", "Email", "Phone", "Status", "Destination", "Agent", "Created"]
        const rows = filtered.map(l => [
            `${l.first_name} ${l.last_name}`,
            l.email || "",
            l.phone || "",
            l.status,
            l.destination_country || "",
            l.referrer ? `${l.referrer.first_name} ${l.referrer.last_name}` : "",
            format(new Date(l.created_at), "yyyy-MM-dd"),
        ])
        const csv = [headers, ...rows].map(r => r.join(",")).join("\n")
        const blob = new Blob([csv], { type: "text/csv" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a"); a.href = url; a.download = "leads.csv"; a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 bg-slate-50/50 min-h-screen">
            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                        <Users className="h-6 w-6 text-primary" /> All Agency Leads
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                        Complete view of all leads. Select rows for bulk operations.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/dashboard/leads/kanban">
                        <Button variant="outline" size="sm" className="gap-1.5">
                            <LayoutGrid className="h-4 w-4" />
                            Kanban
                        </Button>
                    </Link>
                    <Button size="sm" onClick={() => setShowAddLead(true)} className="gap-1.5">
                        <Plus className="h-4 w-4" /> Add Lead
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowCSV(true)} className="gap-1.5">
                        <Upload className="h-4 w-4" /> Import CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
                        <Download className="h-4 w-4" /> Export CSV
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card><CardContent className="p-4">
                    <p className="text-2xl font-bold">{leads.length}</p>
                    <p className="text-xs text-muted-foreground">Total Leads</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                    <p className="text-2xl font-bold text-emerald-600">{leads.filter(l => l.status === "Enrolled").length}</p>
                    <p className="text-xs text-muted-foreground">Enrolled</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                    <p className="text-2xl font-bold text-blue-600">{leads.filter(l => l.status === "New").length}</p>
                    <p className="text-xs text-muted-foreground">New Leads</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                    <p className="text-2xl font-bold text-purple-600">{leads.filter(l => l.is_shared_with_company).length}</p>
                    <p className="text-xs text-muted-foreground">Shared Leads</p>
                </CardContent></Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Search by name, email, phone..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Select value={agentFilter} onValueChange={setAgentFilter}>
                    <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Filter by agent" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Agents</SelectItem>
                        {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.first_name} {a.last_name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
                    <SelectTrigger className="w-full md:w-36"><SelectValue placeholder="Visibility" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="shared">Shared</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex flex-wrap gap-2">
                <Button variant={quickView === "all" ? "default" : "outline"} size="sm" onClick={() => setQuickView("all")}>All</Button>
                <Button variant={quickView === "my" ? "default" : "outline"} size="sm" onClick={() => setQuickView("my")}>My Leads</Button>
                <Button variant={quickView === "today" ? "default" : "outline"} size="sm" onClick={() => setQuickView("today")}>Today&apos;s Follow-ups</Button>
                <Button variant={quickView === "hot" ? "default" : "outline"} size="sm" onClick={() => setQuickView("hot")} className="gap-1.5">
                    <Flame className="h-3.5 w-3.5" /> Hot Leads
                </Button>
                <Button variant={quickView === "unassigned" ? "default" : "outline"} size="sm" onClick={() => setQuickView("unassigned")}>Unassigned</Button>
                <Button variant={quickView === "lost" ? "default" : "outline"} size="sm" onClick={() => setQuickView("lost")}>Lost</Button>
            </div>

            {/* Bulk action bar */}
            {selected.size > 0 && (
                <div className="flex items-center gap-3 flex-wrap p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <p className="text-sm font-medium text-primary">{selected.size} leads selected</p>
                    <Select value={bulkStatus} onValueChange={setBulkStatus}>
                        <SelectTrigger className="w-44 h-8 text-sm"><SelectValue placeholder="Set status..." /></SelectTrigger>
                        <SelectContent>
                            {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={bulkAssignTo} onValueChange={setBulkAssignTo}>
                        <SelectTrigger className="w-48 h-8 text-sm"><SelectValue placeholder="Assign to..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">Unassigned</SelectItem>
                            {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}{s.job_title ? ` · ${s.job_title}` : ""}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button size="sm" onClick={handleBulkAction} disabled={bulkPending || (!bulkStatus && !bulkAssignTo)} className="gap-1.5">
                        {bulkPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <UserCog className="h-3.5 w-3.5" />}
                        Apply
                    </Button>
                    <button onClick={() => setSelected(new Set())} className="text-xs text-muted-foreground hover:text-foreground ml-auto">
                        Clear selection
                    </button>
                </div>
            )}

            {/* Table */}
            <Card className="shadow-sm overflow-hidden">
                <CardHeader className="py-3 border-b bg-indigo-700">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-bold text-white uppercase">
                            Showing {filtered.length} of {leads.length} leads
                        </CardTitle>
                        {(search || agentFilter !== "all" || statusFilter !== "all" || visibilityFilter !== "all" || quickView !== "all") && (
                            <button
                                onClick={() => {
                                    setSearch("")
                                    setAgentFilter("all")
                                    setStatusFilter("all")
                                    setVisibilityFilter("all")
                                    setQuickView("all")
                                }}
                                className="text-xs text-indigo-200 hover:text-white"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead className="w-10">
                                    <button onClick={toggleAll} className="flex items-center">
                                        {allPageSelected
                                            ? <CheckSquare className="h-4 w-4 text-primary" />
                                            : <Square className="h-4 w-4 text-muted-foreground" />}
                                    </button>
                                </TableHead>
                                <TableHead>#</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead>Assigned To</TableHead>
                                <TableHead>Next Action</TableHead>
                                <TableHead>Agent (Referrer)</TableHead>
                                <TableHead>Destination</TableHead>
                                <TableHead>Created</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={11} className="text-center py-16 text-muted-foreground">Loading leads...</TableCell></TableRow>
                            ) : paginated.length === 0 ? (
                                <TableRow><TableCell colSpan={11} className="text-center py-16 text-muted-foreground">No leads match your filters.</TableCell></TableRow>
                            ) : paginated.map((lead, i) => (
                                <TableRow
                                    key={lead.id}
                                    className={`${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"} ${selected.has(lead.id) ? "bg-primary/5" : ""}`}
                                >
                                    <TableCell>
                                        <button onClick={() => toggleOne(lead.id)} className="flex items-center">
                                            {selected.has(lead.id)
                                                ? <CheckSquare className="h-4 w-4 text-primary" />
                                                : <Square className="h-4 w-4 text-muted-foreground" />}
                                        </button>
                                    </TableCell>
                                    <TableCell className="font-medium text-muted-foreground">{(currentPage - 1) * PAGE_SIZE + i + 1}</TableCell>
                                    <TableCell>
                                        <Link href={`/dashboard/leads/${lead.id}`} className="font-medium text-blue-600 hover:underline text-sm">
                                            {lead.first_name} {lead.last_name}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        <div>{lead.email}</div>
                                        <div>{lead.phone}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={`text-[10px] shadow-none border-none ${statusColors[lead.status] || "bg-slate-100 text-slate-600"}`}>
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
                                    <TableCell className="text-sm text-muted-foreground">
                                        {lead.assignee ? `${lead.assignee.first_name} ${lead.assignee.last_name}` : "Unassigned"}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {lead.next_followup_at ? format(new Date(lead.next_followup_at), "MMM dd, p") : "No follow-up"}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 text-sm">
                                            <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                                            <span>{lead.referrer ? `${lead.referrer.first_name} ${lead.referrer.last_name}` : "Direct"}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <Globe className="h-3 w-3" />
                                            {lead.destination_country || "—"}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {format(new Date(lead.created_at), "MMM dd, yyyy")}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                </p>
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

            {/* Add Lead Dialog */}
            <Dialog open={showAddLead} onOpenChange={setShowAddLead}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5" /> Add New Lead
                        </DialogTitle>
                    </DialogHeader>
                    <LeadForm onSuccess={() => { setShowAddLead(false); load() }} />
                </DialogContent>
            </Dialog>

            {/* CSV Import Dialog */}
            <Dialog open={showCSV} onOpenChange={setShowCSV}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Upload className="h-5 w-5" /> Import Leads from CSV
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                            <p className="font-medium mb-1">Expected CSV columns:</p>
                            <code className="text-xs font-mono">first_name, last_name, email, phone, destination_country, course_interest, nationality</code>
                        </div>
                        <div className="flex gap-4 items-end">
                            <div className="flex-1">
                                <Label>Choose CSV File</Label>
                                <Input type="file" accept=".csv" onChange={handleCSVFile} className="mt-1.5" />
                            </div>
                            {pipelines.length > 0 && (
                                <div className="flex-1">
                                    <Label>Target Pipeline</Label>
                                    <Select value={selectedPipelineId} onValueChange={setSelectedPipelineId}>
                                        <SelectTrigger className="mt-1.5">
                                            <SelectValue placeholder="Select pipeline..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {pipelines.map(p => (
                                                <SelectItem key={p.id} value={p.id}>
                                                    {p.name} {p.is_default ? "(Default)" : ""}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                        {csvRows.length > 0 && (
                            <div>
                                <p className="text-sm font-medium mb-2">Preview ({csvRows.length} rows)</p>
                                <div className="border rounded-lg overflow-auto max-h-48">
                                    <table className="w-full text-xs">
                                        <thead className="bg-muted">
                                            <tr>
                                                {Object.keys(csvRows[0]).map(k => (
                                                    <th key={k} className="px-3 py-2 text-left font-medium">{k}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {csvRows.slice(0, 5).map((row, i) => (
                                                <tr key={i} className="border-t">
                                                    {Object.values(row).map((v, j) => (
                                                        <td key={j} className="px-3 py-1.5">{String(v)}</td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {csvRows.length > 5 && (
                                        <p className="px-3 py-2 text-xs text-muted-foreground border-t">
                                            + {csvRows.length - 5} more rows
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setShowCSV(false); setCSVRows([]) }}>Cancel</Button>
                        <Button onClick={importCSV} disabled={csvRows.length === 0 || csvPending} className="gap-1.5">
                            {csvPending && <RefreshCw className="h-4 w-4 animate-spin" />}
                            Import {csvRows.length > 0 ? `${csvRows.length} Leads` : ""}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
