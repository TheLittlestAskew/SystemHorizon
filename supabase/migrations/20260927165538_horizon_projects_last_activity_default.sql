-- last_activity was written by the client on every upsert, so re-running the
-- registry seed stamped all 16 rows with the same instant and destroyed it as a
-- recency signal. A default lets inserts get a timestamp without the client
-- sending one, so an upsert that omits the column leaves existing values alone.
alter table public.horizon_projects alter column last_activity set default now();
