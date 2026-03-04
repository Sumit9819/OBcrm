import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, TrendingUp, DollarSign, Clock, ArrowRight } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"

const statusColors: Record<string, string> = {
    New: "bg-blue-100 text-blue-700",
    Contacted: "bg-yellow-100 text-yellow-700",
    Application: "bg-purple-100 text-purple-700",
    Offer: "bg-orange-100 text-orange-700",
    Visa: "bg-indigo-100 text-indigo-700",
    Enrolled: "bg-emerald-100 text-emerald-700",
}

export default async function AgentDashboard() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('users')
        .select('first_name, commission_rate')
        .eq('id', user.id)
        .single()

    // Fetch agent's leads
    const { data: leads } = await supabase
        .from('leads')
        .select('id, first_name, last_name, status, created_at, destination_country')
        .eq('referred_by', user.id)
        .order('created_at', { ascending: false })

    // Fetch commissions
    const { data: commissions } = await supabase
        .from('agent_commissions')
        .select('amount, status')
        .eq('agent_id', user.id)

    const totalLeads = leads?.length || 0
    const enrolled = leads?.filter(l => l.status === 'Enrolled').length || 0
    const totalEarned = commissions?.filter(c => c.status === 'paid').reduce((s, c) => s + (c.amount || 0), 0) || 0
    const totalPending = commissions?.filter(c => c.status !== 'paid').reduce((s, c) => s + (c.amount || 0), 0) || 0
    const recentLeads = leads?.slice(0, 8) || []

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Welcome back, {profile?.first_name || 'Agent'} 👋</h1>
                <p className="text-muted-foreground text-sm mt-1">Here's how your referrals are performing.</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Leads Referred", value: totalLeads, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
                    { label: "Enrolled", value: enrolled, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: "Pending Commission", value: `$${totalPending.toFixed(2)}`, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
                    { label: "Total Earned", value: `$${totalEarned.toFixed(2)}`, icon: DollarSign, color: "text-violet-600", bg: "bg-violet-50" },
                ].map(stat => {
                    const Icon = stat.icon
                    return (
                        <Card key={stat.label} className="border-none shadow-sm">
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className={`h-10 w-10 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
                                    <Icon className={`h-5 w-5 ${stat.color}`} />
                                </div>
                                <div>
                                    <p className="text-xl font-bold leading-tight">{stat.value}</p>
                                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* Recent leads */}
            <Card className="shadow-sm">
                <div className="flex items-center justify-between px-5 py-4 border-b">
                    <h2 className="font-semibold text-sm">Recent Leads</h2>
                    <Link href="/agent/leads" className="text-xs text-primary flex items-center gap-1 hover:underline">
                        View all <ArrowRight className="h-3 w-3" />
                    </Link>
                </div>
                <CardContent className="p-0">
                    {recentLeads.length === 0 ? (
                        <div className="h-32 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                            <p className="text-sm">No leads submitted yet.</p>
                            <Link href="/agent/submit" className="text-xs text-primary hover:underline">Submit your first lead →</Link>
                        </div>
                    ) : recentLeads.map((lead, i) => (
                        <div key={lead.id} className={`flex items-center justify-between px-5 py-3 ${i < recentLeads.length - 1 ? 'border-b' : ''}`}>
                            <div>
                                <p className="font-medium text-sm">{lead.first_name} {lead.last_name}</p>
                                <p className="text-xs text-muted-foreground">{lead.destination_country} · {format(new Date(lead.created_at), 'MMM dd, yyyy')}</p>
                            </div>
                            <Badge className={`text-xs border-none shadow-none ${statusColors[lead.status] || 'bg-slate-100 text-slate-600'}`}>
                                {lead.status}
                            </Badge>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    )
}
