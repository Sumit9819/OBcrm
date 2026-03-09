-- Create the agency_integrations table to store OAuth and API credentials per agency
CREATE TABLE IF NOT EXISTS public.agency_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, -- e.g., 'google', 'whatsapp'
    access_token TEXT,     -- Encrypted or plain token
    refresh_token TEXT,    -- For providers that support refresh
    config JSONB,          -- For provider-specific configs (e.g. Phone Number ID for WhatsApp)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (agency_id, provider) -- Only one type of integration per agency
);

-- Enable Row Level Security
ALTER TABLE public.agency_integrations ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
-- Admins can manage their own agency's integrations
CREATE POLICY "Admins can view their agency integrations"
    ON public.agency_integrations FOR SELECT
    USING (
        agency_id IN (
            SELECT agency_id FROM public.users 
            WHERE id = auth.uid() AND (role = 'agency_admin' OR role = 'super_admin')
        )
    );

CREATE POLICY "Admins can insert their agency integrations"
    ON public.agency_integrations FOR INSERT
    WITH CHECK (
        agency_id IN (
            SELECT agency_id FROM public.users 
            WHERE id = auth.uid() AND (role = 'agency_admin' OR role = 'super_admin')
        )
    );

CREATE POLICY "Admins can update their agency integrations"
    ON public.agency_integrations FOR UPDATE
    USING (
        agency_id IN (
            SELECT agency_id FROM public.users 
            WHERE id = auth.uid() AND (role = 'agency_admin' OR role = 'super_admin')
        )
    );

CREATE POLICY "Admins can delete their agency integrations"
    ON public.agency_integrations FOR DELETE
    USING (
        agency_id IN (
            SELECT agency_id FROM public.users 
            WHERE id = auth.uid() AND (role = 'agency_admin' OR role = 'super_admin')
        )
    );
