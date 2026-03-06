"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { GitBranch, Plus, Users, Trash2, Pencil, Loader2, Building2 } from "lucide-react"
import { toast } from "sonner"

type Branch = {
    id: string
    name: string
    description: string | null
    created_at: string
    member_count?: number
}

export default function BranchesPage() {
    const [branches, setBranches] = useState<Branch[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [editBranch, setEditBranch] = useState<Branch | null>(null)
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [saving, setSaving] = useState(false)

    const supabase = createClient()

    const load = useCallback(async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase.from("users").select("role, agency_id").eq("id", user.id).single()
        if (!["super_admin", "agency_admin"].includes(profile?.role || "")) {
            window.location.href = "/dashboard"
            return
        }

        // Fetch branches with member count
        const { data: branchData } = await supabase
            .from("branches")
            .select("id, name, description, created_at")
            .eq("agency_id", profile?.agency_id)
            .order("created_at", { ascending: false })

        // Count members per branch
        if (branchData) {
            const enriched = await Promise.all(branchData.map(async b => {
                const { count } = await supabase
                    .from("users")
                    .select("*", { count: "exact", head: true })
                    .eq("branch_id", b.id)
                return { ...b, member_count: count || 0 }
            }))
            setBranches(enriched)
        }
        setLoading(false)
    }, [])

    useEffect(() => { load() }, [load])

    const openCreate = () => {
        setName("")
        setDescription("")
        setEditBranch(null)
        setShowCreate(true)
    }

    const openEdit = (b: Branch) => {
        setName(b.name)
        setDescription(b.description || "")
        setEditBranch(b)
        setShowCreate(true)
    }

    const saveBranch = async () => {
        if (!name.trim()) return
        setSaving(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { data: profile } = await supabase.from("users").select("agency_id").eq("id", user!.id).single()

            if (editBranch) {
                const { error } = await supabase.from("branches")
                    .update({ name: name.trim(), description: description.trim() || null })
                    .eq("id", editBranch.id)
                if (error) throw error
                toast.success("Branch updated!")
            } else {
                const { error } = await supabase.from("branches")
                    .insert({ name: name.trim(), description: description.trim() || null, agency_id: profile?.agency_id })
                if (error) throw error
                toast.success("Branch created!")
            }

            setShowCreate(false)
            await load()
        } catch (e: any) {
            toast.error(e.message || "Failed to save branch")
        } finally {
            setSaving(false)
        }
    }

    const deleteBranch = async (id: string) => {
        if (!confirm("Delete this branch? Members will be unlinked but not deleted.")) return
        const { error } = await supabase.from("branches").delete().eq("id", id)
        if (error) toast.error(error.message)
        else { toast.success("Branch deleted"); await load() }
    }

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 bg-slate-50/50 min-h-screen">
            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                        <GitBranch className="h-6 w-6 text-primary" /> Branches
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                        Manage office branches and assign team members to them.
                    </p>
                </div>
                <Button onClick={openCreate} className="gap-1.5">
                    <Plus className="h-4 w-4" /> New Branch
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Card><CardContent className="p-4">
                    <p className="text-2xl font-bold">{branches.length}</p>
                    <p className="text-xs text-muted-foreground">Total Branches</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                    <p className="text-2xl font-bold text-blue-600">
                        {branches.reduce((s, b) => s + (b.member_count || 0), 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Members</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                    <p className="text-2xl font-bold text-emerald-600">
                        {branches.filter(b => (b.member_count || 0) > 0).length}
                    </p>
                    <p className="text-xs text-muted-foreground">Active Branches</p>
                </CardContent></Card>
            </div>

            {/* Branches Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : branches.length === 0 ? (
                <Card>
                    <CardContent className="p-16 text-center">
                        <Building2 className="h-12 w-12 mx-auto text-muted-foreground/20 mb-3" />
                        <p className="text-muted-foreground font-medium">No branches yet</p>
                        <p className="text-sm text-muted-foreground mt-1">Create your first branch to organise your team.</p>
                        <Button className="mt-4 gap-1.5" onClick={openCreate}>
                            <Plus className="h-4 w-4" /> Create Branch
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {branches.map(b => (
                        <Card key={b.id} className="hover:border-primary/40 transition-colors group">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <GitBranch className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base">{b.name}</CardTitle>
                                            {b.description && (
                                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{b.description}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(b)}>
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => deleteBranch(b.id)}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="gap-1 text-xs">
                                        <Users className="h-3 w-3" /> {b.member_count} member{b.member_count !== 1 ? "s" : ""}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create / Edit Dialog */}
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{editBranch ? "Edit Branch" : "Create Branch"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1.5">
                            <Label>Branch Name *</Label>
                            <Input placeholder="e.g. Kathmandu Head Office" value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Description</Label>
                            <Textarea placeholder="Optional description..." value={description} onChange={e => setDescription(e.target.value)} rows={2} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                        <Button onClick={saveBranch} disabled={saving || !name.trim()}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {editBranch ? "Save Changes" : "Create Branch"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
