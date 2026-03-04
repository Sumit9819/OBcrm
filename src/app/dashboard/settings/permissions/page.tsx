"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck, Save } from "lucide-react"
import { toast } from "sonner"

const ROLES = [
    { key: 'agent', label: 'Agent', color: 'bg-emerald-100 text-emerald-700' },
    { key: 'accountant', label: 'Accountant', color: 'bg-amber-100 text-amber-700' },
    { key: 'agency_admin', label: 'Agency Admin', color: 'bg-blue-100 text-blue-700' },
]

const PERMISSION_GROUPS = [
    {
        group: 'Leads',
        permissions: [
            { key: 'leads.view', label: 'View leads' },
            { key: 'leads.create', label: 'Create leads' },
            { key: 'leads.edit', label: 'Edit leads' },
            { key: 'leads.delete', label: 'Delete leads' },
            { key: 'leads.assign', label: 'Assign leads to agents' },
            { key: 'leads.export', label: 'Export leads to CSV' },
        ]
    },
    {
        group: 'Finances',
        permissions: [
            { key: 'finances.view', label: 'View invoices & cash' },
            { key: 'finances.create', label: 'Create invoices' },
            { key: 'finances.cash', label: 'Record cash received' },
        ]
    },
    {
        group: 'Reports',
        permissions: [
            { key: 'reports.view', label: 'View reports & analytics' },
            { key: 'reports.export', label: 'Export CSV reports' },
        ]
    },
    {
        group: 'Documents',
        permissions: [
            { key: 'documents.view', label: 'View documents' },
            { key: 'documents.upload', label: 'Upload documents' },
            { key: 'documents.delete', label: 'Delete documents' },
        ]
    },
    {
        group: 'HR & Attendance',
        permissions: [
            { key: 'attendance.view', label: 'View attendance' },
            { key: 'attendance.edit', label: 'Edit attendance records' },
            { key: 'leave.approve', label: 'Approve/reject leave requests' },
        ]
    },
    {
        group: 'Users & Settings',
        permissions: [
            { key: 'users.view', label: 'View team members' },
            { key: 'users.manage', label: 'Add/remove users' },
            { key: 'settings.branding', label: 'Change agency branding' },
            { key: 'settings.pipeline', label: 'Edit pipeline stages' },
        ]
    },
]

const DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
    agent: {
        'leads.view': true, 'leads.create': true, 'leads.edit': true, 'leads.delete': false,
        'leads.assign': false, 'leads.export': false,
        'finances.view': false, 'finances.create': false, 'finances.cash': false,
        'reports.view': false, 'reports.export': false,
        'documents.view': true, 'documents.upload': true, 'documents.delete': false,
        'attendance.view': true, 'attendance.edit': false, 'leave.approve': false,
        'users.view': true, 'users.manage': false, 'settings.branding': false, 'settings.pipeline': false,
    },
    accountant: {
        'leads.view': true, 'leads.create': false, 'leads.edit': false, 'leads.delete': false,
        'leads.assign': false, 'leads.export': true,
        'finances.view': true, 'finances.create': true, 'finances.cash': true,
        'reports.view': true, 'reports.export': true,
        'documents.view': true, 'documents.upload': false, 'documents.delete': false,
        'attendance.view': true, 'attendance.edit': false, 'leave.approve': false,
        'users.view': true, 'users.manage': false, 'settings.branding': false, 'settings.pipeline': false,
    },
    agency_admin: {
        'leads.view': true, 'leads.create': true, 'leads.edit': true, 'leads.delete': true,
        'leads.assign': true, 'leads.export': true,
        'finances.view': true, 'finances.create': true, 'finances.cash': true,
        'reports.view': true, 'reports.export': true,
        'documents.view': true, 'documents.upload': true, 'documents.delete': true,
        'attendance.view': true, 'attendance.edit': true, 'leave.approve': true,
        'users.view': true, 'users.manage': true, 'settings.branding': true, 'settings.pipeline': true,
    },
}

export default function RolePermissionsPage() {
    const [activeRole, setActiveRole] = useState('agent')
    const [perms, setPerms] = useState<Record<string, Record<string, boolean>>>(DEFAULT_PERMISSIONS)
    const [agencyId, setAgencyId] = useState("")
    const [saving, setSaving] = useState(false)

    const supabase = createClient()

    const load = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: profile } = await supabase.from('users').select('agency_id').eq('id', user.id).single()
        setAgencyId(profile?.agency_id || "")

        const { data: rows } = await supabase.from('role_permissions')
            .select('role, permissions').eq('agency_id', profile?.agency_id)

        if (rows && rows.length > 0) {
            const loaded: Record<string, Record<string, boolean>> = { ...DEFAULT_PERMISSIONS }
            rows.forEach(r => { loaded[r.role] = r.permissions })
            setPerms(loaded)
        }
    }, [])

    useEffect(() => { load() }, [])

    const toggle = (perm: string) => {
        setPerms(prev => ({
            ...prev,
            [activeRole]: { ...prev[activeRole], [perm]: !prev[activeRole]?.[perm] }
        }))
    }

    const handleSave = async () => {
        setSaving(true)
        const { error } = await supabase.from('role_permissions').upsert(
            { agency_id: agencyId, role: activeRole, permissions: perms[activeRole], updated_at: new Date().toISOString() },
            { onConflict: 'agency_id,role' }
        )
        if (error) toast.error(error.message)
        else toast.success(`${ROLES.find(r => r.key === activeRole)?.label} permissions saved!`)
        setSaving(false)
    }

    const resetRole = () => {
        setPerms(prev => ({ ...prev, [activeRole]: DEFAULT_PERMISSIONS[activeRole] }))
        toast.success("Reset to defaults (not saved yet)")
    }

    const currentPerms = perms[activeRole] || {}
    const enabledCount = Object.values(currentPerms).filter(Boolean).length
    const totalCount = PERMISSION_GROUPS.flatMap(g => g.permissions).length

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Role Permissions</h3>
                    <p className="text-sm text-muted-foreground mt-1">Control what each role can see and do. Super Admin always has full access.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={resetRole}>Reset Defaults</Button>
                    <Button onClick={handleSave} disabled={saving} className="gap-2">
                        <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Permissions"}
                    </Button>
                </div>
            </div>

            {/* Role tabs */}
            <div className="flex gap-2 flex-wrap">
                {ROLES.map(r => (
                    <button
                        key={r.key}
                        onClick={() => setActiveRole(r.key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${activeRole === r.key ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'}`}
                    >
                        <span className={`text-xs px-1.5 py-0.5 rounded ${r.color}`}>{r.label}</span>
                        {activeRole === r.key && (
                            <Badge className="bg-primary/20 text-primary border-none text-xs">{enabledCount}/{totalCount}</Badge>
                        )}
                    </button>
                ))}
            </div>

            {/* Permission groups */}
            <div className="space-y-4">
                {PERMISSION_GROUPS.map(group => (
                    <Card key={group.group}>
                        <CardHeader className="py-3 px-4 border-b bg-muted/30">
                            <CardTitle className="text-sm font-semibold">{group.group}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {group.permissions.map((perm, i) => (
                                <div key={perm.key} className={`flex items-center justify-between px-4 py-3 ${i < group.permissions.length - 1 ? 'border-b' : ''} hover:bg-muted/20`}>
                                    <div>
                                        <p className="text-sm font-medium">{perm.label}</p>
                                        <p className="text-xs text-muted-foreground font-mono">{perm.key}</p>
                                    </div>
                                    <Switch
                                        checked={!!currentPerms[perm.key]}
                                        onCheckedChange={() => toggle(perm.key)}
                                    />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
