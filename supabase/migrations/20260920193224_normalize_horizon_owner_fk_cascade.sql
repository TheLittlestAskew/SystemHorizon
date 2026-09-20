alter table public.horizon_swift_watch
  add constraint horizon_swift_watch_owner_fkey foreign key (owner) references auth.users(id) on delete cascade;

alter table public.horizon_swift_collection
  add constraint horizon_swift_collection_owner_fkey foreign key (owner) references auth.users(id) on delete cascade;

alter table public.horizon_swift_events
  add constraint horizon_swift_events_owner_fkey foreign key (owner) references auth.users(id) on delete cascade;

alter table public.horizon_draft_board
  add constraint horizon_draft_board_owner_fkey foreign key (owner) references auth.users(id) on delete cascade;

alter table public.horizon_repo_health
  drop constraint horizon_repo_health_owner_fkey;
alter table public.horizon_repo_health
  add constraint horizon_repo_health_owner_fkey foreign key (owner) references auth.users(id) on delete cascade;

alter table public.horizon_travel_watch
  drop constraint horizon_travel_watch_owner_fkey;
alter table public.horizon_travel_watch
  add constraint horizon_travel_watch_owner_fkey foreign key (owner) references auth.users(id) on delete cascade;
