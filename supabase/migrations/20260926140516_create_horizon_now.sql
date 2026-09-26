-- One Now per owner, enforced by the primary key itself, so setting Now is a
-- single atomic upsert on (owner) rather than a clear-then-set pair.
-- The owner primary key doubles as the required owner-scoped index.
create table public.horizon_now (
  owner uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  task_id uuid references public.horizon_tasks(id) on delete set null,
  note text,
  set_at timestamptz not null default now()
);

alter table public.horizon_now enable row level security;
grant select, insert, update, delete on table public.horizon_now to authenticated;
revoke all on table public.horizon_now from anon;

create policy "horizon owners select their now" on public.horizon_now for select to authenticated using ((select auth.uid()) = owner);
create policy "horizon owners insert their now" on public.horizon_now for insert to authenticated with check ((select auth.uid()) = owner);
create policy "horizon owners update their now" on public.horizon_now for update to authenticated using ((select auth.uid()) = owner) with check ((select auth.uid()) = owner);
create policy "horizon owners delete their now" on public.horizon_now for delete to authenticated using ((select auth.uid()) = owner);
