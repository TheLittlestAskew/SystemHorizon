create table public.horizon_swift_watch (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid(),
  watch_name text not null,
  url text,
  interval_minutes integer,
  last_checked_at timestamptz,
  last_changed_at timestamptz,
  change_count integer default 0,
  status text default 'ok',
  last_error text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner, watch_name)
);

create table public.horizon_swift_collection (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid(),
  item_name text not null,
  category text,
  era text,
  variant text,
  status text not null default 'wishlist',
  priority integer default 3,
  price_cents integer,
  currency text default 'USD',
  quantity integer default 1,
  url text,
  image_url text,
  acquired_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_swift_collection_owner_status on public.horizon_swift_collection (owner, status);

create table public.horizon_swift_events (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid(),
  title text not null,
  event_date date,
  kind text,
  era text,
  recurring boolean not null default false,
  significance integer default 3,
  predicted boolean not null default false,
  confidence integer,
  source text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_swift_events_owner_date on public.horizon_swift_events (owner, event_date);

create trigger set_horizon_swift_watch_updated_at
before update on public.horizon_swift_watch
for each row execute function public.set_horizon_updated_at();

create trigger set_horizon_swift_collection_updated_at
before update on public.horizon_swift_collection
for each row execute function public.set_horizon_updated_at();

create trigger set_horizon_swift_events_updated_at
before update on public.horizon_swift_events
for each row execute function public.set_horizon_updated_at();

alter table public.horizon_swift_watch enable row level security;
alter table public.horizon_swift_collection enable row level security;
alter table public.horizon_swift_events enable row level security;

grant select, insert, update, delete on table public.horizon_swift_watch to public;
grant select, insert, update, delete on table public.horizon_swift_collection to public;
grant select, insert, update, delete on table public.horizon_swift_events to public;

create policy "horizon owners select their swift watch" on public.horizon_swift_watch for select to public using ((select auth.uid()) = owner);
create policy "horizon owners insert their swift watch" on public.horizon_swift_watch for insert to public with check ((select auth.uid()) = owner);
create policy "horizon owners update their swift watch" on public.horizon_swift_watch for update to public using ((select auth.uid()) = owner) with check ((select auth.uid()) = owner);
create policy "horizon owners delete their swift watch" on public.horizon_swift_watch for delete to public using ((select auth.uid()) = owner);

create policy "horizon owners select their swift collection" on public.horizon_swift_collection for select to public using ((select auth.uid()) = owner);
create policy "horizon owners insert their swift collection" on public.horizon_swift_collection for insert to public with check ((select auth.uid()) = owner);
create policy "horizon owners update their swift collection" on public.horizon_swift_collection for update to public using ((select auth.uid()) = owner) with check ((select auth.uid()) = owner);
create policy "horizon owners delete their swift collection" on public.horizon_swift_collection for delete to public using ((select auth.uid()) = owner);

create policy "horizon owners select their swift events" on public.horizon_swift_events for select to public using ((select auth.uid()) = owner);
create policy "horizon owners insert their swift events" on public.horizon_swift_events for insert to public with check ((select auth.uid()) = owner);
create policy "horizon owners update their swift events" on public.horizon_swift_events for update to public using ((select auth.uid()) = owner) with check ((select auth.uid()) = owner);
create policy "horizon owners delete their swift events" on public.horizon_swift_events for delete to public using ((select auth.uid()) = owner);
