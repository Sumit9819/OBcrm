import { LeadForm } from "@/components/leads/lead-form"

export default function NewLeadPage() {
    return (
        <div className="flex-1 space-y-8 p-4 pt-6 md:p-8 max-w-4xl mx-auto">
            <div className="flex flex-col space-y-2 mb-8 relative">
                <h2 className="text-3xl font-bold tracking-tight">Add New Lead</h2>
                <p className="text-muted-foreground">
                    Register a new student inquiry into your pipeline. By default, this lead will remain private to your sandbox.
                </p>

                {/* Subtle decorative accent */}
                <div className="absolute -top-6 -left-6 w-24 h-24 bg-primary/5 rounded-full blur-2xl -z-10" />
            </div>

            <div className="bg-card rounded-xl border border-border/40 shadow-sm overflow-hidden relative">
                {/* Decorative top border line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/40 to-transparent" />

                <div className="p-6 md:p-8">
                    <LeadForm />
                </div>
            </div>
        </div>
    )
}
