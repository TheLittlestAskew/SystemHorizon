# Pulse — design spec

> Written 2026-10-03 with Taylor. Milestone **M12**.
> Governed by `docs/NORTH_STAR.md`. Where this file and NORTH_STAR disagree, NORTH_STAR wins.
> Layout reference: a 3-column social dashboard Taylor supplied. **Structure only.** The
> reference's content model (news feed, poll, social posts) is explicitly not what ships.

---

## 1. What this is

A third view in the **Projects** nav group, beside Projects and Flow, called **Pulse**.

Three columns, master-detail:

```
┌──────────────┬────────────────────────────┬──────────────────┐
│ PROJECTS     │ STREAM                     │ SIDE PANE        │
│ 280px        │ flex                       │ 320px, collapses │
│              │                            │                  │
│ OPS & INFRA  │ [+ Quick add…        ] (→) │ Overview│Mirrors │
│  ● System H. │ ────────────────────────── │ Upcoming│Stale   │
│    today     │ Oct 3 · System Horizon     │ ──────────────── │
│  ● Septent.  │   task "FLAG css" → Done   │      ╭───╮       │
│    2d        │ ────────────────────────── │     │ 62% │      │
│              │ Oct 2 · Invisible String   │      ╰───╯       │
│ AFTERMATH    │   HANDOFF · Claude Code    │  active projects │
│  ! Aftermath │   "cursor hardened"        │  moved in 14d    │
│    11d       │ ────────────────────────── │                  │
│              │ 16 projects · 4 moved /wk  │  6 haven't →     │
└──────────────┴────────────────────────────┴──────────────────┘
```

**Selection is the organising idea.** No project selected = portfolio scope. Selecting a
project in the left column re-scopes the stream *and* all four pane tabs to it. Selecting
it again clears back to portfolio scope.

### Why it earns a slot (the §1 tiebreaker)

NORTH_STAR's test is "does this help Taylor see what matters and act on it with less
decision fatigue?" Pulse answers a question no existing view answers: **what has moved,
and what has stopped moving.** The registry shows state; Flow shows task status; Pulse
shows *motion over time*, which is the signal that tells her what she has abandoned.

Every number on the screen has an action attached. The ring's shortfall is clickable. The
stale list selects a project. The composer writes. Nothing here is a readout.

---

## 2. Nav change

`src/navConfig.js`:

```js
{ id: 'projects', label: 'Projects', items: ['Projects', 'Flow', 'Pulse'] }
```

No other nav change. Order within the group is Projects → Flow → Pulse. The group stays
expanded by default. `navConfig.test.mjs` already asserts group membership and order; it
gets a case for the new item.

NORTH_STAR §3 locks nav *structure* (which groups exist, Calendar as a utility, Side Quests
collapsed). Adding a view inside an existing group does not change that structure and
removes nothing, so §6 RED ("removing any pre-existing view or nav item") does not apply.

---

## 2b. Time, stated once

Three things depend on "how long ago": the left column's day count, the ring's 14-day
freshness window, and the Stale tab. They must agree, so the rule is defined here and the
pure modules share it.

- **Day counts are calendar-day differences in the browser's local zone**, not 24-hour
  spans. Something at 11pm yesterday reads `1d`, not `today`. This matches how Taylor reads
  a date and avoids a project flipping between `today` and `1d` across an afternoon.
- **The clock is injected**, following the `cycle.js` precedent, so every test is
  deterministic and nothing calls `Date.now()` inside a pure function.
- **`last_activity` null means never**, and sorts as infinitely stale.
- Timestamps arrive as `timestamptz` (activity, `last_activity`) or as parsed handoff text
  that may lack a time. The handoff path already degrades to a date-only timestamp; a
  date-only value is treated as that day at 00:00 local for ordering.

---

## 3. Left column — the project list

Grouped by area, using the same `AREA_ORDER` constant the registry uses, so the two views
speak one vocabulary.

Each row: health dot · project name · days since `last_activity`.

| Rendering rule | Behaviour |
|---|---|
| Health dot | Reuses the existing `Signal` tone mapping (Green → cyan, Yellow/Red → coral, else violet). No new colours. |
| Days since | `today` / `2d` / `11d`, computed from `last_activity`. |
| `last_activity` is null | Renders **`never`**, not `0d`. A missing timestamp is not "moved today". |
| Status is `Paused` or `Idea` | Renders the status word instead of a day count, and the row is visually quieter. Staleness is not a defect for a parked project. |
| Area not in `AREA_ORDER` | Appended after the known areas, same as the registry already does. Never dropped. |
| Selected | Left accent bar, matching the nav's active treatment. `aria-pressed`. |

Rows are buttons, keyboard reachable, in visual order.

---

## 4. Centre column — the stream

### 4.1 Composer

One text input plus a send control. **It states what it will do**, because the target
changes with selection:

| Scope | Placeholder | Writes |
|---|---|---|
| No project selected | `Capture a thought…` | a row in `horizon_capture` (the M3 inbox) |
| Project selected | `Add a task to <project>…` | a `horizon_tasks` row with `project_id` set, `status: 'Active'`, then `touchProjectActivity(projectId)` |

Enter saves. **A failed save shows the error and keeps the text** — the M3 rule, restated
because it is the one that protects against losing a thought.

### 4.2 The stream itself

A reverse-chronological merge of **two** sources:

1. `horizon_activity` rows (new table, §5) — what Taylor did in SH.
2. Parsed `HANDOFF.md` entries from the six repos in `ARCHIVE_REPOS`, via the existing
   `parseHandoffEntries` in `src/archive.js`. Reused, not reimplemented.

Both carry timestamps; the merge sorts descending with a stable tiebreak on id, following
`sortArchive`'s existing total-order approach so rows never swap between renders.

| Case | Behaviour |
|---|---|
| Handoff entry with no parseable timestamp | Sorts to the bottom, not the top. `archive.js` precedent. |
| A repo's fetch failed | The repo is **named** in a notice above the stream. `Promise.allSettled` separates them; they are never silently dropped (§4). |
| Project scope | Activity filtered on `project_id`; handoffs filtered to that project's mapped repos (§6). |
| Project scope, project has no mapped repo | Activity only, with an explicit line: "No repo linked, so handoffs are not shown." Not an empty column. |
| Activity row whose project was deleted | `project_id` is null; still renders in portfolio scope, excluded from project scope. |
| Over the cap | Caps at **50 entries after the merge** (both sources combined, not 50 each) and states the remainder in words, per the Career precedent. No silent truncation. |
| Nothing at all | "Nothing has moved yet. Activity logging started 2026-10-03." |

Footer: `<n> projects · <n> moved this week`.

---

## 5. `horizon_activity` — the new table

### 5.1 Why it exists

Without it the stream is roughly 85% "what Claude banked" and 15% "what Taylor did",
because `horizon_tasks.updated_at` is one timestamp and not a history. Taylor chose to
build the table so the stream becomes genuinely hers over time.

### 5.2 Schema

```sql
create table public.horizon_activity (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  kind        text not null,
  project_id  uuid references public.horizon_projects(id) on delete set null,
  subject_id  uuid,
  summary     text not null,
  constraint horizon_activity_kind_check check (kind = any (array[
    'task_created','task_completed','task_status','task_linked','task_flagged',
    'task_deleted','project_added','event_added','capture_added',
    'registry_resynced','calendar_synced'
  ]))
);

create index horizon_activity_owner_occurred_idx
  on public.horizon_activity (owner, occurred_at desc);
```

Conformance to NORTH_STAR §4's database rules:

| Rule | How this meets it |
|---|---|
| `horizon_` prefix | ✅ |
| `owner uuid not null references auth.users(id) on delete cascade` | ✅ |
| RLS on, four per-command policies, role `authenticated`, `owner = auth.uid()` | ✅ — all four, matching `horizon_tasks` |
| `revoke all on horizon_activity from anon` | ✅ |
| Owner-scoped index | ✅ `(owner, occurred_at desc)` — ordering is the only query shape |
| `updated_at` + trigger | **Not applicable.** The table has no `updated_at`; it is append-only. §4 scopes the trigger rule to tables that have the column |
| Enum-like text gets a CHECK | ✅ `kind`, using the `= any (array[...])` idiom M9 established on this table family, not an `in (...)` variant |
| Migration file **and** applied live | ✅ §9 |

**`subject_id` deliberately has no foreign key.** A `task_deleted` entry must outlive the
task it names, so an FK would either block the log write or cascade the history away.

**Append-only is enforced in the app, asserted by test — not by omitting policies.** §4
requires a policy for every command, so all four exist. The guarantee that SH never updates
or deletes an activity row is held the way M9 holds "SH never writes `promoted`": a test on
the pure module proves it exposes no update or delete path, and a grep confirms no
`.from('horizon_activity').update(` or `.delete(` anywhere in `src/`.

### 5.3 No backfill

Existing rows cannot produce honest history. `last_activity` is one timestamp per project
and `updated_at` is one per task; synthesising "events" from them would put invented
timestamps into a log that reads as a record of fact. **Nothing is backfilled.** The empty
state names the start date instead. Real history before 2026-10-03 lives in the handoff
entries, which are genuine and already in the stream.

### 5.4 Write sites

One helper, `logActivity()`, called from **eleven** existing functions in `src/App.jsx`:

| Line (today) | Function | Kind |
|---|---|---|
| 1804 | `addProject` | `project_added` |
| 1812 | `seedProjects` | `registry_resynced` — **one** entry, not 16 |
| 1846 | `addTask` | `task_created` |
| 1854 | `updateTaskStatus` | `task_completed` when the new status is `Done`, else `task_status` |
| 1867 | `updateTaskProject` | `task_linked` |
| 1881 | `updateTaskPromotion` | `task_flagged` |
| 1893 | `deleteTask` | `task_deleted` |
| 1904 | `addCapture` | `capture_added` |
| 1922 | `captureIntoTask` | `task_created` |
| 1943 | `addEvent` | `event_added` |
| 1955 | `syncGoogleCalendar` | `calendar_synced` — **one** summary entry |

`task_flagged` exists rather than reusing `task_status` because marking a handoff candidate
is not a status change, and a stream line reading "status changed" when the status did not
change is a small lie the log should not tell.

🛑 **Three deliberate exclusions, stated so they are not read as oversights:**

1. **`syncGoogleCalendar` logs one entry, not one per event.** It reconciled 36 events on
   2026-10-02. Thirty-six rows per sync would bury Taylor's own actions under machine noise
   and make the stream useless — the exact failure the reference layout invites.
2. **Side Quest mutations are not logged.** `addSwiftCollectionItem`, `addSwiftEvent`,
   `addTravelEntry` and their deletes (lines 1999–2036) belong to Swift and Travel, not the
   Projects area. Pulse is a Projects view.
3. **`deleteEvent` (line 1993) logs nothing**, because an event deletion carries no project
   signal worth a line. If that proves wrong in use it is one call to add.

### 5.5 When the log write fails

The primary mutation has already committed; the client has no transaction to roll back.
Silently swallowing it is forbidden by §4.

**Behaviour:** the mutation succeeds and renders normally, a React state counter
(`activityLogFailures`, session-scoped, not persisted) increments, and the stream header
shows `⚠️ <n> action(s) weren't logged this session.` Non-blocking, visible, honest. It
clears on reload because the log write is **not retried** — retrying an append-only log
risks duplicate entries, which is worse than a gap the UI already admits to.

---

## 6. Project ↔ repo mapping

`horizon_projects` has no repo column today. `horizon_repo_health` is keyed on `repo_name`
and handoff entries on `repo`, so project-scoped Mirrors and handoffs have no join.

**Fix:** add a nullable column and populate it through machinery that already exists.

```sql
alter table public.horizon_projects add column repo_names text[];
```

- Nullable, so every existing row satisfies it. §6 GREEN authorises nullable column adds.
- Added to `projectToRow` and to the `initialProjects` code registry, so the existing
  **Re-sync registry** button fills it. §6 GREEN authorises the Projects re-seed.
- `projectFromRow` maps it to `project.repoNames` (default `[]`).

`src/projectRepos.js` resolves it, and reports rather than hides the gaps:

| Case | Behaviour |
|---|---|
| Project has no repo (Learn JavaScript, Storybook Resume) | "No repo linked" in the Mirrors tab and the stream notice. Not an empty tab. |
| Project names a repo outside `ARCHIVE_REPOS` | Shown as **linked but not monitored**, with the repo name. Archive only fetches six; the others are real repos with no handoff feed here. |
| Repo named in `horizon_repo_health` but in no project | Appears in portfolio-scope Mirrors only. Never dropped. |

---

## 7. Right column — the side pane

### 7.1 The component

`src/SidePane.jsx` is **generic**. It knows about tabs, collapse, and keyboard behaviour,
and nothing about projects:

```jsx
<SidePane
  id="pulse"                 // localStorage key suffix for collapse state
  tabs={[{ id, label, render }]}
  activeTab={…} onTabChange={…}
  collapsed={…} onToggle={…}
/>
```

Taylor's stated goal is to reuse this across most sections. **This milestone mounts it in
Pulse only.** Wiring eight working screens before the pattern has been lived with is scope
expansion past the milestone's criteria (§6 RED), and the component is built so each later
adoption is a few lines.

Collapse state persists in `localStorage` under `horizon_sidepane_pulse`. §4 permits
per-device conveniences and names the nav collapse as the precedent; this is the same class.

Tab semantics: roving tabindex, `role="tablist"`, arrow-key movement, `aria-selected`.
Collapsed state keeps the tab rail visible as icons with accessible names, so no content is
reachable only by expanding.

### 7.2 The four tabs

| Tab | Portfolio scope | Project scope |
|---|---|---|
| **Overview** | The ring (§7.3) + headline counts: active / paused / idea, open tasks, moved this week | That project's signal meter, health, status, open task count, and its `nextAction` with a control to open the project detail |
| **Mirrors** | `horizon_repo_health` rows carrying flags, worst first — same ordering the Mirrors view uses | Only that project's mapped repos, or the explicit "no repo linked" line |
| **Upcoming** | `horizon_events` in the next 14 days, chronological via `compareEvents` from `timeline.js` | Only events whose `project_id` matches |
| **Stale** | Active projects with no `last_activity` movement in 14+ days, oldest first; each row selects that project | **Not applicable, and says so:** "Staleness is a portfolio view. This project last moved 11 days ago." Never a blank tab |

Reuse, not reimplementation: `Upcoming` uses `timeline.js`'s comparator (the one that fixed
the `"10:00 AM"` before `"9:00 AM"` bug), and `Mirrors` uses the existing repo-health
ordering.

### 7.3 The ring

**Metric:** percent of **active** projects whose `last_activity` is within 14 days.

§2 forbids "decorative numbers without a decision attached", so the decision is wired in:
the shortfall renders as `<n> haven't →`, and activating it selects the oldest stale
project, which re-scopes the stream and the pane. The ring is a control.

Built per the `tufte` skill (§8): one arc, no gradient, no drop shadow, the number readable
without the arc. Colour carries status only — the existing cyan / amber / coral set, no new
hues.

| Edge case | Behaviour |
|---|---|
| Zero active projects | "No active projects" — **not 0%**. 0/0 is undefined, not failure |
| Every active project is fresh | 100%, shortfall block hidden, calm confirmation line |
| A project with `last_activity` null | Counts as stale, and the row reads `never` |

---

## 8. Files

| File | New? | Purpose |
|---|---|---|
| `src/PulseView.jsx` | new | The view. Not added to `App.jsx`, which is 2101 lines |
| `src/SidePane.jsx` | new | Generic tabbed collapsible pane |
| `src/pulseStream.js` | new | Pure: merge, sort, scope, cap the stream |
| `src/pulsePane.js` | new | Pure: each tab's payload for a given scope; ring maths |
| `src/activityLog.js` | new | Pure: the closed `kind` set, summary builders, row shape |
| `src/projectRepos.js` | new | Pure: project ↔ repo resolution and its gap reporting |
| `src/navConfig.js` | edit | `'Pulse'` into the projects group |
| `src/App.jsx` | edit | Route the view, load `horizon_activity`, call `logActivity` at 12 sites, map `repo_names` |
| `src/App.css` | edit | Three-column grid, pane, stream, project list. No new colour tokens |
| `supabase/migrations/<ts>_horizon_activity.sql` | new | Table, RLS, grants, index |
| `supabase/migrations/<ts>_horizon_projects_repo_names.sql` | new | Nullable column |

Rendering lives in the components; every decision lives in a pure module with tests. Same
split as `needsAttention.js`, `timeline.js`, `archive.js`.

---

## 9. Error handling

No silent fallbacks (§4). Each failure has its own visible message:

| Failure | What Taylor sees |
|---|---|
| `horizon_activity` read fails | Stream renders handoffs only, with "Could not load your activity: `<message>`" |
| A handoff repo fetch fails | That repo is named; the rest of the stream renders |
| All handoff fetches fail | Named collectively; activity rows still render |
| A log write fails | §5.5 — counter in the stream header |
| Composer save fails | Error shown, text preserved |
| `repo_names` missing on a project | "No repo linked" (a real state, not an error) |
| Signed out | The existing signed-out treatment, which §M11 made a distinct third state |

---

## 10. Responsive

Existing breakpoints, no new ones (§3).

| Width | Layout |
|---|---|
| Desktop | Three columns, 280px / flex / 320px |
| ≤ 1000px | Pane collapses to its rail by default; two columns |
| ≤ 680px | Single column. The project list becomes a horizontal scroll of area-grouped chips above the stream; the pane becomes a bottom sheet behind its tab rail |

Nothing scrolls horizontally except the intended mobile chip rail.

---

## 11. Tests

Baseline on `main` today: **250 passing**. Target: ~45 new, all `node:test` in `src/*.test.mjs`.

**`pulseStream.test.mjs`** — empty inputs; activity only; handoffs only; merged ordering;
untimestamped handoff sorts last; stable tiebreak across two renders; project scope filters
both sources; project with no mapped repo; activity row with null `project_id`; failed repo
is named not dropped; cap at 50 reports the remainder.

**`pulsePane.test.mjs`** — ring with zero active projects; all fresh; none fresh; a null
`last_activity` counting as stale; the §2b day-boundary rule (11pm yesterday reads `1d`,
not `today`) against an injected clock; a timestamp exactly 14 days old (boundary
inclusive or not, decided and asserted); Upcoming with no events, only past events, and an
unparseable time; Mirrors with no flags; Stale in project scope returns the explanatory
state rather than an empty list; each tab in both scopes.

**`activityLog.test.mjs`** — every `kind` in the closed set builds a row, including
`task_flagged`; a kind outside the set is rejected and never written; 🛑 the module exposes
no update or delete path; `task_completed` vs `task_status` branches on the new status; a
status summary names from and to; a promotion toggle produces `task_flagged`, never
`task_status`; Google sync produces exactly one entry for 0, 1, and 36 events; `project_id`
may be null (captures have none).

**`projectRepos.test.mjs`** — one repo; several repos; none; a repo outside
`ARCHIVE_REPOS` reported as unmonitored; a `horizon_repo_health` repo in no project;
unknown project id.

**`navConfig.test.mjs`** — extended: Pulse is in the projects group, in third position, and
Projects and Flow are both still present.

**`sidePaneCss.test.mjs`** — follows the `taskControlsCss.test.mjs` precedent: every class
name the component emits exists in `App.css`, and the collapsed rail has a non-zero width
so it cannot vanish.

---

## 12. Definition of done

NORTH_STAR §9 gates 1–8, plus these milestone criteria (all `orchestrator-defined`):

1. `horizon_activity` exists with the §5.2 schema. **Executable check:**
   `select count(*) from horizon_activity where kind <> all (array[…the eleven kinds…])`
   returns **0**, and an insert with a bogus kind is rejected with `23514`. A successful
   `apply_migration` response is not evidence.
2. Both migrations exist as files **and** appear in `list_migrations`. ⚠️ `apply_migration`
   stamps the version in server UTC — name the checked-in files from `list_migrations`
   afterwards, or file and live state diverge (the M9 lesson).
3. `horizon_projects.repo_names` exists and is nullable. **Executable check:**
   `select count(*) from horizon_projects where repo_names is not null` is **> 0** after
   Re-sync registry runs — proving the seed path populates it, not just that the column
   exists. ⚠️ Like criterion 9, this one is **Taylor-gated**: the seed runs as her signed-in
   user, so it cannot be closed from a headless session (the M2 lesson).
4. 🛑 **SH never updates or deletes an activity row.** Asserted by test on the pure module
   and by grep over `src/`. The M9 precedent for this kind of guarantee.
5. Selecting a project re-scopes the stream and all four tabs; selecting it again clears.
6. Every "not applicable" state renders a sentence saying why. No blank tab, no empty
   column, no silently dropped repo.
7. The ring's shortfall is operable by keyboard and selects the oldest stale project.
8. §9 gates 1–3 pass: lint clean, tests pass (250 + new), build succeeds.
9. Taylor has seen it live at desktop, 1000px, and 680px — via `npm run dev` and
   chrome-devtools-mcp at **`http://localhost:5173/`**. 🛑 Never
   `https://sh.tayloraritchie.com`; Cloudflare Access traps a CDP-driven browser.

---

## 13. Out of scope

- **Mounting `SidePane` in any other view.** Built generic, used once. §7.1.
- **Backfilling activity history.** §5.3.
- **Logging Side Quest mutations.** §5.4.
- **Any change to the Projects registry or Flow.** Both stay exactly as they are; this is
  additive. Touching them would be §6 RED.
- **Writing to `HANDOFF.md` from the app.** A permanent non-goal (§2). Pulse *reads* parsed
  handoffs; it never writes one.
- **A repo-management UI for `repo_names`.** The code registry plus Re-sync is the path for
  v1. A per-project editor is a later call.

---

## 14. Open question

**One, and it does not block the build.** `initialProjects` currently has 16 entries and
`ARCHIVE_REPOS` has 6. The mapping in §6 therefore leaves most projects with no handoff
feed — expected, and the UI states it. If Taylor wants more repos in the stream, adding a
name to `ARCHIVE_REPOS` is a one-line change, but each one costs a network fetch on every
Pulse load. Flagged, not decided.
