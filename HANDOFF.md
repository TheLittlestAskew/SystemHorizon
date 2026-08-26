# HANDOFF — System Horizon

> React + Vite dashboard shell for the Septentrion system: Horizon / Projects / Flow / Calendar / Mirrors / Archive / Swift views over the project registry, handoffs, and return points.
> Handoff is **enabled** for this repo. Every change updates the DO NEXT block below and prepends a log entry.

## ▶ DO NEXT
**Visual QA the Swift view, then build the Swiftwatch local sync script.** The UI is built and pushed (2026-08-26); it has not been opened in the live app yet.

1. Sign in to the live app and open the new **Swift** nav item (08). Confirm the three tabs render: Watch, Collection, Calendar.
2. Collection and Calendar tabs are add/edit in-app — add a test item and a test event, confirm they persist and the status/predicted dropdowns update correctly.
3. Watch tab is read-only and will show its empty state (`No Swiftwatch data yet...`) until the local sync script exists — that's expected, not a bug.
4. Once the UI is confirmed, build the **Swiftwatch sync script**: a small local script in `TheLittlestAskew/septentrion` under `Scripts/`, following the exact pattern of `Scripts/mirror-freshness/` — signs in to Supabase as the owner account (not a service-role key), reads Swiftwatch's local state (changedetection → Apprise → ntfy → BurntToast chain), and upserts into `horizon_swift_watch` keyed on `(owner, watch_name)`. Do **not** put this script in the SystemHorizon repo.

Design note carried forward: **`predicted` + `confidence` on `horizon_swift_events` exist specifically so forecasts never render as facts.** The Swift Calendar tab shows a "Predicted · N%" badge for forecasts and a "Logged" badge for real dates — keep that distinction if the UI changes.

Standing repo notes:
- Naming is locked: **Rectrix Caedere** is the campaign and brand; **Aftermath Meridian** is the live website/app; **Aftermath Atlas** is its Supabase data layer.
- Remote: `origin` is `TheLittlestAskew/SystemHorizon`. The prior standalone HTML control panel is preserved as `meridian-keystone.html`.
- `README.md` is still the stock Vite template text.
- The Supabase project is named `aftermath-atlas-dev` (id `drtvlcgyjlofaffbwael`) despite the `horizon_*` table naming — same project `src/supabase.js` points at.
- **The mirror-freshness sync script is not in this repo.** It's in `TheLittlestAskew/septentrion` at `Scripts/mirror-freshness/`. `scripts/mirror-freshness/` here contains only pointer stubs — do not edit or run them. **The Swiftwatch sync script should follow this exact same pattern and location.**
- **The master context doc is not in Notion.** It's `SystemHorizon_Master_Context.md` in the Claude Project knowledge.

---

## Log
<!-- newest first · one entry per logical task/session · timestamp · source · changed · commit · next -->

### 2026-08-26 ET · Claude chat
- **Changed:** Built the Swift view UI — the piece deliberately deferred from the 2026-08-25 session. New nav item `Swift` (08) with three tabs:
  - **Watch** — read-only display of `horizon_swift_watch` rows (status dot, last checked/changed, change count, interval, target URL, errors, notes). Shows an explanatory empty state until the local sync script exists.
  - **Collection** — add/edit/delete against `horizon_swift_collection`. Status filter pills (wishlist/owned/available/preorder/sold_out), inline status dropdown per row (mirrors the existing `TaskRow` pattern), add form covers category/era/variant/priority/price/link/notes.
  - **Calendar** — add/delete against `horizon_swift_events`, split into Upcoming/Past sections. Each row carries a **Logged** or **Predicted · N%** badge — the `predicted`/`confidence` design note from the schema session is now visually enforced, not just documented.
  - Read `App.jsx` (51.8KB) and `App.css` (47.2KB) fresh from the repo rather than trusting prior-session content, per the standing "verify against live repo" practice. Pushed both files sequentially via `create_or_update_file` (not `push_files`) per the documented large-payload trap — combined payload here was ~121KB, larger than the ~93KB that has timed out before.
  - Syntax-checked with `@babel/parser` and compiled with `@babel/core` + `@babel/preset-react` locally before pushing either file.
- **Commit:** `9fba319` (App.jsx), `02a7564` (App.css)
- **Next:** See DO NEXT above — visual QA, then the Swiftwatch sync script.
- **Watch out:** The Watch tab will look empty/broken until the sync script exists and has run at least once. That's expected — don't mistake it for a UI bug during QA.

### 2026-08-25 ET · Claude chat
- **Changed:** Created the Swift data layer — three tables, twelve RLS policies, three triggers, two indexes — via `apply_migration` on the Supabase MCP (`create_horizon_swift_tables`). Verified afterward with `execute_sql` that each table carries exactly four policies. Checked `horizon_repo_health`'s existing policy text first and matched its `((select auth.uid()) = owner)` shape rather than inventing a variant.
  - Schema covers the three things Tayls asked for: Swiftwatch status, a collection tracker separating owned / wishlist / available, and an events calendar for predicting music and merch announcements.
  - **No UI was built.** Stopped deliberately before touching `App.jsx` — see Watch out.
- **Commit:** none in this repo (Supabase migration only; this HANDOFF.md update is the only repo write)
- **Next:** See DO NEXT above — build the Swift view with its three tabs, and the local Swiftwatch sync script in the septentrion repo.
- **Watch out:** **Deliberate stop, not an incomplete task.** `App.jsx` (51.8KB) + `App.css` (47.2KB) means a Swift view requires reading ~100KB and rewriting ~100KB with no patch tool available. This repo has a documented trap at exactly that size: `push_files` timed out on ~93KB payloads in both the 08-11 and 08-22 sessions, and a same-day session in the Fantasy-Football repo silently corrupted two files on a large write. The session in which this schema was created was already very long, so attempting the rewrite risked corrupting a dashboard Tayls uses daily to save her starting a fresh chat — a bad trade. The schema (the irreversible part) is done and verified; the UI is a clean fresh-session task with everything it needs documented above.

### 2026-08-24 ET · Claude chat
- **Changed:** Closed out the last open DO NEXT item. Rewrote the project master context doc from scratch (verified against live repo state — package.json, src/supabase.js, file tree — rather than trusting the old doc's claims): corrected the live URL, replaced the retired single-file Babel/`control-panel.html` pipeline description with the actual React+Vite+GitHub Actions architecture, corrected the nav/page list, and added a GitHub MCP traps section. Tayls confirmed she no longer uses Notion (where the old doc lived), so the corrected doc was uploaded directly to this Claude Project's knowledge instead as `SystemHorizon_Master_Context.md`.
- **Commit:** none (Project Knowledge upload, not a repo change)
- **Next:** See DO NEXT above.
- **Watch out:** None.

### 2026-08-24 ET · Claude chat
- **Changed:** Verified the mirror-freshness sync end to end. Tayls set up `.env` in `Scripts/mirror-freshness/` in the septentrion vault repo with real Supabase credentials and her System Horizon login, ran `node mirror-freshness-sync.mjs` locally, and confirmed all nine repos populated in the Mirrors tab (nav 06) with no errors and no "no local mirror" flags.
  - Also trimmed this log to the last 15 entries per the repo-handoff skill's maintenance step. The 8 oldest were moved to `handoff-archive/2026-07.md`.
- **Commit:** none (verification pass only)
- **Next:** See DO NEXT above.
- **Watch out:** None.

### 2026-08-22 19:10 ET · Claude chat
- **Changed:** Relocated the mirror-freshness sync script out of this repo and into `TheLittlestAskew/septentrion` at `Scripts/mirror-freshness/`, per Tayls' direction — the scheduled local automation (07:30 `septentrion-sync` and friends) already runs from that vault, so the script belongs there rather than requiring a separate local clone of this repo just to run one script.
  - Pushed the real `mirror-freshness-sync.mjs`, config, and README to the septentrion repo, unchanged in logic.
  - Regenerated the Claude Code skill wrapper to point at the new location.
  - Deliberately did **not** touch `Return Point.md`, `Friction Log.md`, or `HANDOFF.md` in the septentrion repo — those are exclusively owned by the `septentrion-sync` automated process, which has been fighting headless git-write permission blocks. Adding unrelated writes risked interfering with an already-fragile system for no benefit.
  - Left pointer-stub versions in `scripts/mirror-freshness/` in *this* repo, since GitHub write access here has no delete permission (`403 Resource not accessible by integration`).
- **Commit:** This repo: `3c9b658`, `a6ec353`, `817cd43`. Septentrion repo: `3adce26`, `e954a55`, `591217d`.
- **Next:** See DO NEXT above.
- **Watch out:** The Supabase table (`horizon_repo_health`) and the Mirrors UI panel are unchanged and still live in this repo — only the local sync script moved. **This is the precedent for where the Swiftwatch sync script should go.**

### 2026-08-22 14:40 ET · Claude chat
- **Changed:** Built the mirror-freshness checks feature end to end.
  - New Supabase table `horizon_repo_health`, owner-scoped RLS matching `horizon_projects`' exact policy pattern, unique on `(owner, repo_name)` for upserts.
  - **Standalone local sync script**: walks nine local repo mirrors, runs `git status`/`fetch`/`rev-list`, reads each repo's local `HANDOFF.md` for its newest entry timestamp, signs in to Supabase as the owner account (not a service-role key), and upserts one row per repo. Zero npm dependencies. **(Superseded by the 19:10 entry — the script moved.)**
  - **New "Mirrors" nav view** (`MirrorsView` in `App.jsx`) reading `horizon_repo_health` client-side only — no git or filesystem access from the browser. Flags uncommitted work, unpushed/behind counts, and "unbanked handoff". Sorted worst-first. Nav renumbered: Mirrors is 06, Archive moved to 07.
- **Commit:** `f4af584`, `effc59f`, `76d56b9` (later stubbed), `6b44423` (.gitignore), `c18ccf0` (App.jsx), `5a53dc8` (App.css)
- **Next:** See DO NEXT above.
- **Watch out:** `push_files` timed out again on a 4-file combined payload — fell back to four sequential `create_or_update_file` calls, no data lost.

### 2026-08-20 15:52 ET · Claude chat
- **Changed:** Ran the full visual QA pass live in the browser signed in as owner.
  - Found the root cause of a reported 404: the live app was being reached at `taylorritchie.github.io/SystemHorizon`, which was never correct — GitHub Pages serves from the owning account, and `origin` has been `TheLittlestAskew/SystemHorizon` since the 2026-07-26 migration. Correct URL is `https://thelittlestaskew.github.io/SystemHorizon/`.
  - Project → Flow, Calendar, Archive and Career all verified working; test artifacts cleaned up.
- **Commit:** none (verification pass only)
- **Next:** See DO NEXT above.
- **Watch out:** The Flow status dropdown occasionally needed a second click to register in browser automation — page interaction lag, not a reproduced app bug.

### 2026-08-18 01:36 ET · Codex
- **Changed:** Recorded three future private organizers in the registry: GitHub/local-mirror freshness and banking checks, prescription/refill and doctor-topic tracking, and family Christmas gift notes.
- **Commit:** `20ed369`
- **Next:** Decide which private organizer belongs in the next build.
- **Watch out:** Health and family records need owner-only storage and should never be exposed through public repo data or the archive feed.

### 2026-08-18 01:28 ET · Codex
- **Changed:** Recorded two future capabilities in the project registry: a local Walmart/Kroger/Publix grocery comparison with recommended carts, and a desktop brain-dump capture widget.
- **Commit:** `215b4d8`
- **Next:** Decide whether the grocery page or desktop capture widget should be next.
- **Watch out:** Price coverage, item matching, and cart automation all depend on retailer-supported access.

### 2026-08-11 17:36 ET · Claude chat
- **Changed:** Built out the three remaining scaffolded views plus a new per-project page.
  - New Supabase tables `horizon_tasks` and `horizon_events`, both reusing `set_horizon_updated_at()`.
  - **ProjectDetailView**, **Flow** (cross-project kanban), **Calendar** (month grid), **Archive** (live `HANDOFF.md` pull from every handoff-enabled repo). Removed `ScaffoldView` as dead code. New shared `TaskRow`.
- **Commit:** `737d4f8` (App.jsx), `7c926fc` (App.css)
- **Next:** Visual QA.
- **Watch out:** `push_files` timed out twice on the combined App.jsx+App.css payload (~93KB); fell back to two sequential `create_or_update_file` calls. **If editing both files together again, expect to need the same fallback.**

### 2026-08-10 17:43 ET · Claude chat
- **Changed:** Compared Career's GDOL logic against Septentrion's Job Ops panel (`dashboard/collectors/jobs.js`, read directly from the local vault) and fixed four divergences: bounded the weekly contact count to the same Sun–Sat GDOL window; surfaced an "unreported last week" alert (`ws_reported` was fetched but never displayed, hiding a real compliance gap); added an A-rated leads section; added an applications-this-week count.
- **Commit:** `4bcfbea`
- **Next:** Visual confirmation.
- **Watch out:** No zero-rows safeguard was added for `dashboard_jobs` — worth adding later if it causes confusion.

### 2026-07-27 16:42 ET · Codex
- **Changed:** Replaced the duplicate private Career tracker with the live Claude Code job pipeline, reading the same `dashboard_jobs` view as Septentrion.
- **Commit:** `9695309`
- **Next:** Confirm the live job pipeline matches Septentrion's Job Ops panel.
- **Watch out:** Full job-description text is not exposed by `dashboard_jobs`; System Horizon intentionally uses the same safe read surface.

### 2026-07-27 16:27 ET · Codex
- **Changed:** Fixed the private portfolio handoff: an empty owner-scoped registry now initializes from the checked-in 16-project portfolio on first sign-in.
- **Commit:** `89564d9`
- **Next:** Sign back in and confirm the restored portfolio records persist.

### 2026-07-27 16:19 ET · Codex
- **Changed:** Added persistent application-stage controls for Discovered, Applied, Interview, Offer, Rejected, and Archived.
- **Commit:** `defea1a`
- **Next:** Add your first application and work-search contact.

### 2026-07-27 16:15 ET · Codex
- **Changed:** Added the private Career screen: application capture, pipeline counts, and weekly GA DOL work-search contact meter.
- **Commit:** `f633f58`
- **Next:** Add your first application and work-search contact.

> Older entries archived in `handoff-archive/2026-07.md`.
