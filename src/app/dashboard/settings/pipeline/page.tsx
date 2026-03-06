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
import { Plus, Pencil, Trash2, GitBranch, GripVertical, Check, FileText } from "lucide-react"
import { toast } from "sonner"

type Pipeline = {
    id: string
    agency_id: string
    name: string
    country: string | null
    is_default: boolean
}

type Stage = {
    id: string
    pipeline_id: string
    name: string
    color: string
    sort_order: number
    is_default: boolean
    is_terminal: boolean
    is_active: boolean
}

type DocumentTemplate = {
    id: string
    agency_id: string
    name: string
    description: string | null
    pipeline_id: string | null
    stage_id: string
    is_mandatory: boolean
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
    const [pipelines, setPipelines] = useState<Pipeline[]>([])
    const [selectedPipelineId, setSelectedPipelineId] = useState<string | "all">("all")
    const [stages, setStages] = useState<Stage[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [pipelineDialogOpen, setPipelineDialogOpen] = useState(false)
    const [editingStage, setEditingStage] = useState<Stage | null>(null)
    const [form, setForm] = useState(emptyForm)
    const [pipelineForm, setPipelineForm] = useState({ name: "", country: "", is_default: false })
    const [saving, setSaving] = useState(false)
    const [documentDialogOpen, setDocumentDialogOpen] = useState(false)
    const [selectedStageForDocs, setSelectedStageForDocs] = useState<Stage | null>(null)
    const supabase = createClient()

    const loadData = useCallback(async () => {
        setLoading(true)
        const { data: pData } = await supabase.from("pipelines").select("*").order("created_at", { ascending: true })
        setPipelines(pData || [])

        let query = supabase.from("pipeline_stages").select("*").order("sort_order")
        if (selectedPipelineId !== "all") {
            query = query.eq("pipeline_id", selectedPipelineId)
        }
        const { data: sData } = await query
        setStages(sData || [])
        setLoading(false)
    }, [selectedPipelineId])

    useEffect(() => { loadData() }, [loadData])

    const openCreate = () => {
        if (selectedPipelineId === "all" && pipelines.length > 0) {
            toast.error("Please select a specific pipeline to add a stage to.")
            return
        }
        setEditingStage(null)
        setForm(emptyForm)
        setDialogOpen(true)
    }

    const openEdit = (s: Stage) => {
        setEditingStage(s)
        setForm({ name: s.name, color: s.color, is_default: s.is_default, is_terminal: s.is_terminal })
        setDialogOpen(true)
    }

    const openDocuments = (s: Stage) => {
        setSelectedStageForDocs(s)
        setDocumentDialogOpen(true)
    }

    const handleSaveStage = async () => {
        if (!form.name.trim()) return toast.error("Stage name is required")
        if (selectedPipelineId === "all" && !editingStage) return toast.error("Select a pipeline first")

        setSaving(true)

        if (editingStage) {
            const { error } = await supabase
                .from("pipeline_stages")
                .update({ name: form.name, color: form.color, is_default: form.is_default, is_terminal: form.is_terminal })
                .eq("id", editingStage.id)
            if (error) toast.error(error.message)
            else { toast.success("Stage updated!"); loadData() }
        } else {
            const { data: { user } } = await supabase.auth.getUser()
            const { data: profile } = await supabase.from("users").select("agency_id").eq("id", user!.id).single()
            const { error } = await supabase.from("pipeline_stages").insert({
                name: form.name,
                color: form.color,
                is_default: form.is_default,
                is_terminal: form.is_terminal,
                is_active: true,
                pipeline_id: selectedPipelineId,
                agency_id: profile?.agency_id,
                sort_order: stages.filter(s => s.pipeline_id === selectedPipelineId).length,
            })
            if (error) toast.error(error.message)
            else { toast.success("Stage created!"); loadData() }
        }

        setSaving(false)
        setDialogOpen(false)
    }

    const handleSavePipeline = async () => {
        if (!pipelineForm.name.trim()) return toast.error("Pipeline name is required")
        setSaving(true)

        const { data: { user } } = await supabase.auth.getUser()
        const { data: profile } = await supabase.from("users").select("agency_id").eq("id", user!.id).single()

        if (pipelineForm.is_default) {
            await supabase.from("pipelines").update({ is_default: false }).eq("agency_id", profile?.agency_id)
        }

        const { error, data } = await supabase.from("pipelines").insert({
            name: pipelineForm.name,
            country: pipelineForm.country || null,
            is_default: pipelines.length === 0 ? true : pipelineForm.is_default,
            agency_id: profile?.agency_id,
        }).select().single()

        if (error) toast.error(error.message)
        else {
            toast.success("Pipeline created!")
            setSelectedPipelineId(data.id)
            loadData()
        }

        setSaving(false)
        setPipelineDialogOpen(false)
        setPipelineForm({ name: "", country: "", is_default: false })
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this stage? Any leads in this stage won't be affected.")) return
        const { error } = await supabase.from("pipeline_stages").delete().eq("id", id)
        if (error) toast.error(error.message)
        else { toast.info("Stage deleted"); loadData() }
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
                        <GitBranch className="h-7 w-7 text-primary" /> Pipelines & Stages
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Configure different pipelines for different countries/services and their stages.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setPipelineDialogOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" /> New Pipeline
                    </Button>
                    <Button onClick={openCreate} className="gap-2">
                        <Plus className="h-4 w-4" /> Add Stage
                    </Button>
                </div>
            </div>

            <div className="flex gap-2 pb-2 overflow-x-auto border-b">
                <Button
                    variant={selectedPipelineId === "all" ? "default" : "ghost"}
                    onClick={() => setSelectedPipelineId("all")}
                    className="rounded-full"
                >
                    All Stages
                </Button>
                {pipelines.map(p => (
                    <Button
                        key={p.id}
                        variant={selectedPipelineId === p.id ? "default" : "ghost"}
                        onClick={() => setSelectedPipelineId(p.id)}
                        className="rounded-full"
                    >
                        {p.name} {p.is_default && <Badge variant="secondary" className="ml-2 text-[10px]">Default</Badge>}
                        {p.country && <span className="ml-2 text-xs opacity-70">({p.country})</span>}
                    </Button>
                ))}
            </div>

            {/* Stages table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-8"></TableHead>
                                <TableHead>Stage Name</TableHead>
                                {selectedPipelineId === "all" && <TableHead>Pipeline</TableHead>}
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
                                    {selectedPipelineId === "all" && (
                                        <TableCell>
                                            <Badge variant="outline" className="text-muted-foreground font-normal">
                                                {pipelines.find(p => p.id === s.pipeline_id)?.name || 'Unknown'}
                                            </Badge>
                                        </TableCell>
                                    )}
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
                                        <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={() => openDocuments(s)}>
                                            <FileText className="h-3.5 w-3.5" /> Docs
                                        </Button>
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
                        <Button onClick={handleSaveStage} disabled={saving || !form.name.trim()}>
                            {saving ? "Saving..." : editingStage ? "Save Changes" : "Add Stage"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Pipeline Dialog */}
            <Dialog open={pipelineDialogOpen} onOpenChange={setPipelineDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create New Pipeline</DialogTitle>
                        <DialogDescription>
                            Pipelines allow you to define different stages for different destinations or services.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-1.5">
                            <Label>Pipeline Name <span className="text-red-500">*</span></Label>
                            <Input
                                placeholder="e.g. UK Visa Application, IELTS Coaching..."
                                value={pipelineForm.name}
                                onChange={e => setPipelineForm({ ...pipelineForm, name: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label>Target Country (Optional)</Label>
                            <Input
                                placeholder="e.g. UK, Australia, Canada"
                                value={pipelineForm.country}
                                onChange={e => setPipelineForm({ ...pipelineForm, country: e.target.value })}
                            />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                                <p className="text-sm font-medium">Set as Default</p>
                                <p className="text-xs text-muted-foreground">New leads will use this pipeline by default</p>
                            </div>
                            <Switch checked={pipelineForm.is_default} onCheckedChange={v => setPipelineForm({ ...pipelineForm, is_default: v })} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPipelineDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSavePipeline} disabled={saving || !pipelineForm.name.trim()}>
                            {saving ? "Saving..." : "Create Pipeline"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <DocumentTemplatesDialog
                stage={selectedStageForDocs}
                open={documentDialogOpen}
                onOpenChange={setDocumentDialogOpen}
            />
        </div>
    )
}

function DocumentTemplatesDialog({
    stage,
    open,
    onOpenChange
}: {
    stage: Stage | null,
    open: boolean,
    onOpenChange: (o: boolean) => void
}) {
    const [templates, setTemplates] = useState<DocumentTemplate[]>([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({ name: "", description: "", is_mandatory: false })
    const supabase = createClient()

    const loadTemplates = useCallback(async () => {
        if (!stage) return
        setLoading(true)
        const { data } = await supabase
            .from("document_templates")
            .select("*")
            .eq("stage_id", stage.id)
            .order("created_at")
        setTemplates(data || [])
        setLoading(false)
    }, [stage, supabase])

    useEffect(() => {
        if (stage && open) {
            loadTemplates()
        }
    }, [stage, open, loadTemplates])

    const handleAdd = async () => {
        if (!stage) return
        if (!form.name.trim()) return toast.error("Name is required")
        setSaving(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { data: profile } = await supabase.from("users").select("agency_id").eq("id", user!.id).single()

            const { error } = await supabase.from("document_templates").insert({
                name: form.name,
                description: form.description || null,
                is_mandatory: form.is_mandatory,
                stage_id: stage.id,
                pipeline_id: stage.pipeline_id,
                agency_id: profile?.agency_id
            })

            if (error) throw error

            toast.success("Document template added")
            setForm({ name: "", description: "", is_mandatory: false })
            loadTemplates()
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Remove this document template?")) return
        const { error } = await supabase.from("document_templates").delete().eq("id", id)
        if (error) toast.error(error.message)
        else {
            toast.info("Template removed")
            loadTemplates()
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Document Requirements {stage ? `for ${stage.name}` : ''}</DialogTitle>
                    <DialogDescription>
                        Define which documents must be collected when a lead enters this stage.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="font-medium mb-3 text-sm">Add New Document</h4>
                        <div className="space-y-3">
                            <div>
                                <Label>Document Name</Label>
                                <Input placeholder="e.g. Passport Copy" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div>
                                <Label>Description (Optional)</Label>
                                <Input placeholder="e.g. Must be valid for 6 months" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                            </div>
                            <div className="flex items-center justify-between border rounded p-2">
                                <Label className="cursor-pointer font-normal text-sm">Mandatory for this stage?</Label>
                                <Switch checked={form.is_mandatory} onCheckedChange={v => setForm({ ...form, is_mandatory: v })} />
                            </div>
                            <Button className="w-full" disabled={saving || !form.name.trim()} onClick={handleAdd}>
                                {saving ? "Adding..." : "Add Document"}
                            </Button>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-medium mb-3 text-sm">Required Documents ({templates.length})</h4>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                            {loading ? (
                                <p className="text-sm text-muted-foreground">Loading...</p>
                            ) : templates.length === 0 ? (
                                <p className="text-sm text-muted-foreground bg-muted/50 rounded p-4 text-center border border-dashed">No documents required for this stage.</p>
                            ) : templates.map(t => (
                                <div key={t.id} className="flex flex-col gap-1 p-3 border rounded-md relative group">
                                    <div className="flex justify-between items-start">
                                        <p className="font-medium text-sm pr-6 flex-1">
                                            {t.name}
                                            {t.is_mandatory && <Badge variant="secondary" className="ml-2 text-[10px]">Required</Badge>}
                                        </p>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-500 transition-opacity" onClick={() => handleDelete(t.id)}>
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
