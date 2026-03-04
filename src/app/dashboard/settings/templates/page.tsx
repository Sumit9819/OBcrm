"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2, Copy, Edit3, MessageSquareText, Zap } from "lucide-react"
import { toast } from "sonner"

type Template = {
    id: string; name: string; category: string; content: string
    variables?: string[]; use_count: number; is_active: boolean; created_at: string
}

const CATEGORIES = [
    { value: 'general', label: '💬 General' },
    { value: 'whatsapp', label: '🟢 WhatsApp' },
    { value: 'email', label: '📧 Email' },
    { value: 'sms', label: '📱 SMS' },
]

const STARTER_TEMPLATES = [
    { name: 'Welcome Message', category: 'whatsapp', content: 'Hi {{name}}! 👋 Welcome to {{agency_name}}. We\'re excited to guide you towards your study abroad journey. Our counsellor {{agent_name}} will be in touch shortly.' },
    { name: 'Application Reminder', category: 'whatsapp', content: 'Hi {{name}}, this is a reminder that your application for {{course}} at {{university}} is due on {{deadline}}. Please submit your documents at your earliest convenience.' },
    { name: 'Offer Received', category: 'whatsapp', content: 'Great news, {{name}}! 🎉 You have received an offer from {{university}} for {{course}}. Please log in to your portal to review and accept your offer.' },
    { name: 'Visa Appointment', category: 'sms', content: 'Reminder: Your visa appointment is scheduled for {{date}} at {{time}}. Please bring all required documents. Contact us if you need help.' },
    { name: 'Follow Up', category: 'general', content: 'Hi {{name}}, I wanted to follow up on your application status. Could you please let me know if you have any questions or need assistance? - {{agent_name}}' },
]

function extractVars(content: string): string[] {
    const matches = content.match(/\{\{([^}]+)\}\}/g) || []
    return [...new Set(matches)]
}

export default function MessageTemplatesPage() {
    const [templates, setTemplates] = useState<Template[]>([])
    const [loading, setLoading] = useState(true)
    const [agencyId, setAgencyId] = useState("")
    const [userId, setUserId] = useState("")
    const [showDialog, setShowDialog] = useState(false)
    const [editTemplate, setEditTemplate] = useState<Template | null>(null)
    const [filterCat, setFilterCat] = useState<string>("all")

    // Form
    const [tName, setTName] = useState("")
    const [tCategory, setTCategory] = useState("general")
    const [tContent, setTContent] = useState("")
    const supabase = createClient()

    const loadTemplates = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setUserId(user.id)
        const { data: profile } = await supabase.from('users').select('agency_id').eq('id', user.id).single()
        setAgencyId(profile?.agency_id || "")
        const { data } = await supabase.from('message_templates')
            .select('*').eq('agency_id', profile?.agency_id).order('use_count', { ascending: false })
        setTemplates(data || [])
        setLoading(false)
    }, [])

    useEffect(() => { loadTemplates() }, [])

    const openCreate = () => {
        setEditTemplate(null); setTName(""); setTCategory("general"); setTContent("")
        setShowDialog(true)
    }

    const openEdit = (t: Template) => {
        setEditTemplate(t); setTName(t.name); setTCategory(t.category); setTContent(t.content)
        setShowDialog(true)
    }

    const handleSave = async () => {
        if (!tName.trim() || !tContent.trim()) { toast.error("Name and content are required"); return }
        const payload = {
            agency_id: agencyId, created_by: userId,
            name: tName.trim(), category: tCategory,
            content: tContent.trim(), variables: extractVars(tContent),
            is_active: true, updated_at: new Date().toISOString(),
        }
        if (editTemplate) {
            const { error } = await supabase.from('message_templates').update(payload).eq('id', editTemplate.id)
            if (error) { toast.error(error.message); return }
            toast.success("Template updated!")
        } else {
            const { error } = await supabase.from('message_templates').insert({ ...payload, use_count: 0 })
            if (error) { toast.error(error.message); return }
            toast.success("Template created!")
        }
        setShowDialog(false); loadTemplates()
    }

    const handleDelete = async (id: string) => {
        await supabase.from('message_templates').delete().eq('id', id)
        setTemplates(prev => prev.filter(t => t.id !== id))
        toast.success("Template deleted")
    }

    const handleCopy = (content: string) => {
        navigator.clipboard.writeText(content)
        toast.success("Copied to clipboard!")
    }

    const seedStarters = async () => {
        const { error } = await supabase.from('message_templates').insert(
            STARTER_TEMPLATES.map(t => ({ ...t, agency_id: agencyId, created_by: userId, variables: extractVars(t.content), is_active: true, use_count: 0 }))
        )
        if (error) { toast.error(error.message); return }
        toast.success("5 starter templates added!")
        loadTemplates()
    }

    const filtered = filterCat === 'all' ? templates : templates.filter(t => t.category === filterCat)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold flex items-center gap-2"><MessageSquareText className="h-5 w-5 text-primary" /> Message Templates</h3>
                    <p className="text-sm text-muted-foreground mt-1">Pre-written messages agents can use with one click — supports {`{{variables}}`}.</p>
                </div>
                <div className="flex gap-2">
                    {templates.length === 0 && <Button variant="outline" onClick={seedStarters} className="gap-2"><Zap className="h-4 w-4" /> Add Starters</Button>}
                    <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> New Template</Button>
                </div>
            </div>

            {/* Filter */}
            <div className="flex gap-2 flex-wrap">
                {[{ value: 'all', label: 'All' }, ...CATEGORIES].map(c => (
                    <button
                        key={c.value}
                        onClick={() => setFilterCat(c.value)}
                        className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${filterCat === c.value ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'}`}
                    >
                        {c.label} {c.value !== 'all' && <span className="ml-1 text-xs text-muted-foreground">({templates.filter(t => t.category === c.value).length})</span>}
                    </button>
                ))}
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40">
                                <TableHead>Name</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Preview</TableHead>
                                <TableHead>Variables</TableHead>
                                <TableHead className="text-center">Used</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Loading...</TableCell></TableRow>
                            ) : filtered.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No templates. Click "New Template" or "Add Starters".</TableCell></TableRow>
                            ) : filtered.map(t => (
                                <TableRow key={t.id} className="hover:bg-muted/20">
                                    <TableCell className="font-medium">{t.name}</TableCell>
                                    <TableCell>
                                        <Badge className="text-xs border-none shadow-none bg-muted text-muted-foreground">
                                            {CATEGORIES.find(c => c.value === t.category)?.label || t.category}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="max-w-xs">
                                        <p className="text-xs text-muted-foreground truncate">{t.content}</p>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {(t.variables || []).slice(0, 3).map(v => (
                                                <code key={v} className="text-[10px] bg-primary/10 text-primary px-1 rounded">{v}</code>
                                            ))}
                                            {(t.variables || []).length > 3 && <span className="text-[10px] text-muted-foreground">+{(t.variables || []).length - 3}</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center text-sm text-muted-foreground">{t.use_count}</TableCell>
                                    <TableCell>
                                        <div className="flex justify-end gap-1">
                                            <button onClick={() => handleCopy(t.content)} className="p-1 text-muted-foreground hover:text-foreground" title="Copy"><Copy className="h-4 w-4" /></button>
                                            <button onClick={() => openEdit(t)} className="p-1 text-muted-foreground hover:text-foreground"><Edit3 className="h-4 w-4" /></button>
                                            <button onClick={() => handleDelete(t.id)} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>{editTemplate ? 'Edit Template' : 'New Template'}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Template Name *</Label>
                                <Input placeholder="e.g. Welcome Message" value={tName} onChange={e => setTName(e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Category</Label>
                                <Select value={tCategory} onValueChange={setTCategory}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Content *</Label>
                            <Textarea
                                placeholder="Hi {{name}}, your application for {{course}} is confirmed..."
                                value={tContent} onChange={e => setTContent(e.target.value)}
                                className="min-h-[120px]"
                            />
                            <p className="text-xs text-muted-foreground">Use {`{{variable_name}}`} for dynamic placeholders.</p>
                            {tContent && extractVars(tContent).length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                    <span className="text-xs text-muted-foreground">Detected:</span>
                                    {extractVars(tContent).map(v => <code key={v} className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{v}</code>)}
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={!tName.trim() || !tContent.trim()}>
                            {editTemplate ? 'Save Changes' : 'Create Template'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
