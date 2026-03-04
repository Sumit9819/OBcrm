'use client'

import { useState } from 'react'
import { toggleAgencyStatus } from '@/app/admin/actions'

interface Agency {
    id: string
    company_name: string
    slug: string
    subdomain: string | null
    custom_domain: string | null
    logo_url: string | null
    branding_primary_color: string
    is_active: boolean
    plan: string
    max_users: number
    timezone: string
    created_at: string
}

interface User {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    role: string
    created_at: string
}

interface Invitation {
    id: string
    email: string
    role: string
    expires_at: string
    accepted_at: string | null
    created_at: string
}

interface Props {
    agency: Agency
    users: User[]
    invitations: Invitation[]
}

const ROLE_COLORS: Record<string, string> = {
    super_admin: 'text-yellow-400 bg-yellow-400/10',
    agency_admin: 'text-blue-400 bg-blue-400/10',
    staff: 'text-purple-400 bg-purple-400/10',
    agent: 'text-emerald-400 bg-emerald-400/10',
    accountant: 'text-orange-400 bg-orange-400/10',
    student: 'text-slate-400 bg-slate-400/10',
}

export default function AgencyDetailClient({ agency, users, invitations }: Props) {
    const [isActive, setIsActive] = useState(agency.is_active)
    const [toggling, setToggling] = useState(false)

    async function handleToggle() {
        setToggling(true)
        const result = await toggleAgencyStatus(agency.id, !isActive)
        if (!result?.error) setIsActive(!isActive)
        setToggling(false)
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
                            {agency.company_name.charAt(0).toUpperCase()}
                        </div>
                        <h1 className="text-2xl font-bold text-white">{agency.company_name}</h1>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isActive ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
                            {isActive ? 'Active' : 'Suspended'}
                        </span>
                    </div>
                    <p className="text-slate-500 text-sm font-mono">
                        {agency.subdomain}.yourdomain.com
                        {agency.custom_domain && ` · ${agency.custom_domain}`}
                    </p>
                </div>

                <button
                    onClick={handleToggle}
                    disabled={toggling}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${isActive
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                        }`}
                >
                    {toggling ? 'Updating...' : isActive ? 'Suspend Agency' : 'Activate Agency'}
                </button>
            </div>

            {/* Info cards */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { label: 'Plan', value: agency.plan, mono: false },
                    { label: 'Max Users', value: String(agency.max_users), mono: false },
                    { label: 'Timezone', value: agency.timezone, mono: false },
                    { label: 'Slug', value: agency.slug, mono: true },
                ].map(item => (
                    <div key={item.label} className="bg-slate-900 border border-slate-800/60 rounded-xl p-4">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{item.label}</p>
                        <p className={`text-white text-sm font-medium ${item.mono ? 'font-mono' : ''}`}>{item.value}</p>
                    </div>
                ))}
            </div>

            {/* Branding */}
            <div className="bg-slate-900 border border-slate-800/60 rounded-xl p-5">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Branding</p>
                <div className="flex items-center gap-3">
                    <div
                        className="w-8 h-8 rounded-lg shadow-lg"
                        style={{ backgroundColor: agency.branding_primary_color }}
                    />
                    <span className="text-white text-sm font-mono">{agency.branding_primary_color}</span>
                </div>
            </div>

            {/* Users */}
            <div className="bg-slate-900 border border-slate-800/60 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-800/60 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-white">
                        Users <span className="text-slate-500 font-normal">({users.length})</span>
                    </h2>
                    <span className="text-xs text-slate-500">{users.length} / {agency.max_users} seats</span>
                </div>
                <div className="divide-y divide-slate-800/40">
                    {users.length === 0 ? (
                        <p className="text-center py-8 text-slate-500 text-sm">No users yet</p>
                    ) : (
                        users.map(user => (
                            <div key={user.id} className="flex items-center justify-between px-5 py-3">
                                <div>
                                    <p className="text-white text-sm font-medium">
                                        {user.first_name || user.last_name
                                            ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
                                            : user.email}
                                    </p>
                                    <p className="text-slate-500 text-xs">{user.email}</p>
                                </div>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[user.role] ?? 'text-slate-400 bg-slate-400/10'}`}>
                                    {user.role}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Pending Invitations */}
            {invitations.length > 0 && (
                <div className="bg-slate-900 border border-slate-800/60 rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-800/60">
                        <h2 className="text-sm font-semibold text-white">
                            Pending Invitations <span className="text-slate-500 font-normal">({invitations.length})</span>
                        </h2>
                    </div>
                    <div className="divide-y divide-slate-800/40">
                        {invitations.map(inv => (
                            <div key={inv.id} className="flex items-center justify-between px-5 py-3">
                                <div>
                                    <p className="text-white text-sm">{inv.email}</p>
                                    <p className="text-slate-500 text-xs">
                                        Invited as {inv.role} ·
                                        {inv.accepted_at
                                            ? ' ✅ Accepted'
                                            : ` Expires ${new Date(inv.expires_at).toLocaleDateString()}`}
                                    </p>
                                </div>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${inv.accepted_at ? 'text-emerald-400 bg-emerald-400/10' : 'text-amber-400 bg-amber-400/10'}`}>
                                    {inv.accepted_at ? 'Accepted' : 'Pending'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
