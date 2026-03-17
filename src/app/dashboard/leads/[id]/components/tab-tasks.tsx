import { Button } from "@/components/ui/button"
import { TabsContent } from "@/components/ui/tabs"
import { Plus, CheckCircle, Calendar, User, Flag } from "lucide-react"
import { format } from "date-fns"

interface Task {
    id: string
    title: string
    description?: string
    status: string
    due_date?: string
    priority: string
    assigned_user?: {
        first_name: string
    }
}

interface TabTasksProps {
    tasks: Task[]
    setShowTask: (show: boolean) => void
    run: (action: () => Promise<any>) => void
    updateTaskStatus: (id: string, status: 'open' | 'in_progress' | 'done') => Promise<any>
    priorityColors: Record<string, string>
}

export function TabTasks({ tasks, setShowTask, run, updateTaskStatus, priorityColors }: TabTasksProps) {
    return (
        <TabsContent value="tasks" className="m-0 space-y-4 outline-none">
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">Ongoing Tasks</h3>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowTask(true)}>
                    <Plus className="h-3.5 w-3.5" /> Add Task
                </Button>
            </div>
            {tasks.length === 0 ? (
                <div className="p-8 text-center border border-dashed rounded-lg text-muted-foreground text-sm">No tasks linked to this lead. Add one to track follow-ups.</div>
            ) : (
                <div className="space-y-2">
                    {tasks.map((t) => (
                        <div key={t.id} className={`flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted/30 transition-colors ${t.status === 'done' ? 'opacity-60 bg-muted/20' : ''}`}>
                            <button
                                onClick={() => run(() => updateTaskStatus(t.id, t.status === 'done' ? 'open' : 'done'))}
                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${t.status === 'done' ? 'bg-emerald-500 border-emerald-500' : 'border-muted-foreground hover:border-primary'}`}
                            >
                                {t.status === 'done' && <CheckCircle className="h-3 w-3 text-white" />}
                            </button>
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${t.status === 'done' ? 'line-through' : ''}`}>{t.title}</p>
                                {t.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.description}</p>}
                                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                    {t.due_date && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="h-3 w-3" />{format(new Date(t.due_date), 'MMM dd, yyyy')}</span>}
                                    {t.assigned_user && <span className="flex items-center gap-1 text-xs text-muted-foreground"><User className="h-3 w-3" />{t.assigned_user.first_name}</span>}
                                </div>
                            </div>
                            <Flag className={`h-4 w-4 shrink-0 ${priorityColors[t.priority] || 'text-slate-400'}`} />
                        </div>
                    ))}
                </div>
            )}
        </TabsContent>
    )
}
