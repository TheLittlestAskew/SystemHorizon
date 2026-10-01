-- M9: handoff-aware task fields. SH may label a task as a handoff candidate; only
-- a real implementation session promotes it, so 'promoted' exists as a value the
-- app reads but never writes (NORTH_STAR section 2 and section 5).
--
-- Additive and non-destructive: a new column with a default leaves no nulls, and
-- the CHECK is satisfied by every row the default creates. The ARRAY form matches
-- horizon_tasks_status_check rather than introducing a second idiom.
--
-- Verified after applying (NORTH_STAR section 9 item 5, and M9 criterion 3):
--   select count(*) from public.horizon_tasks
--    where promotion_state is null
--       or promotion_state not in ('none','candidate','promoted');
--   -> 0, with all 4 existing rows defaulted to 'none'.
alter table public.horizon_tasks
  add column if not exists promotion_state text not null default 'none';

alter table public.horizon_tasks
  drop constraint if exists horizon_tasks_promotion_state_check;

alter table public.horizon_tasks
  add constraint horizon_tasks_promotion_state_check
  check (promotion_state = any (array['none'::text, 'candidate'::text, 'promoted'::text]));

-- Candidates are looked up as a small subset of a small table, scoped to the owner
-- like every other horizon_ index. Partial, because 'none' is the overwhelming
-- majority and never queried for.
create index if not exists horizon_tasks_owner_promotion_state_idx
  on public.horizon_tasks (owner, promotion_state)
  where promotion_state <> 'none';
