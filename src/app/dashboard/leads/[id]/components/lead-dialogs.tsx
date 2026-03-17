"use client"

// This file acts as a container to render all dialogs associated with a lead.
// Keeping them here cleans up the main client component file.

interface LeadDialogsProps {
    // We will inject the actual Dialog components here from the main client,
    // or pass down the props needed to render them.
    // For now, since many dialogs require complex state from the parent (like new communication text, file uploads, etc.),
    // we can either move all that state here, OR just render the dialogs passed as children/render props.
    // Given the complexity, rendering them via a single function or passing them as children is easiest for the first refactor step.
    children: React.ReactNode
}

export function LeadDialogs({ children }: LeadDialogsProps) {
    return (
        <>
            {children}
        </>
    )
}
