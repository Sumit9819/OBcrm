import { Button } from "@/components/ui/button"
import { Mail, Phone, MapPin, Send, Archive, GraduationCap, Edit, MessagesSquare, Flame, Calendar } from "lucide-react"
import { format } from "date-fns"

type Props = {
    lead: any
    quickNoteText: string
    setQuickNoteText: (val: string) => void
    handleQuickActionSubmit: () => void
    isPending: boolean
    setShowEdit: (val: boolean) => void
}

export function LeadHeroHeader({ lead, quickNoteText, setQuickNoteText, handleQuickActionSubmit, isPending, setShowEdit }: Props) {
    const leadScore = Number(lead.lead_score || 0)
    const scoreColor = leadScore >= 67 ? "bg-emerald-100 text-emerald-800" : leadScore >= 34 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-800"
    const nextFollowup = lead.next_followup_at ? new Date(lead.next_followup_at) : null

    return (
        <div className="bg-[#1e3a8a] text-white rounded-xl shadow-lg p-6 flex flex-col md:flex-row items-center md:items-start gap-6 relative overflow-hidden mb-6">
            {/* Background design accent */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>

            {/* Avatar block */}
            <div className="w-24 h-24 rounded-full bg-white text-[#1e3a8a] flex items-center justify-center font-bold text-3xl shrink-0 shadow-md border-4 border-white/20">
                {lead.first_name?.charAt(0)}{lead.last_name?.charAt(0)}
            </div>

            {/* Info Block */}
            <div className="flex-1 text-center md:text-left z-10 w-full min-w-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
                    <div>
                        <h1 className="text-3xl font-bold mb-2 flex items-center justify-center md:justify-start gap-2">
                            {lead.first_name} {lead.last_name}
                            <button onClick={() => setShowEdit(true)} className="text-white/70 hover:text-white transition-colors" title="Edit Lead">
                                <Edit className="h-4 w-4" />
                            </button>
                        </h1>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-blue-100 mb-3">
                            {lead.email && <span className="flex items-center gap-1.5"><Mail className="h-4 w-4" /> {lead.email}</span>}
                            {lead.phone && <span className="flex items-center gap-1.5"><Phone className="h-4 w-4" /> {lead.phone}</span>}
                            {lead.nationality && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {lead.nationality}</span>}
                        </div>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                            {lead.lead_score !== null && lead.lead_score !== undefined && (
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${scoreColor}`}>
                                    <Flame className="h-3.5 w-3.5" /> Score: {leadScore}
                                </span>
                            )}
                            {nextFollowup && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-200 text-blue-900">
                                    <Calendar className="h-3.5 w-3.5" /> Follow-up: {format(nextFollowup, "MMM dd")}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Quick Note Input inside Header */}
                    <div className="w-full md:max-w-md pt-2 md:pt-0">
                        <div className="relative flex items-center">
                            <input
                                type="text"
                                placeholder="Add a quick note..."
                                className="w-full bg-white text-slate-900 rounded-l-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-slate-400"
                                value={quickNoteText}
                                onChange={(e) => setQuickNoteText(e.target.value)}
                                disabled={isPending}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleQuickActionSubmit();
                                    }
                                }}
                            />
                            <Button
                                onClick={handleQuickActionSubmit}
                                disabled={isPending || !quickNoteText.trim()}
                                className="rounded-l-none rounded-r-md bg-emerald-600 hover:bg-emerald-700 text-white h-auto py-2.5 px-4"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
