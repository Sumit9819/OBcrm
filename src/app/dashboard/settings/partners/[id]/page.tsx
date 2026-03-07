import { createClient } from "@/lib/supabase/server"
import CoursesClient from "./courses-client"
import { redirect } from "next/navigation"

export default async function UniversityCoursesPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const { id } = params;
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: university } = await supabase
        .from('universities')
        .select('*')
        .eq('id', id)
        .single()

    if (!university) {
        redirect('/dashboard/settings/partners')
    }

    const { data: courses } = await supabase
        .from('university_courses')
        .select('*')
        .eq('university_id', id)
        .order('name')

    const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single()
    const isAdmin = userData?.role === 'super_admin' || userData?.role === 'agency_admin'

    return <CoursesClient university={university} courses={courses || []} isAdmin={isAdmin} />
}
