# HANDOFF — System Horizon

> React + Vite dashboard shell for the Septentrion system: Horizon / Projects / Flow / Calendar / Mirrors / Archive / Swift / Travel / War Room views over the project registry, handoffs, and return points.
> Handoff is **enabled** for this repo. Every change updates the DO NEXT block below and prepends a log entry.

## ▶ DO NEXT
**1. Draft day is Saturday 2026-08-30. The War Room is live with its draft-night visual pass, live snake board, full workspace mode, and its own Draft Board / Player Pool / My Team / Settings navigation.**
Open `sh.tayloraritchie.com` → **War Room** (nav panel 10). It loads ~271 players
from FFC ADP on first visit. Click **ESPN Sync: Off** to turn it on — polls every
5s and auto-marks picks taken/mine.

**There are two War Rooms and they cannot see each other.**

| | Where | Notes |
|---|---|---|
| SH copy | `sh.tayloraritchie.com` nav 10 | Defaults corrected (14 rounds) |
| Standalone (fallback) | `thelittlestaskew.github.io/Fantasy-Football/` | **Set Rounds to 14 manually** — its default of 16 is wrong |

**⚠️ `localStorage` does not cross origins.** The two boards are on different
origins, so custom ranks, notes, and drafted marks made in one are invisible to
the other. The SH copy has **Settings → Copy board state / Load pasted state** to
move a board across by hand. **Pick one before the draft starts and stay in it** —
running both means two diverging boards and no way to reconcile them mid-draft.

**Do not delete the Fantasy-Football repo or its Vercel project.** SH's War Room
calls `/api/adp` and `/api/draft` there cross-origin rather than duplicating the
ESPN cookie handling, so **SH has a hard runtime dependency on that Vercel
project.**

**2. Rotate the ESPN cookie (carried from the Fantasy-Football repo, still open).**
`espn_s2` was pasted in plain text into a Claude Code transcript on 2026-08-25.
Re-verified live on 2026-08-29 and it still works, which confirms it has *not*
been rotated. Not a draft-day blocker; it is a live credential for the ESPN
account. Log out of ESPN, log back in, update `ESPN_S2` in Vercel.

**3. Post-draft: consider moving War Room state to Supabase.** It is currently in
`localStorage` (`warroom_sh_v1`), a deliberate exception to this repo's usual
rule, taken because a live draft is single-device and latency-critical and a 5s
poll writing to Supabase had never been exercised. Revisit once the pressure is off.

**Standing (still open, lower priority):**

1. **Set up the changedetection.io watch for flight prices.** Full walkthrough is in `Scripts/travel-watch-sync/README.md` in the vault (Visual Selector + Extract Text, not the built-in Price/Restock mode — that only works on single-product pages, and Google Flights isn't one). Get the watch UUID, put it in `travel-watch-sync.config.json`.
2. **Create `.env`** next to the script (same shape as Swiftwatch's, see README) with your changedetection API key and Horizon login.
3. **Run `node travel-watch-sync.mjs` manually once**, confirm a real price lands in the Travel tab (nav 09), marked as an automated entry.
4. **Schedule it** via Task Scheduler pointing at `run-travel-watch-sync.cmd` — **2-4 times a day, not every 30 minutes** like Swiftwatch. Flight prices don't need that granularity, and frequent automated hits raise CAPTCHA/layout-break risk. **Remember to check the trigger's Enabled box** — that's the exact thing that silently no-op'd Swiftwatch's first setup pass.

**Small cleanup, no rush:** an unused `warroom-merge` branch exists (identical to
main, created for a verification path that turned out not to be needed) and can
be deleted. Separately, a **pre-existing CSS ordering bug**: the Swift dark-mode
block at the end of `App.css` loads *after* the "Modular daylight mode" light
theme, so `.swift-item-form` and its inputs render dark-on-light. Noticed
2026-08-29, deliberately not touched as out of scope.

Design note carried forward: **`predicted` + `confidence` on `horizon_swift_events` exist specifically so forecasts never render as facts.** The Swift Calendar tab shows a "Predicted · N%" badge for forecasts and a "Logged" badge for real dates — keep that distinction if the UI changes.

Standing repo notes:
- Naming is locked: **Rectrix Caedere** is the campaign and brand; **Aftermath Meridian** is the live website/app; **Aftermath Atlas** is its Supabase data layer.
- Remote: `origin` is `TheLittlestAskew/SystemHorizon`. The prior standalone HTML control panel is preserved as `meridian-keystone.html`.
- `README.md` is still the stock Vite template text.
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

### 2026-08-29 19:22 ET · Codex
- **Changed:** Added internal War Room navigation for the Draft Board, Player Pool, My Team, and Settings views.
  - Each page works from the same browser-local live state, so player actions and ESPN sync results remain consistent as you move around.
  - Settings now has a dedicated page, while the Draft Board stays the default full-screen view.
- **Commit:** `6d9e9c4`
- **Next:** Open `sh.tayloraritchie.com` → **War Room** and verify each top tab in the signed-in draft workspace.
- **Watch out:** The Player Pool repeats the player-action controls intentionally, so you can claim, fade, rank, or note a player without returning to the Draft Board.

### 2026-08-29 19:12 ET · Codex
- **Changed:** Added a persistent desktop navigation collapse control and made War Room a full-bleed working surface.
  - The collapsed navigation reduces to a 72px rail while preserving labels for assistive technology and the active state.
  - War Room now removes the app-wide grey canvas, max-width cap, outer card treatment, and excess margin while keeping a minimal safe inner gutter.
- **Commit:** `b23e627`
- **Next:** Open `sh.tayloraritchie.com` → **War Room**, collapse the navigation, and confirm the board uses the full remaining screen width.
- **Watch out:** The navigation preference is browser-local; a different browser or cleared storage starts expanded.

### 2026-08-29 19:06 ET · Codex
- **Changed:** Rebuilt the War Room draft page as the requested three-panel draft-room workflow.
  - Available players now sit left, the center renders a 20-team, 14-round snake board, and the right rail keeps My Team plus the next five picks visible.
  - ESPN picks now retain their overall draft number in local state, so synced cells appear in their actual board position. Manual marks claim the next unfilled position and Undo restores its prior slot.
- **Commit:** `427c2ed`
- **Next:** Open `sh.tayloraritchie.com` → **War Room**, turn on ESPN Sync, and visually confirm live picks fill the center board before draft day.
- **Watch out:** The 20-team board scrolls horizontally by design on smaller screens; shrinking its cells would make it unreadable.

### 2026-08-29 18:54 ET · Codex
- **Changed:** Restyled `src/WarRoom.css` as a contained dark draft-day command surface using the approved mockup direction.
  - Preserved the existing ESPN sync, CSV fallback, player ranking board, and local board-state behavior.
  - Reworked hierarchy, spacing, contrast, controls, board rows, position chips, and roster rail without changing shared System Horizon styles.
- **Commit:** `dd13524`
- **Next:** Open `sh.tayloraritchie.com` → **War Room** and visually verify the new board before draft day.
- **Watch out:** Local visual review reaches the owner-only access gate; it cannot inspect the signed-in board without the owner session.

### 2026-08-29 · Claude chat (War Room wire-up completed via browser)
- **Changed:** Added the three lines to `src/App.jsx` that make the War Room reachable: the `WarRoomView` import, `['War Room', '10']` in `navItems`, and the `activeView === 'War Room'` route between the Travel route and the Horizon fallback. Done by driving the GitHub web editor through the Chrome extension, because the Contents API cannot patch a file and re-sending 76KB read only in fragments was the larger risk.
- **Verified:** Pre-commit diff showed exactly 3 additions and 0 deletions. The committed file was re-downloaded and rebuilt: **the JS bundle hash matched the locally tested build exactly** (`index-BPDgdCTd.js`), proving the browser typing introduced nothing. Lint clean, 22/22 tests pass, deploy run #57 green in 33s.
- **Commit:** `7a2106a`
- **Next:** See DO NEXT — the draft itself.
- **Watch out:** **Clicking by screenshot coordinate in a scrolling editor is unreliable.** The first attempt at the route line landed after `</main>` instead of after the Travel route, because the page scrolled a few pixels between the screenshot and the click. Caught on the next screenshot, undone, and redone using **keyboard movement from a known cursor position** (`ctrl+End`, then `Up`/`End`) instead of coordinates. The pre-commit diff confirmed the undo left no residue. **Generalisable: for precise edits in a code editor, move the cursor with keys, not clicks, and always read the diff before committing.**

### 2026-08-29 · Claude chat (War Room merge into System Horizon)
- **Changed:** Ported the standalone War Room draft board into SH as nav panel 10, as a self-contained module rather than a rewrite of anything existing.
  - `src/warRoomLogic.js` — all pure draft logic (snake math, position normalisation, CSV parsing, ADP shaping, rank merging, ESPN pick application). No DOM, no React, no network, so it is unit-testable.
  - `src/warRoomLogic.test.mjs` — 22 tests covering happy paths and every edge case the original only asserted loosely (junk positions, out-of-range slots, malformed payloads, non-mutation of the rank order). Added a `test` script to `package.json`: `npm test`.
  - `src/WarRoomView.jsx` — the React view. Board, position filters, search, hide-drafted, hand-reorderable ranks, per-player notes, my-team panel, CSV import, ADP refresh, ESPN sync with a 5s poll, undo, reset, and board-state export/import.
  - `src/WarRoom.css` — fully scoped (`.warroom-*` / `.wr-pos-*`), so it can be deleted or relocated without touching `App.css`. Restyled from the standalone board's dark oklch theme into SH's daylight palette.
- **Verified, not assumed:** build passes, oxlint 0 errors and 0 warnings from the new files, all 22 logic tests pass. The component was rendered in Node via an SSR probe across four boot states — cold start, corrupted localStorage, malformed saved state, and a real restored board — and all four render without throwing. Both Vercel endpoints called live: `/api/adp` returned 271 players, `/api/draft` returned HTTP 200 with valid ESPN auth.
- **Commit:** `984ba54` (warRoomLogic.js), `909f7db` (tests), `4d5057f` (WarRoomView.jsx), `20b362a` (WarRoom.css), `5392b2a` (package.json)
- **Watch out:**
  - **A real bug was found and fixed during the port, by checking the live API instead of trusting the source.** The standalone board defaults to `rounds: 16`. `/api/draft` reports `teams: 20` and `totalPicks: 280`, and 280/20 = **14**. Sixteen invents two rounds that don't exist and pushes every "your next pick" number wrong in the late draft. **The standalone board still has this wrong.**
  - **No API code was duplicated.** Both endpoints already send `Access-Control-Allow-Origin: *`, so SH calls the existing Vercel functions cross-origin. One source of truth for the ESPN cookies, at the cost of a cross-repo runtime dependency.
  - **Draft state is in `localStorage` (`warroom_sh_v1`), not Supabase** — a deliberate, documented exception. See DO NEXT #3.

### 2026-08-28 · Claude chat
- **Changed:** Migrating SystemHorizon off `thelittlestaskew.github.io/SystemHorizon/` onto its own subdomain, `sh.tayloraritchie.com`, gated by Cloudflare Access. Root `tayloraritchie.com` is untouched and stays on the maintenance page.
  - Set `vite.config.js` `base` from `/SystemHorizon/` to `/` — was hardcoded to the old GH Pages project-site subpath, would have broken all asset URLs at a domain root.
  - Added `public/CNAME` = `sh.tayloraritchie.com` — Vite copies `public/*` straight into `dist/` on build, so this ships through the existing `deploy-pages.yml` workflow with zero workflow changes.
- **Found while investigating (separate issue, fixed under `taylorritchie` repo's own HANDOFF):** a stale June 2026 snapshot of the old single-file SH build was still live and fully unauthenticated at `tayloraritchie.com/systemhorizon/`, hitting a Supabase project directly with an embedded anon key and RLS disabled. Neutralized.
- **Commit:** `b71bfb9` (vite.config.js), `8d31e47` (public/CNAME)
- **Next:** Cloudflare DNS + Access setup — **confirmed complete 2026-08-29.**
