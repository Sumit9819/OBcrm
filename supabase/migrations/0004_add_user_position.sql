-- Add position/title field to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS position TEXT;

-- Allow admins to update any user in their agency
CREATE POLICY "Admins can update agency users" ON public.users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users AS u
            WHERE u.id = auth.uid()
              AND u.role IN ('super_admin', 'agency_admin')
              AND u.agency_id = users.agency_id
        )
    );
