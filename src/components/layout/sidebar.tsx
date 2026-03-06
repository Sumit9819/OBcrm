"use client"

import * as React from "react"
import { useState } from "react"
import Link from "next/link"
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
    UserCog,
    Banknote,
    Mail,
    Coffee,
    GraduationCap,
    Kanban,
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
                roles: ["agent"],
            },
            {
                title: "Students",
                icon: UserCheck,
                url: "/dashboard/students",
                roles: ["super_admin", "agency_admin", "staff", "agent"],
            },
            {
                title: "Learners",
                icon: GraduationCap,
                url: "/dashboard/learners",
                roles: ["super_admin", "agency_admin", "staff", "agent"],
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

function CollapsibleNavGroup({ group, fg }: { group: NavItem, fg: string }) {
    const [open, setOpen] = useState(false)

    return (
        <SidebarGroup className="px-3 py-0.5">
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton
                        onClick={() => setOpen(!open)}
                        className="hover:bg-white/10 transition-all rounded-md w-full justify-between h-9 group opacity-90 hover:opacity-100"
                        style={{ color: fg }}
                    >
                        <span className="flex items-center gap-3">
                            <group.icon className="h-[18px] w-[18px] opacity-70 group-hover:opacity-100 transition-opacity" style={{ color: fg }} strokeWidth={1.5} />
                            <span className="font-medium text-[13px]">{group.title}</span>
                        </span>
                        <ChevronDown className={`h-3.5 w-3.5 opacity-50 transition-transform duration-200 ${open ? "rotate-180" : ""}`} style={{ color: fg }} />
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
                                <SidebarMenuButton asChild className="pl-[2.75rem] h-8 hover:bg-transparent">
                                    <Link href={item.url} className="text-[13px] font-medium opacity-60 hover:opacity-100 transition-all" style={{ color: fg }}>
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

function DirectLinkItem({ group, fg }: { group: NavItem, fg: string }) {
    return (
        <SidebarGroup className="px-3 py-0.5">
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip={group.title} className="hover:bg-white/10 transition-all rounded-md h-9 group opacity-90 hover:opacity-100">
                        <Link href={group.url!} className="flex items-center gap-3" style={{ color: fg }}>
                            <group.icon className="h-[18px] w-[18px] opacity-70 group-hover:opacity-100 transition-opacity" style={{ color: fg }} strokeWidth={1.5} />
                            <span className="font-medium text-[13px]">{group.title}</span>
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
    brandName,
    showBrandName,
}: {
    userRole: string
    logoUrl?: string
    sidebarColor?: string
    sidebarForeground?: string
    brandName?: string
    showBrandName?: boolean
}) {
    const fg = sidebarForeground || 'black'

    const filterItems = (items: NavItem[]) =>
        items.filter(item => !item.roles || item.roles.length === 0 || item.roles.includes(userRole))

    return (
        <Sidebar
            className="border-r border-border/40 transition-colors"
            style={sidebarColor ? {
                '--sidebar': sidebarColor,
                backgroundColor: sidebarColor,
            } as React.CSSProperties : undefined}
        >
            <SidebarHeader className="h-16 border-b px-4 flex justify-center border-border/40">
                <div className="flex items-center gap-2.5 font-semibold min-w-0">
                    {logoUrl ? (
                        <div className="h-8 w-8 shrink-0 overflow-hidden flex items-center justify-center relative rounded-md">
                            <img src={logoUrl} alt="Logo" className="object-contain w-full h-full" />
                        </div>
                    ) : (
                        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                            <span className="text-primary-foreground font-bold text-lg leading-none">
                                {(brandName || 'G').charAt(0).toUpperCase()}
                            </span>
                        </div>
                    )}
                    {showBrandName !== false && (
                        <span className="text-xl tracking-tight truncate" style={{ color: fg }}>
                            {brandName || 'GrowthCRM'}
                        </span>
                    )}
                </div>
            </SidebarHeader>

            <SidebarContent>
                {navSections.map((section, sIdx) => (
                    <div key={sIdx}>
                        {section.label && (
                            <SidebarGroupLabel
                                className="px-4 pt-6 pb-2 text-[10px] font-semibold uppercase tracking-wider opacity-40"
                                style={{ color: fg }}
                            >
                                {section.label}
                            </SidebarGroupLabel>
                        )}
                        {filterItems(section.items).map((group, index) =>
                            group.url ? (
                                <DirectLinkItem key={index} group={group} fg={fg} />
                            ) : (
                                <CollapsibleNavGroup key={index} group={group} fg={fg} />
                            )
                        )}
                    </div>
                ))}
            </SidebarContent>
        </Sidebar>
    )
}
