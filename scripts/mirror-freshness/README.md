# Mirror-freshness sync

Checks the git state of your local repo mirrors against GitHub and uploads
the results to System Horizon's `horizon_repo_health` table. The Horizon
"Mirrors" panel reads that table — it never talks to git or the filesystem
directly.

Standalone on purpose: this doesn't touch Septentrion's sync logic or
schema, so it's safe to leave here, move into a centralized AI-ops repo
later, or fold into a bigger script whenever that revamp settles.

## What it checks per repo
- **Uncommitted work** — `git status --porcelain` line count
- **Ahead / behind** — commits local-only vs remote-only, after a `git fetch`
- **Unbanked handoffs** — flagged in the UI by comparing the local HEAD
  commit timestamp against the newest entry in that repo's local
  `HANDOFF.md` (repos without a `HANDOFF.md` just show no handoff data)

## One-time setup

1. **Fill in the config.** `mirror-freshness-sync.config.json` already has
   your nine repo paths from the locations you sent. Edit it directly if
   any path changes or a repo gets added/removed.

2. **Create a `.env` file** next to the script (same folder) — never commit
   this file:
   ```
   SUPABASE_URL=https://drtvlcgyjlofaffbwael.supabase.co
   SUPABASE_ANON_KEY=sb_publishable_MITAm9B6x2IwI8ycF0xgTg_8kwT80LA
   HORIZON_EMAIL=your-system-horizon-login-email
   HORIZON_PASSWORD=your-system-horizon-login-password
   ```
   The anon key above is the same public key already baked into System
   Horizon's own client code — it's not a secret, RLS is what protects the
   data. Your email/password *are* sensitive; that's why they're local-only.

3. **Test it manually:**
   ```
   node mirror-freshness-sync.mjs
   ```
   You should see one line per repo, then "Done." Check the Mirrors panel
   in System Horizon to confirm the rows landed.

## Running it headless via Claude Code

Same pattern as the existing Septentrion 07:30 generator:
```
claude -p "/mirror-freshness-sync"
```
This requires a matching skill/slash-command that just shells out to
`node mirror-freshness-sync.mjs` in this folder. If you want, ask me to
scaffold that skill file next — it's a two-line wrapper.

## Scheduling

Add a Windows Task Scheduler action pointing at the same command, on
whatever cadence makes sense (daily alongside Septentrion's sync is a
reasonable default). No code changes needed in System Horizon to adjust
the cadence — it only ever reads whatever the table's `checked_at` last
says.

## Known limitations

- `last_handoff_at` parsing assumes the "ET" timestamps in HANDOFF.md are
  EDT (UTC-4). During EST months (roughly Nov–Mar) this is off by an hour —
  fine for a freshness flag, not for precise auditing.
- A repo whose local path doesn't exist, or isn't a git repo, gets marked
  `has_local_mirror: false` with the reason in `check_error` rather than
  failing the whole run.
- If `git fetch` fails (offline, auth issue), the row still uploads with
  whatever local data was gathered plus the error message, so a bad network
  moment doesn't wipe out the last known-good status in the UI — that's the
  sync script's job for next time, not this run's.
