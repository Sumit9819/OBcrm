import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ── Cookie names ──────────────────────────────────────────────────
const ROLE_COOKIE = 'crm_user_role'
const AGENCY_ID_COOKIE = 'crm_agency_id'
const AGENCY_CONTEXT_COOKIE = 'crm_agency_context'

// ── Cache TTLs (seconds) ──────────────────────────────────────────
const ROLE_CACHE_SECONDS = 300   // 5 min
const AGENCY_CACHE_SECONDS = 300   // 5 min

// ── Role constants ────────────────────────────────────────────────
const INTERNAL_ROLES = ['super_admin', 'agency_admin', 'staff', 'accountant']
const AGENT_ROLE = 'agent'

// ── Your root domain (used to strip and extract subdomains) ───────
// Set NEXT_PUBLIC_ROOT_DOMAIN in your .env.local e.g. "growthcrm.app"
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost'

// ── Super-admin domain: no agency required ────────────────────────
const ADMIN_DOMAIN = process.env.NEXT_PUBLIC_ADMIN_DOMAIN ?? 'admin.growthcrm.app'

export async function proxy(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return request.cookies.getAll() },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    const pathname = request.nextUrl.pathname
    const hostname = request.headers.get('host') ?? ''
    const isLocalDev = hostname.includes('localhost') || hostname.includes('127.0.0.1')

    // ══════════════════════════════════════════════════════════════
    // STEP 0 — Resolve Tenant from Hostname
    // Skip for: super-admin domain, local dev root, and static assets
    // ══════════════════════════════════════════════════════════════
    const isAdminDomain = hostname === ADMIN_DOMAIN || hostname.startsWith('admin.localhost')
    const isRootDomain = hostname === ROOT_DOMAIN || hostname === `www.${ROOT_DOMAIN}` || hostname === 'localhost:3000'

    if (!isAdminDomain && !isRootDomain) {
        // Check if we already have a cached agency cookie for this request
        const cachedAgencyId = request.cookies.get(AGENCY_ID_COOKIE)?.value

        if (!cachedAgencyId) {
            // Resolve agency from hostname via DB RPC
            const { data: agencies } = await supabase.rpc('resolve_agency_by_host', {
                p_host: hostname.split(':')[0], // strip port if present
            })

            const agency = agencies?.[0] ?? null

            if (!agency) {
                // Unknown workspace — redirect to error page
                const url = request.nextUrl.clone()
                url.hostname = isLocalDev ? 'localhost' : ROOT_DOMAIN
                url.port = isLocalDev ? '3000' : ''
                url.pathname = '/invalid-workspace'
                return NextResponse.redirect(url)
            }

            // Cache agency context in cookies
            supabaseResponse.cookies.set({
                name: AGENCY_ID_COOKIE,
                value: agency.id,
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                maxAge: AGENCY_CACHE_SECONDS,
            })

            supabaseResponse.cookies.set({
                name: AGENCY_CONTEXT_COOKIE,
                value: JSON.stringify(agency),
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                maxAge: AGENCY_CACHE_SECONDS,
            })

            // Inject into response headers for server components
            supabaseResponse.headers.set('x-agency-id', agency.id)
            supabaseResponse.headers.set('x-agency-slug', agency.slug ?? '')
        } else {
            // Already cached — forward the header
            supabaseResponse.headers.set('x-agency-id', cachedAgencyId)
        }
    }

    // ══════════════════════════════════════════════════════════════
    // STEP 1 — Not logged in → redirect to login
    // ══════════════════════════════════════════════════════════════
    if (
        !user &&
        !pathname.startsWith('/login') &&
        !pathname.startsWith('/auth') &&
        !pathname.startsWith('/invalid-workspace') &&
        !pathname.startsWith('/onboard')
    ) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    if (user) {
        // ── STEP 2. Resolve role (cookie cache → DB fallback) ────
        let role = request.cookies.get(ROLE_COOKIE)?.value
        let needsRefresh = !role

        if (!role) {
            const { data: profile } = await supabase
                .from('users')
                .select('role, agency_id')
                .eq('id', user.id)
                .single()

            role = profile?.role || 'unknown'
            needsRefresh = true
        }

        // Cache the role cookie
        if (needsRefresh && role) {
            supabaseResponse.cookies.set({
                name: ROLE_COOKIE,
                value: role,
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                maxAge: ROLE_CACHE_SECONDS,
            })
        }

        const isAgent = role === AGENT_ROLE
        const isInternal = INTERNAL_ROLES.includes(role ?? '')
        const isSuperAdmin = role === 'super_admin'

        // ── STEP 3. Super-admin: allow access to /admin only ────
        if (isSuperAdmin && !isAdminDomain && pathname.startsWith('/admin')) {
            // redirect super-admin to their dedicated domain
            // (only if they're not already on it)
        }

        // ── STEP 4. Protect /admin from non-super-admins ────────
        if (pathname.startsWith('/admin') && !isSuperAdmin) {
            const url = request.nextUrl.clone()
            url.pathname = '/dashboard'
            return NextResponse.redirect(url)
        }

        // ── STEP 5. External agent → agent portal ───────────────
        if (isAgent && pathname.startsWith('/dashboard')) {
            const url = request.nextUrl.clone()
            url.pathname = '/agent'
            return NextResponse.redirect(url)
        }

        // ── STEP 6. Internal staff → dashboard ──────────────────
        if (isInternal && pathname.startsWith('/agent')) {
            const url = request.nextUrl.clone()
            url.pathname = '/dashboard'
            return NextResponse.redirect(url)
        }

        // ── STEP 7. Unknown role → login ─────────────────────────
        if (
            role === 'unknown' &&
            !pathname.startsWith('/login') &&
            !pathname.startsWith('/auth')
        ) {
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            return NextResponse.redirect(url)
        }
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
