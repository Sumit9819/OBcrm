"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createEvent(formData: FormData) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { error: "Unauthorized" }

        const { data: profile } = await supabase
            .from('users')
            .select('agency_id, role')
            .eq('id', user.id)
            .single()

        if (!profile) return { error: "Profile not found" }

        // Only allow super_admin and agency_admin to create events for the dashboard
        if (profile.role !== 'super_admin' && profile.role !== 'agency_admin') {
            return { error: "Unauthorized to create calendar events" }
        }

        const title = formData.get("title") as string
        const description = formData.get("description") as string
        const startAtStr = formData.get("start_at") as string
        const endAtStr = formData.get("end_at") as string
        const eventType = (formData.get("event_type") as string) || "event"
        const color = (formData.get("color") as string) || "#6366f1"

        if (!title || !startAtStr) {
            return { error: "Missing required fields" }
        }

        const startAtDate = new Date(startAtStr)
        if (isNaN(startAtDate.getTime())) {
            return { error: "Invalid start date format" }
        }
        const startAt = startAtDate.toISOString()

        let endAt = null
        if (endAtStr) {
            const endAtDate = new Date(endAtStr)
            if (!isNaN(endAtDate.getTime())) {
                endAt = endAtDate.toISOString()
            }
        }

        const { error } = await supabase.from('calendar_events').insert({
            agency_id: profile.agency_id,
            user_id: user.id,
            title,
            description,
            start_at: startAt,
            end_at: endAt,
            event_type: eventType,
            color
        })

        if (error) {
            console.error("Database error creating event:", error)
            return { error: "Failed to save event to database." }
        }

        revalidatePath("/dashboard")
        return { success: true }
    } catch (error: any) {
        console.error("Unexpected error in createEvent:", error)
        return { error: "An unexpected error occurred." }
    }
}
