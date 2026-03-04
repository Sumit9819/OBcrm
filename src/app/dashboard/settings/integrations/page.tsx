import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Mail, CheckCircle2, Link as LinkIcon } from "lucide-react"

export default async function IntegrationsPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // For a real app, you'd fetch existing integration settings
    const gmailConnected = false;

    return (
        <div className="flex-1 space-y-8 p-4 pt-6 md:p-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Integrations</h2>
                <p className="text-muted-foreground mt-1">
                    Connect third-party services to automate your workflow.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-100 rounded-md text-red-600">
                                    <Mail className="w-6 h-6" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl">Gmail & Google Workspace</CardTitle>
                                    <CardDescription>Sync emails directly to Lead Timelines.</CardDescription>
                                </div>
                            </div>
                            <Switch checked={gmailConnected} />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <p className="text-sm text-muted-foreground">
                            Enter your Google Cloud Console OAuth credentials. Once connected, emails from your leads will automatically appear in their profile timeline.
                        </p>

                        <div className="space-y-4 pt-4 border-t">
                            <div className="space-y-2">
                                <Label htmlFor="clientId">Client ID</Label>
                                <Input id="clientId" placeholder="e.g. 1234567890-abcxyz.apps.googleusercontent.com" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="clientSecret">Client Secret</Label>
                                <Input id="clientSecret" type="password" placeholder="Enter your Client Secret" />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-muted/30 pt-4 flex justify-between items-center">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <LinkIcon className="w-3 h-3" /> Requires Google Cloud Project
                        </p>
                        <Button>Connect Account</Button>
                    </CardFooter>
                </Card>

                {/* Placeholder for future integrations like Outlook, Xero, etc. */}
                <Card className="opacity-60 cursor-not-allowed">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-md text-blue-600">
                                <Mail className="w-6 h-6" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">Microsoft Outlook</CardTitle>
                                <CardDescription>Coming Soon in Phase 3.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Synchronize your Office 365 or Outlook inbox to track communications seamlessly.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
