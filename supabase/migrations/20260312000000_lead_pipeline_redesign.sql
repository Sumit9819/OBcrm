-- ================================================================
-- Migration: 20260312000000_lead_pipeline_redesign.sql
-- Description: Two-layer pipeline redesign
--   Layer 1 – Lead qualification pipeline (New → Lost)
--   Layer 2 – Application tracking pipeline (Applied → Enrolled)
--
-- What this adds:
--   1. Lead-level: lost_reason, lost_at, next_followup_at,
--                  followup_note, lead_score columns
--   2. Expand app_status enum with full application lifecycle
--   3. Expand applications table with per-stage timestamps,
--      visa tracking, offer conditions, university/course FKs
--   4. destination_doc_checklists – per-country document templates
--   5. RLS policies for new table
--   6. Trigger: auto-stamp lost_at when status → 'Lost'
--   7. Trigger: auto-stamp applied_at / enrolled_at on applications
-- ================================================================


-- ────────────────────────────────────────────────────────────────
-- 1. LEAD COLUMNS
-- ────────────────────────────────────────────────────────────────

-- lost_reason: mandatory when a lead is moved to "Lost" stage
ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS lost_reason      text,
    ADD COLUMN IF NOT EXISTS lost_at          timestamptz,
    ADD COLUMN IF NOT EXISTS next_followup_at timestamptz,
    ADD COLUMN IF NOT EXISTS followup_note    text,
    -- 0-100 score; UI labels: <34=Cold, 34-66=Warm, >66=Hot
    ADD COLUMN IF NOT EXISTS lead_score       integer DEFAULT 0
        CHECK (lead_score >= 0 AND lead_score <= 100);

-- Index for the "Today's Work" view (followups due today)
CREATE INDEX IF NOT EXISTS idx_leads_next_followup
    ON leads (agency_id, next_followup_at)
    WHERE next_followup_at IS NOT NULL;

-- Index for filtering lost leads
CREATE INDEX IF NOT EXISTS idx_leads_lost_at
    ON leads (agency_id, lost_at)
    WHERE lost_at IS NOT NULL;


-- ────────────────────────────────────────────────────────────────
-- 2. EXPAND app_status ENUM
--    Original: 'Draft', 'Lodged', 'Conditional Offer',
--              'Unconditional Offer', 'Rejected'
--    Add: 'Applied', 'Visa Filed', 'Visa Approved', 'Visa Denied',
--         'Enrolled', 'Withdrawn'
-- ────────────────────────────────────────────────────────────────

DO $$ BEGIN
    ALTER TYPE app_status ADD VALUE IF NOT EXISTS 'Applied';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TYPE app_status ADD VALUE IF NOT EXISTS 'Visa Filed';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TYPE app_status ADD VALUE IF NOT EXISTS 'Visa Approved';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TYPE app_status ADD VALUE IF NOT EXISTS 'Visa Denied';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TYPE app_status ADD VALUE IF NOT EXISTS 'Enrolled';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TYPE app_status ADD VALUE IF NOT EXISTS 'Withdrawn';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ────────────────────────────────────────────────────────────────
-- 3. EXPAND applications TABLE
--    Adds per-stage timestamps, visa tracking, offer details,
--    optional university/course FK for structured data
-- ────────────────────────────────────────────────────────────────

ALTER TABLE applications
    -- Link to structured university record (optional — falls back to university_name text)
    ADD COLUMN IF NOT EXISTS university_id      uuid REFERENCES universities(id) ON DELETE SET NULL,
    -- Link to structured course record (optional)
    ADD COLUMN IF NOT EXISTS course_id          uuid REFERENCES university_courses(id) ON DELETE SET NULL,
    -- Branch scoping
    ADD COLUMN IF NOT EXISTS branch_id          uuid REFERENCES branches(id) ON DELETE SET NULL,
    -- Human-readable intake: e.g. "February 2027"
    ADD COLUMN IF NOT EXISTS intake_date        date,
    -- Internal notes about this specific application
    ADD COLUMN IF NOT EXISTS notes              text,
    -- ── Stage timestamps ──────────────────────────────────────
    ADD COLUMN IF NOT EXISTS applied_at         timestamptz,
    ADD COLUMN IF NOT EXISTS offer_received_at  timestamptz,
    -- Conditions attached to a conditional offer
    ADD COLUMN IF NOT EXISTS offer_conditions   text,
    ADD COLUMN IF NOT EXISTS unconditional_at   timestamptz,
    ADD COLUMN IF NOT EXISTS visa_filed_at      timestamptz,
    ADD COLUMN IF NOT EXISTS visa_approved_at   timestamptz,
    ADD COLUMN IF NOT EXISTS visa_expiry        date,
    -- Visa reference / grant number
    ADD COLUMN IF NOT EXISTS visa_number        text,
    ADD COLUMN IF NOT EXISTS visa_denied_at     timestamptz,
    ADD COLUMN IF NOT EXISTS enrolled_at        timestamptz,
    ADD COLUMN IF NOT EXISTS rejected_at        timestamptz,
    ADD COLUMN IF NOT EXISTS rejection_reason   text,
    ADD COLUMN IF NOT EXISTS withdrawn_at       timestamptz;

-- Backfill applied_at for all existing applications (safe: no new enum values referenced)
UPDATE applications
SET applied_at = created_at
WHERE applied_at IS NULL;

-- Useful indexes for filtering applications by status or lead
CREATE INDEX IF NOT EXISTS idx_applications_lead_id
    ON applications (lead_id);

CREATE INDEX IF NOT EXISTS idx_applications_agency_status
    ON applications (agency_id, status);

CREATE INDEX IF NOT EXISTS idx_applications_university_id
    ON applications (university_id)
    WHERE university_id IS NOT NULL;


-- ────────────────────────────────────────────────────────────────
-- 4. DESTINATION DOCUMENT CHECKLISTS
--    Agency-level templates: which docs are needed per country.
--    Counsellors see a checklist auto-populated from these when
--    a lead picks a destination country.
-- ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS destination_doc_checklists (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id           uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    destination_country text NOT NULL,          -- e.g. 'AU', 'UK', 'CA'
    doc_name            text NOT NULL,          -- e.g. 'Genuine Temporary Entrant Letter'
    doc_key             text NOT NULL,          -- snake_case key e.g. 'gte_letter'
    is_mandatory        boolean NOT NULL DEFAULT true,
    sort_order          integer NOT NULL DEFAULT 0,
    created_at          timestamptz DEFAULT now(),
    UNIQUE (agency_id, destination_country, doc_key)
);

ALTER TABLE destination_doc_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members view checklists"
    ON destination_doc_checklists FOR SELECT
    USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins manage checklists"
    ON destination_doc_checklists FOR ALL
    USING ((SELECT role FROM users WHERE id = auth.uid()) IN ('super_admin', 'agency_admin'));

-- Index for fast lookup by country
CREATE INDEX IF NOT EXISTS idx_dest_checklists_agency_country
    ON destination_doc_checklists (agency_id, destination_country);


-- ────────────────────────────────────────────────────────────────
-- 5. LEAD DOCUMENT CHECKLIST ITEMS
--    Tracks per-lead completion of destination checklist items.
--    Separate from the documents table (which holds actual files).
-- ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lead_doc_checklist (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id        uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    lead_id          uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    checklist_id     uuid NOT NULL REFERENCES destination_doc_checklists(id) ON DELETE CASCADE,
    is_collected     boolean NOT NULL DEFAULT false,
    collected_at     timestamptz,
    document_id      uuid REFERENCES documents(id) ON DELETE SET NULL,  -- linked actual file
    notes            text,
    updated_at       timestamptz DEFAULT now(),
    UNIQUE (lead_id, checklist_id)
);

ALTER TABLE lead_doc_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members view lead checklist"
    ON lead_doc_checklist FOR SELECT
    USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Agency members manage lead checklist"
    ON lead_doc_checklist FOR ALL
    USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_lead_doc_checklist_lead_id
    ON lead_doc_checklist (lead_id);


-- ────────────────────────────────────────────────────────────────
-- 6. TRIGGER: Auto-stamp lost_at when lead status → 'Lost'
--    Clears lost_at + lost_reason when lead is reopened
-- ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_lead_lost_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- Stamping lost_at when moved to Lost
    IF NEW.status = 'Lost' AND (OLD.status IS DISTINCT FROM 'Lost') THEN
        NEW.lost_at = now();

    -- Clear lost timestamps when reopened from Lost
    ELSIF OLD.status = 'Lost' AND NEW.status <> 'Lost' THEN
        NEW.lost_at     = NULL;
        NEW.lost_reason = NULL;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lead_lost_status ON leads;
CREATE TRIGGER trg_lead_lost_status
    BEFORE UPDATE OF status ON leads
    FOR EACH ROW EXECUTE FUNCTION handle_lead_lost_status();


-- ────────────────────────────────────────────────────────────────
-- 7. TRIGGER: Auto-stamp stage timestamps on applications
-- ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_application_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- Set applied_at the first time status moves away from Draft/initial
    IF NEW.status IN ('Applied', 'Lodged') AND NEW.applied_at IS NULL THEN
        NEW.applied_at = now();
    END IF;

    IF NEW.status IN ('Conditional Offer', 'Unconditional Offer')
       AND NEW.offer_received_at IS NULL THEN
        NEW.offer_received_at = now();
    END IF;

    IF NEW.status = 'Unconditional Offer' AND NEW.unconditional_at IS NULL THEN
        NEW.unconditional_at = now();
    END IF;

    IF NEW.status = 'Visa Filed' AND NEW.visa_filed_at IS NULL THEN
        NEW.visa_filed_at = now();
    END IF;

    IF NEW.status = 'Visa Approved' AND NEW.visa_approved_at IS NULL THEN
        NEW.visa_approved_at = now();
    END IF;

    IF NEW.status = 'Visa Denied' AND NEW.visa_denied_at IS NULL THEN
        NEW.visa_denied_at = now();
    END IF;

    IF NEW.status = 'Enrolled' AND NEW.enrolled_at IS NULL THEN
        NEW.enrolled_at = now();
    END IF;

    IF NEW.status = 'Rejected' AND NEW.rejected_at IS NULL THEN
        NEW.rejected_at = now();
    END IF;

    IF NEW.status = 'Withdrawn' AND NEW.withdrawn_at IS NULL THEN
        NEW.withdrawn_at = now();
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_application_status_change ON applications;
CREATE TRIGGER trg_application_status_change
    BEFORE UPDATE OF status ON applications
    FOR EACH ROW EXECUTE FUNCTION handle_application_status_change();


-- ────────────────────────────────────────────────────────────────
-- 8. TRIGGER: Sync next_followup_at on leads from call_logs
--    When a call log is inserted/updated with next_followup_at,
--    update the lead's next_followup_at if the new date is sooner
-- ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION sync_lead_followup_from_call()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NEW.next_followup_at IS NOT NULL THEN
        UPDATE leads
        SET
            next_followup_at = NEW.next_followup_at,
            followup_note    = COALESCE(NEW.comment, NEW.feedback)
        WHERE id = NEW.lead_id
          AND (next_followup_at IS NULL OR NEW.next_followup_at <= next_followup_at);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_lead_followup ON call_logs;
CREATE TRIGGER trg_sync_lead_followup
    AFTER INSERT OR UPDATE OF next_followup_at ON call_logs
    FOR EACH ROW EXECUTE FUNCTION sync_lead_followup_from_call();


-- ────────────────────────────────────────────────────────────────
-- 9. TRIGGER: Notification when follow-up is overdue
--    Runs on follow-up date check — via pg_cron or Supabase
--    Edge Function. This creates a notification record which the
--    realtime subscription picks up as an in-app bell notification.
--
--    Instead of a time-based trigger (needs pg_cron),
--    we create a DB function that can be called by a scheduled
--    Edge Function / Automation worker.
-- ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION notify_overdue_followups()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    r RECORD;
BEGIN
    -- Find all leads where followup is due and assigned counsellor not yet notified
    FOR r IN
        SELECT
            l.id          AS lead_id,
            l.agency_id,
            l.first_name,
            l.last_name,
            l.assigned_to,
            l.next_followup_at,
            l.followup_note
        FROM leads l
        WHERE l.next_followup_at <= now()
          AND l.next_followup_at > (now() - INTERVAL '24 hours')  -- only notify once per day window
          AND l.status <> 'Lost'
          AND l.status <> 'Converted'
          AND l.assigned_to IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM notifications n
              WHERE n.user_id = l.assigned_to
                AND n.type = 'followup'
                AND n.link LIKE '%' || l.id::text || '%'
                AND n.created_at > (now() - INTERVAL '24 hours')
          )
    LOOP
        INSERT INTO notifications (user_id, agency_id, type, title, message, link)
        VALUES (
            r.assigned_to,
            r.agency_id,
            'followup',
            'Follow-up Due',
            'Follow up with ' || r.first_name || ' ' || r.last_name
                || CASE WHEN r.followup_note IS NOT NULL
                        THEN ': "' || r.followup_note || '"'
                        ELSE '' END,
            '/dashboard/leads/' || r.lead_id::text
        );
    END LOOP;
END;
$$;

-- Add 'followup' as a valid notification type (safe no-op if already text column)
-- The notifications.type is a text column so no enum change needed.


-- ────────────────────────────────────────────────────────────────
-- 10. SEED default destination checklists for common countries
--     These are inserted as agency_id = NULL placeholders so
--     they can be copied per-agency by a setup function.
--     We use a special "system defaults" approach: when an agency
--     queries their checklists and has none, the UI falls back
--     to these. For now we seed a helper function.
-- ────────────────────────────────────────────────────────────────

-- Function to seed default doc checklists for a new agency
CREATE OR REPLACE FUNCTION seed_destination_checklists(p_agency_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- Australia
    INSERT INTO destination_doc_checklists (agency_id, destination_country, doc_name, doc_key, is_mandatory, sort_order)
    VALUES
        (p_agency_id, 'AU', 'Valid Passport',                    'passport',           true,  1),
        (p_agency_id, 'AU', 'Academic Transcripts',              'transcripts',         true,  2),
        (p_agency_id, 'AU', 'English Test Score (IELTS/PTE)',    'english_test',        true,  3),
        (p_agency_id, 'AU', 'Statement of Purpose (SOP)',        'sop',                 true,  4),
        (p_agency_id, 'AU', 'Genuine Temporary Entrant (GTE) Letter', 'gte_letter',     true,  5),
        (p_agency_id, 'AU', 'Financial Evidence (Bank Statement)', 'bank_statement',    true,  6),
        (p_agency_id, 'AU', 'Reference / Recommendation Letters','reference_letters',   false, 7),
        (p_agency_id, 'AU', 'Work Experience Documents',         'work_experience',     false, 8)
    ON CONFLICT (agency_id, destination_country, doc_key) DO NOTHING;

    -- United Kingdom
    INSERT INTO destination_doc_checklists (agency_id, destination_country, doc_name, doc_key, is_mandatory, sort_order)
    VALUES
        (p_agency_id, 'UK', 'Valid Passport',                    'passport',           true,  1),
        (p_agency_id, 'UK', 'Academic Transcripts',              'transcripts',         true,  2),
        (p_agency_id, 'UK', 'English Test Score (IELTS/PTE)',    'english_test',        true,  3),
        (p_agency_id, 'UK', 'Personal Statement',                'personal_statement',  true,  4),
        (p_agency_id, 'UK', 'Reference Letters (2)',             'reference_letters',   true,  5),
        (p_agency_id, 'UK', 'Financial Evidence (Bank Statement)', 'bank_statement',    true,  6),
        (p_agency_id, 'UK', 'CAS Number (from university)',      'cas_number',          false, 7),
        (p_agency_id, 'UK', 'TB Test Certificate',               'tb_test',             false, 8)
    ON CONFLICT (agency_id, destination_country, doc_key) DO NOTHING;

    -- Canada
    INSERT INTO destination_doc_checklists (agency_id, destination_country, doc_name, doc_key, is_mandatory, sort_order)
    VALUES
        (p_agency_id, 'CA', 'Valid Passport',                    'passport',           true,  1),
        (p_agency_id, 'CA', 'Academic Transcripts',              'transcripts',         true,  2),
        (p_agency_id, 'CA', 'English Test Score (IELTS/PTE)',    'english_test',        true,  3),
        (p_agency_id, 'CA', 'Statement of Purpose (SOP)',        'sop',                 true,  4),
        (p_agency_id, 'CA', 'GIC Receipt (Guaranteed Investment)', 'gic_receipt',       true,  5),
        (p_agency_id, 'CA', 'Financial Evidence (Bank Statement)', 'bank_statement',    true,  6),
        (p_agency_id, 'CA', 'Reference Letters',                 'reference_letters',   false, 7),
        (p_agency_id, 'CA', 'Medical Exam Certificate',          'medical_exam',        false, 8)
    ON CONFLICT (agency_id, destination_country, doc_key) DO NOTHING;

    -- United States
    INSERT INTO destination_doc_checklists (agency_id, destination_country, doc_name, doc_key, is_mandatory, sort_order)
    VALUES
        (p_agency_id, 'US', 'Valid Passport',                    'passport',           true,  1),
        (p_agency_id, 'US', 'Academic Transcripts',              'transcripts',         true,  2),
        (p_agency_id, 'US', 'English Test Score (TOEFL/IELTS)',  'english_test',        true,  3),
        (p_agency_id, 'US', 'Statement of Purpose (SOP)',        'sop',                 true,  4),
        (p_agency_id, 'US', 'Financial Evidence (Bank Statement)', 'bank_statement',    true,  5),
        (p_agency_id, 'US', 'Reference Letters (3)',             'reference_letters',   true,  6),
        (p_agency_id, 'US', 'I-20 Form (from university)',       'i20_form',            false, 7),
        (p_agency_id, 'US', 'SAT/GRE/GMAT Score',               'standardized_test',   false, 8)
    ON CONFLICT (agency_id, destination_country, doc_key) DO NOTHING;

    -- New Zealand
    INSERT INTO destination_doc_checklists (agency_id, destination_country, doc_name, doc_key, is_mandatory, sort_order)
    VALUES
        (p_agency_id, 'NZ', 'Valid Passport',                    'passport',           true,  1),
        (p_agency_id, 'NZ', 'Academic Transcripts',              'transcripts',         true,  2),
        (p_agency_id, 'NZ', 'English Test Score (IELTS/PTE)',    'english_test',        true,  3),
        (p_agency_id, 'NZ', 'Statement of Purpose (SOP)',        'sop',                 true,  4),
        (p_agency_id, 'NZ', 'Financial Evidence (Bank Statement)', 'bank_statement',    true,  5),
        (p_agency_id, 'NZ', 'Medical Certificate',               'medical_cert',        false, 6),
        (p_agency_id, 'NZ', 'Police Clearance Certificate',      'police_clearance',    false, 7)
    ON CONFLICT (agency_id, destination_country, doc_key) DO NOTHING;
END;
$$;


-- ────────────────────────────────────────────────────────────────
-- 11. Seed checklists for ALL existing agencies
-- ────────────────────────────────────────────────────────────────

DO $$
DECLARE
    a RECORD;
BEGIN
    FOR a IN SELECT id FROM agencies LOOP
        PERFORM seed_destination_checklists(a.id);
    END LOOP;
END $$;


-- ────────────────────────────────────────────────────────────────
-- 12. Auto-seed checklists for new agencies via trigger
-- ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION auto_seed_agency_checklists()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    PERFORM seed_destination_checklists(NEW.id);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_seed_checklists ON agencies;
CREATE TRIGGER trg_auto_seed_checklists
    AFTER INSERT ON agencies
    FOR EACH ROW EXECUTE FUNCTION auto_seed_agency_checklists();


-- ────────────────────────────────────────────────────────────────
-- 13. APPLICATION ACTIVITIES LOG
--     Track status changes per application (separate from lead activities)
-- ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS application_activities (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id       uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    application_id  uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    lead_id         uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    user_id         uuid REFERENCES users(id) ON DELETE SET NULL,
    type            text NOT NULL DEFAULT 'status_change'
                        CHECK (type IN ('status_change', 'note', 'document', 'email')),
    from_status     text,
    to_status       text,
    description     text,
    created_at      timestamptz DEFAULT now()
);

ALTER TABLE application_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members view app activities"
    ON application_activities FOR SELECT
    USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Agency members insert app activities"
    ON application_activities FOR INSERT
    WITH CHECK (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_app_activities_application_id
    ON application_activities (application_id);

CREATE INDEX IF NOT EXISTS idx_app_activities_lead_id
    ON application_activities (lead_id);


-- ────────────────────────────────────────────────────────────────
-- 14. TRIGGER: Auto-log application status changes
-- ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION log_application_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO application_activities
            (agency_id, application_id, lead_id, user_id, type, from_status, to_status, description)
        VALUES (
            NEW.agency_id,
            NEW.id,
            NEW.lead_id,
            auth.uid(),
            'status_change',
            OLD.status::text,
            NEW.status::text,
            'Status changed from ' || OLD.status::text || ' to ' || NEW.status::text
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_application_status_change ON applications;
CREATE TRIGGER trg_log_application_status_change
    AFTER UPDATE OF status ON applications
    FOR EACH ROW EXECUTE FUNCTION log_application_status_change();


-- ────────────────────────────────────────────────────────────────
-- 15. Add applications to realtime publication
-- ────────────────────────────────────────────────────────────────

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'applications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE applications;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'application_activities'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE application_activities;
    END IF;
END $$;
