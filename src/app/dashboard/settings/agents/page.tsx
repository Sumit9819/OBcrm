"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
    Users2, Plus, Pencil, CheckCircle2, DollarSign,
    Clock, TrendingUp, Loader2,
} from "lucide-react"

type Agent = {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    job_title: string | null
    commission_rate: number
    leads_count?: number
    enrolled_count?: number
    pending_commission?: number
    paid_commission?: number
}

export default function AgentsSettingsPage() {
    const [agents, setAgents] = useState<Agent[]>([])
    const [loading, setLoading] = useState(true)
    const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
    const [newRate, setNewRate] = useState("")
    const [saving, setSaving] = useState(false)
    const [inviteOpen, setInviteOpen] = useState(false)
    const [inviteEmail, setInviteEmail] = useState("")
    const [inviteFirst, setInviteFirst] = useState("")
    const [inviteLast, setInviteLast] = useState("")
    const supabase = createClient()

    useEffect(() => { loadAgents() }, [])

    async function loadAgents() {
        setLoading(true)
        const { data: agentUsers } = await supabase
            .from('users')
            .select('id, first_name, last_name, email, job_title, commission_rate')
            .eq('role', 'agent')
            .order('first_name')

        if (!agentUsers) { setLoading(false); return }

        // Enrich with commission and lead stats
        const enriched = await Promise.all(agentUsers.map(async (a) => {
            const { count: leadsCount } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('referred_by', a.id)
            const { count: enrolledCount } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('referred_by', a.id).eq('status', 'Enrolled')
            const { data: comms } = await supabase.from('agent_commissions').select('amount, status').eq('agent_id', a.id)
            return {
                ...a,
                leads_count: leadsCount || 0,
                enrolled_count: enrolledCount || 0,
                pending_commission: comms?.filter(c => c.status !== 'paid').reduce((s, c) => s + (c.amount || 0), 0) || 0,
                paid_commission: comms?.filter(c => c.status === 'paid').reduce((s, c) => s + (c.amount || 0), 0) || 0,
            }
        }))

        setAgents(enriched)
        setLoading(false)
    }

    async function saveRate() {
        if (!editingAgent) return
        setSaving(true)
        const rate = parseFloat(newRate)
        if (isNaN(rate) || rate < 0 || rate > 100) { toast.error("Commission rate must be between 0 and 100"); setSaving(false); return }
        const { error } = await supabase.from('users').update({ commission_rate: rate }).eq('id', editingAgent.id)
        if (error) { toast.error("Failed to update rate"); setSaving(false); return }
        toast.success(`Commission rate updated to ${rate}% for ${editingAgent.first_name}`)
        setEditingAgent(null)
        setSaving(false)
        loadAgents()
    }

    async function markAllPaid(agentId: string) {
        const { error } = await supabase.from('agent_commissions')
            .update({ status: 'paid', paid_at: new Date().toISOString() })
            .eq('agent_id', agentId).eq('status', 'pending')
        if (error) { toast.error("Failed"); return }
        toast.success("Marked all pending commissions as paid!")
        loadAgents()
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2"><Users2 className="h-6 w-6 text-primary" /> Agent Management</h1>
                    <p className="text-muted-foreground text-sm mt-1">Manage your external referral partners, commission rates, and payouts.</p>
                </div>
                <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2"><Plus className="h-4 w-4" /> Invite Agent</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Invite a Referral Agent</DialogTitle></DialogHeader>
                        <div className="space-y-4 pt-2">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5"><Label>First Name</Label><Input value={inviteFirst} onChange={e => setInviteFirst(e.target.value)} /></div>
                                <div className="space-y-1.5"><Label>Last Name</Label><Input value={inviteLast} onChange={e => setInviteLast(e.target.value)} /></div>
                            </div>
                            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} /></div>
                            <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2.5">
                                💡 After clicking Invite, create this user in <strong>Supabase Auth</strong> with role = <code>agent</code>.
                                They'll land on the Agent Portal at <code>/agent</code> when they log in.
                            </p>
                            <Button className="w-full" onClick={() => { toast.info(`Invite ${inviteFirst} ${inviteEmail} — create in Supabase Auth with role=agent`); setInviteOpen(false) }}>
                                Got it, I'll create in Supabase
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading agents...</div>
            ) : agents.length === 0 ? (
                <Card><CardContent className="h-32 flex items-center justify-center text-muted-foreground text-sm">No agents found. Invite your first referral partner.</CardContent></Card>
            ) : agents.map(agent => (
                <Card key={agent.id} className="shadow-sm">
                    <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                                    {(agent.first_name || '?')[0].toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-semibold">{agent.first_name} {agent.last_name}</p>
                                    <p className="text-sm text-muted-foreground">{agent.email}</p>
                                    {agent.job_title && <p className="text-xs text-muted-foreground">{agent.job_title}</p>}
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="flex gap-4 flex-wrap text-center">
                                {[
                                    { label: "Leads", value: agent.leads_count, icon: TrendingUp, color: "text-blue-600" },
                                    { label: "Enrolled", value: agent.enrolled_count, icon: CheckCircle2, color: "text-emerald-600" },
                                    { label: "Pending $", value: `$${(agent.pending_commission || 0).toFixed(0)}`, icon: Clock, color: "text-amber-600" },
                                    { label: "Paid $", value: `$${(agent.paid_commission || 0).toFixed(0)}`, icon: DollarSign, color: "text-violet-600" },
                                ].map(s => {
                                    const Icon = s.icon
                                    return (
                                        <div key={s.label} className="text-center min-w-[56px]">
                                            <Icon className={`h-4 w-4 mx-auto ${s.color}`} />
                                            <p className="font-bold text-sm mt-0.5">{s.value}</p>
                                            <p className="text-[10px] text-muted-foreground">{s.label}</p>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Commission rate + actions */}
                        <div className="mt-4 pt-4 border-t flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Commission rate:</span>
                                {editingAgent?.id === agent.id ? (
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number" min="0" max="100" step="0.5"
                                            value={newRate}
                                            onChange={e => setNewRate(e.target.value)}
                                            className="w-20 h-8 text-sm"
                                        />
                                        <span className="text-sm">%</span>
                                        <Button size="sm" onClick={saveRate} disabled={saving} className="h-8">
                                            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => setEditingAgent(null)} className="h-8">Cancel</Button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="font-mono">{agent.commission_rate}%</Badge>
                                        <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => { setEditingAgent(agent); setNewRate(String(agent.commission_rate)) }}>
                                            <Pencil className="h-3 w-3" /> Edit
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {(agent.pending_commission || 0) > 0 && (
                                <Button
                                    size="sm" variant="outline"
                                    className="h-8 gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                                    onClick={() => markAllPaid(agent.id)}
                                >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Mark ${agent.pending_commission?.toFixed(2)} as Paid
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
