-- ================================================================
-- Migration 0014: Role Restructure + Agent Commission System
-- ================================================================

-- ── 1. Add job_title and commission_rate to users ───────────────
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS job_title       text,
    ADD COLUMN IF NOT EXISTS commission_rate numeric(5,2) DEFAULT 0;
-- commission_rate: e.g. 5.00 = 5%. Default 0 for internal staff.

-- ── 2. Add referred_by to leads ────────────────────────────────
ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES users(id) ON DELETE SET NULL;

-- ── 3. Agent Commissions table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_commissions (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id   uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    agent_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lead_id     uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    rate        numeric(5,2)  NOT NULL DEFAULT 0,   -- snapshot of rate at enrollment time
    amount      numeric(10,2),                       -- actual payout amount (editable by admin)
    currency    text NOT NULL DEFAULT 'USD',
    status      text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','paid')),
    notes       text,
    paid_at     timestamptz,
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now(),
    UNIQUE(lead_id)   -- one commission record per enrolled lead
);

-- ── 4. RLS for agent_commissions ───────────────────────────────
ALTER TABLE agent_commissions ENABLE ROW LEVEL SECURITY;

-- Agents only see their own records
CREATE POLICY "Agents view own commissions" ON agent_commissions
    FOR SELECT USING (agent_id = auth.uid());

-- Admins see and manage all
CREATE POLICY "Admins manage commissions" ON agent_commissions
    FOR ALL USING (
        (SELECT role FROM users WHERE id = auth.uid())
        IN ('super_admin','agency_admin')
    );

-- ── 5. DB Trigger: auto-create commission when lead enrolls ─────
CREATE OR REPLACE FUNCTION create_agent_commission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_agent_id   uuid;
    v_rate       numeric(5,2);
    v_agency_id  uuid;
BEGIN
    -- Only fires when status changes TO 'Enrolled'
    IF NEW.status = 'Enrolled' AND OLD.status <> 'Enrolled' THEN
        -- Get referring agent
        v_agent_id  := NEW.referred_by;
        v_agency_id := NEW.agency_id;

        IF v_agent_id IS NOT NULL THEN
            -- Look up agent's current rate
            SELECT commission_rate INTO v_rate
            FROM users WHERE id = v_agent_id;

            -- Insert commission record (ignore if already exists)
            INSERT INTO agent_commissions (agency_id, agent_id, lead_id, rate, status)
            VALUES (v_agency_id, v_agent_id, NEW.id, COALESCE(v_rate, 0), 'pending')
            ON CONFLICT (lead_id) DO NOTHING;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agent_commission ON leads;
CREATE TRIGGER trg_agent_commission
    AFTER UPDATE OF status ON leads
    FOR EACH ROW EXECUTE FUNCTION create_agent_commission();

-- ── 6. Add leads to realtime if not already ────────────────────
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'agent_commissions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE agent_commissions;
    END IF;
END $$;
