-- M12 Pulse: the activity log behind the stream.
--
-- Why it exists: horizon_tasks.updated_at is ONE timestamp, not a history, so
-- without this table the stream would be ~85% "what Claude banked" and ~15%
-- "what Taylor did". The table makes the stream genuinely hers over time.
--
-- APPEND-ONLY. All four policies exist because NORTH_STAR section 4 requires a
-- policy per command, but the app never updates or deletes a row here. That
-- guarantee is held the way M9 holds "SH never writes promoted": by a test on
-- the pure module plus a grep over src/, not by omitting a policy.
--
-- No updated_at and no trigger: section 4 scopes the trigger rule to tables that
-- carry the column, and an append-only log has nothing to re-stamp.
--
-- Verified after applying, by REJECTION rather than by reading this file:
--   * all 11 legal kinds accepted;
--   * kind 'banked' rejected with SQLSTATE 23514;
--   * criterion 1 query (count where kind <> all (array[...])) returns 0;
--   * 4 policies (SELECT/INSERT/UPDATE/DELETE), role `authenticated` only;
--   * anon grants NONE, RLS enabled, probe rows deleted, table back to 0 rows.
create table if not exists public.horizon_activity (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  kind        text not null,
  -- on delete set null, not cascade: deleting a project must not erase the
  -- record that work happened on it.
  project_id  uuid references public.horizon_projects(id) on delete set null,
  -- Deliberately NO foreign key. A task_deleted entry has to outlive the task it
  -- names; an FK would either block the log write or cascade the history away.
  subject_id  uuid,
  summary     text not null
);

alter table public.horizon_activity
  drop constraint if exists horizon_activity_kind_check;

-- The = any (array[...]) idiom matches horizon_tasks_status_check and M9's
-- promotion_state check rather than introducing a second style.
alter table public.horizon_activity
  add constraint horizon_activity_kind_check
  check (kind = any (array[
    'task_created'::text, 'task_completed'::text, 'task_status'::text,
    'task_linked'::text, 'task_flagged'::text, 'task_deleted'::text,
    'project_added'::text, 'event_added'::text, 'capture_added'::text,
    'registry_resynced'::text, 'calendar_synced'::text
  ]));

-- Ordering newest-first within one owner is the only query shape this table has.
create index if not exists horizon_activity_owner_occurred_idx
  on public.horizon_activity (owner, occurred_at desc);

alter table public.horizon_activity enable row level security;

drop policy if exists "horizon owners select their activity" on public.horizon_activity;
drop policy if exists "horizon owners insert their activity" on public.horizon_activity;
drop policy if exists "horizon owners update their activity" on public.horizon_activity;
drop policy if exists "horizon owners delete their activity" on public.horizon_activity;

create policy "horizon owners select their activity" on public.horizon_activity
  for select to authenticated using (owner = auth.uid());
create policy "horizon owners insert their activity" on public.horizon_activity
  for insert to authenticated with check (owner = auth.uid());
create policy "horizon owners update their activity" on public.horizon_activity
  for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
create policy "horizon owners delete their activity" on public.horizon_activity
  for delete to authenticated using (owner = auth.uid());

revoke all on public.horizon_activity from anon;
grant select, insert, update, delete on public.horizon_activity to authenticated;
