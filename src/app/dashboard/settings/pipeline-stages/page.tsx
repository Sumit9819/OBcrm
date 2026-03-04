"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Trash2, GripVertical, GitBranch, Star } from "lucide-react"
import { toast } from "sonner"

type Stage = {
    id: string; name: string; color: string; sort_order: number
    is_active: boolean; is_default: boolean; is_terminal: boolean
}

const DEFAULT_STAGES = [
    { name: 'New', color: '#3b82f6', sort_order: 0, is_default: true, is_terminal: false },
    { name: 'Contacted', color: '#f59e0b', sort_order: 1, is_default: false, is_terminal: false },
    { name: 'Application', color: '#8b5cf6', sort_order: 2, is_default: false, is_terminal: false },
    { name: 'Offer', color: '#10b981', sort_order: 3, is_default: false, is_terminal: false },
    { name: 'Visa', color: '#6366f1', sort_order: 4, is_default: false, is_terminal: false },
    { name: 'Enrolled', color: '#14b8a6', sort_order: 5, is_default: false, is_terminal: true },
]

export default function PipelineStagesPage() {
    const [stages, setStages] = useState<Stage[]>([])
    const [loading, setLoading] = useState(true)
    const [agencyId, setAgencyId] = useState("")
    const [showDialog, setShowDialog] = useState(false)
    const [stageName, setStageName] = useState("")
    const [stageColor, setStageColor] = useState("#6366f1")
    const [isTerminal, setIsTerminal] = useState(false)
    const [seeded, setSeeded] = useState(false)

    const supabase = createClient()

    const loadStages = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: profile } = await supabase.from('users').select('agency_id').eq('id', user.id).single()
        setAgencyId(profile?.agency_id || "")
        const { data } = await supabase.from('pipeline_stages')
            .select('*').eq('agency_id', profile?.agency_id).order('sort_order')
        if (data && data.length > 0) {
            setStages(data); setSeeded(true)
        } else {
            setSeeded(false)
        }
        setLoading(false)
    }, [])

    useEffect(() => { loadStages() }, [])

    const seedDefaults = async () => {
        const { error } = await supabase.from('pipeline_stages').insert(
            DEFAULT_STAGES.map(s => ({ ...s, agency_id: agencyId, is_active: true }))
        )
        if (error) { toast.error(error.message); return }
        toast.success("Default stages created!")
        loadStages()
    }

    const handleAdd = async () => {
        if (!stageName.trim()) { toast.error("Stage name required"); return }
        const { error } = await supabase.from('pipeline_stages').insert({
            agency_id: agencyId, name: stageName.trim(), color: stageColor,
            sort_order: stages.length, is_active: true, is_default: false, is_terminal: isTerminal,
        })
        if (error) { toast.error(error.message); return }
        toast.success("Stage added!")
        setShowDialog(false); setStageName(""); setStageColor("#6366f1"); setIsTerminal(false)
        loadStages()
    }

    const handleDelete = async (id: string) => {
        await supabase.from('pipeline_stages').delete().eq('id', id)
        setStages(prev => prev.filter(s => s.id !== id))
        toast.success("Stage removed")
    }

    const setDefault = async (id: string) => {
        // Remove default from all, set on selected
        await supabase.from('pipeline_stages').update({ is_default: false }).eq('agency_id', agencyId)
        await supabase.from('pipeline_stages').update({ is_default: true }).eq('id', id)
        setStages(prev => prev.map(s => ({ ...s, is_default: s.id === id })))
        toast.success("Default stage updated")
    }

    const toggleActive = async (stage: Stage) => {
        await supabase.from('pipeline_stages').update({ is_active: !stage.is_active }).eq('id', stage.id)
        setStages(prev => prev.map(s => s.id === stage.id ? { ...s, is_active: !s.is_active } : s))
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold flex items-center gap-2"><GitBranch className="h-5 w-5 text-primary" /> Pipeline Stages</h3>
                    <p className="text-sm text-muted-foreground mt-1">Define the stages leads move through in your pipeline.</p>
                </div>
                <div className="flex gap-2">
                    {!seeded && <Button variant="outline" onClick={seedDefaults}>Use Defaults</Button>}
                    <Button onClick={() => setShowDialog(true)} className="gap-2"><Plus className="h-4 w-4" /> Add Stage</Button>
                </div>
            </div>

            <div className="space-y-3">
                {loading ? (
                    <Card><CardContent className="h-24 flex items-center justify-center text-muted-foreground">Loading...</CardContent></Card>
                ) : stages.length === 0 ? (
                    <Card><CardContent className="h-32 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                        <GitBranch className="h-8 w-8 opacity-30" />
                        <p className="text-sm">No stages yet. Click "Use Defaults" or create your own.</p>
                    </CardContent></Card>
                ) : stages.map((stage, i) => (
                    <Card key={stage.id} className={`transition-all ${!stage.is_active ? 'opacity-50' : ''}`}>
                        <CardContent className="flex items-center gap-4 py-3 px-4">
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />
                            <span className="text-sm font-medium text-muted-foreground w-5 shrink-0">{i + 1}</span>

                            {/* Color swatch + name */}
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className="h-5 w-5 rounded-full shrink-0 border-2 border-white shadow" style={{ backgroundColor: stage.color }} />
                                <span className="font-semibold">{stage.name}</span>
                                {stage.is_default && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Default</span>}
                                {stage.is_terminal && <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">Terminal</span>}
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                                <button onClick={() => setDefault(stage.id)} title="Set as default" className={`p-1 rounded ${stage.is_default ? 'text-amber-400' : 'text-muted-foreground hover:text-amber-400'}`}>
                                    <Star className="h-4 w-4" fill={stage.is_default ? 'currentColor' : 'none'} />
                                </button>
                                <Switch checked={stage.is_active} onCheckedChange={() => toggleActive(stage)} />
                                <button onClick={() => handleDelete(stage.id)} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-sm">
                    <DialogHeader><DialogTitle>Add Pipeline Stage</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label>Stage Name *</Label>
                            <Input placeholder="e.g. Interview, Waitlisted..." value={stageName} onChange={e => setStageName(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Colour</Label>
                            <div className="flex items-center gap-3">
                                <input type="color" value={stageColor} onChange={e => setStageColor(e.target.value)} className="h-10 w-16 rounded-md border cursor-pointer" />
                                <Input value={stageColor} onChange={e => setStageColor(e.target.value)} className="font-mono text-sm w-36" />
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Switch checked={isTerminal} onCheckedChange={setIsTerminal} id="terminal-toggle" />
                            <Label htmlFor="terminal-toggle" className="cursor-pointer">Mark as terminal (final/won stage)</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                        <Button onClick={handleAdd} disabled={!stageName.trim()}>Add Stage</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
