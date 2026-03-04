'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Define the validation schema
const leadSchema = z.object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(6, "Invalid phone number"),
    destinationCountry: z.string(),
    courseInterest: z.string(),
    isSharedWithCompany: z.boolean().default(false),
})

export async function createLead(prevState: any, formData: FormData) {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Unauthorized' }
    }

    // Fetch the user's agency_id
    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('agency_id')
        .eq('id', user.id)
        .single()

    if (userError || !userData) {
        return { error: 'Could not fetch user agency profile' }
    }

    // Parse and validate form data
    const rawData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        destinationCountry: formData.get('destinationCountry'),
        courseInterest: formData.get('courseInterest'),
        isSharedWithCompany: formData.get('isSharedWithCompany') === 'on',
    }

    const validatedFields = leadSchema.safeParse(rawData)

    if (!validatedFields.success) {
        return {
            error: 'Validation failed',
            fields: validatedFields.error.flatten().fieldErrors,
        }
    }

    const data = validatedFields.data

    // Insert into Supabase Leads table
    // The RLS policy "Agents view/edit own leads" will successfully allow this
    // because we are setting owner_id = user.id
    const { error: insertError } = await supabase
        .from('leads')
        .insert({
            agency_id: userData.agency_id,
            owner_id: user.id,
            first_name: data.firstName,
            last_name: data.lastName,
            email: data.email,
            phone: data.phone,
            destination_country: data.destinationCountry,
            course_interest: data.courseInterest,
            is_shared_with_company: data.isSharedWithCompany,
            status: 'New'
        })

    if (insertError) {
        console.error("Supabase Insert Error:", insertError)
        return { error: 'Failed to create lead in database: ' + insertError.message }
    }

    // Revalidate the private leads page and redirect
    revalidatePath('/dashboard/leads/private')
    redirect('/dashboard/leads/private')
}
