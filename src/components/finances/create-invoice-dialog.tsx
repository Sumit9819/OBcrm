"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Plus } from "lucide-react"

export function CreateInvoiceDialog({ leads, onCreated }: { leads: any[]; onCreated: () => void }) {
    const [open, setOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [leadId, setLeadId] = useState("")
    const [invoiceType, setInvoiceType] = useState("student_service")
    const [amount, setAmount] = useState("")
    const [currency, setCurrency] = useState("USD")
    const [dueDate, setDueDate] = useState("")
    const [notes, setNotes] = useState("")

    const supabase = createClient()

    const handleCreate = async () => {
        if (!leadId || !amount || !dueDate) return
        setSaving(true)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
            .from("users")
            .select("agency_id")
            .eq("id", user.id)
            .single()

        const { error } = await supabase.from("invoices").insert({
            agency_id: profile?.agency_id,
            created_by: user.id,
            lead_id: leadId,
            type: invoiceType,
            status: "draft",
            amount: parseFloat(amount),
            currency,
            due_date: dueDate,
            notes: notes || null,
        })

        if (error) {
            alert("Failed to create invoice: " + error.message)
        } else {
            setOpen(false)
            setLeadId("")
            setAmount("")
            setDueDate("")
            setNotes("")
            onCreated()
        }
        setSaving(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="w-4 h-4" /> Generate Invoice</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Invoice</DialogTitle>
                    <DialogDescription>Generate an invoice for a student or service.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Bill To (Lead)</Label>
                        <Select value={leadId} onValueChange={setLeadId}>
                            <SelectTrigger><SelectValue placeholder="Select lead..." /></SelectTrigger>
                            <SelectContent>
                                {leads.map(l => (
                                    <SelectItem key={l.id} value={l.id}>{l.first_name} {l.last_name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label>Invoice Type</Label>
                        <Select value={invoiceType} onValueChange={setInvoiceType}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="student_tuition">Tuition Fee</SelectItem>
                                <SelectItem value="student_visa">Visa Processing</SelectItem>
                                <SelectItem value="student_service">Agency Service Fee</SelectItem>
                                <SelectItem value="university_commission">University Commission</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Amount</Label>
                            <Input type="number" step="0.01" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Currency</Label>
                            <Select value={currency} onValueChange={setCurrency}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="USD">USD</SelectItem>
                                    <SelectItem value="AUD">AUD</SelectItem>
                                    <SelectItem value="GBP">GBP</SelectItem>
                                    <SelectItem value="EUR">EUR</SelectItem>
                                    <SelectItem value="NPR">NPR</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label>Due Date</Label>
                        <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                        <Label>Notes (optional)</Label>
                        <Input placeholder="e.g. First semester tuition" value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleCreate} disabled={saving || !leadId || !amount || !dueDate}>
                        {saving ? "Creating..." : "Create Invoice"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
