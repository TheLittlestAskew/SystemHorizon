# HANDOFF — System Horizon

> React + Vite dashboard shell for the Septentrion system: Horizon / Projects / Flow / Calendar / Mirrors / Archive / Swift / Travel views over the project registry, handoffs, and return points.
> Handoff is **enabled** for this repo. Every change updates the DO NEXT block below and prepends a log entry.

## ▶ DO NEXT
**One active thing:**

1. **Confirm the Travel grouping fix live.** Tayls ran her own visual QA on both Swift and Travel this session (see log below). Swift passed clean on all three tabs — no action needed there. Travel surfaced a real bug (now fixed, see log): two price checks for the same trip were rendering as two separate trips instead of merging, because grouping used an exact string match on trip name with no trim/case-normalizing. Fixed and pushed (`2675b3c`), but not yet re-verified live — refresh Travel and confirm the two existing PAX Unplugged entries now show as one trip group ("2 checks") with only the $90 entry flagged "Lowest seen."

**Available whenever wanted — Swiftwatch sync is fully live and confirmed end to end as of 2026-08-27:**

2. **Automate Travel price checks.** Tayls tried logging a price in the new Travel field and expected the app to fetch it automatically — it doesn't; `TravelView` is a manual log by design. Swiftwatch sync is now confirmed working end to end (scheduled task fired on its own trigger, not just manually), so this is unblocked whenever it's wanted. Build Travel watching the same way: a changedetection.io watch pointed at a Google Flights search URL, plus a sync script following the `swiftwatch-sync` pattern exactly (zero npm deps, `.env`-next-to-script, `--self-test` mode, owner sign-in Supabase upsert). The open problem specific to this one: there's no clean public API for live flight prices, and change-detection alone only tells you *that* the page changed, not the new price — the sync script will need actual price-parsing logic against whatever page structure Google Flights (or Kayak) serves, which is messier than Swiftwatch's job (that one only needed a change count, not a parsed value). Scope that parsing approach before starting, don't guess at a DOM selector cold.

Design note carried forward: **`predicted` + `confidence` on `horizon_swift_events` exist specifically so forecasts never render as facts.** The Swift Calendar tab shows a "Predicted · N%" badge for forecasts and a "Logged" badge for real dates — keep that distinction if the UI changes.

Standing repo notes:
- Naming is locked: **Rectrix Caedere** is the campaign and brand; **Aftermath Meridian** is the live website/app; **Aftermath Atlas** is its Supabase data layer.
- Remote: `origin` is `TheLittlestAskew/SystemHorizon`. The prior standalone HTML control panel is preserved as `meridian-keystone.html`.
- `README.md` is still the stock Vite template text.
- The Supabase project is named `aftermath-atlas-dev` (id `drtvlcgyjlofaffbwael`) despite the `horizon_*` table naming — same project `src/supabase.js` points at.
- **The mirror-freshness sync script is not in this repo.** It's in `TheLittlestAskew/septentrion` at `Scripts/mirror-freshness/`. `scripts/mirror-freshness/` here contains only pointer stubs — do not edit or run them. **The Swiftwatch sync script (`Scripts/swiftwatch-sync/` in the same repo) follows this exact same pattern and location, and is now fully live and verified on its own schedule** — trigger fired unattended, task result "completed successfully," both watches refreshed (11m/41m ago at confirmation). Screenshot-timeout fix and README correction also confirmed. Nothing left open on this one.
- **The master context doc is not in Notion.** It's `SystemHorizon_Master_Context.md` in the Claude Project knowledge.
- **This repo's own GitHub connector cannot reach `TheLittlestAskew/septentrion`** — confirmed 2026-08-27, a `get_file_contents` call against it returned a 404 even though the repo exists and is private (not a "doesn't exist" 404 — likely the GitHub App install isn't authorized for that specific repo, unlike this one). Edits to files in that repo have to go through the local filesystem instead; they land in Tayls' normal git flow (Obsidian Git / her own commits), not through this session's GitHub tool.
- **When verifying a Windows Task Scheduler task, check the trigger's Enabled checkbox specifically, not just that the task and trigger exist.** A trigger can be fully configured (correct schedule, correct action) and still never fire if that one checkbox is off — the task will look done in every way except actually running. A manual "Run" test can't catch this either, since Task Scheduler runs on demand regardless of trigger state — the only real proof is watching the task fire on its own schedule, which is what closed this out.
- **`TravelView`'s trip grouping (and any future grouping keyed on free-text input) must normalize the key** — trim whitespace and lowercase at minimum — or near-identical user input silently fragments into separate groups. The all-caps CSS styling on trip names made this invisible in the UI: two visually identical headers were actually two different Map keys underneath. Caught via Tayls' own screenshot-based QA, not caught in review.

---

## Log
<!-- newest first · one entry per logical task/session · timestamp · source · changed · commit · next -->

### 2026-08-27 ET · Claude chat (continued)
- **Changed:** Tayls ran her own visual QA pass across Swift and Travel and sent screenshots. **Swift passed clean**: Watch tab shows both watches with real checked timestamps, Collection tab has a saved item ("The Tortured Poets Department: The Anthology," vinyl, TTPD, 1st pressing, owned), Calendar tab shows "1 past" collapsed (a saved test event). No issues found.
  - **Travel surfaced a real bug.** Two price-check entries for the same trip ("PAX Unplugged") rendered as two separate trip groups, each showing "1 check" and its own "Lowest seen" badge, instead of merging into one group of 2 with a single lowest-price flag. Root-caused in the code (not guessed): `TravelView`'s grouping did `trips.set(entry.tripName, ...)` — an exact string match with no trimming or case-normalizing. The trip names must have differed slightly between the two log entries (whitespace or capitalization); the UI's all-caps styling made both headers render identically, masking the underlying mismatch.
  - **Fixed:** grouping key is now `entry.tripName.trim().toLowerCase()`. Display still uses the original-cased `tripName` from the first entry in each group (`first.tripName`), so casing as typed is preserved in what's shown — only the *grouping* is case/whitespace-insensitive. Caught and fixed a second bug introduced by my own first pass at this patch before pushing: the display line still referenced the now-lowercased map key instead of `first.tripName`, which would have shown lowercase trip names in the UI. Fixed before push, not after.
  - Pulled fresh `App.jsx` from the repo, patched, syntax-checked with `@babel/parser`, compiled with `@babel/core` + `@babel/preset-react`, then pushed as a single `create_or_update_file` call.
- **Commit:** `2675b3c`
- **Next:** See DO NEXT above — needs one live check that the fix actually merges the two existing PAX Unplugged entries as expected.
- **Watch out:** This is a real, live-verified bug (not theoretical) that shipped in the original Travel build. Worth remembering for any future feature that groups by free-text user input: normalize the grouping key, always.
