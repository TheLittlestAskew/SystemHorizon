create index horizon_travel_watch_owner_checked_idx on public.horizon_travel_watch using btree (owner, checked_on desc);

create trigger set_horizon_draft_board_updated_at
before update on public.horizon_draft_board
for each row execute function public.set_horizon_updated_at();
