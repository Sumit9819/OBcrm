"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Phone } from "lucide-react"
import { format } from "date-fns"
import { LogCallDialog } from "@/components/leads/log-call-dialog"

export default function CallLogsPage() {
    const [calls, setCalls] = useState<any[]>([])
    const [leads, setLeads] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    const fetchData = async () => {
        setLoading(true)
        const [callsRes, leadsRes] = await Promise.all([
            supabase
                .from("activities")
                .select("*, leads(first_name, last_name, phone), users!activities_user_id_fkey(first_name, last_name)")
                .eq("type", "call")
                .order("created_at", { ascending: false }),
            supabase
                .from("leads")
                .select("id, first_name, last_name")
                .order("first_name", { ascending: true }),
        ])
        if (callsRes.data) setCalls(callsRes.data)
        if (leadsRes.data) setLeads(leadsRes.data)
        setLoading(false)
    }

    useEffect(() => { fetchData() }, [])

    return (
        <div className="flex-1 space-y-8 p-4 pt-6 md:p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Call Logs</h2>
                    <p className="text-muted-foreground mt-1">All recorded phone calls with leads.</p>
                </div>
                <LogCallDialog
                    leads={leads}
                    onLogged={fetchData}
                    triggerLabel="Log a Call"
                    triggerVariant="default"
                />
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12 text-center">#</TableHead>
                            <TableHead>Lead</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Notes</TableHead>
                            <TableHead>Called By</TableHead>
                            <TableHead>Date & Time</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">Loading call logs...</TableCell>
                            </TableRow>
                        ) : calls.length > 0 ? (
                            calls.map((call: any, i: number) => (
                                <TableRow key={call.id} className={i % 2 === 0 ? "bg-card" : "bg-muted/30"}>
                                    <TableCell className="text-center font-medium text-muted-foreground">{i + 1}</TableCell>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-3.5 h-3.5 text-blue-500" />
                                            {call.leads?.first_name} {call.leads?.last_name}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{call.leads?.phone || '—'}</TableCell>
                                    <TableCell className="max-w-[300px] truncate text-sm">{call.description}</TableCell>
                                    <TableCell className="text-sm">{call.users?.first_name} {call.users?.last_name}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {format(new Date(call.created_at), 'MMM dd, yyyy hh:mm a')}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                    No call logs recorded yet. Click &quot;Log a Call&quot; to get started.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
