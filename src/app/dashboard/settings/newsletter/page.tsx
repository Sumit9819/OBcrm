"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Mail, Plus, Pencil, Trash2, Eye, Copy, FileText } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

type NewsletterTemplate = {
    id: string; name: string; subject: string; body: string
    category: string; status: string; created_at: string; updated_at: string
}

const categoryColors: Record<string, string> = {
    welcome: "bg-emerald-100 text-emerald-700",
    followup: "bg-blue-100 text-blue-700",
    promotion: "bg-purple-100 text-purple-700",
    update: "bg-amber-100 text-amber-700",
    newsletter: "bg-rose-100 text-rose-700",
}

const DEFAULT_TEMPLATES = [
    {
        name: "Welcome Email",
        subject: "Welcome to {{agency_name}}! 🎉",
        body: `Dear {{student_name}},\n\nWelcome to {{agency_name}}! We're thrilled to have you on board.\n\nOur team is dedicated to helping you achieve your study abroad dreams. Your counselor {{counselor_name}} will be in touch shortly to discuss your goals.\n\nBest regards,\n{{agency_name}} Team`,
        category: "welcome", status: "active",
    },
    {
        name: "Follow-up After Consultation",
        subject: "Next Steps for Your Application — {{agency_name}}",
        body: `Dear {{student_name}},\n\nThank you for meeting with us today. As discussed, here are your next steps:\n\n1. Prepare the required documents\n2. Complete the application form\n3. Book your English test\n\nPlease don't hesitate to reach out if you have any questions.\n\nWarm regards,\n{{counselor_name}}\n{{agency_name}}`,
        category: "followup", status: "active",
    },
]

export default function NewsletterTemplatePage() {
    const [templates, setTemplates] = useState<NewsletterTemplate[]>([])
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)
    const [preview, setPreview] = useState<NewsletterTemplate | null>(null)
    const [editTpl, setEditTpl] = useState<NewsletterTemplate | null>(null)
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({ name: "", subject: "", body: "", category: "newsletter", status: "draft" })

    const supabase = createClient()

    const load = useCallback(async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
            .from('users').select('id, role, agency_id').eq('id', user.id).single()
        setCurrentUser(profile)

        const { data, count } = await supabase
            .from('newsletter_templates')
            .select('*', { count: 'exact' })
            .eq('agency_id', profile?.agency_id)
            .order('created_at', { ascending: false })

        if (count === 0 && DEFAULT_TEMPLATES.length > 0) {
            // Seed default templates on first load
            await supabase.from('newsletter_templates').insert(
                DEFAULT_TEMPLATES.map(t => ({ ...t, agency_id: profile?.agency_id, created_by: user.id }))
            )
            const { data: fresh } = await supabase.from('newsletter_templates').select('*').eq('agency_id', profile?.agency_id).order('created_at', { ascending: false })
            setTemplates(fresh || [])
        } else {
            setTemplates(data || [])
        }
        setLoading(false)
    }, [])

    useEffect(() => { load() }, [])

    const openAdd = () => {
        setEditTpl(null)
        setForm({ name: "", subject: "", body: "", category: "newsletter", status: "draft" })
        setOpen(true)
    }

    const openEdit = (tpl: NewsletterTemplate) => {
        setEditTpl(tpl)
        setForm({ name: tpl.name, subject: tpl.subject, body: tpl.body, category: tpl.category, status: tpl.status })
        setOpen(true)
    }

    const submit = async () => {
        if (!form.name || !form.subject || !form.body) { toast.error("Name, subject, and body are required"); return }
        setSaving(true)

        if (editTpl) {
            const { error } = await supabase.from('newsletter_templates')
                .update({ ...form, updated_at: new Date().toISOString() })
                .eq('id', editTpl.id)
            if (error) toast.error("Failed: " + error.message)
            else { toast.success("Template updated!"); load() }
        } else {
            const { error } = await supabase.from('newsletter_templates').insert({
                agency_id: currentUser?.agency_id,
                created_by: currentUser?.id,
                ...form,
            })
            if (error) toast.error("Failed: " + error.message)
            else { toast.success("Template created!"); load() }
        }
        setOpen(false)
        setSaving(false)
    }

    const duplicate = async (tpl: NewsletterTemplate) => {
        await supabase.from('newsletter_templates').insert({
            agency_id: currentUser?.agency_id,
            created_by: currentUser?.id,
            name: `${tpl.name} (Copy)`,
            subject: tpl.subject,
            body: tpl.body,
            category: tpl.category,
            status: 'draft',
        })
        toast.success("Duplicated!")
        load()
    }

    const deleteTemplate = async (id: string) => {
        await supabase.from('newsletter_templates').delete().eq('id', id)
        setTemplates(prev => prev.filter(t => t.id !== id))
        toast.info("Deleted")
    }

    const toggleStatus = async (tpl: NewsletterTemplate) => {
        const newStatus = tpl.status === "active" ? "draft" : "active"
        await supabase.from('newsletter_templates').update({ status: newStatus }).eq('id', tpl.id)
        setTemplates(prev => prev.map(t => t.id === tpl.id ? { ...t, status: newStatus } : t))
    }

    const activeCount = templates.filter(t => t.status === "active").length

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 bg-slate-50/50 min-h-screen">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                        <Mail className="h-6 w-6 text-primary" /> Newsletter Templates
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">Create and manage reusable email templates.</p>
                </div>
                <Button onClick={openAdd} className="gap-2">
                    <Plus className="h-4 w-4" /> New Template
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <Card><CardContent className="p-4"><p className="text-2xl font-bold">{templates.length}</p><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-2xl font-bold text-emerald-600">{activeCount}</p><p className="text-xs text-muted-foreground">Active</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-2xl font-bold text-slate-400">{templates.length - activeCount}</p><p className="text-xs text-muted-foreground">Drafts</p></CardContent></Card>
            </div>

            {/* Variables Reference */}
            <Card className="shadow-sm border-amber-200 bg-amber-50">
                <CardContent className="p-4">
                    <p className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4" /> Available Template Variables
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {["{{student_name}}", "{{agency_name}}", "{{counselor_name}}", "{{course_name}}", "{{university}}", "{{intake_date}}"].map(v => (
                            <code key={v} className="text-xs bg-white border border-amber-300 text-amber-800 px-2 py-0.5 rounded">{v}</code>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Templates Grid */}
            {loading ? (
                <div className="py-16 text-center text-muted-foreground text-sm">Loading templates...</div>
            ) : (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {templates.map(tpl => (
                        <Card key={tpl.id} className="shadow-sm hover:shadow-md transition-all group">
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <h3 className="font-semibold truncate">{tpl.name}</h3>
                                        <p className="text-xs text-muted-foreground truncate mt-0.5">{tpl.subject}</p>
                                    </div>
                                    <Badge className={`text-[10px] capitalize border-none shadow-none ${categoryColors[tpl.category] || ''}`}>{tpl.category}</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="bg-slate-50 rounded-lg p-3 mb-3 h-20 overflow-hidden relative">
                                    <p className="text-xs text-muted-foreground whitespace-pre-line">{tpl.body}</p>
                                    <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-slate-50 to-transparent" />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => toggleStatus(tpl)} className={`text-xs font-medium px-2 py-0.5 rounded-full transition-colors ${tpl.status === "active" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                                            {tpl.status === "active" ? "● Active" : "○ Draft"}
                                        </button>
                                        <span className="text-[10px] text-muted-foreground">{format(new Date(tpl.updated_at), "MMM dd")}</span>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setPreview(tpl)} className="text-blue-500 hover:text-blue-700 p-1"><Eye className="h-4 w-4" /></button>
                                        <button onClick={() => duplicate(tpl)} className="text-slate-500 hover:text-slate-700 p-1"><Copy className="h-4 w-4" /></button>
                                        <button onClick={() => openEdit(tpl)} className="text-amber-500 hover:text-amber-700 p-1"><Pencil className="h-4 w-4" /></button>
                                        <button onClick={() => deleteTemplate(tpl.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="h-4 w-4" /></button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create / Edit Dialog */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle>{editTpl ? "Edit Template" : "New Email Template"}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Template Name *</Label>
                                <Input placeholder="e.g. Welcome Email" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Category</Label>
                                <select className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                    <option value="welcome">Welcome</option>
                                    <option value="followup">Follow-up</option>
                                    <option value="promotion">Promotion</option>
                                    <option value="update">Update</option>
                                    <option value="newsletter">Newsletter</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Subject Line *</Label>
                            <Input placeholder="Email subject... (use {{variables}})" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Email Body *</Label>
                            <Textarea placeholder="Write your email body... Use {{student_name}}, {{agency_name}} etc." value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} className="resize-none h-48 font-mono text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Status</Label>
                            <div className="flex gap-2">
                                <Button type="button" variant={form.status === "draft" ? "default" : "outline"} size="sm" onClick={() => setForm({ ...form, status: "draft" })}>Draft</Button>
                                <Button type="button" variant={form.status === "active" ? "default" : "outline"} size="sm" onClick={() => setForm({ ...form, status: "active" })}>Active</Button>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button onClick={submit} disabled={saving}>{saving ? "Saving..." : editTpl ? "Update Template" : "Create Template"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Preview Dialog */}
            {preview && (
                <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader><DialogTitle className="flex items-center gap-2"><Eye className="h-4 w-4" /> Preview: {preview.name}</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-2">
                            <div className="bg-slate-50 border rounded-lg p-4">
                                <p className="text-xs text-muted-foreground mb-1">Subject:</p>
                                <p className="font-semibold">{preview.subject}</p>
                            </div>
                            <div className="bg-white border rounded-lg p-4 min-h-[200px]">
                                <p className="text-sm whitespace-pre-line">{preview.body}</p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setPreview(null)}>Close</Button>
                            <Button onClick={() => { setPreview(null); openEdit(preview) }}>Edit Template</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    )
}
