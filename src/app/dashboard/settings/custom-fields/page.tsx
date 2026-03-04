"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2, GripVertical, Edit3, ListFilter } from "lucide-react"
import { toast } from "sonner"

type CustomField = {
    id: string; field_label: string; field_key: string; field_type: string
    options?: string[]; is_required: boolean; is_active: boolean; sort_order: number
}

const FIELD_TYPES = [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
    { value: 'select', label: 'Dropdown (Select)' },
    { value: 'boolean', label: 'Yes / No (Toggle)' },
]

export default function CustomFieldsPage() {
    const [fields, setFields] = useState<CustomField[]>([])
    const [loading, setLoading] = useState(true)
    const [showDialog, setShowDialog] = useState(false)
    const [editField, setEditField] = useState<CustomField | null>(null)
    const [agencyId, setAgencyId] = useState("")

    // Form
    const [fieldName, setFieldName] = useState("")
    const [fieldType, setFieldType] = useState("text")
    const [isRequired, setIsRequired] = useState(false)
    const [optionsRaw, setOptionsRaw] = useState("") // comma-separated for select

    const supabase = createClient()

    const loadFields = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: profile } = await supabase.from('users').select('agency_id').eq('id', user.id).single()
        setAgencyId(profile?.agency_id || "")
        const { data } = await supabase.from('custom_fields')
            .select('*').eq('agency_id', profile?.agency_id).order('sort_order')
        setFields(data || [])
        setLoading(false)
    }, [])

    useEffect(() => { loadFields() }, [])

    const toKey = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/__+/g, '_')

    const openCreate = () => {
        setEditField(null); setFieldName(""); setFieldType("text"); setIsRequired(false); setOptionsRaw("")
        setShowDialog(true)
    }

    const openEdit = (f: CustomField) => {
        setEditField(f); setFieldName(f.field_label); setFieldType(f.field_type)
        setIsRequired(f.is_required); setOptionsRaw((f.options || []).join(', '))
        setShowDialog(true)
    }

    const handleSave = async () => {
        if (!fieldName.trim()) { toast.error("Field name is required"); return }
        const payload: any = {
            agency_id: agencyId,
            field_label: fieldName.trim(),
            field_key: toKey(fieldName.trim()),
            field_type: fieldType,
            is_required: isRequired,
            is_active: true,
            options: fieldType === 'select' ? optionsRaw.split(',').map(o => o.trim()).filter(Boolean) : null,
            sort_order: editField?.sort_order ?? fields.length,
        }
        if (editField) {
            const { error } = await supabase.from('custom_fields').update(payload).eq('id', editField.id)
            if (error) { toast.error(error.message); return }
            toast.success("Field updated")
        } else {
            const { error } = await supabase.from('custom_fields').insert(payload)
            if (error) { toast.error(error.message); return }
            toast.success("Custom field created!")
        }
        setShowDialog(false)
        loadFields()
    }

    const toggleActive = async (field: CustomField) => {
        await supabase.from('custom_fields').update({ is_active: !field.is_active }).eq('id', field.id)
        setFields(prev => prev.map(f => f.id === field.id ? { ...f, is_active: !f.is_active } : f))
    }

    const handleDelete = async (id: string) => {
        await supabase.from('custom_fields').delete().eq('id', id)
        setFields(prev => prev.filter(f => f.id !== id))
        toast.success("Field deleted")
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold flex items-center gap-2"><ListFilter className="h-5 w-5 text-primary" /> Custom Lead Fields</h3>
                    <p className="text-sm text-muted-foreground mt-1">Add extra fields to the lead form — these appear on every lead profile.</p>
                </div>
                <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Add Field</Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40">
                                <TableHead className="w-8"></TableHead>
                                <TableHead>Label</TableHead>
                                <TableHead>Key</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Required</TableHead>
                                <TableHead>Active</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Loading...</TableCell></TableRow>
                            ) : fields.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No custom fields yet. Click "Add Field" to create one.</TableCell></TableRow>
                            ) : fields.map(f => (
                                <TableRow key={f.id} className={`hover:bg-muted/20 ${!f.is_active ? 'opacity-50' : ''}`}>
                                    <TableCell><GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" /></TableCell>
                                    <TableCell className="font-medium">{f.field_label}</TableCell>
                                    <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{f.field_key}</code></TableCell>
                                    <TableCell>
                                        <Badge className="text-xs border-none shadow-none bg-primary/10 text-primary capitalize">{f.field_type}</Badge>
                                    </TableCell>
                                    <TableCell>{f.is_required ? <Badge className="bg-red-50 text-red-600 border-none shadow-none text-xs">Required</Badge> : <span className="text-xs text-muted-foreground">Optional</span>}</TableCell>
                                    <TableCell><Switch checked={f.is_active} onCheckedChange={() => toggleActive(f)} /></TableCell>
                                    <TableCell>
                                        <div className="flex justify-end gap-1">
                                            <button onClick={() => openEdit(f)} className="p-1 text-muted-foreground hover:text-foreground"><Edit3 className="h-4 w-4" /></button>
                                            <button onClick={() => handleDelete(f.id)} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {fields.length > 0 && (
                <p className="text-xs text-muted-foreground">
                    These fields will appear in the "Custom Fields" section on every lead profile. Values are stored per-lead.
                </p>
            )}

            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>{editField ? 'Edit Field' : 'New Custom Field'}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label>Field Label *</Label>
                            <Input placeholder="e.g. Preferred University" value={fieldName} onChange={e => setFieldName(e.target.value)} />
                            {fieldName && <p className="text-xs text-muted-foreground">Key: <code className="bg-muted px-1 rounded">{toKey(fieldName)}</code></p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label>Field Type</Label>
                            <Select value={fieldType} onValueChange={setFieldType}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {FIELD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        {fieldType === 'select' && (
                            <div className="space-y-1.5">
                                <Label>Options (comma-separated)</Label>
                                <Input placeholder="Option A, Option B, Option C" value={optionsRaw} onChange={e => setOptionsRaw(e.target.value)} />
                            </div>
                        )}
                        <div className="flex items-center gap-3">
                            <Switch checked={isRequired} onCheckedChange={setIsRequired} id="required-toggle" />
                            <Label htmlFor="required-toggle" className="cursor-pointer">Make this field required</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                        <Button onClick={handleSave}>{editField ? 'Save Changes' : 'Create Field'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
