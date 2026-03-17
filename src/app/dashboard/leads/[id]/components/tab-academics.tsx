import { Button } from "@/components/ui/button"
import { TabsContent } from "@/components/ui/tabs"
import { Plus } from "lucide-react"

interface TabAcademicsProps {
    lead: any
}

export function TabAcademics({ lead }: TabAcademicsProps) {
    return (
        <TabsContent value="academics" className="m-0 space-y-4 outline-none">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg">Academic Profile</h3>
            </div>

            {/* Top stats for auto-matching */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-3 border rounded-xl bg-slate-50/50">
                    <p className="text-xs text-muted-foreground mb-1">Calculated GPA</p>
                    <p className="text-xl font-bold">{lead.calculated_gpa || '\u2014'}</p>
                </div>
                <div className="p-3 border rounded-xl bg-slate-50/50">
                    <p className="text-xs text-muted-foreground mb-1">English Test Type</p>
                    <p className="text-xl font-bold">{lead.english_test_type || '\u2014'}</p>
                </div>
                <div className="p-3 border rounded-xl bg-slate-50/50">
                    <p className="text-xs text-muted-foreground mb-1">Test Score</p>
                    <p className="text-xl font-bold">{lead.english_test_score || '\u2014'}</p>
                </div>
                <div className="p-3 border rounded-xl bg-slate-50/50 flex flex-col justify-center">
                    <Button variant="outline" size="sm" className="w-full">
                        Edit Stats
                    </Button>
                </div>
            </div>

            <div className="flex justify-between items-center mb-2 mt-8">
                <h3 className="font-semibold">Previous Qualifications</h3>
                <Button variant="outline" size="sm" className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Add Qualification
                </Button>
            </div>
            <div className="p-8 text-center border border-dashed rounded-lg text-muted-foreground text-sm">
                No qualifications added yet. Detailed qualifications list will appear here.
            </div>
        </TabsContent>
    )
}
