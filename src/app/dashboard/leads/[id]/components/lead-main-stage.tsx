"use client"

import { useState } from "react"
import { Activity, MessageSquare, CheckSquare, FileText, Settings, GraduationCap, Briefcase, Sparkles } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface LeadMainStageProps {
    children: React.ReactNode
    counts: {
        messages: number
        tasks: number
        documents: number
        applications: number
    }
    hasCustomFields: boolean
}

export function LeadMainStage({ children, counts, hasCustomFields }: LeadMainStageProps) {
    const [activeTab, setActiveTab] = useState("timeline")

    return (
        <div className="bg-card rounded-xl border shadow-sm flex flex-col overflow-hidden min-h-[600px] h-full">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col w-full h-full">
                <div className="border-b bg-muted/10">
                    <TabsList className="bg-transparent w-full justify-start h-auto p-0 flex-nowrap overflow-x-auto scrollbar-hide border-b-0 space-x-0">
                        <TabsTrigger
                            value="timeline"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 whitespace-nowrap data-[state=active]:shadow-none"
                        >
                            <Activity className="h-4 w-4 mr-2 text-indigo-500" /> Timeline
                        </TabsTrigger>
                        <TabsTrigger
                            value="messages"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 whitespace-nowrap data-[state=active]:shadow-none text-muted-foreground"
                        >
                            <MessageSquare className="h-4 w-4 mr-2" /> Messages ({counts.messages})
                        </TabsTrigger>
                        <TabsTrigger
                            value="tasks"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 whitespace-nowrap data-[state=active]:shadow-none text-muted-foreground"
                        >
                            <CheckSquare className="h-4 w-4 mr-2" /> Tasks ({counts.tasks})
                        </TabsTrigger>
                        <TabsTrigger
                            value="documents"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 whitespace-nowrap data-[state=active]:shadow-none text-muted-foreground"
                        >
                            <FileText className="h-4 w-4 mr-2" /> Docs ({counts.documents})
                        </TabsTrigger>
                        <TabsTrigger
                            value="academics"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 whitespace-nowrap data-[state=active]:shadow-none text-muted-foreground"
                        >
                            <GraduationCap className="h-4 w-4 mr-2" /> Academics
                        </TabsTrigger>
                        <TabsTrigger
                            value="matcher"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent px-4 py-3 whitespace-nowrap data-[state=active]:shadow-none text-emerald-700 font-medium"
                        >
                            <Sparkles className="h-4 w-4 mr-2" /> Course Matcher
                        </TabsTrigger>
                        <TabsTrigger
                            value="applications"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 whitespace-nowrap data-[state=active]:shadow-none text-muted-foreground"
                        >
                            <Briefcase className="h-4 w-4 mr-2" /> Apps ({counts.applications})
                        </TabsTrigger>
                        {hasCustomFields && (
                            <TabsTrigger
                                value="details"
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 whitespace-nowrap data-[state=active]:shadow-none text-muted-foreground"
                            >
                                <Settings className="h-4 w-4 mr-2" /> Data
                            </TabsTrigger>
                        )}
                    </TabsList>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-background/50">
                    {children}
                </div>
            </Tabs>
        </div>
    )
}
