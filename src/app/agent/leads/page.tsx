import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ClipboardList } from "lucide-react"
import { format } from "date-fns"

const statusColors: Record<string, string> = {
    New: "bg-blue-100 text-blue-700",
    Contacted: "bg-yellow-100 text-yellow-700",
    Application: "bg-purple-100 text-purple-700",
    Offer: "bg-orange-100 text-orange-700",
    Visa: "bg-indigo-100 text-indigo-700",
    Enrolled: "bg-emerald-100 text-emerald-700",
}

// Human-readable stage progression
const STAGES = ["New", "Contacted", "Application", "Offer", "Visa", "Enrolled"]

export default async function AgentLeadsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: leads } = await supabase
        .from('leads')
        .select('id, first_name, last_name, email, phone, destination_country, course_interest, status, created_at')
        .eq('referred_by', user.id)
        .order('created_at', { ascending: false })

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardList className="h-6 w-6 text-primary" /> My Submitted Leads</h1>
                <p className="text-muted-foreground text-sm mt-1">{leads?.length || 0} leads submitted. Track their progress below.</p>
            </div>

            <div className="space-y-3">
                {!leads || leads.length === 0 ? (
                    <Card><CardContent className="h-32 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <p className="text-sm">No leads yet. Submit your first lead to get started.</p>
                    </CardContent></Card>
                ) : leads.map(lead => {
                    const stageIdx = STAGES.indexOf(lead.status)
                    return (
                        <Card key={lead.id} className="shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-semibold">{lead.first_name} {lead.last_name}</p>
                                            <Badge className={`text-xs border-none shadow-none ${statusColors[lead.status] || 'bg-slate-100'}`}>
                                                {lead.status}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {lead.destination_country} · {lead.course_interest}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {lead.phone}{lead.email ? ` · ${lead.email}` : ''}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-xs text-muted-foreground">{format(new Date(lead.created_at), 'MMM dd, yyyy')}</p>
                                    </div>
                                </div>

                                {/* Stage progress bar */}
                                <div className="mt-4">
                                    <div className="flex gap-1">
                                        {STAGES.map((s, i) => (
                                            <div
                                                key={s}
                                                title={s}
                                                className={`h-1.5 flex-1 rounded-full transition-all ${i <= stageIdx
                                                        ? i === STAGES.length - 1 ? 'bg-emerald-500' : 'bg-primary'
                                                        : 'bg-slate-200'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex justify-between mt-1">
                                        <span className="text-[10px] text-muted-foreground">New</span>
                                        <span className="text-[10px] text-muted-foreground">Enrolled</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
