"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

type PermissionMap = Record<string, boolean>

let cachedPerms: PermissionMap | null = null
let cacheTs = 0
const CACHE_TTL = 60_000 // 1 minute client-side cache

export function usePermission(key: string): boolean {
    const [allowed, setAllowed] = useState<boolean>(false)

    useEffect(() => {
        async function load() {
            // Use cached value if fresh
            if (cachedPerms && Date.now() - cacheTs < CACHE_TTL) {
                setAllowed(cachedPerms[key] ?? false)
                return
            }

            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single()

            const role = profile?.role || 'unknown'

            // Super admin & agency_admin always have all permissions
            if (['super_admin', 'agency_admin'].includes(role)) {
                cachedPerms = new Proxy({} as PermissionMap, { get: () => true })
                cacheTs = Date.now()
                setAllowed(true)
                return
            }

            // Load from role_permissions table
            const { data: permsRow } = await supabase
                .from('role_permissions')
                .select('permissions')
                .eq('role', role)
                .single()

            cachedPerms = permsRow?.permissions || {}
            cacheTs = Date.now()
            setAllowed(cachedPerms![key] ?? false)
        }
        load()
    }, [key])

    return allowed
}

// Invalidate cache (call after role or permission changes)
export function invalidatePermissionCache() {
    cachedPerms = null
    cacheTs = 0
}
