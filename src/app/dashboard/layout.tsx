import { AppSidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { FloatingChat } from "@/components/chat/floating-chat"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let userRole = 'unknown'  // Never default to 'agent' — must be set from DB
    let userId = ''
    if (user) {
        userId = user.id
        const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()
        userRole = profile?.role || 'unknown'
    }

    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full bg-background font-sans overflow-hidden">
                <AppSidebar userRole={userRole} />
                <div className="flex w-full flex-col overflow-hidden">
                    <Topbar />
                    <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                        {children}
                    </main>
                </div>
                <FloatingChat userId={userId} />
            </div>
        </SidebarProvider>
    )
}
