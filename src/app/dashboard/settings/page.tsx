"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Building2, Palette, Globe, Upload } from "lucide-react"
import { updateAgencyProfile, updateBranding, uploadLogo, connectDomain } from "./actions"
import { toast } from "sonner"

export default function SettingsPage() {
    const [agency, setAgency] = useState<any>(null)
    const [isAdmin, setIsAdmin] = useState(false)
    const [saving, setSaving] = useState(false)

    // Form state
    const [companyName, setCompanyName] = useState("")
    const [primaryColor, setPrimaryColor] = useState("#0ea5e9")
    const [sidebarColor, setSidebarColor] = useState("#ffffff")
    const [domainValue, setDomainValue] = useState("")
    const [logoFile, setLogoFile] = useState<File | null>(null)

    const supabase = createClient()

    useEffect(() => {
        async function load() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: userData } = await supabase
                .from('users')
                .select('agency_id, role')
                .eq('id', user.id)
                .single()

            if (!userData) return
            setIsAdmin(userData.role === 'super_admin' || userData.role === 'agency_admin')

            const { data: agencyData } = await supabase
                .from('agencies')
                .select('*')
                .eq('id', userData.agency_id)
                .single()

            if (agencyData) {
                setAgency(agencyData)
                setCompanyName(agencyData.company_name || "")
                setPrimaryColor(agencyData.branding_primary_color || "#0ea5e9")
                setSidebarColor(agencyData.sidebar_color || "#ffffff")
                setDomainValue(agencyData.custom_domain || "")
            }
        }
        load()
    }, [])

    const handleSaveProfile = async () => {
        setSaving(true)
        const fd = new FormData()
        fd.set('companyName', companyName)
        const result = await updateAgencyProfile(fd)
        if (result.error) toast.error(result.error)
        else toast.success("Agency profile updated!")
        setSaving(false)
    }

    const handleSaveBranding = async () => {
        setSaving(true)
        const fd = new FormData()
        fd.set('primaryColor', primaryColor)
        fd.set('sidebarColor', sidebarColor)
        const result = await updateBranding(fd)
        if (result.error) toast.error(result.error)
        else toast.success("Branding saved!")
        setSaving(false)
    }

    const handleUploadLogo = async () => {
        if (!logoFile) return
        setSaving(true)
        const fd = new FormData()
        fd.set('logo', logoFile)
        const result = await uploadLogo(fd)
        if (result.error) toast.error(result.error)
        else {
            toast.success("Logo uploaded!")
            setLogoFile(null)
        }
        setSaving(false)
    }

    const handleConnectDomain = async () => {
        if (!domainValue.trim()) return
        setSaving(true)
        const fd = new FormData()
        fd.set('domain', domainValue)
        const result = await connectDomain(fd)
        if (result.error) toast.error(result.error)
        else toast.success("Domain connected!")
        setSaving(false)
    }

    return (
        <div className="flex-1 space-y-8 p-4 pt-6 md:p-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Settings & Branding</h2>
                <p className="text-muted-foreground mt-1">
                    Customize your agency's CRM experience and white-label settings.
                </p>
            </div>

            <Tabs defaultValue="agency" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="agency" className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" /> Agency Profile
                    </TabsTrigger>
                    <TabsTrigger value="branding" className="flex items-center gap-2" disabled={!isAdmin}>
                        <Palette className="w-4 h-4" /> Branding & Theme
                    </TabsTrigger>
                    <TabsTrigger value="domain" className="flex items-center gap-2" disabled={!isAdmin}>
                        <Globe className="w-4 h-4" /> Custom Domain
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="agency" className="space-y-4">
                    <div className="bg-card border rounded-xl p-6">
                        <h3 className="text-lg font-medium mb-4">Agency Details</h3>
                        <div className="grid gap-6 max-w-2xl">
                            <div className="grid gap-3">
                                <Label htmlFor="agency-name">Agency Name</Label>
                                <Input id="agency-name" value={companyName} onChange={e => setCompanyName(e.target.value)} disabled={!isAdmin} />
                            </div>
                        </div>
                        {isAdmin && (
                            <div className="mt-6 flex justify-end">
                                <Button onClick={handleSaveProfile} disabled={saving}>
                                    {saving ? "Saving..." : "Save Changes"}
                                </Button>
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="branding" className="space-y-4">
                    <div className="bg-card border rounded-xl p-6">
                        <h3 className="text-lg font-medium mb-6">White-Label Branding</h3>

                        <div className="grid gap-8 max-w-2xl">
                            <div className="space-y-4">
                                <Label>Agency Logo</Label>
                                <div className="flex items-start gap-6">
                                    <div className="w-24 h-24 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/30 overflow-hidden">
                                        {agency?.logo_url ? (
                                            <img src={agency.logo_url} alt="Logo" className="w-full h-full object-cover" />
                                        ) : (
                                            <Building2 className="w-8 h-8 text-muted-foreground opacity-50" />
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] || null)} />
                                        <Button variant="outline" className="flex items-center gap-2" onClick={handleUploadLogo} disabled={saving || !logoFile}>
                                            <Upload className="w-4 h-4" /> {saving ? "Uploading..." : "Upload Logo"}
                                        </Button>
                                        <p className="text-xs text-muted-foreground">
                                            Recommended size: 512x512px (PNG or SVG). Max file size: 2MB.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-4">
                                <Label>Brand Colors</Label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">Primary Color</Label>
                                        <div className="flex gap-2">
                                            <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-10 h-10 rounded-md border cursor-pointer" />
                                            <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="font-mono text-sm" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">Sidebar Color</Label>
                                        <div className="flex gap-2">
                                            <input type="color" value={sidebarColor} onChange={e => setSidebarColor(e.target.value)} className="w-10 h-10 rounded-md border cursor-pointer" />
                                            <Input value={sidebarColor} onChange={e => setSidebarColor(e.target.value)} className="font-mono text-sm" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-4 flex items-center justify-between">
                                <div>
                                    <Label className="text-base font-medium">Remove "Powered by GrowthCRM"</Label>
                                    <p className="text-sm text-muted-foreground">Remove all GrowthCRM branding from the student portal.</p>
                                </div>
                                <Switch />
                            </div>

                            <div className="mt-8 flex justify-end">
                                <Button onClick={handleSaveBranding} disabled={saving}>
                                    {saving ? "Saving..." : "Save Branding Config"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="domain" className="space-y-4">
                    <div className="bg-card border rounded-xl p-6">
                        <h3 className="text-lg font-medium mb-4">Custom Domain (Student Portal)</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            Connect a custom domain to serve the student portal under your own URL (e.g., portal.youragency.com).
                        </p>

                        <div className="flex gap-4 max-w-xl">
                            <Input placeholder="portal.youragency.com" value={domainValue} onChange={e => setDomainValue(e.target.value)} />
                            <Button onClick={handleConnectDomain} disabled={saving || !domainValue.trim()}>
                                {saving ? "Connecting..." : "Connect Domain"}
                            </Button>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
