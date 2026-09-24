# TOOLS — SystemHorizon

> What this project uses and what for. Maintained by the handoff motion: whenever
> a tool is used here, add or bump its row.
> Types: `Skill` · `MCP` · `CLI` · `App` · `Service` · `Site` · `Library` · `Data` · `Task`
> A `~` before a date means inferred, not observed. `—` means unknown.

## Active

| Tool | Type | Used for | Access | Last used | Cost | Notes |
|---|---|---|---|---|---|---|
| **Vite** | Library | Build + dev server | `devDependencies` `vite@^8.1.1` | 2026-09-24 | Free | `npm run dev` / `build` / `preview`. v8.1.5 at the M0 gate; build is ~4s |
| **React** | Library | The dashboard UI | `dependencies` `react@^19.2.7` + `react-dom` | 2026-08-29 | Free | React 19 — unlike rectrixcaedere, which is pinned to 18.2 UMD |
| **@vitejs/plugin-react** | Library | JSX transform for the Vite build | `devDependencies` `^6.0.3` | 2026-08-29 | Free | — |
| **@supabase/supabase-js** | Library | All app data reads — `horizon_projects`, `horizon_tasks`, `horizon_events`, `horizon_swift_*`, `horizon_travel_watch`, `horizon_repo_health` | `dependencies` `^2.110.9` | 2026-09-03 | Free | ⚠️ The app does **not** query the `projects` heartbeat table; that one is read only by the legacy standalone pages |
| **Supabase** | Service | Main app client — the data the Vite dashboard reads | project `drtvlcgyjlofaffbwael`, `src/supabase.js` | 2026-09-24 | Free tier | Publishable key, checked in. 11 `horizon_*` tables live as of 2026-09-24; `horizon_capture` and `horizon_now` (M3) do not exist yet |
| **Supabase (projects heartbeat)** | Service | The `projects` table the sync heartbeat upserts one row per repo into | project `qzliydcrlhioradwacmd` | 2026-09-03 | Free tier | 🛑 A **third** project, and nothing in `src/` reads it — only `meridian-keystone.html` here and `taylorritchie/systemhorizon/index.html`. The Vite app's own registry is `horizon_projects` in `drtvlcgyjlofaffbwael`, a **different table in a different project**. Written by `push-status-to-systemhorizon.ps1`, never by the model |
| **Supabase (job pipeline)** | Service | Job-application tracker reads | project `vtrtyagltwdrbastpppl`, `src/jobPipeline.js` | ~2026-08-29 | Free tier | Same project as `Rectrix_Caedere`; anon key checked in |
| **oxlint** | Library | Linting (`npm run lint`) | `devDependencies` `oxlint@^1.71.0`, `.oxlintrc.json` | 2026-09-24 | Free | Rust-based; faster than eslint, which this repo does not use. Clean on the M0 gate |
| **Node.js + npm** | CLI | Build, lint, test, preview | local install | 2026-09-24 | Free | `npm test` is `node --test src/*.test.mjs`; 28 tests at the M0 gate |
| **git** | CLI | Version control, handoff motion | `C:\Program Files\Git` | 2026-09-24 | Free | ⚠️ **`git fetch` before assuming anything about state.** The local clone was 3 commits behind `origin/main` on 2026-09-24 and `docs/NORTH_STAR.md` appeared to not exist at all until the fetch. Codex and Claude desktop also push here |
| **chrome-devtools-mcp** | MCP | Visual verification of the nav restyle (navigate + screenshot) | local MCP server | 2026-09-21 | Free | Live app is Supabase-gated; verified against a standalone static preview page instead of the running dashboard. 🛑 `NORTH_STAR.md` section 8 now forbids that workaround — ask Taylor to log in rather than building a static preview |
| **supabase-aftermath-meridian** | MCP | Live schema and row-count checks against the app database | local MCP server | 2026-09-24 | Free | → project `drtvlcgyjlofaffbwael` (`aftermath-atlas-dev`). Reached fine on 2026-09-24; an older vault note claiming it needed re-auth was stale. 🛑 **`list_tables` row counts are planner estimates, not counts** — it reported `horizon_projects` at **0** while `select count(*)` returned **16** on the same table in the same minute. That estimate is the likely source of the long-standing "horizon_projects is empty" claim. Always confirm a count with SQL |
| **GitHub** | Service | Remote host for `TheLittlestAskew/SystemHorizon` | github.com | 2026-08-29 | Free | Has `.github/` workflows |
| **GitHub Actions** | Service | CI on push | `.github/workflows` | ~2026-08-29 | Free | — |
| **push-status-to-systemhorizon.ps1** | Task | Reads vault Ephemeris frontmatter, upserts one row per repo into `projects` | `~/.claude/skills/septentrion-sync/` | 2026-09-02 | Free | Runs from the sync wrapper; the deterministic half of the heartbeat |
| **septentrion-sync** | Skill | Generates the Ephemeris notes the heartbeat reads | `~/.claude/skills/septentrion-sync` | 2026-09-02 | Free | ⚠️ In `TOOLS_REPOS` but **not** in `REPOS` — this repo has a `HANDOFF.md` that the dashboard does not currently read |
| **karpathy-guidelines** | Skill | Change discipline on every code edit, per `NORTH_STAR.md` section 8 | `~/.claude/skills/karpathy-guidelines` | 2026-09-24 | Free | ⚠️ **Six of the twelve skills section 8 mandates do not exist on this machine** (`minimal-diff`, `verified-done`, `root-cause-first`, `finish-the-turn`, `evidence-audited-analysis`, `lessons-ledger`); `repo-handoff` resolves to `handoff`. See `NORTH_STAR.md` Q7 |
| **Claude Code** | App | Feature work, spec work, handoffs | CLI / IDE extension | 2026-09-24 | Paid | ⚠️ **Remote Control's mobile leg was inactive on 2026-09-24** — `PushNotification` reported "Terminal notification sent. Mobile push not sent (Remote Control inactive)." `NORTH_STAR.md` section 7 routes blocking questions through a phone push, so that path is currently unproven; start the session with `claude --remote-control` to arm it |
| **Claude desktop** | App | Authored the Projects redesign, Calendar, dark rollout and nav icons — 26 commits between 2026-08-29 and 2026-09-02 | claude.ai / desktop | 2026-09-02 | Paid | Log entries here carry the legacy `Claude chat` label |
| **Codex** | App | Read-only System Horizon architecture audit and repository handoff | Codex desktop | 2026-09-10 | Paid | No live database or deployment action in this audit |
| **Cloudflare Access** | Service | Gates the live dashboard behind a login | `sh.tayloraritchie.com` | ~2026-08-29 | Free tier | Verified 2026-08-29 — an unauthenticated request 302s to the Access login |
| **ESPN Fantasy** | Data | Fantasy football data behind the War Room draft view | `src/WarRoomView.jsx`, `src/warRoomLogic.js` | ~2026-08-29 | Free | Cookie-based auth; the cookie needs periodic rotation |
| **localStorage** | Data | War Room draft state (`warroom_sh_v1`) | browser | ~2026-08-29 | Free | ⚠️ Deliberate exception to this repo's Supabase-everything rule — a live draft is single-device and latency-critical. Revisit post-draft |
| **sh.tayloraritchie.com** | Site | The deployed dashboard | sh.tayloraritchie.com | ~2026-08-29 | — | Nav item 10 carries the SH copy per the current DO NEXT |

## Retired

| Tool | Type | Was used for | Retired | Why |
|---|---|---|---|---|

_none yet_
