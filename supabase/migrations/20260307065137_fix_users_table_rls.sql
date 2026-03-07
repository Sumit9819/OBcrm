-- Drop the recursive policy from 20260307063638_fix_performance_and_security.sql
DROP POLICY IF EXISTS "Users view same agency" ON public.users;

-- Recreate policy using security definer function to avoid infinite recursion
CREATE POLICY "Users view same agency" ON public.users FOR SELECT USING (
    id = auth.uid() OR agency_id = get_my_agency_id()
);
