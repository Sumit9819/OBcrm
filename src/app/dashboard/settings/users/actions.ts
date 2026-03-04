"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

type CreateUserInput = {
    email: string
    password: string
    first_name: string
    last_name: string
    role: string
    job_title?: string
    phone?: string
}

/**
 * Creates a new Supabase Auth user + profile in the users table.
 * Requires the caller to be super_admin or agency_admin.
 * Uses the service role key (admin client) so it bypasses email confirmation.
 */
export async function createUser(input: CreateUserInput) {
    const supabase = await createClient()
    const admin = createAdminClient()

    // Verify the caller is an admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Unauthorized" }

    const { data: profile } = await supabase
        .from("users")
        .select("role, agency_id")
        .eq("id", user.id)
        .single()

    if (!profile || !["super_admin", "agency_admin"].includes(profile.role)) {
        return { error: "Only admins can create users" }
    }

    // Basic validation
    if (!input.email || !input.password || !input.first_name || !input.role) {
        return { error: "Email, password, first name, and role are required" }
    }
    if (input.password.length < 8) {
        return { error: "Password must be at least 8 characters" }
    }

    // 1. Create the auth user (bypasses email confirmation)
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
        email: input.email.trim().toLowerCase(),
        password: input.password,
        email_confirm: true,  // auto-confirm so they can log in immediately
        user_metadata: {
            first_name: input.first_name.trim(),
            last_name: input.last_name?.trim() || "",
        },
    })

    if (authError) {
        return { error: authError.message }
    }

    const newUserId = authData.user.id

    // 2. Upsert the profile row (in case the trigger didn't fire or needs extra fields)
    const { error: profileError } = await admin
        .from("users")
        .upsert({
            id: newUserId,
            email: input.email.trim().toLowerCase(),
            first_name: input.first_name.trim(),
            last_name: input.last_name?.trim() || "",
            role: input.role,
            job_title: input.job_title?.trim() || null,
            phone: input.phone?.trim() || null,
            agency_id: profile.agency_id,
        }, { onConflict: "id" })

    if (profileError) {
        // Rollback: delete the auth user we just created
        await admin.auth.admin.deleteUser(newUserId)
        return { error: "Failed to save profile: " + profileError.message }
    }

    revalidatePath("/dashboard/settings/users")
    revalidatePath("/dashboard/settings/agents")

    return { success: true, userId: newUserId }
}

/**
 * Updates a user's role and job title.
 * Requires caller to be super_admin or agency_admin.
 */
export async function updateUserRole(
    targetUserId: string,
    role: string,
    job_title?: string
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Unauthorized" }

    const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single()

    if (!["super_admin", "agency_admin"].includes(profile?.role)) {
        return { error: "Only admins can change roles" }
    }

    const { error } = await supabase
        .from("users")
        .update({ role, job_title: job_title || null })
        .eq("id", targetUserId)

    if (error) return { error: error.message }

    revalidatePath("/dashboard/settings/users")
    return { success: true }
}

/**
 * Deletes a user from Auth + removes their profile.
 * Requires caller to be super_admin.
 */
export async function deleteUser(targetUserId: string) {
    const supabase = await createClient()
    const admin = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Unauthorized" }

    const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single()

    if (!["super_admin"].includes(profile?.role)) {
        return { error: "Only super admins can delete users" }
    }

    if (targetUserId === user.id) {
        return { error: "You cannot delete your own account" }
    }

    const { error } = await admin.auth.admin.deleteUser(targetUserId)
    if (error) return { error: error.message }

    revalidatePath("/dashboard/settings/users")
    return { success: true }
}
