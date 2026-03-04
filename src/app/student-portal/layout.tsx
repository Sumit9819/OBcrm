import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { logout } from "@/app/auth/actions"
import { GraduationCap, LogOut, User } from "lucide-react"

export default async function StudentPortalLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('users')
        .select('first_name, last_name, role')
        .eq('id', user.id)
        .single()

    const displayName = profile
        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || user.email
        : user.email || "Student"
    const initials = profile?.first_name && profile?.last_name
        ? `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`
        : displayName?.substring(0, 2).toUpperCase() || "ST"

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
            {/* Student Portal Top Nav */}
            <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur-md shadow-sm">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                            <GraduationCap className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <div>
                            <span className="font-bold text-lg leading-none">GrowthCRM</span>
                            <span className="block text-[10px] text-muted-foreground leading-none">Student Portal</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                                {initials}
                            </div>
                            <div className="hidden sm:block">
                                <p className="text-sm font-medium leading-none">{displayName}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Student</p>
                            </div>
                        </div>
                        <form action={logout}>
                            <button type="submit" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-red-500 transition-colors px-2 py-1 rounded-md hover:bg-red-50">
                                <LogOut className="h-4 w-4" /> Sign out
                            </button>
                        </form>
                    </div>
                </div>
            </header>

            {/* Student Content */}
            <main className="max-w-5xl mx-auto">
                {children}
            </main>
        </div>
    )
}
