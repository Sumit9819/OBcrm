"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ShieldCheck, Save, Plus, Trash2, X, Loader2 } from "lucide-react"
import { toast } from "sonner"

// System roles that cannot be deleted (created automatically on signup)
const SYSTEM_ROLE_SLUGS = ['super_admin', 'agency_admin']

// Badge colors users can pick when creating a role
const BADGE_COLORS = [
    { label: 'Blue', value: 'bg-blue-100 text-blue-700' },
    { label: 'Green', value: 'bg-emerald-100 text-emerald-700' },
    { label: 'Amber', value: 'bg-amber-100 text-amber-700' },
    { label: 'Red', value: 'bg-red-100 text-red-700' },
    { label: 'Purple', value: 'bg-purple-100 text-purple-700' },
    { label: 'Pink', value: 'bg-pink-100 text-pink-700' },
    { label: 'Cyan', value: 'bg-cyan-100 text-cyan-700' },
    { label: 'Orange', value: 'bg-orange-100 text-orange-700' },
    { label: 'Gray', value: 'bg-gray-100 text-gray-700' },
]

type CustomRole = {
    id: string
    name: string
    slug: string
    color: string
    is_system: boolean
}

type PermDef = {
    category: string
    key: string
    label: string
}

type PermGrouped = {
    group: string
    permissions: PermDef[]
}

export default function RolePermissionsPage() {
    const [roles, setRoles] = useState<CustomRole[]>([])
    const [permGroups, setPermGroups] = useState<PermGrouped[]>([])
    const [activeRole, setActiveRole] = useState('')
    const [perms, setPerms] = useState<Record<string, Record<string, boolean>>>({})
    const [agencyId, setAgencyId] = useState("")
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(true)

    // Create role dialog
    const [showCreate, setShowCreate] = useState(false)
    const [newRoleName, setNewRoleName] = useState('')
    const [newRoleColor, setNewRoleColor] = useState(BADGE_COLORS[0].value)
    const [creating, setCreating] = useState(false)

    const supabase = createClient()

    const load = useCallback(async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: profile } = await supabase.from('users').select('agency_id').eq('id', user.id).single()
        const aid = profile?.agency_id || ""
        setAgencyId(aid)

        // Load roles from custom_roles (or create defaults if none exist)
        let { data: dbRoles } = await supabase.from('custom_roles').select('*').eq('agency_id', aid).order('created_at')

        // If no roles exist yet (first time), seed defaults
        if (!dbRoles || dbRoles.length === 0) {
            const seedRoles = [
                { agency_id: aid, name: 'Super Admin', slug: 'super_admin', color: 'bg-red-100 text-red-700', is_system: true },
                { agency_id: aid, name: 'Agency Admin', slug: 'agency_admin', color: 'bg-blue-100 text-blue-700', is_system: true },
                { agency_id: aid, name: 'Agent', slug: 'agent', color: 'bg-emerald-100 text-emerald-700', is_system: false },
                { agency_id: aid, name: 'Accountant', slug: 'accountant', color: 'bg-amber-100 text-amber-700', is_system: false },
                { agency_id: aid, name: 'Staff', slug: 'staff', color: 'bg-purple-100 text-purple-700', is_system: false },
                { agency_id: aid, name: 'Counselor', slug: 'counselor', color: 'bg-cyan-100 text-cyan-700', is_system: false },
            ]
            await supabase.from('custom_roles').insert(seedRoles)
            const res = await supabase.from('custom_roles').select('*').eq('agency_id', aid).order('created_at')
            dbRoles = res.data
        }

        setRoles(dbRoles || [])
        // Set first non-system role as active by default
        const firstEditable = dbRoles?.find(r => !SYSTEM_ROLE_SLUGS.includes(r.slug))
        if (firstEditable && !activeRole) setActiveRole(firstEditable.slug)

        // Load permission definitions from DB
        const { data: permDefs } = await supabase.from('permission_definitions').select('category, key, label').order('sort_order')

        if (permDefs) {
            // Group by category
            const groups: Record<string, PermDef[]> = {}
            permDefs.forEach(pd => {
                if (!groups[pd.category]) groups[pd.category] = []
                groups[pd.category].push(pd)
            })
            setPermGroups(Object.entries(groups).map(([group, permissions]) => ({ group, permissions })))
        }

        // Load saved permissions
        const { data: savedPerms } = await supabase.from('role_permissions').select('role, permissions').eq('agency_id', aid)

        if (savedPerms) {
            const loaded: Record<string, Record<string, boolean>> = {}
            savedPerms.forEach(r => { loaded[r.role] = r.permissions })
            setPerms(loaded)
        }

        setLoading(false)
    }, [])

    useEffect(() => { load() }, [])

    const toggle = (perm: string) => {
        setPerms(prev => ({
            ...prev,
            [activeRole]: { ...prev[activeRole], [perm]: !prev[activeRole]?.[perm] }
        }))
    }

    const toggleAll = (group: PermGrouped, value: boolean) => {
        setPerms(prev => {
            const updated = { ...prev[activeRole] }
            group.permissions.forEach(p => { updated[p.key] = value })
            return { ...prev, [activeRole]: updated }
        })
    }

    const handleSave = async () => {
        setSaving(true)
        const { error } = await supabase.from('role_permissions').upsert(
            { agency_id: agencyId, role: activeRole, permissions: perms[activeRole] || {}, updated_at: new Date().toISOString() },
            { onConflict: 'agency_id,role' }
        )
        if (error) toast.error(error.message)
        else {
            const roleName = roles.find(r => r.slug === activeRole)?.name || activeRole
            toast.success(`${roleName} permissions saved!`)
        }
        setSaving(false)
    }

    const createRole = async () => {
        if (!newRoleName.trim()) return toast.error("Role name is required")
        setCreating(true)
        const slug = newRoleName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

        const { data, error } = await supabase.from('custom_roles').insert({
            agency_id: agencyId,
            name: newRoleName.trim(),
            slug,
            color: newRoleColor,
            is_system: false,
        }).select().single()

        if (error) {
            if (error.message.includes('unique')) toast.error("A role with this name already exists")
            else toast.error(error.message)
        } else {
            toast.success(`Role "${data.name}" created!`)
            setRoles(prev => [...prev, data])
            setActiveRole(data.slug)
            setShowCreate(false)
            setNewRoleName('')
        }
        setCreating(false)
    }

    const deleteRole = async (role: CustomRole) => {
        if (role.is_system || SYSTEM_ROLE_SLUGS.includes(role.slug)) {
            return toast.error("Cannot delete system roles")
        }
        if (!confirm(`Delete the "${role.name}" role? Users with this role will need to be reassigned.`)) return

        // Delete permissions for this role
        await supabase.from('role_permissions').delete().eq('agency_id', agencyId).eq('role', role.slug)
        // Delete the role
        const { error } = await supabase.from('custom_roles').delete().eq('id', role.id)
        if (error) toast.error(error.message)
        else {
            toast.success(`Role "${role.name}" deleted`)
            setRoles(prev => prev.filter(r => r.id !== role.id))
            if (activeRole === role.slug) {
                const remaining = roles.filter(r => r.id !== role.id && !SYSTEM_ROLE_SLUGS.includes(r.slug))
                setActiveRole(remaining[0]?.slug || '')
            }
        }
    }

    const currentPerms = perms[activeRole] || {}
    const allPermKeys = permGroups.flatMap(g => g.permissions).map(p => p.key)
    const enabledCount = allPermKeys.filter(k => currentPerms[k]).length
    const isSystemRole = SYSTEM_ROLE_SLUGS.includes(activeRole)

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Role Permissions</h3>
                    <p className="text-sm text-muted-foreground mt-1">Create custom roles and control what each role can see and do.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowCreate(true)} className="gap-2">
                        <Plus className="h-4 w-4" /> New Role
                    </Button>
                    {!isSystemRole && (
                        <Button onClick={handleSave} disabled={saving} className="gap-2">
                            <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Permissions"}
                        </Button>
                    )}
                </div>
            </div>

            {/* Create Role Dialog */}
            {showCreate && (
                <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="pt-4 space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="font-semibold">Create New Role</h4>
                            <Button variant="ghost" size="icon" onClick={() => setShowCreate(false)}><X className="h-4 w-4" /></Button>
                        </div>
                        <div className="space-y-2">
                            <Label>Role Name</Label>
                            <Input
                                value={newRoleName}
                                onChange={e => setNewRoleName(e.target.value)}
                                placeholder="e.g. Branch Manager, Instructor, Front Desk..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Badge Color</Label>
                            <div className="flex gap-2 flex-wrap">
                                {BADGE_COLORS.map(c => (
                                    <button
                                        key={c.value}
                                        onClick={() => setNewRoleColor(c.value)}
                                        className={`px-3 py-1 rounded-full text-xs font-medium ${c.value} ${newRoleColor === c.value ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                                    >
                                        {c.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <Button onClick={createRole} disabled={creating} className="gap-2">
                            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            Create Role
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Role tabs */}
            <div className="flex gap-2 flex-wrap">
                {roles.filter(r => !SYSTEM_ROLE_SLUGS.includes(r.slug)).map(r => (
                    <button
                        key={r.slug}
                        onClick={() => setActiveRole(r.slug)}
                        className={`group flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${activeRole === r.slug ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'}`}
                    >
                        <span className={`text-xs px-1.5 py-0.5 rounded ${r.color}`}>{r.name}</span>
                        {activeRole === r.slug && (
                            <Badge className="bg-primary/20 text-primary border-none text-xs">{enabledCount}/{allPermKeys.length}</Badge>
                        )}
                        {!r.is_system && !SYSTEM_ROLE_SLUGS.includes(r.slug) && (
                            <button
                                onClick={e => { e.stopPropagation(); deleteRole(r) }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                            >
                                <Trash2 className="h-3 w-3" />
                            </button>
                        )}
                    </button>
                ))}
            </div>

            {isSystemRole && (
                <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="py-3 text-sm text-amber-800">
                        Super Admin and Agency Admin always have full access. Select a custom role to configure permissions.
                    </CardContent>
                </Card>
            )}

            {/* Permission groups - only show for editable roles */}
            {!isSystemRole && activeRole && (
                <div className="space-y-4">
                    {permGroups.map(group => {
                        const groupEnabled = group.permissions.every(p => currentPerms[p.key])
                        return (
                            <Card key={group.group}>
                                <CardHeader className="py-3 px-4 border-b bg-muted/30 flex flex-row items-center justify-between">
                                    <CardTitle className="text-sm font-semibold">{group.group}</CardTitle>
                                    <button
                                        onClick={() => toggleAll(group, !groupEnabled)}
                                        className="text-xs text-muted-foreground hover:text-primary transition-colors"
                                    >
                                        {groupEnabled ? 'Disable All' : 'Enable All'}
                                    </button>
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
                        )
                    })}
                </div>
            )}
        </div>
    )
}
