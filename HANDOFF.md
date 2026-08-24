# HANDOFF — System Horizon

> React + Vite dashboard shell for the Septentrion system: Horizon / Projects / Flow / Calendar / Archive views over the project registry, handoffs, and return points.
> Handoff is **enabled** for this repo. Every change updates the DO NEXT block below and prepends a log entry.

## ▶ DO NEXT
Fix the stale live-URL reference wherever it's written down outside this repo (project master-context doc, any bookmarks/notes) — the correct live URL is `https://thelittlestaskew.github.io/SystemHorizon/`, not `taylorritchie.github.io/SystemHorizon/`. The master context doc also still describes the retired single-file Babel/`control-panel.html` pipeline instead of the current React+Vite+GitHub Actions architecture — both need correcting at the source (Notion).
- Naming is locked: **Rectrix Caedere** is the campaign and brand; **Aftermath Meridian** is the live website/app; **Aftermath Atlas** is its Supabase data layer.
- Remote: `origin` is `TheLittlestAskew/SystemHorizon`. The prior standalone HTML control panel is preserved as `meridian-keystone.html` while the Vite dashboard is the active entry point.
- `README.md` is still the stock Vite template text; it describes React+Vite, not System Horizon.
- The Supabase project behind System Horizon is actually named `aftermath-atlas-dev` (id `drtvlcgyjlofaffbwael`) despite the `horizon_*` table naming — same project `src/supabase.js` already points at, just noting the name mismatch so it isn't confused for a different project later.
- **The mirror-freshness sync script does not live in this repo.** It's in `TheLittlestAskew/septentrion` at `Scripts/mirror-freshness/`, because that's where Tayls' scheduled local automation already runs from. `scripts/mirror-freshness/` in *this* repo now contains only pointer stubs saying where it went — do not edit or run those files, they're placeholders (this repo's write access can't delete files, so they couldn't be removed outright).

---

## Log
<!-- newest first · one entry per logical task/session · timestamp · source · changed · commit · next -->

### 2026-08-24 ET · Claude chat
- **Changed:** Verified the mirror-freshness sync end to end. Tayls set up `.env` in `Scripts/mirror-freshness/` in the septentrion vault repo with real Supabase credentials and her System Horizon login, ran `node mirror-freshness-sync.mjs` locally, and confirmed all nine repos populated in the Mirrors tab (nav 06) with no errors and no "no local mirror" flags. This closes the item that's been sitting in DO NEXT since 2026-08-22.
  - Also trimmed this log to the last 15 entries per the repo-handoff skill's maintenance step — it had grown to 23 entries with several duplicated/out-of-order 2026-07-26 sessions. The 8 oldest were moved to `handoff-archive/2026-07.md`.
- **Commit:** none (verification pass only — no code changed; this HANDOFF.md update is the only write)
- **Next:** See DO NEXT above — the stale live-URL and retired-architecture references in the Notion master context doc are the only open item.
- **Watch out:** None.

### 2026-08-22 19:10 ET · Claude chat
- **Changed:** Relocated the mirror-freshness sync script out of this repo and into `TheLittlestAskew/septentrion` at `Scripts/mirror-freshness/`, per Tayls' direction — the scheduled local automation (07:30 `septentrion-sync` and friends) already runs from that vault, so the script belongs there rather than requiring a separate local clone of this repo just to run one script.
  - Pushed the real `mirror-freshness-sync.mjs`, `mirror-freshness-sync.config.json`, and a README to the septentrion repo, unchanged in logic from the version built earlier today — same standalone design, same zero-dependency Node script, same owner-account sign-in pattern.
  - Regenerated the Claude Code skill wrapper (`mirror-freshness-sync`) to point at the new `Scripts/mirror-freshness/` location instead of a SystemHorizon clone; handed to Tayls as a file to place in her local skills directory.
  - Deliberately did **not** touch `Return Point.md`, `Friction Log.md`, or `HANDOFF.md` in the septentrion repo — those are exclusively owned by the `septentrion-sync` automated process, which per its own HANDOFF has been fighting headless git-write permission blocks for twelve consecutive scheduled runs. Adding unrelated writes there risked interfering with an already-fragile system for no benefit; the new script needs none of those files.
  - Left pointer-stub versions of the three files in `scripts/mirror-freshness/` in *this* repo (SystemHorizon), since the GitHub write access available here has no delete permission — confirmed via a failed `delete_file` call (`403 Resource not accessible by integration`) before falling back to stubs.
- **Commit:** This repo: `3c9b658` (mjs stub), `a6ec353` (config stub), `817cd43` (README). Septentrion repo: `3adce26` (mjs), `e954a55` (config), `591217d` (README).
- **Next:** See DO NEXT above. The table and UI panel in this repo are unaffected by the move — only where the *script* runs from changed.
- **Watch out:** The Supabase table (`horizon_repo_health`) and the Mirrors UI panel are unchanged and still live in this repo, exactly where they should be — only the local sync script moved. Anyone reading this repo's `scripts/mirror-freshness/README.md` will be redirected to the septentrion repo; the septentrion repo's own README at the same relative path is the authoritative setup doc going forward.

### 2026-08-22 14:40 ET · Claude chat
- **Changed:** Built the mirror-freshness checks feature end to end (Tayls picked this from Codex's three recorded private-organizer ideas).
  - New Supabase table `horizon_repo_health` (same project as the other `horizon_*` tables), owner-scoped RLS matching `horizon_projects`' exact policy pattern, unique on `(owner, repo_name)` for upserts.
  - **Standalone local sync script** at `scripts/mirror-freshness/` (`mirror-freshness-sync.mjs` + `mirror-freshness-sync.config.json` + README): walks Tayls' nine local repo mirrors, runs `git status`/`fetch`/`rev-list --left-right --count` per repo, reads each repo's local `HANDOFF.md` for its newest entry timestamp, signs in to Supabase as the System Horizon owner account (not a service-role key), and upserts one row per repo. Zero npm dependencies — built-in `fetch` and `child_process`. Designed per Tayls' explicit ask to stay decoupled from the in-progress Septentrion/AI-ops centralization, so it can be run standalone via `node`, headless via Claude Code (`claude -p "/mirror-freshness-sync"`, same pattern as the existing `/septentrion-sync`), or folded into whatever the revamp produces later. **(Superseded by the 2026-08-22 19:10 entry above — the script no longer lives at this path.)**
  - **New "Mirrors" nav view** (`MirrorsView` in `App.jsx`) reading `horizon_repo_health` client-side only — no git or filesystem access from the browser. Flags uncommitted work, unpushed/behind commit counts, and "unbanked handoff" (local HEAD commit newer than the repo's last local HANDOFF.md entry, since the sync script's timestamp parsing treats "ET" as fixed EDT — a documented approximation, off by up to an hour during EST months). Sorted worst-first. Repos without a local mirror path just show "no local mirror on this machine" instead of stale/wrong data. Nav renumbered: Mirrors is 06, Archive moved to 07.
  - Confirmed via `apply_migration`/`execute_sql` on the Supabase MCP that the RLS policy text on the new table is byte-for-byte the same shape as `horizon_projects`' four policies before writing them.
- **Commit:** `f4af584` (sync script, later stubbed), `effc59f` (config, later stubbed), `76d56b9` (README, later stubbed), `6b44423` (.gitignore), `c18ccf0` (App.jsx), `5a53dc8` (App.css)
- **Next:** See DO NEXT above — the panel will show "No repo health data yet" until the sync script is run at least once with real credentials, since nobody's local machine has run it yet.
- **Watch out:** `push_files` timed out again on a 4-file combined payload (same known trap as the 08-11 session) — fell back to four sequential `create_or_update_file` calls, no data lost. Also: the local repo paths were provided as a screenshot/table with the `septentrion` row's remote column visually cut off (`TheLittlestAskew/septentrion`); if that repo's actual remote name differs, the config's `name` field should be corrected to match — it currently assumes `septentrion` (lowercase, matching the given remote), not `Septentrion` (the local folder's capitalization).

### 2026-08-20 15:52 ET · Claude chat
- **Changed:** Ran the full visual QA pass carried over from the 08-11 and 08-10 sessions' DO NEXT, live in the browser (Claude in Chrome) signed in as owner.
  - Found and confirmed the root cause of a reported 404: the live app was being reached at `taylorritchie.github.io/SystemHorizon`, which was never correct — GitHub Pages serves from the owning account, and `origin` has been `TheLittlestAskew/SystemHorizon` since the 2026-07-26 migration. Correct URL is `https://thelittlestaskew.github.io/SystemHorizon/`, confirmed live and loading clean.
  - Project → Flow: opened Ashfall Britannia's project page, added a test task, confirmed it appeared in Flow's Active column, moved it to Waiting via the status dropdown, confirmed the move persisted after a hard refresh. Task then deleted (test artifact cleanup).
  - Calendar: current month (August 2026) rendered correctly with today (the 20th) highlighted; added a test event on today, confirmed it showed under the day panel and persisted after refresh. Event then deleted (test artifact cleanup).
  - Archive: loaded live within a few seconds, no CORS/network errors — pulling entries from ashfall_vault, sitl_vault, and SystemHorizon's own HANDOFF.md, sorted newest-first as designed.
  - Career: all four GDOL fixes from 08-10 confirmed rendering correctly — "1 work-search contact from last week still needs to be reported to GA DOL" alert, "0/3 contacts" bounded weekly meter, "0 applications logged this week" count, and a populated A-rated leads section sorted by match %.
- **Commit:** none (verification pass only, no code changes; both test artifacts removed via the UI before session close)
- **Next:** See DO NEXT above — correct the stale URL reference at the source, then pick the next build from Codex's three recorded ideas.
- **Watch out:** The Flow status dropdown occasionally needed a second click/keypress to register in browser automation — page interaction lag, not a reproduced app bug; the underlying persistence worked correctly once the change landed.

### 2026-08-18 01:36 ET · Codex
- **Changed:** Recorded three future private organizers in the System Horizon registry: GitHub/local-mirror freshness and banking checks, prescription/refill and doctor-topic tracking, and family Christmas gift notes.
- **Commit:** `20ed369`
- **Next:** Decide which private organizer belongs in the next System Horizon build.
- **Watch out:** Health and family records need owner-only storage and should never be exposed through public repo data or the archive feed.

### 2026-08-18 01:28 ET · Codex
- **Changed:** Recorded two future System Horizon capabilities in the project registry: a local Walmart/Kroger/Publix grocery comparison with recommended carts, and a desktop brain-dump capture widget that routes notes to the right Horizon area.
- **Commit:** `215b4d8`
- **Next:** Decide whether the grocery page or desktop capture widget should be the next System Horizon build.
- **Watch out:** Price coverage, item matching, and cart automation all depend on retailer-supported access and must be verified before implementation.

### 2026-08-11 17:36 ET · Claude chat
- **Changed:** Built out the three remaining scaffolded views plus a new per-project page, per Tayls' "build all of them" direction.
  - New Supabase tables `horizon_tasks` (project-scoped, statuses Active/Waiting/Parked/Done, RLS mirrors `horizon_projects`) and `horizon_events` (date/time, optional project link, same RLS pattern), both reusing the existing `set_horizon_updated_at()` trigger.
  - **ProjectDetailView:** a dedicated full page per project, reached via a new "Open project page" button in the registry inspector — summary, next action, headline, field notes, and a real task list scoped to that project with add/status-change/delete.
  - **Flow:** now a real cross-project kanban over `horizon_tasks`, four columns by status, quick-add attachable to any project or none. Replaces the scaffold.
  - **Calendar:** a plain month grid over `horizon_events` (no external calendar library) — click a day, add/delete events. Replaces the scaffold.
  - **Archive:** live client-side pull of `HANDOFF.md` from every repo with handoff enabled (SystemHorizon, ashfall_vault, rectrixcaedere, taylorritchie, sitl_vault, pacts_power_vault — confirmed via HTTP check, the other three repos in Tayls' stack 404 and are correctly excluded), parsed into entries and merged into one feed sorted by timestamp. Replaces the scaffold.
  - Removed `ScaffoldView` entirely (dead code once all three real views existed) and its now-unused CSS.
  - New shared `TaskRow` component used by both the project page and Flow.
- **Commit:** `737d4f8` (App.jsx), `7c926fc` (App.css)
- **Next:** Visual QA per DO NEXT above — none of Flow, Calendar, Archive, or the project detail pages have been opened in the live app yet this session.
- **Watch out:** `push_files` timed out twice on the combined App.jsx+App.css payload (~93KB); fell back to two sequential `create_or_update_file` calls. If editing both files together again, expect to need the same fallback.

### 2026-08-10 17:43 ET · Claude chat
- **Changed:** Compared Career's GDOL logic against Septentrion's Job Ops panel (`dashboard/collectors/jobs.js`, read directly from the local vault) and found they diverged despite both reading `dashboard_jobs`. Fixed:
  - Bounded the weekly contact count to the same Sun–Sat GDOL window Septentrion uses (was previously open-ended, comparing local-time Date objects instead of the bounded UTC date-string window).
  - Surfaced an "unreported last week" alert — `ws_reported` was already being fetched from Supabase but never displayed, so a real GA DOL compliance gap (a logged contact still not reported) could go unnoticed. This was the most important gap found.
  - Added an "A-rated leads" section (match ≥85%, status Discovered/Saved, not past deadline, sorted by match) — previously Career had no equivalent to Septentrion's actionable-leads highlighting.
  - Added an "applications logged this week" count next to the contact meter.
  - Also updated the `systemhorizon-build` skill and the project's master-context doc, both of which still described the retired single-file Babel/`control-panel.html` architecture.
- **Commit:** `4bcfbea`
- **Next:** Sign in and visually confirm Career renders correctly (see DO NEXT above). No zero-rows safeguard was added for `dashboard_jobs` (Septentrion treats an empty result as a likely RLS/config failure and disables the panel; Career currently just shows "no jobs" either way) — worth adding later if it causes confusion.

### 2026-07-27 16:42 ET · Codex
- **Changed:** Replaced the duplicate private Career tracker with the live Claude Code job pipeline.
  Career now reads the same `dashboard_jobs` view as Septentrion, including job status, match, recommendation, deadline, source link, and GDOL activity.
- **Commit:** `9695309`
- **Next:** Open Career and confirm the live job pipeline matches Septentrion's Job Ops panel.
- **Watch out:** Full job-description text is not exposed by `dashboard_jobs`; System Horizon intentionally uses the same safe read surface as Septentrion.

### 2026-07-27 16:27 ET · Codex
- **Changed:** Fixed the private portfolio handoff: an empty owner-scoped registry now initializes from the checked-in 16-project portfolio on first sign-in.
  This prevents the temporary built-in list from appearing to vanish after authentication.
- **Commit:** `89564d9`
- **Next:** Sign back in and confirm the restored portfolio records persist after a refresh.

### 2026-07-27 16:19 ET · Codex
- **Changed:** Added persistent application-stage controls for Discovered, Applied, Interview, Offer, Rejected, and Archived.
  Moving an application to Applied records its application date; Career is now visible in the compact mobile navigation.
- **Commit:** `defea1a`
- **Next:** Add your first application and work-search contact, then confirm the weekly meter updates.

### 2026-07-27 16:15 ET · Codex
- **Changed:** Added the private Career screen: application capture, pipeline counts, and weekly GA DOL work-search contact meter.
  Created owner-only applications and contact tables in Rectrix Caedere Supabase and recorded the migration locally.
- **Commit:** `f633f58`
- **Next:** Add your first application and work-search contact, then confirm the weekly meter updates.

> Older entries archived in `handoff-archive/2026-07.md`.
