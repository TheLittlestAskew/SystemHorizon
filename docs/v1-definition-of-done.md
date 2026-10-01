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

**✓ 6 · ⚠️ 5 · 🛑 BLOCKED 0** across 11 sections.

> Updated 2026-09-30: **Career moved from 🛑 BLOCKED to ✓.** M11 (`86a81f3`) gave it
> an authenticated session and Taylor confirmed rows rendering live, which closed
> the last blocked mark in the app. **Nothing is blocked now** — the remaining six
> `⚠️` marks are unproven rather than broken, and three of those collapse the
> moment Calendar and Flow hold real rows (see the closing section).

| # | Section | Loads | Real data | Core action | In layout | Verdict |
|---|---|---|---|---|---|---|
| 1 | **Horizon** (Home) | ✓ | ⚠️ | ⚠️ | ✓ | ⚠️ |
| 2 | **Projects** | ✓ | ✓ | ✓ | ✓ | **✓** |
| 3 | **Project detail** | ✓ | ✓ | ✓ | ✓ | **✓** |
| 4 | **Flow** | ✓ | ✓ | ✓ | ✓ | **✓** |
| 5 | **Calendar** | ✓ | ✓ | ⚠️ | ✓ | ⚠️ |
| 6 | **Career** | ✓ | ✓ | ✓ | ✓ | **✓** |
| 7 | **Mirrors** | ✓ | ⚠️ | ✓ | ✓ | ⚠️ |
| 8 | **Archive** | ✓ | ✓ | ✓ | ✓ | **✓** |
| 9 | **Swift** | ✓ | ✓ | ⚠️ | ✓ | ⚠️ |
| 10 | **Travel** | ✓ | ⚠️ | ⚠️ | ✓ | ⚠️ |
| 11 | **War Room** | ✓ | n/a | ✓ | ✓ | **✓** |

## Why each mark

### 1. Horizon (Home) ⚠️
Layout is the best-arranged view in the app (M3 through M7, IA steps 1 to 6 all
exist). ✅ **`horizon_events` now holds 4 rows (2 upcoming), so Today & Next renders
real data for the first time.** ✅ The field-status strip's Career slot **no longer
reads `Unavailable`** — M11 fixed that (see §6) — so Home's remaining gap is
Calendar's empty table, not Career. **Nothing on Home
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

### 4. Flow ✓
✅ **Confirmed 2026-09-30.** `horizon_tasks` holds **4** rows (was 1) and Taylor
created them through the board, moving two to `Done` — so add and move are both
demonstrated by the data, not just by tests. `Waiting` and `Parked` are empty,
which is an empty state rather than a failure: the board renders all four columns.

🛑 **But the `last_activity` writer is live and INERT, and that is a real finding.**
Task movement is supposed to stamp the parent project (Q14, `2452bc3`), which is
the input M6's Active Work ranking depends on. `touchProjectActivity` opens with
`if (!projectId) return`, and **all 4 tasks have `project_id` null**, so moving them
stamped nothing. Verified live: `horizon_projects` still reports
**`distinct last_activity` = 1, spread `00:00:00`** across 16 rows. ▶ **M6's ranking
will stay tied no matter how many tasks are moved until tasks carry a
`project_id`.** The code is correct; the data could not exercise it.

✅ **Fixed 2026-10-01 (`d178fbf`): the Flow board can now assign a project to an
existing task.** Until then the only ways to set it were the quick-add dropdown at
creation (which defaults to "No project", hence the four nulls) and adding a task
from inside a project's detail page. ✅ **Done 2026-10-01: Taylor assigned all four** (3 to System Horizon, 1 to
Invisible String Theory). `distinct last_activity` went **1 → 3**, spread
`00:00:00` → **4d 17:56**, and M6 now ranks **1. System Horizon, 2. Invisible String
Theory** on real recency instead of falling back to `signal`. ⚠️ Rank 3 remains a
three-way tie on the original seed stamp, so that slot is still a signal tiebreak.

### 5. Calendar ⚠️ (narrowed)
The real defect was fixed: Agenda sorted `"10:00 AM"` before `"9:00 AM"` via
`localeCompare` on raw text, now uses `compareEvents` from `src/timeline.js`
(`3192cc9`, +2 tests). Layout deliberately unchanged (3 columns in Agenda, 2 in
Month).

✅ **`horizon_events` now holds 4 rows** (was 0), 2 of them upcoming, so Calendar and
Home's Today & Next finally render real data.

⚠️ **The sort fix is still not exercised by that data.** The bug was `"9:00 AM"`
sorting after `"10:00 AM"`, which needs **two parseable timed events on one day**.
Neither day has that: 2026-09-29 holds `12:30pm` plus an all-day, and 2026-10-01
holds `10:AM` plus an all-day. ▶ **To close this mark, add two timed events on the
same day, e.g. 9:00 AM and 10:00 AM.**

⚠️ **`10:AM` is malformed and the app will show it that way, correctly.**
`parseEventTime('10:AM')` returns `unparsed: true`, keeps the raw string as its
display, and sorts it to the bottom. That is the designed behaviour — flag rather
than guess — so it is not a bug, but that event will read `10:AM` and sit last.
`10 AM`, `10:00 AM`, `12:30pm` and `14:30` all parse cleanly.

### 6. Career ✓
Layout work landed: status filter, `PIPELINE_LIMIT` cap with a **Show all N**
toggle rather than a hard 25, `JobRow` extracted, permission error explained in
the UI (`3af5404`, `bc80700`). Taylor reviewed it on localhost.

✅ **Fixed by M11 (`86a81f3`), confirmed live by Taylor 2026-09-30.** Career now signs in to the job project as `authenticated` and renders real rows. The history below is kept because it names the fix that must never be taken.

🛑 **The trap it avoided.** `dashboard_jobs` lives in Supabase
project `vtrtyagltwdrbastpppl` and grants SELECT to `authenticated` but not
`anon`; `src/jobPipeline.js` connects as `anon` and never signs in to that
project. ⚠️ **Do NOT `grant select ... to anon`** — the view has
`security_invoker` unset so it bypasses `job_applications` RLS, and the anon key
is committed to this **public** repo, so the grant would publish the entire job
search. The real fix is SH authenticating against that project, which is **a new
milestone that did not exist yet**. ✅ **It shipped the same day: `NORTH_STAR.md` §10 M11**, decided, spec'd, built
and confirmed live on 2026-09-30. Evidence and rejected alternatives in
`docs/v1-decisions-needed.md` §D1. ⚠️ `anon` was re-queried after the change and still holds only `REFERENCES, TRIGGER` — the fix was signing in, not widening access.

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

~~Three of the six `⚠️` marks collapse to `✓` from one cheap action: add one event
in Calendar and a few tasks in Flow.~~

✅ **Done 2026-09-30, and it paid off partly.** Taylor added 4 events and 4 tasks.
**Flow flipped to `✓`** and Home and Calendar both render real data now. But only
one of the three promised marks actually closed, because *having* data is not the
same as having data that exercises the thing:

| Mark | Why it did not close |
|---|---|
| **Calendar** ⚠️ | No day holds **two parseable timed events**, so the `9:00 AM` vs `10:00 AM` sort bug is still unexercised. ▶ Add two timed events on one day |
| **Horizon** ⚠️ | Real data arrived, but Home still has had **no visual check since M3**; M4–M7 remain `Done (pending Taylor visual)`, and the cycle/capacity instruments are still hardcoded |

▶ **The highest-value next action is not more rows, it is linking tasks to projects.**
All 4 tasks have `project_id` null, so M6's Active Work ranking stays tied at
`distinct last_activity = 1` forever (see §4). That is a live feature with no data
to act on.

⚠️ Lesson worth keeping: "add real data" closed one mark, not three. **Specify the
shape the data has to take**, not just its existence.
