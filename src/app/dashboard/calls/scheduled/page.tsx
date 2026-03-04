import { createClient } from "@/lib/supabase/server"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { CalendarClock } from "lucide-react"
import { format } from "date-fns"

export default async function ScheduledFollowupsPage() {
    const supabase = await createClient()

    // Fetch recent notes/calls that could serve as follow-ups (latest activities)
    const { data: followups } = await supabase
        .from("activities")
        .select("*, leads(first_name, last_name, phone), users!activities_user_id_fkey(first_name, last_name)")
        .order("created_at", { ascending: false })
        .limit(20)

    return (
        <div className="flex-1 space-y-8 p-4 pt-6 md:p-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Scheduled Follow-ups</h2>
                <p className="text-muted-foreground mt-1">Upcoming actions and follow-up tasks for your leads.</p>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12 text-center">#</TableHead>
                            <TableHead>Lead</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Assigned To</TableHead>
                            <TableHead>Scheduled Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {followups && followups.length > 0 ? (
                            followups.map((f: any, i: number) => (
                                <TableRow key={f.id}>
                                    <TableCell className="text-center font-medium text-muted-foreground">{i + 1}</TableCell>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <CalendarClock className="w-3.5 h-3.5 text-amber-500" />
                                            {f.leads?.first_name} {f.leads?.last_name}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="capitalize">{f.type}</Badge>
                                    </TableCell>
                                    <TableCell className="max-w-[300px] truncate text-sm">{f.description}</TableCell>
                                    <TableCell className="text-sm">{f.users?.first_name} {f.users?.last_name}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {format(new Date(f.created_at), 'MMM dd, yyyy')}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                    No follow-ups scheduled. Create follow-ups by logging activities on leads.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
