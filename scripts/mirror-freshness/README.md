# Mirror-freshness sync — MOVED

This script now lives in the **septentrion** vault repo, not here, since
that's where Tayls' scheduled local automation already runs from (the
07:30 `septentrion-sync` job and friends).

**New location:** `TheLittlestAskew/septentrion`, path `Scripts/mirror-freshness/`

What stays in *this* repo (SystemHorizon):
- The `horizon_repo_health` Supabase table the panel reads from
- The **Mirrors** nav view in `src/App.jsx` / `src/App.css`

What moved to septentrion:
- `mirror-freshness-sync.mjs` — the actual sync script
- `mirror-freshness-sync.config.json` — the nine repo paths
- Its README (this content, updated for the new location)

The `.mjs` and `.config.json` files left in this folder are stub
placeholders only (the tool used to edit this repo doesn't have delete
permission here) — don't run them, they just point here.
