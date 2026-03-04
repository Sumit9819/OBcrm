"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Banknote, Plus, TrendingUp, Trash2, Search } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

type CashEntry = {
    id: string; payer_name: string; amount: number; currency: string
    payment_date: string; method: string; purpose?: string; note?: string
    received_by?: string; created_at: string
    receiver?: { first_name: string; last_name: string }
}

const methodColors: Record<string, string> = {
    cash: "bg-emerald-100 text-emerald-700",
    bank_transfer: "bg-blue-100 text-blue-700",
    cheque: "bg-purple-100 text-purple-700",
    online: "bg-teal-100 text-teal-700",
}

export default function CashReceivedPage() {
    const [entries, setEntries] = useState<CashEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState("")
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({
        payer_name: "", amount: "", currency: "USD",
        payment_date: format(new Date(), "yyyy-MM-dd"),
        method: "cash", purpose: "", note: "",
    })
    const supabase = createClient()

    const load = useCallback(async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
            .from('users').select('id, role, agency_id').eq('id', user.id).single()

        setCurrentUser(profile)

        const { data } = await supabase
            .from('cash_entries')
            .select('*, receiver:received_by(first_name, last_name)')
            .eq('agency_id', profile?.agency_id)
            .order('payment_date', { ascending: false })

        setEntries(data || [])
        setLoading(false)
    }, [])

    useEffect(() => { load() }, [])

    const submit = async () => {
        if (!form.payer_name || !form.amount || !form.payment_date) {
            toast.error("Payer name, amount and date are required"); return
        }
        setSaving(true)

        const { error } = await supabase.from('cash_entries').insert({
            agency_id: currentUser?.agency_id,
            payer_name: form.payer_name.trim(),
            amount: parseFloat(form.amount),
            currency: form.currency,
            payment_date: form.payment_date,
            method: form.method,
            purpose: form.purpose || null,
            note: form.note || null,
            received_by: currentUser?.id,
        })

        if (error) toast.error("Failed: " + error.message)
        else {
            toast.success("Cash entry recorded!")
            setForm({ payer_name: "", amount: "", currency: "USD", payment_date: format(new Date(), "yyyy-MM-dd"), method: "cash", purpose: "", note: "" })
            setOpen(false)
            load()
        }
        setSaving(false)
    }

    const deleteEntry = async (id: string) => {
        await supabase.from('cash_entries').delete().eq('id', id)
        setEntries(prev => prev.filter(e => e.id !== id))
        toast.info("Deleted")
    }

    const filtered = entries.filter(e =>
        `${e.payer_name} ${e.purpose || ''} ${e.method}`.toLowerCase().includes(search.toLowerCase())
    )
    const today = format(new Date(), "yyyy-MM-dd")
    const thisMonth = format(new Date(), "yyyy-MM")
    const total = entries.reduce((s, e) => e.currency === 'USD' ? s + Number(e.amount) : s, 0)
    const todayTotal = entries.filter(e => e.payment_date === today).reduce((s, e) => s + Number(e.amount), 0)
    const monthTotal = entries.filter(e => e.payment_date.startsWith(thisMonth)).reduce((s, e) => s + Number(e.amount), 0)

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 bg-slate-50/50 min-h-screen">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                        <Banknote className="h-6 w-6 text-primary" /> Cash Received
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">Log and track all cash and payment receipts.</p>
                </div>
                <Button onClick={() => setOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Entry
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-emerald-500" /><span className="text-xs text-muted-foreground">Total (USD)</span></div>
                    <p className="text-2xl font-bold text-emerald-600">${total.toLocaleString()}</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Today</p>
                    <p className="text-2xl font-bold">${todayTotal.toLocaleString()}</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">This Month</p>
                    <p className="text-2xl font-bold">${monthTotal.toLocaleString()}</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Total Entries</p>
                    <p className="text-2xl font-bold">{entries.length}</p>
                </CardContent></Card>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search by payer, purpose..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <Card className="shadow-sm overflow-hidden">
                <CardHeader className="py-3 border-b bg-emerald-700">
                    <CardTitle className="text-sm font-bold text-white uppercase">Cash Register ({filtered.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead>#</TableHead>
                                <TableHead>Payer</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead>Purpose</TableHead>
                                <TableHead>Received By</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Loading...</TableCell></TableRow>
                            ) : filtered.length === 0 ? (
                                <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No entries. Click &quot;Add Entry&quot; to log a payment.</TableCell></TableRow>
                            ) : filtered.map((entry, i) => {
                                const receiverName = entry.receiver
                                    ? `${entry.receiver.first_name} ${entry.receiver.last_name}`
                                    : '—'
                                return (
                                    <TableRow key={entry.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                                        <TableCell className="text-muted-foreground font-medium">{i + 1}</TableCell>
                                        <TableCell className="font-medium">{entry.payer_name}</TableCell>
                                        <TableCell><span className="font-bold text-emerald-600">{entry.currency} {Number(entry.amount).toLocaleString()}</span></TableCell>
                                        <TableCell>
                                            <Badge className={`text-[10px] capitalize border-none shadow-none ${methodColors[entry.method] || ''}`}>
                                                {entry.method.replace("_", " ")}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm max-w-[160px] truncate">{entry.purpose || "—"}</TableCell>
                                        <TableCell className="text-sm">{receiverName}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{format(new Date(entry.payment_date), "MMM dd, yyyy")}</TableCell>
                                        <TableCell className="text-right">
                                            <button onClick={() => deleteEntry(entry.id)} className="text-red-400 hover:text-red-600">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Add Cash Entry</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5 col-span-2">
                                <Label>Payer Name *</Label>
                                <Input placeholder="Name of person/company paying" value={form.payer_name} onChange={e => setForm({ ...form, payer_name: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Amount *</Label>
                                <Input type="number" placeholder="0.00" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Currency</Label>
                                <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {["USD", "AUD", "GBP", "EUR", "NPR", "INR"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Payment Method</Label>
                                <Select value={form.method} onValueChange={v => setForm({ ...form, method: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cash">Cash</SelectItem>
                                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                        <SelectItem value="cheque">Cheque</SelectItem>
                                        <SelectItem value="online">Online</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Date *</Label>
                                <Input type="date" value={form.payment_date} onChange={e => setForm({ ...form, payment_date: e.target.value })} />
                            </div>
                            <div className="space-y-1.5 col-span-2">
                                <Label>Purpose</Label>
                                <Input placeholder="e.g. Consultation fee, Application fee" value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Note</Label>
                            <Textarea placeholder="Any additional notes..." value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} className="resize-none h-16" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button onClick={submit} disabled={saving}>{saving ? "Saving..." : "Add Entry"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
