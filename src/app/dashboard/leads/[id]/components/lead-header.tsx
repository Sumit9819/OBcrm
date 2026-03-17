"use client"

import Link from "next/link"
import { format } from "date-fns"
import { Archive, ArrowLeft, CheckCircle, Edit, GraduationCap, MapPin, Mail, Phone, MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { PipelineStepper } from "@/components/ui/pipeline-stepper"

interface LeadHeaderProps {
    lead: any
    pipelineStages: any[]
    isPending: boolean
    onStatusChange: (status: string) => void
    onEdit: () => void
    onConvert: () => void
    onDelete: () => void
}

export function LeadHeader({ lead, pipelineStages, isPending, onStatusChange, onEdit, onConvert, onDelete }: LeadHeaderProps) {
    const DEFAULT_STATUSES = ['New', 'Contacted', 'Application', 'Offer', 'Visa', 'Enrolled']
    const customStageNames = pipelineStages.map((s: any) => s.name)
    const ALL_STATUSES = [...DEFAULT_STATUSES, ...customStageNames.filter((n: string) => !DEFAULT_STATUSES.includes(n))]

    return (
        <div className="space-y-6">
            {/* Top Bar: Identity & Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border shadow-sm">
                <div className="flex items-center gap-4 flex-wrap">
                    <Link href="/dashboard/leads/all">
                        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0"><ArrowLeft className="h-4 w-4" /></Button>
                    </Link>
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm">
                        {lead.first_name?.charAt(0)}{lead.last_name?.charAt(0)}
                    </div>

                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{lead.first_name} {lead.last_name}</h1>
                        <div className="flex items-center gap-3 flex-wrap mt-1">
                            {lead.email && (
                                <a href={`mailto:${lead.email}`} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                                    <Mail className="h-3.5 w-3.5" />{lead.email}
                                </a>
                            )}
                            {lead.phone && (
                                <a href={`tel:${lead.phone}`} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                                    <Phone className="h-3.5 w-3.5" />{lead.phone}
                                </a>
                            )}
                            {lead.nationality && (
                                <span className="text-sm text-muted-foreground flex items-center gap-1">
                                    <MapPin className="h-3.5 w-3.5" />{lead.nationality}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:ml-auto w-full sm:w-auto">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full sm:w-auto" disabled={isPending}>
                                <MoreHorizontal className="h-4 w-4 mr-2" /> Actions
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={onEdit}><Edit className="h-3.5 w-3.5 mr-2" />Edit Lead</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={onConvert} className="text-emerald-600 focus:bg-emerald-50 focus:text-emerald-700">
                                <GraduationCap className="h-3.5 w-3.5 mr-2" />Convert Lead
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:bg-red-50 focus:text-red-700">
                                <Archive className="h-3.5 w-3.5 mr-2" />Delete Lead
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Pipeline Stage visual indicator */}
            <div className="flex flex-col xl:flex-row xl:items-center gap-4 bg-muted/30 border border-border p-4 rounded-xl shadow-sm">
                <div className="flex-1 overflow-x-auto pb-2 xl:pb-0 scrollbar-hide">
                    <PipelineStepper
                        currentStatus={lead.status}
                        statuses={ALL_STATUSES}
                        onStatusChange={() => { }} // Visual only
                        disabled={isPending}
                    />
                </div>
                <div className="shrink-0 flex items-center gap-3 xl:border-l xl:pl-4 border-border">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Move to:</span>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="sm" className="font-medium shadow-sm transition-all focus:ring-2 focus:ring-primary/20">Change Stage</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            {ALL_STATUSES.map(s => (
                                <DropdownMenuItem key={s} onClick={() => onStatusChange(s)} disabled={isPending || s === lead.status}>
                                    {s === lead.status ? <CheckCircle className="h-3.5 w-3.5 mr-2 text-emerald-500" /> : <div className="h-3.5 w-3.5 mr-2" />}
                                    {s}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    )
}
