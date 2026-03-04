"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { CheckSquare, Plus, Search, Flag, Calendar, Trash2, Circle } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"

type Task = {
    id: string; title: string; description?: string
    status: 'open' | 'in_progress' | 'done'
    priority: 'low' | 'medium' | 'high'
    due_date?: string; created_at: string
    lead?: { id: string; first_name: string; last_name: string } | null
    assigned_user?: { first_name: string; last_name: string } | null
}

const priorityColors = {
    low: 'text-slate-500 bg-slate-100',
    medium: 'text-amber-600 bg-amber-100',
    high: 'text-red-600 bg-red-100',
}
const statusColors = {
    open: 'text-slate-600 bg-slate-100',
    in_progress: 'text-blue-600 bg-blue-100',
    done: 'text-emerald-600 bg-emerald-100',
}

export default function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [priorityFilter, setPriorityFilter] = useState("all")
    const [dialogOpen, setDialogOpen] = useState(false)

    const [newTitle, setNewTitle] = useState("")
    const [newDesc, setNewDesc] = useState("")
    const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>("medium")
    const [newDue, setNewDue] = useState("")
    const [saving, setSaving] = useState(false)

    const supabase = createClient()

    const loadTasks = useCallback(async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
            .from('tasks')
            .select(`*, lead:leads(id, first_name, last_name), assigned_user:users!tasks_assigned_to_fkey(first_name, last_name)`)
            .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
            .order('created_at', { ascending: false })

        if (!error && data) setTasks(data)
        setLoading(false)
    }, [])

    useEffect(() => { loadTasks() }, [])

    const createTask = async () => {
        if (!newTitle.trim()) return
        setSaving(true)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase.from('users').select('agency_id').eq('id', user.id).single()

        const { error } = await supabase.from('tasks').insert({
            title: newTitle.trim(),
            description: newDesc.trim() || null,
            priority: newPriority,
            due_date: newDue || null,
            assigned_to: user.id,
            created_by: user.id,
            agency_id: profile?.agency_id,
            status: 'open',
        })

        if (error) { toast.error("Failed to create task") }
        else {
            toast.success("Task created")
            setNewTitle(""); setNewDesc(""); setNewPriority("medium"); setNewDue("")
            setDialogOpen(false)
            loadTasks()
        }
        setSaving(false)
    }

    const updateStatus = async (id: string, status: 'open' | 'in_progress' | 'done') => {
        await supabase.from('tasks').update({ status }).eq('id', id)
        setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t))
        if (status === 'done') toast.success("Task completed! ✅")
    }

    const deleteTask = async (id: string) => {
        await supabase.from('tasks').delete().eq('id', id)
        setTasks(prev => prev.filter(t => t.id !== id))
        toast.info("Task deleted")
    }

    const toggleDone = async (task: Task) => {
        const newStatus = task.status === 'done' ? 'open' : 'done'
        await updateStatus(task.id, newStatus)
    }

    const filtered = tasks.filter(t => {
        const matchSearch = t.title.toLowerCase().includes(search.toLowerCase())
        const matchStatus = statusFilter === 'all' || t.status === statusFilter
        const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter
        return matchSearch && matchStatus && matchPriority
    })

    const grouped = {
        open: filtered.filter(t => t.status === 'open'),
        in_progress: filtered.filter(t => t.status === 'in_progress'),
        done: filtered.filter(t => t.status === 'done'),
    }

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 bg-slate-50/50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <CheckSquare className="h-6 w-6 text-primary" /> My Tasks
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {tasks.filter(t => t.status !== 'done').length} pending · {tasks.filter(t => t.status === 'done').length} done
                    </p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2"><Plus className="h-4 w-4" /> New Task</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Create Task</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-2">
                            <div className="space-y-1.5">
                                <Label>Task Title *</Label>
                                <Input placeholder="What needs to be done?" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Description</Label>
                                <Textarea placeholder="Additional details..." value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={3} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label>Priority</Label>
                                    <Select value={newPriority} onValueChange={(v: any) => setNewPriority(v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">🔵 Low</SelectItem>
                                            <SelectItem value="medium">🟡 Medium</SelectItem>
                                            <SelectItem value="high">🔴 High</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Due Date</Label>
                                    <Input type="date" value={newDue} onChange={e => setNewDue(e.target.value)} />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={createTask} disabled={saving || !newTitle.trim()}>
                                {saving ? "Creating..." : "Create Task"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-36"><SelectValue placeholder="Priority" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Priority</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Kanban-style columns */}
            {loading ? (
                <div className="text-center py-20 text-muted-foreground">Loading tasks...</div>
            ) : (
                <div className="grid md:grid-cols-3 gap-4">
                    {(Object.entries(grouped) as [string, Task[]][]).map(([status, items]) => (
                        <Card key={status} className="shadow-sm">
                            <CardHeader className="pb-3 border-b">
                                <div className="flex items-center justify-between">
                                    {/* Column header label */}
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        <Circle className={`h-2.5 w-2.5 fill-current ${status === 'open' ? 'text-slate-400' : status === 'in_progress' ? 'text-blue-500' : 'text-emerald-500'}`} />
                                        {status === 'open' ? 'To Do' : status === 'in_progress' ? 'In Progress' : 'Done'}
                                    </CardTitle>
                                    <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-3 space-y-2">
                                {items.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-6 opacity-60">
                                        {status === 'todo' ? 'No pending tasks' : status === 'in_progress' ? 'Nothing in progress' : 'Nothing done yet'}
                                    </p>
                                ) : items.map(task => (
                                    <div key={task.id} className={`p-3 rounded-xl border bg-background shadow-sm hover:shadow-md transition-all group ${task.status === 'done' ? 'opacity-60' : ''}`}>
                                        <div className="flex items-start gap-2.5">
                                            <div
                                                onClick={() => toggleDone(task)}
                                                className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors
                                                    ${task.status === 'done' ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-emerald-400'}`}
                                            >
                                                {task.status === 'done' && <CheckSquare className="h-2.5 w-2.5 text-white" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-medium leading-snug ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                                                    {task.title}
                                                </p>
                                                {task.description && (
                                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>
                                                )}
                                                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                                    <Badge className={`text-[10px] px-1.5 py-0 shadow-none border-none ${priorityColors[task.priority]}`}>
                                                        <Flag className="h-2 w-2 mr-0.5 inline" />{task.priority}
                                                    </Badge>
                                                    {task.due_date && (
                                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                                            <Calendar className="h-2 w-2 mr-0.5 inline" />
                                                            {format(new Date(task.due_date), 'MMM d')}
                                                        </Badge>
                                                    )}
                                                    {(task as any).lead && (
                                                        <a href={`/dashboard/leads/${(task as any).lead.id}`}
                                                            className="text-[10px] border rounded-md px-1.5 py-0.5 text-primary hover:underline transition-colors">
                                                            👤 {(task as any).lead.first_name} {(task as any).lead.last_name}
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => deleteTask(task.id)}
                                                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all p-1"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                        {/* Status quick change */}
                                        {task.status !== 'done' && (
                                            <div className="mt-2 flex gap-1">
                                                {(['open', 'in_progress'] as const).filter(s => s !== task.status).map(s => (
                                                    <button
                                                        key={s}
                                                        onClick={() => updateStatus(task.id, s)}
                                                        className="text-[10px] text-muted-foreground hover:text-foreground border rounded-md px-1.5 py-0.5 hover:bg-muted transition-colors"
                                                    >
                                                        → {s === 'open' ? 'To Do' : 'In Progress'}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
