import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { GraduationCap, Globe, BookOpen, User, ArrowRight, Phone, Mail } from "lucide-react"
import { format } from "date-fns"

export default async function StudentsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    const { data: profile } = await supabase
        .from("users")
        .select("role, agency_id")
        .eq("id", user.id)
        .single()

    // Fetch all enrolled leads (students)
    const { data: students } = await supabase
        .from("leads")
        .select(`
            id, first_name, last_name, email, phone,
            destination_country, course_interest, nationality,
            created_at, updated_at, status,
            referrer:users!leads_referred_by_fkey(id, first_name, last_name),
            assigned:users!leads_assigned_to_fkey(first_name, last_name)
        `)
        .eq("status", "Enrolled")
        .order("updated_at", { ascending: false })

    const totalStudents = students?.length || 0
    const destinations = [...new Set(students?.map(s => s.destination_country).filter(Boolean))]

    return (
        <div className="flex-1 space-y-8 p-4 pt-6 md:p-8">
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <GraduationCap className="h-7 w-7 text-primary" /> Students
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        All enrolled students — leads that have been converted.
                    </p>
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-5">
                        <p className="text-xs text-muted-foreground">Total Enrolled</p>
                        <p className="text-3xl font-bold mt-1">{totalStudents}</p>
                    </CardContent>
                </Card>
                {destinations.slice(0, 3).map(dest => (
                    <Card key={dest}>
                        <CardContent className="p-5">
                            <p className="text-xs text-muted-foreground">{dest}</p>
                            <p className="text-3xl font-bold mt-1">
                                {students?.filter(s => s.destination_country === dest).length}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Students table */}
            {totalStudents === 0 ? (
                <Card>
                    <CardContent className="p-16 text-center">
                        <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground/20 mb-3" />
                        <p className="text-muted-foreground">No enrolled students yet.</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Convert a lead to a student from the lead profile page.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-3">
                    {students?.map(student => (
                        <Card key={student.id} className="hover:border-primary/40 transition-colors">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-4 flex-wrap">
                                    {/* Avatar */}
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                        {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-semibold">{student.first_name} {student.last_name}</p>
                                            <Badge className="bg-emerald-100 text-emerald-700 shadow-none border-none text-xs">
                                                <GraduationCap className="h-3 w-3 mr-1" />Enrolled
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                                            {student.email && (
                                                <span className="flex items-center gap-1">
                                                    <Mail className="h-3 w-3" />{student.email}
                                                </span>
                                            )}
                                            {student.phone && (
                                                <span className="flex items-center gap-1">
                                                    <Phone className="h-3 w-3" />{student.phone}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Destination & Course */}
                                    <div className="hidden md:block text-sm min-w-0">
                                        {student.destination_country && (
                                            <p className="flex items-center gap-1 text-muted-foreground">
                                                <Globe className="h-3.5 w-3.5" />{student.destination_country}
                                            </p>
                                        )}
                                        {student.course_interest && (
                                            <p className="flex items-center gap-1 text-muted-foreground mt-0.5 truncate">
                                                <BookOpen className="h-3.5 w-3.5 shrink-0" />
                                                <span className="truncate">{student.course_interest}</span>
                                            </p>
                                        )}
                                    </div>

                                    {/* Referrer */}
                                    <div className="hidden lg:block text-sm text-muted-foreground">
                                        {(student as any).referrer ? (
                                            <p className="flex items-center gap-1">
                                                <User className="h-3.5 w-3.5" />
                                                via {(student as any).referrer.first_name} {(student as any).referrer.last_name}
                                            </p>
                                        ) : (
                                            <p className="text-xs text-muted-foreground">Direct</p>
                                        )}
                                        <p className="text-xs mt-0.5">Enrolled {format(new Date(student.updated_at), "MMM dd, yyyy")}</p>
                                    </div>

                                    {/* Action */}
                                    <Link href={`/dashboard/leads/${student.id}`}>
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
