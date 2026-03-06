"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Building2, Globe, FileText, Trash2, Edit } from "lucide-react"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { savePartner, deletePartner } from "./actions"

type Partner = {
    id: string
    name: string
    country: string | null
    website: string | null
    base_commission_rate: number | null
    partner_type: string
    pipeline_id: string | null
}

type Pipeline = {
    id: string
    name: string
}

export default function PartnersPage() {
    const [partners, setPartners] = useState<Partner[]>([])
    const [pipelines, setPipelines] = useState<Pipeline[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [isAdmin, setIsAdmin] = useState(false)

    // Form state
    const [editingId, setEditingId] = useState<string | null>(null)
    const [name, setName] = useState("")
    const [country, setCountry] = useState("")
    const [website, setWebsite] = useState("")
    const [baseCommissionRate, setBaseCommissionRate] = useState("")
    const [partnerType, setPartnerType] = useState("direct")
    const [pipelineId, setPipelineId] = useState<string | "none">("none")

    const supabase = createClient()

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data: userData } = await supabase.from('users').select('agency_id, role').eq('id', user.id).single()
            if (userData) {
                setIsAdmin(userData.role === 'super_admin' || userData.role === 'agency_admin')

                const [partnersRes, pipelinesRes] = await Promise.all([
                    supabase.from('universities').select('*').eq('agency_id', userData.agency_id).order('name'),
                    supabase.from('pipelines').select('id, name').eq('agency_id', userData.agency_id).order('name')
                ])

                if (partnersRes.data) setPartners(partnersRes.data)
                if (pipelinesRes.data) setPipelines(pipelinesRes.data)
            }
        }
        setLoading(false)
    }

    const handleOpenCreate = () => {
        setEditingId(null)
        setName("")
        setCountry("")
        setWebsite("")
        setBaseCommissionRate("")
        setPartnerType("direct")
        setPipelineId("none")
        setDialogOpen(true)
    }

    const handleOpenEdit = (partner: Partner) => {
        setEditingId(partner.id)
        setName(partner.name)
        setCountry(partner.country || "")
        setWebsite(partner.website || "")
        setBaseCommissionRate(partner.base_commission_rate ? partner.base_commission_rate.toString() : "")
        setPartnerType(partner.partner_type || "direct")
        setPipelineId(partner.pipeline_id || "none")
        setDialogOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) {
            toast.error("Name is required")
            return
        }

        setSaving(true)
        const result = await savePartner({
            id: editingId || undefined,
            name,
            country,
            website,
            base_commission_rate: baseCommissionRate ? parseFloat(baseCommissionRate) : undefined,
            partner_type: partnerType,
            pipeline_id: pipelineId === "none" ? undefined : pipelineId
        })

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success(editingId ? "Partner updated successfully" : "Partner created successfully")
            setDialogOpen(false)
            loadData()
        }
        setSaving(false)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this partner?")) return
        const result = await deletePartner(id)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Partner deleted")
            loadData()
        }
    }

    const getPipelineName = (id: string | null) => {
        if (!id) return "None"
        const p = pipelines.find(x => x.id === id)
        return p ? p.name : "Unknown"
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Partners & Universities</h2>
                    <p className="text-muted-foreground">Manage your educational partners and super-agents.</p>
                </div>
                {isAdmin && (
                    <Button onClick={handleOpenCreate}>
                        <Plus className="h-4 w-4 mr-2" /> Add Partner
                    </Button>
                )}
            </div>

            <div className="rounded-xl border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Partner Name</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Associated Pipeline</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading partners...</TableCell>
                            </TableRow>
                        ) : partners.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No partners found. Add one to get started.</TableCell>
                            </TableRow>
                        ) : (
                            partners.map(partner => (
                                <TableRow key={partner.id}>
                                    <TableCell>
                                        <div className="font-medium flex items-center gap-2">
                                            <Building2 className="h-4 w-4 text-muted-foreground" />
                                            {partner.name}
                                        </div>
                                        {partner.website && (
                                            <a href={partner.website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1">
                                                <Globe className="h-3 w-3" /> {partner.website}
                                            </a>
                                        )}
                                    </TableCell>
                                    <TableCell>{partner.country || "—"}</TableCell>
                                    <TableCell>
                                        <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-muted/50">
                                            {partner.partner_type === 'super_agent' ? 'Super Agent' : 'Direct Partner'}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm text-muted-foreground">
                                            {getPipelineName(partner.pipeline_id)}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {isAdmin && (
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(partner)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(partner.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Edit Partner' : 'Add Partner'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid gap-2">
                            <Label>Partner Name *</Label>
                            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. University of Sydney" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Country</Label>
                                <Input value={country} onChange={e => setCountry(e.target.value)} placeholder="e.g. Australia" />
                            </div>
                            <div className="grid gap-2">
                                <Label>Website</Label>
                                <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." type="url" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Partner Type</Label>
                                <Select value={partnerType} onValueChange={setPartnerType}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="direct">Direct Partner (University/College)</SelectItem>
                                        <SelectItem value="super_agent">Super Agent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Base Commission Rate (%)</Label>
                                <Input value={baseCommissionRate} onChange={e => setBaseCommissionRate(e.target.value)} placeholder="e.g. 10" type="number" step="0.01" />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>Associated Pipeline</Label>
                            <Select value={pipelineId} onValueChange={setPipelineId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a pipeline..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Specific Pipeline</SelectItem>
                                    {pipelines.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">Select a pipeline if this partner follows a specific application workflow.</p>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Partner"}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
