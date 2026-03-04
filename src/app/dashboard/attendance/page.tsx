"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ClipboardList, ChevronLeft, ChevronRight, Download } from "lucide-react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWeekend } from "date-fns"
import { toast } from "sonner"

type Employee = { id: string; name: string; role: string }
type AttendanceRecord = {
    id: string; user_id: string; date: string
    status: "present" | "absent" | "leave" | "half_day"
}

const statusConfig = {
    present: { label: "Present", short: "P", color: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50 text-emerald-700" },
    absent: { label: "Absent", short: "A", color: "bg-red-500", text: "text-red-700", bg: "bg-red-50 text-red-700" },
    leave: { label: "Leave", short: "L", color: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50 text-amber-700" },
    half_day: { label: "Half Day", short: "H", color: "bg-blue-400", text: "text-blue-700", bg: "bg-blue-50 text-blue-700" },
}

export default function AttendancePage() {
    const [employees, setEmployees] = useState<Employee[]>([])
    const [records, setRecords] = useState<AttendanceRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [saving, setSaving] = useState<string | null>(null) // key: empId-date
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [userRole, setUserRole] = useState("")

    const supabase = createClient()

    const load = useCallback(async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
            .from('users').select('id, role, agency_id').eq('id', user.id).single()

        setCurrentUser(profile)
        setUserRole(profile?.role || '')

        // Load real employees from this agency
        const { data: emps } = await supabase
            .from('users')
            .select('id, first_name, last_name, role')
            .eq('agency_id', profile?.agency_id)
            .neq('role', 'student')
            .order('first_name')

        setEmployees((emps || []).map(u => ({
            id: u.id,
            name: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
            role: u.role,
        })))

        // Load attendance records for this month
        const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
        const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd')

        const { data: att } = await supabase
            .from('attendance')
            .select('id, user_id, date, status')
            .eq('agency_id', profile?.agency_id)
            .gte('date', monthStart)
            .lte('date', monthEnd)

        setRecords(att || [])
        setLoading(false)
    }, [currentMonth])

    useEffect(() => { load() }, [load])

    const setStatus = async (empId: string, date: string, status: AttendanceRecord["status"]) => {
        const key = `${empId}-${date}`
        setSaving(key)

        const existing = records.find(r => r.user_id === empId && r.date === date)

        if (existing) {
            const { error } = await supabase
                .from('attendance')
                .update({ status })
                .eq('id', existing.id)

            if (!error) {
                setRecords(prev => prev.map(r => r.id === existing.id ? { ...r, status } : r))
                toast.success(`${status} saved`)
            }
        } else {
            const { data, error } = await supabase
                .from('attendance')
                .insert({
                    agency_id: currentUser?.agency_id,
                    user_id: empId,
                    date,
                    status,
                    marked_by: currentUser?.id,
                })
                .select()
                .single()

            if (!error && data) {
                setRecords(prev => [...prev, data])
                toast.success(`${status} marked`)
            }
        }
        setSaving(null)
    }

    const getStatus = (empId: string, date: string) =>
        records.find(r => r.user_id === empId && r.date === date)?.status

    const getSummary = (empId: string) => {
        const empRecords = records.filter(r => r.user_id === empId)
        return {
            present: empRecords.filter(r => r.status === "present").length,
            absent: empRecords.filter(r => r.status === "absent").length,
            leave: empRecords.filter(r => r.status === "leave").length,
            half_day: empRecords.filter(r => r.status === "half_day").length,
        }
    }

    // Mark all present for today
    const markAllPresentToday = async () => {
        const today = format(new Date(), "yyyy-MM-dd")
        for (const emp of employees) {
            const existing = records.find(r => r.user_id === emp.id && r.date === today)
            if (!existing) {
                await setStatus(emp.id, today, "present")
            }
        }
        toast.success("All employees marked present for today!")
    }

    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd }).filter(d => !isWeekend(d))
    const today = new Date()
    const isAdmin = ['super_admin', 'agency_admin'].includes(userRole)

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 bg-slate-50/50 min-h-screen">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                        <ClipboardList className="h-6 w-6 text-primary" /> Attendance
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                        Track daily attendance. Approved leaves auto-fill as &quot;Leave&quot; here.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {isAdmin && (
                        <Button variant="outline" size="sm" onClick={markAllPresentToday} className="gap-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                            ✓ Mark All Present Today
                        </Button>
                    )}
                    <Button variant="outline" size="icon" onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1))}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-semibold min-w-[130px] text-center">{format(currentMonth, "MMMM yyyy")}</span>
                    <Button variant="outline" size="icon" onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1))}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            {loading ? (
                <div className="py-8 text-center text-muted-foreground text-sm">Loading attendance data...</div>
            ) : (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {employees.map(emp => {
                            const s = getSummary(emp.id)
                            return (
                                <Card key={emp.id} className="shadow-sm">
                                    <CardContent className="p-4">
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center text-white font-bold text-sm mb-2">
                                            {emp.name.charAt(0).toUpperCase()}
                                        </div>
                                        <p className="font-semibold text-sm truncate">{emp.name}</p>
                                        <p className="text-[10px] text-muted-foreground capitalize mb-2">{emp.role?.replace('_', ' ')}</p>
                                        <div className="flex gap-1.5 flex-wrap">
                                            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">P {s.present}</span>
                                            <span className="text-[11px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">A {s.absent}</span>
                                            <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">L {s.leave}</span>
                                            {s.half_day > 0 && <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">H {s.half_day}</span>}
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>

                    {/* Attendance Grid */}
                    <Card className="shadow-sm overflow-hidden">
                        <CardHeader className="py-3 border-b bg-indigo-600">
                            <CardTitle className="text-sm font-bold text-white uppercase">
                                Daily Attendance — {format(currentMonth, "MMMM yyyy")} ({days.length} working days)
                            </CardTitle>
                        </CardHeader>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 border-b">
                                        <th className="text-left px-4 py-2 font-semibold text-slate-600 sticky left-0 bg-slate-50 min-w-[180px] z-10">Employee</th>
                                        {days.map(d => (
                                            <th key={d.toISOString()} className={`px-1 py-2 text-center font-medium min-w-[44px] text-xs ${isSameDay(d, today) ? "text-primary font-bold" : "text-slate-500"}`}>
                                                <div>{format(d, "EEE")}</div>
                                                <div className={`w-6 h-6 rounded-full mx-auto flex items-center justify-center text-[11px] ${isSameDay(d, today) ? "bg-primary text-white" : ""}`}>
                                                    {format(d, "d")}
                                                </div>
                                            </th>
                                        ))}
                                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500 min-w-[60px]">P/A/L</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {employees.map((emp, i) => {
                                        const s = getSummary(emp.id)
                                        return (
                                            <tr key={emp.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                                                <td className="px-4 py-2 font-medium sticky left-0 bg-inherit border-r z-10">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">
                                                            {emp.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="truncate max-w-[120px] text-sm">{emp.name}</span>
                                                    </div>
                                                </td>
                                                {days.map(d => {
                                                    const dateStr = format(d, "yyyy-MM-dd")
                                                    const status = getStatus(emp.id, dateStr)
                                                    const isFuture = d > today
                                                    const key = `${emp.id}-${dateStr}`
                                                    const isSavingThis = saving === key
                                                    return (
                                                        <td key={dateStr} className="px-1 py-1.5 text-center">
                                                            {isFuture ? (
                                                                <span className="text-slate-200 text-xs">—</span>
                                                            ) : isAdmin ? (
                                                                <Select
                                                                    value={status || ""}
                                                                    onValueChange={v => setStatus(emp.id, dateStr, v as AttendanceRecord["status"])}
                                                                    disabled={isSavingThis}
                                                                >
                                                                    <SelectTrigger className={`h-7 w-10 border-0 p-0 shadow-none text-center justify-center text-xs font-bold rounded ${status ? statusConfig[status].bg : "bg-slate-100 text-slate-400"} ${isSavingThis ? "opacity-50" : ""}`}>
                                                                        <SelectValue placeholder="–">
                                                                            {status ? statusConfig[status].short : "–"}
                                                                        </SelectValue>
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="present">✓ Present</SelectItem>
                                                                        <SelectItem value="absent">✗ Absent</SelectItem>
                                                                        <SelectItem value="leave">⏸ Leave</SelectItem>
                                                                        <SelectItem value="half_day">½ Half Day</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            ) : (
                                                                // Non-admin: read-only view
                                                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${status ? statusConfig[status].bg : "text-slate-300"}`}>
                                                                    {status ? statusConfig[status].short : "—"}
                                                                </span>
                                                            )}
                                                        </td>
                                                    )
                                                })}
                                                <td className="px-3 py-2 text-center">
                                                    <div className="text-xs text-muted-foreground font-medium">
                                                        <span className="text-emerald-600">{s.present}</span>/
                                                        <span className="text-red-500">{s.absent}</span>/
                                                        <span className="text-amber-500">{s.leave}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </>
            )}
        </div>
    )
}
