create table public.horizon_applications (
  id uuid primary key default gen_random_uuid(), owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company text not null, role text not null, status text not null default 'Discovered' check (status in ('Discovered', 'Applied', 'Interview', 'Offer', 'Rejected', 'Archived')),
  score smallint check (score between 0 and 100), source_url text, next_action text, notes text,
  discovered_at date not null default current_date, applied_at date, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.horizon_work_search_contacts (
  id uuid primary key default gen_random_uuid(), owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  contact_date date not null default current_date, contact_type text not null check (contact_type in ('Application', 'Employer contact', 'Networking', 'Interview', 'Follow-up')),
  organization text not null, notes text, created_at timestamptz not null default now()
);
create trigger horizon_applications_set_updated_at before update on public.horizon_applications for each row execute function public.set_horizon_updated_at();
alter table public.horizon_applications enable row level security;
alter table public.horizon_work_search_contacts enable row level security;
revoke all on public.horizon_applications, public.horizon_work_search_contacts from anon;
grant select, insert, update, delete on public.horizon_applications, public.horizon_work_search_contacts to authenticated;
create policy "horizon owners select their applications" on public.horizon_applications for select to authenticated using ((select auth.uid()) = owner);
create policy "horizon owners insert their applications" on public.horizon_applications for insert to authenticated with check ((select auth.uid()) = owner);
create policy "horizon owners update their applications" on public.horizon_applications for update to authenticated using ((select auth.uid()) = owner) with check ((select auth.uid()) = owner);
create policy "horizon owners delete their applications" on public.horizon_applications for delete to authenticated using ((select auth.uid()) = owner);
create policy "horizon owners select their work-search contacts" on public.horizon_work_search_contacts for select to authenticated using ((select auth.uid()) = owner);
create policy "horizon owners insert their work-search contacts" on public.horizon_work_search_contacts for insert to authenticated with check ((select auth.uid()) = owner);
create policy "horizon owners update their work-search contacts" on public.horizon_work_search_contacts for update to authenticated using ((select auth.uid()) = owner) with check ((select auth.uid()) = owner);
create policy "horizon owners delete their work-search contacts" on public.horizon_work_search_contacts for delete to authenticated using ((select auth.uid()) = owner);
