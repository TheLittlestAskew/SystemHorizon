# HANDOFF — System Horizon

> React + Vite dashboard shell for the Septentrion system: Horizon / Projects / Flow / Calendar / Mirrors / Archive / Swift / Travel views over the project registry, handoffs, and return points.
> Handoff is **enabled** for this repo. Every change updates the DO NEXT block below and prepends a log entry.

## ▶ DO NEXT
**Two active things, in any order — none blocks the others:**

1. **Visual QA the Swift view live.** Browser automation still hasn't been connected in a session that reached this item. Sign in, open the **Swift** nav item (08), confirm all three tabs render, and add a test Collection item and a test Calendar event to confirm they persist.
2. **Visual QA the Travel view live.** Same situation as Swift. Sign in, open the **Travel** nav item (09), log a test price check for a trip, confirm it saves and the "Lowest seen" badge flags correctly when a second lower price is logged for the same trip name.

**Unblocked, no longer deferred — Swiftwatch sync (formerly item 2) is fully live as of 2026-08-27:**

3. **Automate Travel price checks.** Tayls tried logging a price in the new Travel field and expected the app to fetch it automatically — it doesn't; `TravelView` is a manual log by design. Now that Swiftwatch sync is confirmed working end to end (scheduled task registered and verified, see log below), this is no longer gated. Build Travel watching the same way: a changedetection.io watch pointed at a Google Flights search URL, plus a sync script following the `swiftwatch-sync` pattern exactly (zero npm deps, `.env`-next-to-script, `--self-test` mode, owner sign-in Supabase upsert). The open problem specific to this one: there's no clean public API for live flight prices, and change-detection alone only tells you *that* the page changed, not the new price — the sync script will need actual price-parsing logic against whatever page structure Google Flights (or Kayak) serves, which is messier than Swiftwatch's job (that one only needed a change count, not a parsed value). Scope that parsing approach before starting, don't guess at a DOM selector cold.

Design note carried forward: **`predicted` + `confidence` on `horizon_swift_events` exist specifically so forecasts never render as facts.** The Swift Calendar tab shows a "Predicted · N%" badge for forecasts and a "Logged" badge for real dates — keep that distinction if the UI changes.

Standing repo notes:
- Naming is locked: **Rectrix Caedere** is the campaign and brand; **Aftermath Meridian** is the live website/app; **Aftermath Atlas** is its Supabase data layer.
- Remote: `origin` is `TheLittlestAskew/SystemHorizon`. The prior standalone HTML control panel is preserved as `meridian-keystone.html`.
- `README.md` is still the stock Vite template text.
- The Supabase project is named `aftermath-atlas-dev` (id `drtvlcgyjlofaffbwael`) despite the `horizon_*` table naming — same project `src/supabase.js` points at.
- **The mirror-freshness sync script is not in this repo.** It's in `TheLittlestAskew/septentrion` at `Scripts/mirror-freshness/`. `scripts/mirror-freshness/` here contains only pointer stubs — do not edit or run them. **The Swiftwatch sync script (`Scripts/swiftwatch-sync/` in the same repo) follows this exact same pattern and location, and is now fully live** — scheduled task, screenshot-timeout fix, and README correction all confirmed as of 2026-08-27.
- **The master context doc is not in Notion.** It's `SystemHorizon_Master_Context.md` in the Claude Project knowledge.
- **This repo's own GitHub connector cannot reach `TheLittlestAskew/septentrion`** — confirmed 2026-08-27, a `get_file_contents` call against it returned a 404 even though the repo exists and is private (not a "doesn't exist" 404 — likely the GitHub App install isn't authorized for that specific repo, unlike this one). Edits to files in that repo have to go through the local filesystem instead; they land in Tayls' normal git flow (Obsidian Git / her own commits), not through this session's GitHub tool.

---

## Log
<!-- newest first · one entry per logical task/session · timestamp · source · changed · commit · next -->

### 2026-08-27 ET · Claude chat
- **Changed:** Closed out Swiftwatch sync setup — the last open piece of DO NEXT item 2 from 2026-08-26. Claude Code had already done most of the remaining work in a separate session (confirmed by reading `septentrion`'s own `HANDOFF.md` locally before touching anything, rather than assuming state): the live sync run, the TS Store screenshot-timeout root-cause-and-fix (chunked Playwright screenshots via two `docker-compose.yml` env vars), and the `SKILL.md` + `run-swiftwatch-sync.cmd` launcher were all done and verified before this session picked up the thread.
  - What this session actually did: walked Tayls through registering the Windows Task Scheduler task (General/Triggers/Actions tabs, since Task Scheduler's UI doesn't have a simple "last run" right-click item the way it was first described — corrected mid-conversation). Confirmed the task's actual behavior by having her run `run-swiftwatch-sync.cmd` directly and read `.sync-log.txt` — exit code 0, both watches `ok`, changes:38 and changes:34. Confirmed live in the Swift > Watch UI via screenshot: both watches showing fresh `checked` timestamps (5m and 35m ago, matching their 30m/120m intervals) — the visible confusion was Tayls reading "last change" (8d/6d ago, meaning no new content) as if it were the same field as "checked" (how recently it was polled), which it isn't.
  - Fixed a stale README section: `Scripts/swiftwatch-sync/README.md` still told the reader to schedule via `claude -p "/swiftwatch-sync"`, which contradicts the actual launcher (`run-swiftwatch-sync.cmd` calls `node` directly, deliberately, since the script is deterministic and self-reporting and doesn't need a model 30–48 times a day). Corrected the README locally via Filesystem MCP.
  - Also un-gated DO NEXT item 4 (now item 3) from the 2026-08-26 session — Tayls had explicitly deferred automating Travel price-checks until Swiftwatch was confirmed working, and it now is.
- **Commit:** None in this repo (this HANDOFF.md entry only). The README fix is in the `septentrion` repo, made locally via Filesystem MCP — **not pushed by this session**, since this repo's GitHub connector returned a 404 on `TheLittlestAskew/septentrion` (see Standing repo notes). It's unstaged on Tayls' machine and will get picked up by her normal git flow.
- **Next:** See DO NEXT above. Both remaining items (Swift and Travel visual QA) need either browser automation connected in a future session, or Tayls doing a manual pass herself.
- **Watch out:** Did not attempt to fix or push the README change through any workaround (e.g. asking Tayls to paste content back) — a local, unstaged doc correction is low-stakes enough not to be worth the friction, and it'll bank naturally.
