create table public.horizon_tasks (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid references public.horizon_projects(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 200),
  notes text,
  status text not null default 'Active' check (status in ('Active', 'Waiting', 'Parked', 'Done')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index horizon_tasks_owner_status_idx on public.horizon_tasks (owner, status);
create index horizon_tasks_project_id_idx on public.horizon_tasks (project_id);

create trigger horizon_tasks_set_updated_at
before update on public.horizon_tasks
for each row execute function public.set_horizon_updated_at();

alter table public.horizon_tasks enable row level security;
grant select, insert, update, delete on table public.horizon_tasks to public;

create policy "horizon owners select their tasks" on public.horizon_tasks for select to authenticated using ((select auth.uid()) = owner);
create policy "horizon owners insert their tasks" on public.horizon_tasks for insert to authenticated with check ((select auth.uid()) = owner);
create policy "horizon owners update their tasks" on public.horizon_tasks for update to authenticated using ((select auth.uid()) = owner) with check ((select auth.uid()) = owner);
create policy "horizon owners delete their tasks" on public.horizon_tasks for delete to authenticated using ((select auth.uid()) = owner);
