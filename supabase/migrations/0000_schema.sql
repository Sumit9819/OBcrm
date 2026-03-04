-- Enums
CREATE TYPE user_role AS ENUM ('super_admin', 'agency_admin', 'agent', 'student');
CREATE TYPE lead_status AS ENUM ('New', 'Contacted', 'Application', 'Offer', 'Visa', 'Enrolled');
CREATE TYPE app_status AS ENUM ('Draft', 'Lodged', 'Conditional Offer', 'Unconditional Offer', 'Rejected');
CREATE TYPE activity_type AS ENUM ('note', 'call', 'stage_change', 'email');

-- Agencies
CREATE TABLE agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  custom_domain text,
  branding_primary_color text DEFAULT '#000000',
  logo_url text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;

-- Users
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
  email text NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  first_name text,
  last_name text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Leads
CREATE TABLE leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_shared_with_company boolean DEFAULT false,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  destination_country text,
  course_interest text,
  status lead_status DEFAULT 'New',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Applications
CREATE TABLE applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  university_name text,
  course_name text,
  intake_season text,
  status app_status DEFAULT 'Draft',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Activities
CREATE TABLE activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type activity_type NOT NULL,
  description text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Messages
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Set up Realtime
alter publication supabase_realtime add table messages, leads, activities;

-- Storage buckets
insert into storage.buckets (id, name, public) values ('documents', 'documents', false) on conflict do nothing;

-- RLS Policies

-- Users Policy
create policy "Users can view own profile" on users for select using (auth.uid() = id);
create policy "Agency Admins can view agency users" on users for select using (
  exists (
    select 1 from users as u where u.id = auth.uid() and u.role in ('super_admin', 'agency_admin') and u.agency_id = users.agency_id
  )
);

-- Agencies Policy
create policy "Users can view their agency" on agencies for select using (
  id = (select agency_id from users where users.id = auth.uid())
);

-- Leads Policy (The Privacy Sandbox)
create policy "Agents view/edit own leads" on leads for all using (
  owner_id = auth.uid()
);
create policy "Admins view agency shared leads" on leads for select using (
  exists (
    select 1 from users 
    where users.id = auth.uid() 
      and users.role in ('super_admin', 'agency_admin') 
      and users.agency_id = leads.agency_id
  ) and (is_shared_with_company = true or owner_id = auth.uid())
);

-- Applications, Activities, Messages Policies
create policy "Visibility mirrors lead" on applications for all using (
  exists (select 1 from leads where leads.id = applications.lead_id)
);
create policy "Visibility mirrors lead activities" on activities for all using (
  exists (select 1 from leads where leads.id = activities.lead_id)
);
create policy "Message sender receiver" on messages for all using (
  auth.uid() = sender_id or auth.uid() = receiver_id
);

-- Storage Policy
create policy "Users can upload documents" on storage.objects for insert with check ( bucket_id = 'documents' );
create policy "Users can read agency documents" on storage.objects for select using ( bucket_id = 'documents' ); 

-- Trigger for new user signup (Supabase Auth -> users table)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
