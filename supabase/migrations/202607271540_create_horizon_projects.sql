create table public.horizon_projects (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 140),
  description text,
  area text not null default 'Unsorted' check (char_length(trim(area)) between 1 and 80),
  status text not null default 'Idea' check (status in ('Active', 'Paused', 'Idea', 'Closed')),
  priority text check (priority in ('Critical', 'High', 'Normal', 'Low')),
  kind text,
  health text not null default 'Idle' check (health in ('Green', 'Yellow', 'Red', 'Idle')),
  pinned boolean not null default false,
  live_url text,
  repo_url text,
  dash_url text,
  tech text[] not null default '{}',
  metric_label text,
  metric_value text,
  next_action text,
  notes text[] not null default '{}',
  signal smallint not null default 0 check (signal between 0 and 100),
  last_activity timestamptz,
  start_date date,
  due_date date,
  closed_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner, name)
);

create index horizon_projects_owner_status_idx on public.horizon_projects (owner, status);
create index horizon_projects_owner_activity_idx on public.horizon_projects (owner, last_activity desc nulls last);

create function public.set_horizon_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger horizon_projects_set_updated_at
before update on public.horizon_projects
for each row execute function public.set_horizon_updated_at();

alter table public.horizon_projects enable row level security;
revoke all on table public.horizon_projects from anon;
grant select, insert, update, delete on table public.horizon_projects to authenticated;

create policy "horizon owners select their projects" on public.horizon_projects for select to authenticated using ((select auth.uid()) = owner);
create policy "horizon owners insert their projects" on public.horizon_projects for insert to authenticated with check ((select auth.uid()) = owner);
create policy "horizon owners update their projects" on public.horizon_projects for update to authenticated using ((select auth.uid()) = owner) with check ((select auth.uid()) = owner);
create policy "horizon owners delete their projects" on public.horizon_projects for delete to authenticated using ((select auth.uid()) = owner);
