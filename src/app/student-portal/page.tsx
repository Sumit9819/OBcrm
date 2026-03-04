"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
    GraduationCap, FileText, Download, Upload, MessageCircle,
    Clock, CheckCircle, Phone, Mail,
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

const stepLabels = ['New', 'Contacted', 'Application', 'Offer', 'Visa', 'Enrolled']

const activityIcons: Record<string, any> = {
    'note': MessageCircle,
    'call': Phone,
    'email': Mail,
    'stage_change': CheckCircle,
}

export default function StudentPortalPage() {
    const [lead, setLead] = useState<any>(null)
    const [applications, setApplications] = useState<any[]>([])
    const [invoices, setInvoices] = useState<any[]>([])
    const [activities, setActivities] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showUpload, setShowUpload] = useState(false)
    const [receiptFile, setReceiptFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const router = useRouter()

    const supabase = createClient()

    useEffect(() => {
        async function load() {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Get lead record (students are linked as leads)
            const { data: leadData } = await supabase
                .from('leads')
                .select('*')
                .eq('email', user.email)
                .single()

            if (!leadData) { setLoading(false); return }
            setLead(leadData)

            // Fetch related data in parallel
            const [appsRes, invoicesRes, activitiesRes] = await Promise.all([
                supabase.from('applications').select('*').eq('lead_id', leadData.id).order('created_at', { ascending: false }),
                supabase.from('invoices').select('*').eq('lead_id', leadData.id).order('created_at', { ascending: false }),
                supabase.from('activities').select('*, users!activities_user_id_fkey(first_name, last_name)').eq('lead_id', leadData.id).order('created_at', { ascending: false }).limit(20),
            ])

            if (appsRes.data) setApplications(appsRes.data)
            if (invoicesRes.data) setInvoices(invoicesRes.data)
            if (activitiesRes.data) setActivities(activitiesRes.data)
            setLoading(false)
        }
        load()
    }, [])

    const currentStepIndex = lead ? stepLabels.indexOf(lead.status) : 0
    const progress = lead ? ((currentStepIndex + 1) / stepLabels.length) * 100 : 0

    const handleDownloadInvoice = async (invoiceId: string) => {
        // Try to find a document of type invoice for this lead
        const { data: docs } = await supabase
            .from('documents')
            .select('storage_path')
            .eq('lead_id', lead.id)
            .eq('doc_type', 'financial')
            .limit(1)

        if (docs && docs.length > 0) {
            const { data } = await supabase.storage
                .from('documents')
                .createSignedUrl(docs[0].storage_path, 3600)
            if (data?.signedUrl) {
                window.open(data.signedUrl, '_blank')
                return
            }
        }
        toast.error("No invoice PDF available yet. Contact your agent.")
    }

    const handleUploadReceipt = async () => {
        if (!receiptFile || !lead) return
        setUploading(true)
        const path = `receipts/${lead.id}/${Date.now()}_${receiptFile.name}`
        const { error: uploadErr } = await supabase.storage
            .from('documents')
            .upload(path, receiptFile)

        if (uploadErr) {
            toast.error("Upload failed: " + uploadErr.message)
        } else {
            // Save reference in documents table
            const { data: { user } } = await supabase.auth.getUser()
            await supabase.from('documents').insert({
                agency_id: lead.agency_id,
                lead_id: lead.id,
                uploaded_by: user?.id,
                name: receiptFile.name,
                doc_type: 'financial',
                storage_path: path,
            })
            toast.success("Receipt uploaded! Your agent will verify the payment.")
            setShowUpload(false)
            setReceiptFile(null)
        }
        setUploading(false)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-muted-foreground">Loading your portal...</p>
            </div>
        )
    }

    if (!lead) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <GraduationCap className="w-12 h-12 text-muted-foreground/30" />
                <p className="text-muted-foreground">No student record found for your account.</p>
            </div>
        )
    }

    return (
        <div className="max-w-5xl mx-auto p-4 py-8 space-y-8">
            {/* Welcome */}
            <div>
                <h1 className="text-3xl font-bold">Welcome, {lead.first_name}!</h1>
                <p className="text-muted-foreground mt-1">Track your application and manage your documents.</p>
            </div>

            {/* Application Progress */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Application Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Progress value={progress} className="h-3" />
                    <div className="flex justify-between text-xs">
                        {stepLabels.map((step, i) => (
                            <span key={step} className={`font-medium ${i <= currentStepIndex ? 'text-primary' : 'text-muted-foreground'}`}>
                                {step}
                            </span>
                        ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Current stage: <span className="font-semibold text-foreground">{lead.status}</span>
                    </p>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Applications */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">My Applications</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {applications.length > 0 ? (
                            <div className="space-y-3">
                                {applications.map(app => (
                                    <div key={app.id} className="flex items-center justify-between border rounded-lg p-3">
                                        <div>
                                            <p className="font-medium text-sm">{app.university_name || 'University'}</p>
                                            <p className="text-xs text-muted-foreground">{app.course_name || 'Course'} · {app.intake_season || ''}</p>
                                        </div>
                                        <Badge variant="secondary">{app.status}</Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">No applications yet.</p>
                        )}
                    </CardContent>
                </Card>

                {/* Invoices */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Invoices & Payments</CardTitle>
                            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowUpload(true)}>
                                <Upload className="w-3.5 h-3.5" /> Upload Receipt
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {invoices.length > 0 ? (
                            <div className="space-y-3">
                                {invoices.map(inv => (
                                    <div key={inv.id} className="flex items-center justify-between border rounded-lg p-3">
                                        <div>
                                            <p className="font-medium text-sm">{inv.type?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {inv.currency} {inv.amount?.toLocaleString()} · Due {inv.due_date ? format(new Date(inv.due_date), 'MMM dd, yyyy') : '—'}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={inv.status === 'paid' ? 'default' : 'secondary'} className={inv.status === 'paid' ? 'bg-emerald-500' : ''}>
                                                {inv.status}
                                            </Badge>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownloadInvoice(inv.id)}>
                                                <Download className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">No invoices yet.</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Activity Timeline */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Recent Updates</CardTitle>
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => router.push('/dashboard/chat')}>
                            <MessageCircle className="w-3.5 h-3.5" /> Message Agent
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {activities.length > 0 ? (
                        <div className="space-y-4">
                            {activities.map(activity => {
                                const Icon = activityIcons[activity.type] || Clock
                                return (
                                    <div key={activity.id} className="flex gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${activity.type === 'call' ? 'bg-blue-500/10 text-blue-500' :
                                                activity.type === 'stage_change' ? 'bg-emerald-500/10 text-emerald-500' :
                                                    'bg-muted text-muted-foreground'
                                            }`}>
                                            <Icon className="h-3.5 w-3.5" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm">{activity.description}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {activity.users?.first_name} {activity.users?.last_name} · {format(new Date(activity.created_at), 'MMM dd, yyyy')}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-8">No updates yet.</p>
                    )}
                </CardContent>
            </Card>

            {/* Upload Receipt Dialog */}
            <Dialog open={showUpload} onOpenChange={setShowUpload}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Upload Payment Receipt</DialogTitle>
                        <DialogDescription>Upload proof of payment for verification by your agent.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input type="file" accept="image/*,.pdf" onChange={e => setReceiptFile(e.target.files?.[0] || null)} />
                    </div>
                    <DialogFooter>
                        <Button onClick={handleUploadReceipt} disabled={uploading || !receiptFile}>
                            {uploading ? "Uploading..." : "Upload Receipt"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
