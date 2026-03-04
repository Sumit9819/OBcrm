import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'super_admin') redirect('/dashboard')

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Top navigation bar */}
            <nav className="border-b border-slate-800/60 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                            G
                        </div>
                        <div>
                            <p className="text-white font-semibold text-sm">GrowthCRM</p>
                            <p className="text-slate-500 text-xs">Super Admin</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-mono bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-full">
                            super_admin
                        </span>
                    </div>
                </div>
            </nav>

            {/* Sidebar + Content */}
            <div className="max-w-7xl mx-auto px-6 py-8 flex gap-8">
                {/* Sidebar */}
                <aside className="w-52 shrink-0">
                    <nav className="space-y-1">
                        {[
                            { href: '/admin', label: 'Dashboard', icon: '⊞' },
                            { href: '/admin/agencies', label: 'Agencies', icon: '🏢' },
                            { href: '/admin/agencies/new', label: 'New Agency', icon: '+' },
                        ].map((item) => (
                            <a
                                key={item.href}
                                href={item.href}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all"
                            >
                                <span className="text-base">{item.icon}</span>
                                {item.label}
                            </a>
                        ))}
                    </nav>
                </aside>

                {/* Main content */}
                <main className="flex-1 min-w-0">{children}</main>
            </div>
        </div>
    )
}
