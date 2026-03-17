-- ================================================================
-- Migration: 20260317010000_sms_and_ai_category.sql
-- Description:
--   1) Add ai_category to leads (Hot/Warm/Cold)
--   2) Auto-sync ai_category from lead_score
--   3) Add sms_logs table for Twilio and manual SMS tracking
-- ================================================================

ALTER TABLE public.leads
    ADD COLUMN IF NOT EXISTS ai_category text;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'leads_ai_category_check'
    ) THEN
        ALTER TABLE public.leads
            ADD CONSTRAINT leads_ai_category_check
            CHECK (ai_category IN ('Hot', 'Warm', 'Cold') OR ai_category IS NULL);
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.sync_ai_category_from_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.ai_category := CASE
        WHEN COALESCE(NEW.lead_score, 0) >= 67 THEN 'Hot'
        WHEN COALESCE(NEW.lead_score, 0) >= 34 THEN 'Warm'
        ELSE 'Cold'
    END;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_ai_category ON public.leads;
CREATE TRIGGER trg_sync_ai_category
    BEFORE INSERT OR UPDATE OF lead_score
    ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_ai_category_from_score();

UPDATE public.leads
SET ai_category = CASE
    WHEN COALESCE(lead_score, 0) >= 67 THEN 'Hot'
    WHEN COALESCE(lead_score, 0) >= 34 THEN 'Warm'
    ELSE 'Cold'
END
WHERE ai_category IS NULL;

CREATE TABLE IF NOT EXISTS public.sms_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    sender_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    to_phone text NOT NULL,
    from_phone text,
    provider text NOT NULL DEFAULT 'twilio',
    direction text NOT NULL DEFAULT 'outbound' CHECK (direction IN ('outbound', 'inbound')),
    status text NOT NULL DEFAULT 'sent',
    message_sid text,
    message text NOT NULL,
    error_message text,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members view sms logs"
ON public.sms_logs
FOR SELECT
USING (
    agency_id = (
        SELECT users.agency_id
        FROM public.users
        WHERE users.id = (select auth.uid())
    )
);

CREATE POLICY "Agency members insert sms logs"
ON public.sms_logs
FOR INSERT
WITH CHECK (
    agency_id = (
        SELECT users.agency_id
        FROM public.users
        WHERE users.id = (select auth.uid())
    )
);

CREATE INDEX IF NOT EXISTS idx_sms_logs_agency_created
    ON public.sms_logs (agency_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sms_logs_lead_created
    ON public.sms_logs (lead_id, created_at DESC);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'sms_logs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.sms_logs;
    END IF;
END $$;
