-- M12 Pulse: the project <-> repo link that did not exist.
--
-- horizon_repo_health is keyed on repo_name and handoff entries on repo, but
-- horizon_projects had no way to name either, so project-scoped Mirrors and
-- project-scoped handoffs had no join at all.
--
-- text[] rather than a single value because a project can own more than one repo
-- (Septentrion / Observatory spans the vault and its scripts).
--
-- NOT reusing the existing repo_url column: it holds a URL, not a repo NAME, and
-- the join key is the name. It is also null on all 16 rows, so nothing is being
-- displaced. Changing its meaning would be worse than adding a column.
--
-- Nullable, so every existing row satisfies it with no backfill and no default.
-- Population happens through the existing Re-sync registry button, which is
-- section 6 GREEN.
--
-- Verified: is_nullable YES, data_type ARRAY.
alter table public.horizon_projects
  add column if not exists repo_names text[];

comment on column public.horizon_projects.repo_names is
  'Repo names this project owns, joining to horizon_repo_health.repo_name and to parsed HANDOFF.md entries. Null or empty means no repo is linked, which is a real state, not an error.';
