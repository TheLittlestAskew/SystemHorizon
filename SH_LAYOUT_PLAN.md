# SH LAYOUT PLAN — v1 pass

> Branch: `sh-layout-v1`. Written 2026-09-29 by Claude Code.
> Scope: give every section that exists **today** a preliminary, usable layout.
> Nothing new is added. Ideas go to `PARKING_LOT.md`.

---

## 0. The honest read, first

**Most of System Horizon already has a usable layout.** Nine of the eleven views
are structurally sound: they have a clear header, one primary region, and
secondary content in a deliberate grid. This is not a repo that needs a
sweeping layout pass, and doing one would mean restyling working screens for
the sake of activity — which NORTH_STAR's own tiebreaker test ("does this change
what she does next?") rejects.

Three things actually fail the "functional and well-arranged" bar:

| # | Section | Problem | Type |
|---|---|---|---|
| 1 | **Career** | Renders **every** job row with no cap and no grouping. The pipeline has hundreds of rows; the page becomes an unbounded wall under two stat panels. | Layout |
| 2 | **Archive** | 40 undifferentiated cards in one flat feed with no repo grouping, and repos whose fetch **fails are silently dropped** — you cannot tell "no entries" from "network refused". | Layout + correctness |
| 3 | **Calendar** | Agenda events sort with `localeCompare` on raw time strings, so **"9:00 AM" sorts after "10:00 AM"**. A chronological list in the wrong order is not functional. | Correctness |

Those three are the v1 pass. Everything else is verified and left alone.

---

## 1. Section inventory (Phase 0)

Live location: **`TheLittlestAskew/SystemHorizon`** (standalone). Evidence in §5.

| Section | Nav group | Shows | Supabase tables | Rows live | State |
|---|---|---|---|---|---|
| **Horizon** (Home) | direct | Now + Capture, Needs Attention, Today & Next, Capacity, Cycle, Active Work, Capture inbox, field-status strip | `horizon_now`, `horizon_capture`, `horizon_tasks`, `horizon_projects`, `horizon_events`, `horizon_repo_health`, `dashboard_jobs` (ro) | 1 / 2 / 1 / 16 / **0** / 11 / n-a | Works. Best-arranged view in the app (M3–M7). |
| **Projects** | Projects | Area rollup cards, repo activity table, area accordion, add + re-sync | `horizon_projects`, `horizon_tasks`, `horizon_repo_health` | 16 / 1 / 11 | Works. 2-column board, sound hierarchy. |
| **Project detail** | (from Projects) | One project: next action, headline, field notes, task board | `horizon_projects`, `horizon_tasks` | — | Works. |
| **Flow** | Projects | 4-column task board (Active / Waiting / Parked / Done) + quick add | `horizon_tasks`, `horizon_projects` | 1 / 16 | Works. |
| **Calendar** | utility (pinned) | Agenda (month grid + tasks / upcoming / detail) and Month modes | `horizon_events`, `horizon_tasks`, `horizon_projects` | **0** / 1 / 16 | ⚠️ **Time sort bug.** Otherwise works. Never seen with real events. |
| **Career** | direct | GDOL work-search compliance, active-application counts, A-rated leads, full pipeline | `dashboard_jobs` (read-only, separate project) | n-a here | ⚠️ **Unbounded list.** Panels above it are fine. |
| **Mirrors** | System | Repo health rows with flags, sorted worst-first | `horizon_repo_health` | 11 | Works. Data is stale since 2026-08-24; the view says so. |
| **Archive** | System | Live-fetched `HANDOFF.md` entries from 6 repos | none (network `fetch`) | — | ⚠️ **Flat feed, silent failures.** |
| **Swift** | Side Quests | Tabs: Watch / Collection / Calendar | `horizon_swift_watch`, `horizon_swift_collection`, `horizon_swift_events` | 2 / 1 / 1 | Works. |
| **Travel** | Side Quests | Price checks grouped by trip, soonest departure first, lowest flagged | `horizon_travel_watch` | 2 | Works. |
| **War Room** | Side Quests | Draft board, player pool, my team, settings | none (`localStorage`, documented exception) | — | Works. Self-contained. |

Baseline gates on `main` before any change: `npm run lint` clean, **121/121** tests,
`npm run build` succeeds.

---

## 2. Navigation structure

**No change.** The nav is locked by NORTH_STAR §3, shipped in M1, and Taylor
confirmed it live on 2026-09-26. Order is Calendar (pinned utility) → Horizon →
Projects (Projects, Flow) → Career → System (Mirrors, Archive) → Side Quests
(Swift, War Room, Travel), collapsed. Touching it would be scope expansion.

---

## 3. Proposed layout per section

Structure only. Same visual language throughout: `view-header` → controls →
content. No new colors, no new component vocabulary.

### 3.1 Career — primary vs secondary, and a bounded list

Current: two stat panels, then A-rated leads, then **every** job in one list.

Proposed hierarchy:

```
view-header ................................ what this view is
[compliance panel] [active applications] ... unchanged — the two decisions
A-rated leads .............................. PRIMARY: what to act on
Pipeline ................................... SECONDARY: bounded, filterable
  ├─ status filter row (All / Discovered / Docs Created / Applied / Interview)
  ├─ at most 25 rows
  └─ "N more in <status>" when truncated — never a silent cut
```

- The pipeline list gets a **status filter** reusing the existing
  `.registry-controls` pill group, so no new styling.
- The list **caps at 25** and states the remainder in words. NORTH_STAR forbids
  silent truncation by the same logic it forbids silent fallbacks.
- A-rated leads keeps its place directly above, since it is the section that
  changes what Taylor does next.
- Reflow the one-line JSX so the section is editable. No behavior change.

### 3.2 Archive — group by day, report failures

Current: one flat `grid` of up to 40 cards, newest first, repos interleaved.
Failed fetches vanish.

Proposed:

```
view-header
[repo filter: All · SystemHorizon · ashfall_vault · ...]   ← reuses .registry-controls
failure notice (only when a repo could not be read)        ← explicit, per repo
feed, grouped by date heading                              ← reuses .calendar-date-heading pattern
  └─ 2026-09-27
       ├─ SystemHorizon · Claude Code · summary
       └─ taylorritchie · Codex · summary
```

- **Date headings** give the wall of 40 a spine. Handoffs are read
  chronologically, so date is the right grouping key, not repo.
- **Repo filter** narrows it when she wants one project's history.
- **Failed repos are named.** `Promise.allSettled` already separates them; the
  current code throws the rejections away. This is the NORTH_STAR §4
  "no silent fallbacks" rule, applied.

### 3.3 Calendar — fix the sort, leave the layout

Layout is fine: 3 columns in Agenda (month grid + tasks / upcoming / detail),
2 in Month. No structural change.

One fix: `upcomingEvents` sorts with
`(a.startTime || '').localeCompare(b.startTime || '')`, which orders
`"10:00 AM"` before `"9:00 AM"`. `src/timeline.js` already exports a correct
comparator built for exactly this column. Use it.

### 3.4 Everything else

Verified, unchanged: Horizon, Projects, Project detail, Flow, Mirrors, Swift,
Travel, War Room. Observations about them went to `PARKING_LOT.md`.

---

## 4. Blocked / flagged

| Thing | Why it blocks | Owner |
|---|---|---|
| `horizon_events` has **0 rows** | Calendar and Home's Today-and-Next have never rendered real data. The sort fix is unit-tested, but nobody has *seen* it work. | Taylor: add one event |
| `dashboard_jobs` unreachable from this machine | It is in Supabase project `vtrtyagltwdrbastpppl`, which neither MCP server can reach. Career's changes are fixture-tested only and have never met real job rows. | Taylor: load Career in the browser |
| Live visual check | The app is behind Supabase login and Cloudflare Access. `chrome-devtools` only sees browsers it launched; Taylor works in her own Chrome. | Taylor |
| `main`-branch rule conflict | NORTH_STAR §9 gate item 6 requires a push to `main`. This task forbids it. Task instruction wins; the gate is satisfied except item 6. | Resolved: branch only |

---

## 5. FINAL REPORT

### Which location is live, and the evidence

**`TheLittlestAskew/SystemHorizon` is live.** `taylorritchie/systemhorizon/` is
stale and should be treated as an archived snapshot.

| Evidence | SystemHorizon (standalone) | taylorritchie/systemhorizon/ |
|---|---|---|
| Last commit touching the app | **2026-09-27** (`3b8e0a0`) | **2026-06-28** (`e9b6dd2`, a subtree merge) |
| Commits to the path, ever | continuous, M0–M7 milestone series | **3** — the merge, one cleanup, one spec doc |
| Architecture | React 19 + Vite 8, `src/`, `vite.config.js`, 12 modules, 121 tests | one 264 KB pre-compiled `index.html` |
| Deploy | `.github/workflows/deploy-pages.yml` → `sh.tayloraritchie.com` | served under `tayloraritchie.com/systemhorizon/` |
| Governing doc | `docs/NORTH_STAR.md`, written with Taylor 2026-09-24 | none |
| Local clone | `C:\Users\theli\Septentrion\Repos\SystemHorizon`, clean, in sync with `origin/main` | same repo dir as the resume site |

No ambiguity, so the Phase 0 stop condition did not trigger.

🛑 **The `systemhorizon-build` skill this task told me to follow was formally
retired on 2026-09-25** (NORTH_STAR Q5) and moved to
`~/.claude/skills/_superseded/`. It describes a dead architecture. Two of its
four hard rules are now actively wrong:

| Skill's hard rule | Status |
|---|---|
| Pre-compile Babel, never browser-side | **Moot.** Vite compiles; there is no Babel step. |
| Never use `localStorage` | **Still live**, with two documented exceptions (nav collapse, War Room). |
| Never upsert whole arrays | **Still live.** NORTH_STAR §4 carries it. |
| No `import`/`export` in the JSX | **Wrong.** Vite requires ES modules; `App.jsx` ends in `export default App`. |

I followed NORTH_STAR §4's code rules instead, which are the live version of
the two that survived.

### Sections completed / partially done / blocked

**Changed (3):** three commits on `sh-layout-v1`, one per section.

| Section | Commit | What changed | New tests |
|---|---|---|---|
| Calendar | `3192cc9` | Agenda sort uses `compareEvents` from `timeline.js` instead of `localeCompare` on raw text | +2 |
| Career | `3af5404` | Status filter, 25-row cap with an explicit remainder count, `JobRow` extracted, JSX reflowed | 0 |
| Archive | `7aafe57` | Date grouping, repo filter, failed repos named; logic extracted to `src/archive.js` | +11 |

**Verified and deliberately unchanged (8):** Horizon, Projects, Project detail,
Flow, Mirrors, Swift, Travel, War Room. Each already has a clear header, one
primary region, and a deliberate secondary grid.

#### What "verified" means here, precisely

Gates run after every commit, all green on the final tree:

- `npm run lint` — clean.
- `npm test` — **134/134** pass, up from 121 on `main`.
- `npm run build` — succeeds.
- Grep — old identifiers (`safeUrl`, `parseHandoffEntries`, `ARCHIVE_REPOS`,
  the `localeCompare` sort) confirmed **absent** from `App.jsx`; every new
  class name confirmed present in **both** `App.jsx` and `App.css`.
- Dev server on `:5177` — `/`, `main.jsx`, `App.jsx`, `archive.js`, `timeline.js`
  all serve HTTP 200 with zero transform errors, and the served `App.jsx`
  resolves `from "/src/archive.js"`. This proves the module graph and JSX
  compile; it does **not** prove the pages look right.

🛑 **No section has been seen rendered.** `chrome-devtools-mcp` refused to
attach (`browser is already running for .../chrome-profile`) — the same
friction the 2026-09-26 handoff records. Combined with the Supabase login,
that means **layout correctness is asserted from code and CSS, not observed.**
Treat all three as `Done (pending Taylor visual)`.

**Blocked on Taylor (3):** the visual check above; Calendar's sort fix has no
real events to prove itself against (`horizon_events` is empty); Career's
changes have never met real `dashboard_jobs` rows.

### Parking lot count

**47 items** across 12 headings in `PARKING_LOT.md`, including **5 that would
need a schema change** and were therefore not built.

### Decisions I need from you

1. **Career pipeline cap: is 25 right?** It is a guess. The alternative is
   pushing a `.limit()` into the Supabase query, which cuts the payload but
   means the counts in the panels above stop matching the list below.
2. **Archive grouping: by date or by repo?** I chose date because handoffs are
   read chronologically. By-repo would make it a per-project history instead.
   Both are one line to switch.
3. **Should the `warroom-merge` branch and this `sh-layout-v1` branch merge to
   `main`, and when?** This pass is branch-only by your instruction, so nothing
   is live yet. NORTH_STAR §9 gate item 6 (deploy verified) cannot pass until
   it merges.
4. **NORTH_STAR Q12 is still open** — Needs Attention sits below the hero, not
   in the IA's right-hand column. Unrelated to this pass, but it is the one
   Home decision still waiting on you.
5. **Add one event in Calendar and one more task in Flow.** Not a decision, but
   it is the cheapest thing that turns three "never seen with real data"
   caveats into verified behavior.

### Shipped

**Merged and deployed 2026-09-29.** `origin/main` is `8e143d4`; the Pages run for that sha reports `completed / success` (run 36627212047), checked via the REST API rather than assumed. Gate items 1-7 pass. Item 8 (Taylor sees it live) is closed for Archive and Career, which she reviewed on localhost before the merge.

Two things changed after the report above was written, both from her review: the Career cap became a **Show all N** toggle rather than a hard 25, and Archive became a **sortable, filterable table** rather than a date-grouped card feed. Final test count **153**, not 134.

### The single next step

**Run `npm run dev`, sign in, and look at Career and Archive.** They are the two
sections that changed shape. Everything else on the branch is unchanged, and
the gates are green without your eyes.
