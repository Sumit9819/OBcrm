import { TabsContent } from "@/components/ui/tabs"

interface CustomField {
    id: string
    field_key: string
    field_label: string
}

interface TabDetailsProps {
    customFields: CustomField[]
    lead: any
}

export function TabDetails({ customFields, lead }: TabDetailsProps) {
    if (customFields.length === 0) return null;

    return (
        <TabsContent value="details" className="m-0 space-y-4 outline-none">
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">Custom Information</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border rounded-lg p-4 bg-background">
                {customFields.map((f) => (
                    <div key={f.id} className="pb-2 border-b last:border-0 sm:last:border-b-0 sm:nth-last-2:border-0">
                        <p className="text-xs text-muted-foreground">{f.field_label}</p>
                        <p className="font-medium text-sm mt-0.5 break-words">
                            {lead.custom_data?.[f.field_key] !== undefined && lead.custom_data[f.field_key] !== ""
                                ? String(lead.custom_data[f.field_key])
                                : '\u2014'}
                        </p>
                    </div>
                ))}
            </div>
        </TabsContent>
    )
}
