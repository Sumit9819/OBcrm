import { redirect } from 'next/navigation'

// /admin/agencies → alias for the main admin page
export default function AgenciesPage() {
    redirect('/admin')
}
