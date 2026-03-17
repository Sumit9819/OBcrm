import { Button } from "@/components/ui/button"
import { TabsContent } from "@/components/ui/tabs"
import { format } from "date-fns"
import { MessageSquare, Mail, Smartphone } from "lucide-react"

interface Message {
    id: string
    content: string
    is_from_lead: boolean
    created_at: string
}

interface TabMessagesProps {
    messages: Message[]
    scrollRef: React.RefObject<HTMLDivElement | null>
    setShowWhatsapp: (show: boolean) => void
    setShowSms: (show: boolean) => void
    setShowEmail: (show: boolean) => void
    emailLogs: Array<{ id: string; to_email: string; subject: string; status: string; created_at: string; error_message?: string | null }>
    whatsappLogs: Array<{ id: string; to_phone: string; status: string; message: string; created_at: string; error_message?: string | null }>
}

export function TabMessages({
    messages,
    scrollRef,
    setShowWhatsapp,
    setShowSms,
    setShowEmail,
    emailLogs,
    whatsappLogs
}: TabMessagesProps) {
    return (
        <TabsContent value="messages" className="m-0 focus-visible:ring-0 outline-none">
            <div className="flex flex-col h-[500px] border rounded-xl bg-muted/5 shadow-sm overflow-hidden">
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide"
                >
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-60">
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                                <MessageSquare className="h-6 w-6" />
                            </div>
                            <p className="text-sm font-medium">No messages yet</p>
                            <p className="text-xs">Send a WhatsApp or Email to start the conversation.</p>
                        </div>
                    ) : (
                        messages.map((m) => {
                            const isFromLead = m.is_from_lead;
                            return (
                                <div key={m.id} className={`flex ${isFromLead ? 'justify-start' : 'justify-end'}`}>
                                    <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${isFromLead
                                        ? 'bg-white border rounded-tl-none text-slate-900'
                                        : 'bg-primary text-primary-foreground rounded-tr-none'
                                        }`}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-bold opacity-70 uppercase tracking-tighter">
                                                {isFromLead ? 'Lead' : 'Staff'}
                                            </span>
                                            <span className="text-[10px] opacity-50 font-medium ml-auto">
                                                {format(new Date(m.created_at), 'HH:mm')}
                                            </span>
                                        </div>
                                        <p className="text-sm whitespace-pre-wrap leading-tight">{m.content}</p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
                <div className="p-4 border-t bg-background">
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100"
                            onClick={() => setShowWhatsapp(true)}
                        >
                            <MessageSquare className="h-3.5 w-3.5 mr-2" /> WhatsApp
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 bg-sky-50 text-sky-700 border-sky-100 hover:bg-sky-100"
                            onClick={() => setShowSms(true)}
                        >
                            <Smartphone className="h-3.5 w-3.5 mr-2" /> SMS
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100"
                            onClick={() => setShowEmail(true)}
                        >
                            <Mail className="h-3.5 w-3.5 mr-2" /> Email
                        </Button>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="rounded-lg border bg-muted/20 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">WhatsApp Logs</p>
                            <div className="mt-2 space-y-2 max-h-36 overflow-y-auto">
                                {whatsappLogs.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">No WhatsApp logs yet.</p>
                                ) : whatsappLogs.map((row) => (
                                    <div key={row.id} className="rounded-md border bg-background p-2">
                                        <p className="text-[11px] font-medium">To {row.to_phone}</p>
                                        <p className="text-[11px] text-muted-foreground truncate">{row.message}</p>
                                        <p className="text-[10px] text-muted-foreground mt-1">
                                            {format(new Date(row.created_at), 'MMM dd, HH:mm')} · {row.status}
                                            {row.error_message ? ` · ${row.error_message}` : ''}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-lg border bg-muted/20 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email Logs</p>
                            <div className="mt-2 space-y-2 max-h-36 overflow-y-auto">
                                {emailLogs.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">No email logs yet.</p>
                                ) : emailLogs.map((row) => (
                                    <div key={row.id} className="rounded-md border bg-background p-2">
                                        <p className="text-[11px] font-medium">To {row.to_email}</p>
                                        <p className="text-[11px] text-muted-foreground truncate">{row.subject}</p>
                                        <p className="text-[10px] text-muted-foreground mt-1">
                                            {format(new Date(row.created_at), 'MMM dd, HH:mm')} · {row.status}
                                            {row.error_message ? ` · ${row.error_message}` : ''}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </TabsContent>
    )
}
