-- ================================================================
-- Migration: 20260317041000_allow_manual_override_without_invoice.sql
-- Description:
--   Allow manual override payment records without invoice_id while
--   still requiring invoice_id for invoice_paid records.
-- ================================================================

ALTER TABLE public.lead_payment_records
    ALTER COLUMN invoice_id DROP NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'lead_payment_records_source_invoice_check'
    ) THEN
        ALTER TABLE public.lead_payment_records
            ADD CONSTRAINT lead_payment_records_source_invoice_check
            CHECK (
                (source = 'invoice_paid' AND invoice_id IS NOT NULL)
                OR source = 'manual_override'
            );
    END IF;
END $$;
