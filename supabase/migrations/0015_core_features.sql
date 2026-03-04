-- ================================================================
-- Migration 0015: Core CRM Feature Completion
-- ================================================================

-- ── 1. Add assigned_to to leads (lead assignment) ───────────────
ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS assigned_to   uuid REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS nationality   text,
    ADD COLUMN IF NOT EXISTS date_of_birth date,
    ADD COLUMN IF NOT EXISTS notes        text,
    ADD COLUMN IF NOT EXISTS custom_data   jsonb DEFAULT '{}';
-- custom_data stores values for custom fields (e.g. {"ielts_score": "7.5"})

-- ── 2. Add lead_id to tasks (link tasks to specific leads) ──────
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='lead_id') THEN
        ALTER TABLE tasks ADD COLUMN lead_id uuid REFERENCES leads(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ── 3. Ensure tasks table has all needed columns ────────────────
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
        CREATE TABLE tasks (
            id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            agency_id   uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
            assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
            lead_id     uuid REFERENCES leads(id) ON DELETE SET NULL,
            title       text NOT NULL,
            description text,
            due_date    timestamptz,
            priority    text DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
            status      text DEFAULT 'open' CHECK (status IN ('open','in_progress','done')),
            created_by  uuid REFERENCES users(id) ON DELETE SET NULL,
            created_at  timestamptz DEFAULT now(),
            updated_at  timestamptz DEFAULT now()
        );
        ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Staff view agency tasks" ON tasks FOR ALL USING (
            agency_id = (SELECT agency_id FROM users WHERE id = auth.uid())
        );
    END IF;
END $$;

-- ── 4. Ensure role_permissions table exists ─────────────────────
CREATE TABLE IF NOT EXISTS role_permissions (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id   uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    role        text NOT NULL,
    permissions jsonb DEFAULT '{}',
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now(),
    UNIQUE(agency_id, role)
);
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'role_permissions' AND policyname = 'Admins manage permissions') THEN
        CREATE POLICY "Admins manage permissions" ON role_permissions FOR ALL USING (
            (SELECT role FROM users WHERE id = auth.uid()) IN ('super_admin','agency_admin')
        );
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'role_permissions' AND policyname = 'Staff read permissions') THEN
        CREATE POLICY "Staff read permissions" ON role_permissions FOR SELECT USING (
            agency_id = (SELECT agency_id FROM users WHERE id = auth.uid())
        );
    END IF;
END $$;

-- ── 5. Ensure custom_fields table exists ───────────────────────
CREATE TABLE IF NOT EXISTS custom_fields (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id   uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    field_key   text NOT NULL,
    field_label text NOT NULL,
    field_type  text NOT NULL DEFAULT 'text'
                    CHECK (field_type IN ('text','number','date','select','boolean')),
    options     text[],
    is_required boolean DEFAULT false,
    is_active   boolean DEFAULT true,
    sort_order  int DEFAULT 0,
    created_at  timestamptz DEFAULT now(),
    UNIQUE(agency_id, field_key)
);
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'custom_fields' AND policyname = 'Agency views own fields') THEN
        CREATE POLICY "Agency views own fields" ON custom_fields FOR SELECT USING (
            agency_id = (SELECT agency_id FROM users WHERE id = auth.uid())
        );
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'custom_fields' AND policyname = 'Admins manage custom fields') THEN
        CREATE POLICY "Admins manage custom fields" ON custom_fields FOR ALL USING (
            (SELECT role FROM users WHERE id = auth.uid()) IN ('super_admin','agency_admin')
        );
    END IF;
END $$;

-- ── 6. Ensure pipeline_stages table exists ─────────────────────
CREATE TABLE IF NOT EXISTS pipeline_stages (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id   uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    name        text NOT NULL,
    color       text DEFAULT '#6366f1',
    sort_order  int DEFAULT 0,
    is_default  boolean DEFAULT false,
    is_terminal boolean DEFAULT false,
    is_active   boolean DEFAULT true,
    created_at  timestamptz DEFAULT now(),
    UNIQUE(agency_id, name)
);
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pipeline_stages' AND policyname = 'Agency views own stages') THEN
        CREATE POLICY "Agency views own stages" ON pipeline_stages FOR SELECT USING (
            agency_id = (SELECT agency_id FROM users WHERE id = auth.uid())
        );
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pipeline_stages' AND policyname = 'Admins manage stages') THEN
        CREATE POLICY "Admins manage stages" ON pipeline_stages FOR ALL USING (
            (SELECT role FROM users WHERE id = auth.uid()) IN ('super_admin','agency_admin')
        );
    END IF;
END $$;

-- ── 7. Add 'staff' to user_role enum (if not already there) ────
DO $$ BEGIN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'staff';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 8. Activity trigger: auto-log when assigned_to changes ─────
CREATE OR REPLACE FUNCTION log_lead_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to AND NEW.assigned_to IS NOT NULL THEN
        INSERT INTO activities (agency_id, lead_id, user_id, type, description)
        SELECT
            NEW.agency_id,
            NEW.id,
            auth.uid(),
            'note',
            'Lead assigned to ' || COALESCE(u.first_name || ' ' || u.last_name, 'team member')
        FROM users u WHERE u.id = NEW.assigned_to;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lead_assignment ON leads;
CREATE TRIGGER trg_lead_assignment
    AFTER UPDATE OF assigned_to ON leads
    FOR EACH ROW EXECUTE FUNCTION log_lead_assignment();

-- ── 9. Add tasks to realtime ───────────────────────────────────
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'tasks'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
    END IF;
END $$;
