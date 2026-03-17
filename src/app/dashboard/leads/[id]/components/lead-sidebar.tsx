"use client"

import { format } from "date-fns"
import { BookOpen, Globe, CheckSquare, GraduationCap, Phone, MessageSquare } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface LeadSidebarProps {
    lead: any
    staffList: any[]
    isPending: boolean
    onAssign: (userId: string) => void
    onLogCallClick: () => void
    onAddTaskClick: () => void
    onConvertClick: () => void
}

export function LeadSidebar({
    lead,
    staffList,
    isPending,
    onAssign,
    onLogCallClick,
    onAddTaskClick,
    onConvertClick
}: LeadSidebarProps) {
    return (
        <div className="space-y-6 flex flex-col lg:sticky lg:top-6">
            <Card className="border shadow-sm overflow-hidden border-border/50">
                <CardHeader className="pb-3 border-b border-border/50 bg-muted/10">
                    <CardTitle className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                        Properties
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                    <div>
                        <p className="text-xs text-muted-foreground whitespace-nowrap font-medium">Destination</p>
                        <p className="text-sm font-medium mt-1 flex items-center gap-2">
                            <Globe className="h-3.5 w-3.5 text-muted-foreground/70" />
                            {lead.destination_country || '—'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground whitespace-nowrap font-medium">Course Interest</p>
                        <p className="text-sm font-medium mt-1 flex items-center gap-2">
                            <BookOpen className="h-3.5 w-3.5 text-muted-foreground/70" />
                            {lead.course_interest || '—'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground whitespace-nowrap font-medium mb-1.5">Assigned To</p>
                        <Select
                            value={lead.assigned_to || "unassigned"}
                            onValueChange={v => onAssign(v === "unassigned" ? "" : v)}
                            disabled={isPending}
                        >
                            <SelectTrigger className="h-8 text-sm font-medium border bg-background shadow-sm hover:bg-muted/30 transition-colors">
                                <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                {staffList.map(s => (
                                    <SelectItem key={s.id} value={s.id}>
                                        {s.first_name} {s.last_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="pt-3 border-t border-border/50 text-[11px] text-muted-foreground font-medium">
                        Added {format(new Date(lead.created_at), 'MMM dd, yyyy')}
                        {lead.referrer && ` via ${lead.referrer.first_name}`}
                    </div>
                </CardContent>
            </Card>

            <Card className="border shadow-sm overflow-hidden border-border/50">
                <CardHeader className="p-4 pb-3 border-b border-border/50 bg-muted/10">
                    <CardTitle className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                        Quick Actions
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-3 grid gap-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        className="w-full justify-start text-sm font-medium bg-background border shadow-sm hover:bg-muted transition-colors"
                        onClick={onLogCallClick}
                    >
                        <Phone className="h-3.5 w-3.5 mr-2 text-muted-foreground" /> Log a Call
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        className="w-full justify-start text-sm font-medium bg-background border shadow-sm hover:bg-muted transition-colors"
                        onClick={onAddTaskClick}
                    >
                        <CheckSquare className="h-3.5 w-3.5 mr-2 text-muted-foreground" /> Add a Task
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 transition-colors"
                        onClick={onConvertClick}
                    >
                        <GraduationCap className="h-3.5 w-3.5 mr-2" /> Convert Lead
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
