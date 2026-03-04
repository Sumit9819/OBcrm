-- ================================================================
-- Migration 0013: Customization System
-- Custom Fields, Pipeline Stages, Dashboard Widgets,
-- Role Permissions, Notification Prefs, Message Templates
-- ================================================================

-- ── 1. Custom Lead Fields ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_fields (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id    uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    field_name   text NOT NULL,           -- display label
    field_key    text NOT NULL,           -- snake_case key used in JSON
    field_type   text NOT NULL DEFAULT 'text', -- text | number | date | select | boolean
    options      jsonb,                   -- for select fields: ["Option A","Option B"]
    is_required  boolean DEFAULT false,
    is_active    boolean DEFAULT true,
    sort_order   integer DEFAULT 0,
    created_at   timestamptz DEFAULT now(),
    UNIQUE(agency_id, field_key)
);

-- Store custom field values per lead
CREATE TABLE IF NOT EXISTS lead_custom_values (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id    uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    agency_id  uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    field_key  text NOT NULL,
    value      text,
    updated_at timestamptz DEFAULT now(),
    UNIQUE(lead_id, field_key)
);

-- ── 2. Pipeline Stages ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pipeline_stages (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id   uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    name        text NOT NULL,
    color       text NOT NULL DEFAULT '#6366f1',
    sort_order  integer DEFAULT 0,
    is_active   boolean DEFAULT true,
    is_default  boolean DEFAULT false,   -- starting stage for new leads
    is_terminal boolean DEFAULT false,   -- final/won stage
    created_at  timestamptz DEFAULT now()
);

-- ── 3. Dashboard Widget Preferences (per-user) ──────────────────
CREATE TABLE IF NOT EXISTS dashboard_preferences (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    agency_id   uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    widgets     jsonb NOT NULL DEFAULT '[]', -- ordered array of widget IDs with enabled flag
    updated_at  timestamptz DEFAULT now(),
    UNIQUE(user_id)
);

-- ── 4. Role Permissions (per-agency) ───────────────────────────
CREATE TABLE IF NOT EXISTS role_permissions (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id   uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    role        text NOT NULL,
    permissions jsonb NOT NULL DEFAULT '{}',  -- { "leads.create": true, "reports.view": false }
    updated_at  timestamptz DEFAULT now(),
    UNIQUE(agency_id, role)
);

-- ── 5. Notification Preferences (per-user) ──────────────────────
CREATE TABLE IF NOT EXISTS notification_preferences (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    agency_id   uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    preferences jsonb NOT NULL DEFAULT '{}', -- { "message": true, "lead_assigned": true, ... }
    updated_at  timestamptz DEFAULT now(),
    UNIQUE(user_id)
);

-- ── 6. Message Templates ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_templates (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id   uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    created_by  uuid REFERENCES auth.users(id),
    name        text NOT NULL,
    category    text NOT NULL DEFAULT 'general', -- general | whatsapp | email | sms
    content     text NOT NULL,
    variables   text[],           -- ["{{name}}", "{{course}}"] extracted placeholders
    is_active   boolean DEFAULT true,
    use_count   integer DEFAULT 0,
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now()
);

-- ── RLS ─────────────────────────────────────────────────────────

ALTER TABLE custom_fields          ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_custom_values     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_preferences  ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates      ENABLE ROW LEVEL SECURITY;

-- custom_fields
CREATE POLICY "Agency members view custom fields" ON custom_fields
    FOR SELECT USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Admins manage custom fields" ON custom_fields
    FOR ALL USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid())
        AND (SELECT role FROM users WHERE id = auth.uid()) IN ('super_admin','agency_admin'));

-- lead_custom_values
CREATE POLICY "Agency members view custom values" ON lead_custom_values
    FOR SELECT USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Agency members manage custom values" ON lead_custom_values
    FOR ALL USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()));

-- pipeline_stages
CREATE POLICY "Agency members view stages" ON pipeline_stages
    FOR SELECT USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Admins manage stages" ON pipeline_stages
    FOR ALL USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid())
        AND (SELECT role FROM users WHERE id = auth.uid()) IN ('super_admin','agency_admin'));

-- dashboard_preferences
CREATE POLICY "Users manage own dashboard prefs" ON dashboard_preferences
    FOR ALL USING (user_id = auth.uid());

-- role_permissions
CREATE POLICY "Agency members view permissions" ON role_permissions
    FOR SELECT USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Admins manage permissions" ON role_permissions
    FOR ALL USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid())
        AND (SELECT role FROM users WHERE id = auth.uid()) IN ('super_admin','agency_admin'));

-- notification_preferences
CREATE POLICY "Users manage own notif prefs" ON notification_preferences
    FOR ALL USING (user_id = auth.uid());

-- message_templates
CREATE POLICY "Agency members view templates" ON message_templates
    FOR SELECT USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Agency members manage templates" ON message_templates
    FOR ALL USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()));

-- ── Seed default pipeline stages for new agencies ───────────────
-- (Run manually per agency or via app logic when agency is created)
-- INSERT INTO pipeline_stages (agency_id, name, color, sort_order, is_default) VALUES ...
