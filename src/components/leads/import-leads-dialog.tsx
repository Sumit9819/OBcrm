"use client"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

type ParsedLead = {
    first_name: string
    last_name: string
    email: string
    phone?: string
    source?: string
    destination_country?: string
    course_interest?: string
    valid: boolean
    error?: string
}

export function ImportLeadsDialog({ onImported }: { onImported: () => void }) {
    const [open, setOpen] = useState(false)
    const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([])
    const [importing, setImporting] = useState(false)
    const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null)
    const fileRef = useRef<HTMLInputElement>(null)
    const supabase = createClient()

    const parseCSV = (text: string): ParsedLead[] => {
        const lines = text.trim().split('\n')
        if (lines.length < 2) return []

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
        const leads: ParsedLead[] = []

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
            const row: Record<string, string> = {}
            headers.forEach((h, idx) => { row[h] = values[idx] || '' })

            const firstName = row['first_name'] || row['firstname'] || row['name']?.split(' ')[0] || ''
            const lastName = row['last_name'] || row['lastname'] || row['name']?.split(' ').slice(1).join(' ') || ''
            const email = row['email'] || ''

            const valid = !!firstName && !!email
            leads.push({
                first_name: firstName,
                last_name: lastName,
                email,
                phone: row['phone'] || row['mobile'] || '',
                source: row['source'] || 'CSV Import',
                destination_country: row['destination_country'] || row['destination'] || row['country'] || '',
                course_interest: row['course_interest'] || row['course'] || '',
                valid,
                error: !valid ? (!firstName ? 'Missing name' : 'Missing email') : undefined,
            })
        }
        return leads
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (ev) => {
            const text = ev.target?.result as string
            const parsed = parseCSV(text)
            setParsedLeads(parsed)
            setImportResult(null)
        }
        reader.readAsText(file)
    }

    const handleImport = async () => {
        const validLeads = parsedLeads.filter(l => l.valid)
        if (validLeads.length === 0) return

        setImporting(true)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
            .from("users")
            .select("agency_id")
            .eq("id", user.id)
            .single()

        let success = 0
        let failed = 0

        for (const lead of validLeads) {
            const { error } = await supabase.from("leads").insert({
                agency_id: profile?.agency_id,
                owner_id: user.id,
                first_name: lead.first_name,
                last_name: lead.last_name,
                email: lead.email,
                phone: lead.phone || null,
                source: lead.source || 'CSV Import',
                destination_country: lead.destination_country || null,
                course_interest: lead.course_interest || null,
                status: 'New',
            })

            if (error) failed++
            else success++
        }

        setImportResult({ success, failed })
        setImporting(false)

        if (success > 0) {
            onImported()
        }
    }

    const validCount = parsedLeads.filter(l => l.valid).length
    const invalidCount = parsedLeads.filter(l => !l.valid).length

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setParsedLeads([]); setImportResult(null) } }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2"><Upload className="w-4 h-4" /> Import CSV</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Import Leads from CSV</DialogTitle>
                    <DialogDescription>
                        Upload a CSV file with columns: first_name, last_name, email, phone, source, destination_country, course_interest
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <div className="flex items-center gap-4 mb-4">
                        <input ref={fileRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
                        <Button variant="outline" onClick={() => fileRef.current?.click()} className="gap-2">
                            <FileSpreadsheet className="w-4 h-4" /> Select CSV File
                        </Button>
                        {parsedLeads.length > 0 && (
                            <div className="flex gap-2">
                                <Badge className="bg-emerald-500/10 text-emerald-600 shadow-none border-none">{validCount} valid</Badge>
                                {invalidCount > 0 && <Badge className="bg-red-500/10 text-red-500 shadow-none border-none">{invalidCount} invalid</Badge>}
                            </div>
                        )}
                    </div>

                    {parsedLeads.length > 0 && (
                        <div className="border rounded-md overflow-auto max-h-[400px]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-8"></TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Destination</TableHead>
                                        <TableHead>Course</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {parsedLeads.map((lead, i) => (
                                        <TableRow key={i} className={lead.valid ? "" : "bg-red-50"}>
                                            <TableCell>
                                                {lead.valid
                                                    ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                                                    : <AlertTriangle className="w-4 h-4 text-red-500" />
                                                }
                                            </TableCell>
                                            <TableCell className="font-medium">{lead.first_name} {lead.last_name}</TableCell>
                                            <TableCell className="text-sm">{lead.email || <span className="text-red-500">Missing</span>}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{lead.phone || '—'}</TableCell>
                                            <TableCell className="text-sm">{lead.destination_country || '—'}</TableCell>
                                            <TableCell className="text-sm">{lead.course_interest || '—'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {importResult && (
                        <div className="mt-4 p-4 rounded-md bg-muted text-sm">
                            <CheckCircle className="w-4 h-4 text-emerald-500 inline mr-2" />
                            Import complete: <strong>{importResult.success}</strong> leads imported
                            {importResult.failed > 0 && <>, <strong className="text-red-500">{importResult.failed}</strong> failed</>}.
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button onClick={handleImport} disabled={importing || validCount === 0 || !!importResult}>
                        {importing ? "Importing..." : `Import ${validCount} Lead${validCount !== 1 ? 's' : ''}`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
