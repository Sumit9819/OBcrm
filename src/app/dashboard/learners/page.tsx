import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { GraduationCap, Globe, BookOpen, User, ArrowRight, Phone, Mail, FlaskConical } from "lucide-react"
import { format } from "date-fns"

export default async function LearnersPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    // Fetch test-prep learners (IELTS, TOEFL, PTE etc.)
    const { data: learners } = await supabase
        .from("leads")
        .select(`
            id, first_name, last_name, email, phone,
            destination_country, course_interest, nationality,
            academic_qualification, created_at, updated_at, status, student_type,
            referrer:users!leads_referred_by_fkey(id, first_name, last_name),
            assigned:users!leads_assigned_to_fkey(first_name, last_name)
        `)
        .eq("student_type", "test_prep")
        .eq("status", "Enrolled")
        .order("updated_at", { ascending: false })

    const total = learners?.length || 0

    return (
        <div className="flex-1 space-y-8 p-4 pt-6 md:p-8">
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <FlaskConical className="h-7 w-7 text-primary" /> Learners
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Students enrolled in test preparation — IELTS, TOEFL, PTE, and more.
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-5">
                        <p className="text-xs text-muted-foreground">Total Learners</p>
                        <p className="text-3xl font-bold mt-1">{total}</p>
                    </CardContent>
                </Card>
                {["IELTS", "TOEFL", "PTE", "Spoken English"].map(test => (
                    <Card key={test}>
                        <CardContent className="p-5">
                            <p className="text-xs text-muted-foreground">{test}</p>
                            <p className="text-3xl font-bold mt-1">
                                {learners?.filter(l =>
                                    l.course_interest?.toLowerCase().includes(test.toLowerCase())
                                ).length || 0}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Learners list */}
            {total === 0 ? (
                <Card>
                    <CardContent className="p-16 text-center">
                        <FlaskConical className="h-12 w-12 mx-auto text-muted-foreground/20 mb-3" />
                        <p className="text-muted-foreground">No learners yet.</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Convert a lead to a Learner from the lead profile page.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-3">
                    {learners?.map(learner => (
                        <Card key={learner.id} className="hover:border-primary/40 transition-colors">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-4 flex-wrap">
                                    {/* Avatar */}
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                        {learner.first_name?.charAt(0)}{learner.last_name?.charAt(0)}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-semibold">{learner.first_name} {learner.last_name}</p>
                                            <Badge className="bg-violet-100 text-violet-700 shadow-none border-none text-xs">
                                                <FlaskConical className="h-3 w-3 mr-1" />Test Prep
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                                            {learner.email && (
                                                <span className="flex items-center gap-1">
                                                    <Mail className="h-3 w-3" />{learner.email}
                                                </span>
                                            )}
                                            {learner.phone && (
                                                <span className="flex items-center gap-1">
                                                    <Phone className="h-3 w-3" />{learner.phone}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Course */}
                                    <div className="hidden md:block text-sm min-w-0">
                                        {learner.course_interest && (
                                            <p className="flex items-center gap-1 text-muted-foreground">
                                                <BookOpen className="h-3.5 w-3.5 shrink-0" />
                                                <span className="truncate">{learner.course_interest}</span>
                                            </p>
                                        )}
                                        {learner.academic_qualification && (
                                            <p className="flex items-center gap-1 text-muted-foreground mt-0.5 text-xs">
                                                <GraduationCap className="h-3 w-3" />{learner.academic_qualification.replace('_', ' ')}
                                            </p>
                                        )}
                                    </div>

                                    {/* Referrer */}
                                    <div className="hidden lg:block text-sm text-muted-foreground">
                                        {(learner as any).referrer ? (
                                            <p className="flex items-center gap-1">
                                                <User className="h-3.5 w-3.5" />
                                                via {(learner as any).referrer.first_name} {(learner as any).referrer.last_name}
                                            </p>
                                        ) : (
                                            <p className="text-xs text-muted-foreground">Direct</p>
                                        )}
                                        <p className="text-xs mt-0.5">Enrolled {format(new Date(learner.updated_at), "MMM dd, yyyy")}</p>
                                    </div>

                                    {/* Action */}
                                    <Link href={`/dashboard/leads/${learner.id}`}>
                                        <Button variant="ghost" size="sm" className="gap-1.5 shrink-0">
                                            View Profile <ArrowRight className="h-3.5 w-3.5" />
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
