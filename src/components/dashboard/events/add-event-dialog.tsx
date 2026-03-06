"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Calendar as CalendarIcon, Loader2 } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { createEvent } from "@/app/dashboard/events/actions"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function AddEventDialog({ children }: { children?: React.ReactNode }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        try {
            const result = await createEvent(formData)
            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success("Event created successfully!")
                setOpen(false)
            }
        } catch (error: any) {
            console.error("Client side error in handleSubmit:", error)
            toast.error("Failed to create event. Please check your connection.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button variant="outline" size="sm" className="h-8 gap-2">
                        <Plus className="h-4 w-4" />
                        <span>Add Event</span>
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form action={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5 text-indigo-600" />
                            Add Calendar Event
                        </DialogTitle>
                        <DialogDescription>
                            Create a new event, meeting, or deadline. This will be visible on the dashboard to all team members.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Event Title <span className="text-red-500">*</span></Label>
                            <Input id="title" name="title" placeholder="Quarterly Review, Product Launch..." required />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="start_at">Start Date & Time <span className="text-red-500">*</span></Label>
                                <Input id="start_at" name="start_at" type="datetime-local" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end_at">End Date & Time</Label>
                                <Input id="end_at" name="end_at" type="datetime-local" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="event_type">Event Type</Label>
                                <Select name="event_type" defaultValue="event">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="event">General Event</SelectItem>
                                        <SelectItem value="meeting">Meeting</SelectItem>
                                        <SelectItem value="deadline">Deadline</SelectItem>
                                        <SelectItem value="reminder">Reminder</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="color">Accent Color</Label>
                                <div className="flex gap-2 items-center mt-1">
                                    <input type="color" id="color" name="color" defaultValue="#6366f1" className="h-8 w-12 cursor-pointer rounded-md border" />
                                    <span className="text-xs text-muted-foreground">Pick a color</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                            <Textarea id="description" name="description" placeholder="Any additional details..." className="h-20" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Event
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
