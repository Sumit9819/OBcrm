-- ==============================================================================
-- Migration 0003: Fix RLS Recursion and Initialize Admin
-- ==============================================================================

-- 1. Drop the problematic recursive policy
DROP POLICY IF EXISTS "Agency Admins can view agency users" ON public.users;

-- 2. Re-implement without recursion using auth.jwt() metadata or a simplified check
-- We check if the current user's role is in a set of admin roles, but we fetch the role 
-- from the JWT instead of querying the table recursively.
-- NOTE: For this to work, we'd need to sync the role to auth.users metadata.
-- For now, we use a simpler approach: check if the user is in the same agency.
CREATE POLICY "Users can view colleagues in their agency" ON public.users
    FOR SELECT USING (
        agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid())
    );

-- Wait, the above is STILL recursive.
-- The standard way to fix this in Supabase is to use a security definer function.

CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_auth_user_agency()
RETURNS uuid AS $$
  SELECT agency_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

DROP POLICY IF EXISTS "Users can view colleagues in their agency" ON public.users;

CREATE POLICY "Admins can view all agency users" ON public.users
    FOR SELECT USING (
        get_auth_user_agency() = agency_id 
        AND get_auth_user_role() IN ('super_admin', 'agency_admin')
    );

-- 3. Promote any first user to super_admin (Bootstrap)
-- This ensures that the user who signs up first on a fresh install gets access.
UPDATE public.users 
SET role = 'super_admin'
WHERE id IN (SELECT id FROM public.users ORDER BY created_at ASC LIMIT 1)
AND role = 'student'; -- Only promote if they are still a student
