"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Building2, Palette, Globe, Upload, Image, CheckCircle2 } from "lucide-react"
import { updateAgencyProfile, updateBranding, uploadLogo, connectDomain } from "./actions"
import { toast } from "sonner"
import { getContrastColor } from "@/lib/utils"

export default function SettingsPage() {
    const [agency, setAgency] = useState<any>(null)
    const [isAdmin, setIsAdmin] = useState(false)
    const [saving, setSaving] = useState(false)

    // Agency profile
    const [companyName, setCompanyName] = useState("")

    // Branding
    const [primaryColor, setPrimaryColor] = useState("#0ea5e9")
    const [sidebarColor, setSidebarColor] = useState("#ffffff")
    const [sidebarTextColor, setSidebarTextColor] = useState("")
    const [sidebarActiveColor, setSidebarActiveColor] = useState("#e2e8f0")
    const [showBrandName, setShowBrandName] = useState(true)
    const [useCustomTextColor, setUseCustomTextColor] = useState(false)

    // Logo
    const [logoFile, setLogoFile] = useState<File | null>(null)
    const [logoPreview, setLogoPreview] = useState<string | null>(null)
    const fileRef = useRef<HTMLInputElement>(null)

    // Domain
    const [domainValue, setDomainValue] = useState("")

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
                const defaultActiveColor = getContrastColor(agencyData.sidebar_color || "#ffffff") === 'black' ? '#e2e8f0' : '#334155'
                setSidebarActiveColor(agencyData.sidebar_active_color || defaultActiveColor)
                setShowBrandName(agencyData.show_brand_name !== false)
                setDomainValue(agencyData.custom_domain || "")
                if (agencyData.sidebar_text_color) {
                    setSidebarTextColor(agencyData.sidebar_text_color)
                    setUseCustomTextColor(true)
                }
            }
        }
        load()
    }, [])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null
        setLogoFile(file)
        if (file) {
            const reader = new FileReader()
            reader.onload = (ev) => setLogoPreview(ev.target?.result as string)
            reader.readAsDataURL(file)
        } else {
            setLogoPreview(null)
        }
    }

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
        fd.set('sidebarTextColor', useCustomTextColor ? sidebarTextColor : '')
        fd.set('sidebarActiveColor', sidebarActiveColor)
        fd.set('showBrandName', String(showBrandName))
        const result = await updateBranding(fd)
        if (result.error) toast.error(result.error)
        else toast.success("Branding saved! Refresh to see changes.")
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
            toast.success("Logo uploaded! Refresh to see changes.")
            setLogoFile(null)
            setLogoPreview(null)
            if (fileRef.current) fileRef.current.value = ''
            // Update local agency state with new URL
            if ((result as any).url) {
                setAgency((prev: any) => ({ ...prev, logo_url: (result as any).url }))
            }
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

    // Auto-detect text for preview
    const previewTextColor = useCustomTextColor ? sidebarTextColor || getContrastColor(sidebarColor) : getContrastColor(sidebarColor)

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

                {/* ── Agency Profile ── */}
                <TabsContent value="agency" className="space-y-4">
                    <div className="bg-card border rounded-xl p-6">
                        <h3 className="text-lg font-medium mb-4">Agency Details</h3>
                        <div className="grid gap-6 max-w-2xl">
                            <div className="grid gap-3">
                                <Label htmlFor="agency-name">Agency / Brand Name</Label>
                                <Input
                                    id="agency-name"
                                    value={companyName}
                                    onChange={e => setCompanyName(e.target.value)}
                                    disabled={!isAdmin}
                                    placeholder="e.g. Pinnacle Education"
                                />
                                <p className="text-xs text-muted-foreground">
                                    This name appears in the sidebar. You can hide it in Branding settings if your logo already contains it.
                                </p>
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

                {/* ── Branding & Theme ── */}
                <TabsContent value="branding" className="space-y-4">
                    <div className="bg-card border rounded-xl p-6">
                        <h3 className="text-lg font-medium mb-6">White-Label Branding</h3>

                        <div className="grid gap-8 max-w-2xl">

                            {/* Logo Upload */}
                            <div className="space-y-4">
                                <Label className="text-base font-medium flex items-center gap-2">
                                    <Image className="h-4 w-4" /> Agency Logo
                                </Label>
                                <div className="flex items-start gap-6">
                                    {/* Preview box */}
                                    <div className="w-24 h-24 rounded-xl border-2 border-dashed flex items-center justify-center bg-muted/30 overflow-hidden shrink-0">
                                        {logoPreview ? (
                                            <img src={logoPreview} alt="Preview" className="w-full h-full object-contain" />
                                        ) : agency?.logo_url ? (
                                            <img src={agency.logo_url} alt="Logo" className="w-full h-full object-contain" />
                                        ) : (
                                            <Building2 className="w-8 h-8 text-muted-foreground opacity-50" />
                                        )}
                                    </div>
                                    <div className="space-y-2 flex-1">
                                        <input
                                            ref={fileRef}
                                            type="file"
                                            accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                                            onChange={handleFileChange}
                                            className="text-sm"
                                        />
                                        <Button
                                            variant="outline"
                                            className="flex items-center gap-2"
                                            onClick={handleUploadLogo}
                                            disabled={saving || !logoFile}
                                        >
                                            <Upload className="w-4 h-4" />
                                            {saving ? "Uploading..." : "Upload Logo"}
                                        </Button>
                                        <p className="text-xs text-muted-foreground">
                                            Recommended: 512×512px PNG or SVG · Max 2MB
                                        </p>
                                        {agency?.logo_url && !logoFile && (
                                            <p className="text-xs text-emerald-600 flex items-center gap-1">
                                                <CheckCircle2 className="h-3 w-3" /> Logo is active
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Show Brand Name Toggle */}
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div>
                                    <Label className="text-sm font-medium">Show Brand Name in Sidebar</Label>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Turn off if your logo already contains your company name.
                                    </p>
                                </div>
                                <Switch checked={showBrandName} onCheckedChange={setShowBrandName} />
                            </div>

                            <Separator />

                            {/* Color Pickers */}
                            <div className="space-y-4">
                                <Label className="text-base font-medium">Brand Colors</Label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">Primary Color</Label>
                                        <div className="flex gap-2">
                                            <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-10 h-10 rounded-md border cursor-pointer" />
                                            <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="font-mono text-sm" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">Sidebar Background</Label>
                                        <div className="flex gap-2">
                                            <input type="color" value={sidebarColor} onChange={e => setSidebarColor(e.target.value)} className="w-10 h-10 rounded-md border cursor-pointer" />
                                            <Input value={sidebarColor} onChange={e => setSidebarColor(e.target.value)} className="font-mono text-sm" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">Selected Menu Color</Label>
                                        <div className="flex gap-2">
                                            <input type="color" value={sidebarActiveColor} onChange={e => setSidebarActiveColor(e.target.value)} className="w-10 h-10 rounded-md border cursor-pointer" />
                                            <Input value={sidebarActiveColor} onChange={e => setSidebarActiveColor(e.target.value)} className="font-mono text-sm" />
                                        </div>
                                        <p className="text-[11px] text-muted-foreground">
                                            Controls the highlight color of the currently selected sidebar menu.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar Text Color */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="text-sm font-medium">Sidebar Text Color</Label>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            Auto-detects based on your sidebar background. Enable to override manually.
                                        </p>
                                    </div>
                                    <Switch checked={useCustomTextColor} onCheckedChange={setUseCustomTextColor} />
                                </div>
                                {useCustomTextColor && (
                                    <div className="flex gap-2 items-center">
                                        <input
                                            type="color"
                                            value={sidebarTextColor || '#000000'}
                                            onChange={e => setSidebarTextColor(e.target.value)}
                                            className="w-10 h-10 rounded-md border cursor-pointer"
                                        />
                                        <Input
                                            value={sidebarTextColor}
                                            onChange={e => setSidebarTextColor(e.target.value)}
                                            className="font-mono text-sm max-w-[140px]"
                                            placeholder="#ffffff"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Live Preview */}
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Live Preview</Label>
                                <div
                                    className="w-48 rounded-xl p-3 space-y-1.5 text-sm shadow-md"
                                    style={{ backgroundColor: sidebarColor, color: previewTextColor }}
                                >
                                    <div className="flex items-center gap-2 pb-2 border-b border-current/10 font-semibold text-base">
                                        <div className="w-7 h-7 rounded-md bg-current/20 flex items-center justify-center text-xs font-bold">
                                            {(companyName || 'G').charAt(0)}
                                        </div>
                                        {showBrandName && <span className="truncate">{companyName || 'GrowthCRM'}</span>}
                                    </div>
                                    {['Dashboard', 'Leads', 'Students', 'Settings'].map(n => (
                                        <div
                                            key={n}
                                            className="flex items-center gap-2 px-1 py-1 rounded text-xs"
                                            style={n === 'Dashboard' ? {
                                                backgroundColor: sidebarActiveColor,
                                                color: getContrastColor(sidebarActiveColor),
                                            } : { opacity: 0.8 }}
                                        >
                                            <div className="w-3 h-3 rounded bg-current/30" />
                                            {n}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Separator />

                            <div className="flex items-center justify-between">
                                <div>
                                    <Label className="text-base font-medium">Remove "Powered by GrowthCRM"</Label>
                                    <p className="text-sm text-muted-foreground">Remove all GrowthCRM branding from the student portal.</p>
                                </div>
                                <Switch />
                            </div>

                            <div className="mt-4 flex justify-end">
                                <Button onClick={handleSaveBranding} disabled={saving}>
                                    {saving ? "Saving..." : "Save Branding Config"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* ── Custom Domain ── */}
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
