create table public.horizon_travel_watch (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id),
  trip_name text not null,
  route text,
  depart_date date,
  return_date date,
  price_cents integer not null,
  currency text not null default 'USD',
  checked_on date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.horizon_travel_watch enable row level security;
grant select, insert, update, delete on table public.horizon_travel_watch to public;

create policy "horizon owners select their travel watch" on public.horizon_travel_watch for select to public using ((select auth.uid()) = owner);
create policy "horizon owners insert their travel watch" on public.horizon_travel_watch for insert to public with check ((select auth.uid()) = owner);
create policy "horizon owners update their travel watch" on public.horizon_travel_watch for update to public using ((select auth.uid()) = owner) with check ((select auth.uid()) = owner);
create policy "horizon owners delete their travel watch" on public.horizon_travel_watch for delete to public using ((select auth.uid()) = owner);
