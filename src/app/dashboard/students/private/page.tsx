import { createClient } from "@/lib/supabase/server"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { UserCheck } from "lucide-react"
import { format } from "date-fns"

export default async function MyStudentsPage() {
    const supabase = await createClient()

    // Students are leads owned by the current user that have reached Enrolled status
    const { data: students } = await supabase
        .from("leads")
        .select("*")
        .in("status", ["Enrolled", "Visa", "Offer"])
        .order("created_at", { ascending: false })

    return (
        <div className="flex-1 space-y-8 p-4 pt-6 md:p-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">My Students</h2>
                <p className="text-muted-foreground mt-1">Leads that have progressed to Offer, Visa, or Enrolled status.</p>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Student Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Destination</TableHead>
                            <TableHead>Course</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Since</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {students && students.length > 0 ? (
                            students.map((s) => (
                                <TableRow key={s.id} className="hover:bg-muted/50">
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                                            {s.first_name} {s.last_name}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{s.email || '—'}</TableCell>
                                    <TableCell>{s.destination_country || '—'}</TableCell>
                                    <TableCell>{s.course_interest || '—'}</TableCell>
                                    <TableCell>
                                        <Badge className="bg-emerald-500/10 text-emerald-600 shadow-none border-none">{s.status}</Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {format(new Date(s.created_at), 'MMM dd, yyyy')}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                    No students found. Leads will appear here once they reach Offer/Visa/Enrolled stage.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
