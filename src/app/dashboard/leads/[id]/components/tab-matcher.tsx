import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TabsContent } from "@/components/ui/tabs"
import { Globe, FlaskConical, Loader2, GraduationCap, MapPin } from "lucide-react"

interface University {
    name: string
    country: string
}

interface Course {
    id: string
    name: string
    intakes?: string
    tuition_fee?: number
    universities?: University
}

interface TabMatcherProps {
    lead: any
    loadingCourses: boolean
    matchedCourses: Course[]
}

export function TabMatcher({ lead, loadingCourses, matchedCourses }: TabMatcherProps) {
    return (
        <TabsContent value="matcher" className="m-0 space-y-4 outline-none">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        Smart Matcher
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">BETA</Badge>
                    </h3>
                    <p className="text-sm text-muted-foreground">Auto-suggested courses based on {lead.first_name}'s academic profile (GPA: {lead.calculated_gpa || 'N/A'}, {lead.english_test_type || 'English'}: {lead.english_test_score || 'N/A'})</p>
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                    <Globe className="h-4 w-4" /> Filter Matcher
                </Button>
            </div>

            {!(lead.calculated_gpa || lead.english_test_score) ? (
                <div className="p-8 text-center border border-dashed rounded-lg bg-emerald-50/30">
                    <FlaskConical className="h-8 w-8 text-emerald-400 mx-auto mb-3" />
                    <h4 className="font-medium text-emerald-900">Need More Academic Data</h4>
                    <p className="text-sm text-emerald-700/80 mt-1 max-w-sm mx-auto">Update the student's Academics profile with their GPA or English test scores to unlock automatic course matching.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {loadingCourses ? (
                        <div className="p-8 text-center border border-dashed rounded-lg bg-slate-50/50">
                            <Loader2 className="h-8 w-8 text-slate-400 animate-spin mx-auto mb-3" />
                            <h4 className="font-medium text-slate-700">Finding Best Matches...</h4>
                        </div>
                    ) : matchedCourses.length === 0 ? (
                        <div className="p-8 text-center border border-dashed rounded-lg bg-slate-50/50">
                            <GraduationCap className="h-8 w-8 text-slate-400 mx-auto mb-3" />
                            <h4 className="font-medium text-slate-700">No matching courses found</h4>
                            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">Try adding more university courses or updating the lead's academic profile.</p>
                        </div>
                    ) : (
                        matchedCourses.map((course) => (
                            <div key={course.id} className="p-4 border rounded-xl bg-background hover:border-emerald-200 transition-colors flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-slate-100 border flex items-center justify-center font-bold text-slate-400 text-xl">
                                        {course.universities?.name?.charAt(0) || 'U'}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold">{course.name}</h4>
                                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                                            <MapPin className="h-3 w-3" /> {course.universities?.name}, {course.universities?.country}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-2">
                                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
                                        Perfect Match \u2713
                                    </Badge>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span>Intake: {course.intakes || 'Any'}</span>
                                        {course.tuition_fee && (
                                            <>
                                                <span>\u2022</span>
                                                <span>${course.tuition_fee}/yr</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </TabsContent>
    )
}
