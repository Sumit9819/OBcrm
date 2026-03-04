import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ROLE_COOKIE = 'crm_user_role'
const ROLE_CACHE_SECONDS = 300 // 5 minutes

const INTERNAL_ROLES = ['super_admin', 'agency_admin', 'staff']
const AGENT_ROLE = 'agent'

export async function middleware(request: NextRequest) {
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

    // ── 1. Not logged in → redirect to login ──────────────────
    if (
        !user &&
        !pathname.startsWith('/login') &&
        !pathname.startsWith('/auth')
    ) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    if (user) {
        // ── 2. Resolve role (cookie cache → DB fallback) ──────
        let role = request.cookies.get(ROLE_COOKIE)?.value
        let needsRefresh = !role

        if (!role) {
            const { data: profile } = await supabase
                .from('users')
                .select('role')
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

        // ── 3. External agent trying to access internal CRM ───
        if (isAgent && pathname.startsWith('/dashboard')) {
            const url = request.nextUrl.clone()
            url.pathname = '/agent'
            return NextResponse.redirect(url)
        }

        // ── 4. Internal staff trying to access agent portal ───
        if (isInternal && pathname.startsWith('/agent')) {
            const url = request.nextUrl.clone()
            url.pathname = '/dashboard'
            return NextResponse.redirect(url)
        }

        // ── 5. Unknown role → send to login ───────────────────
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
