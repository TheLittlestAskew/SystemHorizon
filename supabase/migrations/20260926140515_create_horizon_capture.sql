create table public.horizon_capture (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  routed_kind text check (routed_kind in ('task', 'event', 'project_note', 'dismissed')),
  routed_id uuid,
  routed_at timestamptz,
  -- A capture is either unrouted or fully routed; never half-routed.
  constraint horizon_capture_routed_together check ((routed_kind is null) = (routed_at is null))
);

create index horizon_capture_owner_created_idx on public.horizon_capture (owner, created_at desc);

alter table public.horizon_capture enable row level security;
grant select, insert, update, delete on table public.horizon_capture to authenticated;
revoke all on table public.horizon_capture from anon;

create policy "horizon owners select their captures" on public.horizon_capture for select to authenticated using ((select auth.uid()) = owner);
create policy "horizon owners insert their captures" on public.horizon_capture for insert to authenticated with check ((select auth.uid()) = owner);
create policy "horizon owners update their captures" on public.horizon_capture for update to authenticated using ((select auth.uid()) = owner) with check ((select auth.uid()) = owner);
create policy "horizon owners delete their captures" on public.horizon_capture for delete to authenticated using ((select auth.uid()) = owner);
