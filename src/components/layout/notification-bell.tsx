"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuLabel,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Bell, MessageSquare, UserCheck, Calendar, FileText, CheckCircle2,
    AlertCircle, Info, Ticket, ClipboardList,
} from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"
import { useRouter } from "next/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"

type Notification = {
    id: string; title: string; message?: string; type: string
    read: boolean; link?: string; created_at: string
}

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
    message: { icon: MessageSquare, color: "text-blue-600", bg: "bg-blue-50" },
    lead: { icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
    meeting: { icon: Calendar, color: "text-purple-600", bg: "bg-purple-50" },
    document: { icon: FileText, color: "text-amber-600", bg: "bg-amber-50" },
    ticket: { icon: Ticket, color: "text-red-600", bg: "bg-red-50" },
    leave: { icon: ClipboardList, color: "text-teal-600", bg: "bg-teal-50" },
    success: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    warning: { icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50" },
    info: { icon: Info, color: "text-blue-600", bg: "bg-blue-50" },
}

function getTypeConfig(type: string) {
    return TYPE_CONFIG[type] || TYPE_CONFIG.info
}

export function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [open, setOpen] = useState(false)
    const [userId, setUserId] = useState<string | null>(null)
    const supabase = createClient()
    const router = useRouter()

    const fetchNotifications = useCallback(async (uid?: string) => {
        const resolvedUid = uid || userId
        if (!resolvedUid) return

        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', resolvedUid)
            .order('created_at', { ascending: false })
            .limit(20)

        if (data) {
            setNotifications(data)
            setUnreadCount(data.filter(n => !n.read).length)
        }
    }, [userId])

    useEffect(() => {
        let realtimeChannel: ReturnType<typeof supabase.channel>

        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            setUserId(user.id)
            await fetchNotifications(user.id)

            // Request Desktop Notification Permission if supported
            if (typeof window !== 'undefined' && 'Notification' in window) {
                if (Notification.permission === 'default') {
                    Notification.requestPermission()
                }
            }

            // Real-time: new notifications
            realtimeChannel = supabase
                .channel(`notifs_${user.id}`)
                .on('postgres_changes', {
                    event: 'INSERT', schema: 'public', table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                }, payload => {
                    const n = payload.new as Notification
                    setNotifications(prev => [n, ...prev].slice(0, 20))
                    setUnreadCount(prev => prev + 1)

                    // Show a toast for immediate feedback if app is active
                    toast(n.title, {
                        description: n.message ? n.message.slice(0, 80) : undefined,
                        action: n.link ? { label: 'View', onClick: () => router.push(n.link!) } : undefined,
                    })

                    // If tab is hidden (in background), trigger desktop notification
                    if (typeof document !== 'undefined' && document.hidden && 'Notification' in window && Notification.permission === 'granted') {
                        const notification = new Notification(n.title, {
                            body: n.message || "You have a new notification in GrowthCRM",
                            icon: '/favicon.ico'
                        })
                        notification.onclick = () => {
                            window.focus()
                            if (n.link) router.push(n.link)
                        }
                    }
                })
                .subscribe()
        }

        init()
        return () => { if (realtimeChannel) supabase.removeChannel(realtimeChannel) }
    }, [])

    // Mark a single notification as read
    const markAsRead = async (id: string) => {
        await supabase.from('notifications').update({ read: true }).eq('id', id)
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
        setUnreadCount(prev => Math.max(0, prev - 1))
    }

    // Mark all as read
    const markAllRead = async () => {
        if (!userId) return
        await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        setUnreadCount(0)
    }

    // Click handler
    const handleClick = async (n: Notification) => {
        if (!n.read) await markAsRead(n.id)
        setOpen(false)
        if (n.link) router.push(n.link)
    }

    // When dropdown opens, refetch
    const handleOpenChange = (v: boolean) => {
        setOpen(v)
        if (v) fetchNotifications()
    }

    return (
        <DropdownMenu open={open} onOpenChange={handleOpenChange}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9">
                    <Bell className={`w-4 h-4 ${unreadCount > 0 ? 'text-amber-500' : ''}`} />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 text-[10px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center animate-pulse">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-96 p-0" sideOffset={8}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <DropdownMenuLabel className="p-0 text-base">
                        Notifications
                        {unreadCount > 0 && (
                            <span className="ml-2 text-xs font-normal text-muted-foreground">{unreadCount} unread</span>
                        )}
                    </DropdownMenuLabel>
                    {unreadCount > 0 && (
                        <button onClick={markAllRead} className="text-xs text-primary hover:underline font-medium">
                            Mark all read
                        </button>
                    )}
                </div>

                {/* List */}
                <ScrollArea className="max-h-[420px]">
                    {notifications.length === 0 ? (
                        <div className="py-12 text-center">
                            <Bell className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                            <p className="text-sm text-muted-foreground">All caught up!</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">No notifications yet</p>
                        </div>
                    ) : (
                        <div className="p-2 space-y-0.5">
                            {notifications.map(n => {
                                const cfg = getTypeConfig(n.type)
                                const Icon = cfg.icon
                                return (
                                    <button
                                        key={n.id}
                                        onClick={() => handleClick(n)}
                                        className={`w-full flex items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-all hover:bg-muted/60 cursor-pointer ${!n.read ? 'bg-primary/5' : ''}`}
                                    >
                                        {/* Icon */}
                                        <div className={`shrink-0 h-9 w-9 rounded-full flex items-center justify-center mt-0.5 ${cfg.bg}`}>
                                            <Icon className={`h-4 w-4 ${cfg.color}`} />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={`text-sm leading-tight ${!n.read ? 'font-semibold' : 'font-medium'}`}>
                                                    {n.title}
                                                </p>
                                                {!n.read && <span className="shrink-0 h-2 w-2 rounded-full bg-primary mt-1" />}
                                            </div>
                                            {n.message && (
                                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                                            )}
                                            <p className="text-[10px] text-muted-foreground/60 mt-1">
                                                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </ScrollArea>

                {/* Footer */}
                {notifications.length > 0 && (
                    <>
                        <DropdownMenuSeparator />
                        <div className="px-4 py-2">
                            <button
                                onClick={() => { setOpen(false); router.push('/dashboard/settings') }}
                                className="text-xs text-muted-foreground hover:text-foreground w-full text-center"
                            >
                                Notification settings
                            </button>
                        </div>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
