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

export default function FinancesPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [leads, setLeads] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [userRole, setUserRole] = useState("")
    const supabase = createClient()

    useEffect(() => {
        checkAccess()
        fetchInvoices()
        fetchLeads()
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
