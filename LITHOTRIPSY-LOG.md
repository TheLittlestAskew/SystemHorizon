# LITHOTRIPSY LOG — SystemHorizon

> Work run under `/lithotripsy`, where Claude carries the load and Taylor rests.
> Every run lands on its own branch with a backup tag. Nothing here touches `main`.
> Newest first.

---

## 2026-10-04 · high · no modifiers

- **Task:** Fix the `sitl_vault` gap — the 404 flagged in the M12 Pulse session.
- **Branch:** `lithotripsy/sitl-archive-gap` (pushed)
- **Backup tag:** `lithotripsy-backup-20261004-1624`
- **Commits:** `27f8d7e`

**What changed**

`sitl_vault` had been failing every Archive and Pulse load. It had **two
independent causes**, and fixing only one would have looked like a fix and
still 404'd:

1. The repo was **renamed** to `skitl_vault` in the 2026-10-02 SKITL rename.
2. `skitl_vault` is **private**. The fetch is an anonymous GET against
   `raw.githubusercontent.com`, which serves public repos only, so the new name
   404s too. It does hold a real 159KB `HANDOFF.md`.

Removed it from `ARCHIVE_REPOS` with both reasons written down, corrected Sky Is
The Limit's `repo_names` to the true name, and added a test that rejects ten
known private or renamed repos **by name, with the reason**, so a future session
cannot quietly re-add one.

Verified live: all five remaining repos return 200/304, zero 404s, failure
banner gone. 408 tests, lint clean, build exit 0.

**Queued for Taylor**

1. 🛑 **Making `skitl_vault` public is the only way SITL handoffs come back.** No
   code change can substitute: SystemHorizon is itself public, so a token shipped
   to authenticate the fetch would be published.
2. ⚠️ **Found, not fixed (out of task scope):** `src/App.css` carries a ~90KB
   `data:image/webp` background (the Projects header placeholder, `a3b1a12`) that
   Chrome rejects with `ERR_INVALID_URL` on every load. Not truncated — the
   base64 decodes to the length its RIFF header declares and holds no whitespace
   — so the cause is unidentified. A 90KB asset in the bundle that never renders.
3. The branch is **not merged**. Merge whenever you want it; nothing depends on it.
