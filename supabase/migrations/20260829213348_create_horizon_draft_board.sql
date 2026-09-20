create table public.horizon_draft_board (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid(),
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner)
);

alter table public.horizon_draft_board enable row level security;
grant select, insert, update, delete on table public.horizon_draft_board to public;

create policy "horizon owners select their draft board" on public.horizon_draft_board for select to public using ((select auth.uid()) = owner);
create policy "horizon owners insert their draft board" on public.horizon_draft_board for insert to public with check ((select auth.uid()) = owner);
create policy "horizon owners update their draft board" on public.horizon_draft_board for update to public using ((select auth.uid()) = owner) with check ((select auth.uid()) = owner);
create policy "horizon owners delete their draft board" on public.horizon_draft_board for delete to public using ((select auth.uid()) = owner);
