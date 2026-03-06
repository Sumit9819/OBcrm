"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Users2, Plus, Pencil, Search, Mail, Phone, ShieldCheck, Info } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { createEmployee, updateEmployee } from "../actions"

type Employee = {
    id: string
    first_name: string
    last_name: string
    email: string
    phone?: string
    role: string
    position?: string
    department?: string
    join_date?: string
    status: "active" | "inactive"
}

type DBRole = {
    slug: string
    name: string
    color: string
    is_system: boolean
}

export default function EmployeesPage() {
    const [employees, setEmployees] = useState<Employee[]>([])
    const [dbRoles, setDbRoles] = useState<DBRole[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [open, setOpen] = useState(false)
    const [editEmp, setEditEmp] = useState<Employee | null>(null)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({
        first_name: "", last_name: "", email: "", phone: "",
        role: "agent", position: "", department: "", join_date: "", status: "active"
    })
    const supabase = createClient()

    useEffect(() => { fetchData() }, [])

    const fetchData = async () => {
        setLoading(true)
        // Load employees
        const { data } = await supabase.from("users").select("*").order("created_at", { ascending: false })
        setEmployees(data as Employee[] || [])
        // Load dynamic roles from custom_roles
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data: profile } = await supabase.from("users").select("agency_id").eq("id", user.id).single()
            if (profile?.agency_id) {
                const { data: roles } = await supabase.from("custom_roles").select("slug, name, color, is_system").eq("agency_id", profile.agency_id).order("created_at")
                if (roles) setDbRoles(roles)
            }
        }
        setLoading(false)
    }

    const openAdd = () => {
        setEditEmp(null)
        setForm({ first_name: "", last_name: "", email: "", phone: "", role: "agent", position: "", department: "", join_date: "", status: "active" })
        setOpen(true)
    }

    const openEdit = (emp: Employee) => {
        setEditEmp(emp)
        setForm({
            first_name: emp.first_name, last_name: emp.last_name, email: emp.email,
            phone: emp.phone || "", role: emp.role, position: emp.position || "",
            department: emp.department || "", join_date: emp.join_date || "", status: emp.status || "active",
        })
        setOpen(true)
    }

    const save = async () => {
        if (!form.first_name || !form.email) { toast.error("Name and email are required"); return }
        setSaving(true)

        if (editEmp) {
            // Update existing employee
            const fd = new FormData()
            fd.set('id', editEmp.id)
            fd.set('role', form.role)
            fd.set('position', form.position)
            fd.set('department', form.department)
            fd.set('phone', form.phone)
            fd.set('joinDate', form.join_date)
            fd.set('status', form.status)
            const result = await updateEmployee(fd)
            if (result.error) toast.error(result.error)
            else toast.success("Employee updated!")
        } else {
            // Create new employee via auth admin API
            const fd = new FormData()
            fd.set('firstName', form.first_name)
            fd.set('lastName', form.last_name)
            fd.set('email', form.email)
            fd.set('phone', form.phone)
            fd.set('role', form.role)
            fd.set('position', form.position)
            fd.set('department', form.department)
            fd.set('joinDate', form.join_date)
            const result = await createEmployee(fd)
            if (result.error) toast.error(result.error)
            else {
                toast.success("Employee created! They'll receive a password reset email to set their password.")
            }
        }

        setSaving(false)
        setOpen(false)
        fetchData()
    }

    const filtered = employees.filter(e =>
        `${e.first_name} ${e.last_name} ${e.email} ${e.position || ""} ${e.department || ""}`.toLowerCase().includes(search.toLowerCase())
    )

    const activeCount = employees.filter(e => e.status === "active" || !e.status).length

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 bg-slate-50/50 min-h-screen">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                        <Users2 className="h-6 w-6 text-primary" /> Employee Management
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">Manage all employees, their roles and permissions.</p>
                </div>
                <Button onClick={openAdd} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Employee
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="p-4">
                    <p className="text-2xl font-bold">{employees.length}</p>
                    <p className="text-xs text-muted-foreground">Total Employees</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                    <p className="text-2xl font-bold text-emerald-600">{activeCount}</p>
                    <p className="text-xs text-muted-foreground">Active</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                    <p className="text-2xl font-bold text-blue-600">{dbRoles.length}</p>
                    <p className="text-xs text-muted-foreground">Roles</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                    <p className="text-2xl font-bold text-purple-600">{employees.filter(e => e.role === "agency_admin" || e.role === "super_admin").length}</p>
                    <p className="text-xs text-muted-foreground">Admins</p>
                </CardContent></Card>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search by name, email, position..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <Card className="shadow-sm overflow-hidden">
                <CardHeader className="py-3 border-b bg-indigo-600">
                    <CardTitle className="text-sm font-bold text-white uppercase">All Employees ({filtered.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead>#</TableHead>
                                <TableHead>Employee</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Position</TableHead>
                                <TableHead>Department</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Loading employees...</TableCell></TableRow>
                            ) : filtered.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No employees found.</TableCell></TableRow>
                            ) : filtered.map((emp, i) => (
                                <TableRow key={emp.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                                    <TableCell className="font-medium text-muted-foreground">{i + 1}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                                                {emp.first_name?.charAt(0)}{emp.last_name?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">{emp.first_name} {emp.last_name}</p>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Mail className="h-3 w-3" />{emp.email}
                                                </p>
                                                {emp.phone && (
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Phone className="h-3 w-3" />{emp.phone}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={`text-[10px] capitalize ${dbRoles.find(r => r.slug === emp.role)?.color || "bg-slate-100 text-slate-600"}`}>
                                            {dbRoles.find(r => r.slug === emp.role)?.name || emp.role?.replace(/_/g, " ")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm">{emp.position || <span className="text-muted-foreground italic">Not set</span>}</TableCell>
                                    <TableCell className="text-sm">{emp.department || <span className="text-muted-foreground italic">—</span>}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {emp.join_date ? format(new Date(emp.join_date), "MMM dd, yyyy") : "—"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button size="sm" variant="ghost" onClick={() => openEdit(emp)} className="h-7 w-7 p-0">
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Create / Edit Dialog */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {editEmp ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                            {editEmp ? "Edit Employee" : "Add New Employee"}
                        </DialogTitle>
                        {!editEmp && (
                            <DialogDescription className="flex items-start gap-2 text-sm bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2 text-blue-800">
                                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                                The employee will receive a password reset email to set their own password and can log in immediately.
                            </DialogDescription>
                        )}
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>First Name *</Label>
                                <Input value={form.first_name} disabled={!!editEmp} onChange={e => setForm({ ...form, first_name: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Last Name</Label>
                                <Input value={form.last_name} disabled={!!editEmp} onChange={e => setForm({ ...form, last_name: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Email *</Label>
                            <Input type="email" value={form.email} disabled={!!editEmp} onChange={e => setForm({ ...form, email: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Phone</Label>
                            <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+977-..." />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Role</Label>
                                <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {dbRoles.filter(r => !r.is_system || r.slug === 'agency_admin').map(r => (
                                            <SelectItem key={r.slug} value={r.slug}>{r.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Position</Label>
                                <Input placeholder="e.g. Senior Advisor" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Department</Label>
                                <Input placeholder="e.g. Sales" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Join Date</Label>
                                <Input type="date" value={form.join_date} onChange={e => setForm({ ...form, join_date: e.target.value })} />
                            </div>
                        </div>
                        {editEmp && (
                            <div className="space-y-1.5">
                                <Label>Status</Label>
                                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button onClick={save} disabled={saving}>
                            {saving ? "Saving..." : editEmp ? "Update Employee" : "Create Employee"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
