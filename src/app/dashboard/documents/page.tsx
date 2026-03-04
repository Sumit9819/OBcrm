"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
    FileText, Upload, AlertTriangle, Search, Trash2,
    Download, Eye, File, FileImage, Archive, X, CloudUpload,
} from "lucide-react"
import { format, differenceInDays } from "date-fns"
import { toast } from "sonner"

type Document = {
    id: string; name: string; doc_type: string; file_url: string
    file_size?: number; mime_type?: string
    expiry_date: string | null; created_at: string
    lead_id?: string | null
    leads: { first_name: string; last_name: string } | null
    users: { first_name: string; last_name: string } | null
}

const DOC_TYPES: Record<string, string> = {
    passport: "Passport", visa: "Visa", transcript: "Transcript",
    offer_letter: "Offer Letter", ielts: "IELTS / English Test",
    bank_statement: "Bank Statement", photo: "Photo", other: "Other",
}
const DOC_TYPE_COLORS: Record<string, string> = {
    passport: "bg-blue-100 text-blue-700",
    visa: "bg-purple-100 text-purple-700",
    transcript: "bg-emerald-100 text-emerald-700",
    offer_letter: "bg-amber-100 text-amber-700",
    ielts: "bg-teal-100 text-teal-700",
    bank_statement: "bg-orange-100 text-orange-700",
    other: "bg-slate-100 text-slate-600",
}

function FileIcon({ mimeType }: { mimeType?: string }) {
    if (!mimeType) return <FileText className="w-5 h-5 text-blue-400" />
    if (mimeType.startsWith("image/")) return <FileImage className="w-5 h-5 text-green-500" />
    if (mimeType === "application/pdf") return <FileText className="w-5 h-5 text-red-500" />
    if (mimeType.includes("zip") || mimeType.includes("rar")) return <Archive className="w-5 h-5 text-amber-500" />
    return <File className="w-5 h-5 text-slate-400" />
}

function formatBytes(bytes?: number) {
    if (!bytes) return ""
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentsPage() {
    const [documents, setDocuments] = useState<Document[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [filterType, setFilterType] = useState("all")
    const [showUpload, setShowUpload] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [leads, setLeads] = useState<any[]>([])
    const [dragOver, setDragOver] = useState(false)
    const [currentUser, setCurrentUser] = useState<any>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Upload form
    const [selectedLead, setSelectedLead] = useState("")
    const [docName, setDocName] = useState("")
    const [docType, setDocType] = useState("other")
    const [expiryDate, setExpiryDate] = useState("")
    const [file, setFile] = useState<File | null>(null)

    const supabase = createClient()

    const fetchDocuments = useCallback(async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase.from("users").select("agency_id, role").eq("id", user.id).single()
        setCurrentUser({ ...profile, id: user.id })

        const { data } = await supabase
            .from("documents")
            .select("*, leads(first_name, last_name), users:uploaded_by(first_name, last_name)")
            .eq("agency_id", profile?.agency_id)
            .order("created_at", { ascending: false })

        setDocuments((data as any) || [])
        setLoading(false)
    }, [])

    const fetchLeads = useCallback(async () => {
        const { data } = await supabase
            .from("leads")
            .select("id, first_name, last_name")
            .order("first_name", { ascending: true })
        setLeads(data || [])
    }, [])

    useEffect(() => {
        fetchDocuments()
        fetchLeads()
    }, [])

    const handleFileSelect = (selectedFile: File) => {
        setFile(selectedFile)
        if (!docName) setDocName(selectedFile.name.replace(/\.[^.]+$/, ""))
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)
        const dropped = e.dataTransfer.files[0]
        if (dropped) handleFileSelect(dropped)
    }

    const handleUpload = async () => {
        if (!file || !selectedLead || !docName) {
            toast.error("Please provide lead, document name and file"); return
        }
        setUploading(true)
        setUploadProgress(10)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const ext = file.name.split('.').pop()
        const filePath = `${currentUser?.agency_id}/${selectedLead}/${Date.now()}_${docName.replace(/[^a-zA-Z0-9]/g, '_')}.${ext}`

        setUploadProgress(30)
        const { error: uploadError } = await supabase.storage
            .from("documents")
            .upload(filePath, file, { upsert: false })

        if (uploadError) {
            toast.error("Upload failed: " + uploadError.message)
            setUploading(false)
            setUploadProgress(0)
            return
        }

        setUploadProgress(80)
        const { error: insertError } = await supabase.from("documents").insert({
            agency_id: currentUser?.agency_id,
            lead_id: selectedLead,
            uploaded_by: user.id,
            name: docName.trim(),
            doc_type: docType,
            file_url: filePath,
            file_size: file.size,
            mime_type: file.type,
            expiry_date: expiryDate || null,
        })

        setUploadProgress(100)

        if (insertError) {
            toast.error("Failed to save document record: " + insertError.message)
        } else {
            // Log activity for audit trail
            if (selectedLead) {
                await supabase.from("activities").insert({
                    agency_id: currentUser?.agency_id,
                    lead_id: selectedLead,
                    user_id: user.id,
                    type: "document",
                    description: `Document uploaded: ${docName.trim()}`,
                })
            }
            toast.success("Document uploaded successfully!")
            setShowUpload(false)
            setDocName(""); setDocType("other"); setExpiryDate(""); setFile(null); setSelectedLead("")
            fetchDocuments()
        }
        setUploading(false)
        setUploadProgress(0)
    }

    const handleDownload = async (doc: Document) => {
        const { data, error } = await supabase.storage
            .from("documents")
            .createSignedUrl(doc.file_url, 60)

        if (error || !data?.signedUrl) {
            toast.error("Could not generate download link")
            return
        }
        const a = document.createElement("a")
        a.href = data.signedUrl
        a.download = doc.name
        a.target = "_blank"
        a.click()
    }

    const handlePreview = async (doc: Document) => {
        if (!doc.mime_type?.startsWith("image/") && doc.mime_type !== "application/pdf") {
            handleDownload(doc); return
        }
        const { data } = await supabase.storage.from("documents").createSignedUrl(doc.file_url, 300)
        if (data?.signedUrl) window.open(data.signedUrl, "_blank")
    }

    const handleDelete = async (doc: Document) => {
        const { error: storageErr } = await supabase.storage.from("documents").remove([doc.file_url])
        if (storageErr) { toast.error("Failed to delete file: " + storageErr.message); return }
        await supabase.from("documents").delete().eq("id", doc.id)
        // Log activity for audit trail
        if (doc.lead_id) {
            const { data: { user } } = await supabase.auth.getUser()
            await supabase.from("activities").insert({
                agency_id: currentUser?.agency_id,
                lead_id: doc.lead_id,
                user_id: user?.id,
                type: "document",
                description: `Document deleted: ${doc.name}`,
            })
        }
        setDocuments(prev => prev.filter(d => d.id !== doc.id))
        toast.success("Document deleted")
    }

    const getExpiryBadge = (expiryDate: string | null) => {
        if (!expiryDate) return null
        const daysLeft = differenceInDays(new Date(expiryDate), new Date())
        if (daysLeft < 0) return <Badge className="bg-red-500/10 text-red-600 border-none shadow-none"><AlertTriangle className="w-3 h-3 mr-1" />Expired</Badge>
        if (daysLeft <= 30) return <Badge className="bg-amber-500/10 text-amber-600 border-none shadow-none"><AlertTriangle className="w-3 h-3 mr-1" />{daysLeft}d left</Badge>
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-none shadow-none">{format(new Date(expiryDate), "MMM dd, yyyy")}</Badge>
    }

    const filtered = documents.filter(d => {
        const matchSearch = `${d.name} ${d.leads?.first_name} ${d.leads?.last_name} ${d.doc_type}`
            .toLowerCase().includes(search.toLowerCase())
        const matchType = filterType === "all" || d.doc_type === filterType
        return matchSearch && matchType
    })

    const expiringSoon = documents.filter(d => {
        if (!d.expiry_date) return false
        const days = differenceInDays(new Date(d.expiry_date), new Date())
        return days >= 0 && days <= 30
    })

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 bg-slate-50/50 min-h-screen">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                        <FileText className="h-6 w-6 text-primary" /> Document Management
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                        Upload and track passports, visas, transcripts and all student documents.
                    </p>
                </div>
                <Button onClick={() => setShowUpload(true)} className="gap-2">
                    <Upload className="w-4 h-4" /> Upload Document
                </Button>
            </div>

            {/* Expiry Alerts */}
            {expiringSoon.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-800 flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4" /> {expiringSoon.length} document{expiringSoon.length > 1 ? "s" : ""} expiring within 30 days
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {expiringSoon.map(d => (
                            <Badge key={d.id} className="bg-white border border-amber-200 text-amber-700 shadow-none">
                                {d.leads?.first_name} {d.leads?.last_name} — {d.name} ({differenceInDays(new Date(d.expiry_date!), new Date())}d)
                            </Badge>
                        ))}
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: "Total Docs", value: documents.length, color: "text-slate-700" },
                    { label: "With Expiry", value: documents.filter(d => d.expiry_date).length, color: "text-blue-600" },
                    { label: "Expiring Soon", value: expiringSoon.length, color: "text-amber-600" },
                    { label: "Expired", value: documents.filter(d => d.expiry_date && differenceInDays(new Date(d.expiry_date), new Date()) < 0).length, color: "text-red-600" },
                ].map(s => (
                    <Card key={s.label} className="shadow-sm">
                        <CardContent className="p-4">
                            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                            <p className="text-xs text-muted-foreground">{s.label}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search by name, lead, type..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {Object.entries(DOC_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {/* Documents Table */}
            <Card className="shadow-sm overflow-hidden">
                <CardHeader className="py-3 border-b bg-primary">
                    <CardTitle className="text-sm text-white font-bold uppercase">Documents ({filtered.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead>Document</TableHead>
                                <TableHead>Lead</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Size</TableHead>
                                <TableHead>Expiry</TableHead>
                                <TableHead>Uploaded By</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">Loading documents...</TableCell></TableRow>
                            ) : filtered.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                    No documents. Click &quot;Upload Document&quot; to get started.
                                </TableCell></TableRow>
                            ) : filtered.map(doc => (
                                <TableRow key={doc.id} className="hover:bg-muted/30">
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <FileIcon mimeType={doc.mime_type} />
                                            <span className="font-medium text-sm max-w-[180px] truncate">{doc.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {doc.leads ? `${doc.leads.first_name} ${doc.leads.last_name}` : "—"}
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={`text-[10px] border-none shadow-none ${DOC_TYPE_COLORS[doc.doc_type] || DOC_TYPE_COLORS.other}`}>
                                            {DOC_TYPES[doc.doc_type] || doc.doc_type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{formatBytes(doc.file_size)}</TableCell>
                                    <TableCell>{getExpiryBadge(doc.expiry_date) || <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {doc.users ? `${doc.users.first_name} ${doc.users.last_name}` : "—"}
                                        <div className="text-[10px]">{format(new Date(doc.created_at), "MMM dd, yyyy")}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 justify-end">
                                            <button onClick={() => handlePreview(doc)} title="Preview" className="text-blue-500 hover:text-blue-700 p-1">
                                                <Eye className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => handleDownload(doc)} title="Download" className="text-emerald-500 hover:text-emerald-700 p-1">
                                                <Download className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => handleDelete(doc)} title="Delete" className="text-red-400 hover:text-red-600 p-1">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Upload Dialog */}
            <Dialog open={showUpload} onOpenChange={setShowUpload}>
                <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label>Lead *</Label>
                            <Select value={selectedLead} onValueChange={setSelectedLead}>
                                <SelectTrigger><SelectValue placeholder="Select lead..." /></SelectTrigger>
                                <SelectContent>
                                    {leads.map(l => (
                                        <SelectItem key={l.id} value={l.id}>{l.first_name} {l.last_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Drag and drop zone */}
                        <div
                            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${dragOver ? "border-primary bg-primary/5" : "border-slate-200 hover:border-slate-300"}`}
                            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input ref={fileInputRef} type="file" className="hidden" onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
                            {file ? (
                                <div className="flex items-center justify-center gap-3">
                                    <FileIcon mimeType={file.type} />
                                    <div className="text-left">
                                        <p className="text-sm font-medium">{file.name}</p>
                                        <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                                    </div>
                                    <button className="ml-2 text-red-400 hover:text-red-600" onClick={e => { e.stopPropagation(); setFile(null) }}>
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="text-muted-foreground">
                                    <CloudUpload className="h-10 w-10 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">Drag & drop a file or click to browse</p>
                                    <p className="text-xs mt-1">PDF, images, Word, Excel — up to 50 MB</p>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Document Name *</Label>
                                <Input placeholder="e.g. John's Passport" value={docName} onChange={e => setDocName(e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Document Type</Label>
                                <Select value={docType} onValueChange={setDocType}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(DOC_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label>Expiry Date (optional)</Label>
                            <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
                        </div>

                        {uploading && (
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Uploading...</span>
                                    <span>{uploadProgress}%</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowUpload(false)}>Cancel</Button>
                        <Button onClick={handleUpload} disabled={uploading || !file || !selectedLead || !docName} className="gap-2">
                            <Upload className="h-4 w-4" />
                            {uploading ? "Uploading..." : "Upload"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
