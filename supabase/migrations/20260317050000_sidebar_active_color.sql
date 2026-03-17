-- Add customizable active-menu color for agency sidebar theming
alter table public.agencies
  add column if not exists sidebar_active_color text;
