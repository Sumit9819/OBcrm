-- Migration: 0022_academics_and_courses.sql
-- Description: Adds tables for Universities, Courses, and Lead Qualifications to support Course Matching. Also adds new fields to `leads` for automated processing.

-- 1. Expand `leads` table with academic metrics for easier querying and matching
ALTER TABLE leads 
  ADD COLUMN IF NOT EXISTS marital_status TEXT,
  ADD COLUMN IF NOT EXISTS guardian_name TEXT,
  ADD COLUMN IF NOT EXISTS guardian_contact TEXT,
  ADD COLUMN IF NOT EXISTS calculated_gpa NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS english_test_type TEXT, -- e.g., 'IELTS', 'PTE', 'TOEFL'
  ADD COLUMN IF NOT EXISTS english_test_score TEXT;

-- 2. Create Lead Qualifications Table (Academics Tab)
CREATE TABLE IF NOT EXISTS lead_qualifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    country TEXT,
    institution_name TEXT NOT NULL,
    degree_title TEXT NOT NULL,
    course TEXT,
    passed_year INTEGER,
    grade_type TEXT, -- e.g. 'Percentage', 'GPA'
    grade_value NUMERIC(6,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and add basic agency-isolation policies
ALTER TABLE lead_qualifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view qualifications in their agency" ON lead_qualifications
    FOR SELECT USING (agency_id IN (
        SELECT agency_id FROM users WHERE users.id = auth.uid()
    ));

CREATE POLICY "Users can insert qualifications in their agency" ON lead_qualifications
    FOR INSERT WITH CHECK (agency_id IN (
        SELECT agency_id FROM users WHERE users.id = auth.uid()
    ));

CREATE POLICY "Users can update qualifications in their agency" ON lead_qualifications
    FOR UPDATE USING (agency_id IN (
        SELECT agency_id FROM users WHERE users.id = auth.uid()
    ));

CREATE POLICY "Users can delete qualifications in their agency" ON lead_qualifications
    FOR DELETE USING (agency_id IN (
        SELECT agency_id FROM users WHERE users.id = auth.uid()
    ));


-- 3. Create Universities Table (For Course Matcher)
CREATE TABLE IF NOT EXISTS universities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    location TEXT,
    website TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE universities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view universities in their agency" ON universities
    FOR SELECT USING (agency_id IN (SELECT agency_id FROM users WHERE users.id = auth.uid()));
CREATE POLICY "Users can manage universities in their agency" ON universities
    FOR ALL USING (agency_id IN (SELECT agency_id FROM users WHERE users.id = auth.uid()));


-- 4. Create Courses Table (For Course Matcher)
CREATE TABLE IF NOT EXISTS university_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    level TEXT, -- e.g. 'Bachelor', 'Master', 'Diploma'
    intake_months TEXT[], -- array of months, e.g. ['Jan', 'Sep']
    tuition_fee NUMERIC(12,2),
    currency TEXT DEFAULT 'USD',
    -- Eligibility Rules (Crucial for the Course Matcher)
    min_gpa_required NUMERIC(4,2),
    min_ielts_required NUMERIC(3,1),
    min_pte_required INTEGER,
    min_toefl_required INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE university_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view courses in their agency" ON university_courses
    FOR SELECT USING (agency_id IN (SELECT agency_id FROM users WHERE users.id = auth.uid()));
CREATE POLICY "Users can manage courses in their agency" ON university_courses
    FOR ALL USING (agency_id IN (SELECT agency_id FROM users WHERE users.id = auth.uid()));


-- Update trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_lead_qualifications_modtime
    BEFORE UPDATE ON lead_qualifications
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_universities_modtime
    BEFORE UPDATE ON universities
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_university_courses_modtime
    BEFORE UPDATE ON university_courses
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
