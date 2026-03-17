import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/server"
import { logout } from "@/app/auth/actions"
import { GlobalSearch } from "@/components/layout/global-search"
import { NotificationBell } from "@/components/layout/notification-bell"
import Link from "next/link"
import { revalidatePath } from "next/cache"

const roleLabels: Record<string, string> = {
    super_admin: "Super Admin",
    agency_admin: "Agency Admin",
    agent: "Agent",
    accountant: "Accountant",
    student: "Student",
}

async function switchBranch(formData: FormData) {
    'use server'

    const branchId = String(formData.get('branch_id') || '')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
        .from('users')
        .update({ branch_id: branchId || null })
        .eq('id', user.id)

    revalidatePath('/dashboard')
}

export async function Topbar({ logoUrl }: { logoUrl?: string }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let displayName = "User"
    let roleLabel = "Agent"
    let initials = "U"

    if (user) {
        const { data: profile } = await supabase
            .from('users')
            .select('first_name, last_name, role, agency_id, branch_id')
            .eq('id', user.id)
            .single()

        const agencyId = profile?.agency_id
        let branches: { id: string; name: string }[] = []
        if (agencyId) {
            const { data } = await supabase
                .from('branches')
                .select('id, name')
                .eq('agency_id', agencyId)
                .order('name', { ascending: true })
            branches = data || []
        }

        if (profile) {
            const full = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
            displayName = full || user.email || "User"
            roleLabel = roleLabels[profile.role] || profile.role || "Agent"
            initials = profile.first_name && profile.last_name
                ? `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`
                : displayName.substring(0, 2).toUpperCase()
        } else {
            displayName = user.email || "User"
            initials = displayName.substring(0, 2).toUpperCase()
        }

        return (
            <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur-md md:px-6">

                <div className="flex flex-1 items-center gap-3">
                    <GlobalSearch />
                    {branches.length > 0 && (
                        <form action={switchBranch} className="hidden md:block">
                            <select
                                name="branch_id"
                                defaultValue={profile.branch_id || ''}
                                onChange={(e) => e.currentTarget.form?.requestSubmit()}
                                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                            >
                                <option value="">All Branches</option>
                                {branches.map((b) => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </form>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    <NotificationBell />
                    <div className="flex items-center gap-3 pl-4 border-l">
                        <div className="hidden lg:flex flex-col items-end text-right">
                            <span className="text-xs font-bold text-foreground leading-tight">{displayName}</span>
                            <span className="text-[10px] uppercase font-semibold tracking-tighter text-muted-foreground">{roleLabel}</span>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-10 w-10 p-0 flex items-center justify-center hover:bg-transparent rounded-full ring-2 ring-primary/5 hover:ring-primary/20 transition-all">
                                    <Avatar className="h-9 w-9 border border-border/50">
                                        <AvatarImage src={logoUrl || "/avatars/01.png"} alt={displayName} />
                                        <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">{initials}</AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-semibold leading-none truncate">{displayName}</p>
                                        <p className="text-xs leading-none text-muted-foreground">{roleLabel}</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href="/dashboard/settings/profile">Profile Settings</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/dashboard/finances">Billing</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/dashboard/settings">Agency Branding</Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />

                                <form action={logout}>
                                    <button type="submit" className="w-full">
                                        <DropdownMenuItem className="text-destructive focus:bg-destructive/10 cursor-pointer w-full">
                                            Log out
                                        </DropdownMenuItem>
                                    </button>
                                </form>

                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>
        )
    }

    return (
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur-md md:px-6">

            {/* Search Bar */}
            <div className="flex flex-1 items-center">
                <GlobalSearch />
            </div>

            {/* Right side Actions */}
            <div className="flex items-center gap-4">

                {/* Notifications */}
                <NotificationBell />

                {/* User Profile Dropdown */}
                <div className="flex items-center gap-3 pl-4 border-l">
                    <div className="hidden lg:flex flex-col items-end text-right">
                        <span className="text-xs font-bold text-foreground leading-tight">{displayName}</span>
                        <span className="text-[10px] uppercase font-semibold tracking-tighter text-muted-foreground">{roleLabel}</span>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-10 w-10 p-0 flex items-center justify-center hover:bg-transparent rounded-full ring-2 ring-primary/5 hover:ring-primary/20 transition-all">
                                <Avatar className="h-9 w-9 border border-border/50">
                                    <AvatarImage src={logoUrl || "/avatars/01.png"} alt={displayName} />
                                    <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">{initials}</AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-semibold leading-none truncate">{displayName}</p>
                                    <p className="text-xs leading-none text-muted-foreground">{roleLabel}</p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href="/dashboard/settings/profile">Profile Settings</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/dashboard/finances">Billing</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/dashboard/settings">Agency Branding</Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />

                            {/* Server Action Logout Form */}
                            <form action={logout}>
                                <button type="submit" className="w-full">
                                    <DropdownMenuItem className="text-destructive focus:bg-destructive/10 cursor-pointer w-full">
                                        Log out
                                    </DropdownMenuItem>
                                </button>
                            </form>

                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    )
}
