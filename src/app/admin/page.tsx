import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function AdminDashboardPage() {
    const supabase = await createClient()

    const { data: agencies } = await supabase
        .from('agencies')
        .select('id, company_name, slug, subdomain, custom_domain, is_active, plan, created_at')
        .order('created_at', { ascending: false })

    const totalAgencies = agencies?.length ?? 0
    const activeAgencies = agencies?.filter(a => a.is_active).length ?? 0

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Agency Management</h1>
                    <p className="text-slate-400 text-sm mt-1">Manage all tenant workspaces</p>
                </div>
                <Link
                    href="/admin/agencies/new"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                    <span>+</span>
                    New Agency
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Agencies', value: totalAgencies, color: 'text-white' },
                    { label: 'Active', value: activeAgencies, color: 'text-emerald-400' },
                    { label: 'Suspended', value: totalAgencies - activeAgencies, color: 'text-red-400' },
                ].map((stat) => (
                    <div key={stat.label} className="bg-slate-900 border border-slate-800/60 rounded-xl p-5">
                        <p className="text-slate-500 text-xs uppercase tracking-wider mb-2">{stat.label}</p>
                        <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Agency Table */}
            <div className="bg-slate-900 border border-slate-800/60 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800/60">
                    <h2 className="text-sm font-semibold text-white">All Workspaces</h2>
                </div>
                <div className="divide-y divide-slate-800/40">
                    {agencies?.length === 0 ? (
                        <div className="text-center py-16 text-slate-500">
                            <p className="text-lg mb-2">No agencies yet</p>
                            <p className="text-sm">
                                <Link href="/admin/agencies/new" className="text-primary hover:underline">
                                    Create your first agency →
                                </Link>
                            </p>
                        </div>
                    ) : (
                        agencies?.map((agency) => (
                            <div key={agency.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-800/30 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                                        {agency.company_name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-white font-medium text-sm">{agency.company_name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <p className="text-slate-500 text-xs font-mono">{agency.subdomain}.yourdomain.com</p>
                                            {agency.custom_domain && (
                                                <>
                                                    <span className="text-slate-700">·</span>
                                                    <p className="text-slate-500 text-xs font-mono">{agency.custom_domain}</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${agency.plan === 'enterprise'
                                            ? 'text-yellow-400 bg-yellow-400/10'
                                            : agency.plan === 'professional'
                                                ? 'text-blue-400 bg-blue-400/10'
                                                : 'text-slate-400 bg-slate-400/10'
                                        }`}>
                                        {agency.plan}
                                    </span>
                                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${agency.is_active
                                            ? 'text-emerald-400 bg-emerald-400/10'
                                            : 'text-red-400 bg-red-400/10'
                                        }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${agency.is_active ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                        {agency.is_active ? 'Active' : 'Suspended'}
                                    </span>
                                    <Link
                                        href={`/admin/agencies/${agency.id}`}
                                        className="text-xs text-slate-400 hover:text-white transition-colors border border-slate-700 px-3 py-1.5 rounded-lg hover:border-slate-500"
                                    >
                                        Manage →
                                    </Link>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
