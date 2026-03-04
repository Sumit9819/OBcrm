"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Plus, Users, Calendar, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { createBatch, enrollStudent, deleteBatch } from "./actions"
import { toast } from "sonner"

export default function ClassesPage() {
    const [batches, setBatches] = useState<any[]>([])
    const [leads, setLeads] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [showEnroll, setShowEnroll] = useState<string | null>(null)
    const [selectedLead, setSelectedLead] = useState("")
    const [saving, setSaving] = useState(false)

    const supabase = createClient()

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        const { data: batchData } = await supabase
            .from('batches')
            .select('*, batch_enrollments(id, lead_id, enrolled_at, leads(first_name, last_name, email))')
            .order('created_at', { ascending: false })

        const { data: leadData } = await supabase
            .from('leads')
            .select('id, first_name, last_name, email')
            .order('first_name', { ascending: true })

        if (batchData) setBatches(batchData)
        if (leadData) setLeads(leadData)
        setLoading(false)
    }

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setSaving(true)
        const fd = new FormData(e.currentTarget)
        const result = await createBatch(fd)
        if (result.error) toast.error(result.error)
        else {
            toast.success("Batch created!")
            setShowCreate(false)
            fetchData()
        }
        setSaving(false)
    }

    const handleEnroll = async () => {
        if (!showEnroll || !selectedLead) return
        setSaving(true)
        const result = await enrollStudent(showEnroll, selectedLead)
        if (result.error) toast.error(result.error)
        else {
            toast.success("Student enrolled!")
            setShowEnroll(null)
            setSelectedLead("")
            fetchData()
        }
        setSaving(false)
    }

    const handleDelete = async (batchId: string) => {
        if (!confirm("Delete this batch?")) return
        const result = await deleteBatch(batchId)
        if (result.error) toast.error(result.error)
        else {
            toast.success("Batch deleted")
            fetchData()
        }
    }

    return (
        <div className="flex-1 space-y-8 p-4 pt-6 md:p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Active Batches</h2>
                    <p className="text-muted-foreground mt-1">Manage class batches and student enrollments.</p>
                </div>
                <Dialog open={showCreate} onOpenChange={setShowCreate}>
                    <DialogTrigger asChild>
                        <Button className="gap-2"><Plus className="w-4 h-4" /> Create Batch</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <form onSubmit={handleCreate}>
                            <DialogHeader>
                                <DialogTitle>Create New Batch</DialogTitle>
                                <DialogDescription>Create a new class batch for group sessions.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Batch Name</Label>
                                    <Input id="name" name="name" placeholder="e.g. IELTS Batch A — March 2026" required />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="type">Type</Label>
                                    <Select name="type" defaultValue="IELTS">
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="IELTS">IELTS</SelectItem>
                                            <SelectItem value="PTE">PTE</SelectItem>
                                            <SelectItem value="TOEFL">TOEFL</SelectItem>
                                            <SelectItem value="SAT">SAT</SelectItem>
                                            <SelectItem value="Foundation">Foundation</SelectItem>
                                            <SelectItem value="General">General</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="startDate">Start Date</Label>
                                        <Input id="startDate" name="startDate" type="date" />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="endDate">End Date</Label>
                                        <Input id="endDate" name="endDate" type="date" />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="maxStudents">Max Students</Label>
                                    <Input id="maxStudents" name="maxStudents" type="number" defaultValue="30" />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create Batch"}</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {loading ? (
                <div className="text-center text-muted-foreground py-20">Loading batches...</div>
            ) : batches.length > 0 ? (
                <div className="grid gap-6">
                    {batches.map(batch => (
                        <Card key={batch.id}>
                            <CardHeader className="py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <BookOpen className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">{batch.name}</CardTitle>
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                                <Badge variant="outline">{batch.type}</Badge>
                                                {batch.start_date && (
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {format(new Date(batch.start_date), 'MMM dd')} — {batch.end_date ? format(new Date(batch.end_date), 'MMM dd, yyyy') : 'Ongoing'}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    {batch.batch_enrollments?.length || 0} / {batch.max_students}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowEnroll(batch.id)}>
                                            <Plus className="w-3.5 h-3.5" /> Enroll
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => handleDelete(batch.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            {batch.batch_enrollments?.length > 0 && (
                                <CardContent className="pt-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Student</TableHead>
                                                <TableHead>Email</TableHead>
                                                <TableHead>Enrolled</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {batch.batch_enrollments.map((enrollment: any) => (
                                                <TableRow key={enrollment.id}>
                                                    <TableCell className="font-medium">{enrollment.leads?.first_name} {enrollment.leads?.last_name}</TableCell>
                                                    <TableCell className="text-muted-foreground">{enrollment.leads?.email}</TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">{format(new Date(enrollment.enrolled_at), 'MMM dd, yyyy')}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            )}
                        </Card>
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="p-16 text-center">
                        <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-1">No batches yet</h3>
                        <p className="text-sm text-muted-foreground mb-4">Create your first class batch to start managing group sessions.</p>
                        <Button onClick={() => setShowCreate(true)}>Create Batch</Button>
                    </CardContent>
                </Card>
            )}

            {/* Enroll Student Dialog */}
            <Dialog open={!!showEnroll} onOpenChange={(open) => { if (!open) setShowEnroll(null) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Enroll Student</DialogTitle>
                        <DialogDescription>Add a student to this batch.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Select value={selectedLead} onValueChange={setSelectedLead}>
                            <SelectTrigger><SelectValue placeholder="Select a student..." /></SelectTrigger>
                            <SelectContent>
                                {leads.map(l => (
                                    <SelectItem key={l.id} value={l.id}>{l.first_name} {l.last_name} ({l.email})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleEnroll} disabled={saving || !selectedLead}>
                            {saving ? "Enrolling..." : "Enroll Student"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
