import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { LayoutDashboard, Send, ClipboardList, DollarSign, LogOut } from "lucide-react"
import { AgentLeadNotifications } from "@/components/agent/lead-notifications"

const NAV = [
    { href: "/agent", label: "Dashboard", icon: LayoutDashboard },
    { href: "/agent/submit", label: "Submit Lead", icon: Send },
    { href: "/agent/leads", label: "My Leads", icon: ClipboardList },
    { href: "/agent/commission", label: "Commission", icon: DollarSign },
]

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('users')
        .select('role, first_name, last_name, job_title')
        .eq('id', user.id)
        .single()

    // Only agents can access this portal
    if (profile?.role !== 'agent') redirect('/dashboard')

    const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Agent'

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar */}
            <aside className="w-60 bg-white border-r fixed h-full flex flex-col shadow-sm">
                <div className="px-5 py-5 border-b">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                            <span className="text-primary-foreground font-bold text-sm">G</span>
                        </div>
                        <div>
                            <p className="font-bold text-sm leading-tight">GrowthCRM</p>
                            <p className="text-[10px] text-muted-foreground">Partner Portal</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 py-4 px-3 space-y-1">
                    {NAV.map(item => {
                        const Icon = item.icon
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-primary/5 hover:text-foreground transition-all"
                            >
                                <Icon className="h-4 w-4 shrink-0" />
                                {item.label}
                            </Link>
                        )
                    })}
                </nav>

                {/* User info at bottom */}
                <div className="border-t px-4 py-4">
                    <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                            {name[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{profile.job_title || 'Partner Agent'}</p>
                        </div>
                    </div>
                    <form action="/auth/signout" method="post" className="mt-3">
                        <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-red-500 transition-colors w-full">
                            <LogOut className="h-3.5 w-3.5" /> Sign out
                        </button>
                    </form>
                </div>
            </aside>

            {/* Main content */}
            <main className="ml-60 flex-1 p-6 md:p-8">
                <AgentLeadNotifications agentId={user.id} />
                {children}
            </main>
        </div>
    )
}
