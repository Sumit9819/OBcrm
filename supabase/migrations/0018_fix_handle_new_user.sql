-- ================================================================
-- Migration 0018: Fix handle_new_user trigger to pass agency_id
-- from auth metadata set during signup.
-- ================================================================

-- When a user signs up via supabase.auth.signUp({ options: { data: { agency_id } } })
-- the agency_id is available in new.raw_user_meta_data.
-- This migration updates the trigger to use it, linking the user to their agency
-- at the moment their account is created.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_agency_id uuid;
    v_first_name text;
    v_last_name  text;
BEGIN
    -- Pull agency_id from signup metadata if provided
    v_agency_id  := (new.raw_user_meta_data ->> 'agency_id')::uuid;
    v_first_name := new.raw_user_meta_data ->> 'first_name';
    v_last_name  := new.raw_user_meta_data ->> 'last_name';

    INSERT INTO public.users (id, email, agency_id, first_name, last_name)
    VALUES (
        new.id,
        new.email,
        v_agency_id,   -- NULL if not provided (e.g. super_admin signup)
        v_first_name,
        v_last_name
    );

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The trigger itself already exists from migration 0000, so we only
-- need to replace the function above (the trigger stays intact).
