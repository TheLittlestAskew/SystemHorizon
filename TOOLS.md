# TOOLS — SystemHorizon

> What this project uses and what for. Maintained by the handoff motion: whenever
> a tool is used here, add or bump its row.
> Types: `Skill` · `MCP` · `CLI` · `App` · `Service` · `Site` · `Library` · `Data` · `Task`
> A `~` before a date means inferred, not observed. `—` means unknown.

## Active

| Tool | Type | Used for | Access | Last used | Cost | Notes |
|---|---|---|---|---|---|---|
| **Vite** | Library | Build + dev server | `devDependencies` `vite@^8.1.1` | 2026-08-29 | Free | `npm run dev` / `build` / `preview` |
| **React** | Library | The dashboard UI | `dependencies` `react@^19.2.7` + `react-dom` | 2026-08-29 | Free | React 19 — unlike rectrixcaedere, which is pinned to 18.2 UMD |
| **@vitejs/plugin-react** | Library | JSX transform for the Vite build | `devDependencies` `^6.0.3` | 2026-08-29 | Free | — |
| **@supabase/supabase-js** | Library | Client reads of the `projects` heartbeat table | `dependencies` `^2.110.9` | 2026-08-29 | Free | — |
| **Supabase** | Service | Main app client — the data the Vite dashboard reads | project `drtvlcgyjlofaffbwael`, `src/supabase.js` | 2026-09-03 | Free tier | Publishable key, checked in |
| **Supabase (projects heartbeat)** | Service | The `projects` table the heartbeat upserts one row per repo into | project `qzliydcrlhioradwacmd` | 2026-09-03 | Free tier | ⚠️ A **third** project, and it appears nowhere in this repo's `src/` — it's read by `meridian-keystone.html` here and by `taylorritchie/systemhorizon/index.html`. Written by `push-status-to-systemhorizon.ps1`, never by the model |
| **Supabase (job pipeline)** | Service | Job-application tracker reads | project `vtrtyagltwdrbastpppl`, `src/jobPipeline.js` | ~2026-08-29 | Free tier | Same project as `Rectrix_Caedere`; anon key checked in |
| **oxlint** | Library | Linting (`npm run lint`) | `devDependencies` `oxlint@^1.71.0`, `.oxlintrc.json` | ~2026-08-29 | Free | Rust-based; faster than eslint, which this repo does not use |
| **Node.js + npm** | CLI | Build, lint, test, preview | local install | 2026-08-29 | Free | — |
| **git** | CLI | Version control, handoff motion | `C:\Program Files\Git` | 2026-08-29 | Free | — |
| **GitHub** | Service | Remote host for `TheLittlestAskew/SystemHorizon` | github.com | 2026-08-29 | Free | Has `.github/` workflows |
| **GitHub Actions** | Service | CI on push | `.github/workflows` | ~2026-08-29 | Free | — |
| **push-status-to-systemhorizon.ps1** | Task | Reads vault Ephemeris frontmatter, upserts one row per repo into `projects` | `~/.claude/skills/septentrion-sync/` | 2026-09-02 | Free | Runs from the sync wrapper; the deterministic half of the heartbeat |
| **septentrion-sync** | Skill | Generates the Ephemeris notes the heartbeat reads | `~/.claude/skills/septentrion-sync` | 2026-09-02 | Free | ⚠️ In `TOOLS_REPOS` but **not** in `REPOS` — this repo has a `HANDOFF.md` that the dashboard does not currently read |
| **Claude Code** | App | Feature work, spec work, handoffs | CLI / IDE extension | 2026-08-29 | Paid | — |
| **sh.tayloraritchie.com** | Site | The deployed dashboard | sh.tayloraritchie.com | ~2026-08-29 | — | Nav item 10 carries the SH copy per the current DO NEXT |

## Retired

| Tool | Type | Was used for | Retired | Why |
|---|---|---|---|---|

_none yet_
