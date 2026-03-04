import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

// The root page simply checks for a session.
// If logged in, redirect to the dashboard.
// If logged out, redirect to the login page.
export default async function Home() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect("/dashboard")
  } else {
    redirect("/login")
  }
}
