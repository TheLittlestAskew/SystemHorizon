# HANDOFF — System Horizon

> React + Vite dashboard shell for the Septentrion system: Horizon / Projects / Flow / Calendar / Mirrors / Archive / Swift / Travel / War Room views over the project registry, handoffs, and return points.
> Handoff is **enabled** for this repo. Every change updates the DO NEXT block below and prepends a log entry.

## ▶ DO NEXT

> 🆕 **2026-09-24: `docs/NORTH_STAR.md` now owns the milestone queue.** Read it before this block. The next action is **M2, Projects re-seed + round trip** (section 10); M0 is `Done: ac3ccf7` and M1 is `Done (pending Taylor visual): e5e335f`. **M1's only open item is gate item 8** — Taylor logging into the app to confirm the new nav at desktop, 1000px and 680px. Seven decisions are waiting in section 12 (Q5 retire the stale `systemhorizon-build` skill, Q6 the `horizon_projects` area drift, Q7 six mandated skills that do not exist, Q8 `cynosure` points at the same stale skill, Q9 `npm run lint` passes on warnings, Q10 nav group labels fail WCAG AA, Q11 `NEXT:` versus `Co-Authored-By:` in commit messages). ✅ **The "`horizon_projects` is empty (0 rows)" line below is wrong** — it holds **16** rows; `list_tables` reports a planner estimate, not a count. **M2 needs no re-seed.**
>
> The rest of this block is kept deliberately: it still holds the only written detail for the changedetection.io flight watch, the War Room and `warroom-merge` items, and the standing repo notes. Where it and `NORTH_STAR.md` disagree on sequencing, NORTH_STAR wins.

**The live schema audit is done — see the 2026-09-20 log entry for the full list of gaps found and fixed.** Every `horizon_*` table now has a matching migration file in `supabase/migrations/`, RLS policies normalized to `authenticated` everywhere, owner FKs consistently `on delete cascade`, and `anon` revoked at the table-grant level on every table.

**Next: build the Google Calendar → SH one-way sync** for `taylor.ritchie14@gmail.com`. Decided: read-only pull into `horizon_events` (nothing pushed back to Google), built as an in-app OAuth button on the Calendar view rather than a scheduled script. Needs a Google Cloud Console OAuth client (redirect URI `sh.tayloraritchie.com`) that Taylor creates and authorizes herself before any code lands — Claude cannot create Google Cloud credentials.
- `horizon_events.start_time`/`end_time` are stored as free-form `text` (e.g. "10:00 AM"), not `time`/`timestamptz` — decide how that reconciles with Google's RFC3339 datetimes before writing the mapper.
- Separately flagged during the audit, not yet decided: `horizon_swift_watch`/`horizon_swift_collection`/`horizon_swift_events`'s `status`/`category`/`kind` columns have no DB-level `CHECK` constraint (enum values are enforced client-side only, in `App.jsx`).

**Then, make SH task state handoff-aware without making it a second handoff system.** SH owns routine task state: project, status, next action, notes, and eventual handoff readiness. Septentrion owns durable cross-repo context, generated digests, collectors, and historical return points. Repository `HANDOFF.md` files remain for real banked implementation work only, never every task movement. After the live audit, design the smallest task fields needed for this boundary, likely a reliable update timestamp plus a promotion state such as `none` / `candidate` / `promoted`; do not add them until the audit proves what already exists and what the live RLS contract permits.

**After that, add a local Septentrion-side, read-only Horizon Task Digest.** Reuse the existing local collector pattern (`Scripts/mirror-freshness/`, `Scripts/swiftwatch-sync/`, `Scripts/travel-watch-sync/`) rather than building a competing scheduler in SH. The digest should be a new generated note that surfaces active work, waiting blockers, handoff candidates, and recently completed work. It must not overwrite `HANDOFF.md`, Return Point, or Ephemeris. A deliberate implementation session promotes an SH handoff candidate into the appropriate repository handoff when there is actual banked work.

**Only then decide whether an Obsidian link or embed adds enough convenience.** It is not synchronization and may be brittle under Cloudflare Access or frame restrictions. The default should be a normal SH link plus the generated digest. A read-only Obsidian Base over existing Ephemeris material can proceed independently; defer any SH-connected Base until the digest has a stable data shape.

**The previous Projects visual verification remains required after the schema audit.** Cards are now area-level rollups (one per area: Ops & Infra, Aftermath, Undercroft, Sidequests, Career, Learning), not one per project. Check: (1) each area card shows a sensible project/active count and signal average, (2) clicking a card narrows the accordion correctly, (3) the accordion reads as one self-contained panel with its own header and independently-scrolling body, including whether `calc(100dvh - 40px)` looks balanced beside the shorter cards/table column, and (4) clicking a project name inside the accordion opens its detail page. `horizon_projects` was reported as empty (0 rows) in the prior handoff, so re-seeding with the current `area` and `parent_name` data still needs a live round trip.

**Then, the changedetection.io watch for flight prices.** Full walkthrough is in `Scripts/travel-watch-sync/README.md` in the vault (Visual Selector + Extract Text, not the built-in Price/Restock mode — that only works on single-product pages, and Google Flights isn't one). Get the watch UUID, put it in `travel-watch-sync.config.json`. Not urgent yet — early November is the real PAX Unplugged (Dec 3-6) booking decision point, so this can wait for a natural window.

1. **Create `.env`** next to the script (same shape as Swiftwatch's, see README) with your changedetection API key and Horizon login.
2. **Run `node travel-watch-sync.mjs` manually once**, confirm a real price lands in the Travel tab (nav 09), marked as an automated entry.
3. **Schedule it** via Task Scheduler pointing at `run-travel-watch-sync.cmd` — **2-4 times a day, not every 30 minutes** like Swiftwatch. Flight prices don't need that granularity, and frequent automated hits raise CAPTCHA/layout-break risk. **Remember to check the trigger's Enabled box** — that's the exact thing that silently no-op'd Swiftwatch's first setup pass.

**Behind that, standing items (lower priority):**

1. **Post-draft: consider moving War Room state to Supabase.** It is currently in `localStorage` (`warroom_sh_v1`), a deliberate exception to this repo's usual rule, taken because a live draft is single-device and latency-critical and a 5s poll writing to Supabase had never been exercised. Revisit whenever there's a natural window — no urgency now that the draft is over.

**Small cleanup, no rush:** an unused `warroom-merge` branch exists (identical to
main, created for a verification path that turned out not to be needed) and can
be deleted.

Design note carried forward: **`predicted` + `confidence` on `horizon_swift_events` exist specifically so forecasts never render as facts.** The Swift Calendar tab shows a "Predicted · N%" badge for forecasts and a "Logged" badge for real dates — keep that distinction if the UI changes.

Standing repo notes:
- Naming is locked: **Rectrix Caedere** is the campaign and brand; **Aftermath Meridian** is the live website/app; **Aftermath Atlas** is its Supabase data layer.
- Remote: `origin` is `TheLittlestAskew/SystemHorizon`. The prior standalone HTML control panel is preserved as `meridian-keystone.html`.
- ~~`README.md` is still the stock Vite template text.~~ Corrected 2026-09-24: M0 (`ac3ccf7`) replaced it with a short pointer to `NORTH_STAR.md`, `AGENTS.md`, `HANDOFF.md`, and the IA doc.
- The Supabase project is named `aftermath-atlas-dev` (id `drtvlcgyjlofaffbwael`) despite the `horizon_*` table naming — same project `src/supabase.js` points at.
- **The mirror-freshness sync script is not in this repo.** It's in `TheLittlestAskew/septentrion` at `Scripts/mirror-freshness/`. **Swiftwatch (`Scripts/swiftwatch-sync/`) and Travel watch (`Scripts/travel-watch-sync/`) both follow this exact same pattern and location.**
- **This repo's own GitHub connector cannot reach `TheLittlestAskew/septentrion`** — confirmed 2026-08-27, a `get_file_contents` call returned 404 even though the repo exists and is private. Edits there go through the local filesystem instead.
- **The master context doc is not in Notion.** It's `SystemHorizon_Master_Context.md` in the Claude Project knowledge.
- **When verifying a Windows Task Scheduler task, check the trigger's Enabled checkbox specifically**, not just that the task and trigger exist.
- **This repo deploys to a custom subdomain.** `base` in `vite.config.js` is `/`, and `public/CNAME` contains `sh.tayloraritchie.com`. Verified live and Access-gated on 2026-08-29: an unauthenticated request 302s to the Cloudflare Access login.
- **`npm ci` in the deploy workflow tolerates `package.json` script-only changes** without a lockfile update — verified 2026-08-29 by running `npm ci` against the unchanged lockfile after adding a `test` script. Dependency changes still require a lockfile refresh.

---

## Log
<!-- newest first · one entry per logical task/session · timestamp · source · changed · commit · next -->

### 2026-09-24 18:23 ET · Claude Code
- **Changed:** Ran **M1 (nav migration to the locked IA)** from `docs/NORTH_STAR.md` section 3. Nav reading order is now Calendar (pinned utility), Horizon, Projects (Projects, Flow), Career, System (Mirrors, Archive), Side Quests (Swift, War Room, Travel, collapsed by default). `Core` and `Life & Watch` are gone, and Travel left the retired Life concept. No view was removed or renamed: all 10 stay reachable. Moved the nav structure out of `App.jsx` into a new `src/navConfig.js` so the "order is exactly X" and "every view reachable" criteria are assertable without booting the app, and extracted a `NavItem` component so the utility and group render paths cannot drift apart. `NavItem` carries `aria-current="page"` on the active item, per the ARIA navigation pattern.
- **Verification:** ✓ `npm run lint` clean, `npm test` **38/38** (was 28 — 10 new in `src/navConfig.test.mjs`), `npm run build` 2.91s. ✓ Grep: `'Core'`, `Life & Watch` and `id: 'core'` appear nowhere in `src/` except the one test that asserts their absence. ✓ The Pages deploy run for `e5e335f` was **polled to `conclusion: success`**, not assumed. ⏳ **Gate item 8 is still open** — Taylor had not logged in when this was banked, so the live visual check at desktop/1000px/680px has not happened.
- **Commit:** `e5e335f` + this one
- **🛑 A JS-only collapse would have stranded three views on narrow screens.** Both the 1000px and 680px blocks set `.nav-group-toggle{display:none}`, so the moment Side Quests started collapsed, the previous `{open && group.items.map(...)}` pattern would have made **Swift, War Room and Travel unreachable** at those widths, with no visible control to expand them. Collapsed groups now always render their items and hide them via `.nav-group-collapsed .nav-item{display:none}`, which the 1000px block overrides (and 680px inherits, since both queries match at ≤680). **Any future group that defaults closed inherits this fix, and any future breakpoint that hides the group toggles must keep that override.**
- **Measured, not eyeballed:** Side Quests reads quieter through item color `#8f97a8` (**6.65:1** on the `#0a0b1b` sidebar, passes AA) plus 0.78 icon opacity — deliberately *not* by dimming its group label, because `.nav-group-toggle`'s `#6d7485` is already **4.17:1** and failed AA before M1 touched anything. Existing `.nav-item` text is 9.48:1. See Q10.
- **Friction:** convention miss — the `e5e335f` commit message ends with a `Co-Authored-By:` trailer and carries **no `NEXT:` line**, breaking `AGENTS.md` step 1. It is pushed, so per the never-amend rule it stays wrong and this line is the correction. Cause: a global instruction says end every commit with the trailer while `AGENTS.md` says end with `NEXT:`, and I followed the global one without checking that this repo's last four commits are 4-for-4 the other way (`NEXT:` last, no trailer anywhere). ▶ **Read the repo's recent commit bodies before writing the first one; a convention that is mechanically parsed beats a global default.** Needs Taylor's ruling — Q11.
- **Next:** Taylor logs into the dev server (Chrome is already open on `localhost:5173`) so M1's gate item 8 can close, then M2.
- **Watch out:** ⚠️ **`chrome-devtools-mcp` is not connected in this session**, so section 8's named tool for the live visual check was unavailable; used the `chrome-devtools` **CLI** (v1.9.0, global install) instead. Its syntax differs from the skill doc: every tool takes `<pageId>` as a **required positional** (`take_snapshot 2`, `resize_page 2 1440 900`), and a bare call fails with "Not enough non-option arguments". ⚠️ **`npm run lint` exits 0 on warnings** — proved with a deliberate unused-variable probe — so gate item 1 currently means "no errors", not "no output". See Q9. ⚠️ `cynosure`'s `references/brand-hooks.md` routes **all** SH styling work at the stale `systemhorizon-build` skill, which is a second copy of the Q5 hazard and would break if Q5's retirement happens alone. See Q8.

### 2026-09-24 11:52 ET · Claude Code
- **Changed:** Ran **M0 (environment check + housekeeping)** from `docs/NORTH_STAR.md`, the new standing contract that arrived in `68915e7`. Verified the starting line on current `main`: `npm ci`, `npm run lint` (oxlint), `npm test` (28/28) and `npm run build` (vite 8.1.5, ~4s) all pass. Supabase MCP reaches `drtvlcgyjlofaffbwael`. Moved `storygraph-mcp-spec.md` → `docs/side-quests/`, replaced the stock Vite `README.md` with a pointer to NORTH_STAR / AGENTS / HANDOFF / the IA doc, and amended the IA doc's area section to defer to NORTH_STAR section 3 for the locked nav without removing any of its original text.
- **Commit:** `ac3ccf7` + this one
- **🛑 `horizon_projects` is NOT empty. It has 16 rows, and the "0 rows" claim was a measurement artifact.** `list_tables` reports `horizon_projects` at **0** while `select count(*)` returns **16** on the same table in the same minute, because `list_tables` surfaces `pg_class.reltuples` (a planner estimate) rather than a count. That estimate is the likely origin of the long-standing "reported as empty" line in the prior DO NEXT. **M2 does not need a re-seed.** What M2 *does* still need is the area and parent drift in Q6.
- **M0 gap table — Home view vs `docs/Horizon-Home-Information-Architecture.md`:**

  | IA priority | State in `src/App.jsx` | Gap |
  |---|---|---|
  | 1. Now (large primary focus) | `focus-console`, L506-509 | ⚠️ Exists visually but is **hardcoded** ("Define the first System Horizon data model.") and its done-state is `useState` (L486). Not persisted, not task-linked. M3 |
  | 2. Needs attention (≤5 alerts) | — | ✗ **Absent entirely.** M4 |
  | 3. Today and next (timeline) | — | ✗ **Absent from Home.** `horizon_events` is read, but only by the Calendar view. M5 |
  | 4. Active work (3 ranked) | "Project radar", L528-533 | ✗ Renders `projects.map(...)`, i.e. **every** project. This is exactly the all-project radar IA step 4 says to replace. M6 |
  | 5. Quick capture (persistent) | `capture-instrument`, L535-542 | ⚠️ **Browser-only.** `captures` is `useState` (L485); `horizon_capture` appears **0 times** in `App.jsx` and does not exist in the database. Known gap, confirmed. M3 |
  | 6. Field status strip | — | ✗ **Absent entirely.** M7 |

  **Two Home modules are not in the IA at all** and are candidates for removal under the "no decorative numbers without a decision attached" rule (IA data-and-behavior rules; NORTH_STAR section 2): "Capacity / now" (01, `useState` L487, browser-only) and "Cycle remaining" (02, L522-526), which hardcodes `232` days left in 2026 and a `DotMatrix completed={18} total={35}`. ⚠️ **The `232` is a literal, so it is already wrong and silently decays.** Removing either is RED (pre-existing feature) — not touched. Cosmetic aside: the instrument numbering runs 01, 02, *(none)*, 04; the radar lost its `03`.
- **Live DB shape:** 11 `horizon_*` tables. `App.jsx` reads 8 of them (`horizon_events`, `horizon_projects`, `horizon_repo_health`, `horizon_swift_collection`, `horizon_swift_events`, `horizon_swift_watch`, `horizon_tasks`, `horizon_travel_watch`). It reads **none** of `horizon_applications`, `horizon_work_search_contacts`, `horizon_draft_board` — the last by design, since War Room is `localStorage`. M3's `horizon_capture` and `horizon_now` do not exist yet.
- **Three decisions raised in `NORTH_STAR.md` section 12, none acted on:** **Q5** retire the stale `systemhorizon-build` skill rather than rewriting it (RED twice over: outside this repo, and retiring reads as deleting). **Q6** `horizon_projects` areas disagree three ways — live DB has `Swift`, `App.jsx:55` `AREA_ORDER` has `Undercroft`/`Sidequests`, NORTH_STAR M2 says `The Undercroft`; and every `parent_name` is null. **Q7** six of the twelve skills NORTH_STAR section 8 mandates do not exist on this machine.
- **Friction:** misread — searched four repo roots and the vault for `docs/NORTH_STAR.md`, concluded it had "never been in this repo" on the strength of `git log --all`, and reported that to Taylor. The clone was simply **3 commits behind** and I had not fetched, so `--all` was reading stale refs. What worked: `git fetch` first. ▶ **`git log --all` is not evidence a file never existed; it is evidence about refs as last fetched.** Section 13 already warns to fetch before assuming code "does not exist yet" — this is that trap, hit on the first read of the file that contains the warning.
- **Watch out:** ⚠️ **Remote Control's mobile leg is inactive.** The M0 test push returned "Terminal notification sent. Mobile push not sent (Remote Control inactive)." NORTH_STAR section 7 routes every blocking question through a phone push on the assumption Taylor is not watching the terminal, so **that escalation path is currently unproven** — the session must be started with `claude --remote-control` to arm it. 🛑 The `systemhorizon-build` skill's `description:` auto-triggers on "SystemHorizon" and "control panel" and claims Claude *cannot* build SH without it, so it loads **before** section 0's "ignore this source" instruction can be read. A warning in a file you consult after the fact cannot prevent the failure; see Q5.
- **Next:** M1, migrate the nav to the locked IA in `NORTH_STAR.md` section 3 (Calendar as a pinned utility, Horizon and Career as direct links, Projects and System as groups, Side Quests collapsed by default). Current nav config is `src/App.jsx:8-11` and still reads `Core` / `Life & Watch` / `Career` / `System`.

### 2026-09-21 21:49 ET · Claude Code
- **Changed:** Restyled the side nav from a flat 10-item list into 4 collapsible groups (Core, Life & Watch, Career, System) with per-group chevron toggles, replaced the wide "Collapse/Expand" text button with a compact icon-only rail toggle next to the logo, added a left-accent bar on the active nav item, and nudged icon stroke weight 1.6 → 1.5 for a lighter line-icon look. Driven by three reference images Taylor supplied (a SearchAtlas-style nav shell, a chevron-tree nav, and a thin-line "Onyx" icon set); kept the current color tokens per her instruction — rebased on top of the concurrent cyan→blue retint (see the entry below) and updated my hardcoded literals to match it rather than reintroducing the old cyan values. Updated the 1000px and 680px responsive breakpoints for the new grouped markup (mobile nav now scrolls horizontally instead of hard-hiding items past the 5th).
- **Verification:** `npm run lint` clean. Could not reach the live Supabase-gated app in-session, so built a standalone static HTML page against the real `App.css` to visually confirm the grouped/collapsed states render correctly before handing off.
- **Friction:** misread — built that static preview as a workaround instead of just asking Taylor to log into the running dev server herself; she redirected ("I can log in for you. Just pull up the login page"). For any gated live-app check, ask first rather than building an unauthenticated workaround.
- **Commit:** `d93270f`
- **Next:** Unchanged. See the block above this log.
- **Watch out:** Live-app visual confirmation (real data, real breakpoints, real interaction) is still outstanding — Taylor was mid-login when this was banked. Also: another session retinted the primary accent from cyan to blue (`a3d1223`) concurrently with this nav work — both are now merged together in `App.css`, worth a deliberate look to confirm the two changes actually read well together.

### 2026-09-20 19:33 ET · Claude chat (live schema audit + horizon_* consistency fixes)
- **Changed:** Completed the read-only live data-contract audit from the DO NEXT block, then fixed what it found, with sign-off. Queried `drtvlcgyjlofaffbwael` directly: `list_tables` (verbose) for every `horizon_*` column/FK/default, `pg_policies` for RLS, `pg_constraint` for checks/uniques/FKs, `pg_indexes`, `information_schema.triggers`, and `information_schema.role_table_grants`.
  - **Migration gap confirmed and closed:** 19 of 21 applied Supabase migrations had no file in `supabase/migrations/` (only `horizon_projects` and career tracking were checked in). Backfilled 8 files matching verified original live state: `create_horizon_tasks`, `create_horizon_events`, `create_horizon_repo_health`, `create_horizon_swift_tables`, `create_horizon_travel_watch`, `add_source_to_horizon_travel_watch`, `create_horizon_draft_board`, `add_horizon_projects_parent_name`.
  - **Fixed live (4 new migrations, applied via `apply_migration`, files also checked in):** RLS policies on `horizon_repo_health`/`swift_watch`/`swift_collection`/`swift_events`/`travel_watch`/`draft_board` were scoped to `public`, not `authenticated` like every other `horizon_*` table — normalized. `owner` FK was entirely missing on `swift_watch`/`swift_collection`/`swift_events`/`draft_board`, and present-but-no-cascade on `repo_health`/`travel_watch` — all now `references auth.users(id) on delete cascade`. `anon` had full table-level grants on 8 of 10 `horizon_*` tables (including `horizon_events`) despite RLS policies never matching that role — revoked everywhere. `horizon_travel_watch` had no owner-scoped index; `horizon_draft_board` had an `updated_at` column with no trigger to maintain it — both added.
  - **Confirmed not broken:** `horizon_projects`'s `.upsert(..., {onConflict:'owner,name'})` does have a matching `unique(owner,name)` constraint — a suspected gap that turned out fine.
- **Verification:** ✓ Every fix applied live via `apply_migration`, confirmed via `list_migrations` showing the new versions. ✓ Backfill file content is the verified pre-fix state for each table (confirmed via the same queries), not a guess, so replaying the migration chain from scratch reproduces today's fixes as separate, real steps. ✓ Re-read `supabase/migrations/` after push to confirm all 12 files landed.
- **Commit:** `844f75f`
- **Next:** Build the Google Calendar → SH sync — see DO NEXT above.
- **Watch out:** ⚠️ Two `execute_sql`/`push_files` calls silently timed out mid-session ("No approval received" / no response from the local MCP server) before working on retry — if a Supabase or GitHub write call hangs, don't assume it partially landed; re-read the actual state before retrying. ⚠️ Left alone, on purpose: the `showcase`/`campaigns`/`moments` schema (not part of this audit's scope) and the missing `CHECK` constraints on the Swift tables' `status`/`category`/`kind` columns (enum values are client-side only in `App.jsx`) — flagged, not fixed, needs its own sign-off.

### 2026-09-10 02:34 ET · Codex (System Horizon and Septentrion task/handoff architecture audit)
- **Changed:** No application code, live Supabase data, or scheduled automation changed. Banked a read-only audit of the current System Horizon repo and replaced the return point with the agreed implementation order.
  - **Reuse, do not rebuild:** `src/App.jsx` already has project registration, `horizon_tasks` CRUD, Flow statuses (`Active`, `Waiting`, `Parked`, `Done`), events, and a Mirrors signal for repositories with an unbanked handoff. The Archive view is an existing read-only `HANDOFF.md` reader. The Septentrion vault already owns the local collector pattern for mirror freshness, Swiftwatch, and travel watch. SH should display and own task state, not duplicate those collectors or create another persistence layer.
  - **Confirmed foundation gap:** Checked-in migrations define `horizon_projects` and legacy career tracking, but not the live tables the modern app expects for tasks, events, repository health, Swiftwatch, or travel. Those tables may be present in Supabase, but their schema and owner-scoped RLS are not reproducible from this repository. This is now the first implementation gate: audit the live contract read-only, reconcile it into source control, then make any task changes.
  - **Handoff boundary:** Routine SH task changes must not write repository `HANDOFF.md` files. SH can label a task as a handoff candidate; a real implementation session promotes it only when work has actually been committed and pushed. Septentrion should receive a separate generated, read-only Horizon Task Digest, never an overwrite of Handoff, Return Point, or Ephemeris.
  - **Integration boundary:** An Obsidian embed is optional convenience, not integration. Cloudflare Access and framing restrictions may make it fragile, and a hosted SH app should not write to a local Obsidian API. Prefer an ordinary link plus the generated digest. Obsidian Bases over existing Ephemeris can proceed independently; wait for a stable digest schema before making a SH-connected Base.
  - **Legacy warning:** `meridian-keystone.html` and the `push-status-to-systemhorizon.ps1` heartbeat point at a different Supabase project/table from the modern Vite app. Do not retarget or merge those paths based on naming alone.
- **Verification:** ✓ Working tree was clean before this documentation change. ✓ Reviewed `AGENTS.md`, current `HANDOFF.md`, `TOOLS.md`, `package.json`, current `src/App.jsx` data mappers/loaders, checked-in migrations, mirror-freshness pointers, and deployment workflow. ✓ No live database call, UI action, scheduler change, or production deployment was performed, so the handoff distinguishes repository evidence from unverified live state.
- **Commit:** Pending
- **Next:** Read-only live data-contract and RLS audit first. Then reconcile the schema into the repo before any task-state, digest, Base, or embed work. The Projects visual verification remains next after that audit; see the DO NEXT block above.
- **Watch out:** ⚠️ Quick Capture is currently browser-memory state and vanishes on reload. It is not a durable intake path yet. ⚠️ The Archive view has a hard-coded repo list and assumes `main`; treat it as a reader to extend later, not an authoritative registry. ⚠️ Prior handoff reports `horizon_projects` as 0 rows, but that is not freshly live-verified in this session.

### 2026-09-03 19:57 ET · Claude Code (26-commit divergence reconciled; TOOLS.md re-verified against the real tree)
- **Changed:** This clone had been sitting **ahead 2, behind 26** — the whole Projects redesign, Calendar, full-dark rollout, nav icons and ESPN cookie work were on the remote and had never been pulled. Rebased the two local commits onto `origin/main`; one conflict, in `HANDOFF.md`, where both sides had prepended log entries. Resolved by **date order** (mine 22:20 sits above the 05:24 `Claude chat` entry) using a script rather than by hand, and verified by line arithmetic: 322 lines with markers → 320 after, exactly the 3 marker lines removed plus 1 blank added, so nothing was dropped. Tagged `pre-rebase-2026-09-03` at the old HEAD first. Then **re-verified `TOOLS.md` against the reconciled tree**, which was the whole point of doing this before trusting the table.
- **Commit:** `19577f1` (table re-verification) · `5c6675e` (Supabase row correction) · rebased `7e85141`, `74d128c`
- **Verification:** ✓ `package.json` and `package-lock.json` are **byte-unchanged** across all 26 commits, so every dependency row (Vite 8.1.1, React 19.2.7, oxlint 1.71.0) was still accurate despite being seeded from the stale tree. ✓ Only `src/App.jsx` and `src/App.css` changed. ✓ Rebase left a clean tree.
- **Friction:** misread — my seeded table said `@supabase/supabase-js` performs "client reads of the `projects` heartbeat table". **It does not.** Grepping the actual `from(...)` calls shows the app reads `horizon_projects`, `horizon_tasks`, `horizon_events`, `horizon_swift_*`, `horizon_travel_watch` and `horizon_repo_health` in `drtvlcgyjlofaffbwael`, plus `dashboard_jobs` in `vtrtyagltwdrbastpppl` — and **never** touches `projects` in `qzliydcrlhioradwacmd`. I had assumed one Supabase per repo and written the row from that assumption. **Count the `from()` calls before naming a repo's database; "the app's Supabase" is not a single thing here, it is three.**
- **Next:** Visual-verify the Projects page on `sh.tayloraritchie.com` — third pass, per the DO NEXT block above, which is unchanged and still owns the next action.
- **Watch out:** ⚠️ **The 2026-09-02 22:20 entry below cites commit `e495121`, which no longer exists** — the rebase rewrote it to `7e85141`. Left as written rather than edited, per the never-amend rule; this line is the correction. ⚠️ **Three tools the 26 commits introduced were missing from the table entirely** and are now added: Cloudflare Access (gates the live site), ESPN Fantasy (War Room data, cookie auth needing rotation), and `localStorage` for War Room draft state — the last being a deliberate, documented exception to this repo's Supabase-everything rule. 🛑 **The heartbeat feeds a table nothing in `src/` reads.** `push-status-to-systemhorizon.ps1` upserts into `projects` (`qzliy`), which is consumed only by `meridian-keystone.html` and `taylorritchie/systemhorizon/index.html`. The Vite app's own registry is `horizon_projects` in a different project — and its DO NEXT notes that table is still **0 rows**. Worth deciding whether the heartbeat should target `horizon_projects` instead, or whether it is correctly feeding pages you are retiring.

### 2026-09-02 22:20 ET · Claude Code (TOOLS.md tool inventory added)
- **Changed:** Added `TOOLS.md` (14 active rows) — Vite, React 19, oxlint, Supabase, the heartbeat push script, and the rest, with what each is used for and when last used. `AGENTS.md` gained a `### TOOLS.md` subsection so Codex maintains it too. One of 13 project tables that `septentrion-sync` v4 rolls into the vault's new `The Toolbox.md`.
- **Commit:** `e495121`
- **Next:** Unchanged. See the block above this log.
- **Watch out:** ⚠️ The sync now keeps **two separate lists**. `REPOS` (7 entries) still drives Return Point, the Ephemeris notes, and this repo's `projects` heartbeat. The new `TOOLS_REPOS` (13 entries) drives only the master tool table. This repo is in `TOOLS_REPOS` but **not** `REPOS`, so its handoff state still isn't on the dashboard. Do not merge the lists to "fix" that — widening `REPOS` silently adds six rows to the live table.

### 2026-09-02 05:24 ET · Claude chat
- **Changed:** Two follow-up fixes to the Projects redesign, from Taylor's
  live review of the previous pass in this same session.
  - Cards changed from one-per-project to one-per-area (commit `e0d935e`):
    "cards should only be the major projects (Ops & Infra, Aftermath,
    Undercroft, etc.) — subprojects like a specific campaign, System
    Horizon, Storybook Resume" belong in the accordion, not as cards.
    `ProjectCard` → `AreaCard`, rolling up each area's member projects
    into a project count, active count, and a signal-meter average.
    Card focus state changed from `focusedProjectId` to `focusedArea`
    (a plain string). Since a rollup card has no single project to
    open, the "Open project page" entry point moved onto each
    project's own row inside the accordion — `AccordionProject`'s
    heading is now a button wired to `onOpenProject`.
  - Accordion restructured into one self-contained scrolling panel
    (commit `4ccb506` for the CSS half): "right panel should scroll
    independently, make it look more like a component." Was a stack
    of individually-bordered section cards with `max-height` (which
    only engages if content actually overflows); now one panel with a
    fixed header ("Areas" + count, reusing `.instrument-heading` for
    consistency with the rest of the app) and a body that scrolls on
    its own, using a real `height` instead of `max-height` so it
    always reads as a stable widget rather than shrinking to fit.
- **Verified before push (both commits):** `@babel/parser` parses
  clean, `@babel/core` + `preset-react` compile succeeds, brace counts
  balanced on both files, grepped for zero dangling
  `ProjectCard`/`focusedProjectId`/`.project-card*` references,
  confirmed `AreaCard`/`focusedArea`/`.area-card`/
  `.accordion-project-heading` all present. SHA re-checked immediately
  before each push.
- **Commit:** `e0d935e` (App.jsx), `4ccb506` (App.css)
- **Next:** see DO NEXT — third straight pass this session that hasn't
  been seen live. `horizon_projects` is still empty (0 rows), so the
  full area/parentName/signal-rollup path is still genuinely untested
  against real Supabase data.
- **Watch out:** the accordion's fixed height
  (`calc(100dvh - 40px)`) is a guess at what looks balanced next to
  the shorter cards+table column — this is exactly the kind of thing
  that reads fine in source but wrong on screen, worth an actual look
  before treating it as settled.

### 2026-09-02 03:03 ET · Claude chat
- **Changed:** Full rebuild of the Projects page, in two parts across this
  session.
  - **Part 1 — registry reorg (commit `fb187d9`):** grouped the flat 16-row
    project list into fixed area sections and moved four campaign-vault
    projects (Sky Is The Limit, Where The Flowers Forget, Ashfall Britannia,
    Pacts & Power) out of Aftermath into a new **Undercroft** area; moved
    Invisible String Theory, Swiftwatch, and Fantasy Football into a new
    **Sidequests** area. Added a `parentName` field (name-based linking, not
    id-based — `horizon_projects` assigns real UUIDs on insert, so a seed
    array can't know a sibling's future id) so Swiftwatch nests under
    Invisible String Theory and Aftermath Meridian nests under Rectrix
    Caedere. Corrected two stale entries found during the audit: System
    Horizon (was still describing the retired single-file Babel/
    control-panel.html era) and Fantasy Football (was still pre-draft).
  - **Part 2 — layout redesign (commits `cc952ea` + `905e510`), per a
    reference screenshot Taylor shared (a GO2DEN esports dashboard):**
    replaced the flat list + inspector-panel layout entirely with an
    auto-scrolling "recently updated" ticker, a project-card grid,
    a repo-activity table below the cards (repurposes `horizon_repo_health`
    — uncommitted/ahead/behind counts — rather than building new commit/
    issue plumbing), and a collapsible area accordion on the right that
    shows each project's open tasks inline. Selecting a card narrows the
    accordion to that project's area; a "Show all areas" banner clears it.
    All old `.registry-row`/`.registry-section`/`.project-inspector` CSS
    removed as dead code in the same pass.
  - **Migration:** added `parent_name text` to `horizon_projects` via
    `apply_migration` (confirmed present via `list_tables` after) —
    without this the seed insert would have failed outright, since
    `projectToRow` now sends a field the table didn't have a column for.
- **Verified before push (both commits):** `@babel/parser` (module, jsx)
  parses clean, full `@babel/core` + `preset-react` compile succeeds each
  time, brace counts balanced on both App.jsx (964/964 final) and App.css
  (471/471 pre-final-push), all 16 project ids present exactly once,
  single definition each for every new component, grepped for dangling
  references to removed props/selectors. SHA re-checked immediately
  before each push. Re-fetched both files via the Contents API after the
  final push and confirmed the committed content matches byte-for-byte.
- **Commit:** `fb187d9` (App.jsx, area reorg), `cc952ea` (App.jsx, layout
  redesign), `905e510` (App.css, layout redesign)
- **Next:** see DO NEXT — none of this has been seen live yet, and
  `horizon_projects` is still empty (0 rows) going into the next load,
  so the re-seed with the new schema is genuinely untested.
- **Watch out:** `horizon_projects` had 0 rows for this entire session,
  meaning `loadProjects()`'s auto-seed path (`initializePortfolioRegistry`)
  ran every time — the parent_name/area changes have never actually
  round-tripped through Supabase yet. First real load is the first real
  test.

### 2026-09-01 09:20 ET · Claude chat
- **Changed:** No code change — closed out the ESPN cookie rotation DO NEXT
  item. Taylor logged out of ESPN, logged back in (issuing a fresh
  `espn_s2`), grabbed the new cookie value from DevTools, and updated
  `ESPN_S2` in the Fantasy-Football Vercel project's env vars, then
  redeployed.
- **Verified live:** hit `https://fantasy-football-taylor-ritchie-s-projects.vercel.app/api/draft?leagueId=1573934181`
  directly — returned a full valid response (`drafted: true`, `teams: 20`,
  `totalPicks: 280`, all 280 picks present through round 14), confirming
  the new cookie authenticates correctly against the ESPN API.
- **Commit:** — (no source change; credential rotation only)
- **Next:** Travel-watch-sync setup — see DO NEXT. No urgency; can wait
  for a natural window before early November (PAX Unplugged Dec 3-6
  booking decision point).
- **Watch out:** the old `espn_s2` (pasted in plaintext into a Claude
  Code transcript on 2026-08-25) should now be invalid since login was
  cycled. Not independently re-verified as dead, but a fresh login
  normally invalidates the prior session cookie.

### 2026-09-01 09:00 ET · Claude chat
- **Changed:** No code change — closing out the visual-verify DO NEXT item.
  Taylor reviewed the live dark-accent rollout (Phase 1 + Phase 2 from
  2026-08-31, commits `0d1099a`/`137c1ac` and `38fa495`(bad)/`8f16755`)
  on `sh.tayloraritchie.com` and confirmed it looks good — no regressions
  across Horizon/Projects/Career/Flow/Mirrors/Archive/Swift/Travel, the
  four new dark modules (Flow active column, Mirrors summary panel,
  Archive first-child highlight, Travel soonest-trip highlight) render
  as intended.
- **Commit:** — (doc-only handoff update, no source change this entry)
- **Next:** Rotate the ESPN cookie (`espn_s2`, live since being pasted in
  plaintext on 2026-08-25) — see DO NEXT. Then the travel-watch-sync setup
  and, whenever there's a natural window, moving War Room state off
  localStorage to Supabase.
- **Watch out:** nothing new; dark-module work is fully closed unless a
  fresh visual direction comes up.

### 2026-08-31 18:32 ET · Claude chat
- **Changed:** Phase 2 of the visual-direction audit (see prior entry for
  Phase 1). Extended the light-canvas/dark-module hybrid pattern to the
  four views that had no unique treatment:
  - `FlowView` (App.jsx): the Active column gets a conditional
    `flow-column-active` class; App.css darkens it to match the urgency
    semantic already used by Horizon's time-instrument.
  - `MirrorsView` (App.jsx): computes `flaggedCount` and renders a new
    `.mirrors-summary` panel above the repo list.
  - Archive: CSS-only, `.archive-feed .archive-entry:first-child` — no
    JSX change needed since entries are already sorted newest-first in
    the component.
  - `TravelView` (App.jsx): was missing `.travel-view { padding-top:44px; }`
    entirely — every other view has this, Travel didn't. Also restructured
    the trip-group render into two passes (build `{tripName, sorted,
    lowestCents, first, departIn}` objects, then sort by soonest
    departure) so the soonest-departing trip can get a `travel-soonest`
    highlight. Directly useful for the PAX Unplugged Dec 3-6 booking
    decision — the highlighted trip is whichever one needs a decision
    soonest.
- **Verified before push:** CSS brace count balanced (586/586), each new
  selector confirmed present exactly once. JSX verified with
  `@babel/parser` (sourceType module, jsx plugin) — parses clean, grep
  confirmed each new class name appears exactly once. **Re-fetched both
  files after push and diffed byte-for-byte against the intended local
  copies before calling it done** — the discipline picked up from the
  Phase 1 mistake earlier this session.
- **Commit:** `0d1099a` (App.css), `137c1ac` (App.jsx)
- **Next:** Visual-verify on `sh.tayloraritchie.com` — see DO NEXT. Nothing
  in this session has actually been seen live; everything is verified by
  static analysis (brace/selector counts, babel parse, byte diffs) only.
- **Watch out:** the `.mirrors-summary` and `.travel-soonest` treatments
  are new UI surface, not just recolors — worth a closer look than a
  glance to confirm the copy and layout read the way they're supposed to
  with real data, not just that they don't crash.

### 2026-08-31 18:05 ET · Claude chat
- **Changed:** Ran a full-app visual-direction audit (all 10 nav views against
  the current cascade output) at Taylor's request, sourced partly from two
  Pinterest boards (Septentrion, UI/UX) pulled live via the Zapier Pinterest
  connector's raw API passthrough. Findings: Horizon/Projects/Career already
  hybrid (light base + dark accent module); Flow/Mirrors/Archive untouched
  light-only; Travel has zero dedicated CSS at all; War Room is the fully-dark
  reference implementation and closely matches the Pinterest palette
  (`#070b14` vs. pinned refs around `#0f1014`).
  - Fixed the previously-known Swift CSS bug and traced its real cause: a dead
    "dark-mode adjustments" block at the end of `App.css`, written for the
    superseded Neon field-console skin, was winning the cascade by load order
    and resetting several Swift text colors to light lavender/gray values
    meant for a dark background — but their backgrounds stayed white. Affected
    `swift-watch-meta dd`, `swift-panel-note`, `swift-checkbox`, and both row
    types, not just the form as the prior HANDOFF entry scoped it.
  - Consolidated 5 sequential `:root` passes (base, Neon field-console,
    Modular daylight, Saturation, No navy) into one canonical block using the
    values that were already winning the cascade — no visual change, removes
    the duplication pattern that caused the bug in the first place.
- **Verified before push:** brace count balanced (560/560 in the new file),
  zero CSS selectors lost or added versus the old file, dead block confirmed
  absent, single `:root` confirmed.
- **Commit:** `38fa495` (bad — see Friction), `8f16755` (corrected)
- **Friction:** gen-fail — the first `create_or_update_file` call passed the
  local file *path* (`/home/claude/App.css.new`) as the `content` argument
  instead of the file's actual text, so the live commit briefly overwrote
  `App.css` with a 24-byte string containing just that path. Caught
  immediately by re-fetching the file after the push and seeing `size: 24`.
  Corrected in the next commit by reading the file's literal content into
  context first and passing that. **Generalisable: after any
  `create_or_update_file` call, re-fetch and check the returned `size`/content
  before considering the change done — don't trust the tool call succeeding
  just because it returned 200.**
- **Next:** Open `sh.tayloraritchie.com`, verify Swift renders clean and no
  other view visibly shifted, then start Phase 2 (Flow/Mirrors/Archive/Travel
  dark-module treatment) — see DO NEXT.
- **Watch out:** Travel needs a stylistic build from scratch, not a dark pass
  like the other three — it currently inherits no dedicated styling.

### 2026-08-29 20:12 ET · Claude Code
- **Changed:** The draft board now labels every seat with its real team name instead of "Seat N".
  - `WarRoomView.jsx`: all four seat labels wired to `teamForSeat()` — grid headers, empty board cells, and **both** Up Next queue variants (sidebar and My Team tab). Each falls back to `Seat N` if the lookup returns null, so a resized league degrades instead of showing the wrong owner.
  - `warRoomLogic.test.mjs`: 5 new tests over the `DRAFT_ORDER` lookups from `3bfce51` — the table checked against the live `draftSettings.pickOrder`, unique `espnTeamId`s, snake-correct `teamForOverall`, null-safe `teamByEspnId`, and junk-seat handling.
  - Suite is **28/28**; `oxlint` and `vite build` both clean.
- **Commit:** `57ffbe5`
- **Friction:** gen-fail — the incoming patch spec arrived truncated mid-string on its 4th edit and imported a `teamForSeat` that did not exist in the local tree; applying it blind would have thrown at import. What worked: verifying the data sources before writing anything (`/api/draft` returns `teams: 20` as a count, not a roster; a direct ESPN league read 401s), which proved names cannot be derived at runtime and turned it into a "where do the names come from" question instead of a guess.
- **Friction:** re-run — that question was answered by building a placeholder `SEAT_TEAMS` table, and then the push was rejected: `3bfce51` (Codex, 19:33) had **already** added the real verified `DRAFT_ORDER` with all 20 names, owners, and espnTeamIds. The placeholder was thrown away and the view was pointed at the real table. What worked: `git fetch` + reading the rejected-push diff before rebasing. **`git fetch` first when a War Room task looks like it needs data that "does not exist yet" — Codex is working the same repo the same evening.**
- **Friction:** gen-fail — a `replace_all` edit on the queued-pick label silently hit only 1 of its 2 occurrences because the sidebar copy (line 522) is indented 12 spaces and the My Team copy (line 592) is indented 10. What worked: grepping for `queued.seat === slot` after the edit and patching the second separately. **Anything duplicated across those two layout variants needs that grep-after check.**
- **Next:** Open War Room and confirm seat 9 reads "Hits Different" before Saturday's draft.
- **Watch out:** `teamForSeat` is called with the literal string `'?'` from the Up Next queue whenever the snake math fails, so its `Number.isInteger` guard is load-bearing — don't "simplify" it to a truthy check. Also `teamForOverall` and `teamByEspnId` are exported but not yet called anywhere; `teamByEspnId` is the natural way to show *who* took a player on a filled cell, left alone here as out of scope.

### 2026-08-29 19:22 ET · Codex
- **Changed:** Added internal War Room navigation for the Draft Board, Player Pool, My Team, and Settings views.
  - Each page works from the same browser-local live state, so player actions and ESPN sync results remain consistent as you move around.
  - Settings now has a dedicated page, while the Draft Board stays the default full-screen view.
- **Commit:** `6d9e9c4`
- **Next:** Open `sh.tayloraritchie.com` → **War Room** and verify each top tab in the signed-in draft workspace.
- **Watch out:** The Player Pool repeats the player-action controls intentionally, so you can claim, fade, rank, or note a player without returning to the Draft Board.

> Older entries archived to `handoff-archive/2026-07.md`, `handoff-archive/2026-08.md` - everything before 2026-08-29 19:22 ET.
