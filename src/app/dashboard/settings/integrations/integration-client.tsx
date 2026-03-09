'use client'

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Mail, CheckCircle2, Link as LinkIcon, MessageCircle } from "lucide-react"
import { toast } from "sonner"
import { saveIntegration, removeIntegration } from "./actions"

type Integration = {
    id: string;
    provider: string;
    config: any;
    is_active: boolean;
}

interface IntegrationsClientProps {
    integrations: Integration[];
}

export function IntegrationsClient({ integrations }: IntegrationsClientProps) {

    // Find if providers exist
    const google = integrations.find(i => i.provider === 'google')
    const whatsapp = integrations.find(i => i.provider === 'whatsapp')

    const [isSaving, setIsSaving] = useState(false)

    // Form states
    const [googleEmail, setGoogleEmail] = useState(google?.config?.email || '')
    const [googleAppPassword, setGoogleAppPassword] = useState(google?.config?.appPassword || '')

    const [whatsappToken, setWhatsappToken] = useState(whatsapp?.config?.systemToken || '')
    const [whatsappPhoneId, setWhatsappPhoneId] = useState(whatsapp?.config?.phoneId || '')

    const handleGoogleSave = async () => {
        setIsSaving(true)
        const res = await saveIntegration('google', {
            config: { email: googleEmail, appPassword: googleAppPassword }
        })

        setIsSaving(false)
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success("Gmail credentials saved safely.")
        }
    }

    const handleGoogleRemove = async () => {
        setIsSaving(true)
        const res = await removeIntegration('google')
        setIsSaving(false)
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success("Gmail Integration removed.")
            setGoogleEmail('')
            setGoogleAppPassword('')
        }
    }

    const handleWhatsappSave = async () => {
        setIsSaving(true)
        const res = await saveIntegration('whatsapp', {
            config: { systemToken: whatsappToken, phoneId: whatsappPhoneId }
        })

        setIsSaving(false)
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success("WhatsApp credentials saved safely.")
        }
    }

    const handleWhatsappRemove = async () => {
        setIsSaving(true)
        const res = await removeIntegration('whatsapp')
        setIsSaving(false)
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success("WhatsApp Integration removed.")
            setWhatsappToken('')
            setWhatsappPhoneId('')
        }
    }


    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* GOOGLE WORKSPACE CARD */}
            <Card className={`relative overflow-hidden transition-all border ${google ? 'border-primary shadow-sm' : ''}`}>
                {google && <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />}

                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-md ${google ? 'bg-primary/20 text-primary' : 'bg-red-100 text-red-600'}`}>
                                <Mail className="w-6 h-6" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">Gmail & Google Workspace</CardTitle>
                                <CardDescription>Sync emails directly to Lead Timelines.</CardDescription>
                            </div>
                        </div>
                        {google && <CheckCircle2 className="text-primary w-6 h-6" />}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                    <p className="text-sm text-muted-foreground">
                        Enter your Gmail address and a generated App Password. This allows the CRM to send emails on your behalf directly to leads.
                    </p>

                    <div className="space-y-4 pt-4 border-t">
                        <div className="space-y-2">
                            <Label htmlFor="googleEmail">Gmail Address</Label>
                            <Input
                                id="googleEmail"
                                type="email"
                                placeholder="e.g. hello@youragency.com"
                                value={googleEmail}
                                onChange={e => setGoogleEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="googlePassword">Google App Password</Label>
                            <Input
                                id="googlePassword"
                                type="password"
                                placeholder="16-character App Password"
                                value={googleAppPassword}
                                onChange={e => setGoogleAppPassword(e.target.value)}
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="bg-muted/30 pt-4 flex justify-between items-center">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <LinkIcon className="w-3 h-3" /> Requires 2-Step Verification
                    </p>
                    <div className="flex items-center gap-2">
                        {google && (
                            <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleGoogleRemove} disabled={isSaving}>Disconnect</Button>
                        )}
                        <Button onClick={handleGoogleSave} disabled={isSaving || !googleEmail || !googleAppPassword}>
                            {google ? 'Update Config' : 'Connect Account'}
                        </Button>
                    </div>
                </CardFooter>
            </Card>

            {/* WHATSAPP CARD */}
            <Card className={`relative overflow-hidden transition-all border ${whatsapp ? 'border-primary shadow-sm' : ''}`}>
                {whatsapp && <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />}

                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-md ${whatsapp ? 'bg-primary/20 text-primary' : 'bg-green-100 text-green-600'}`}>
                                <MessageCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">WhatsApp Business</CardTitle>
                                <CardDescription>Send WhatsApp messages from your dedicated company number.</CardDescription>
                            </div>
                        </div>
                        {whatsapp && <CheckCircle2 className="text-primary w-6 h-6" />}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                    <p className="text-sm text-muted-foreground">
                        Enter your Meta Developer Platform credentials. This ties the system to your specific corporate WhatsApp number.
                    </p>

                    <div className="space-y-4 pt-4 border-t">
                        <div className="space-y-2">
                            <Label htmlFor="wpPhone">Phone Number ID</Label>
                            <Input
                                id="wpPhone"
                                placeholder="e.g. 104593847583"
                                value={whatsappPhoneId}
                                onChange={e => setWhatsappPhoneId(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="wpToken">System User Access Token</Label>
                            <Input
                                id="wpToken"
                                type="password"
                                placeholder="EAA..."
                                value={whatsappToken}
                                onChange={e => setWhatsappToken(e.target.value)}
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="bg-muted/30 pt-4 flex justify-between items-center">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <LinkIcon className="w-3 h-3" /> Requires Meta Developer App
                    </p>
                    <div className="flex items-center gap-2">
                        {whatsapp && (
                            <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleWhatsappRemove} disabled={isSaving}>Disconnect</Button>
                        )}
                        <Button onClick={handleWhatsappSave} disabled={isSaving || !whatsappPhoneId || !whatsappToken}>
                            {whatsapp ? 'Update Config' : 'Connect Account'}
                        </Button>
                    </div>
                </CardFooter>
            </Card>

        </div>
    )
}
