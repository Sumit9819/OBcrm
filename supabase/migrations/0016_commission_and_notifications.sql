-- ================================================================
-- Migration 0016: Commission Auto-Calc + Notifications Table
-- ================================================================

-- ── 1. Commission amount auto-calculation ────────────────────────
-- Replaces the 0014 trigger to also calculate the amount from paid invoices

CREATE OR REPLACE FUNCTION auto_create_commission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_agent_id         uuid;
    v_commission_rate  numeric;
    v_invoice_total    numeric;
BEGIN
    -- Only fire when status changes TO 'Enrolled'
    IF NEW.status != 'Enrolled' OR OLD.status = 'Enrolled' THEN
        RETURN NEW;
    END IF;

    v_agent_id := NEW.referred_by;
    IF v_agent_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get agent's commission rate
    SELECT commission_rate INTO v_commission_rate
    FROM users WHERE id = v_agent_id;

    -- Sum all paid invoices for this lead (may be 0 if none yet)
    SELECT COALESCE(SUM(amount), 0) INTO v_invoice_total
    FROM invoices
    WHERE lead_id = NEW.id AND status = 'paid';

    -- Insert or update commission record
    INSERT INTO agent_commissions (agency_id, agent_id, lead_id, rate, amount, status, notes)
    VALUES (
        NEW.agency_id,
        v_agent_id,
        NEW.id,
        COALESCE(v_commission_rate, 0),
        ROUND((v_invoice_total * COALESCE(v_commission_rate, 0) / 100.0)::numeric, 2),
        'pending',
        'Auto-generated when lead enrolled'
    )
    ON CONFLICT (lead_id) DO UPDATE
        SET amount     = ROUND((v_invoice_total * COALESCE(v_commission_rate, 0) / 100.0)::numeric, 2),
            rate       = COALESCE(v_commission_rate, 0),
            updated_at = now();

    RETURN NEW;
END;
$$;

-- Recreate trigger (drops old trg_agent_commission from 0014 and replaces)
DROP TRIGGER IF EXISTS trg_agent_commission ON leads;
DROP TRIGGER IF EXISTS trg_auto_commission ON leads;
CREATE TRIGGER trg_auto_commission
    AFTER UPDATE OF status ON leads
    FOR EACH ROW EXECUTE FUNCTION auto_create_commission();

-- ── 2. Recalculate commission when invoice is marked paid ────────
CREATE OR REPLACE FUNCTION recalculate_commission_on_invoice_paid()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_lead_id   uuid;
    v_agent_id  uuid;
    v_rate      numeric;
    v_total     numeric;
BEGIN
    -- Only fire when invoice status changes to 'paid'
    IF NEW.status != 'paid' OR OLD.status = 'paid' THEN
        RETURN NEW;
    END IF;

    -- Only if this invoice is linked to a lead
    IF NEW.lead_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get agent from the lead
    SELECT id, referred_by INTO v_lead_id, v_agent_id
    FROM leads WHERE id = NEW.lead_id;

    IF v_agent_id IS NULL OR v_lead_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get agent's commission rate
    SELECT commission_rate INTO v_rate FROM users WHERE id = v_agent_id;

    -- Sum all paid invoices for this lead
    SELECT COALESCE(SUM(amount), 0) INTO v_total
    FROM invoices WHERE lead_id = v_lead_id AND status = 'paid';

    -- Update pending commission record
    UPDATE agent_commissions
    SET
        amount     = ROUND((v_total * COALESCE(v_rate, 0) / 100.0)::numeric, 2),
        rate       = COALESCE(v_rate, 0),
        updated_at = now()
    WHERE lead_id = v_lead_id AND agent_id = v_agent_id AND status = 'pending';

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoice_paid_commission ON invoices;
CREATE TRIGGER trg_invoice_paid_commission
    AFTER UPDATE OF status ON invoices
    FOR EACH ROW EXECUTE FUNCTION recalculate_commission_on_invoice_paid();

-- ── 3. Add lead_id to invoices if missing ────────────────────────
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='invoices' AND column_name='lead_id'
    ) THEN
        ALTER TABLE invoices ADD COLUMN lead_id uuid REFERENCES leads(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ── 4. Notifications table ───────────────────────────────────────
-- Columns match the existing NotificationBell component (uses: read, message, link, type, title)
CREATE TABLE IF NOT EXISTS notifications (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id   uuid REFERENCES agencies(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        text NOT NULL DEFAULT 'info',
    title       text NOT NULL,
    message     text,
    link        text,
    read        boolean DEFAULT false,
    created_at  timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users only see their own notifications
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'notifications' AND policyname = 'Users see own notifications'
    ) THEN
        CREATE POLICY "Users see own notifications" ON notifications
            FOR ALL USING (user_id = auth.uid());
    END IF;
END $$;

-- Enable Realtime for notifications
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    END IF;
END $$;

-- ── 5. Trigger: notify assignee when lead is assigned ────────────
CREATE OR REPLACE FUNCTION notify_lead_assigned()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_lead_name text;
BEGIN
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to AND NEW.assigned_to IS NOT NULL THEN
        v_lead_name := COALESCE(NEW.first_name || ' ' || NEW.last_name, 'A lead');
        INSERT INTO notifications (agency_id, user_id, type, title, message, link)
        VALUES (
            NEW.agency_id,
            NEW.assigned_to,
            'lead',
            'Lead assigned to you',
            v_lead_name || ' has been assigned to you.',
            '/dashboard/leads/' || NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_lead_assigned ON leads;
CREATE TRIGGER trg_notify_lead_assigned
    AFTER UPDATE OF assigned_to ON leads
    FOR EACH ROW EXECUTE FUNCTION notify_lead_assigned();

-- ── 6. Trigger: notify assignee when lead status changes ─────────
CREATE OR REPLACE FUNCTION notify_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_lead_name text;
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.assigned_to IS NOT NULL THEN
        v_lead_name := COALESCE(NEW.first_name || ' ' || NEW.last_name, 'A lead');
        INSERT INTO notifications (agency_id, user_id, type, title, message, link)
        VALUES (
            NEW.agency_id,
            NEW.assigned_to,
            'lead',
            'Lead status updated',
            v_lead_name || ' moved to ' || NEW.status,
            '/dashboard/leads/' || NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_status_change ON leads;
CREATE TRIGGER trg_notify_status_change
    AFTER UPDATE OF status ON leads
    FOR EACH ROW EXECUTE FUNCTION notify_status_change();
