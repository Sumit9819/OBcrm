"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { FileCheck, ChevronDown, ChevronRight } from "lucide-react"
import { toast } from "sonner"

const checklistItems = [
    { key: 'gte_letter', label: 'GTE Letter' },
    { key: 'health_exam', label: 'Health Examination' },
    { key: 'biometrics', label: 'Biometrics' },
    { key: 'police_clearance', label: 'Police Clearance' },
    { key: 'interview_done', label: 'Interview/Counselling' },
    { key: 'visa_lodged', label: 'Visa Lodged' },
    { key: 'visa_granted', label: 'Visa Granted' },
]

export default function VisaPage() {
    const [leads, setLeads] = useState<any[]>([])
    const [checklists, setChecklists] = useState<Record<string, any>>({})
    const [expandedLead, setExpandedLead] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => { fetchData() }, [])

    const fetchData = async () => {
        setLoading(true)
        const { data: visaLeads } = await supabase
            .from('leads')
            .select('id, first_name, last_name, email, destination_country, course_interest, status')
            .eq('status', 'Visa')
            .order('created_at', { ascending: false })

        if (visaLeads) setLeads(visaLeads)

        const { data: checklistData } = await supabase
            .from('visa_checklists')
            .select('*')

        if (checklistData) {
            const mapped: Record<string, any> = {}
            checklistData.forEach(c => { mapped[c.lead_id] = c })
            setChecklists(mapped)
        }
        setLoading(false)
    }

    const handleToggle = async (leadId: string, field: string, checked: boolean) => {
        const existing = checklists[leadId]

        if (existing) {
            const { error } = await supabase
                .from('visa_checklists')
                .update({ [field]: checked, updated_at: new Date().toISOString() })
                .eq('id', existing.id)
            if (error) { toast.error(error.message); return }
        } else {
            // Get lead's agency_id
            const lead = leads.find(l => l.id === leadId)
            const { data: { user } } = await supabase.auth.getUser()
            const { data: userData } = await supabase.from('users').select('agency_id').eq('id', user?.id).single()

            const { error } = await supabase
                .from('visa_checklists')
                .insert({ lead_id: leadId, agency_id: userData?.agency_id, [field]: checked })
            if (error) { toast.error(error.message); return }
        }

        // Update local state
        setChecklists(prev => ({
            ...prev,
            [leadId]: { ...prev[leadId], [field]: checked }
        }))
        toast.success("Checklist updated")
    }

    const getCompletionCount = (leadId: string) => {
        const cl = checklists[leadId]
        if (!cl) return 0
        return checklistItems.filter(item => cl[item.key]).length
    }

    return (
        <div className="flex-1 space-y-8 p-4 pt-6 md:p-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Visa Processing</h2>
                <p className="text-muted-foreground mt-1">Track visa applications and document checklists.</p>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-10" />
                            <TableHead>Student</TableHead>
                            <TableHead>Destination</TableHead>
                            <TableHead>Course</TableHead>
                            <TableHead>Checklist</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Loading...</TableCell>
                            </TableRow>
                        ) : leads.length > 0 ? (
                            leads.map(lead => (
                                <>
                                    <TableRow
                                        key={lead.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => setExpandedLead(expandedLead === lead.id ? null : lead.id)}
                                    >
                                        <TableCell>
                                            {expandedLead === lead.id ? (
                                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                            )}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <FileCheck className="w-3.5 h-3.5 text-indigo-500" />
                                                {lead.first_name} {lead.last_name}
                                            </div>
                                        </TableCell>
                                        <TableCell>{lead.destination_country || '—'}</TableCell>
                                        <TableCell className="text-sm">{lead.course_interest || '—'}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-mono">
                                                {getCompletionCount(lead.id)}/{checklistItems.length}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                    {expandedLead === lead.id && (
                                        <TableRow key={`${lead.id}-checklist`}>
                                            <TableCell colSpan={5} className="bg-muted/30 px-8 py-4">
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    {checklistItems.map(item => (
                                                        <label key={item.key} className="flex items-center gap-2 cursor-pointer text-sm">
                                                            <Checkbox
                                                                checked={!!checklists[lead.id]?.[item.key]}
                                                                onCheckedChange={(checked) => handleToggle(lead.id, item.key, !!checked)}
                                                            />
                                                            <span className={checklists[lead.id]?.[item.key] ? 'line-through text-muted-foreground' : ''}>
                                                                {item.label}
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                    No leads currently in Visa stage.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
