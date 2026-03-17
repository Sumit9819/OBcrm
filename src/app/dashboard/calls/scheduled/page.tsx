import { createClient } from "@/lib/supabase/server"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { CalendarClock } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import { Button } from "@/components/ui/button"

function getFollowupStatus(dateText: string | null) {
    if (!dateText) return 'none'
    const when = new Date(dateText)
    const now = new Date()

    if (Number.isNaN(when.getTime())) return 'none'

    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)
    const endOfToday = new Date(now)
    endOfToday.setHours(23, 59, 59, 999)

    if (when < startOfToday) return 'overdue'
    if (when >= startOfToday && when <= endOfToday) return 'today'
    return 'upcoming'
}

export default async function ScheduledFollowupsPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; status?: string }>
}) {
    const supabase = await createClient()
    const params = await searchParams
    const query = (params.q || '').trim().toLowerCase()
    const statusFilter = (params.status || 'all').toLowerCase()

    const { data: followups } = await supabase
        .from("leads")
        .select(`
            id,
            first_name,
            last_name,
            phone,
            email,
            status,
            next_followup_at,
            assigned_user:users!leads_assigned_to_fkey(first_name, last_name)
        `)
        .not("next_followup_at", "is", null)
        .order("next_followup_at", { ascending: true })

    const filtered = (followups || []).filter((lead: any) => {
        const followupStatus = getFollowupStatus(lead.next_followup_at)
        const fullName = `${lead.first_name || ''} ${lead.last_name || ''}`.toLowerCase()
        const assignee = `${lead.assigned_user?.first_name || ''} ${lead.assigned_user?.last_name || ''}`.toLowerCase()
        const matchesSearch = !query || fullName.includes(query) || assignee.includes(query) || (lead.phone || '').toLowerCase().includes(query)
        const matchesStatus = statusFilter === 'all' || statusFilter === followupStatus
        return matchesSearch && matchesStatus
    })

    return (
        <div className="flex-1 space-y-8 p-4 pt-6 md:p-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Scheduled Follow-ups</h2>
                <p className="text-muted-foreground mt-1">Upcoming actions and follow-up tasks for your leads.</p>
            </div>

            <form className="grid gap-3 rounded-md border bg-card p-4 md:grid-cols-[1fr_180px_auto]" method="GET">
                <input
                    name="q"
                    defaultValue={params.q || ''}
                    placeholder="Search lead, phone, or assignee"
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                />
                <select
                    name="status"
                    defaultValue={statusFilter}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                    <option value="all">All</option>
                    <option value="today">Today</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="overdue">Overdue</option>
                </select>
                <div className="flex items-center gap-2">
                    <Button type="submit" size="sm">Filter</Button>
                    <Button asChild type="button" variant="outline" size="sm">
                        <Link href="/dashboard/calls/scheduled">Reset</Link>
                    </Button>
                </div>
            </form>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12 text-center">#</TableHead>
                            <TableHead>Lead Name</TableHead>
                            <TableHead>Assigned To</TableHead>
                            <TableHead>Follow-up Date</TableHead>
                            <TableHead>Follow-up Time</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length > 0 ? (
                            filtered.map((lead: any, i: number) => {
                                const followupDate = new Date(lead.next_followup_at)
                                const status = getFollowupStatus(lead.next_followup_at)
                                const statusLabel = status === 'today' ? 'Today' : status === 'overdue' ? 'Overdue' : 'Upcoming'
                                const badgeClass = status === 'today'
                                    ? 'bg-blue-100 text-blue-700'
                                    : status === 'overdue'
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-emerald-100 text-emerald-700'

                                return (
                                <TableRow key={lead.id}>
                                    <TableCell className="text-center font-medium text-muted-foreground">{i + 1}</TableCell>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <CalendarClock className="w-3.5 h-3.5 text-amber-500" />
                                            {lead.first_name} {lead.last_name}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {lead.assigned_user?.first_name
                                            ? `${lead.assigned_user.first_name} ${lead.assigned_user.last_name}`
                                            : 'Unassigned'}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {format(followupDate, 'MMM dd, yyyy')}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {format(followupDate, 'hh:mm a')}
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={badgeClass}>{statusLabel}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button asChild variant="outline" size="sm">
                                            <Link href={`/dashboard/leads/${lead.id}`}>Open Lead</Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                                )
                            })
                        ) : (
                            <TableRow>
                                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                                    No matching follow-ups found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
