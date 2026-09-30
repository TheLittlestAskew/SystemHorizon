# NORTH STAR: System Horizon

> The standing goal and operating contract for autonomous work on this repo.
> Written 2026-09-24 with Taylor. Owner: Taylor. Executor: Claude Code (local, Remote Control).
> This file says **what SH is for and how to build it**. `HANDOFF.md` says **where the last session stopped**. They never duplicate each other.

---

## 0. Session start protocol (Claude Code: do this first, every session)

1. `git pull` on `main`. If the tree is dirty or behind, stop and reconcile before anything else.
2. Read, in this order: `AGENTS.md` (handoff contract), `HANDOFF.md` (live session state), this file, `docs/Horizon-Home-Information-Architecture.md` (the approved Home spec).
3. Find the **first milestone in the Status table (section 10) that is not `Done` and not `Blocked`**. That is the job. If every remaining milestone is blocked, work the Side Quest list (section 11). If that is blocked too, send Taylor one push notification listing every open question and stop.
4. Run the milestone per section 8 (skills and models), gate it per section 9, bank it per `AGENTS.md`.
5. Update the milestone's row in the Status table in the same commit as the handoff (`docs: handoff update (<sha>)`).
6. Continue to the next unblocked milestone. Do not stop between milestones to ask permission to continue.

**Ignore these sources. They describe a dead architecture and will mislead you:**
- ~~The `systemhorizon-build` skill~~ — **retired 2026-09-25 (Q5)**, moved to `~/.claude/skills/_superseded/systemhorizon-build/`. It described the single-file `control-panel.html` + browser-Babel era, React 18 UMD, Davies branding. It should no longer auto-load at all; if it does, something restored it, and that is a bug worth reporting.
- `SystemHorizon_Master_Context.md` and any other Claude Project knowledge file about SH.
- `meridian-keystone.html` and `push-status-to-systemhorizon.ps1` as architecture references. They point at a different Supabase project and table. Do not retarget or merge them based on naming.

The live repo is the only source of truth for code. The live Supabase database is the only source of truth for schema.

---

## 1. North star

**System Horizon is Taylor's personal task, project, and life management visualizer.**

It is the calm, actionable front end for her work and life systems. Septentrion (the Obsidian vault, its collectors, and repo handoffs) remains the deeper collection, history, and source-of-truth layer. SH shows, prioritizes, and lets her act. It does not become a second vault.

The Home page answers one question first:

> What needs my attention now, and what is the next true thing?

### Tiebreaker test

When a scope call is unclear, ask: **does this help Taylor see what matters and act on it with less decision fatigue?** If it adds a surface to look at without changing what she does next, it does not ship.

### Who uses it

One person. Taylor has ADHD (working memory gaps, time blindness, hyperfocus). Design consequences, not decoration:
- One primary focal point per screen. Never a wall of equal-weight cards.
- State must be visible at a glance. Nothing important hides behind a click.
- Capture must be instant and never lose a thought.
- Fewer, clearer states beat more granular ones.

---

## 2. Non-goals

SH will never be:
- A second source of truth for anything Septentrion or an external service already owns (job pipeline, handoffs, return points, reading history, Google Calendar).
- A general widget collection or a metrics wall. No decorative numbers without a decision attached.
- A multi-user app. No sharing, roles, or teams.
- A writer to repo `HANDOFF.md` files, `Return Point.md`, or Ephemeris notes. SH may label a task as a handoff candidate; only a real implementation session promotes it.
- A two-way calendar. Google Calendar flows into SH only.
- A place for private health, medication, doctor-topic, or family-gift content in any repo text. **This repo is public.** Anything written in code, comments, migrations, commit messages, or docs is world-readable.

---

## 3. Information architecture (locked 2026-09-24)

This **amends** the five-area model in `docs/Horizon-Home-Information-Architecture.md`. That doc stays authoritative for the Home page layout and build sequence; this section supersedes its area list.

### Navigation

| Nav item | Contains | Quest tier |
|---|---|---|
| **Calendar** | Calendar view | Utility (see below) |
| **Horizon** | Home | Main |
| **Projects** | Projects, Flow | Main |
| **Career** | Career | Main |
| **System** | Mirrors, Archive | Main |
| **Side Quests** | Swift, War Room, Travel, Reading (when built) | Side |

Rules:
- **Calendar is a utility, not an area.** Render it as a pinned hot link, visually separate from the area groups (no group header, no chevron, no area card, no field-status slot). It should read like a tool in a toolbar, not a project. It sits at the top of the nav, above Horizon. It keeps the same active-state treatment as other nav items.
- **Single-view areas (Horizon, Career) render as direct links**, not collapsible groups with one child.
- **Side Quests is collapsed by default.** It must look lower-priority than the main areas (quieter weight, not hidden).
- **Life is retired as a concept.** Travel moved to Side Quests; Calendar became a utility. Do not recreate a Life group.
- Preserve existing behavior: persistent collapse state, the icon-only rail toggle, the left-accent active bar, and the 1000px / 680px responsive breakpoints.
- Icons: sparing, thin uniform stroke (~1.5), rounded caps and joins, outline only. Taylor dislikes icon-heavy UI.

### Home field-status strip

The IA doc's strip becomes: **Horizon | Projects | Career | System**. Side Quests and Calendar do not get a slot. The Today and Next timeline still reads calendar data; being a utility in the nav does not remove Calendar data from Home.

### Naming collision to respect

The Projects registry has a **project area** called `Sidequests` (Invisible String Theory, Swiftwatch, Fantasy Football). The nav group **Side Quests** is a different concept. Do not merge, rename, or reconcile them without asking (see Open Questions).

---

## 4. Architecture contract

| Thing | Value |
|---|---|
| Framework | React 19 + Vite 8, plain JSX, no TypeScript |
| Lint / test / build | `npm run lint` (oxlint), `npm test` (`node --test src/*.test.mjs`), `npm run build` |
| Main files | `src/App.jsx` (~95 KB), `src/App.css` (~140 KB, contains a base64 hero image), `src/WarRoomView.jsx`, `src/warRoomLogic.js` |
| Deploy | Every push to `main` triggers `.github/workflows/deploy-pages.yml` and goes live at `sh.tayloraritchie.com` |
| Access | Cloudflare Access gates the live site to Taylor. The app also requires a Supabase login |
| App database | Supabase project `drtvlcgyjlofaffbwael` (named `aftermath-atlas-dev`), client in `src/supabase.js` |
| Job pipeline | Supabase project `vtrtyagltwdrbastpppl`, read-only from SH via `src/jobPipeline.js` (`dashboard_jobs`) |
| Heartbeat | Supabase project `qzliydcrlhioradwacmd`, table `projects`. **Nothing in `src/` reads it. Do not touch it** |

### Database rules (from the 2026-09-20 live audit; every new table must match)

- Table prefix `horizon_`.
- `owner uuid not null references auth.users(id) on delete cascade`.
- RLS enabled, policies scoped to role `authenticated`, `owner = auth.uid()` for every command.
- `revoke all on <table> from anon`.
- An owner-scoped index.
- `updated_at` maintained by the existing `set_horizon_updated_at()` trigger if the table has that column.
- Enum-like text columns get a `CHECK` constraint (the Swift tables currently lack this; do not repeat that gap).
- Every schema change ships as a timestamped file in `supabase/migrations/` **and** is applied live via the Supabase MCP `apply_migration`. Confirm with `list_migrations` afterward. File and live state must never diverge again.
- Other schemas in the same project (`campaigns`, `rolls`, `moments`, `showcase`) belong to Aftermath Meridian. Do not touch them.

### Code rules

- Upsert or update only the changed record. Never write whole arrays.
- Handle errors explicitly and visibly. No silent fallbacks, no empty `catch {}`.
- No dead code. When you replace something, remove what it replaced in the same change.
- No new state in `localStorage` except per-device conveniences (collapse state, last tab). War Room's `warroom_sh_v1` is a documented, temporary exception.
- Secrets never enter the repo. The Supabase publishable key in `src/supabase.js` is intentionally public; nothing else is.
- Adding npm dependencies is allowed, but prefer none. A new dependency needs a one-line justification in the commit body and a `package-lock.json` refresh.

---

## 5. Source-of-truth boundaries

| Owner | Owns | SH's relationship |
|---|---|---|
| **SH** (`horizon_*` tables) | Tasks, projects registry, Now, Capture inbox, events Taylor creates in SH | Canonical. SH reads and writes |
| **Google Calendar** | Taylor's real calendar | SH pulls a read-only copy. Never writes back |
| **Septentrion vault** | Return points, Ephemeris, generated digests, collectors in `Scripts/` | SH may read generated outputs. Never writes vault files from the app |
| **Repo `HANDOFF.md` files** | Banked implementation state per repo | SH never writes them. Parsed mechanically by `septentrion-sync`, so never restructure one |
| **Job pipeline** (`dashboard_jobs`) | Career data | Read-only |
| **StoryGraph** | Reading history | Future read-only copy via a separate Worker (Side Quest) |

The vault is reachable only through the local filesystem (`C:\Users\theli\Obsidian Vaults\Septentrion\`). The GitHub connector cannot reach `TheLittlestAskew/septentrion`.

---

## 6. Autonomy tiers

Taylor's rule: **ask before deleting.** Everything else in scope may proceed.

### GREEN: do it, report it in the handoff
- Edit, create, and refactor code within the current milestone's scope.
- Push to `main` **after** the section 9 gate passes.
- Create new tables, add nullable columns, add indexes, triggers, policies, and constraints that existing rows already satisfy (check first with a `select count(*) ... where not (<constraint>)`).
- Insert or update rows Taylor's workflow expects (for example, the Projects re-seed).
- Add npm dependencies with justification.
- Move files with `git mv` (moving is not deleting).
- Update `TOOLS.md`, `HANDOFF.md`, and this file's Status table.

### RED: stop, ask, and move to the next unblocked milestone
**"Deleting" is read broadly.** Ask before any of these:
- Removing any **pre-existing** file, view, nav item, component, or feature (cleanup of code you replaced in the same change is fine).
- Dropping or renaming tables or columns, or deleting rows.
- Any migration that can lose data: type changes (for example `horizon_events.start_time` text to `timestamptz`), `not null` on a column with nulls, constraints existing rows violate.
- Deleting branches (including the stale `warroom-merge`).
- Overwriting content outside this repo (skills in `~/.claude/skills/`, vault notes).
Also RED, though not deletions:
- Anything that needs credentials only Taylor can create (Google Cloud OAuth client, API keys).
- Anything needing Taylor's eyes on the live, logged-in app (see section 9, UI check).
- Scope expansion beyond the milestone's written acceptance criteria.

---

## 7. Question protocol

Taylor is not watching the terminal. She is reachable by phone.

1. When you hit a RED item, write the question into section 12 (Open Questions) with: the milestone, the exact decision needed, your recommended answer, and what you will do by default if she agrees.
2. Send **one** Remote Control push notification per blocking batch, not one per question. Format: `SH: <n> decisions needed for <milestone>. Recommended answers are in NORTH_STAR.md section 12.`
3. Mark the milestone `Blocked: <reason>` in the Status table and move on to the next unblocked milestone or Side Quest. Do not idle.
4. Batch. If you can foresee a milestone's other decisions, ask them in the same notification.
5. When she answers, record the answer under the question (`Answered YYYY-MM-DD: ...`), then unblock the milestone.
6. Never ask whether to continue to the next milestone. Never ask about things this file already decides.

---

## 8. Skills, models, and tools

### Skills (invoke by name)

| Skill | When |
|---|---|
| `karpathy-guidelines` | Before and during every code change |
| `minimal-diff` | Every edit. Solve the milestone, not the neighborhood |
| `verified-done` | Before any "done", status update, or handoff |
| `root-cause-first` | Any bug, failing gate, or unexpected output. Also after a fix that did not work |
| `finish-the-turn` | Before asking any question or ending a turn |
| `handoff` + `AGENTS.md` | Every banked change. `AGENTS.md` wins where they differ (label `Claude Code`, update DO NEXT only when it truly changed) |
| `delegation-protocol` | Milestones with independent parallel strands (see below) |
| `cynosure` | Any UI or styling work |
| `tufte` | Any chart, meter, sparkline, or status visualization |
| `evidence-audited-analysis` | Any ranking, aggregation, or "the data shows" logic (Needs Attention, Active Work ranking) |
| `lessons-ledger` | End of any session where something non-obvious was learned |

`systemhorizon-build` was **retired 2026-09-25** (Q5) and moved to `~/.claude/skills/_superseded/`. It should no longer auto-load. `cynosure` is now the only skill that routes SH styling, and its `brand-hooks.md` points back here rather than restating the architecture contract.

### Models

Run as orchestrator with `delegation-protocol` **only when the milestone decomposes into 3+ independent strands** (for example: migration + data mapper + UI + tests). The protocol's own triage says it costs roughly 10x the tokens of direct work and should decline small jobs; respect that. Taylor is on a budget.

| Tier | Use for |
|---|---|
| Haiku | Mechanical: greps, renames, moving files, formatting, extracting values, boilerplate SQL from an exact spec |
| Sonnet | Default executor: routine components, mappers, migrations with a known shape, tests |
| Opus | Architecture, ambiguous scope, ranking logic, OAuth flow design, anything Sonnet failed twice |
| `standards-researcher` | Phase 0 lookup of one reputable authority per task type (official docs first) |

Workers never spawn workers. Single-file, tightly coupled edits (most of `App.jsx`) go direct, not delegated.

### Tools

- **Supabase MCP** on project `drtvlcgyjlofaffbwael`: `list_tables`, `execute_sql` (read-only queries), `apply_migration`, `list_migrations`.
- **chrome-devtools-mcp**: visual checks against the local dev server after Taylor logs in. Never build a standalone static preview as a workaround for the login (see the 2026-09-21 handoff friction).
- **Filesystem**: vault at `C:\Users\theli\Obsidian Vaults\Septentrion\` (for the Task Digest only).
- **Remote Control**: push notifications for questions and milestone completions.
- **git / npm / node**: local.

### Phase 0 (every milestone)

Before building, confirm the current official approach for anything with an external standard (Google Identity Services, Supabase RLS, React 19 APIs, WCAG for nav). Write 3 to 7 yes/no acceptance criteria into the milestone if they are missing, with at least one executable check. Label criteria you wrote yourself as `orchestrator-defined`.

---

## 9. Definition of done (the gate)

A milestone is `Done` only when **all** apply:

1. `npm run lint` clean.
2. `npm test` passes. New logic (mappers, rankers, aggregators, date handling) ships with `node:test` tests in `src/*.test.mjs`, including edge cases (empty data, nulls, time zones, over-limit counts).
3. `npm run build` succeeds.
4. Grep confirms removed identifiers and selectors are fully absent and new ones are present exactly where intended.
5. Any migration exists as a file **and** is applied live; `list_migrations` shows it; a `select` confirms the expected columns and constraints.
6. Pushed to `main`, and the GitHub Actions deploy run for that commit succeeded (check the run status, do not assume).
7. Handoff banked per `AGENTS.md`, `TOOLS.md` bumped, Status table updated.
8. **UI milestones only:** Taylor has seen it live. Start `npm run dev`, send a push asking her to log in, verify with chrome-devtools-mcp at desktop, 1000px, and 680px widths, then mark `Done (pending Taylor visual)` until she confirms. Proceed to non-dependent milestones meanwhile.

A 200 response from any tool is not verification. Re-read the actual state.

---

## 10. Milestones (main quests, in order)

### Status

| # | Milestone | Status |
|---|---|---|
| M0 | Environment check + housekeeping | Done: `ac3ccf7` |
| M1 | Nav migration to the locked IA | Done: `e5e335f` (Taylor confirmed live 2026-09-26) |
| M2 | Projects re-seed + round trip | Done: `766eb6e` (Taylor confirmed live 2026-09-26), re-seed run by Taylor 2026-09-26. 🛑 **M2's plan was unrunnable as written** — the seed button only rendered in the empty state and the table has 16 rows, so signing in gave the seed path no trigger; an always-available "Re-sync registry" button fixed that. **Data verified:** all 16 rows `match` the code registry on `area` and `parent_name`, 0 duplicate `(owner,name)` pairs, 0 phantom `Swift`, 0 broken parent links. Only the Projects-page visual check remains |
| M3 | Home: persistent Now + Capture (IA step 1) | Done: `830f2b6` (+ `8f9799c` migration filename fix). Taylor confirmed live 2026-09-26: Ctrl+K popover, Enter-saves, capture → Make task → Set as Now, and Now surviving a reload |
| M4 | Home: Needs Attention aggregator (IA step 2) | Done (pending Taylor visual): `a9aae74`. 19 new tests (75 total). ⚠️ Placed as its own stacked section between the hero and the instrument grid, **not** as the IA's right-hand column beside Now: the hero is already a 2-column grid holding stage copy and the Now console, so the IA layout would mean restructuring a pre-existing design. Raised as Q12 |
| M5 | Home: Today and Next timeline (IA step 3) | Done (pending Taylor visual): `f3139d3`. 17 new tests (92 total). ⚠️ `horizon_events` is **empty**, so this has never rendered with real data: add one event in Calendar before judging it, or Home will only ever show "Nothing scheduled ahead" |
| M6 | Home: three ranked Active Work return points (IA step 4) | Done (pending Taylor visual): `3aa4099`. Ranking input answered 2026-09-27: **recency of activity**. 13 new tests (105 total). 🛑 **The input was broken before it was used** — the re-seed had stamped all 16 rows with one `last_activity`, so recency could not discriminate. Semantics fixed (DB default, client no longer writes it) and the tie is disclosed in the UI. ⚠️ **Nothing writes `last_activity` on real activity yet, so it stays tied: Q14** |
| M7 | Home: field-status strip (IA step 5) | Done (pending Taylor visual): `1ac7d17`. 16 new tests (121 total). Exercised against the real live state: No Now set / 12 active, 2 need attention / contacts this week / 2 flagged, 11 repos tracked |
| M8 | Google Calendar one-way sync | Blocked: Taylor must create the Google OAuth client |
| M11 | Career reads job data as `authenticated` | **Done (pending Taylor visual): `86a81f3`.** 18 new tests (171 total), lint clean with no new warnings, build green. No schema change, no policy, no grant — `anon` re-queried afterwards and still holds only `REFERENCES, TRIGGER`. 🛑 **Criterion 1 is unprovable from here**: it needs Taylor to sign in on Career, so gate item 8 is genuinely open, not a formality. ⚠️ The real find was that signed-out had to become a **third** state: as "no error, zero rows" it made the field-status slot render "0/3 contacts" and `needsAttention` fire a GDOL shortfall, both invented from absent data |
| M9 | Handoff-aware task fields | Not started |
| M10 | Horizon Task Digest (Septentrion side) | Not started |

Status values: `Not started` · `In progress` · `Blocked: <reason>` · `Done (pending Taylor visual)` · `Done: <short-sha>`.

🛑 **Milestone numbers are creation order, not build order.** Build order is the **row order of this table**, top to bottom. They stopped agreeing on 2026-09-30 when M11 was sequenced ahead of M9, and renumbering was rejected on purpose: `HANDOFF.md` and its archive refer to these milestones by number in dozens of places, and renumbering would silently repoint every one of them.

**Current build order: M11 → M9 → M10.** The detailed spec sections below stay in **numeric** order, so M11's contract sits after M10's. Read the table for *what is next*, the section for *how to build it*.

**M8 rule:** the moment Taylor reports the OAuth client exists, M8 jumps the queue and becomes the next milestone, even mid-sequence (finish the current milestone first).

---

### M0: Environment check + housekeeping

**Goal:** a verified, clean starting line.
- Confirm: clean tree, `npm ci`, lint / test / build all pass on current `main`; Supabase MCP reaches `drtvlcgyjlofaffbwael`; Remote Control push works (send a test push).
- Audit the current Home view against `docs/Horizon-Home-Information-Architecture.md`. Write a short gap table into the M0 handoff entry (what exists, what is missing, what is browser-only). Known: Quick Capture is browser-memory only.
- Confirm `horizon_projects` row count (reported as 0).
- `git mv storygraph-mcp-spec.md docs/side-quests/storygraph-mcp-spec.md`.
- Replace the stock Vite `README.md` text with a short pointer: what SH is (section 1, one paragraph) and links to `AGENTS.md`, `HANDOFF.md`, this file. (Replacing template boilerplate is GREEN.)
- Add an "Amended 2026-09-24" note to the IA doc's area section pointing here. Edit, do not remove its original text.
- **RED, ask:** propose a rewrite of the `systemhorizon-build` skill so it describes the current Vite architecture (or retire it). Show the diff in Open Questions; do not overwrite it.

**Done when:** gates pass, gap table is in the handoff, files moved, README replaced.

### M1: Nav migration to the locked IA

**Goal:** the nav matches section 3 exactly.
- Rework the nav group config near the top of `src/App.jsx` and matching CSS.
- Calendar becomes a pinned utility link at the top; Horizon and Career become direct links; Projects (Projects, Flow) and System (Mirrors, Archive) stay groups; Side Quests (Swift, War Room, Travel) is a group, collapsed by default.
- No view is removed or renamed. Every existing view stays reachable.

**Acceptance:**
- Nav order is exactly: Calendar (utility), Horizon, Projects, Career, System, Side Quests.
- No "Life", "Core", or "Life & Watch" labels remain (grep).
- Every view reachable in one or two clicks; keyboard focus order follows visual order; active state visible on all items including Calendar.
- Collapsed rail still works; 1000px and 680px layouts do not overflow horizontally except the intended mobile nav scroll.
- UI check with Taylor (gate item 8).

### M2: Projects re-seed + round trip

**Goal:** `horizon_projects` holds the real registry and survives a reload.
- Ask Taylor (push) to log in to the local dev server so the app's own seed path (`initializePortfolioRegistry`) runs as her user. Do not seed by hand with a guessed owner id.
- Verify with SQL: 16 projects, correct `area` values (Ops & Infra, Aftermath, `Undercroft`, Sidequests, Career, Learning — spelling settled in Q6, 2026-09-25), correct `parent_name` links (Swiftwatch under Invisible String Theory, Aftermath Meridian under Rectrix Caedere).
- **Known starting state (measured 2026-09-24, see Q6):** 8 of the 16 rows are wrong — 7 bad `area`, 2 missing `parent_name`. Expect the seed to correct exactly those 8 and leave the other 8 untouched. Re-run the Q6 join query afterward; a clean run returns 16 `match` verdicts.
- Reload the app and confirm no duplicate seed (the `unique(owner, name)` upsert holds).
- Complete the outstanding Projects visual verification from `HANDOFF.md`: area card counts and signal averages, card-click filtering, accordion height (`calc(100dvh - 40px)`) balance, project name opens detail page.

### M3: Home, persistent Now + Capture (IA step 1)

**Goal:** Now and Capture stop living in browser memory.
- **Capture:** new table `horizon_capture` (`id`, `owner`, `body text not null`, `created_at`, `routed_kind text null` with CHECK in (`task`, `event`, `project_note`, `dismissed`), `routed_id uuid null`, `routed_at timestamptz null`). Header control per the IA doc: always available, one keystroke to open, Enter saves, never loses text on failure (show the error and keep the text).
- **Now:** the one next true thing references an existing task. Default design: a `horizon_now` table keyed on `owner` (one row per owner) with `task_id` referencing `horizon_tasks(id) on delete set null`, `note text null`, `set_at`. Opus may propose a simpler shape (for example a column on tasks) with a written reason in the handoff.
- Routing a capture into a task is in scope; routing UX beyond "make it a task" or "dismiss" is not.

**Acceptance:** capture persists across reload and devices; failed save shows an error and preserves input; Now survives reload; tests cover empty body, whitespace-only body, routing state transitions, and a deleted Now task.

### M4: Home, Needs Attention aggregator (IA step 2)

**Goal:** at most five alerts, each with an explicit reason and date.
- Sources: Career (`dashboard_jobs`, read-only: real deadline, reporting-gap risk, high-fit lead needing action) and Mirrors (`horizon_repo_health`: unbanked handoff, uncommitted, unpushed, drift, failed check).
- Pure aggregator function with tests; the component only renders its output.
- Color reserved for status: stable uses the current primary accent, awareness amber, action-needed coral. No rainbow.
- Empty state is a calm "nothing needs you" line, not a blank box.

**Acceptance:** never more than 5; deterministic order (severity, then date); tests for 0, 5, and 12 inputs, missing dates, and a source that errors (the other source still renders, the error is shown).

### M5: Home, Today and Next timeline (IA step 3)

**Goal:** a short chronological list, not a mini calendar.
- Reads `horizon_events` (and dated tasks if present). Designed so Google events from M8 drop in with no layout change.
- ⚠️ `start_time`/`end_time` are free-form text today. Parse defensively for display. Do not change the column type (RED). Record parse failures visibly rather than hiding events.

**Acceptance:** chronological; handles all-day, missing times, unparseable times, and past-today items; tests for each.

### M6: Home, three ranked Active Work return points (IA step 4)

**Goal:** replace any all-project radar with exactly three ranked projects, each showing name, return point, and health signal.
- Ranking is judgment, so it is Opus work with `evidence-audited-analysis`. Propose the ranking inputs (for example recency of activity, open task count, signal, Mirrors flags) in Open Questions **before** building, with a recommended default. This is a scope decision, so it is RED until Taylor picks.

### M7: Home, field-status strip (IA step 5)

**Goal:** thin strip, Horizon | Projects | Career | System, each a compact state signal linking to its area. No Side Quests or Calendar slot.

### M8: Google Calendar one-way sync

**Blocked until Taylor creates a Google Cloud OAuth client.** Prep that is GREEN before then:
- Phase 0 research (official Google Identity Services docs): the correct flow for a static SPA with no backend, required OAuth client type, required authorized JavaScript origins (expected: `https://sh.tayloraritchie.com` and the local dev origin), minimum scope (read-only calendar), token lifetime, and behavior behind Cloudflare Access. Write findings plus the exact console steps Taylor must follow into Open Questions so she can do her part in one pass.
- Design (do not apply without the answers): additive columns on `horizon_events` such as `source text` with CHECK (`sh`, `google`) and `external_id text` with a `unique(owner, source, external_id)` for dedupe.
- RED decision to raise with a recommendation: how text `start_time`/`end_time` reconcile with RFC 3339 datetimes (add typed columns alongside, versus migrate the type).

Build rules once unblocked:
- Pull only. Never write to Google.
- No Google tokens stored in Supabase, the repo, or `localStorage`.
- Sync on demand from an in-app button on the Calendar view (plus optionally on Calendar open). No background scheduler.
- Google events are visually distinguishable from SH-native events and read-only in SH.
- Re-running sync never duplicates; deleted or moved Google events update the SH copy on the next sync.

### M9: Handoff-aware task fields

**Goal:** SH can mark a task as a handoff candidate without becoming a second handoff system.
- Smallest change: reliable `updated_at` (existing trigger) plus `promotion_state text not null default 'none'` with CHECK in (`none`, `candidate`, `promoted`) on `horizon_tasks`.
- UI: a quiet toggle to mark a task `candidate`. SH never sets `promoted`; a real implementation session does.

### M10: Horizon Task Digest (Septentrion side)

**Goal:** a generated, read-only vault note summarizing active work, waiting blockers, handoff candidates, and recently completed tasks.
- Reuse the local collector pattern of `Scripts/mirror-freshness/`, `Scripts/swiftwatch-sync/`, `Scripts/travel-watch-sync/` in the vault. No new scheduler inside SH.
- Writes one new note only. Never touches `HANDOFF.md`, `Return Point.md`, or Ephemeris.
- Scheduling via Windows Task Scheduler is Taylor's step; write the exact steps and remind her to check the trigger's **Enabled** box.
- After this lands, the optional Obsidian embed question gets revisited (default answer: a plain link plus the digest).

### M11: Career reads job data as `authenticated`

**Goal:** the Career view shows real job rows, without publishing the job search.

Added 2026-09-30 on Taylor's go-ahead. Full evidence and the rejected alternatives
are in `docs/v1-decisions-needed.md` D1; this section is the build contract.

#### Why this milestone exists

Career is the only section of the app that is **broken rather than unfinished**.
`src/jobPipeline.js` connects to project `vtrtyagltwdrbastpppl` with the `anon` key
and `persistSession: false`, so it never signs in. Verified live 2026-09-30:

- `dashboard_jobs` is a **view** with `reloptions` NULL, so `security_invoker` is
  unset and it runs as its owner, **bypassing RLS**.
- Its grants are `authenticated` + `service_role`. **`anon` holds nothing on it.**
- `job_applications` has RLS on with **exactly one** policy,
  `authenticated_full_access` (ALL, role `authenticated`, `USING (true)`), and
  `anon` holds only `REFERENCES, TRIGGER`.
- Both objects hold **345** rows.

🛑 **The forbidden fix:** `grant select on dashboard_jobs to anon`. It would work
and it would publish all 345 rows past RLS, because the anon key for that project
is committed at `src/jobPipeline.js:4` in this **public** repo. An `anon` read
policy on `job_applications` was added 2026-09-22 and deliberately removed again
by the 2026-09-28/29 privacy wave. **Do not re-open it.**

✅ **The precedent to copy:** `taylorritchie/tracker.html` reads these same tables
successfully because it signs in (`tracker.html:211`). SH's Career is the only
consumer in the ecosystem reading job data as `anon`, which is why it is the only
one broken.

#### ✅ Phase 0 — DONE 2026-09-30. The design holds.

Checked three ways: the **shipped source** in `node_modules`
(`@supabase/supabase-js` **2.110.9**, the exact code this repo builds against), an
**empirical run** instantiating both clients, and the **upstream guidance** on the
warning itself. Source and experiment beat docs here, so all three are recorded.

**1. Session isolation: ✅ automatic, and no `storageKey` needed.**

`SupabaseClient` derives the key from the project URL:

```js
let i = `sb-${r.hostname.split('.')[0]}-auth-token`   // r = new URL(supabaseUrl)
```

`hostname.split('.')[0]` **is** the project ref, so the two clients cannot collide.
Confirmed by running them:

| Client | Derived `storageKey` |
|---|---|
| `src/supabase.js` (app, `drtvlcgyjlofaffbwael`) | `sb-drtvlcgyjlofaffbwael-auth-token` |
| `src/jobPipeline.js` (jobs, `vtrtyagltwdrbastpppl`) | `sb-vtrtyagltwdrbastpppl-auth-token` |

▶ **Do NOT set `storageKey` explicitly.** It would restate a library default, and
hardcoding `sb-vtrtyagltwdrbastpppl-auth-token` could silently drift from the URL
it is supposed to mirror. **Instead assert it**: `client.auth.storageKey` is
readable (that is how the table above was produced), so a test that the two keys
differ is a real guard that fails loudly if the library default ever changes. That
is stronger than configuration.

**2. Two clients on one page: ✅ no warning, and the caveat does not apply.**

The warning fires only on `this.instanceID > 0`, and the counter is namespaced per
key (`nextInstanceID[this.storageKey]`). With distinct keys **both clients are
instance 0** — verified, both reported `instanceID: 0`. The upstream wording is
also explicitly scoped: *"may produce undefined behavior when used concurrently
**under the same storage key**."* Different keys, different hazard class.
Cross-tab sync is per key too (`new BroadcastChannel(this.storageKey)`).

**3. Token refresh: ✅ no contention.**

The Web Lock is named `` `lock:${this.storageKey}` ``, so the two clients take
**different** locks and never serialize against each other. `autoRefreshToken` can
stay on for both.

🛑 **What this means for the build:** the one risk that could have invalidated the
design did not materialize. Proceed with a second authenticated client. If a future
`@supabase/supabase-js` upgrade changes the key derivation, the assertion from (1)
is what catches it.

#### The `localStorage` question, resolved

Section 4 says "no new state in `localStorage` except per-device conveniences".
A persisted auth session is the auth library's own storage, not app state, and
⚠️ **the main client already does it**: `src/supabase.js` calls
`createClient(url, key)` with no options, so `persistSession` defaults to `true`
and it already writes an auth token to `localStorage` — **confirmed in Phase 0**,
which read its derived key (`sb-drtvlcgyjlofaffbwael-auth-token`) off the live
client. So this milestone introduces **no new kind of storage**: it adds a second
key beside one that has always been there, written by the auth library rather than
by app code. Treated as **GREEN** on that evidence.

⚠️ Taylor can still veto it. If she reads §4 strictly enough to exclude auth
sessions, the fallback is `persistSession: false` with an in-memory session, which
costs one sign-in per tab and changes nothing else in this milestone.

#### Build rules

- **No schema change, no new policy, no new grant.** The existing
  `authenticated_full_access` policy already permits exactly what Career needs.
  A diff touching `supabase/migrations/` means the approach drifted.
- Flip `src/jobPipeline.js` from `persistSession: false` to a persisted session,
  and add a sign-in control **on the Career view only**. Career is the only
  consumer of that client.
- 🛑 **Never** store a password, a service-role key, or a token in the repo,
  in Supabase, or in the built bundle. Session only, created by Taylor signing in.
- **Three distinct states, three distinct messages.** No silent fallbacks
  (section 4): *not signed in* (actionable, offer the sign-in control), *signed in
  but the read still failed* (a real bug, say so loudly), and *network or project
  unreachable*. ⚠️ The current UI explains a **permission** error; that copy is
  wrong once auth exists and must be replaced, not added to (no dead code).
- Signing out of the job project must not sign Taylor out of the app, and vice
  versa.
- Keep the shipped v1 layout: the status filter, the cap, and the **Show all N**
  toggle all stay. This milestone changes where the rows come from, nothing else.
- Auth-state to UI-state mapping goes in a pure function with tests, like
  `src/needsAttention.js`. Do not test it only through the component.
- 🛑 **"Signed out" must be a distinct state on Home too, not just on Career.**
  Found 2026-09-30 by reading the code, and this is the trap in this milestone:
  passing signed-out through as *"no error, zero jobs"* makes **two** Home surfaces
  state falsehoods about GDOL compliance from absent data.
  - `fieldStatus.js` `careerSlot` would render **"0/3 contacts · 3 more this
    week"** — a claim about her week, invented from an empty array.
  - `needsAttention.js` would fire `career:gdol-shortfall` — **"3 more work-search
    contacts needed by <date>"** — a fabricated compliance alert.

  Both are exactly the silent fallback §4 forbids, and they are the surfaces
  closest to her unemployment reporting, so they are the ones that must not guess.
  ⚠️ **Reusing the existing `jobError` string for signed-out is also wrong** — it
  would make Home cry "Career unavailable" in coral for a state that is one click
  from resolved. Signed-out is a **third** state and needs its own channel.

#### Acceptance criteria

1. Signed in, Career renders real rows from `dashboard_jobs` and the pipeline
   count agrees with `select count(*)` run independently.
2. Signed out, Career shows a sign-in affordance and **no** permission error.
2b. Signed out, **Home tells the truth**: the field-status Career slot does not
   claim a contact count, and Needs Attention raises **no** GDOL alert. Asserted by
   test against an empty job list in the signed-out state, not by eyeballing it.
3. A reload keeps both sessions. The app session and the job session are
   independent in both directions.
4. `git diff` touches no file under `supabase/migrations/`, and `anon` still
   holds only `REFERENCES, TRIGGER` on `job_applications` afterwards — re-query
   to prove it, do not assume.
5. No secret in the diff or the built bundle.
6. Section 9 gates: `npm run lint` clean, all tests pass, `npm run build` green.
7. ⚠️ Gate item 8 (Taylor sees it live) **cannot be self-verified** — this
   milestone is unprovable without her signing in, so the handoff must say
   `Done (pending Taylor visual)` and not `Done` until she confirms rows render.

#### Out of scope

- Writing to `job_applications` from SH. Career stays read-only; `tracker.html`
  and the `/apply` pipeline own writes.
- Cross-linking jobs to `horizon_projects`. It needs a cross-project join that
  does not exist (parked in `PARKING_LOT.md`).
- Anything about `gdol_work_search` or GDOL reporting. Different consumer,
  different surface.

---

## 11. Side Quests (work these only when every main quest is blocked)

| # | Side quest | Notes |
|---|---|---|
| S1 | Reading tracker | Spec at `docs/side-quests/storygraph-mcp-spec.md` (after M0). The Worker is a separate project; SH gets a Reading view in Side Quests reading a `horizon_reading` table. Public profile only, never stored credentials |
| S2 | War Room state to Supabase | Replace `warroom_sh_v1` localStorage with a `horizon_draft_board`-backed store. Draft is over, no urgency |
| S3 | CHECK constraints on Swift tables | `status` / `category` / `kind` on `horizon_swift_*`. Verify existing rows satisfy the values in `App.jsx` first; if any violate, RED |
| S4 | Delete `warroom-merge` branch | RED: ask first |
| S5 | Travel watch | Taylor-only setup steps (changedetection.io). Code does nothing unless asked |

---

## 12. Open Questions

Format: `### Q<n> · <milestone> · <date asked>` then the decision, the recommended answer, the default action if accepted, and `Answered YYYY-MM-DD: ...` once resolved.

### Q1 · M8 · 2026-09-24
Google OAuth client. Taylor creates it; Code writes the exact console steps during M8 prep. **Blocking.**

### Q2 · M5/M8 · 2026-09-24
`horizon_events.start_time`/`end_time` are text. Recommended: add typed `starts_at`/`ends_at timestamptz` columns alongside, backfill from parseable text, keep the text columns until Taylor approves removing them. Needs Taylor's answer before M8 build.

### Q3 · Housekeeping · 2026-09-24
The heartbeat (`push-status-to-systemhorizon.ps1`) feeds a table nothing in the Vite app reads. Retarget it to SH, or leave it feeding legacy pages? Not blocking any milestone.

### Q4 · Naming · 2026-09-24
Project area `Sidequests` versus nav group `Side Quests`: keep both as-is, or rename the project area? Recommended: keep as-is; they answer different questions. Not blocking.

### Q5 · M0 · 2026-09-24
**The `systemhorizon-build` skill: retire it rather than rewrite it.** Confirmed stale at `~/.claude/skills/systemhorizon-build/SKILL.md` (126 lines, last touched 2026-08-30). It describes `tayls-task-manager.jsx` compiled by `@babel/core` into a single `control-panel.html`, React 18 UMD from CDN, no import/export, and Davies-shelter framing. Every one of those is dead.

🛑 **The live hazard is its `description:` frontmatter, not its body.** It auto-triggers on "SystemHorizon", "control panel", and "React productivity app", and it asserts *"Claude cannot build SystemHorizon correctly without it."* A skill loads **before** a doc gets read, so section 0's "ignore this source" instruction arrives too late to prevent the mislead. This is the same failure shape as the `septentrion-sync` warning that sat in the file you only consult after the failure.

**Recommended: retire, do not rewrite.** A rewrite would restate section 4's architecture contract in a second location, which section 2 forbids on principle. `NORTH_STAR.md`, `AGENTS.md`, and the IA doc already carry the live architecture, and they live in the repo where the code is.

**Default action if you agree:** move the folder to `~/.claude/skills/_superseded/systemhorizon-build/` (the vault already uses a `_superseded` convention) and leave the content untouched for archaeology. One move, no deletion, reversible.

⚠️ Two things worth knowing before you answer: it is a **user-level** skill, so it is live on every repo, not just this one. And its description names your former employer and job title, which is employment detail sitting in an always-loaded file.

**This is RED on two counts** (it is outside this repo, and retiring reads as deleting), so nothing has been touched. `references/` was not read.

**Answered 2026-09-25: retire it, and fix the pointers. Done.** `~/.claude/skills/systemhorizon-build/` moved to `~/.claude/skills/_superseded/systemhorizon-build/`, all 6 files byte-untouched, nothing deleted. Added `_superseded/README.md` documenting the convention (that directory did not exist before; it is now the home for retired skills and is never loaded).

🛑 **The pointer count in Q8 was wrong — it was 5 pointers across 4 files, not 1.** Found by grepping the whole skills tree instead of trusting the one I had already spotted:

| File | What it said |
|---|---|
| `SKILLS-INDEX.md` | Index row describing the single-file/Babel/Davies build |
| `cynosure/SKILL.md` | **`description:` frontmatter** — "Defer architecture/deploy decisions to rectrix-caedere-site and systemhorizon-build" |
| `cynosure/references/brand-hooks.md` | The paragraph in Q8 |
| `rectrix-caedere-site/SKILL.md` | **`description:` frontmatter** *and* a "Not SystemHorizon" disambiguation bullet |

All five now point at this repo's `docs/NORTH_STAR.md`. The two `rectrix-caedere-site` mentions were **disambiguation guards**, so they were rewritten, not removed — the two apps genuinely look alike (both React + Supabase) and that guard still earns its place. Because the skills tree is **not** version-controlled, a copy of all four pre-edit files is at `…/scratchpad/skills-backup-2026-09-25/`.

▶ **Two of the five were in `description:` frontmatter, which is the half that actually drives auto-triggering.** A retirement that only fixes prose pointers leaves the real problem in place. Grep the whole tree before declaring a skill retired.

### Q6 · M2 · 2026-09-24
**`horizon_projects` area values disagree three ways, and nothing can satisfy all three.** Live DB (16 rows, verified by `count(*)`) has: `Aftermath` 7, `Career` 3, `Learning` 2, `Ops & Infra` 2, **`Swift`** 2. But `src/App.jsx:55` `AREA_ORDER` expects `Ops & Infra, Aftermath, **Undercroft**, **Sidequests**, Career, Learning`, and this file's M2 acceptance expects `Ops & Infra, Aftermath, **The Undercroft**, Sidequests, Career, Learning`.

So `Swift` exists only in the database, `Undercroft` exists only in the code, and `The Undercroft` exists only in this document. Invisible String Theory and Swiftwatch are currently filed under `Swift`; the code's hardcoded registry files them under `Sidequests`.

⚠️ **Also: every row's `parent_name` is null.** M2 expects Swiftwatch under Invisible String Theory and Aftermath Meridian under Rectrix Caedere. Neither link exists live, though the hardcoded registry in `App.jsx:44` does carry `parentName: 'Invisible String Theory'`.

**Recommended:** make the database match `App.jsx`'s `AREA_ORDER` (`Undercroft`, `Sidequests`), and correct M2's acceptance text in this file to drop the "The". Rationale: the code is what renders, `AREA_ORDER` drives the display sort, and "The Undercroft" appears in no code path at all. **Which spelling do you actually want?** Not blocking M1.

**🛑 Updated 2026-09-24 (M1 session, read-only `execute_sql` full-outer-join of the live table against `App.jsx`'s hardcoded registry): this is not a spelling drift. It is a different taxonomy, and M2 *does* need a re-seed.** All 16 rows are present, none missing, none extra — but only **8 of 16 match**. The other 8:

| Project | Live area | Code area | Live parent | Code parent |
|---|---|---|---|---|
| Sky Is The Limit | `Aftermath` | `Undercroft` | — | — |
| Where The Flowers Forget | `Aftermath` | `Undercroft` | — | — |
| Ashfall Britannia | `Aftermath` | `Undercroft` | — | — |
| Pacts & Power | `Aftermath` | `Undercroft` | — | — |
| Invisible String Theory | `Swift` | `Sidequests` | — | — |
| Swiftwatch | `Swift` | `Sidequests` | `null` | `Invisible String Theory` |
| Fantasy Football | `Learning` | `Sidequests` | — | — |
| Aftermath Meridian | `Aftermath` | `Aftermath` | `null` | `Rectrix Caedere` |

So **7 rows carry the wrong area and 2 are missing their `parent_name` link.** The live table is a **pre-split 5-area model**: `Undercroft` and `Sidequests` do not exist in it at all, the four campaign vaults are still lumped into `Aftermath` (making it 7 instead of 3), and `Swift` is an area that appears in no code path.

⚠️ **This is already a visible defect on the Projects page.** `AREA_ORDER` renders six area cards, so `Undercroft` and `Sidequests` are currently **empty**, `Aftermath` reads 7, `Learning` reads 2 instead of 1, and the 2 `Swift` rows fall into the trailing "area outside `AREA_ORDER`" section. That is very likely what the long-standing "Projects visual verification" item in `HANDOFF.md` would have surfaced.

**This supersedes M0's "M2 needs no re-seed" conclusion.** M0 checked `count(*)` and stopped at 16; the count was never the problem. ▶ **A row count is not a data-contract check. Compare values, not cardinality.**

**Good news:** the fix needs no new code. `initializePortfolioRegistry` upserts on `(owner, name)` and `projectToRow` writes both `area` and `parent_name`, so re-running the seed as Taylor corrects all 8 rows in place with no duplicates. That is exactly M2's existing plan, and it is GREEN — it only needs her login so the rows are owner-scoped to her.

**Two questions now, not one:**
1. `Undercroft` or `The Undercroft`? (Recommended: `Undercroft`, matching the code.)
2. **Is `Fantasy Football` a Side Quest or Learning?** The code says `Sidequests`; the live row says `Learning`; its `kind` is `'app + learning'`, which honestly supports either. This one is a real taxonomy call, not a drift, and I have no basis to pick. ⚠️ Re-seeding will silently move it to `Sidequests` unless you say otherwise.

**Answered 2026-09-25:** (1) **`Undercroft`**, matching `App.jsx`. M2's acceptance text in section 10 has been corrected to drop the "The". (2) **Fantasy Football is a Side Quest**, so the live `Learning` row is the stale one.

✅ **Both answers land on "the code is already right, the database is stale," so no code change is needed for either.** `AREA_ORDER` and the hardcoded registry in `App.jsx` stay exactly as they are, and re-running `initializePortfolioRegistry` as Taylor fixes all 8 drifted rows in one pass. **Q6 is closed; M2's only remaining blocker is Taylor's login.**

### Q7 · Process · 2026-09-24
**Six of the twelve skills section 8 mandates do not exist on this machine.** Verified against `~/.claude/skills/`: `minimal-diff`, `verified-done`, `root-cause-first`, `finish-the-turn`, `evidence-audited-analysis`, and `lessons-ledger` are all absent. `repo-handoff` is absent too, but `handoff` exists and is clearly the same thing under a different name. Present and used: `karpathy-guidelines`, `delegation-protocol`, `cynosure`, `tufte`.

This matters because section 8 reads as a contract, so a session either silently skips half of it or quietly substitutes. M0 substituted and is recording it here rather than hiding it.

**Recommended:** correct section 8 to name what exists (`repo-handoff` → `handoff`; `root-cause-first` → `superpowers:systematic-debugging`; `verified-done` → `verification-quality`), and either build the four with no equivalent (`minimal-diff`, `finish-the-turn`, `evidence-audited-analysis`, `lessons-ledger`) or drop them from the list. ⚠️ `evidence-audited-analysis` is the one with real consequences: M4 and M6 both require it for ranking and aggregation logic, so M6 in particular should not start until it exists or is formally replaced. Not blocking M1.

✅ **Resolved 2026-09-27: all six now exist.** Verified on disk, each with a `SKILL.md`, at `~/.claude/skills/`: `minimal-diff`, `verified-done`, `root-cause-first`, `finish-the-turn`, `evidence-audited-analysis`, `lessons-ledger`. They appeared between the M4 and M5 sessions, so section 8's list is accurate as written and **no renaming is needed** for those six. `minimal-diff` and `verified-done` were both invoked during M5 and both changed the outcome (see the 2026-09-27 handoff entry).

⚠️ **One correction still stands:** `repo-handoff` does **not** exist; the skill is named `handoff`. Section 8's row has been changed to say `handoff`, which is what every session has actually been using. **This unblocks M6** — `evidence-audited-analysis` exists now, so Q13's concern is closed and M6's only remaining blocker is Taylor picking the ranking inputs, which was always RED.

### Q8 · Process · 2026-09-24
**The stale-skill hazard in Q5 has a second source, and Q5's fix does not cover it.** `~/.claude/skills/cynosure/references/brand-hooks.md` carries this line under "Active brands":

> **SystemHorizon** — Single-file React control panel (GitHub Pages + Supabase). Builds go through the `systemhorizon-build` skill; it owns the build pipeline and design system. Do not restyle it from generic taste.

Every clause is wrong now: not single-file, not a control panel, not GitHub-Pages-generic (it is a Cloudflare-Access-gated custom subdomain), and `systemhorizon-build` is the skill Q5 proposes retiring. `cynosure` is section 8's mandated skill for **all** UI work, so any SH styling session reads that pointer on the way in. Retiring `systemhorizon-build` per Q5 without fixing this line leaves cynosure pointing at a skill that no longer exists.

**Recommended:** replace that one paragraph with a pointer to this repo (`docs/NORTH_STAR.md` section 4 for architecture, section 3 for the nav IA) and keep the "do not restyle from generic taste" sentence, which is still correct. One paragraph, no deletion of the file.

**RED** (outside this repo), so nothing was touched. Pairs with Q5; answer them together.

**Answered 2026-09-25: fixed, as part of Q5's retirement.** 🛑 **And this question undercounted the problem.** It named one pointer in one file; a tree-wide grep found **five across four files**, two of them in `description:` frontmatter, which is the half that actually drives auto-triggering. Full table under Q5. ▶ **I found the second pointer by accident, not by looking. The grep should have come first.**

### Q9 · Gate · 2026-09-24
**`npm run lint` passes on warnings, so gate item 1 is weaker than section 9 reads.** `oxlint` exits 0 when it emits warnings, and the repo's rules include a `"warn"` level (`react/only-export-components`). Verified by probe: a file with an unused variable produced `warning eslint(no-unused-vars): ...` **and exit code 0**. So "lint clean" currently means "no errors", not "no output".

There are **zero** warnings on `main` today, so tightening this breaks nothing right now.

**Recommended:** change the script to `"lint": "oxlint --deny-warnings"` so gate item 1 means what it says. **Default action if you agree:** one line in `package.json`, no lockfile change (verified 2026-08-29 that `npm ci` tolerates script-only edits).

Held as a question rather than done, because changing the gate is scope expansion past M1's acceptance criteria (section 6, last RED bullet). Not blocking.

### Q10 · a11y · 2026-09-24
**The nav group labels fail WCAG AA, and they did before M1.** `.nav-group-toggle` is `#6d7485` on the `#0a0b1b` sidebar = **4.17:1**, under the 4.5:1 minimum, on 10px uppercase monospace text where contrast matters more, not less. These are interactive button labels ("Projects", "System", "Side Quests"), not decoration.

Measured for comparison on the same background: `.nav-item` text `#adb5c6` = 9.48:1 ✓, and M1's new Side Quests item text `#8f97a8` = 6.65:1 ✓.

⚠️ This is why M1 made Side Quests read quieter through **item** color and icon opacity rather than by dimming its group label: the obvious move would have pushed an already-failing value further down.

**Recommended:** raise `#6d7485` to about `#8a93a6` (≈6.2:1), which stays clearly subordinate to the `#adb5c6` items. **Pre-existing and a visible color change to your design, so RED** — not touched. Not blocking.

### Q11 · Process · 2026-09-24
**Two of your instruction files disagree about how a commit message ends, and M1's commit got it wrong.** `AGENTS.md` step 1 says the last line must be `NEXT: <single next step>`. Your global `CLAUDE.md` says end every commit message with a `Co-Authored-By:` trailer. Both cannot be last.

`e5e335f` followed the global rule, so it has the trailer and **no `NEXT:` line**. It is pushed and the never-amend rule applies, so it stays wrong.

The repo's own history is unanimous the other way: `ac3ccf7`, `d93270f`, `8f4b1e1` all end in `NEXT:`, and **none** of the last four commits carries a `Co-Authored-By:` trailer.

**Recommended:** `AGENTS.md` wins inside this repo, and `NEXT:` stays last with no trailer, since `NEXT:` is load-bearing for the handoff tooling and a trailer is not. **Default action if you agree:** every further commit here ends `NEXT: ...`, and I stop adding the trailer in this repo. If you would rather keep the trailer everywhere, say so and I will put `NEXT:` immediately above it. Not blocking.

### Q12 · M4 · 2026-09-26
**Needs Attention did not go where the IA diagram puts it.** The IA's Home layout is `Large left focus: Now` / `Right alert stack: Needs attention`. But `.horizon-stage` is **already** a two-column grid (`minmax(0,1fr) minmax(280px,.48fr)`) whose right column holds the Now console and whose left holds the stage copy ("Choose the next true thing"), plus a topographic field and a coordinate readout. Putting the alert stack in that right column means either evicting Now from it or going to three columns, and either one is a restructure of a hero you designed.

**What shipped instead:** a full-width stacked section directly under the hero and above the instrument grid. It satisfies M4's actual acceptance criteria (≤5 alerts, explicit reason and date, deterministic order, reserved status colors, calm empty state) and the IA's real constraint that these "must not use interchangeable cards" — it is hairline-separated rows, not cards.

**Recommended: keep it where it is.** Reading order top-to-bottom is Now, then what needs attention, which matches the information priority (1 then 2) and keeps one primary focal point per screen. A right-hand column would make the hero compete with itself. **If you want the IA's literal layout**, say so and I will rework the hero grid as its own change with its own visual check.

Not blocking M5.

**Answered 2026-09-29: keep it where it is, and the right-hand column is superseded.** Taylor is adding an **expandable right-side panel** to the app shell, and notifications are one of the things intended to live in it. So the IA's "right alert stack" is not a hero-grid problem to solve; it is a shell-level surface that does not exist yet.

▶ **Consequence for whoever builds that panel:** do **not** move `NeedsAttention` into it by reflex. The aggregator in `src/needsAttention.js` is a pure function returning at most 5 alerts with a reason and a date, and the component only renders its output — so the same data can feed a panel without the Home section moving. Whether Home *keeps* its stacked section once the panel exists is a separate call, and a RED one, because removing a pre-existing section is a deletion under section 6.

⚠️ The panel itself is **not specified anywhere yet** — no milestone, no acceptance criteria, no decision on what else it holds. It is not in the section 10 queue and must not be started as a side effect of another milestone. Q12 is closed; the panel is a new conversation.

### Q13 · Process · 2026-09-26
**M4 shipped without `evidence-audited-analysis`, which section 8 mandates for "any ranking, aggregation, or 'the data shows' logic".** Q7 established that the skill does not exist on this machine; section 8 names it specifically for Needs Attention and the M6 ranking. M4 is aggregation, so it fell squarely in scope.

**What was done instead:** every rule is a pure function with an executable test, the ordering is total and input-order independent (asserted), and each alert states its own evidence in words rather than asserting a conclusion. That is the substance the skill is for, but it was self-directed, not the mandated procedure.

⚠️ **M6 is the one to worry about.** Its ranking is explicitly judgment, Q7 already flags it, and it is RED until you pick the ranking inputs. **Recommended:** settle Q7 (either build the skill or formally replace it in section 8) **before M6**, not before M5, which is date handling rather than judgement.

✅ **Closed 2026-09-27: `evidence-audited-analysis` now exists** (see Q7), so M6 can use it as section 8 intends. M4 remains the one milestone that shipped without it. Its aggregator is pure functions with executable tests and per-alert evidence, so **re-running it under the skill is optional, not remedial** — worth doing only if M6's pass turns up a rule M4 should share. M6's real blocker is unchanged and was never this: Taylor still has to pick the ranking inputs.

### Q14 · M6 · 2026-09-27
**Recency of activity is now the ranking input, but nothing in System Horizon ever records activity.** `last_activity` is a plain column with a `now()` default on insert. Before 2026-09-27 the client overwrote it on every upsert, so the registry re-seed flattened all 16 rows to a single timestamp (`distinct last_activity = 1`, spread `00:00:00`). That is fixed: the column defaults in the database and the client no longer sends it, so a future re-seed will not flatten it again.

**What is still missing is a writer.** Nothing updates `last_activity` after insert, so the existing 16 rows stay tied forever and the ranking falls back to `signal`. M6 discloses this honestly (`tiedOnActivity` → "Ordered by signal: no distinct activity is recorded yet"), but disclosure is not a fix.

**The decision is what counts as "activity", and it is a judgment call, not a lookup:**

1. **Task movement** (recommended): adding a task under a project, or changing its status, stamps that project's `last_activity`. Closest to "what am I actually working on", and SH already owns `horizon_tasks`. ⚠️ Depends on Taylor using tasks; `horizon_tasks` is currently empty, so recency stays tied until she does.
2. **Any project edit**: stamp it whenever a project row is edited through the app. Simple, but it measures bookkeeping rather than work, which is the same category error `last_activity` just had.
3. **Commits, via Mirrors**: `horizon_repo_health.local_head_at` is real work. ⚠️ Two problems: it keys on `repo_name`, which would need a hand-maintained map to project names (`ashfall_vault` → `Ashfall Britannia`), and **the collector has not run since 2026-08-24**, so it is stale anyway.

**Recommended: option 1, and only option 1 for now.** It is the smallest change, it uses data SH owns, and it degrades honestly. **Default action if you agree:** stamp `last_activity` on the parent project in `addTask` and `updateTaskStatus`. Not blocking M7.

**Answered 2026-09-27: option 1. Done in `2452bc3`.** `touchProjectActivity(projectId)` updates only the parent project's `last_activity` after a task is added or its status changes, and updates local state so Home re-ranks without a reload. Options 2 and 3 were not built: option 2 measures bookkeeping, which is the category error `last_activity` just had, and option 3 needs a hand-maintained repo-name map plus a collector that has not run since 2026-08-24.

✓ **Mechanism verified with a reversible probe**, not just unit tests: setting one project's `last_activity` to `now()` moved **Learn JavaScript (signal 30, the lowest)** to rank 1 ahead of **Sky Is The Limit (signal 91)**, proving recency overrides the signal tiebreak. Restored from a sibling row's value, leaving the table byte-identical (16 rows, `distinct last_activity = 1`, spread `00:00:00`).

⚠️ **The client function itself is unexecuted** — it needs Taylor's session, and runs the first time she adds a task or changes one's status. Until then `horizon_tasks` is empty, so the ranking stays tied and Home keeps saying so.

---

## 13. Known traps (read before pushing)

- **Push = production.** There is no staging. The gate in section 9 is the only safety net.
- Codex and Claude desktop also commit to this repo, sometimes the same evening. `git fetch` before any work that assumes data or code "does not exist yet", and before every push.
- `HANDOFF.md` is parsed mechanically. Never restructure headings. Keep the log to 15 entries and archive older ones to `handoff-archive/YYYY-MM.md`.
- Never amend or force-push a pushed commit. Correct it in the next entry.
- `App.css` contains a large base64 image. Edit it with targeted, asserted substitutions and diff the result; never retype the file.
- The live app needs a login. Ask Taylor to log in; do not fake it with static previews.
- If a Supabase or git call hangs, re-read actual state before retrying. It may have partially landed.
- Windows Task Scheduler: always verify the trigger's **Enabled** checkbox, not just that the task exists.
- Duplicated UI across layout variants (for example sidebar versus mobile) needs a grep-after check; `replace_all` edits have missed indented copies before.
- The repo is public. No personal, health, or credential content anywhere in it.
