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
- The `systemhorizon-build` skill (describes the retired single-file `control-panel.html` + browser Babel era, React 18 UMD, Davies branding).
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
| `repo-handoff` + `AGENTS.md` | Every banked change. `AGENTS.md` wins where they differ (label `Claude Code`, update DO NEXT only when it truly changed) |
| `delegation-protocol` | Milestones with independent parallel strands (see below) |
| `cynosure` | Any UI or styling work |
| `tufte` | Any chart, meter, sparkline, or status visualization |
| `evidence-audited-analysis` | Any ranking, aggregation, or "the data shows" logic (Needs Attention, Active Work ranking) |
| `lessons-ledger` | End of any session where something non-obvious was learned |

Do **not** use `systemhorizon-build` (stale, see section 0).

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
| M0 | Environment check + housekeeping | Not started |
| M1 | Nav migration to the locked IA | Not started |
| M2 | Projects re-seed + round trip | Not started |
| M3 | Home: persistent Now + Capture (IA step 1) | Not started |
| M4 | Home: Needs Attention aggregator (IA step 2) | Not started |
| M5 | Home: Today and Next timeline (IA step 3) | Not started |
| M6 | Home: three ranked Active Work return points (IA step 4) | Not started |
| M7 | Home: field-status strip (IA step 5) | Not started |
| M8 | Google Calendar one-way sync | Blocked: Taylor must create the Google OAuth client |
| M9 | Handoff-aware task fields | Not started |
| M10 | Horizon Task Digest (Septentrion side) | Not started |

Status values: `Not started` · `In progress` · `Blocked: <reason>` · `Done (pending Taylor visual)` · `Done: <short-sha>`.

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
- Verify with SQL: 16 projects, correct `area` values (Ops & Infra, Aftermath, The Undercroft, Sidequests, Career, Learning), correct `parent_name` links (Swiftwatch under Invisible String Theory, Aftermath Meridian under Rectrix Caedere).
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

### Q6 · M2 · 2026-09-24
**`horizon_projects` area values disagree three ways, and nothing can satisfy all three.** Live DB (16 rows, verified by `count(*)`) has: `Aftermath` 7, `Career` 3, `Learning` 2, `Ops & Infra` 2, **`Swift`** 2. But `src/App.jsx:55` `AREA_ORDER` expects `Ops & Infra, Aftermath, **Undercroft**, **Sidequests**, Career, Learning`, and this file's M2 acceptance expects `Ops & Infra, Aftermath, **The Undercroft**, Sidequests, Career, Learning`.

So `Swift` exists only in the database, `Undercroft` exists only in the code, and `The Undercroft` exists only in this document. Invisible String Theory and Swiftwatch are currently filed under `Swift`; the code's hardcoded registry files them under `Sidequests`.

⚠️ **Also: every row's `parent_name` is null.** M2 expects Swiftwatch under Invisible String Theory and Aftermath Meridian under Rectrix Caedere. Neither link exists live, though the hardcoded registry in `App.jsx:44` does carry `parentName: 'Invisible String Theory'`.

**Recommended:** make the database match `App.jsx`'s `AREA_ORDER` (`Undercroft`, `Sidequests`), and correct M2's acceptance text in this file to drop the "The". Rationale: the code is what renders, `AREA_ORDER` drives the display sort, and "The Undercroft" appears in no code path at all. **Which spelling do you actually want?** Not blocking M1.

### Q7 · Process · 2026-09-24
**Six of the twelve skills section 8 mandates do not exist on this machine.** Verified against `~/.claude/skills/`: `minimal-diff`, `verified-done`, `root-cause-first`, `finish-the-turn`, `evidence-audited-analysis`, and `lessons-ledger` are all absent. `repo-handoff` is absent too, but `handoff` exists and is clearly the same thing under a different name. Present and used: `karpathy-guidelines`, `delegation-protocol`, `cynosure`, `tufte`.

This matters because section 8 reads as a contract, so a session either silently skips half of it or quietly substitutes. M0 substituted and is recording it here rather than hiding it.

**Recommended:** correct section 8 to name what exists (`repo-handoff` → `handoff`; `root-cause-first` → `superpowers:systematic-debugging`; `verified-done` → `verification-quality`), and either build the four with no equivalent (`minimal-diff`, `finish-the-turn`, `evidence-audited-analysis`, `lessons-ledger`) or drop them from the list. ⚠️ `evidence-audited-analysis` is the one with real consequences: M4 and M6 both require it for ranking and aggregation logic, so M6 in particular should not start until it exists or is formally replaced. Not blocking M1.

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
