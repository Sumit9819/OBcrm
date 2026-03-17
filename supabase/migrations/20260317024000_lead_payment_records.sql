-- ================================================================
-- Migration: 20260317024000_lead_payment_records.sql
-- Description:
--   Add lead-level payment records to persist conversion evidence.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.lead_payment_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    amount numeric(12,2) NOT NULL,
    currency text NOT NULL DEFAULT 'USD',
    paid_at timestamptz NOT NULL,
    source text NOT NULL DEFAULT 'invoice_paid' CHECK (source IN ('invoice_paid', 'manual_override')),
    recorded_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (lead_id, invoice_id)
);

ALTER TABLE public.lead_payment_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'lead_payment_records'
          AND policyname = 'Agency members view lead payment records'
    ) THEN
        CREATE POLICY "Agency members view lead payment records"
        ON public.lead_payment_records
        FOR SELECT
        USING (
            agency_id = (
                SELECT u.agency_id FROM public.users u WHERE u.id = (select auth.uid())
            )
        );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'lead_payment_records'
          AND policyname = 'Finance roles manage lead payment records'
    ) THEN
        CREATE POLICY "Finance roles manage lead payment records"
        ON public.lead_payment_records
        FOR ALL
        USING (
            agency_id = (
                SELECT u.agency_id FROM public.users u WHERE u.id = (select auth.uid())
            )
            AND (
                SELECT u.role FROM public.users u WHERE u.id = (select auth.uid())
            ) IN ('super_admin', 'agency_admin', 'accountant')
        )
        WITH CHECK (
            agency_id = (
                SELECT u.agency_id FROM public.users u WHERE u.id = (select auth.uid())
            )
            AND (
                SELECT u.role FROM public.users u WHERE u.id = (select auth.uid())
            ) IN ('super_admin', 'agency_admin', 'accountant')
        );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lead_payment_records_lead_id
    ON public.lead_payment_records (lead_id, paid_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_payment_records_agency_id
    ON public.lead_payment_records (agency_id, paid_at DESC);
