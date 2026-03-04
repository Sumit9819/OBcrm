import { createClient } from "@/lib/supabase/server"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Briefcase } from "lucide-react"
import { format } from "date-fns"

export default async function OffersPage() {
    const supabase = await createClient()

    const { data: applications } = await supabase
        .from("applications")
        .select("*, leads(first_name, last_name)")
        .order("created_at", { ascending: false })

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Draft': return 'bg-slate-500/10 text-slate-500'
            case 'Lodged': return 'bg-blue-500/10 text-blue-500'
            case 'Conditional Offer': return 'bg-amber-500/10 text-amber-600'
            case 'Unconditional Offer': return 'bg-emerald-500/10 text-emerald-600'
            case 'Rejected': return 'bg-red-500/10 text-red-500'
            default: return 'bg-gray-500/10 text-gray-500'
        }
    }

    return (
        <div className="flex-1 space-y-8 p-4 pt-6 md:p-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Offers & COE</h2>
                <p className="text-muted-foreground mt-1">Track university applications, offers, and confirmations.</p>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>University</TableHead>
                            <TableHead>Course</TableHead>
                            <TableHead>Intake</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Applied</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {applications && applications.length > 0 ? (
                            applications.map((app: any) => (
                                <TableRow key={app.id} className="hover:bg-muted/50">
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                                            {app.leads?.first_name} {app.leads?.last_name}
                                        </div>
                                    </TableCell>
                                    <TableCell>{app.university_name || '—'}</TableCell>
                                    <TableCell>{app.course_name || '—'}</TableCell>
                                    <TableCell className="text-sm">{app.intake_season || '—'}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className={`font-semibold shadow-none border-none ${getStatusColor(app.status)}`}>
                                            {app.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {format(new Date(app.created_at), 'MMM dd, yyyy')}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                    No applications lodged yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
