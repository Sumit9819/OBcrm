-- Phase 4: Batches / Classes feature
CREATE TABLE IF NOT EXISTS batches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    name text NOT NULL,
    type text NOT NULL DEFAULT 'General',
    start_date date,
    end_date date,
    max_students integer DEFAULT 30,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS batch_enrollments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    enrolled_at timestamptz DEFAULT now(),
    UNIQUE(batch_id, lead_id)
);

ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_enrollments ENABLE ROW LEVEL SECURITY;

-- Agency members can view batches
CREATE POLICY "Agency members view batches" ON batches
    FOR SELECT USING (
        agency_id IN (SELECT agency_id FROM users WHERE id = auth.uid())
    );

-- Admins can manage batches
CREATE POLICY "Admins manage batches" ON batches
    FOR ALL USING (
        agency_id IN (
            SELECT agency_id FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'agency_admin')
        )
    );

-- Agency members can view enrollments
CREATE POLICY "Agency members view enrollments" ON batch_enrollments
    FOR SELECT USING (
        batch_id IN (
            SELECT id FROM batches WHERE agency_id IN (
                SELECT agency_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- Admins can manage enrollments
CREATE POLICY "Admins manage enrollments" ON batch_enrollments
    FOR ALL USING (
        batch_id IN (
            SELECT id FROM batches WHERE agency_id IN (
                SELECT agency_id FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'agency_admin')
            )
        )
    );
