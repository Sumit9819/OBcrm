-- ================================================================
-- Migration: 20260317023000_invoice_status_audit.sql
-- Description:
--   Add a minimal invoice status audit trail for finance governance.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.invoice_status_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    old_status text,
    new_status text NOT NULL,
    reason text,
    changed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    changed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_status_audit ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'invoice_status_audit'
          AND policyname = 'Finance roles view invoice audit'
    ) THEN
        CREATE POLICY "Finance roles view invoice audit"
        ON public.invoice_status_audit
        FOR SELECT
        USING (
            agency_id = (
                SELECT u.agency_id FROM public.users u WHERE u.id = (select auth.uid())
            )
            AND (
                SELECT u.role FROM public.users u WHERE u.id = (select auth.uid())
            ) IN ('super_admin', 'agency_admin', 'accountant')
        );
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.log_invoice_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO public.invoice_status_audit (
            invoice_id,
            agency_id,
            old_status,
            new_status,
            changed_by,
            reason
        )
        VALUES (
            NEW.id,
            NEW.agency_id,
            OLD.status::text,
            NEW.status::text,
            (select auth.uid()),
            NULL
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoice_status_audit ON public.invoices;
CREATE TRIGGER trg_invoice_status_audit
AFTER UPDATE OF status ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.log_invoice_status_change();

CREATE INDEX IF NOT EXISTS idx_invoice_status_audit_invoice_id
    ON public.invoice_status_audit (invoice_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoice_status_audit_agency_id
    ON public.invoice_status_audit (agency_id, changed_at DESC);
