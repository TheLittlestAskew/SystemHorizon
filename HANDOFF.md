# HANDOFF — System Horizon

> React + Vite dashboard shell for the Septentrion system: Horizon / Projects / Flow / Calendar / Archive views over the project registry, handoffs, and return points.
> Handoff is **enabled** for this repo. Every change updates the DO NEXT block below and prepends a log entry.

## ▶ DO NEXT
Fix the stale live-URL reference wherever it's written down (project master-context doc, any bookmarks/notes) — the correct live URL is `https://thelittlestaskew.github.io/SystemHorizon/`, not `taylorritchie.github.io/SystemHorizon/` (that account never owned this repo's Pages site and 404s). Once that's corrected, decide which of Codex's three recorded future capabilities to build next: the grocery price-comparison page, the desktop brain-dump capture widget, or one of the three private organizers (GitHub/local-mirror freshness, prescription/refill tracking, family Christmas gift notes).
- Naming is locked: **Rectrix Caedere** is the campaign and brand; **Aftermath Meridian** is the live website/app; **Aftermath Atlas** is its Supabase data layer.
- Remote: `origin` is `TheLittlestAskew/SystemHorizon`. The prior standalone HTML control panel is preserved as `meridian-keystone.html` while the Vite dashboard is the active entry point.
- `README.md` is still the stock Vite template text; it describes React+Vite, not System Horizon.

---

## Log
<!-- newest first · one entry per logical task/session · timestamp · source · changed · commit · next -->

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

### 2026-07-27 16:01 ET · Codex
- **Changed:** Moved the Project Registry onto a new owner-only `horizon_projects` table in Rectrix Caedere Supabase.
  Added private email/password access, a one-click portfolio import, explicit database errors, and the checked-in migration record.
- **Commit:** `776c4c3`
- **Next:** Create a System Horizon account, load the portfolio registry, and confirm the records persist after signing out and back in.
- **Watch out:** The job tracker is not yet in this database; only the shared secure foundation and project registry are live.

### 2026-07-27 15:31 ET · Codex
- **Changed:** Locked the Aftermath naming across the registry: Aftermath Meridian is the live analytics website, and Aftermath Atlas is its Supabase data layer.
- **Commit:** `c0476d4`
- **Next:** Connect the Project Registry to live project rows.

### 2026-07-27 15:25 ET · Codex
- **Changed:** Verified the GitHub Actions artifact replaced the prior branch deployment. The live page now loads the built React bundle and stylesheet, renders the app root, and reports no console errors.
- **Commit:** `f82c3d5`
- **Next:** Decide the canonical RC / Aftermath naming before connecting the registry to live project rows.

### 2026-07-27 15:21 ET · Codex
- **Changed:** Triggered a fresh GitHub Pages deployment after the publishing source was switched to GitHub Actions.
- **Commit:** `277680b`
- **Next:** Confirm the Actions artifact replaces the prior branch deployment.

### 2026-07-26 23:18 ET · Codex
- **Changed:** Added the GitHub Pages deployment workflow and Vite project base path; added the missing npm lockfile so the cloud build is reproducible.
- **Commit:** `8b45ea5`
- **Next:** Set Pages to GitHub Actions and confirm the first deployment completes.

### 2026-07-26 23:00 ET · Codex
- **Changed:** Connected the local Vite dashboard to `TheLittlestAskew/SystemHorizon` and safely merged its unrelated legacy history.
  Preserved the prior control panel as `meridian-keystone.html`; the Vite `index.html` remains the active entry point.
- **Commit:** `ff2075c`
- **Next:** Decide the canonical RC / Aftermath naming before connecting the registry to live project rows.

### 2026-06-23 09:37 ET · Claude chat
- **Changed:** Enabled handoff in the prior single-file SystemHorizon control panel, now preserved in this repository history.
- **Commit:** `docs: enable repo handoff`
- **Next:** Superseded by the current Vite dashboard return point.

### 2026-07-26 22:48 ET · Codex
- **Changed:** Replaced the four placeholder projects with the 16-project portfolio registry: real areas, statuses, health, metrics, summaries, return points, and project-specific field notes.
  The selected-project panel now exposes useful project context instead of an abstract signal score.
- **Commit:** `2d12c4e`
- **Next:** Decide the canonical RC / Aftermath naming before connecting the registry to live project rows.
- **Watch out:** Aftermath Atlas has known branch and migration debt; System Horizon has a missing JSX-source warning. Both are deliberately surfaced in the registry.

### 2026-07-26 20:31 ET · Codex
- **Changed:** Completed the navigation scaffold for Flow, Calendar, and Archive.
  Each now has a distinct responsive destination, explicit connection status, and an honest placeholder structure ready for real data and behavior.
- **Commit:** `266197c`
- **Next:** Choose the first scaffold to connect to real data and behavior.
- **Watch out:** Production build and lint pass. The local browser automation probe timed out, so click through Flow, Calendar, and Archive in the app before deep implementation.

### 2026-07-26 16:53 ET · Codex
- **Changed:** Removed navy as a dashboard base color.
  Rebuilt depth with true black and charcoal, while the hero and active signals now use electric blue, cyan, violet, orange, yellow, and signal-red.
- **Commit:** `f1ab94e`
- **Next:** Review the black-and-spectrum contrast before expanding the next dashboard module.
- **Watch out:** This repository still has no Git remote, so the correction is committed locally but not banked off-machine.

### 2026-07-26 14:17 ET · Codex
- **Changed:** Intensified the replacement palette across the dashboard: electric blue, cyan, violet, orange, yellow, and signal-red now appear as clear active states and module accents.
  Kept white, black, gray, and slate as the only neutral surfaces, with no pink UI color introduced.
- **Commit:** `54314d4`
- **Next:** Review the saturated palette in-browser and choose the next dashboard module to expand.
- **Watch out:** This repository still has no Git remote, so the refinement is committed locally but not banked off-machine.

### 2026-07-26 13:58 ET · Codex
- **Changed:** Rebalanced the dashboard around a light-slate canvas and modular white, charcoal, gradient, and translucent panels.
  Removed pink from the active palette, using cyan, blue, violet, orange, yellow, and lime only as intentional signals.
- **Commit:** `f9fa32e`
- **Next:** Review the light modular color balance and identify the next dashboard module to build.
- **Watch out:** This repository still has no Git remote, so the update is committed locally but not banked off-machine.

Earlier entries archived in `handoff-archive/2026-07.md`.
