"use client"

import * as React from "react"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    BookOpen,
    ChevronDown,
    LayoutDashboard,
    MessageCircle,
    Phone,
    Settings,
    UserCheck,
    Users,
    Briefcase,
    FileCheck,
    FileText,
    TrendingUp,
    CheckSquare,
    Bell,
    ClipboardList,
    CalendarDays,
    Users2,
    CalendarClock,
    Ticket,
    Banknote,
    Mail,
    Coffee,
    GraduationCap,
} from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
} from "@/components/ui/sidebar"

type NavItem = {
    title: string
    icon: React.ComponentType<{ className?: string; strokeWidth?: number; style?: React.CSSProperties }>
    url?: string
    items?: { title: string; url: string }[]
    roles?: string[]
}

type NavSection = {
    label?: string
    items: NavItem[]
}

function normalizePath(path: string) {
    if (!path) return "/"
    return path !== "/" && path.endsWith("/") ? path.slice(0, -1) : path
}

function isRouteActive(currentPath: string, targetPath: string) {
    const current = normalizePath(currentPath)
    const target = normalizePath(targetPath)

    if (target === "/dashboard") return current === target
    return current === target || current.startsWith(`${target}/`)
}

function formatRole(role: string) {
    return role
        .split("_")
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
}

const navSections: NavSection[] = [
    {
        items: [
            {
                title: "Dashboard",
                icon: LayoutDashboard,
                url: "/dashboard",
            },
            {
                title: "Call Management",
                icon: Phone,
                items: [
                    { title: "Call Logs", url: "/dashboard/calls" },
                    { title: "Scheduled Followup", url: "/dashboard/calls/scheduled" },
                ],
                roles: ["super_admin", "agency_admin", "agent"],
            },
            {
                title: "All Agency Leads",
                icon: Users,
                items: [
                    { title: "All Leads", url: "/dashboard/leads/all" },
                    { title: "Kanban Board", url: "/dashboard/leads/kanban" },
                    { title: "Add New Lead", url: "/dashboard/leads/new" },
                ],
                roles: ["super_admin", "agency_admin"],
            },
            {
                title: "My Leads",
                icon: Users,
                items: [
                    { title: "My Leads", url: "/dashboard/leads/private" },
                    { title: "Kanban Board", url: "/dashboard/leads/kanban" },
                    { title: "Add New Lead", url: "/dashboard/leads/new" },
                ],
                roles: ["super_admin", "agency_admin", "agent"],
            },
            {
                title: "Students",
                icon: UserCheck,
                url: "/dashboard/students",
                roles: ["super_admin", "agency_admin", "staff", "agent", "accountant"],
            },
            {
                title: "Learners",
                icon: GraduationCap,
                url: "/dashboard/learners",
                roles: ["super_admin", "agency_admin", "staff", "agent", "accountant"],
            },
            {
                title: "Classes & Payments",
                icon: BookOpen,
                items: [
                    { title: "Active Batches", url: "/dashboard/classes" },
                    { title: "Invoices & Receipts", url: "/dashboard/finances" },
                ],
                roles: ["super_admin", "agency_admin", "accountant"],
            },
            {
                title: "Applications",
                icon: Briefcase,
                items: [
                    { title: "University Search", url: "/dashboard/applications/search" },
                    { title: "Offers & COE", url: "/dashboard/applications/offers" },
                ],
                roles: ["super_admin", "agency_admin", "agent"],
            },
            {
                title: "Documents",
                icon: FileText,
                url: "/dashboard/documents",
                roles: ["super_admin", "agency_admin", "agent"],
            },
            {
                title: "Visa Processing",
                icon: FileCheck,
                url: "/dashboard/visa",
                roles: ["super_admin", "agency_admin", "agent"],
            },
            {
                title: "Chat & Messages",
                icon: MessageCircle,
                url: "/dashboard/chat",
            },
            {
                title: "Reports",
                icon: TrendingUp,
                url: "/dashboard/reports",
                roles: ["super_admin", "agency_admin"],
            },
            {
                title: "Tasks",
                icon: CheckSquare,
                url: "/dashboard/tasks",
            },
            {
                title: "Reminders",
                icon: Bell,
                url: "/dashboard/reminders",
            },
        ],
    },
    {
        label: "CRM",
        items: [
            {
                title: "Attendance",
                icon: ClipboardList,
                url: "/dashboard/attendance",
                roles: ["super_admin", "agency_admin"],
            },
            {
                title: "Leave",
                icon: Coffee,
                url: "/dashboard/leave",
            },
            {
                title: "Calendar",
                icon: CalendarDays,
                url: "/dashboard/calendar",
            },
            {
                title: "Meetings & Events",
                icon: CalendarClock,
                url: "/dashboard/meetings",
            },
            {
                title: "Raise Ticket",
                icon: Ticket,
                url: "/dashboard/tickets",
            },
        ],
    },
    {
        label: "SETTING",
        items: [
            {
                title: "Settings",
                icon: Settings,
                items: [
                    { title: "Agency Branding", url: "/dashboard/settings" },
                    { title: "Branches", url: "/dashboard/settings/branches" },
                    { title: "Integrations", url: "/dashboard/settings/integrations" },
                    { title: "Team Management", url: "/dashboard/settings/users" },
                    { title: "Agent Management", url: "/dashboard/settings/agents" },
                    { title: "Custom Fields", url: "/dashboard/settings/custom-fields" },
                    { title: "Pipeline Stages", url: "/dashboard/settings/pipeline" },
                    { title: "Audit Log", url: "/dashboard/audit" },
                    { title: "My Profile", url: "/dashboard/settings/profile" },
                ],
                roles: ["super_admin", "agency_admin"],
            },
            {
                title: "Employee",
                icon: Users2,
                url: "/dashboard/settings/employees",
                roles: ["super_admin", "agency_admin"],
            },
            {
                title: "Cash Received",
                icon: Banknote,
                url: "/dashboard/settings/cash-received",
                roles: ["super_admin", "agency_admin", "accountant"],
            },
            {
                title: "Newsletter Template",
                icon: Mail,
                url: "/dashboard/settings/newsletter",
                roles: ["super_admin", "agency_admin"],
            },
        ],
    },
]

function CollapsibleNavGroup({ group, fg, pathname }: { group: NavItem, fg: string; pathname: string }) {
    const isGroupActive = group.items?.some(item => isRouteActive(pathname, item.url)) ?? false
    const [open, setOpen] = useState(isGroupActive)

    React.useEffect(() => {
        if (isGroupActive) {
            setOpen(true)
        }
    }, [isGroupActive])

    return (
        <SidebarGroup className="px-2 py-0.5">
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton
                        isActive={isGroupActive}
                        onClick={() => setOpen(!open)}
                        className="group h-10 w-full justify-between rounded-lg px-3 text-[13px] font-medium transition-all data-[active=true]:shadow-sm"
                        style={{ color: fg }}
                        aria-label={`${group.title} menu`}
                    >
                        <span className="flex items-center gap-3">
                            <group.icon className="h-4 w-4 opacity-75 transition-opacity group-hover:opacity-100" style={{ color: fg }} strokeWidth={1.75} />
                            <span className="font-semibold tracking-[0.01em]">{group.title}</span>
                        </span>
                        <ChevronDown className={`h-3.5 w-3.5 opacity-60 transition-transform duration-200 ${open ? "rotate-180" : ""}`} style={{ color: fg }} />
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>

            <div
                className={`overflow-hidden transition-all duration-200 ease-in-out ${open ? "max-h-96 opacity-100 mt-1" : "max-h-0 opacity-0"}`}
            >
                <SidebarGroupContent>
                    <SidebarMenu>
                        {group.items?.map((item) => (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={isRouteActive(pathname, item.url)}
                                    className="ml-7 h-9 rounded-md px-3 text-[12px] font-medium opacity-80 transition-all hover:opacity-100"
                                >
                                    <Link href={item.url} style={{ color: fg }}>
                                        {item.title}
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroupContent>
            </div>
        </SidebarGroup>
    )
}

function DirectLinkItem({ group, fg, pathname }: { group: NavItem, fg: string; pathname: string }) {
    return (
        <SidebarGroup className="px-2 py-0.5">
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton
                        asChild
                        isActive={isRouteActive(pathname, group.url!)}
                        tooltip={group.title}
                        className="group h-10 rounded-lg px-3 text-[13px] font-medium transition-all data-[active=true]:shadow-sm"
                    >
                        <Link href={group.url!} className="flex items-center gap-3" style={{ color: fg }}>
                            <group.icon className="h-4 w-4 opacity-75 transition-opacity group-hover:opacity-100" style={{ color: fg }} strokeWidth={1.75} />
                            <span className="font-semibold tracking-[0.01em]">{group.title}</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarGroup>
    )
}

export function AppSidebar({
    userRole,
    logoUrl,
    sidebarColor,
    sidebarForeground,
    sidebarActiveColor,
    sidebarActiveForeground,
    brandName,
    showBrandName,
}: {
    userRole: string
    logoUrl?: string
    sidebarColor?: string
    sidebarForeground?: string
    sidebarActiveColor?: string
    sidebarActiveForeground?: string
    brandName?: string
    showBrandName?: boolean
}) {
    const pathname = usePathname()
    const fg = sidebarForeground || 'black'

    const filterItems = (items: NavItem[]) =>
        items.filter(item => !item.roles || item.roles.length === 0 || item.roles.includes(userRole))

    return (
        <Sidebar
            className="border-r border-border/50 bg-sidebar transition-colors"
            style={{
                ...(sidebarColor ? {
                    '--sidebar': sidebarColor,
                    backgroundColor: sidebarColor,
                } : {}),
                ...(sidebarActiveColor ? {
                    '--sidebar-accent': sidebarActiveColor,
                } : {}),
                ...(sidebarActiveForeground ? {
                    '--sidebar-accent-foreground': sidebarActiveForeground,
                } : {}),
            } as React.CSSProperties}
        >
            <SidebarHeader className="h-[4.5rem] border-b border-border/40 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border/35 bg-white/10 px-3 py-2 backdrop-blur-sm">
                    {logoUrl ? (
                        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/40 bg-white/10 shadow-sm">
                            <img src={logoUrl} alt="Logo" className="object-contain w-full h-full" />
                        </div>
                    ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/90 shadow-sm">
                            <span className="text-primary-foreground text-lg font-bold leading-none">
                                {(brandName || 'G').charAt(0).toUpperCase()}
                            </span>
                        </div>
                    )}
                    {showBrandName !== false && (
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold tracking-tight" style={{ color: fg }}>
                                {brandName || 'GrowthCRM'}
                            </p>
                            <p className="truncate text-[11px] font-medium uppercase tracking-[0.08em] opacity-65" style={{ color: fg }}>
                                {formatRole(userRole)} workspace
                            </p>
                        </div>
                    )}
                </div>
            </SidebarHeader>

            <SidebarContent className="px-1 py-2">
                {navSections.map((section, sIdx) => (
                    <div key={sIdx}>
                        {section.label && (
                            <SidebarGroupLabel
                                className="px-4 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[0.14em] opacity-55"
                                style={{ color: fg }}
                            >
                                {section.label}
                            </SidebarGroupLabel>
                        )}
                        {filterItems(section.items).map((group, index) =>
                            group.url ? (
                                <DirectLinkItem key={index} group={group} fg={fg} pathname={pathname} />
                            ) : (
                                <CollapsibleNavGroup key={index} group={group} fg={fg} pathname={pathname} />
                            )
                        )}
                    </div>
                ))}
            </SidebarContent>
        </Sidebar>
    )
}
