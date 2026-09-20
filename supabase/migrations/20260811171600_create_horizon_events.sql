create table public.horizon_events (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid references public.horizon_projects(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 140),
  event_date date not null,
  start_time text,
  end_time text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index horizon_events_date_idx on public.horizon_events (owner, event_date);
create index horizon_events_project_id_idx on public.horizon_events (project_id);

create trigger horizon_events_set_updated_at
before update on public.horizon_events
for each row execute function public.set_horizon_updated_at();

alter table public.horizon_events enable row level security;
grant select, insert, update, delete on table public.horizon_events to public;

create policy "horizon owners select their events" on public.horizon_events for select to authenticated using ((select auth.uid()) = owner);
create policy "horizon owners insert their events" on public.horizon_events for insert to authenticated with check ((select auth.uid()) = owner);
create policy "horizon owners update their events" on public.horizon_events for update to authenticated using ((select auth.uid()) = owner) with check ((select auth.uid()) = owner);
create policy "horizon owners delete their events" on public.horizon_events for delete to authenticated using ((select auth.uid()) = owner);
