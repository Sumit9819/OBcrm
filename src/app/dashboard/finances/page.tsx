"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FileText, MoreHorizontal, CopyCheck, DollarSign, Clock, CheckCircle, Download } from "lucide-react"
import { CreateInvoiceDialog } from "@/components/finances/create-invoice-dialog"
import { toast } from "sonner"
import { exportToCSV } from "@/lib/export-csv"

type Invoice = {
    id: string
    type: string
    status: string
    amount: number
    currency: string
    due_date: string
    paid_at: string | null
    notes: string | null
    created_at: string
    leads: { first_name: string; last_name: string; email: string } | null
    universities: { name: string } | null
}

type Commission = {
    amount: number | null
    status: string
    paid_at: string | null
    lead: { branch_id: string | null } | null
    agent: { first_name: string | null; last_name: string | null } | null
}

export default function FinancesPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [leads, setLeads] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [userRole, setUserRole] = useState("")
    const [commissions, setCommissions] = useState<Commission[]>([])
    const [branches, setBranches] = useState<{ id: string; name: string }[]>([])
    const [branchFilter, setBranchFilter] = useState<string>('all')
    const supabase = createClient()

    useEffect(() => {
        checkAccess()
        fetchInvoices()
        fetchLeads()
        fetchCommissions()
        fetchBranches()
    }, [])

    const checkAccess = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase.from("users").select("role").eq("id", user.id).single()
        setUserRole(data?.role || "")
    }

    const fetchInvoices = async () => {
        setLoading(true)
        const { data } = await supabase
            .from("invoices")
            .select("*, leads(first_name, last_name, email), universities(name)")
            .order("created_at", { ascending: false })
        setInvoices((data as any) || [])
        setLoading(false)
    }

    const fetchLeads = async () => {
        const { data } = await supabase
            .from("leads")
            .select("id, first_name, last_name")
            .order("first_name", { ascending: true })
        setLeads(data || [])
    }

    const fetchCommissions = async () => {
        const { data } = await supabase
            .from('agent_commissions')
            .select('amount, status, paid_at, lead:leads!agent_commissions_lead_id_fkey(branch_id), agent:users!agent_commissions_agent_id_fkey(first_name, last_name)')

        setCommissions((data as any) || [])
    }

    const fetchBranches = async () => {
        const { data } = await supabase
            .from('branches')
            .select('id, name')
            .order('name', { ascending: true })
        setBranches(data || [])
    }

    const updateStatus = async (id: string, status: string) => {
        const update: any = { status }
        if (status === "paid") update.paid_at = new Date().toISOString()

        const { error } = await supabase.from("invoices").update(update).eq("id", id)
        if (!error) {
            toast.success(`Invoice marked as ${status}`)
            fetchInvoices()
        } else {
            toast.error("Failed to update: " + error.message)
        }
    }

    const handleExportInvoices = () => {
        if (invoices.length === 0) { toast.error("No invoices to export"); return }
        exportToCSV(invoices.map(i => ({
            invoice_id: `INV-${i.id.split('-')[0].toUpperCase()}`,
            student: i.leads ? `${i.leads.first_name} ${i.leads.last_name}` : '',
            email: i.leads?.email || '',
            type: i.type,
            amount: i.amount,
            currency: i.currency,
            status: i.status,
            due_date: i.due_date,
            paid_at: i.paid_at || '',
        })), 'invoices_export')
        toast.success("CSV exported!")
    }

    if (!["super_admin", "agency_admin", "accountant"].includes(userRole) && userRole) {
        return (
            <div className="flex h-full items-center justify-center p-8 text-center text-muted-foreground">
                <h2>You do not have permission to view the Financial Dashboard.</h2>
            </div>
        )
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'paid': return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 shadow-none border-none">Paid</Badge>
            case 'sent': return <Badge variant="secondary" className="shadow-none border-none">Awaiting Payment</Badge>
            case 'overdue': return <Badge variant="destructive" className="shadow-none border-none">Overdue</Badge>
            case 'cancelled': return <Badge variant="outline" className="text-muted-foreground shadow-none border-none">Cancelled</Badge>
            default: return <Badge variant="outline" className="text-muted-foreground shadow-none border-none">Draft</Badge>
        }
    }

    const getTypeLabel = (type: string) => {
        const map: Record<string, string> = {
            student_tuition: 'Tuition Fee', student_visa: 'Visa Processing',
            student_service: 'Service Fee', university_commission: 'Uni Commission',
        }
        return map[type] || type
    }

    // Real KPI calculations
    const totalOutstanding = invoices
        .filter(i => i.status === 'sent' || i.status === 'overdue')
        .reduce((sum, i) => sum + Number(i.amount), 0)

    const totalCollected = invoices
        .filter(i => i.status === 'paid')
        .reduce((sum, i) => sum + Number(i.amount), 0)

    const paidCount = invoices.filter(i => i.status === 'paid').length
    const pendingCount = invoices.filter(i => i.status === 'sent' || i.status === 'draft').length

    const filteredCommissions = commissions.filter((c) =>
        branchFilter === 'all' ? true : c.lead?.branch_id === branchFilter
    )

    const paidCommissionsAmount = filteredCommissions
        .filter(c => c.status === 'paid')
        .reduce((sum, c) => sum + Number(c.amount || 0), 0)

    const pendingCommissionsAmount = filteredCommissions
        .filter(c => c.status !== 'paid')
        .reduce((sum, c) => sum + Number(c.amount || 0), 0)

    const byAgent = Object.entries(
        filteredCommissions.reduce<Record<string, number>>((acc, c) => {
            const key = `${c.agent?.first_name || ''} ${c.agent?.last_name || ''}`.trim() || 'Unknown Agent'
            acc[key] = (acc[key] || 0) + Number(c.amount || 0)
            return acc
        }, {})
    )
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 6)

    const maxAgentTotal = byAgent.length ? byAgent[0].total : 0

    const monthlyPayouts = Array.from({ length: 6 }).map((_, offset) => {
        const date = new Date()
        date.setMonth(date.getMonth() - (5 - offset))
        const year = date.getFullYear()
        const month = date.getMonth()
        const label = format(new Date(year, month, 1), 'MMM yyyy')

        const amount = filteredCommissions
            .filter(c => {
                if (!c.paid_at || c.status !== 'paid') return false
                const paid = new Date(c.paid_at)
                return paid.getFullYear() === year && paid.getMonth() === month
            })
            .reduce((sum, c) => sum + Number(c.amount || 0), 0)

        return { label, amount }
    })

    const maxMonthlyPayout = monthlyPayouts.reduce((m, x) => Math.max(m, x.amount), 0)

    return (
        <div className="flex-1 space-y-8 p-4 pt-6 md:p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Finances & Invoicing</h2>
                    <p className="text-muted-foreground mt-1">Manage student payments and university commissions.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2" onClick={handleExportInvoices}>
                        <Download className="w-4 h-4" /> Export CSV
                    </Button>
                    <CreateInvoiceDialog leads={leads} onCreated={fetchInvoices} />
                </div>
            </div>

            {/* Real KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
                    <h3 className="tracking-tight text-sm font-medium flex items-center gap-2 text-muted-foreground">
                        <DollarSign className="h-4 w-4" /> Total Outstanding
                    </h3>
                    <div className="text-2xl font-bold mt-2">${totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    <p className="text-xs text-muted-foreground mt-1">{pendingCount} pending invoices</p>
                </div>
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
                    <h3 className="tracking-tight text-sm font-medium flex items-center gap-2 text-muted-foreground">
                        <CopyCheck className="h-4 w-4" /> Total Collected
                    </h3>
                    <div className="text-2xl font-bold mt-2 text-emerald-600">${totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    <p className="text-xs text-emerald-500 mt-1 font-medium">{paidCount} invoices settled</p>
                </div>
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
                    <h3 className="tracking-tight text-sm font-medium flex items-center gap-2 text-muted-foreground">
                        <FileText className="h-4 w-4" /> Total Invoices
                    </h3>
                    <div className="text-2xl font-bold mt-2">{invoices.length}</div>
                </div>
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
                    <h3 className="tracking-tight text-sm font-medium flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" /> Overdue
                    </h3>
                    <div className="text-2xl font-bold mt-2 text-red-500">{invoices.filter(i => i.status === 'overdue').length}</div>
                </div>
            </div>

            <div className="rounded-xl border bg-card p-5 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h3 className="text-lg font-semibold">Commission Dashboard</h3>
                        <p className="text-sm text-muted-foreground">Agent totals, paid vs pending, and monthly payouts.</p>
                    </div>
                    <select
                        value={branchFilter}
                        onChange={(e) => setBranchFilter(e.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                        <option value="all">All branches</option>
                        {branches.map(branch => (
                            <option key={branch.id} value={branch.id}>{branch.name}</option>
                        ))}
                    </select>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border p-4">
                        <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Paid vs Pending</p>
                        <div className="mt-3 space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-emerald-600 font-medium">Paid</span>
                                <span>${paidCommissionsAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-amber-600 font-medium">Pending</span>
                                <span>${pendingCommissionsAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg border p-4">
                        <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Monthly Payouts</p>
                        <div className="mt-3 space-y-2">
                            {monthlyPayouts.map((row) => (
                                <div key={row.label} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <span>{row.label}</span>
                                        <span>${row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="h-2 rounded bg-muted overflow-hidden">
                                        <div
                                            className="h-2 bg-primary"
                                            style={{ width: `${maxMonthlyPayout > 0 ? Math.max(6, (row.amount / maxMonthlyPayout) * 100) : 0}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="rounded-lg border p-4">
                    <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Agent Commission Totals</p>
                    <div className="mt-3 space-y-3">
                        {byAgent.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No commission records found for this filter.</p>
                        ) : byAgent.map((row) => (
                            <div key={row.name} className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium">{row.name}</span>
                                    <span>${row.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="h-2 rounded bg-muted overflow-hidden">
                                    <div
                                        className="h-2 bg-emerald-500"
                                        style={{ width: `${maxAgentTotal > 0 ? Math.max(8, (row.total / maxAgentTotal) * 100) : 0}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Invoice Table */}
            <div className="rounded-xl border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Invoice ID</TableHead>
                            <TableHead>Billed To</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">Loading invoices...</TableCell></TableRow>
                        ) : invoices.length > 0 ? (
                            invoices.map((inv) => (
                                <TableRow key={inv.id} className="hover:bg-muted/50">
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                        INV-{inv.id.split('-')[0].toUpperCase()}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {inv.type === 'university_commission' ? (
                                            <span className="text-primary">{inv.universities?.name || 'Unknown Uni'}</span>
                                        ) : (
                                            <div className="flex flex-col">
                                                <span>{inv.leads?.first_name} {inv.leads?.last_name}</span>
                                                <span className="text-xs text-muted-foreground font-normal">{inv.leads?.email}</span>
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell><span className="text-sm">{getTypeLabel(inv.type)}</span></TableCell>
                                    <TableCell className="font-semibold">
                                        ${Number(inv.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} {inv.currency}
                                    </TableCell>
                                    <TableCell>{getStatusBadge(inv.status)}</TableCell>
                                    <TableCell className="text-sm">{format(new Date(inv.due_date), 'MMM dd, yyyy')}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {inv.status === 'draft' && (
                                                    <DropdownMenuItem onClick={() => updateStatus(inv.id, 'sent')}>Mark as Sent</DropdownMenuItem>
                                                )}
                                                {(inv.status === 'sent' || inv.status === 'overdue') && (
                                                    <DropdownMenuItem onClick={() => updateStatus(inv.id, 'paid')}>Mark as Paid</DropdownMenuItem>
                                                )}
                                                {inv.status !== 'cancelled' && inv.status !== 'paid' && (
                                                    <DropdownMenuItem onClick={() => updateStatus(inv.id, 'cancelled')} className="text-red-500">Cancel</DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                                    <div className="flex flex-col items-center justify-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                                            <FileText className="w-6 h-6 opacity-50" />
                                        </div>
                                        <p>No invoices generated yet. Click &quot;Generate Invoice&quot; to create one.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
