"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Plus, Pencil, Trash2, GitBranch, GripVertical, Check } from "lucide-react"
import { toast } from "sonner"

type Stage = {
    id: string
    name: string
    color: string
    sort_order: number
    is_default: boolean
    is_terminal: boolean
    is_active: boolean
}

const PRESET_COLORS = [
    "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b",
    "#10b981", "#06b6d4", "#3b82f6", "#ef4444",
]

const emptyForm = {
    name: "",
    color: "#6366f1",
    is_default: false,
    is_terminal: false,
}

export default function PipelineStagesPage() {
    const [stages, setStages] = useState<Stage[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingStage, setEditingStage] = useState<Stage | null>(null)
    const [form, setForm] = useState(emptyForm)
    const [saving, setSaving] = useState(false)
    const supabase = createClient()

    const loadStages = useCallback(async () => {
        setLoading(true)
        const { data } = await supabase
            .from("pipeline_stages")
            .select("*")
            .order("sort_order")
        setStages(data || [])
        setLoading(false)
    }, [])

    useEffect(() => { loadStages() }, [loadStages])

    const openCreate = () => {
        setEditingStage(null)
        setForm(emptyForm)
        setDialogOpen(true)
    }

    const openEdit = (s: Stage) => {
        setEditingStage(s)
        setForm({ name: s.name, color: s.color, is_default: s.is_default, is_terminal: s.is_terminal })
        setDialogOpen(true)
    }

    const handleSave = async () => {
        if (!form.name.trim()) return toast.error("Stage name is required")
        setSaving(true)

        if (editingStage) {
            const { error } = await supabase
                .from("pipeline_stages")
                .update({ name: form.name, color: form.color, is_default: form.is_default, is_terminal: form.is_terminal })
                .eq("id", editingStage.id)
            if (error) toast.error(error.message)
            else { toast.success("Stage updated!"); loadStages() }
        } else {
            const { data: { user } } = await supabase.auth.getUser()
            const { data: profile } = await supabase.from("users").select("agency_id").eq("id", user!.id).single()
            const { error } = await supabase.from("pipeline_stages").insert({
                name: form.name,
                color: form.color,
                is_default: form.is_default,
                is_terminal: form.is_terminal,
                is_active: true,
                agency_id: profile?.agency_id,
                sort_order: stages.length,
            })
            if (error) toast.error(error.message)
            else { toast.success("Stage created!"); loadStages() }
        }

        setSaving(false)
        setDialogOpen(false)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this stage? Any leads in this stage won't be affected.")) return
        const { error } = await supabase.from("pipeline_stages").delete().eq("id", id)
        if (error) toast.error(error.message)
        else { toast.info("Stage deleted"); loadStages() }
    }

    const toggleActive = async (s: Stage) => {
        await supabase.from("pipeline_stages").update({ is_active: !s.is_active }).eq("id", s.id)
        setStages(prev => prev.map(x => x.id === s.id ? { ...x, is_active: !x.is_active } : x))
    }

    return (
        <div className="flex-1 space-y-8 p-4 pt-6 md:p-8">
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <GitBranch className="h-7 w-7 text-primary" /> Pipeline Stages
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Define and order your lead pipeline stages. These replace the default New → Enrolled flow.
                    </p>
                </div>
                <Button onClick={openCreate} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Stage
                </Button>
            </div>

            {/* Default pipeline info */}
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                <CardContent className="p-4 text-sm">
                    <strong>Default stages:</strong> New → Contacted → Application → Offer → Visa → Enrolled.
                    Stages you add here will <strong>appear on the lead status dropdown</strong> alongside the defaults.
                    Mark a stage as <strong>Terminal</strong> (e.g. Enrolled, Rejected) to indicate a final step.
                </CardContent>
            </Card>

            {/* Stages table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-8"></TableHead>
                                <TableHead>Stage Name</TableHead>
                                <TableHead>Color</TableHead>
                                <TableHead>Default</TableHead>
                                <TableHead>Terminal</TableHead>
                                <TableHead>Active</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">Loading stages...</TableCell></TableRow>
                            ) : stages.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                    No custom stages yet. Click "Add Stage" to create your first one.
                                </TableCell></TableRow>
                            ) : stages.map(s => (
                                <TableRow key={s.id} className={!s.is_active ? "opacity-50" : ""}>
                                    <TableCell><GripVertical className="h-4 w-4 text-muted-foreground" /></TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                                            <span className="font-medium">{s.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded border" style={{ backgroundColor: s.color }} />
                                            <code className="text-xs text-muted-foreground">{s.color}</code>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {s.is_default
                                            ? <Badge className="bg-blue-100 text-blue-700 shadow-none border-none text-xs"><Check className="h-3 w-3 mr-0.5" />Default</Badge>
                                            : <span className="text-xs text-muted-foreground">—</span>}
                                    </TableCell>
                                    <TableCell>
                                        {s.is_terminal
                                            ? <Badge className="bg-emerald-100 text-emerald-700 shadow-none border-none text-xs"><Check className="h-3 w-3 mr-0.5" />Terminal</Badge>
                                            : <span className="text-xs text-muted-foreground">—</span>}
                                    </TableCell>
                                    <TableCell>
                                        <Switch checked={s.is_active} onCheckedChange={() => toggleActive(s)} />
                                    </TableCell>
                                    <TableCell className="text-right space-x-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => handleDelete(s.id)}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Create / Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingStage ? "Edit Stage" : "Add Pipeline Stage"}</DialogTitle>
                        <DialogDescription>
                            This stage will appear in the lead status dropdown for your team.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-1.5">
                            <Label>Stage Name <span className="text-red-500">*</span></Label>
                            <Input
                                placeholder="e.g. Documents Pending, Interview, Rejected..."
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label>Color</Label>
                            <div className="flex items-center gap-3">
                                <Input
                                    type="color"
                                    value={form.color}
                                    onChange={e => setForm({ ...form, color: e.target.value })}
                                    className="w-12 h-9 p-1 cursor-pointer"
                                />
                                <div className="flex gap-1.5 flex-wrap">
                                    {PRESET_COLORS.map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setForm({ ...form, color: c })}
                                            className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${form.color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                                <p className="text-sm font-medium">Default Stage</p>
                                <p className="text-xs text-muted-foreground">New leads start in this stage</p>
                            </div>
                            <Switch checked={form.is_default} onCheckedChange={v => setForm({ ...form, is_default: v })} />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                                <p className="text-sm font-medium">Terminal Stage</p>
                                <p className="text-xs text-muted-foreground">Marks end of pipeline (e.g. Enrolled, Rejected)</p>
                            </div>
                            <Switch checked={form.is_terminal} onCheckedChange={v => setForm({ ...form, is_terminal: v })} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
                            {saving ? "Saving..." : editingStage ? "Save Changes" : "Add Stage"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
