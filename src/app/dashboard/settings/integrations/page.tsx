import { createClient } from "@/lib/supabase/server"
import { getAgencyIntegrations } from "./actions"
import { IntegrationsClient } from "./integration-client"

export default async function IntegrationsPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Fetch existing integrations connected to this agency
    const { data: integrations } = await getAgencyIntegrations()

    return (
        <div className="flex-1 space-y-8 p-4 pt-6 md:p-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Integrations</h2>
                <p className="text-muted-foreground mt-1">
                    Connect third-party services to automate your workflow.
                </p>
            </div>

            {/* Pass the integrations array to the interactive client component */}
            <IntegrationsClient integrations={integrations || []} />

        </div>
    )
}
