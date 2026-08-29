# HANDOFF — System Horizon

> React + Vite dashboard shell for the Septentrion system: Horizon / Projects / Flow / Calendar / Mirrors / Archive / Swift / Travel / War Room views over the project registry, handoffs, and return points.
> Handoff is **enabled** for this repo. Every change updates the DO NEXT block below and prepends a log entry.

## ▶ DO NEXT

**1. Wire up the War Room view — three lines in `src/App.jsx`, Tayls-only.** Everything else for the War Room merge is committed; the view is unreachable until App.jsx routes to it. This edit could not be done from the session that built it: the GitHub Contents API has no patch endpoint, so updating `App.jsx` means re-transmitting all 76KB, and the assistant had only read fragments of the file. Reproducing it from partial reads risks silently corrupting the main app file. Do it in the GitHub web editor instead:

- After `import { jobPipeline } from './jobPipeline'` add:
  `import WarRoomView from './WarRoomView'`
- In the `navItems` array, after `['Travel', '09'],` add:
  `['War Room', '10'],`
- In the view router, after the `activeView === 'Travel'` line, add:
  `: activeView === 'War Room' ? <WarRoomView />`

An unused `warroom-merge` branch was created for a verification path that turned out not to be needed. It is identical to main and can be deleted.

**2. Draft day is Saturday 2026-08-30.** Both War Rooms work. The standalone board at `thelittlestaskew.github.io/Fantasy-Football/` is untouched and remains the fallback — do not delete it until after the draft. Open one, hit **ESPN Sync: Off** to turn it on, and it polls every 5s and auto-marks picks taken/mine.

**⚠️ `localStorage` does not cross origins.** `sh.tayloraritchie.com` and `thelittlestaskew.github.io` are separate origins, so the SH War Room starts with an empty board and will not see any custom ranks, notes, or marks made in the standalone one. If prep exists in the standalone board, move it across with **Settings → Copy board state** in one and **Load pasted state** in the other. Pick one board before the draft starts and stay in it; running both at once means two diverging boards.

**Standing (still open, lower priority):**

1. **Set up the changedetection.io watch for flight prices.** Full walkthrough is in `Scripts/travel-watch-sync/README.md` in the vault (Visual Selector + Extract Text, not the built-in Price/Restock mode — that only works on single-product pages, and Google Flights isn't one). Get the watch UUID, put it in `travel-watch-sync.config.json`.
2. **Create `.env`** next to the script (same shape as Swiftwatch's, see README) with your changedetection API key and Horizon login.
3. **Run `node travel-watch-sync.mjs` manually once**, confirm a real price lands in the Travel tab (nav 09), marked as an automated entry.
4. **Schedule it** via Task Scheduler pointing at `run-travel-watch-sync.cmd` — **2-4 times a day, not every 30 minutes** like Swiftwatch. Flight prices don't need that granularity, and frequent automated hits raise CAPTCHA/layout-break risk. **Remember to check the trigger's Enabled box** — that's the exact thing that silently no-op'd Swiftwatch's first setup pass.

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
- **This repo deploys to a custom subdomain.** `base` in `vite.config.js` is `/`, and `public/CNAME` contains `sh.tayloraritchie.com`.

---

## Log
<!-- newest first · one entry per logical task/session · timestamp · source · changed · commit · next -->

### 2026-08-29 · Claude chat (War Room merge into System Horizon)
- **Changed:** Ported the standalone War Room draft board into SH as nav panel 10, as a self-contained module rather than a rewrite of anything existing. Four new files; `App.jsx` needs a 3-line wire-up that is still outstanding (see DO NEXT #1).
  - `src/warRoomLogic.js` — all pure draft logic (snake math, position normalisation, CSV parsing, ADP shaping, rank merging, ESPN pick application). No DOM, no React, no network, so it is unit-testable.
  - `src/warRoomLogic.test.mjs` — 22 tests covering happy paths and every edge case the original only asserted loosely (junk positions, out-of-range slots, malformed payloads, non-mutation of the rank order). Added a `test` script to `package.json`: `npm test`.
  - `src/WarRoomView.jsx` — the React view. Board, position filters, search, hide-drafted, hand-reorderable ranks, per-player notes, my-team panel, CSV import, ADP refresh, ESPN sync with a 5s poll, undo, reset.
  - `src/WarRoom.css` — fully scoped (`.warroom-*` / `.wr-pos-*`), so it can be deleted or relocated without touching `App.css`. Restyled from the standalone board's dark oklch theme into SH's daylight palette.
- **Verified, not assumed:** `npm run build` passes (65 modules, clean). `oxlint` reports 0 errors and 0 warnings attributable to the new files. All 22 logic tests pass. The component was rendered in Node via an SSR probe across four boot states — cold start, corrupted localStorage, malformed saved state, and a real restored board — and all four render without throwing. Both Vercel endpoints were called live: `/api/adp` returns 271 players, `/api/draft` returns HTTP 200 with valid ESPN auth.
- **Commit:** `984ba54` (warRoomLogic.js), `909f7db` (tests), `4d5057f` (WarRoomView.jsx), `20b362a` (WarRoom.css)
- **Next:** See DO NEXT — the App.jsx wire-up, then the draft itself.
- **Watch out:**
  - **A real bug was found and fixed during the port, by checking the live API instead of trusting the source.** The standalone board defaults to `rounds: 16`. `/api/draft` reports `teams: 20` and `totalPicks: 280`, and 280/20 = **14**. The merged version defaults to 14. Sixteen invents two rounds that don't exist and pushes every "your next pick" number wrong in the late draft. **The standalone board still has this wrong** — if it gets used on draft day, set Rounds to 14 in its Settings first.
  - **No API code was duplicated.** Both `/api/adp` and `/api/draft` already send `Access-Control-Allow-Origin: *`, so SH calls the existing Vercel functions in `TheLittlestAskew/Fantasy-Football` cross-origin. There is one source of truth for the ESPN cookies and they stay server-side. The consequence: **SH's War Room has a hard runtime dependency on the Fantasy-Football Vercel project.** Deleting or renaming that project breaks this view.
  - **Draft state is in `localStorage` (`warroom_sh_v1`), not Supabase — a deliberate exception to this repo's usual rule.** A live draft is single-device, single-day, and latency-critical, and a 5s poll writing to Supabase is a failure path that has never been exercised under load. Revisit after the draft. The cross-origin consequence is in DO NEXT.
  - **Pre-existing issue, noticed but not touched (out of scope):** the Swift dark-mode CSS block at the end of `App.css` loads *after* the "Modular daylight mode" light theme, so `.swift-item-form` and its inputs render dark-on-light. Worth a look when next in that file.
  - **The GitHub Contents API cannot patch a file** — an update re-sends the whole file. For large files an assistant has only partially read, that is a corruption risk, not a formality. Generalisable: when a change is 3 lines in a 76KB file, hand the edit over rather than rewriting the file blind.

### 2026-08-28 · Claude chat
- **Changed:** Migrating SystemHorizon off `thelittlestaskew.github.io/SystemHorizon/` onto its own subdomain, `sh.tayloraritchie.com`, gated by Cloudflare Access. Root `tayloraritchie.com` is untouched and stays on the maintenance page.
  - Set `vite.config.js` `base` from `/SystemHorizon/` to `/` — was hardcoded to the old GH Pages project-site subpath, would have broken all asset URLs at a domain root.
  - Added `public/CNAME` = `sh.tayloraritchie.com` — Vite copies `public/*` straight into `dist/` on build, so this ships through the existing `deploy-pages.yml` workflow with zero workflow changes.
- **Found while investigating (separate issue, fixed under `taylorritchie` repo's own HANDOFF):** a stale June 2026 snapshot of the old single-file SH build was still live and fully unauthenticated at `tayloraritchie.com/systemhorizon/`, hitting a Supabase project directly with an embedded anon key and RLS disabled. Neutralized.
- **Commit:** `b71bfb9` (vite.config.js), `8d31e47` (public/CNAME)
- **Next:** Cloudflare DNS + Access setup, done in the dashboard.
