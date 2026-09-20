alter table public.horizon_travel_watch
  add column source text not null default 'manual' check (source in ('manual', 'auto'));
