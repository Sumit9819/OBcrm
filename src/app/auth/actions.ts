'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { AGENCY_COOKIE } from '@/lib/agency-context'

export async function login(formData: FormData) {
    const supabase = await createClient()
    const cookieStore = await cookies()
    const agencyId = cookieStore.get(AGENCY_COOKIE)?.value ?? null

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        return { error: error.message }
    }

    // ── Tenant validation ────────────────────────────────────────
    // After sign-in, verify this user belongs to the current agency.
    // Skip this check only on the super-admin domain (no agencyId cookie).
    if (agencyId) {
        const { data: profile } = await supabase
            .from('users')
            .select('role, agency_id')
            .eq('id', (await supabase.auth.getUser()).data.user!.id)
            .single()

        const isSuperAdmin = profile?.role === 'super_admin'

        if (!isSuperAdmin && profile?.agency_id !== agencyId) {
            // User doesn't belong to this workspace — sign them out
            await supabase.auth.signOut()
            return {
                error: "This account doesn't belong to this workspace. Please contact your administrator.",
            }
        }
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}

export async function signup(formData: FormData) {
    const supabase = await createClient()
    const cookieStore = await cookies()
    const agencyId = cookieStore.get(AGENCY_COOKIE)?.value ?? null

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
        options: {
            data: {
                first_name: formData.get('firstName') as string,
                last_name: formData.get('lastName') as string,
                agency_id: agencyId ?? undefined, // passed into handle_new_user trigger
            }
        }
    }

    const { error } = await supabase.auth.signUp(data)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
}
