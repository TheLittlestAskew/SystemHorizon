-- Q2 / M8 prep. horizon_events.start_time and end_time are free-form text
-- ("12:30pm", "10:AM"), but Google Calendar returns RFC 3339. This adds typed
-- columns ALONGSIDE the text ones rather than converting them, which is option A
-- of Q2: additive, reversible, and it cannot lose a value that fails to parse.
-- The text columns stay authoritative for SH-native events until Taylor says
-- otherwise. Nothing is dropped or renamed here.
--
-- Verified after applying (NORTH_STAR section 9 item 5):
--   2 nullable timestamptz columns present; 0 rows timed-but-unparsed;
--   2 text times preserved; helper function dropped (0 left behind).
--   '12:30pm' -> 2026-09-29 16:30+00, reads back as 12:30:00 Eastern.
--   '10:AM'   -> 2026-10-01 14:00+00, reads back as 10:00:00 Eastern.
alter table public.horizon_events
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz;

comment on column public.horizon_events.starts_at is
  'Typed start. Backfilled from start_time interpreted as America/New_York wall-clock. Null means the text did not parse. Google-sourced events (M8) write this directly from RFC 3339.';
comment on column public.horizon_events.ends_at is
  'Typed end. See starts_at.';

-- 🛑 The timezone is the whole risk here. The server runs in UTC, so a naive
-- (date || ' ' || time)::timestamptz reads "12:30pm" as 12:30 UTC, which is
-- 8:30am Eastern -- every hand-typed event silently shifted by 4-5 hours.
-- Interpreting it AT TIME ZONE 'America/New_York' is what makes it mean what
-- Taylor typed. Proven before writing this: the naive cast produced 12:30+00,
-- the zoned one produced 16:30+00.
create or replace function public.horizon_tmp_local_ts(d date, t text)
returns timestamptz language plpgsql immutable as $fn$
begin
  if d is null or t is null or btrim(t) = '' then return null; end if;
  return (d::text || ' ' || btrim(t))::timestamp at time zone 'America/New_York';
exception when others then
  -- Unparseable text stays NULL rather than guessing. The text column keeps the
  -- original either way, so nothing is lost and the gap is visible.
  return null;
end $fn$;

update public.horizon_events
   set starts_at = public.horizon_tmp_local_ts(event_date, start_time)
 where starts_at is null and start_time is not null and btrim(start_time) <> '';

update public.horizon_events
   set ends_at = public.horizon_tmp_local_ts(event_date, end_time)
 where ends_at is null and end_time is not null and btrim(end_time) <> '';

-- Self-contained: the helper existed only for the backfill.
drop function public.horizon_tmp_local_ts(date, text);
