# System Horizon

System Horizon is a personal task, project, and life management visualizer. It is
the calm, actionable front end for one person's work and life systems: the
Septentrion vault, its collectors, and its repo handoffs remain the deeper
collection, history, and source-of-truth layer. SH shows, prioritizes, and lets
her act on that material. It is deliberately not a second vault. The Home page
answers one question first: what needs my attention now, and what is the next
true thing?

## Orientation

| Read | For |
|---|---|
| [`docs/NORTH_STAR.md`](docs/NORTH_STAR.md) | The standing goal, the locked navigation, the milestone queue, the autonomy tiers, and when to stop and ask. **Read this before starting any work.** |
| [`AGENTS.md`](AGENTS.md) | The handoff contract every tool follows here |
| [`HANDOFF.md`](HANDOFF.md) | Where the last session stopped |
| [`docs/Horizon-Home-Information-Architecture.md`](docs/Horizon-Home-Information-Architecture.md) | The approved Home page layout and build sequence |

`NORTH_STAR.md` says what this is for and how to build it. `HANDOFF.md` says where
the last session stopped. They do not duplicate each other.

## Stack

React 19 and Vite 8, plain JSX, no TypeScript. Supabase for application data.

```
npm ci
npm run dev      # local dev server
npm run lint     # oxlint
npm test         # node --test src/*.test.mjs
npm run build    # production build
```

Every push to `main` deploys via `.github/workflows/deploy-pages.yml`. There is no
staging environment, so the definition of done in `NORTH_STAR.md` section 9 is the
only safety net.

## A note on this repository

This repository is public. Nothing personal, private, or credential-bearing
belongs in its code, comments, migrations, commit messages, or documentation. The
Supabase publishable key in `src/supabase.js` is intentionally public; nothing
else is.
