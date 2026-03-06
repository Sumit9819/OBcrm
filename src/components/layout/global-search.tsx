"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Search, User, FileText, DollarSign } from "lucide-react"
import { useRouter } from "next/navigation"

type SearchResult = {
    type: 'lead' | 'invoice' | 'document'
    id: string
    title: string
    subtitle: string
    url: string
}

export function GlobalSearch() {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState("")
    const [results, setResults] = useState<SearchResult[]>([])
    const [loading, setLoading] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()
    const supabase = createClient()

    // Ctrl+K handler
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault()
                setOpen(true)
            }
        }
        document.addEventListener('keydown', handleKey)
        return () => document.removeEventListener('keydown', handleKey)
    }, [])

    // Focus input when dialog opens
    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 100)
    }, [open])

    const search = useCallback(async (q: string) => {
        if (q.length < 2) { setResults([]); return }
        setLoading(true)
        const items: SearchResult[] = []

        // Search leads
        const { data: leads } = await supabase
            .from('leads')
            .select('id, first_name, last_name, email, phone, status')
            .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
            .limit(5)

        if (leads) {
            leads.forEach(l => items.push({
                type: 'lead',
                id: l.id,
                title: `${l.first_name} ${l.last_name}`,
                subtitle: `${l.email} · ${l.status}`,
                url: `/dashboard/leads/${l.id}`,
            }))
        }

        // Search invoices
        const { data: invoices } = await supabase
            .from('invoices')
            .select('id, type, amount, currency, status, leads(first_name, last_name)')
            .or(`type.ilike.%${q}%,notes.ilike.%${q}%`)
            .limit(3)

        if (invoices) {
            invoices.forEach((inv: any) => items.push({
                type: 'invoice',
                id: inv.id,
                title: `Invoice — ${inv.type?.replace(/_/g, ' ')}`,
                subtitle: `${inv.currency} ${inv.amount} · ${inv.status} · ${inv.leads?.first_name || ''} ${inv.leads?.last_name || ''}`,
                url: '/dashboard/finances',
            }))
        }

        // Search documents
        const { data: docs } = await supabase
            .from('documents')
            .select('id, name, doc_type')
            .ilike('name', `%${q}%`)
            .limit(3)

        if (docs) {
            docs.forEach(d => items.push({
                type: 'document',
                id: d.id,
                title: d.name,
                subtitle: d.doc_type.replace(/_/g, ' '),
                url: '/dashboard/documents',
            }))
        }

        setResults(items)
        setLoading(false)
    }, [])

    useEffect(() => {
        const timer = setTimeout(() => search(query), 300)
        return () => clearTimeout(timer)
    }, [query, search])

    const iconMap = {
        lead: User,
        invoice: DollarSign,
        document: FileText,
    }

    const handleSelect = (result: SearchResult) => {
        setOpen(false)
        setQuery("")
        router.push(result.url)
    }

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-muted/30 hover:bg-muted/50 text-muted-foreground transition-colors text-sm"
            >
                <Search className="w-4 h-4" />
                <span className="hidden md:inline">Search...</span>
                <kbd className="hidden md:inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Ctrl K
                </kbd>
            </button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-lg p-0 gap-0">
                    <div className="flex items-center border-b px-3">
                        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                        <Input
                            ref={inputRef}
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Search leads, invoices, documents..."
                            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
                        />
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                        {loading && (
                            <div className="p-4 text-center text-sm text-muted-foreground">Searching...</div>
                        )}
                        {!loading && query.length >= 2 && results.length === 0 && (
                            <div className="p-4 text-center text-sm text-muted-foreground">No results found.</div>
                        )}
                        {!loading && results.length > 0 && (
                            <div className="py-2">
                                {results.map(r => {
                                    const Icon = iconMap[r.type]
                                    return (
                                        <button
                                            key={`${r.type}-${r.id}`}
                                            onClick={() => handleSelect(r)}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${r.type === 'lead' ? 'bg-blue-500/10 text-blue-500' :
                                                r.type === 'invoice' ? 'bg-emerald-500/10 text-emerald-500' :
                                                    'bg-purple-500/10 text-purple-500'
                                                }`}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium truncate">{r.title}</p>
                                                <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                        {!loading && query.length < 2 && (
                            <div className="p-4 text-center text-sm text-muted-foreground">Type at least 2 characters to search.</div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
