"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { ShieldCheck, Search, Phone, MessageSquare, Mail, CheckCircle, Clock } from "lucide-react"
import Link from "next/link"

const TYPE_CONFIG: Record<string, { icon: any; color: string }> = {
    note: { icon: MessageSquare, color: "text-amber-600 bg-amber-50" },
    call: { icon: Phone, color: "text-blue-600 bg-blue-50" },
    email: { icon: Mail, color: "text-indigo-600 bg-indigo-50" },
    stage_change: { icon: CheckCircle, color: "text-emerald-600 bg-emerald-50" },
    default: { icon: Clock, color: "text-slate-600 bg-slate-50" },
}

export function AuditLogClient({ activities }: { activities: any[] }) {
    const [search, setSearch] = useState("")
    const [typeFilter, setTypeFilter] = useState("all")
    const [actorFilter, setActorFilter] = useState("all")

    const actors = [...new Map(
        activities
            .filter(a => a.actor)
            .map(a => [a.actor.id, a.actor])
    ).values()]

    const filtered = activities.filter(a => {
        const matchSearch =
            !search ||
            a.description?.toLowerCase().includes(search.toLowerCase()) ||
            `${a.lead?.first_name} ${a.lead?.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
            `${a.actor?.first_name} ${a.actor?.last_name}`.toLowerCase().includes(search.toLowerCase())
        const matchType = typeFilter === "all" || a.type === typeFilter
        const matchActor = actorFilter === "all" || a.actor?.id === actorFilter
        return matchSearch && matchType && matchActor
    })

    return (
        <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <ShieldCheck className="h-7 w-7 text-primary" /> Audit Log
                </h2>
                <p className="text-muted-foreground mt-1">
                    A full timeline of all actions taken across your agency ({activities.length} events).
                </p>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by lead, user, or description..."
                        className="pl-8"
                    />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="All types" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="note">Notes</SelectItem>
                        <SelectItem value="call">Calls</SelectItem>
                        <SelectItem value="email">Emails</SelectItem>
                        <SelectItem value="stage_change">Stage Changes</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={actorFilter} onValueChange={setActorFilter}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="All users" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        {actors.map(a => (
                            <SelectItem key={a.id} value={a.id}>
                                {a.first_name} {a.last_name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Log entries */}
            <div className="space-y-2">
                {filtered.length === 0 ? (
                    <Card><CardContent className="p-12 text-center text-muted-foreground">No audit events found.</CardContent></Card>
                ) : filtered.map(a => {
                    const conf = TYPE_CONFIG[a.type] || TYPE_CONFIG.default
                    const Icon = conf.icon
                    return (
                        <div key={a.id} className="flex gap-3 p-4 rounded-lg border bg-card hover:bg-muted/20 transition-colors">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${conf.color}`}>
                                <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="outline" className="text-xs capitalize">
                                        {a.type?.replace("_", " ")}
                                    </Badge>
                                    {a.actor && (
                                        <span className="text-xs text-muted-foreground font-medium">
                                            {a.actor.first_name} {a.actor.last_name}
                                        </span>
                                    )}
                                    {a.lead && (
                                        <>
                                            <span className="text-xs text-muted-foreground">on</span>
                                            <Link href={`/dashboard/leads/${a.lead.id}`} className="text-xs font-medium text-primary hover:underline">
                                                {a.lead.first_name} {a.lead.last_name}
                                            </Link>
                                        </>
                                    )}
                                </div>
                                <p className="text-sm mt-0.5">{a.description}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {format(new Date(a.created_at), "MMM dd, yyyy · h:mm a")}
                                </p>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
