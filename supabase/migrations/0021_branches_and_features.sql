-- ================================================================
-- Migration 0021: Branches, Call Logs, Student Types, Academic Qualification
-- ================================================================

-- ── 1. Branches table ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branches (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id   uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    name        text NOT NULL,
    description text,
    created_at  timestamptz DEFAULT now(),
    UNIQUE(agency_id, name)
);
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'branches' AND policyname = 'Agency members view their branches') THEN
        CREATE POLICY "Agency members view their branches" ON branches FOR SELECT USING (
            agency_id = (SELECT agency_id FROM users WHERE id = auth.uid())
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'branches' AND policyname = 'Admins manage branches') THEN
        CREATE POLICY "Admins manage branches" ON branches FOR ALL USING (
            (SELECT role FROM users WHERE id = auth.uid()) IN ('super_admin', 'agency_admin')
        );
    END IF;
END $$;

-- ── 2. Add branch_id to users ───────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches(id) ON DELETE SET NULL;

-- ── 3. Add academic_qualification to leads ──────────────────────
ALTER TABLE leads ADD COLUMN IF NOT EXISTS academic_qualification text;

-- ── 4. Add student_type to leads ────────────────────────────────
-- null = just a lead, 'abroad' = Study Abroad student, 'test_prep' = IELTS/TOEFL/PTE learner
ALTER TABLE leads ADD COLUMN IF NOT EXISTS student_type text
    CHECK (student_type IN ('abroad', 'test_prep'));

-- ── 5. Call logs table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS call_logs (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id         uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    lead_id           uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    logged_by         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    answered          boolean DEFAULT false,
    feedback          text,
    comment           text,
    next_followup_at  timestamptz,
    created_at        timestamptz DEFAULT now()
);
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'call_logs' AND policyname = 'Agency members view call logs') THEN
        CREATE POLICY "Agency members view call logs" ON call_logs FOR SELECT USING (
            agency_id = (SELECT agency_id FROM users WHERE id = auth.uid())
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'call_logs' AND policyname = 'Staff insert call logs') THEN
        CREATE POLICY "Staff insert call logs" ON call_logs FOR INSERT WITH CHECK (
            agency_id = (SELECT agency_id FROM users WHERE id = auth.uid())
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'call_logs' AND policyname = 'Owner update call logs') THEN
        CREATE POLICY "Owner update call logs" ON call_logs FOR UPDATE USING (
            logged_by = auth.uid()
        );
    END IF;
END $$;

-- ── 6. Add call_logs to realtime ────────────────────────────────
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'call_logs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE call_logs;
    END IF;
END $$;
