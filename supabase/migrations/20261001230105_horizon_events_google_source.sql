-- M8: Google Calendar one-way sync. Marks where an event came from and carries
-- Google's own id so a re-sync updates rather than duplicates.
--
-- Additive and non-destructive. `source` defaults to 'sh', so every one of the 4
-- existing rows satisfies the CHECK the moment the column appears. Pre-flight
-- confirmed 0 violations and that neither column already existed.
--
-- Verified after applying (NORTH_STAR section 9 item 5):
--   violations 0; sh_rows 4; external_id nullable;
--   CHECK ((source = ANY (ARRAY['sh','google'])));
--   partial unique index on (owner, external_id) WHERE source = 'google'.
alter table public.horizon_events
  add column if not exists source text not null default 'sh',
  add column if not exists external_id text;

alter table public.horizon_events
  drop constraint if exists horizon_events_source_check;

alter table public.horizon_events
  add constraint horizon_events_source_check
  check (source = any (array['sh'::text, 'google'::text]));

comment on column public.horizon_events.source is
  'Where the event came from. ''sh'' = created in System Horizon (authoritative, editable). ''google'' = pulled read-only from Google Calendar by M8; never written back to Google.';
comment on column public.horizon_events.external_id is
  'Google''s event id, for sh=NULL. The dedupe key for re-syncing.';

-- PARTIAL unique index, deliberately. A plain unique(owner, source, external_id)
-- would technically work because Postgres treats NULLs as distinct, but it would
-- rely on that subtlety to let many sh rows coexist. Scoping the index to Google
-- rows says what is actually meant: one row per Google event per owner.
create unique index if not exists horizon_events_owner_external_id_google_key
  on public.horizon_events (owner, external_id)
  where source = 'google';

-- Cancelled Google events are removed on the next sync, which means deleting by
-- source; this keeps that lookup owner-scoped like every other horizon_ index.
create index if not exists horizon_events_owner_source_idx
  on public.horizon_events (owner, source)
  where source <> 'sh';
