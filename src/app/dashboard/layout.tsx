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

    let userRole = 'unknown'
    let userId = ''
    let logoUrl = ''
    let sidebarColor = ''

    if (user) {
        userId = user.id
        const { data: profile } = await supabase
            .from('users')
            .select('role, agency_id')
            .eq('id', user.id)
            .single()
        userRole = profile?.role || 'unknown'

        if (profile?.agency_id) {
            const { data: agency } = await supabase
                .from('agencies')
                .select('logo_url, sidebar_color')
                .eq('id', profile.agency_id)
                .single()
            if (agency) {
                logoUrl = agency.logo_url || ''
                sidebarColor = agency.sidebar_color || ''
            }
        }
    }

    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full bg-background font-sans overflow-hidden">
                <AppSidebar userRole={userRole} logoUrl={logoUrl} sidebarColor={sidebarColor} />
                <div className="flex w-full flex-col overflow-hidden">
                    <Topbar />
                    <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-slate-50/40">
                        {children}
                    </main>
                </div>
                <FloatingChat userId={userId} />
            </div>
        </SidebarProvider>
    )
}
