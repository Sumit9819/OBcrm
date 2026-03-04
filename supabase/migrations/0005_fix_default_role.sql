-- Fix 1: Update the signup trigger to default new users to 'agent' role (not 'student')
-- Students will be invited/assigned their role by admins
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INT;
BEGIN
  -- Count existing users
  SELECT COUNT(*) INTO user_count FROM public.users;

  IF user_count = 0 THEN
    -- First user ever → Super Admin
    INSERT INTO public.users (id, email, role)
    VALUES (new.id, new.email, 'super_admin');
  ELSE
    -- All subsequent signups default to 'agent'
    INSERT INTO public.users (id, email, role)
    VALUES (new.id, new.email, 'agent');
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 2: Fix any existing users stuck on 'student' role who should be 'super_admin'
-- Promote the very first user (by created_at) to super_admin if they are still student
UPDATE public.users
SET role = 'super_admin'
WHERE id = (SELECT id FROM public.users ORDER BY created_at ASC LIMIT 1)
  AND role = 'student';
