/**
 * GrowthCRM Initial Setup Instructions
 * -------------------------------------
 * 1. Go to http://localhost:3000/login
 * 2. Click "Sign up" and create an account with your email.
 * 3. Once signed up, you'll be logged in as a "Student" (default).
 * 4. Run the SQL fragment below in your Supabase Dashboard SQL Editor 
 *    (https://supabase.com/dashboard/project/rvcowvxjvrljkfjdthtj/sql/new)
 *    to promote yourself to Super Admin.
 *
 * --- SQL FRAGMENT ---
 * 
 * -- 1. Create a Default Agency
 * INSERT INTO public.agencies (id, company_name, branding_primary_color)
 * VALUES (gen_random_uuid(), 'GrowthCRM Elite Agency', '#0ea5e9')
 * ON CONFLICT DO NOTHING;
 * 
 * -- 2. Link your user to the Agency and set as Super Admin
 * UPDATE public.users 
 * SET 
 *   role = 'super_admin',
 *   agency_id = (SELECT id FROM public.agencies LIMIT 1)
 * WHERE email = 'REPLACE_WITH_YOUR_EMAIL';
 * 
 * -------------------------------------
 */
