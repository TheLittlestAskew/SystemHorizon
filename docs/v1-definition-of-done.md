# v1 DEFINITION OF DONE

> Written 2026-09-30. Retro-fitted: the v1 layout pass already shipped on
> 2026-09-29 (`origin/main` = `8e143d4`, Pages run 36627212047 success). This doc
> is the checklist that pass should have carried and did not, so the state is
> recorded rather than re-derived next session.
>
> Companions: `SH_LAYOUT_PLAN.md` (the Phase 0 audit and per-section plan),
> `PARKING_LOT.md` (47 parked ideas), `docs/v1-decisions-needed.md` (the open
> calls), `docs/NORTH_STAR.md` (the governing doc and milestone queue).

## The four criteria

One line per section. A section is `✓` only when all four hold:

1. **Loads** without a console error.
2. **Shows real Supabase data**, not a fixture and not only an empty state.
3. **Core action works** (the one thing that section exists to do).
4. **Placed in the v1 layout** with a clear header, one primary region, and a
   deliberate secondary grid.

Marks: `✓` verified · `⚠️` shipped but a criterion is unproven · `🛑 BLOCKED`
cannot pass without something outside this repo.

## Scoreboard

**✓ 4 · ⚠️ 6 · 🛑 BLOCKED 1** across 11 sections.

| # | Section | Loads | Real data | Core action | In layout | Verdict |
|---|---|---|---|---|---|---|
| 1 | **Horizon** (Home) | ✓ | ⚠️ | ⚠️ | ✓ | ⚠️ |
| 2 | **Projects** | ✓ | ✓ | ✓ | ✓ | **✓** |
| 3 | **Project detail** | ✓ | ✓ | ✓ | ✓ | **✓** |
| 4 | **Flow** | ✓ | ⚠️ | ⚠️ | ✓ | ⚠️ |
| 5 | **Calendar** | ✓ | 🛑 | ⚠️ | ✓ | ⚠️ |
| 6 | **Career** | ✓ | 🛑 | ⚠️ | ✓ | **🛑 BLOCKED** |
| 7 | **Mirrors** | ✓ | ⚠️ | ✓ | ✓ | ⚠️ |
| 8 | **Archive** | ✓ | ✓ | ✓ | ✓ | **✓** |
| 9 | **Swift** | ✓ | ✓ | ⚠️ | ✓ | ⚠️ |
| 10 | **Travel** | ✓ | ⚠️ | ⚠️ | ✓ | ⚠️ |
| 11 | **War Room** | ✓ | n/a | ✓ | ✓ | **✓** |

## Why each mark

### 1. Horizon (Home) ⚠️
Layout is the best-arranged view in the app (M3 through M7, IA steps 1 to 6 all
exist). Two criteria are unproven: `horizon_events` holds **0 rows** so Today &
Next renders an empty state, and the field-status strip's Career slot reads
`Unavailable` because `dashboard_jobs` is unreadable (see §6). **Nothing on Home
has had a visual check since M3**, so M4 through M7 are `Done (pending Taylor
visual)`. Also still hardcoded, tracked in `PARKING_LOT.md`: the cycle-remaining
instrument (`232` days, `18/35`), the capacity selector (component state, resets
on reload), and the "Systems nominal" topline.

### 2. Projects ✓
16 `horizon_projects` rows, re-seeded and verified row-by-row against
`AREA_ORDER` in M2 (0 duplicates, 0 phantom `Swift`, parent links intact).
Taylor confirmed live on 2026-09-26: area cards, card-click filtering, the
accordion, and project names opening detail pages.

### 3. Project detail ✓
Covered by the same 2026-09-26 confirmation, which explicitly included opening a
project from inside the accordion.

### 4. Flow ⚠️
4-column board is sound and untouched by this pass. `horizon_tasks` holds **1
row**, so the board has never been seen carrying real volume across all four
columns. Task movement does write `last_activity` on the parent project (Q14,
`2452bc3`), proven with a reversible probe.

### 5. Calendar ⚠️
The real defect was fixed: Agenda sorted `"10:00 AM"` before `"9:00 AM"` via
`localeCompare` on raw text, now uses `compareEvents` from `src/timeline.js`
(`3192cc9`, +2 tests). 🛑 But `horizon_events` is **empty**, so the fix is
unit-tested and has never run against a real event. Layout deliberately
unchanged (3 columns in Agenda, 2 in Month).

### 6. Career 🛑 BLOCKED
Layout work landed: status filter, `PIPELINE_LIMIT` cap with a **Show all N**
toggle rather than a hard 25, `JobRow` extracted, permission error explained in
the UI (`3af5404`, `bc80700`). Taylor reviewed it on localhost.

🛑 **Blocked, and the obvious fix is a trap.** `dashboard_jobs` lives in Supabase
project `vtrtyagltwdrbastpppl` and grants SELECT to `authenticated` but not
`anon`; `src/jobPipeline.js` connects as `anon` and never signs in to that
project. ⚠️ **Do NOT `grant select ... to anon`** — the view has
`security_invoker` unset so it bypasses `job_applications` RLS, and the anon key
is committed to this **public** repo, so the grant would publish the entire job
search. The real fix is SH authenticating against that project, which is **a new
milestone that does not exist yet**. See `docs/v1-decisions-needed.md` §D1.

### 7. Mirrors ⚠️
Rows render worst-first and the view honestly states its own staleness. Data is
real but the mirror-freshness collector **has not run since 2026-08-24**, so
every flag is over a month old. M4 raises that staleness as its own alert rather
than presenting stale flags as current.

### 8. Archive ✓
Rebuilt from a flat 40-card feed into a **sortable, filterable, searchable table**
with sticky headers and a contained scroll; failed repo fetches are now named
instead of silently dropped (`7aafe57`, `35dc298`, `c25cd97`; logic extracted to
`src/archive.js`, +11 tests, `sortArchive` throws on an unknown key). 61 rows
live. Taylor reviewed it on localhost before the merge.

### 9. Swift ⚠️
Tabs (Watch / Collection / Calendar) work and were audited, not changed. Real
rows present (2 / 1 / 1). Not independently re-verified this pass. Design note to
preserve: `predicted` + `confidence` on `horizon_swift_events` exist so forecasts
never render as facts, hence the "Predicted · N%" versus "Logged" badges.

### 10. Travel ⚠️
Price checks group by trip, soonest departure first, lowest flagged. 2 rows, but
**no changedetection.io flight watch is wired yet** (needs a watch UUID in
`travel-watch-sync.config.json`), so the view has never received an automated
entry. Not urgent until early November for the PAX Unplugged decision.

### 11. War Room ✓
Self-contained draft board, player pool, my team, settings. Draft completed
8/29. State lives in `localStorage` (`warroom_sh_v1`) as a **documented
exception**, taken because a live draft is single-device and latency-critical.
"Real Supabase data" is `n/a` by design, not by omission.

## Gate status from the shipped pass

Run on the final tree, per `docs/NORTH_STAR.md` §9:

- `npm run lint` clean. ⚠️ Q9 is open: `oxlint` exits 0 on warnings, so "clean"
  currently means "no errors".
- `npm test` **153 passing** (was 121 on `main` before the pass).
- `npm run build` succeeds.
- `git diff sh-layout-v1 main` empty, so the merged tree is byte-identical to
  what was gated.
- Deploy **confirmed, not assumed**: Pages run 36627212047 for `8e143d4` reports
  `completed / success`, checked via the REST API because there is no `gh` on
  this machine.
- Gate items 1 to 7 pass. Item 8 (Taylor sees it live) is closed for **Archive**
  and **Career** only.

## What would move the needle most

Three of the six `⚠️` marks collapse to `✓` from one cheap action:
**add one event in Calendar and a few tasks in Flow.** That turns Calendar's
sort fix, Flow's board, and Home's Today & Next from "never met real data" into
verified behavior. Career's `🛑` does not move without a decision (§D1).
