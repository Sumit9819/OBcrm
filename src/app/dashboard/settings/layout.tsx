"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    Building2, ListFilter, GitBranch, LayoutDashboard,
    ShieldCheck, BellRing, MessageSquareText, User, Users, Globe, Palette
} from "lucide-react"

const NAV_SECTIONS = [
    {
        label: "Agency",
        items: [
            { href: "/dashboard/settings", label: "Agency Profile", icon: Building2 },
            { href: "/dashboard/settings/profile", label: "My Profile", icon: User },
        ]
    },
    {
        label: "Customization",
        items: [
            { href: "/dashboard/settings/pipeline-stages", label: "Pipeline Stages", icon: GitBranch },
            { href: "/dashboard/settings/custom-fields", label: "Custom Lead Fields", icon: ListFilter },
            { href: "/dashboard/settings/widgets", label: "Dashboard Widgets", icon: LayoutDashboard },
            { href: "/dashboard/settings/templates", label: "Message Templates", icon: MessageSquareText },
        ]
    },
    {
        label: "Access & Notifications",
        items: [
            { href: "/dashboard/settings/permissions", label: "Role Permissions", icon: ShieldCheck },
            { href: "/dashboard/settings/notifications", label: "Notification Prefs", icon: BellRing },
        ]
    },
    {
        label: "Advanced",
        items: [
            { href: "/dashboard/settings/users", label: "Team Members", icon: Users },
            { href: "/dashboard/settings/integrations", label: "Integrations", icon: Globe },
        ]
    },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()

    return (
        <div className="flex min-h-screen">
            {/* Sidebar */}
            <aside className="w-64 shrink-0 border-r bg-muted/20 px-3 py-6 space-y-6">
                <div className="px-2 mb-2">
                    <h2 className="text-base font-bold">Settings</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Manage your CRM preferences</p>
                </div>

                {NAV_SECTIONS.map(section => (
                    <div key={section.label}>
                        <p className="text-[10px] font-bold uppercase text-muted-foreground/60 tracking-widest px-2 mb-1.5">{section.label}</p>
                        <nav className="space-y-0.5">
                            {section.items.map(item => {
                                const Icon = item.icon
                                // Exact match for the root settings page, prefix match for others
                                const isActive = item.href === "/dashboard/settings"
                                    ? pathname === "/dashboard/settings"
                                    : pathname.startsWith(item.href)

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all
                                            ${isActive
                                                ? 'bg-primary/10 text-primary'
                                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                                    >
                                        <Icon className="h-4 w-4 shrink-0" />
                                        {item.label}
                                    </Link>
                                )
                            })}
                        </nav>
                    </div>
                ))}
            </aside>

            {/* Main content */}
            <main className="flex-1 p-6 md:p-8 overflow-auto">
                {children}
            </main>
        </div>
    )
}
