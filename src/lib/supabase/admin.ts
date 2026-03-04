import { createClient } from "@supabase/supabase-js"

/**
 * Supabase Admin Client — uses the SERVICE_ROLE_KEY.
 * ONLY use this in server-side code (Server Actions, Route Handlers).
 * NEVER expose this to the client.
 */
export function createAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceKey) {
        throw new Error(
            "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
            "Add SUPABASE_SERVICE_ROLE_KEY to your .env.local file."
        )
    }

    return createClient(url, serviceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })
}
