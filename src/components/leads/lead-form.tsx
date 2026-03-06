"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Loader2, Save, BookOpen, User, PhoneCall, Mail, Calendar, Building, SlidersHorizontal } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
    Form, FormControl, FormDescription, FormField,
    FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue,
} from "@/components/ui/select"

const LEAD_SOURCES = [
    "Facebook", "Instagram", "WhatsApp", "LinkedIn",
    "Website", "Email Campaign", "Phone Call",
    "Referral", "Walk-In", "Other",
] as const

const formSchema = z.object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    email: z.string().email("Invalid email address").or(z.literal("")).optional(),
    phone: z.string().min(6, "Phone number is required"),
    destinationCountry: z.string().min(1, "Select a destination"),
    courseInterest: z.string().min(2, "Course interest is required"),
    nationality: z.string().optional(),
    dateOfBirth: z.string().optional(),
    academicQualification: z.string().optional(),
    source: z.string().optional(),
    notes: z.string().optional(),
    pipelineId: z.string().min(1, "Select a pipeline"),
    isSharedWithCompany: z.boolean().default(false),
})

type FormValues = z.infer<typeof formSchema>

type CustomField = {
    id: string; field_key: string; field_label: string
    field_type: string; options: string[] | null; is_required: boolean
}

export function LeadForm({ onSuccess }: { onSuccess?: () => void }) {
    const [submitting, setSubmitting] = useState(false)
    const [customFields, setCustomFields] = useState<CustomField[]>([])
    const [customData, setCustomData] = useState<Record<string, string | boolean>>({})
    const [pipelines, setPipelines] = useState<{ id: string, name: string, country: string | null, is_default: boolean }[]>([])
    const [pipelineStages, setPipelineStages] = useState<{ pipeline_id: string, name: string }[]>([])
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const loadConfig = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data: profile } = await supabase.from('users').select('agency_id').eq('id', user.id).single()
            if (!profile?.agency_id) return

            const [fieldsRes, pipelinesRes, stagesRes] = await Promise.all([
                supabase.from('custom_fields').select('*').eq('agency_id', profile.agency_id).eq('is_active', true).order('sort_order'),
                supabase.from('pipelines').select('id, name, country, is_default').eq('agency_id', profile.agency_id).order('is_default', { ascending: false }),
                supabase.from('pipeline_stages').select('pipeline_id, name').eq('agency_id', profile.agency_id).order('sort_order')
            ])

            setCustomFields(fieldsRes.data || [])

            if (pipelinesRes.data) {
                setPipelines(pipelinesRes.data)
            }
            if (stagesRes.data) {
                setPipelineStages(stagesRes.data)
            }
        }
        loadConfig()
    }, [])

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            firstName: "", lastName: "", email: "", phone: "",
            destinationCountry: "", courseInterest: "",
            nationality: "", dateOfBirth: "", academicQualification: "",
            source: "", notes: "", pipelineId: ""
        },
    })

    // Set default pipeline once loaded
    useEffect(() => {
        if (pipelines.length > 0 && !form.getValues("pipelineId")) {
            const defaultPipeline = pipelines.find(p => p.is_default) || pipelines[0]
            form.setValue("pipelineId", defaultPipeline.id)
        }
    }, [pipelines, form])

    async function onSubmit(values: FormValues) {
        setSubmitting(true)

        // Get session + agency from client side
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            toast.error("You must be logged in to add a lead.")
            setSubmitting(false)
            return
        }

        const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('agency_id')
            .eq('id', user.id)
            .single()

        if (profileError || !profile?.agency_id) {
            toast.error("Could not load your profile. Please refresh and try again.")
            setSubmitting(false)
            return
        }

        // Determine default status based on selected pipeline's stages
        const firstStage = pipelineStages.find(s => s.pipeline_id === values.pipelineId);
        const startingStatus = firstStage ? firstStage.name : 'New';

        const { error } = await supabase.from('leads').insert({
            agency_id: profile.agency_id,
            owner_id: user.id,
            first_name: values.firstName,
            last_name: values.lastName,
            email: values.email || null,
            phone: values.phone,
            destination_country: values.destinationCountry,
            course_interest: values.courseInterest,
            nationality: values.nationality || null,
            date_of_birth: values.dateOfBirth || null,
            academic_qualification: values.academicQualification || null,
            source: values.source || null,
            notes: values.notes || null,
            custom_data: Object.keys(customData).length > 0 ? customData : null,
            is_shared_with_company: true,
            status: startingStatus,
            pipeline_id: values.pipelineId,
        })

        if (error) {
            console.error("Insert error:", error)
            toast.error(`Failed to save lead: ${error.message}`)
            setSubmitting(false)
            return
        }

        toast.success(`Lead ${values.firstName} ${values.lastName} added successfully!`)
        if (onSuccess) {
            onSuccess()
        } else {
            router.push(`/dashboard/leads/kanban?pipeline=${values.pipelineId}`)
            router.refresh()
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

                {/* ── Personal Details ─────────────────────────── */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium border-b pb-2 flex items-center gap-2">
                        <User className="h-5 w-5 text-muted-foreground" /> Personal Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="firstName" render={({ field }) => (
                            <FormItem>
                                <FormLabel>First Name <span className="text-red-500">*</span></FormLabel>
                                <FormControl><Input placeholder="Jane" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="lastName" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Last Name <span className="text-red-500">*</span></FormLabel>
                                <FormControl><Input placeholder="Doe" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="email" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email Address</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input className="pl-9" type="email" placeholder="jane@example.com" {...field} />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="phone" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Phone Number <span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <PhoneCall className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input className="pl-9" type="tel" placeholder="+977 9800000000" {...field} />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="nationality" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nationality</FormLabel>
                                <FormControl><Input placeholder="e.g. Nepali, Indian..." {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Date of Birth</FormLabel>
                                <FormControl><Input type="date" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="academicQualification" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Academic Qualification</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue placeholder="Highest qualification..." /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="high_school">🎓 High School / SLC / SEE</SelectItem>
                                        <SelectItem value="plus_two">📚 +2 / A-Level / Intermediate</SelectItem>
                                        <SelectItem value="bachelor">🎓 Bachelor's Degree</SelectItem>
                                        <SelectItem value="master">🎓 Master's Degree</SelectItem>
                                        <SelectItem value="phd">🔬 PhD / Doctorate</SelectItem>
                                        <SelectItem value="diploma">📄 Diploma / Certificate</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                </div>

                {/* ── Application Preferences ──────────────────── */}
                <div className="space-y-4 pt-2">
                    <h3 className="text-lg font-medium border-b pb-2 flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-muted-foreground" /> Application Preferences
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="destinationCountry" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Preferred Destination <span className="text-red-500">*</span></FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue placeholder="Select a country..." /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="AU">🇦🇺 Australia</SelectItem>
                                        <SelectItem value="UK">🇬🇧 United Kingdom</SelectItem>
                                        <SelectItem value="CA">🇨🇦 Canada</SelectItem>
                                        <SelectItem value="US">🇺🇸 United States</SelectItem>
                                        <SelectItem value="NZ">🇳🇿 New Zealand</SelectItem>
                                        <SelectItem value="IE">🇮🇪 Ireland</SelectItem>
                                        <SelectItem value="DE">🇩🇪 Germany</SelectItem>
                                        <SelectItem value="SG">🇸🇬 Singapore</SelectItem>
                                        <SelectItem value="JP">🇯🇵 Japan</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="pipelineId" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Target Pipeline <span className="text-red-500">*</span></FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue placeholder="Select a pipeline..." /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {pipelines.map(p => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.name} {p.country && `(${p.country})`} {p.is_default && "★"}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="courseInterest" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Course / Major Interest <span className="text-red-500">*</span></FormLabel>
                                <FormControl><Input placeholder="e.g. Master of Data Science" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="source" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Lead Source</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue placeholder="How did they find you?" /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {LEAD_SOURCES.map(s => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                </div>

                {/* ── Notes ───────────────────────────────────── */}
                <div className="space-y-3 pt-2">
                    <h3 className="text-lg font-medium border-b pb-2 flex items-center gap-2">
                        <Building className="h-5 w-5 text-muted-foreground" /> Internal Notes
                    </h3>
                    <FormField control={form.control} name="notes" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Notes (optional)</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Any additional context about this lead..."
                                    className="min-h-[80px] resize-none"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>

                {/* ── Custom Fields ─────────────────────────── */}
                {customFields.length > 0 && (
                    <div className="space-y-4 pt-2">
                        <h3 className="text-lg font-medium border-b pb-2 flex items-center gap-2">
                            <SlidersHorizontal className="h-5 w-5 text-muted-foreground" /> Additional Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {customFields.map(f => (
                                <div key={f.id} className="space-y-1.5">
                                    <label className="text-sm font-medium">
                                        {f.field_label}
                                        {f.is_required && <span className="text-red-500 ml-1">*</span>}
                                    </label>
                                    {f.field_type === 'select' && f.options ? (
                                        <select
                                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                                            value={(customData[f.field_key] as string) || ''}
                                            onChange={e => setCustomData(prev => ({ ...prev, [f.field_key]: e.target.value }))}
                                        >
                                            <option value="">Select...</option>
                                            {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    ) : f.field_type === 'boolean' ? (
                                        <div className="flex items-center gap-2 h-9">
                                            <input
                                                type="checkbox"
                                                id={`cf_${f.field_key}`}
                                                checked={!!customData[f.field_key]}
                                                onChange={e => setCustomData(prev => ({ ...prev, [f.field_key]: e.target.checked }))}
                                                className="h-4 w-4 rounded border-input"
                                            />
                                            <label htmlFor={`cf_${f.field_key}`} className="text-sm text-muted-foreground">Yes</label>
                                        </div>
                                    ) : (
                                        <input
                                            type={f.field_type === 'number' ? 'number' : f.field_type === 'date' ? 'date' : 'text'}
                                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                                            placeholder={`Enter ${f.field_label.toLowerCase()}...`}
                                            value={(customData[f.field_key] as string) || ''}
                                            onChange={e => setCustomData(prev => ({ ...prev, [f.field_key]: e.target.value }))}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Submit ──────────────────────────────────── */}
                <div className="pt-6 flex justify-end border-t">
                    <Button type="submit" disabled={submitting} className="min-w-[160px] gap-2">
                        {submitting ? (
                            <><Loader2 className="h-4 w-4 animate-spin" /> Saving Lead...</>
                        ) : (
                            <><Save className="h-4 w-4" /> Save Lead</>
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    )
}
