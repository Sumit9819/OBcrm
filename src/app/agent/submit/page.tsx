"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Send, Loader2, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

export default function AgentSubmitLead() {
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    // Form state
    const [form, setForm] = useState({
        firstName: "", lastName: "", phone: "", email: "",
        destination: "", course: "", notes: ""
    })
    const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.firstName || !form.lastName || !form.phone || !form.destination || !form.course) {
            toast.error("Please fill in all required fields.")
            return
        }
        setSubmitting(true)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { toast.error("Session expired. Please login again."); setSubmitting(false); return }

        const { data: profile } = await supabase.from('users').select('agency_id').eq('id', user.id).single()
        if (!profile?.agency_id) { toast.error("Could not load your profile."); setSubmitting(false); return }

        const { error } = await supabase.from('leads').insert({
            agency_id: profile.agency_id,
            owner_id: user.id,       // agent is the owner for tracking
            referred_by: user.id,        // commission trigger uses this
            first_name: form.firstName,
            last_name: form.lastName,
            phone: form.phone,
            email: form.email || null,
            destination_country: form.destination,
            course_interest: form.course,
            notes: form.notes || null,
            is_shared_with_company: true,           // always visible to internal team
            status: 'New',
        })

        if (error) { toast.error(`Failed: ${error.message}`); setSubmitting(false); return }

        setSubmitted(true)
    }

    if (submitted) {
        return (
            <div className="max-w-lg mx-auto mt-20 text-center space-y-4">
                <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
                <h2 className="text-2xl font-bold">Lead Submitted!</h2>
                <p className="text-muted-foreground">Our team will review and start working on this. You can track the status in <strong>My Leads</strong>.</p>
                <div className="flex gap-3 justify-center pt-2">
                    <Button variant="outline" onClick={() => { setSubmitted(false); setForm({ firstName: "", lastName: "", phone: "", email: "", destination: "", course: "", notes: "" }) }}>
                        Submit Another
                    </Button>
                    <Button onClick={() => router.push('/agent/leads')}>View My Leads</Button>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2"><Send className="h-6 w-6 text-primary" /> Submit a Lead</h1>
                <p className="text-muted-foreground text-sm mt-1">Fill in the student's details. Our team takes it from here.</p>
            </div>

            <Card className="shadow-sm">
                <CardHeader className="border-b py-4"><CardTitle className="text-sm font-semibold text-muted-foreground">Student Information</CardTitle></CardHeader>
                <CardContent className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>First Name <span className="text-red-500">*</span></Label>
                                <Input placeholder="Jane" value={form.firstName} onChange={e => set('firstName', e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Last Name <span className="text-red-500">*</span></Label>
                                <Input placeholder="Doe" value={form.lastName} onChange={e => set('lastName', e.target.value)} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Phone <span className="text-red-500">*</span></Label>
                                <Input placeholder="+977 9800000000" value={form.phone} onChange={e => set('phone', e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Email (optional)</Label>
                                <Input type="email" placeholder="jane@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Destination Country <span className="text-red-500">*</span></Label>
                                <Select onValueChange={v => set('destination', v)}>
                                    <SelectTrigger><SelectValue placeholder="Select country..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="AU">🇦🇺 Australia</SelectItem>
                                        <SelectItem value="UK">🇬🇧 United Kingdom</SelectItem>
                                        <SelectItem value="CA">🇨🇦 Canada</SelectItem>
                                        <SelectItem value="US">🇺🇸 United States</SelectItem>
                                        <SelectItem value="NZ">🇳🇿 New Zealand</SelectItem>
                                        <SelectItem value="IE">🇮🇪 Ireland</SelectItem>
                                        <SelectItem value="DE">🇩🇪 Germany</SelectItem>
                                        <SelectItem value="SG">🇸🇬 Singapore</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Course / Program <span className="text-red-500">*</span></Label>
                                <Input placeholder="e.g. Masters in Business" value={form.course} onChange={e => set('course', e.target.value)} />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label>Additional Notes (optional)</Label>
                            <Textarea
                                placeholder="Any context about this student — budget, timeline, previous education..."
                                value={form.notes}
                                onChange={e => set('notes', e.target.value)}
                                className="min-h-[80px] resize-none"
                            />
                        </div>

                        <div className="pt-2 border-t flex justify-end">
                            <Button type="submit" disabled={submitting} className="gap-2 min-w-[140px]">
                                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</> : <><Send className="h-4 w-4" /> Submit Lead</>}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
