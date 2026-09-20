create table public.horizon_repo_health (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id),
  repo_name text not null check (char_length(trim(repo_name)) between 1 and 140),
  local_path text,
  has_local_mirror boolean not null default true,
  uncommitted_count integer,
  ahead_count integer,
  behind_count integer,
  local_head_sha text,
  local_head_at timestamptz,
  remote_head_sha text,
  last_handoff_at timestamptz,
  check_error text,
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner, repo_name)
);

create trigger set_horizon_repo_health_updated_at
before update on public.horizon_repo_health
for each row execute function public.set_horizon_updated_at();

alter table public.horizon_repo_health enable row level security;
grant select, insert, update, delete on table public.horizon_repo_health to public;

create policy "horizon owners select their repo health" on public.horizon_repo_health for select to public using ((select auth.uid()) = owner);
create policy "horizon owners insert their repo health" on public.horizon_repo_health for insert to public with check ((select auth.uid()) = owner);
create policy "horizon owners update their repo health" on public.horizon_repo_health for update to public using ((select auth.uid()) = owner) with check ((select auth.uid()) = owner);
create policy "horizon owners delete their repo health" on public.horizon_repo_health for delete to public using ((select auth.uid()) = owner);
