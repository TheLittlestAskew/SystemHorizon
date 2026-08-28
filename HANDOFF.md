# HANDOFF — System Horizon

> React + Vite dashboard shell for the Septentrion system: Horizon / Projects / Flow / Calendar / Mirrors / Archive / Swift / Travel views over the project registry, handoffs, and return points.
> Handoff is **enabled** for this repo. Every change updates the DO NEXT block below and prepends a log entry.

## ▶ DO NEXT
**Tayls-only: finish the sh.tayloraritchie.com cutover (Cloudflare dashboard, can't be done remotely — no DNS/Access MCP tool available this session):**

1. **Add the DNS record.** Cloudflare dashboard → tayloraritchie.com zone → DNS → Add record → Type `CNAME`, Name `sh`, Target `thelittlestaskew.github.io`, Proxy status **ON** (orange cloud — required for Access to gate it).
2. **Create the Access application.** Zero Trust → Access → Applications → Add an application → Self-hosted → domain `sh.tayloraritchie.com`. Add a policy allowing only your email (Action: Allow, Include: Emails → your address). This is what makes it "sign in required" — everything else in this DO NEXT is just plumbing.
3. **Confirm GitHub Pages picks up the custom domain** once DNS propagates: repo Settings → Pages should show `sh.tayloraritchie.com` and a green "DNS check successful," then enable "Enforce HTTPS."
4. **Verify:** visit `sh.tayloraritchie.com` in a private/incognito window — you should hit the Cloudflare Access login screen before you ever see the app.

Repo-side work for this (base path, CNAME file) is already done — see log below. The GitHub Actions deploy will pick up the new base path and CNAME on the next push to `main`.

**Standing (still open, lower priority than the above):**

1. **Set up the changedetection.io watch for flight prices.** Full walkthrough is in `Scripts/travel-watch-sync/README.md` in the vault (Visual Selector + Extract Text, not the built-in Price/Restock mode — that only works on single-product pages, and Google Flights isn't one). Get the watch UUID, put it in `travel-watch-sync.config.json`.
2. **Create `.env`** next to the script (same shape as Swiftwatch's, see README) with your changedetection API key and Horizon login.
3. **Run `node travel-watch-sync.mjs` manually once**, confirm a real price lands in Swift... in the Travel tab (nav 09), marked as an automated entry.
4. **Schedule it** via Task Scheduler pointing at `run-travel-watch-sync.cmd` — **2-4 times a day, not every 30 minutes** like Swiftwatch. Flight prices don't need that granularity, and frequent automated hits raise CAPTCHA/layout-break risk. **Remember to check the trigger's Enabled box** — that's the exact thing that silently no-op'd Swiftwatch's first setup pass.

**Read the README's "Read this before setting anything up" section first** — this feature is genuinely more fragile than Swiftwatch. It extracts an actual number from a page never designed to be scraped for one, and a wrong number doesn't announce itself as an error the way a broken change-detection watch does.

Design note carried forward: **`predicted` + `confidence` on `horizon_swift_events` exist specifically so forecasts never render as facts.** The Swift Calendar tab shows a "Predicted · N%" badge for forecasts and a "Logged" badge for real dates — keep that distinction if the UI changes.

Standing repo notes:
- Naming is locked: **Rectrix Caedere** is the campaign and brand; **Aftermath Meridian** is the live website/app; **Aftermath Atlas** is its Supabase data layer.
- Remote: `origin` is `TheLittlestAskew/SystemHorizon`. The prior standalone HTML control panel is preserved as `meridian-keystone.html`.
- `README.md` is still the stock Vite template text.
- The Supabase project is named `aftermath-atlas-dev` (id `drtvlcgyjlofaffbwael`) despite the `horizon_*` table naming — same project `src/supabase.js` points at.
- **The mirror-freshness sync script is not in this repo.** It's in `TheLittlestAskew/septentrion` at `Scripts/mirror-freshness/`. **Swiftwatch (`Scripts/swiftwatch-sync/`) and now Travel watch (`Scripts/travel-watch-sync/`) both follow this exact same pattern and location.** Swiftwatch is fully live and verified on its own schedule — nothing left open on it. Travel watch's script, config template, README, skill wrapper, and launcher are all built and in place as of 2026-08-27; only the Tayls-only setup steps above remain.
- **The master context doc is not in Notion.** It's `SystemHorizon_Master_Context.md` in the Claude Project knowledge.
- **This repo's own GitHub connector cannot reach `TheLittlestAskew/septentrion`** — confirmed 2026-08-27, a `get_file_contents` call against it returned a 404 even though the repo exists and is private. Edits to files in that repo go through the local filesystem instead; they land in Tayls' normal git flow (Obsidian Git / her own commits), not through this session's GitHub tool. **This includes everything built for Travel watch sync this session — none of it is committed yet, it's all sitting locally.**
- **When verifying a Windows Task Scheduler task, check the trigger's Enabled checkbox specifically, not just that the task and trigger exist.** Caught this on Swiftwatch's first setup pass; the only real proof a task will run is watching it fire on its own schedule.
- **`TravelView`'s trip grouping normalizes the key** (trim + lowercase) as of 2026-08-27, so near-identical trip names merge into one group instead of silently fragmenting. Any future grouping keyed on free-text input should do the same.
- **`horizon_travel_watch` gained a `source` column** (`manual` / `auto`, default `manual`) as of 2026-08-27, so automated price-check rows from `travel-watch-sync` can sit alongside manual ones in the same table without being confused for each other. The Travel tab UI doesn't currently surface this distinction visually — only the data model does.
- **This repo now deploys to a custom subdomain, not the default `thelittlestaskew.github.io/SystemHorizon/` path.** `base` in `vite.config.js` is `/` (was `/SystemHorizon/`), and `public/CNAME` contains `sh.tayloraritchie.com`. Both ship automatically through the existing `deploy-pages.yml` workflow on push to `main` — no workflow changes were needed.

---

## Log
<!-- newest first · one entry per logical task/session · timestamp · source · changed · commit · next -->

### 2026-08-28 · Claude chat
- **Changed:** Migrating SystemHorizon off `thelittlestaskew.github.io/SystemHorizon/` onto its own subdomain, `sh.tayloraritchie.com`, gated by Cloudflare Access, per Tayls' decision to make SH reachable from her portfolio domain without exposing it or coupling it into the portfolio repo (subdomain + edge auth, not a path merge — keeps the "standalone/relocatable" principle intact). Root `tayloraritchie.com` is untouched and stays on the maintenance page.
  - Set `vite.config.js` `base` from `/SystemHorizon/` to `/` — was hardcoded to the old GH Pages project-site subpath, would have broken all asset URLs at a domain root.
  - Added `public/CNAME` = `sh.tayloraritchie.com` — Vite copies `public/*` straight into `dist/` on build, so this ships through the existing `deploy-pages.yml` workflow with zero workflow changes.
  - **No Cloudflare DNS/Access MCP tool was available this session** (checked; only Cloudflare's Workers-bindings connector is connected, not zone/DNS/Access management) — the DNS record and Access application have to be created by hand in the dashboard. Steps are in DO NEXT above.
- **Found while investigating (separate issue, fixed under `taylorritchie` repo's own HANDOFF):** a stale June 2026 snapshot of the old single-file SH build was still live and fully unauthenticated at `tayloraritchie.com/systemhorizon/`, hitting a Supabase project directly with an embedded anon key and RLS disabled. Neutralized — see `taylorritchie` HANDOFF.md.
- **Commit:** `b71bfb9` (vite.config.js), `8d31e47` (public/CNAME)
- **Next:** See DO NEXT above — Cloudflare DNS + Access setup is the only remaining piece, and it has to happen in the dashboard.
