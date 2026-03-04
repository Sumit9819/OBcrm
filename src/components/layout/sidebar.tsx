"use client"

import * as React from "react"
import { useState } from "react"
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
    icon: any
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
            // Admin view: see ALL leads across all agents
            {
                title: "All Agency Leads",
                icon: Users,
                items: [
                    { title: "All Leads", url: "/dashboard/leads/all" },
                    { title: "Add New Lead", url: "/dashboard/leads/new" },
                ],
                roles: ["super_admin", "agency_admin"],
            },
            // Agent view: only their own leads
            {
                title: "My Leads",
                icon: Users,
                items: [
                    { title: "My Leads", url: "/dashboard/leads/private" },
                    { title: "Add New Lead", url: "/dashboard/leads/new" },
                ],
                roles: ["agent"],
            },
            {
                title: "Students",
                icon: UserCheck,
                url: "/dashboard/students",
                roles: ["super_admin", "agency_admin", "staff"],
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
            {
                title: "User Management",
                icon: UserCog,
                url: "/dashboard/settings/users",
                roles: ["super_admin", "agency_admin"],
            },
        ],
    },
]

function CollapsibleNavGroup({ group }: { group: NavItem }) {
    const [open, setOpen] = useState(false)

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton
                        onClick={() => setOpen(!open)}
                        className="hover:bg-primary/5 transition-colors w-full justify-between"
                    >
                        <span className="flex items-center gap-3">
                            <group.icon className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{group.title}</span>
                        </span>
                        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>

            <div
                className={`overflow-hidden transition-all duration-200 ease-in-out ${open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}
            >
                <SidebarGroupContent>
                    <SidebarMenu>
                        {group.items?.map((item) => (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton asChild className="pl-11 hover:bg-primary/5 transition-colors">
                                    <a href={item.url} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                                        {item.title}
                                    </a>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroupContent>
            </div>
        </SidebarGroup>
    )
}

function DirectLinkItem({ group }: { group: NavItem }) {
    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip={group.title} className="hover:bg-primary/5 transition-colors">
                        <a href={group.url} className="flex items-center gap-3 py-2">
                            <group.icon className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{group.title}</span>
                        </a>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarGroup>
    )
}

export function AppSidebar({ userRole }: { userRole: string }) {
    const filterItems = (items: NavItem[]) =>
        items.filter(item => !item.roles || item.roles.length === 0 || item.roles.includes(userRole))

    return (
        <Sidebar className="border-r border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarHeader className="h-16 border-b px-4 flex justify-center border-border/40">
                <div className="flex items-center gap-2 font-semibold">
                    <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                        <span className="text-primary-foreground font-bold text-lg leading-none">G</span>
                    </div>
                    <span className="text-xl tracking-tight">GrowthCRM</span>
                </div>
            </SidebarHeader>

            <SidebarContent>
                {navSections.map((section, sIdx) => (
                    <div key={sIdx}>
                        {section.label && (
                            <SidebarGroupLabel className="px-4 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                {section.label}
                            </SidebarGroupLabel>
                        )}
                        {filterItems(section.items).map((group, index) =>
                            group.url ? (
                                <DirectLinkItem key={index} group={group} />
                            ) : (
                                <CollapsibleNavGroup key={index} group={group} />
                            )
                        )}
                    </div>
                ))}
            </SidebarContent>
        </Sidebar>
    )
}
