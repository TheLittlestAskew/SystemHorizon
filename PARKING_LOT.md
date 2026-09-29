# PARKING LOT

Ideas, improvements, and missing features noticed during the **sh-layout-v1** pass
(2026-09-29) and deliberately **not built**. One line each, tagged with the section
it belongs to. Nothing here is a commitment.

Scope guard for that pass was: arrange what exists today. No new sections, no new
features, no schema changes.

---

## Schema changes (would be required, not made)

- **Calendar** — `horizon_events.start_time`/`end_time` are free-form `text`; typed `timestamptz` columns would remove all defensive parsing. Already tracked as NORTH_STAR Q2.
- **Archive** — no table backs it; it live-fetches `HANDOFF.md` over the network on every mount. A cached `horizon_handoff_entries` table would make it instant and offline-tolerant.
- **Career** — `dashboard_jobs` lives in a different Supabase project, so Career cannot be joined against `horizon_projects` in SQL. Any cross-linking needs a copy table or a view.
- **Swift** — `horizon_swift_*` `status`/`category`/`kind` still have no DB `CHECK` constraint (NORTH_STAR S3); enum values are client-enforced only.
- **Projects** — no `archived` flag, so a finished project can only be deleted or left as clutter in the accordion.

## Horizon (Home)

- Needs Attention sits below the hero rather than in the IA's right-hand column (NORTH_STAR Q12, awaiting Taylor).
- "Cycle remaining" instrument hardcodes `232` days and `DotMatrix completed={18} total={35}`; none of it is computed.
- Capacity ("Light / Steady / High focus") is component state only and resets on every reload.
- "Systems nominal" in the stage topline is a static string, not a real health read.
- Field-status strip has no keyboard hint that its four slots are buttons.

## Projects

- `AccordionProject` is declared inside `AreaAccordion`'s body, so it is a new component type on every render and its subtree remounts. Pre-existing; fix is a lift to module scope.
- `.registry-hero` is a decorative image band sitting between the add-project form and the filters; it pushes the real content down.
- Area cards and the accordion both encode "which areas exist" independently; one shared derivation would keep them honest.
- No way to reorder or pin a project to the top of its area.
- Adding a project always writes `area: 'Unsorted'`, which falls outside `AREA_ORDER` and lands in the trailing section.

## Flow

- Four columns are fixed width at every breakpoint above 680px; on a narrow laptop each column is very tight.
- No drag between columns; status changes go through a `<select>` per row.
- No filter by project, so the board shows every task across all 16 projects at once.

## Calendar

- Month cells cap at 2 events with a "+N more" label that is not clickable.
- Agenda mode's left column stacks a month grid and a task list with no visual separation between the two jobs they do.
- Tasks appear in Calendar but carry no date, so the pairing is spatial only.
- No week view.
- `CalendarView`'s `todayKey` uses `new Date().toISOString().slice(0,10)`, which is **UTC**; in ET that flips a day early after 8pm, so "today" and the upcoming filter can both be off by one. `toDateKey` in `src/timeline.js` is the local-time version and is the fix. Noticed during the sort fix, left alone as a separate change.

## Career

- The pipeline list is read-only by design (NORTH_STAR: Career is read-only from `dashboard_jobs`), but nothing in the UI says the rows cannot be edited here.
- No search or free-text filter over job titles and organizations.
- `loadJobPipeline` fetches every row with no server-side limit; a status filter pushed into the query would cut the payload.
- GDOL week logic is duplicated in concept with Septentrion's `dashboard/collectors/jobs.js`; they agree today by hand, not by construction.

## Mirrors

- The mirror-freshness collector has not run since 2026-08-24, so every row is stale; the view now says so but cannot fix it.
- No way to trigger a re-sync from the app (the collector is a local script).
- Repo rows have no link out to GitHub.

## Archive

- Repo list `ARCHIVE_REPOS` is hardcoded in `App.jsx`; it drifts from the real set of handoff-enabled repos by hand.
- Entries cap at 40 across all repos with no "load more".
- `parseHandoffEntries` sorts on the raw timestamp string, which works only because the format is `YYYY-MM-DD HH:MM ET`; a format change silently reorders the feed.
- No full-text search across handoff history.

## Swift

- The three tabs (Watch, Collection, Calendar) have no cross-links; a collection item tied to an event cannot reference it.
- Collection has no total-spend or count rollup.
- `SwiftWatchPanel` shows raw URLs rather than a readable target name.

## Travel

- Price history is a flat list per trip; a sparkline would show the trend at a glance (would need `tufte`).
- No target price or alert threshold.
- Trips never close, so a past trip stays in the list forever.

## War Room

- State is `localStorage` (`warroom_sh_v1`), the documented temporary exception; NORTH_STAR S2 tracks moving it to Supabase.
- Lives outside the shared view chrome, so it does not get the standard `view-header`.

## Cross-cutting

- The topbar search input is decorative; it has no handler and searches nothing.
- `App.jsx` is 1684 lines with every view in it; splitting per view would make each section editable without loading the whole app.
- Several views render their entire JSX on a single very long line (`CareerView` was the worst; it was reflowed in this pass). `ProjectRegistry`'s header and `AccessGate` remain dense.
- No global loading state: every view renders its empty state during the initial fetch, so "loading" and "genuinely empty" look identical.
- `npm run lint` passes on warnings (NORTH_STAR Q9); `--deny-warnings` would make the gate mean what it says.
- Nav group labels are `#6d7485` on `#0a0b1b` = 4.17:1, under WCAG AA (NORTH_STAR Q10, awaiting Taylor).
