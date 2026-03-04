import { createClient } from "@/lib/supabase/server"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Globe } from "lucide-react"
import { format } from "date-fns"

export default async function SharedLeadsPage() {
    const supabase = await createClient()

    const { data: leads } = await supabase
        .from("leads")
        .select("*")
        .eq("is_shared_with_company", true)
        .order("created_at", { ascending: false })

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'New': return 'bg-blue-500/10 text-blue-500'
            case 'Contacted': return 'bg-yellow-500/10 text-yellow-500'
            case 'Application': return 'bg-purple-500/10 text-purple-500'
            case 'Offer': return 'bg-emerald-500/10 text-emerald-500'
            case 'Visa': return 'bg-indigo-500/10 text-indigo-500'
            case 'Enrolled': return 'bg-teal-500/10 text-teal-500'
            default: return 'bg-gray-500/10 text-gray-500'
        }
    }

    return (
        <div className="flex-1 space-y-8 p-4 pt-6 md:p-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Shared Leads</h2>
                <p className="text-muted-foreground mt-1">Leads shared across the entire agency.</p>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Student Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Course Interest</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date Added</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {leads && leads.length > 0 ? (
                            leads.map((lead) => (
                                <TableRow key={lead.id} className="hover:bg-muted/50">
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <Globe className="h-3.5 w-3.5 text-emerald-500" />
                                            {lead.first_name} {lead.last_name}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{lead.email}</TableCell>
                                    <TableCell>{lead.course_interest || '—'}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className={`font-semibold ${getStatusColor(lead.status)}`}>
                                            {lead.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {format(new Date(lead.created_at), 'MMM dd, yyyy')}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                    No shared leads found. Agents can share leads from their private pipeline.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
