import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Clock, CheckCircle2, AlertCircle } from "lucide-react"
import { format } from "date-fns"

const statusConfig = {
    pending: { label: "Pending", icon: Clock, className: "bg-amber-100 text-amber-700" },
    approved: { label: "Approved", icon: AlertCircle, className: "bg-blue-100 text-blue-700" },
    paid: { label: "Paid", icon: CheckCircle2, className: "bg-emerald-100 text-emerald-700" },
}

export default async function AgentCommissionPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('users')
        .select('commission_rate, first_name')
        .eq('id', user.id)
        .single()

    const { data: commissions } = await supabase
        .from('agent_commissions')
        .select(`
            id, rate, amount, currency, status, notes, paid_at, created_at,
            leads(first_name, last_name, destination_country)
        `)
        .eq('agent_id', user.id)
        .order('created_at', { ascending: false })

    const totalPending = commissions?.filter(c => c.status !== 'paid').reduce((s, c) => s + (c.amount || 0), 0) || 0
    const totalPaid = commissions?.filter(c => c.status === 'paid').reduce((s, c) => s + (c.amount || 0), 0) || 0
    const currency = commissions?.[0]?.currency || 'USD'

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2"><DollarSign className="h-6 w-6 text-primary" /> Commission</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Your default commission rate: <strong>{profile?.commission_rate || 0}%</strong> per enrolled lead.
                </p>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card className="border-none shadow-sm bg-amber-50">
                    <CardContent className="p-4">
                        <p className="text-2xl font-bold text-amber-700">{currency} {totalPending.toFixed(2)}</p>
                        <p className="text-xs text-amber-600 mt-0.5">Pending Payout</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-emerald-50">
                    <CardContent className="p-4">
                        <p className="text-2xl font-bold text-emerald-700">{currency} {totalPaid.toFixed(2)}</p>
                        <p className="text-xs text-emerald-600 mt-0.5">Total Paid Out</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-violet-50">
                    <CardContent className="p-4">
                        <p className="text-2xl font-bold text-violet-700">{currency} {(totalPending + totalPaid).toFixed(2)}</p>
                        <p className="text-xs text-violet-600 mt-0.5">Total Earned</p>
                    </CardContent>
                </Card>
            </div>

            {/* Commission table */}
            <Card className="shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b bg-muted/30">
                    <p className="text-sm font-semibold">Commission Records</p>
                </div>
                <CardContent className="p-0">
                    {!commissions || commissions.length === 0 ? (
                        <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
                            No commission records yet. Commissions appear when your leads enroll.
                        </div>
                    ) : commissions.map((c, i) => {
                        const lead = (c.leads as any)
                        const cfg = statusConfig[c.status as keyof typeof statusConfig] || statusConfig.pending
                        const Icon = cfg.icon
                        return (
                            <div key={c.id} className={`flex items-center justify-between px-5 py-4 ${i < commissions.length - 1 ? 'border-b' : ''} hover:bg-muted/20`}>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm">{lead?.first_name} {lead?.last_name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {lead?.destination_country} · Rate: {c.rate}% · Enrolled {format(new Date(c.created_at), 'MMM dd, yyyy')}
                                        {c.paid_at ? ` · Paid ${format(new Date(c.paid_at), 'MMM dd, yyyy')}` : ''}
                                    </p>
                                    {c.notes && <p className="text-xs text-muted-foreground italic mt-0.5">Note: {c.notes}</p>}
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <p className="font-bold text-sm">{c.currency} {c.amount ? c.amount.toFixed(2) : '—'}</p>
                                    <Badge className={`text-xs border-none shadow-none gap-1 ${cfg.className}`}>
                                        <Icon className="h-3 w-3" /> {cfg.label}
                                    </Badge>
                                </div>
                            </div>
                        )
                    })}
                </CardContent>
            </Card>
        </div>
    )
}
