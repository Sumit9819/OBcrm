"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { MessageCircle, X } from "lucide-react"
import Link from "next/link"

export function FloatingChat({ userId }: { userId: string }) {
    const [unreadCount, setUnreadCount] = useState(0)
    const [pulse, setPulse] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        if (!userId) return

        // Fetch initial unread count
        const fetchUnread = async () => {
            const { count } = await supabase
                .from('messages')
                .select('id', { count: 'exact', head: true })
                .eq('receiver_id', userId)
                .is('read_at', null)

            setUnreadCount(count ?? 0)
        }

        fetchUnread()

        // Subscribe to new messages in real-time
        const channel = supabase
            .channel('floating-chat-unread')
            .on('postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `receiver_id=eq.${userId}`
                },
                () => {
                    setUnreadCount(prev => prev + 1)
                    setPulse(true)
                    setTimeout(() => setPulse(false), 2000)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [userId])

    return (
        <Link
            href="/dashboard/chat"
            className="fixed bottom-6 right-6 z-50 group"
        >
            <div className={`relative bg-primary hover:bg-primary/90 text-primary-foreground rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 ${pulse ? 'animate-bounce' : ''}`}>
                <MessageCircle className="h-6 w-6" />

                {/* Unread Badge */}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 shadow-md animate-in zoom-in-50">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </div>

            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block">
                <div className="bg-foreground text-background text-xs rounded-md px-3 py-1.5 whitespace-nowrap shadow-lg">
                    {unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}` : 'Open Chat'}
                </div>
            </div>
        </Link>
    )
}
