# HANDOFF — System Horizon

> React + Vite dashboard shell for the Septentrion system: Horizon / Projects / Flow / Calendar / Mirrors / Archive / Swift / Travel views over the project registry, handoffs, and return points.
> Handoff is **enabled** for this repo. Every change updates the DO NEXT block below and prepends a log entry.

## ▶ DO NEXT
**Tayls-only setup steps — this is the same shape as Swiftwatch's setup tail, and genuinely can't be done remotely:**

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

---

## Log
<!-- newest first · one entry per logical task/session · timestamp · source · changed · commit · next -->

### 2026-08-27 ET · Claude chat (continued)
- **Changed:** Built the full Travel automation stack (DO NEXT item from the 2026-08-26 session, unblocked once Swiftwatch was confirmed live). Researched first rather than guessing: confirmed changedetection.io's built-in "Re-stock & Price detection" mode only works via schema.org Product metadata on single-product pages — doesn't apply to a Google Flights search results page — so this needs the Visual Selector + Extract Text approach instead, with a sync script that actually parses a dollar figure out of extracted text rather than just counting changes like Swiftwatch does. Also confirmed the exact changedetection API endpoint for pulling extracted text: `GET /api/v1/watch/<uuid>/history/latest` (text/plain).
  - **Supabase:** added a `source` column (`manual`/`auto`, default `manual`, CHECK-constrained) to `horizon_travel_watch` via `apply_migration`. Verified against the two existing rows — both defaulted to `manual` as expected, and their trip-name casing (`PAX UNPLUGGED` vs `PAX Unplugged`) confirmed the earlier grouping-bug diagnosis directly from the data.
  - **Script (`travel-watch-sync.mjs`):** mirrors `swiftwatch-sync.mjs`'s structure (same `.env`-beats-ambient precedence rule and reasoning, same `--self-test` pattern, same owner-signin approach) but is structurally different where it has to be: plain **inserts**, not upserts, since this is a log table like manual entries are, not a one-row-per-watch status table. Core new logic is `parsePriceCents()`, a pure regex-based dollar-figure extractor, unit-tested with 11 cases (plain, cents, thousands separator, leading text, malformed/zero/empty rejected, first-match-wins behavior). One failed watch doesn't block others — the run uploads whatever succeeded and exits 1 to flag that something needs attention, rather than all-or-nothing.
  - **Self-test:** 16/16 passing, run locally before anything touched the vault.
  - **Config, README, SKILL.md, launcher:** all written following the exact file layout Swiftwatch uses. README leads with an explicit "read this before setting anything up" section — flagged the real fragility (selector drift, page reordering, CAPTCHA risk, no error signal for a wrong-but-plausible number) rather than presenting this as equally reliable to Swiftwatch, which it structurally isn't.
  - **Placement:** script/config/README in `Scripts/travel-watch-sync/` in the vault; `SKILL.md` + `run-travel-watch-sync.cmd` in `~/.claude/skills/travel-watch-sync/` — matched Swiftwatch's actual file layout exactly (confirmed by checking where Swiftwatch's launcher really lives, not assumed from the README).
- **Commit:** None in this repo (this HANDOFF.md entry only). All Travel watch sync files are local-only in the vault and skills folder via Filesystem MCP — same situation as the Swiftwatch README fix from earlier today, since this repo's GitHub connector can't reach `TheLittlestAskew/septentrion`. Will get picked up by Tayls' normal git flow.
- **Next:** See DO NEXT above — four Tayls-only setup steps, same shape as Swiftwatch's tail.
- **Watch out:** ⚠️ **One harmless leftover file.** A first draft of the `.cmd` launcher was written to `Scripts/travel-watch-sync/run-travel-watch-sync.cmd` in the vault before the correct location (`~/.claude/skills/travel-watch-sync/`) was confirmed by checking Swiftwatch's actual layout. No delete tool was available this session to clean it up. It's identical in content to the real one, not divergent, so it's clutter rather than a bug — safe to delete whenever convenient. ⚠️ This automation is explicitly weaker than Swiftwatch's — read the README's fragility section before trusting a price it reports.
