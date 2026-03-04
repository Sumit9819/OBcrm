'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createAgency } from '@/app/admin/actions'

const PLANS = ['starter', 'professional', 'enterprise']
const TIMEZONES = [
    'UTC', 'Asia/Kolkata', 'Asia/Kathmandu', 'America/New_York',
    'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Dubai',
    'Asia/Singapore', 'Australia/Sydney',
]

function slugify(str: string) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function NewAgencyPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [companyName, setCompanyName] = useState('')
    const [slug, setSlug] = useState('')
    const [subdomain, setSubdomain] = useState('')
    const [autoSlug, setAutoSlug] = useState(true)

    function handleCompanyNameChange(val: string) {
        setCompanyName(val)
        if (autoSlug) {
            const s = slugify(val)
            setSlug(s)
            setSubdomain(s)
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setError(null)
        const fd = new FormData(e.currentTarget)
        const result = await createAgency(fd)
        if (result?.error) {
            setError(result.error)
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white">Create New Agency</h1>
                <p className="text-slate-400 text-sm mt-1">Set up a new tenant workspace</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-slate-900 border border-slate-800/60 rounded-xl p-6 space-y-5">
                    <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                        Company Details
                    </h2>

                    {/* Company Name */}
                    <div>
                        <label className="text-sm text-slate-400 mb-1.5 block">Company Name *</label>
                        <input
                            name="company_name"
                            value={companyName}
                            onChange={(e) => handleCompanyNameChange(e.target.value)}
                            placeholder="Acme Education"
                            required
                            className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
                        />
                    </div>

                    {/* Slug */}
                    <div>
                        <label className="text-sm text-slate-400 mb-1.5 block">Slug *</label>
                        <input
                            name="slug"
                            value={slug}
                            onChange={(e) => { setSlug(e.target.value); setAutoSlug(false) }}
                            placeholder="acme-education"
                            required
                            pattern="[a-z0-9\-]+"
                            className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-4 py-2.5 text-white text-sm font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
                        />
                        <p className="text-xs text-slate-600 mt-1.5">
                            Lowercase letters, numbers, hyphens only. Used as a unique identifier.
                        </p>
                    </div>

                    {/* Subdomain */}
                    <div>
                        <label className="text-sm text-slate-400 mb-1.5 block">Subdomain *</label>
                        <div className="flex items-center gap-0">
                            <input
                                name="subdomain"
                                value={subdomain}
                                onChange={(e) => { setSubdomain(e.target.value); setAutoSlug(false) }}
                                placeholder="acme"
                                required
                                pattern="[a-z0-9\-]+"
                                className="flex-1 bg-slate-800 border border-r-0 border-slate-700/60 rounded-l-lg px-4 py-2.5 text-white text-sm font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
                            />
                            <span className="px-4 py-2.5 bg-slate-800/60 border border-slate-700/60 rounded-r-lg text-xs text-slate-500 font-mono whitespace-nowrap">
                                .yourdomain.com
                            </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1.5">
                            This becomes <span className="font-mono text-slate-500">{subdomain || 'acme'}.yourdomain.com</span>
                        </p>
                    </div>

                    {/* Custom Domain */}
                    <div>
                        <label className="text-sm text-slate-400 mb-1.5 block">
                            Custom Domain <span className="text-slate-600">(optional)</span>
                        </label>
                        <input
                            name="custom_domain"
                            type="text"
                            placeholder="crm.clientcompany.com"
                            className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-4 py-2.5 text-white text-sm font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
                        />
                        <p className="text-xs text-slate-600 mt-1.5">
                            Client&apos;s own domain — they must add a CNAME pointing to your app in Cloudflare.
                        </p>
                    </div>
                </div>

                {/* Plan & Limits */}
                <div className="bg-slate-900 border border-slate-800/60 rounded-xl p-6 space-y-5">
                    <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                        Plan & Limits
                    </h2>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-slate-400 mb-1.5 block">Plan</label>
                            <select
                                name="plan"
                                defaultValue="starter"
                                className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                            >
                                {PLANS.map(p => (
                                    <option key={p} value={p} className="bg-slate-800 capitalize">{p}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-sm text-slate-400 mb-1.5 block">Max Users</label>
                            <input
                                name="max_users"
                                type="number"
                                defaultValue="10"
                                min="1"
                                max="1000"
                                className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-slate-400 mb-1.5 block">Timezone</label>
                            <select
                                name="timezone"
                                defaultValue="UTC"
                                className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                            >
                                {TIMEZONES.map(tz => (
                                    <option key={tz} value={tz} className="bg-slate-800">{tz}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-sm text-slate-400 mb-1.5 block">Brand Color</label>
                            <div className="flex items-center gap-3">
                                <input
                                    name="primary_color"
                                    type="color"
                                    defaultValue="#6366f1"
                                    className="w-10 h-10 rounded-lg border border-slate-700/60 bg-slate-800 cursor-pointer p-0.5"
                                />
                                <span className="text-slate-500 text-xs font-mono">#6366f1</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* First Admin */}
                <div className="bg-slate-900 border border-slate-800/60 rounded-xl p-6 space-y-5">
                    <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                        First Admin (optional)
                    </h2>
                    <div>
                        <label className="text-sm text-slate-400 mb-1.5 block">Admin Email</label>
                        <input
                            name="admin_email"
                            type="email"
                            placeholder="admin@clientcompany.com"
                            className="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
                        />
                        <p className="text-xs text-slate-600 mt-1.5">
                            An invitation record will be created. You can manually send the signup link.
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Creating...
                            </>
                        ) : 'Create Agency'}
                    </button>
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-6 py-2.5 text-slate-400 hover:text-white text-sm transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    )
}
