import { ChatInterface } from "@/components/chat/chat-interface"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function ChatPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Fetch current user full profile
    const { data: currentProfile } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, role, agency_id')
        .eq('id', user.id)
        .single()

    // Fetch colleagues (other members of the same agency)
    const { data: colleagues } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, role')
        .eq('agency_id', currentProfile?.agency_id)
        .neq('id', user.id)

    const profile = currentProfile ?? {
        id: user.id,
        first_name: '',
        last_name: '',
        email: user.email ?? '',
        role: 'agent',
    }

    return (
        <div className="flex h-[calc(100vh-8rem)] w-full flex-col overflow-hidden bg-background">
            <div className="flex items-center justify-between p-4 border-b">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Internal Communications</h2>
                    <p className="text-sm text-muted-foreground">
                        Chat with team members instantly. Messages are secured via RLS.
                    </p>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden bg-muted/10 rounded-xl border m-4 shadow-sm">
                <ChatInterface
                    currentUser={profile}
                    colleagues={colleagues || []}
                />
            </div>
        </div>
    )
}
