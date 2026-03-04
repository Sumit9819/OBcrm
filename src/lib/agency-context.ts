import { cookies } from 'next/headers'

export const AGENCY_COOKIE = 'crm_agency_id'
export const AGENCY_SLUG_COOKIE = 'crm_agency_slug'

export interface AgencyContext {
    id: string
    company_name: string
    slug: string
    subdomain: string | null
    custom_domain: string | null
    logo_url: string | null
    branding_primary_color: string
    is_active: boolean
    plan: string
    max_users: number
    timezone: string
}

/**
 * Reads the current agency from the cookie set by middleware.
 * Use this in Server Components and Server Actions to get the tenant context.
 */
export async function getCurrentAgencyId(): Promise<string | null> {
    const cookieStore = await cookies()
    return cookieStore.get(AGENCY_COOKIE)?.value ?? null
}

/**
 * Reads the full agency context from the cookie set by middleware.
 * Returns null if no agency is resolved (e.g. on the super-admin domain).
 */
export async function getCurrentAgencyContext(): Promise<AgencyContext | null> {
    const cookieStore = await cookies()
    const raw = cookieStore.get('crm_agency_context')?.value
    if (!raw) return null
    try {
        return JSON.parse(raw) as AgencyContext
    } catch {
        return null
    }
}
