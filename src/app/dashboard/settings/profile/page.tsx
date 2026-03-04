"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Save } from "lucide-react"
import { toast } from "sonner"

export default function ProfilePage() {
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [position, setPosition] = useState("")

    const supabase = createClient()

    useEffect(() => {
        async function load() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data } = await supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single()

            if (data) {
                setProfile(data)
                setFirstName(data.first_name || "")
                setLastName(data.last_name || "")
                setPosition(data.position || "")
            }
            setLoading(false)
        }
        load()
    }, [])

    const handleSave = async () => {
        if (!profile) return
        setSaving(true)

        const { error } = await supabase
            .from('users')
            .update({
                first_name: firstName,
                last_name: lastName,
                position: position,
            })
            .eq('id', profile.id)

        if (error) {
            toast.error("Failed to update: " + error.message)
        } else {
            toast.success("Profile updated!")
        }
        setSaving(false)
    }

    if (loading) {
        return <div className="flex-1 p-8 text-center text-muted-foreground">Loading profile...</div>
    }

    return (
        <div className="flex-1 space-y-8 p-4 pt-6 md:p-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">My Profile</h2>
                <p className="text-muted-foreground mt-1">Edit your personal information.</p>
            </div>

            <Card className="max-w-2xl">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center text-white font-bold text-xl shrink-0">
                            {firstName?.charAt(0) || profile?.email?.charAt(0)?.toUpperCase()}{lastName?.charAt(0) || ''}
                        </div>
                        <div>
                            <CardTitle>{firstName} {lastName}</CardTitle>
                            <p className="text-sm text-muted-foreground">{profile?.email}</p>
                            <p className="text-xs text-muted-foreground capitalize mt-0.5">{profile?.role?.replace('_', ' ')}</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>First Name</Label>
                            <Input value={firstName} onChange={e => setFirstName(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Last Name</Label>
                            <Input value={lastName} onChange={e => setLastName(e.target.value)} />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label>Position / Title</Label>
                        <Input value={position} onChange={e => setPosition(e.target.value)} placeholder="e.g. Senior Counsellor" />
                    </div>
                    <div className="grid gap-2">
                        <Label>Email</Label>
                        <Input value={profile?.email || ""} disabled className="bg-muted" />
                        <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={handleSave} disabled={saving} className="gap-2">
                            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
