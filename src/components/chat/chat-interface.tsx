"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
    Send, Search, Plus, Hash, MessageCircle, CheckCheck, Check,
    MoreVertical, Pin, Reply, Trash2, Edit3, X, Users, User, Link2
} from "lucide-react"
import { format, isToday, isYesterday } from "date-fns"
import { toast } from "sonner"

// ─── Types ──────────────────────────────────────────────────────────────────

type Profile = { id: string; first_name: string; last_name: string; email: string; role: string; agency_id?: string }

type ChatMessage = {
    id: string; channel_id: string; sender_id: string; content: string
    created_at: string; deleted_at?: string | null; is_pinned?: boolean
    reply_to_id?: string | null
    sender?: Profile
    reactions?: { emoji: string; count: number; reacted: boolean }[]
    replyTo?: { id: string; content: string; sender?: Profile }
}

type Channel = {
    id: string; name?: string | null; channel_type: 'dm' | 'group' | 'lead_thread'
    lead_id?: string | null
    otherUser?: Profile        // for DMs
    lead?: { id: string; first_name: string; last_name: string } // for lead threads
    unreadCount?: number
    lastMessage?: string; lastTime?: string
}

type ThreadContext = {
    entityType: 'lead' | 'student'
    leadId: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '✅']

function getInitials(p: Profile) {
    return `${p.first_name?.charAt(0) || ''}${p.last_name?.charAt(0) || ''}`.toUpperCase() || p.email?.substring(0, 2).toUpperCase() || '?'
}

function formatTime(iso: string) {
    const d = new Date(iso)
    if (isToday(d)) return format(d, 'HH:mm')
    if (isYesterday(d)) return 'Yesterday'
    return format(d, 'MMM d')
}

function formatFullTime(iso: string) {
    return format(new Date(iso), 'MMM d, HH:mm')
}

function roleColor(role: string) {
    const colors: Record<string, string> = {
        super_admin: 'text-purple-500', agency_admin: 'text-blue-500',
        agent: 'text-emerald-500', accountant: 'text-amber-500', student: 'text-slate-500',
    }
    return colors[role] || 'text-slate-500'
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

function MessageBubble({
    msg, isMe, onReact, onReply, onDelete, onPin, onEdit, currentUserId,
}: {
    msg: ChatMessage; isMe: boolean; currentUserId: string
    onReact: (msgId: string, emoji: string) => void
    onReply: (msg: ChatMessage) => void
    onDelete: (msgId: string) => void
    onPin: (msgId: string, pinned: boolean) => void
    onEdit: (msg: ChatMessage) => void
}) {
    const [showReactions, setShowReactions] = useState(false)
    const [showActions, setShowActions] = useState(false)
    const deleted = !!msg.deleted_at

    return (
        <div
            className={`group flex gap-2.5 mb-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => { setShowActions(false); setShowReactions(false) }}
        >
            <Avatar className="h-8 w-8 shrink-0 border border-border/20 mt-auto">
                <AvatarFallback className={`text-xs font-medium ${isMe ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {msg.sender ? getInitials(msg.sender) : '?'}
                </AvatarFallback>
            </Avatar>

            <div className={`max-w-[70%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                {/* Sender name */}
                {!isMe && msg.sender && (
                    <span className={`text-[10px] font-semibold px-1 ${roleColor(msg.sender.role)}`}>
                        {msg.sender.first_name} {msg.sender.last_name}
                    </span>
                )}

                {/* Reply preview */}
                {msg.replyTo && (
                    <div className={`text-xs px-2.5 py-1 rounded-lg bg-muted/50 border-l-2 border-primary/50 max-w-full opacity-80 ${isMe ? 'text-right' : 'text-left'}`}>
                        <p className="font-medium text-[10px] text-muted-foreground">↩ {msg.replyTo.sender?.first_name}</p>
                        <p className="truncate">{msg.replyTo.content}</p>
                    </div>
                )}

                {/* Pinned badge */}
                {msg.is_pinned && (
                    <span className="text-[9px] font-medium text-amber-500 flex items-center gap-1 px-1"><Pin className="h-2.5 w-2.5" /> Pinned</span>
                )}

                {/* Bubble */}
                <div className="relative">
                    <div className={`relative group rounded-2xl px-3.5 py-2.5 text-sm shadow-sm
                        ${deleted
                            ? 'bg-muted/40 text-muted-foreground italic border border-dashed border-border/40'
                            : isMe
                                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                : 'bg-muted/80 text-foreground rounded-tl-sm border border-border/30'
                        }`}
                    >
                        {deleted
                            ? <span className="text-xs">Message deleted</span>
                            : <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                        }
                    </div>

                    {/* Hover action toolbar */}
                    {!deleted && showActions && (
                        <div className={`absolute top-0 ${isMe ? 'right-full mr-2' : 'left-full ml-2'} flex items-center gap-0.5 bg-background border border-border rounded-lg px-1 py-0.5 shadow-md z-10`}>
                            <button title="React" onClick={() => setShowReactions(r => !r)} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground text-sm">😊</button>
                            <button title="Reply" onClick={() => onReply(msg)} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"><Reply className="h-3.5 w-3.5" /></button>
                            <button title={msg.is_pinned ? "Unpin" : "Pin"} onClick={() => onPin(msg.id, !msg.is_pinned)} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"><Pin className="h-3.5 w-3.5" /></button>
                            {isMe && <button title="Edit" onClick={() => onEdit(msg)} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"><Edit3 className="h-3.5 w-3.5" /></button>}
                            {isMe && <button title="Delete" onClick={() => onDelete(msg.id)} className="p-1 hover:bg-red-50 rounded text-red-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>}
                        </div>
                    )}

                    {/* Emoji reaction picker */}
                    {showReactions && (
                        <div className={`absolute ${isMe ? 'right-0' : 'left-0'} -bottom-10 flex items-center gap-1 bg-background border border-border rounded-xl px-2 py-1 shadow-lg z-20`}>
                            {EMOJI_REACTIONS.map(e => (
                                <button key={e} onClick={() => { onReact(msg.id, e); setShowReactions(false) }} className="text-base hover:scale-125 transition-transform">
                                    {e}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Reactions row */}
                {msg.reactions && msg.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 px-1 mt-0.5">
                        {msg.reactions.map(r => (
                            <button
                                key={r.emoji}
                                onClick={() => onReact(msg.id, r.emoji)}
                                className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full border transition-all ${r.reacted ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-muted/50 border-border/30 text-muted-foreground hover:bg-muted'}`}
                            >
                                {r.emoji} {r.count}
                            </button>
                        ))}
                    </div>
                )}

                {/* Time + read receipt */}
                <div className={`flex items-center gap-1 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <span className="text-[10px] text-muted-foreground">{formatTime(msg.created_at)}</span>
                    {isMe && !deleted && (
                        <CheckCheck className="h-3 w-3 text-blue-400" />
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── Main ChatInterface ────────────────────────────────────────────────────────

export function ChatInterface({
    currentUser,
    colleagues,
    threadContext,
}: {
    currentUser: Profile
    colleagues: Profile[]
    threadContext?: ThreadContext | null
}) {
    const [channels, setChannels] = useState<Channel[]>([])
    const [activeChannel, setActiveChannel] = useState<Channel | null>(null)
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [memberMap, setMemberMap] = useState<Map<string, Profile>>(new Map())
    const [newMessage, setNewMessage] = useState("")
    const [search, setSearch] = useState("")
    const [sending, setSending] = useState(false)
    const [loadingMessages, setLoadingMessages] = useState(false)
    const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
    const [editingMsg, setEditingMsg] = useState<ChatMessage | null>(null)
    const [editContent, setEditContent] = useState("")
    const [typingUsers, setTypingUsers] = useState<string[]>([])
    const [showNewChannel, setShowNewChannel] = useState(false)
    const [newChannelName, setNewChannelName] = useState("")
    const [pinnedMessages, setPinnedMessages] = useState<ChatMessage[]>([])
    const [showPinned, setShowPinned] = useState(false)
    const [onlineUsers] = useState<Set<string>>(new Set()) // realtime presence
    const scrollRef = useRef<HTMLDivElement>(null)
    const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
    const supabase = createClient()

    const ensureLeadThreadChannel = useCallback(async () => {
        if (!threadContext?.leadId || !currentUser.agency_id) return null

        const { data: existing } = await supabase
            .from('chat_channels')
            .select('id, name, channel_type, lead_id, lead:lead_id(id, first_name, last_name)')
            .eq('agency_id', currentUser.agency_id)
            .eq('channel_type', 'lead_thread')
            .eq('lead_id', threadContext.leadId)
            .maybeSingle()

        if (existing) {
            return {
                id: existing.id,
                name: existing.name,
                channel_type: existing.channel_type,
                lead_id: existing.lead_id,
                lead: existing.lead,
            } as Channel
        }

        const { data: leadData } = await supabase
            .from('leads')
            .select('id, first_name, last_name')
            .eq('id', threadContext.leadId)
            .eq('agency_id', currentUser.agency_id)
            .maybeSingle()

        if (!leadData?.id) {
            toast.error('Lead thread could not be opened for this record.')
            return null
        }

        const channelName = `${threadContext.entityType}-${leadData.first_name || 'record'}-${leadData.last_name || leadData.id}`
            .toLowerCase()
            .replace(/\s+/g, '-')
            .slice(0, 64)

        const { data: created, error: createError } = await supabase
            .from('chat_channels')
            .insert({
                agency_id: currentUser.agency_id,
                channel_type: 'lead_thread',
                lead_id: leadData.id,
                name: channelName,
                created_by: currentUser.id,
            })
            .select('id, name, channel_type, lead_id, lead:lead_id(id, first_name, last_name)')
            .single()

        if (createError || !created) {
            toast.error(createError?.message || 'Failed to create lead thread.')
            return null
        }

        const memberIds = [...new Set([...colleagues.map(c => c.id), currentUser.id])]
        if (memberIds.length > 0) {
            await supabase.from('chat_members').insert(
                memberIds.map(userId => ({ channel_id: created.id, user_id: userId }))
            )
        }

        return {
            id: created.id,
            name: created.name,
            channel_type: created.channel_type,
            lead_id: created.lead_id,
            lead: created.lead,
        } as Channel
    }, [colleagues, currentUser, threadContext])

    // ── Build member map ─────────────────────────────────────────
    useEffect(() => {
        const map = new Map<string, Profile>()
        map.set(currentUser.id, currentUser)
        colleagues.forEach(c => map.set(c.id, c))
        setMemberMap(map)
    }, [currentUser, colleagues])

    // ── Load channels ────────────────────────────────────────────
    const loadChannels = useCallback(async () => {
        // 1. Load group channels & lead threads from DB
        const { data: channelRows } = await supabase
            .from('chat_channels')
            .select('*, lead:lead_id(id, first_name, last_name)')
            .eq('agency_id', currentUser.agency_id)
            .in('channel_type', ['group', 'lead_thread'])
            .order('created_at', { ascending: true })

        const dbChannels: Channel[] = (channelRows || []).map(r => ({
            id: r.id, name: r.name, channel_type: r.channel_type,
            lead_id: r.lead_id, lead: r.lead,
        }))

        // 2. Build DM channels from colleagues
        const dmChannels: Channel[] = colleagues.map(c => ({
            id: `dm_${[currentUser.id, c.id].sort().join('_')}`,
            name: `${c.first_name} ${c.last_name}`,
            channel_type: 'dm' as const,
            otherUser: c,
        }))

        // 3. Fetch last message for each DM (fast, parallel)
        const enrichedDMs = await Promise.all(
            dmChannels.map(async ch => {
                const otherId = ch.otherUser!.id
                const { data: msgs } = await supabase
                    .from('messages')
                    .select('content, created_at, read_at, receiver_id')
                    .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${currentUser.id})`)
                    .order('created_at', { ascending: false })
                    .limit(1)
                const { count: unread } = await supabase
                    .from('messages').select('id', { count: 'exact', head: true })
                    .eq('sender_id', otherId).eq('receiver_id', currentUser.id).is('read_at', null)
                return { ...ch, lastMessage: msgs?.[0]?.content, lastTime: msgs?.[0]?.created_at, unreadCount: unread ?? 0 }
            })
        )

        enrichedDMs.sort((a, b) => {
            if (!a.lastTime && !b.lastTime) return 0
            if (!a.lastTime) return 1; if (!b.lastTime) return -1
            return new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime()
        })

        setChannels([...enrichedDMs, ...dbChannels])
    }, [colleagues, currentUser])

    useEffect(() => { loadChannels() }, [loadChannels])

    useEffect(() => {
        if (!threadContext?.leadId) return

        let cancelled = false
        ; (async () => {
            const channel = await ensureLeadThreadChannel()
            if (!channel || cancelled) return

            setChannels(prev => {
                const exists = prev.some(ch => ch.id === channel.id)
                return exists ? prev : [...prev, channel]
            })
            setActiveChannel(channel)
        })()

        return () => { cancelled = true }
    }, [threadContext, ensureLeadThreadChannel])

    // ── Fetch messages for active channel ────────────────────────
    const fetchMessages = useCallback(async (channel: Channel) => {
        setLoadingMessages(true)
        setMessages([])
        setPinnedMessages([])

        let data: any[] = []

        if (channel.channel_type === 'dm') {
            const otherId = channel.otherUser!.id
            const { data: msgs } = await supabase.from('messages')
                .select('*')
                .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${currentUser.id})`)
                .order('created_at', { ascending: true })
            // Map legacy messages format → ChatMessage format
            data = (msgs || []).map(m => ({
                id: m.id, channel_id: channel.id, sender_id: m.sender_id,
                content: m.content, created_at: m.created_at, is_pinned: false,
                sender: memberMap.get(m.sender_id),
            }))
            // Mark as read
            await supabase.from('messages')
                .update({ read_at: new Date().toISOString() })
                .eq('sender_id', otherId).eq('receiver_id', currentUser.id).is('read_at', null)
        } else {
            // Group/lead thread — use chat_messages table
            const { data: msgs } = await supabase.from('chat_messages')
                .select('*, sender:sender_id(id, first_name, last_name, email, role), replyMsg:reply_to_id(id, content, sender:sender_id(id, first_name, last_name, email, role))')
                .eq('channel_id', channel.id)
                .order('created_at', { ascending: true })

            data = (msgs || []).map(m => ({
                ...m,
                sender: m.sender as Profile,
                replyTo: m.replyMsg ? { id: m.replyMsg.id, content: m.replyMsg.content, sender: m.replyMsg.sender } : undefined,
            }))

            // Load reactions
            const msgIds = data.map(m => m.id)
            if (msgIds.length > 0) {
                const { data: reactions } = await supabase.from('message_reactions')
                    .select('message_id, emoji, user_id')
                    .in('message_id', msgIds)
                const reactionMap: Record<string, { emoji: string; count: number; reacted: boolean }[]> = {}
                for (const r of reactions || []) {
                    if (!reactionMap[r.message_id]) reactionMap[r.message_id] = []
                    const existing = reactionMap[r.message_id].find(e => e.emoji === r.emoji)
                    if (existing) { existing.count++; if (r.user_id === currentUser.id) existing.reacted = true }
                    else reactionMap[r.message_id].push({ emoji: r.emoji, count: 1, reacted: r.user_id === currentUser.id })
                }
                data = data.map(m => ({ ...m, reactions: reactionMap[m.id] || [] }))
            }

            setPinnedMessages(data.filter(m => m.is_pinned))
            setChannels(prev => prev.map(ch => ch.id === channel.id ? { ...ch, unreadCount: 0 } : ch))
        }

        setMessages(data)
        setLoadingMessages(false)
    }, [currentUser, memberMap])

    useEffect(() => {
        if (!activeChannel) return
        fetchMessages(activeChannel)

        // Realtime subscription for new messages
        let sub: ReturnType<typeof supabase.channel>

        if (activeChannel.channel_type === 'dm') {
            const otherId = activeChannel.otherUser!.id
            sub = supabase.channel(`dm_${currentUser.id}_${otherId}`)
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${currentUser.id}` }, payload => {
                    const msg = payload.new as any
                    if (msg.sender_id === otherId) {
                        const chatMsg: ChatMessage = { id: msg.id, channel_id: activeChannel.id, sender_id: msg.sender_id, content: msg.content, created_at: msg.created_at, sender: memberMap.get(msg.sender_id) }
                        setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, chatMsg])
                        supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', msg.id)
                    }
                })
                .subscribe()
        } else {
            sub = supabase.channel(`channel_${activeChannel.id}`)
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${activeChannel.id}` }, async payload => {
                    const msg = payload.new as any
                    if (msg.sender_id !== currentUser.id) {
                        const sender = memberMap.get(msg.sender_id)
                        setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, { ...msg, sender, reactions: [] }])
                    }
                })
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${activeChannel.id}` }, payload => {
                    const msg = payload.new as any
                    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, ...msg, sender: m.sender } : m))
                })
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_reactions', }, payload => {
                    const r = payload.new as any
                    setMessages(prev => prev.map(m => {
                        if (m.id !== r.message_id) return m
                        const existing = (m.reactions || []).find(re => re.emoji === r.emoji)
                        if (existing) return { ...m, reactions: (m.reactions || []).map(re => re.emoji === r.emoji ? { ...re, count: re.count + 1, reacted: r.user_id === currentUser.id ? true : re.reacted } : re) }
                        return { ...m, reactions: [...(m.reactions || []), { emoji: r.emoji, count: 1, reacted: r.user_id === currentUser.id }] }
                    }))
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'typing_status', filter: `channel_id=eq.${activeChannel.id}` }, payload => {
                    const t = payload.new as any
                    if (t.user_id === currentUser.id) return
                    const name = memberMap.get(t.user_id)?.first_name || 'Someone'
                    if (t.is_typing) {
                        setTypingUsers(prev => prev.includes(name) ? prev : [...prev, name])
                        setTimeout(() => setTypingUsers(prev => prev.filter(n => n !== name)), 5000)
                    } else {
                        setTypingUsers(prev => prev.filter(n => n !== name))
                    }
                })
                .subscribe()
        }

        return () => { supabase.removeChannel(sub) }
    }, [activeChannel?.id, memberMap])

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }, [messages])

    // ── Typing indicator ─────────────────────────────────────────
    const handleTyping = useCallback(async () => {
        if (!activeChannel || activeChannel.channel_type === 'dm') return
        await supabase.from('typing_status').upsert({ channel_id: activeChannel.id, user_id: currentUser.id, is_typing: true }, { onConflict: 'channel_id,user_id' })
        if (typingTimeout.current) clearTimeout(typingTimeout.current)
        typingTimeout.current = setTimeout(async () => {
            await supabase.from('typing_status').upsert({ channel_id: activeChannel.id, user_id: currentUser.id, is_typing: false }, { onConflict: 'channel_id,user_id' })
        }, 3000)
    }, [activeChannel])

    // ── Send message ─────────────────────────────────────────────
    const handleSend = async () => {
        const text = editingMsg ? editContent.trim() : newMessage.trim()
        if (!text || !activeChannel || sending) return

        if (editingMsg) {
            await supabase.from('chat_messages').update({ content: text, edited_at: new Date().toISOString() }).eq('id', editingMsg.id)
            setMessages(prev => prev.map(m => m.id === editingMsg.id ? { ...m, content: text } : m))
            setEditingMsg(null); setEditContent("")
            return
        }

        setSending(true)
        const tempId = crypto.randomUUID()
        const tempMsg: ChatMessage = {
            id: tempId, channel_id: activeChannel.id, sender_id: currentUser.id,
            content: text, created_at: new Date().toISOString(), is_pinned: false,
            reply_to_id: replyTo?.id || null, sender: currentUser,
            replyTo: replyTo ? { id: replyTo.id, content: replyTo.content, sender: replyTo.sender } : undefined,
            reactions: [],
        }
        setMessages(prev => [...prev, tempMsg])
        setNewMessage(""); setReplyTo(null)

        if (activeChannel.channel_type === 'dm') {
            const { data: realMsg, error } = await supabase.from('messages').insert({
                agency_id: currentUser.agency_id,
                sender_id: currentUser.id,
                receiver_id: activeChannel.otherUser!.id,
                content: text,
            }).select().single()
            if (error) { toast.error("Failed to send"); setMessages(prev => prev.filter(m => m.id !== tempId)) }
            else setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: (realMsg as any).id } : m))
        } else {
            const { data: realMsg, error } = await supabase.from('chat_messages').insert({
                channel_id: activeChannel.id, agency_id: currentUser.agency_id,
                sender_id: currentUser.id, content: text, reply_to_id: replyTo?.id || null,
            }).select().single()
            if (error) { toast.error("Failed to send"); setMessages(prev => prev.filter(m => m.id !== tempId)) }
            else setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: (realMsg as any).id } : m))
        }

        // Update typing to false
        if (activeChannel.channel_type !== 'dm') {
            supabase.from('typing_status').upsert({ channel_id: activeChannel.id, user_id: currentUser.id, is_typing: false }, { onConflict: 'channel_id,user_id' })
        }

        setSending(false)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
        if (e.key === 'Escape') { setReplyTo(null); setEditingMsg(null) }
    }

    // ── Reactions ────────────────────────────────────────────────
    const handleReact = async (msgId: string, emoji: string) => {
        const msg = messages.find(m => m.id === msgId)
        const alreadyReacted = msg?.reactions?.find(r => r.emoji === emoji && r.reacted)
        if (alreadyReacted) {
            await supabase.from('message_reactions').delete().eq('message_id', msgId).eq('user_id', currentUser.id).eq('emoji', emoji)
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reactions: (m.reactions || []).map(r => r.emoji === emoji ? { ...r, count: Math.max(0, r.count - 1), reacted: false } : r).filter(r => r.count > 0) } : m))
        } else {
            await supabase.from('message_reactions').upsert({ message_id: msgId, user_id: currentUser.id, emoji }, { onConflict: 'message_id,user_id,emoji' })
        }
    }

    // ── Delete message (soft) ────────────────────────────────────
    const handleDelete = async (msgId: string) => {
        await supabase.from('chat_messages').update({ deleted_at: new Date().toISOString() }).eq('id', msgId)
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, deleted_at: new Date().toISOString() } : m))
    }

    // ── Pin message ──────────────────────────────────────────────
    const handlePin = async (msgId: string, pin: boolean) => {
        await supabase.from('chat_messages').update({ is_pinned: pin }).eq('id', msgId)
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_pinned: pin } : m))
        setPinnedMessages(prev => pin ? [...prev, messages.find(m => m.id === msgId)!] : prev.filter(m => m.id !== msgId))
        toast.success(pin ? "Message pinned" : "Message unpinned")
    }

    // ── Create group channel ─────────────────────────────────────
    const createChannel = async () => {
        if (!newChannelName.trim()) return
        const { data, error } = await supabase.from('chat_channels').insert({
            agency_id: currentUser.agency_id,
            name: newChannelName.trim().toLowerCase().replace(/\s+/g, '-'),
            channel_type: 'group',
            created_by: currentUser.id,
        }).select().single()

        if (error) { toast.error(error.message); return }

        // Auto-add all agency members
        await supabase.from('chat_members').insert(
            [...colleagues, currentUser].map(u => ({ channel_id: data.id, user_id: u.id }))
        )

        setShowNewChannel(false); setNewChannelName("")
        toast.success(`#${data.name} channel created!`)
        loadChannels()
        setActiveChannel({ id: data.id, name: data.name, channel_type: 'group' })
    }

    // ── Filtered channels ────────────────────────────────────────
    const dmList = channels.filter(c => c.channel_type === 'dm' && (!search || c.name?.toLowerCase().includes(search.toLowerCase())))
    const groupList = channels.filter(c => c.channel_type === 'group' && (!search || c.name?.toLowerCase().includes(search.toLowerCase())))
    const leadThreadList = channels.filter(c => c.channel_type === 'lead_thread')
    const totalUnread = channels.reduce((s, c) => s + (c.unreadCount || 0), 0)

    const activeName = activeChannel
        ? activeChannel.channel_type === 'dm'
            ? `${activeChannel.otherUser?.first_name} ${activeChannel.otherUser?.last_name}`
            : activeChannel.channel_type === 'lead_thread'
                ? `${(activeChannel.lead as any)?.first_name} ${(activeChannel.lead as any)?.last_name}`
                : `#${activeChannel.name}`
        : ''

    // ── Date separators in messages ──────────────────────────────
    const messagesWithDates = messages.reduce<(ChatMessage | { type: 'date'; label: string; id: string })[]>((acc, msg, i) => {
        const prev = messages[i - 1]
        const d = new Date(msg.created_at)
        const prevD = prev ? new Date(prev.created_at) : null
        const diffDay = !prevD || format(d, 'yyyy-MM-dd') !== format(prevD, 'yyyy-MM-dd')
        if (diffDay) {
            acc.push({ type: 'date', label: isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'MMMM d, yyyy'), id: `date_${msg.id}` })
        }
        acc.push(msg)
        return acc
    }, [])

    return (
        <div className="flex h-full w-full overflow-hidden bg-background">
            {/* ─── Left Panel ─────────────────────────────────── */}
            <div className="w-72 min-w-72 border-r bg-slate-50/50 flex flex-col">
                {/* Header */}
                <div className="p-4 border-b bg-background">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-base flex items-center gap-2">
                            <MessageCircle className="h-4 w-4 text-primary" /> Messages
                            {totalUnread > 0 && <Badge className="bg-primary h-5 min-w-[20px] text-[10px] px-1.5">{totalUnread}</Badge>}
                        </h3>
                        <Button size="sm" variant="ghost" onClick={() => setShowNewChannel(true)} title="New channel" className="h-7 w-7 p-0">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input className="pl-8 h-8 text-sm bg-muted/50 border-0 focus-visible:ring-1" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-4">
                        {/* Direct Messages */}
                        <div>
                            <p className="text-[10px] font-bold uppercase text-muted-foreground/60 px-2 py-1 tracking-widest flex items-center gap-1">
                                <User className="h-3 w-3" /> Direct Messages
                            </p>
                            {dmList.map(ch => (
                                <ChannelButton key={ch.id} ch={ch} isActive={activeChannel?.id === ch.id} onClick={() => setActiveChannel(ch)} />
                            ))}
                            {dmList.length === 0 && <p className="text-xs text-muted-foreground px-3 py-2 italic">No team members</p>}
                        </div>

                        {/* Channels */}
                        <div>
                            <p className="text-[10px] font-bold uppercase text-muted-foreground/60 px-2 py-1 tracking-widest flex items-center gap-1">
                                <Hash className="h-3 w-3" /> Channels
                            </p>
                            {groupList.map(ch => (
                                <ChannelButton key={ch.id} ch={ch} isActive={activeChannel?.id === ch.id} onClick={() => setActiveChannel(ch)} />
                            ))}
                            {groupList.length === 0 && (
                                <button onClick={() => setShowNewChannel(true)} className="text-xs text-primary hover:underline px-3 py-1 italic">+ Create first channel</button>
                            )}
                        </div>

                        {/* Lead Threads */}
                        {leadThreadList.length > 0 && (
                            <div>
                                <p className="text-[10px] font-bold uppercase text-muted-foreground/60 px-2 py-1 tracking-widest flex items-center gap-1">
                                    <Link2 className="h-3 w-3" /> Lead Threads
                                </p>
                                {leadThreadList.map(ch => (
                                    <ChannelButton key={ch.id} ch={ch} isActive={activeChannel?.id === ch.id} onClick={() => setActiveChannel(ch)} />
                                ))}
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Current user indicator */}
                <div className="p-3 border-t flex items-center gap-2 bg-background">
                    <div className="relative">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {getInitials(currentUser)}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-background" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{currentUser.first_name} {currentUser.last_name}</p>
                        <p className={`text-[10px] capitalize ${roleColor(currentUser.role)}`}>{currentUser.role?.replace('_', ' ')}</p>
                    </div>
                </div>
            </div>

            {/* ─── Right Panel ─────────────────────────────────── */}
            <div className="flex flex-1 flex-col bg-background min-w-0">
                {activeChannel ? (
                    <>
                        {/* Chat Header */}
                        <div className="flex items-center justify-between px-5 py-3 border-b bg-background/80 backdrop-blur-sm shrink-0">
                            <div className="flex items-center gap-3">
                                <div className={`h-9 w-9 rounded-full flex items-center justify-center font-semibold text-sm
                                    ${activeChannel.channel_type === 'dm' ? 'bg-primary/10 text-primary' : 'bg-indigo-100 text-indigo-600'}`}>
                                    {activeChannel.channel_type === 'group' ? <Hash className="h-4 w-4" /> :
                                        activeChannel.channel_type === 'lead_thread' ? <Link2 className="h-4 w-4" /> :
                                            getInitials(activeChannel.otherUser!)}
                                </div>
                                <div>
                                    <p className="font-semibold text-sm leading-none">{activeName}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {activeChannel.channel_type === 'dm' ? (
                                            <span className={`capitalize ${roleColor(activeChannel.otherUser?.role || '')}`}>
                                                {activeChannel.otherUser?.role?.replace('_', ' ')}
                                            </span>
                                        ) : activeChannel.channel_type === 'lead_thread' ? 'Lead discussion thread' : 'Group channel'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                {pinnedMessages.length > 0 && (
                                    <button onClick={() => setShowPinned(!showPinned)} className="flex items-center gap-1 text-xs text-amber-500 hover:text-amber-600 px-2 py-1 rounded-lg hover:bg-amber-50">
                                        <Pin className="h-3.5 w-3.5" /> {pinnedMessages.length} pinned
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Pinned panel */}
                        {showPinned && pinnedMessages.length > 0 && (
                            <div className="border-b bg-amber-50/50 px-4 py-2 space-y-1 shrink-0">
                                <p className="text-xs font-semibold text-amber-700 flex items-center gap-1"><Pin className="h-3 w-3" /> Pinned Messages</p>
                                {pinnedMessages.map(pm => (
                                    <div key={pm.id} className="text-xs text-slate-700 bg-white border border-amber-100 rounded px-2 py-1 truncate">
                                        <span className="font-medium text-amber-600">{pm.sender?.first_name}: </span>{pm.content}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Messages Area */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
                            {loadingMessages ? (
                                <div className="flex justify-center pt-12 text-muted-foreground text-sm">Loading messages...</div>
                            ) : messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-3 opacity-60">
                                    <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                                        <MessageCircle className="h-7 w-7" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-medium">No messages yet</p>
                                        <p className="text-xs opacity-70 mt-1">Start the conversation</p>
                                    </div>
                                </div>
                            ) : (
                                messagesWithDates.map(item => {
                                    if ('type' in item && item.type === 'date') {
                                        return (
                                            <div key={item.id} className="flex items-center gap-3 my-4">
                                                <div className="flex-1 h-px bg-border/40" />
                                                <span className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-2.5 py-0.5 rounded-full">{item.label}</span>
                                                <div className="flex-1 h-px bg-border/40" />
                                            </div>
                                        )
                                    }
                                    const msg = item as ChatMessage
                                    const isMe = msg.sender_id === currentUser.id
                                    const sender = msg.sender || memberMap.get(msg.sender_id)
                                    return (
                                        <MessageBubble
                                            key={msg.id}
                                            msg={{ ...msg, sender }}
                                            isMe={isMe}
                                            currentUserId={currentUser.id}
                                            onReact={handleReact}
                                            onReply={setReplyTo}
                                            onDelete={handleDelete}
                                            onPin={handlePin}
                                            onEdit={m => { setEditingMsg(m); setEditContent(m.content) }}
                                        />
                                    )
                                })
                            )}
                        </div>

                        {/* Typing indicator */}
                        {typingUsers.length > 0 && (
                            <div className="px-5 pb-1 text-xs text-muted-foreground italic flex items-center gap-1.5">
                                <span className="flex gap-0.5">
                                    <span className="animate-bounce delay-0 w-1 h-1 bg-muted-foreground rounded-full" style={{ animationDelay: '0ms' }} />
                                    <span className="animate-bounce w-1 h-1 bg-muted-foreground rounded-full" style={{ animationDelay: '150ms' }} />
                                    <span className="animate-bounce w-1 h-1 bg-muted-foreground rounded-full" style={{ animationDelay: '300ms' }} />
                                </span>
                                {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                            </div>
                        )}

                        {/* Reply/Edit banner */}
                        {(replyTo || editingMsg) && (
                            <div className="mx-5 mb-1 flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-3 py-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-primary">
                                        {editingMsg ? '✏️ Editing message' : `↩ Replying to ${replyTo?.sender?.first_name || 'message'}`}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">{editingMsg?.content || replyTo?.content}</p>
                                </div>
                                <button onClick={() => { setReplyTo(null); setEditingMsg(null) }} className="p-1 text-muted-foreground hover:text-foreground ml-2">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        )}

                        {/* Input Area */}
                        <div className="px-5 py-3 bg-background border-t shrink-0">
                            <div className="flex items-end gap-2 bg-muted/30 rounded-2xl border border-border/50 p-2 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30 transition-all">
                                <Textarea
                                    value={editingMsg ? editContent : newMessage}
                                    onChange={e => {
                                        editingMsg ? setEditContent(e.target.value) : setNewMessage(e.target.value)
                                        handleTyping()
                                    }}
                                    onKeyDown={handleKeyDown}
                                    placeholder={editingMsg ? "Edit message..." : `Message ${activeName}...`}
                                    className="min-h-[40px] max-h-28 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 px-2 py-1.5 text-sm"
                                />
                                <Button onClick={handleSend} size="icon" className="h-9 w-9 rounded-xl shrink-0 mb-0.5" disabled={!(editingMsg ? editContent : newMessage).trim() || sending}>
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                            <p className="text-[10px] text-muted-foreground/50 mt-1 text-center">Enter to send · Shift+Enter for new line · Esc to cancel</p>
                        </div>
                    </>
                ) : (
                    <div className="flex h-full flex-col items-center justify-center text-muted-foreground space-y-4">
                        <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center">
                            <MessageCircle className="h-10 w-10 opacity-40" />
                        </div>
                        <div className="text-center">
                            <p className="font-medium">Internal Communications</p>
                            <p className="text-sm text-muted-foreground/70 mt-1">Select a conversation or channel to start chatting</p>
                        </div>
                    </div>
                )}
            </div>

            {/* ─── New Channel Dialog ─────────────────────────── */}
            <Dialog open={showNewChannel} onOpenChange={setShowNewChannel}>
                <DialogContent className="max-w-sm">
                    <DialogHeader><DialogTitle className="flex items-center gap-2"><Hash className="h-4 w-4" /> Create Channel</DialogTitle></DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1.5">
                            <Label>Channel Name</Label>
                            <Input placeholder="e.g. general, sales, visa-team" value={newChannelName} onChange={e => setNewChannelName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createChannel()} />
                            <p className="text-xs text-muted-foreground">Spaces become dashes. All agency members are auto-added.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewChannel(false)}>Cancel</Button>
                        <Button onClick={createChannel} disabled={!newChannelName.trim()}>Create Channel</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// ─── ChannelButton (extracted for clarity) ────────────────────────────────────

function ChannelButton({ ch, isActive, onClick }: { ch: Channel; isActive: boolean; onClick: () => void }) {
    const isGroup = ch.channel_type === 'group'
    const isThread = ch.channel_type === 'lead_thread'
    const isDM = ch.channel_type === 'dm'

    const displayName = isDM
        ? `${ch.otherUser?.first_name} ${ch.otherUser?.last_name}`
        : isThread
            ? `${(ch.lead as any)?.first_name} ${(ch.lead as any)?.last_name}`
            : `# ${ch.name}`

    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-all
                ${isActive ? 'bg-primary/10 text-primary ring-1 ring-primary/20' : 'hover:bg-muted/80 text-foreground'}`}
        >
            <div className={`relative shrink-0 h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold
                ${isActive ? 'bg-primary text-primary-foreground' : isGroup ? 'bg-indigo-100 text-indigo-600' : isThread ? 'bg-amber-100 text-amber-600' : 'bg-muted text-muted-foreground'}`}>
                {isDM ? (ch.otherUser ? `${ch.otherUser.first_name.charAt(0)}${ch.otherUser.last_name.charAt(0)}` : '?') :
                    isGroup ? <Hash className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <span className={`text-sm truncate ${(ch.unreadCount || 0) > 0 ? 'font-bold' : 'font-medium'}`}>{displayName}</span>
                    {ch.lastTime && <span className="text-[10px] text-muted-foreground shrink-0 ml-1">{formatTime(ch.lastTime)}</span>}
                </div>
                <div className="flex items-center justify-between mt-0.5">
                    <span className="text-xs text-muted-foreground truncate">
                        {ch.lastMessage || <span className="italic opacity-50">{isGroup ? 'channel' : isThread ? 'lead thread' : ch.otherUser?.role?.replace('_', ' ')}</span>}
                    </span>
                    {(ch.unreadCount ?? 0) > 0 && (
                        <span className="ml-1 shrink-0 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center min-w-[18px] px-1">
                            {ch.unreadCount}
                        </span>
                    )}
                </div>
            </div>
        </button>
    )
}
