-- ================================================================
-- Migration: 20260317032000_communication_logs_and_chat_links.sql
-- Purpose:
-- 1) Add dedicated whatsapp_logs and email_logs tables with RLS
-- 2) Improve chat notification deep links for lead/student threads
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- 1) WhatsApp Logs
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
    sender_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    to_phone text NOT NULL,
    provider text NOT NULL DEFAULT 'meta_whatsapp',
    direction text NOT NULL DEFAULT 'outbound',
    status text NOT NULL DEFAULT 'sent',
    message text NOT NULL,
    external_message_id text,
    error_message text,
    provider_response jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agency users view whatsapp logs" ON public.whatsapp_logs;
CREATE POLICY "Agency users view whatsapp logs"
ON public.whatsapp_logs
FOR SELECT
USING (
    agency_id = (
        SELECT u.agency_id FROM public.users u WHERE u.id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Agency users insert whatsapp logs" ON public.whatsapp_logs;
CREATE POLICY "Agency users insert whatsapp logs"
ON public.whatsapp_logs
FOR INSERT
WITH CHECK (
    agency_id = (
        SELECT u.agency_id FROM public.users u WHERE u.id = auth.uid()
    )
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_agency_created
    ON public.whatsapp_logs (agency_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_lead_created
    ON public.whatsapp_logs (lead_id, created_at DESC);

-- ────────────────────────────────────────────────────────────────
-- 2) Email Logs
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
    sender_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    to_email text NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    provider text NOT NULL DEFAULT 'smtp',
    direction text NOT NULL DEFAULT 'outbound',
    status text NOT NULL DEFAULT 'sent',
    provider_message_id text,
    error_message text,
    provider_response jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agency users view email logs" ON public.email_logs;
CREATE POLICY "Agency users view email logs"
ON public.email_logs
FOR SELECT
USING (
    agency_id = (
        SELECT u.agency_id FROM public.users u WHERE u.id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Agency users insert email logs" ON public.email_logs;
CREATE POLICY "Agency users insert email logs"
ON public.email_logs
FOR INSERT
WITH CHECK (
    agency_id = (
        SELECT u.agency_id FROM public.users u WHERE u.id = auth.uid()
    )
);

CREATE INDEX IF NOT EXISTS idx_email_logs_agency_created
    ON public.email_logs (agency_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_logs_lead_created
    ON public.email_logs (lead_id, created_at DESC);

-- Realtime publication support
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'whatsapp_logs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_logs;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'email_logs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.email_logs;
    END IF;
END;
$$;

-- ────────────────────────────────────────────────────────────────
-- 3) Chat notifications with thread deep links
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_channel chat_channels%ROWTYPE;
    v_sender_name text;
    v_member RECORD;
    v_link text;
BEGIN
    SELECT * INTO v_channel FROM chat_channels WHERE id = NEW.channel_id;
    SELECT concat(first_name, ' ', last_name) INTO v_sender_name FROM users WHERE id = NEW.sender_id;

    v_link := CASE
        WHEN v_channel.channel_type = 'lead_thread' AND v_channel.lead_id IS NOT NULL
            THEN '/dashboard/chat?leadId=' || v_channel.lead_id::text
        ELSE '/dashboard/chat'
    END;

    FOR v_member IN
        SELECT user_id FROM chat_members
        WHERE channel_id = NEW.channel_id AND user_id <> NEW.sender_id
    LOOP
        INSERT INTO notifications (user_id, agency_id, title, message, type, link)
        VALUES (
            v_member.user_id,
            v_channel.agency_id,
            CASE
                WHEN v_channel.channel_type = 'dm' THEN 'New message from ' || v_sender_name
                WHEN v_channel.channel_type = 'lead_thread' THEN 'New lead thread message'
                ELSE 'New message in #' || COALESCE(v_channel.name, 'channel')
            END,
            LEFT(NEW.content, 100),
            'message',
            v_link
        );
    END LOOP;

    RETURN NEW;
END;
$$;
