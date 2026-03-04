import { createClient } from "@/lib/supabase/server"

/**
 * Server-side permission check.
 * Usage in server components / server actions:
 *   const allowed = await checkPermission('leads.create')
 *   if (!allowed) redirect('/dashboard')
 */
export async function checkPermission(key: string): Promise<boolean> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

    const role = profile?.role || 'unknown'

    // Admins always have all permissions
    if (['super_admin', 'agency_admin'].includes(role)) return true

    // Load from role_permissions table
    const { data: permsRow } = await supabase
        .from('role_permissions')
        .select('permissions')
        .eq('role', role)
        .single()

    const perms: Record<string, boolean> = permsRow?.permissions || {}
    return perms[key] ?? false
}
