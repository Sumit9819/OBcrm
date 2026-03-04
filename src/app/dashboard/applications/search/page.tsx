"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, GraduationCap, Globe, Plus, BookOpen } from "lucide-react"
import { toast } from "sonner"

export default function UniversitySearchPage() {
    const [universities, setUniversities] = useState<any[]>([])
    const [search, setSearch] = useState("")
    const [loading, setLoading] = useState(true)
    const [showAddUni, setShowAddUni] = useState(false)
    const [showAddCourse, setShowAddCourse] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [userRole, setUserRole] = useState("")

    const supabase = createClient()

    useEffect(() => {
        fetchData()
        fetchUser()
    }, [])

    const fetchUser = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
            setUserRole(data?.role || '')
        }
    }

    const fetchData = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('universities')
            .select('*, courses(id, name, level, intake_season, tuition_fee)')
            .order('name', { ascending: true })
        if (data) setUniversities(data)
        setLoading(false)
    }

    const isAdmin = userRole === 'super_admin' || userRole === 'agency_admin'

    const filtered = universities.filter(u =>
        `${u.name} ${u.country}`.toLowerCase().includes(search.toLowerCase())
    )

    const handleAddUniversity = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setSaving(true)
        const fd = new FormData(e.currentTarget)

        const { data: { user } } = await supabase.auth.getUser()
        const { data: userData } = await supabase.from('users').select('agency_id').eq('id', user?.id).single()

        const { error } = await supabase.from('universities').insert({
            agency_id: userData?.agency_id,
            name: fd.get('name') as string,
            country: fd.get('country') as string,
            website: fd.get('website') as string || null,
            base_commission_rate: parseFloat(fd.get('commission') as string) || null,
        })

        if (error) toast.error(error.message)
        else {
            toast.success("University added!")
            setShowAddUni(false)
            fetchData()
        }
        setSaving(false)
    }

    const handleAddCourse = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!showAddCourse) return
        setSaving(true)
        const fd = new FormData(e.currentTarget)

        const { error } = await supabase.from('courses').insert({
            university_id: showAddCourse,
            name: fd.get('name') as string,
            level: fd.get('level') as string || null,
            intake_season: fd.get('intake') as string || null,
            tuition_fee: parseFloat(fd.get('fee') as string) || null,
        })

        if (error) toast.error(error.message)
        else {
            toast.success("Course added!")
            setShowAddCourse(null)
            fetchData()
        }
        setSaving(false)
    }

    return (
        <div className="flex-1 space-y-8 p-4 pt-6 md:p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">University & Course Search</h2>
                    <p className="text-muted-foreground mt-1">Browse partner universities and available courses.</p>
                </div>
                {isAdmin && (
                    <Dialog open={showAddUni} onOpenChange={setShowAddUni}>
                        <DialogTrigger asChild>
                            <Button className="gap-2"><Plus className="w-4 h-4" /> Add University</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <form onSubmit={handleAddUniversity}>
                                <DialogHeader>
                                    <DialogTitle>Add University</DialogTitle>
                                    <DialogDescription>Add a new partner university.</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label>University Name</Label>
                                        <Input name="name" placeholder="e.g. University of Melbourne" required />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Country</Label>
                                        <Input name="country" placeholder="e.g. Australia" required />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Website</Label>
                                        <Input name="website" placeholder="https://..." />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Commission Rate (%)</Label>
                                        <Input name="commission" type="number" step="0.1" placeholder="15" />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={saving}>{saving ? "Adding..." : "Add University"}</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by name or country..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9"
                />
            </div>

            {/* University Table */}
            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>University</TableHead>
                            <TableHead>Country</TableHead>
                            <TableHead>Website</TableHead>
                            <TableHead>Commission Rate</TableHead>
                            <TableHead>Courses</TableHead>
                            {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">Loading...</TableCell>
                            </TableRow>
                        ) : filtered.length > 0 ? (
                            filtered.map((uni: any) => (
                                <TableRow key={uni.id} className="hover:bg-muted/50">
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <GraduationCap className="w-4 h-4 text-indigo-500" />
                                            {uni.name}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                                            {uni.country}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-blue-600 text-sm">
                                        {uni.website ? <a href={uni.website} target="_blank" rel="noopener">{uni.website}</a> : '—'}
                                    </TableCell>
                                    <TableCell className="font-semibold">{uni.base_commission_rate ? `${uni.base_commission_rate}%` : '—'}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{uni.courses?.length || 0} courses</TableCell>
                                    {isAdmin && (
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" className="gap-1" onClick={() => setShowAddCourse(uni.id)}>
                                                <BookOpen className="w-3.5 h-3.5" /> Add Course
                                            </Button>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                    {search ? 'No universities match your search.' : 'No partner universities added yet.'}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Add Course Dialog */}
            <Dialog open={!!showAddCourse} onOpenChange={(open) => { if (!open) setShowAddCourse(null) }}>
                <DialogContent>
                    <form onSubmit={handleAddCourse}>
                        <DialogHeader>
                            <DialogTitle>Add Course</DialogTitle>
                            <DialogDescription>Add a new course to this university.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Course Name</Label>
                                <Input name="name" placeholder="e.g. Bachelor of Computer Science" required />
                            </div>
                            <div className="grid gap-2">
                                <Label>Level</Label>
                                <Input name="level" placeholder="e.g. Undergraduate, Masters" />
                            </div>
                            <div className="grid gap-2">
                                <Label>Intake Season</Label>
                                <Input name="intake" placeholder="e.g. Feb 2026, Jul 2026" />
                            </div>
                            <div className="grid gap-2">
                                <Label>Tuition Fee (USD)</Label>
                                <Input name="fee" type="number" placeholder="25000" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={saving}>{saving ? "Adding..." : "Add Course"}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
