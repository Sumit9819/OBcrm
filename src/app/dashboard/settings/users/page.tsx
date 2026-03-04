"use client"

import { useEffect, useState, useTransition } from "react"
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
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    Users, Shield, Edit, Search, UserPlus, Trash2,
    Eye, EyeOff, Loader2, CheckCircle2, Info,
} from "lucide-react"
import { toast } from "sonner"
import { createUser, updateUserRole, deleteUser } from "./actions"
import { format } from "date-fns"

type UserRecord = {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    role: string
    job_title: string | null
    phone: string | null
    created_at: string
}

const ROLES = [
    { value: "super_admin", label: "Super Admin", description: "Full access to everything" },
    { value: "agency_admin", label: "Agency Admin", description: "Manage team, settings, all leads" },
    { value: "staff", label: "Staff", description: "Internal staff, assigned leads" },
    { value: "counsellor", label: "Counsellor", description: "Student counselling" },
    { value: "accountant", label: "Accountant", description: "Finance & invoices only" },
    { value: "hr", label: "HR", description: "HR management" },
    { value: "agent", label: "External Agent", description: "External partner, own leads only" },
]

const roleColors: Record<string, string> = {
    super_admin: "bg-red-100 text-red-700",
    agency_admin: "bg-purple-100 text-purple-700",
    staff: "bg-blue-100 text-blue-700",
    counsellor: "bg-teal-100 text-teal-700",
    accountant: "bg-amber-100 text-amber-700",
    hr: "bg-orange-100 text-orange-700",
    agent: "bg-emerald-100 text-emerald-700",
}

const emptyForm = {
    first_name: "", last_name: "", email: "",
    password: "", role: "staff", job_title: "", phone: "",
}

export default function TeamManagementPage() {
    const [users, setUsers] = useState<UserRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [currentUserId, setCurrentUserId] = useState("")
    const [currentUserRole, setCurrentUserRole] = useState("")
    const supabase = createClient()

    // Create user dialog
    const [showCreate, setShowCreate] = useState(false)
    const [form, setForm] = useState(emptyForm)
    const [showPassword, setShowPassword] = useState(false)
    const [isPending, startTransition] = useTransition()

    // Edit role dialog
    const [editUser, setEditUser] = useState<UserRecord | null>(null)
    const [editRole, setEditRole] = useState("")
    const [editJobTitle, setEditJobTitle] = useState("")

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null)

    useEffect(() => {
        fetchAll()
    }, [])

    const fetchAll = async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        setCurrentUserId(user.id)

        const { data: me } = await supabase.from("users").select("role").eq("id", user.id).single()
        setCurrentUserRole(me?.role || "")

        const { data } = await supabase
            .from("users")
            .select("id, email, first_name, last_name, role, job_title, phone, created_at")
            .not("role", "eq", "student")
            .order("created_at", { ascending: false })

        setUsers(data || [])
        setLoading(false)
    }

    const filtered = users.filter(u => {
        const query = search.toLowerCase()
        return (
            `${u.first_name} ${u.last_name} ${u.email} ${u.role}`.toLowerCase().includes(query)
        )
    })

    // ── Create User ───────────────────────────────────────────────
    const handleCreate = () => {
        if (!form.email || !form.password || !form.first_name || !form.role) {
            toast.error("Please fill all required fields")
            return
        }
        startTransition(async () => {
            const result = await createUser(form)
            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success(`User ${form.first_name} ${form.last_name} created!`)
                setShowCreate(false)
                setForm(emptyForm)
                fetchAll()
            }
        })
    }

    // ── Edit Role ─────────────────────────────────────────────────
    const openEdit = (u: UserRecord) => {
        setEditUser(u)
        setEditRole(u.role)
        setEditJobTitle(u.job_title || "")
    }

    const handleEditSave = () => {
        if (!editUser) return
        startTransition(async () => {
            const result = await updateUserRole(editUser.id, editRole, editJobTitle)
            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success("Role updated")
                setEditUser(null)
                fetchAll()
            }
        })
    }

    // ── Delete ────────────────────────────────────────────────────
    const handleDelete = () => {
        if (!deleteTarget) return
        startTransition(async () => {
            const result = await deleteUser(deleteTarget.id)
            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success("User deleted")
                setDeleteTarget(null)
                fetchAll()
            }
        })
    }

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 bg-slate-50/50 min-h-screen">
            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                        <Users className="h-6 w-6 text-primary" /> Team Management
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                        Create logins, assign roles, and manage your internal team.
                    </p>
                </div>
                <Button onClick={() => setShowCreate(true)} className="gap-2">
                    <UserPlus className="h-4 w-4" /> Create User
                </Button>
            </div>

            {/* Info banner */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                    Users you create here can log in immediately — no email confirmation needed.
                    Roles control exactly what they can see and do in the CRM.
                </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: "Total Users", value: users.length, color: "" },
                    { label: "Admins", value: users.filter(u => u.role.includes("admin")).length, color: "text-purple-600" },
                    { label: "Internal Staff", value: users.filter(u => !["agent", "super_admin", "agency_admin"].includes(u.role)).length, color: "text-blue-600" },
                    { label: "Agents", value: users.filter(u => u.role === "agent").length, color: "text-emerald-600" },
                ].map(stat => (
                    <Card key={stat.label}><CardContent className="p-4">
                        <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </CardContent></Card>
                ))}
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    className="pl-9"
                    placeholder="Search by name, email, or role..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {/* Table */}
            <Card className="shadow-sm overflow-hidden">
                <CardHeader className="py-3 border-b bg-purple-700">
                    <CardTitle className="text-sm font-bold text-white uppercase">
                        {filtered.length} team member{filtered.length !== 1 ? "s" : ""}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Job Title</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-14 text-muted-foreground">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-14 text-muted-foreground">
                                        No users found.
                                    </TableCell>
                                </TableRow>
                            ) : filtered.map(u => (
                                <TableRow key={u.id} className={u.id === currentUserId ? "bg-primary/5" : ""}>
                                    <TableCell>
                                        <div className="font-medium text-sm">
                                            {u.first_name} {u.last_name}
                                            {u.id === currentUserId && (
                                                <Badge className="ml-2 text-[10px] bg-primary/10 text-primary border-none">You</Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                                    <TableCell>
                                        <Badge className={`text-[10px] shadow-none border-none ${roleColors[u.role] || "bg-slate-100 text-slate-600"}`}>
                                            {ROLES.find(r => r.value === u.role)?.label || u.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {u.job_title || <span className="text-slate-300">—</span>}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {format(new Date(u.created_at), "MMM d, yyyy")}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                variant="ghost" size="icon" className="h-8 w-8"
                                                onClick={() => openEdit(u)}
                                                title="Edit role"
                                            >
                                                <Edit className="h-3.5 w-3.5" />
                                            </Button>
                                            {currentUserRole === "super_admin" && u.id !== currentUserId && (
                                                <Button
                                                    variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                    onClick={() => setDeleteTarget(u)}
                                                    title="Delete user"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* ── Create User Dialog ─────────────────────────────── */}
            <Dialog open={showCreate} onOpenChange={v => { if (!isPending) { setShowCreate(v); if (!v) setForm(emptyForm) } }}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserPlus className="h-5 w-5 text-primary" /> Create New User
                        </DialogTitle>
                        <DialogDescription>
                            The user will be able to log in immediately with these credentials.
                            No email confirmation required.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Name row */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-1.5">
                                <Label>First Name <span className="text-red-500">*</span></Label>
                                <Input
                                    placeholder="Jane"
                                    value={form.first_name}
                                    onChange={e => setForm({ ...form, first_name: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label>Last Name</Label>
                                <Input
                                    placeholder="Doe"
                                    value={form.last_name}
                                    onChange={e => setForm({ ...form, last_name: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="grid gap-1.5">
                            <Label>Email Address <span className="text-red-500">*</span></Label>
                            <Input
                                type="email"
                                placeholder="jane@yourcompany.com"
                                value={form.email}
                                onChange={e => setForm({ ...form, email: e.target.value })}
                            />
                        </div>

                        {/* Password */}
                        <div className="grid gap-1.5">
                            <Label>Password <span className="text-red-500">*</span></Label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Min 8 characters"
                                    value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <p className="text-xs text-muted-foreground">Share this with the user — they can change it after logging in.</p>
                        </div>

                        {/* Role */}
                        <div className="grid gap-1.5">
                            <Label>Role / Permissions <span className="text-red-500">*</span></Label>
                            <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {ROLES.map(r => (
                                        <SelectItem key={r.value} value={r.value}>
                                            <div>
                                                <span className="font-medium">{r.label}</span>
                                                <span className="text-muted-foreground ml-2 text-xs">— {r.description}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                                <Shield className="inline h-3 w-3 mr-1" />
                                {ROLES.find(r => r.value === form.role)?.description || ""}
                            </div>
                        </div>

                        {/* Job title + phone */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-1.5">
                                <Label>Job Title</Label>
                                <Input
                                    placeholder="e.g. Admissions Officer"
                                    value={form.job_title}
                                    onChange={e => setForm({ ...form, job_title: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label>Phone</Label>
                                <Input
                                    placeholder="+1 555 0100"
                                    value={form.phone}
                                    onChange={e => setForm({ ...form, phone: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setShowCreate(false); setForm(emptyForm) }} disabled={isPending}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreate} disabled={isPending} className="gap-2">
                            {isPending
                                ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</>
                                : <><CheckCircle2 className="h-4 w-4" /> Create User</>}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Edit Role Dialog ───────────────────────────────── */}
            <Dialog open={!!editUser} onOpenChange={v => { if (!v && !isPending) setEditUser(null) }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-primary" /> Edit Role
                        </DialogTitle>
                        <DialogDescription>
                            Change the role and job title for{" "}
                            <strong>{editUser?.first_name} {editUser?.last_name}</strong>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid gap-1.5">
                            <Label>Role</Label>
                            <Select value={editRole} onValueChange={setEditRole}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {ROLES.map(r => (
                                        <SelectItem key={r.value} value={r.value}>
                                            {r.label} — <span className="text-muted-foreground text-xs">{r.description}</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-1.5">
                            <Label>Job Title</Label>
                            <Input
                                placeholder="e.g. Senior Counsellor"
                                value={editJobTitle}
                                onChange={e => setEditJobTitle(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditUser(null)} disabled={isPending}>Cancel</Button>
                        <Button onClick={handleEditSave} disabled={isPending} className="gap-1.5">
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Delete Confirmation ────────────────────────────── */}
            <AlertDialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null) }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {deleteTarget?.first_name} {deleteTarget?.last_name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete their login and profile. This cannot be undone.
                            Any leads they own will remain in the system.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isPending}
                            className="bg-red-600 hover:bg-red-700 gap-1.5"
                        >
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            Delete User
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
