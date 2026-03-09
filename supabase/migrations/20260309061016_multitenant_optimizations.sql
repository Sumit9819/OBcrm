-- Multi-tenant optimization migration
-- 1. Create composite indices for fast multi-tenant querying
CREATE INDEX IF NOT EXISTS idx_leads_agency_id ON leads(agency_id);
CREATE INDEX IF NOT EXISTS idx_users_agency_id ON users(agency_id);
CREATE INDEX IF NOT EXISTS idx_tasks_agency_id ON tasks(agency_id);
CREATE INDEX IF NOT EXISTS idx_activities_agency_id ON activities(agency_id);
CREATE INDEX IF NOT EXISTS idx_invoices_agency_id ON invoices(agency_id);
CREATE INDEX IF NOT EXISTS idx_documents_agency_id ON documents(agency_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_agency_id ON calendar_events(agency_id);

-- 2. Scoped uniqueness
-- We cannot simply enforce UNIQUE(email) globally anymore because multiple agencies might have a lead with the same email.
-- Since the current schema.sql defines email as UNIQUE, we need to alter it to be composite.

-- Drop existing unique constraints that are too broad
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_email_key;
ALTER TABLE pipelines DROP CONSTRAINT IF EXISTS pipelines_name_key;

-- Add composite unique constraints
-- Need to handle duplicates before applying this, using ON CONFLICT DO NOTHING or dealing with existing issues.
-- Note: Assuming development environment. If duplicate emails exist without agency distinction, this constraint creation might fail.
ALTER TABLE leads ADD CONSTRAINT leads_agency_email_key UNIQUE (agency_id, email);
ALTER TABLE pipelines ADD CONSTRAINT pipelines_agency_name_key UNIQUE (agency_id, name);

-- 3. Composite indexing for combined lookups
CREATE INDEX IF NOT EXISTS idx_leads_agency_status ON leads(agency_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_agency_status ON tasks(agency_id, status);

-- 4. Storage Security Policies for multitenancy
-- Ensure bucket exists (handled by previous migrations, but safe checking policies)
-- The RLS policies on storage.objects should ideally verify the user's agency_id matches the first folder of the path.
-- This requires checking row-level security on storage, but doing it safely without recursion.

CREATE OR REPLACE FUNCTION public.get_user_agency()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT agency_id FROM public.users WHERE id = auth.uid();
$$;

-- Note: In Supabase, the path format for storage is 'folder/filename.ext'. 
-- We enforce that the root folder matches the user's agency_id in storage policies.

-- We don't strictly drop and create storage policies right here because the user might have custom setups,
-- but a basic check we can enforce if we take over storage objects:
-- Example (commented out unless strictly requested to override storage entirely):
-- CREATE POLICY "Agency scoped access" ON storage.objects FOR SELECT USING ( (storage.foldername(name))[1] = public.get_user_agency()::text );
