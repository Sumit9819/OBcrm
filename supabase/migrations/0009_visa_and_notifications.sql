-- Phase 8: Visa checklist tracking
CREATE TABLE IF NOT EXISTS visa_checklists (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    gte_letter boolean DEFAULT false,
    health_exam boolean DEFAULT false,
    biometrics boolean DEFAULT false,
    police_clearance boolean DEFAULT false,
    interview_done boolean DEFAULT false,
    visa_lodged boolean DEFAULT false,
    visa_granted boolean DEFAULT false,
    notes text,
    updated_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    UNIQUE(lead_id)
);

ALTER TABLE visa_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members view visa checklists" ON visa_checklists
    FOR SELECT USING (
        agency_id IN (SELECT agency_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Agency staff manage visa checklists" ON visa_checklists
    FOR ALL USING (
        agency_id IN (
            SELECT agency_id FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'agency_admin', 'agent')
        )
    );

-- Phase 10: Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    title text NOT NULL,
    message text,
    type text DEFAULT 'info',
    read boolean DEFAULT false,
    link text,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());
