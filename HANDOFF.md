# HANDOFF — System Horizon

> React + Vite dashboard shell for the Septentrion system: Horizon / Projects / Flow / Calendar / Archive views over the project registry, handoffs, and return points.
> Handoff is **enabled** for this repo. Every change updates the DO NEXT block below and prepends a log entry.

## ▶ DO NEXT
Add a git remote. The scaffold is committed locally but has nowhere to push, so nothing here is backed up off this machine.
- ⚠️ Decide first whether this belongs under `TheLittlestAskew/SystemHorizon` **or** as a subroute of `taylorritchie/systemhorizon/`. The `taylorritchie` handoff has an open item to repoint `systemhorizon-build` at the subroute and archive the standalone repo, so these two plans conflict. Resolve that before creating a remote.
- `README.md` is still the stock Vite template text; it describes React+Vite, not System Horizon.

---

## Log
<!-- newest first · one entry per logical task/session · timestamp · source · changed · commit · next -->

### 2026-07-26 11:44 ET · Claude Code
- **Changed:** Added the Handoff Contract to `AGENTS.md` so Codex follows it. Codex reads `AGENTS.md`, never `~/.claude/skills/`, so it had no handoff instructions at all before this.
- **Commit:** `bd06e5f`
- **Next:** Unchanged. See the block above this log.
- **Watch out:** Log entries must now carry a tool label (`Claude Code` / `Claude desktop` / `Codex` / `ChatGPT`). Do not restructure this file; the dashboard parses it.

### 2026-07-26 11:25 ET · Claude Code
- **Changed:** Enabled repo handoff (added this `HANDOFF.md`) and made the repo's first commit: the React+Vite scaffold, 16 files.
- **Commit:** `b48dda4`
- **Next:** Resolve the standalone-vs-subroute question, then add the remote.
- **Watch out:** No remote is configured, so `git push` fails. The work is committed but not backed up anywhere.
