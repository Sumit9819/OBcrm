"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, ArrowLeft, GraduationCap, Trash2, Edit } from "lucide-react"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { saveCourse, deleteCourse } from "../actions"
import Link from "next/link"

type Course = {
    id: string
    university_id: string
    name: string
    level: string | null
    intake_months: string[] | null
    tuition_fee: number | null
    currency: string | null
    min_gpa_required: number | null
    min_ielts_required: number | null
}

export default function CoursesClient({ university, courses, isAdmin }: { university: any, courses: Course[], isAdmin: boolean }) {
    const [dialogOpen, setDialogOpen] = useState(false)
    const [saving, setSaving] = useState(false)

    // Form state
    const [editingId, setEditingId] = useState<string | null>(null)
    const [name, setName] = useState("")
    const [level, setLevel] = useState("Bachelor")
    const [tuitionFee, setTuitionFee] = useState("")
    const [currency, setCurrency] = useState("USD")
    const [minGpa, setMinGpa] = useState("")
    const [minIelts, setMinIelts] = useState("")
    const [intakeMonths, setIntakeMonths] = useState("Fall")

    const handleOpenCreate = () => {
        setEditingId(null)
        setName("")
        setLevel("Bachelor")
        setTuitionFee("")
        setCurrency("USD")
        setMinGpa("")
        setMinIelts("")
        setIntakeMonths("Fall")
        setDialogOpen(true)
    }

    const handleOpenEdit = (course: Course) => {
        setEditingId(course.id)
        setName(course.name)
        setLevel(course.level || "Bachelor")
        setTuitionFee(course.tuition_fee?.toString() || "")
        setCurrency(course.currency || "USD")
        setMinGpa(course.min_gpa_required?.toString() || "")
        setMinIelts(course.min_ielts_required?.toString() || "")
        setIntakeMonths(course.intake_months?.[0] || "Fall")
        setDialogOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return toast.error("Course Name is required")

        setSaving(true)
        const result = await saveCourse({
            id: editingId || undefined,
            university_id: university.id,
            name,
            level,
            intake_months: [intakeMonths],
            tuition_fee: tuitionFee ? parseFloat(tuitionFee) : undefined,
            currency,
            min_gpa_required: minGpa ? parseFloat(minGpa) : undefined,
            min_ielts_required: minIelts ? parseFloat(minIelts) : undefined,
        })

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success(editingId ? "Course updated!" : "Course added!")
            setDialogOpen(false)
        }
        setSaving(false)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this course?")) return
        const result = await deleteCourse(id, university.id)
        if (result.error) toast.error(result.error)
        else toast.success("Course deleted")
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/settings/partners">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{university.name} - Courses</h2>
                    <p className="text-muted-foreground">Manage courses and eligibility criteria for this institution.</p>
                </div>
                <div className="ml-auto">
                    {isAdmin && (
                        <Button onClick={handleOpenCreate}>
                            <Plus className="h-4 w-4 mr-2" /> Add Course
                        </Button>
                    )}
                </div>
            </div>

            <div className="rounded-xl border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Course Name</TableHead>
                            <TableHead>Level</TableHead>
                            <TableHead>Min. GPA</TableHead>
                            <TableHead>Min. IELTS</TableHead>
                            <TableHead>Tuition</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {courses.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No courses found. Add one to get started.</TableCell>
                            </TableRow>
                        ) : (
                            courses.map(course => (
                                <TableRow key={course.id}>
                                    <TableCell>
                                        <div className="font-medium flex items-center gap-2">
                                            <GraduationCap className="h-4 w-4 text-muted-foreground" />
                                            {course.name}
                                        </div>
                                        {course.intake_months && course.intake_months.length > 0 && (
                                            <div className="text-xs text-muted-foreground mt-1">Intake: {course.intake_months.join(', ')}</div>
                                        )}
                                    </TableCell>
                                    <TableCell>{course.level || "—"}</TableCell>
                                    <TableCell>
                                        {course.min_gpa_required ? <span className="font-medium text-emerald-600">{course.min_gpa_required}</span> : "—"}
                                    </TableCell>
                                    <TableCell>
                                        {course.min_ielts_required ? <span className="font-medium text-emerald-600">{course.min_ielts_required}</span> : "—"}
                                    </TableCell>
                                    <TableCell>
                                        {course.tuition_fee ? `${course.tuition_fee.toLocaleString()} ${course.currency || 'USD'}` : "—"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {isAdmin && (
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(course)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(course.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Edit Course' : 'Add Course'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Course Name *</Label>
                                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Master of Computer Science" required />
                            </div>
                            <div className="grid gap-2">
                                <Label>Level</Label>
                                <Select value={level} onValueChange={setLevel}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Bachelor">Bachelor</SelectItem>
                                        <SelectItem value="Master">Master</SelectItem>
                                        <SelectItem value="Diploma">Diploma</SelectItem>
                                        <SelectItem value="PhD">PhD</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Estimated Tuition</Label>
                                <div className="flex gap-2">
                                    <Input value={tuitionFee} onChange={e => setTuitionFee(e.target.value)} placeholder="e.g. 24000" type="number" />
                                    <Input value={currency} onChange={e => setCurrency(e.target.value)} className="w-24" placeholder="USD" />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>Intake Season</Label>
                                <Select value={intakeMonths} onValueChange={setIntakeMonths}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Fall">Fall (Aug/Sep)</SelectItem>
                                        <SelectItem value="Spring">Spring (Jan/Feb)</SelectItem>
                                        <SelectItem value="Summer">Summer (May/Jun)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="p-4 border rounded-lg bg-emerald-50/30 space-y-4">
                            <h4 className="font-semibold text-sm text-emerald-900">Eligibility Criteria (Matcher)</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Min. Required GPA</Label>
                                    <Input value={minGpa} onChange={e => setMinGpa(e.target.value)} placeholder="e.g. 3.0" type="number" step="0.01" />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Min. Required IELTS</Label>
                                    <Input value={minIelts} onChange={e => setMinIelts(e.target.value)} placeholder="e.g. 6.5" type="number" step="0.5" />
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Course"}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
