-- Capacity was useState('Steady') in App.jsx: it reset on every reload and
-- nothing persisted it. Persisting it naively would be worse than the bug,
-- because a capacity with no timestamp reads as current forever -- the same
-- shape as the hardcoded "232 days left" defect. So the value and its own
-- clock are added together and the pairing is enforced here, not by convention.
--
-- capacity_set_at is deliberately NOT horizon_now.set_at: that column means
-- "when I chose my next true thing" and nowToRow() restamps it on every Now
-- change. Two different clocks need two different columns.

alter table public.horizon_now
  add column capacity text,
  add column capacity_set_at timestamptz;

-- Closed set, matching the = any (array[...]) idiom the other horizon_ tables
-- use (NORTH_STAR section 4). NULL passes, which is what an unset capacity is.
alter table public.horizon_now
  add constraint horizon_now_capacity_check
  check (capacity is null or capacity = any (array['Light', 'Steady', 'High focus']));

-- The guarantee that makes the staleness rule trustworthy: a capacity can never
-- exist without the timestamp that lets the UI age it. Mirrors the
-- routed_together CHECK on horizon_capture.
alter table public.horizon_now
  add constraint horizon_now_capacity_together
  check ((capacity is null) = (capacity_set_at is null));
