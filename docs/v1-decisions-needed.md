# v1 DECISIONS NEEDED

> Written 2026-09-30. Extracted from the tail of `SH_LAYOUT_PLAN.md`, where five
> decisions were batched, and reconciled against what actually shipped on
> 2026-09-29 and against `docs/NORTH_STAR.md` §12.
>
> **Three of the original five are already resolved.** They are kept below with
> their resolution so nobody re-asks them. The live list is §D1 to §D8.

## Status at a glance

| # | Decision | Blocks | State |
|---|---|---|---|
| ~~**D1**~~ | How does SH read `dashboard_jobs`? | Career, entirely | ✅ **Decided 2026-09-30: option A.** Spec'd as **M11** in `NORTH_STAR.md` §10. Not built |
| **D2** | Q1 · Create the Google OAuth client | **M8** | 🛑 Open, only Taylor can do it |
| **D3** | Q2 · Typed `timestamptz` columns for events | M8 build | ⚠️ Open, wanted before M8 |
| **D4** | Q3 · Retarget the heartbeat script, or leave it | nothing | Open, low stakes |
| **D5** | Q4 · `Sidequests` area vs `Side Quests` nav group | nothing | Open, low stakes |
| **D6** | Q9 · Make `lint` mean "no warnings" | nothing | Open, one line |
| **D7** | Q10 · Nav group labels fail WCAG AA (4.17:1) | nothing | Open, visual change so RED |
| **D8** | Q11 · Commit trailer conflict | nothing | ⚠️ **Answered in HANDOFF, not recorded in NORTH_STAR** |
| ~~O1~~ | Career pipeline cap: is 25 right? | — | ✅ Resolved: **Show all N** toggle |
| ~~O2~~ | Archive: group by date or by repo? | — | ✅ Resolved: **sortable table** |
| ~~O3~~ | Merge `sh-layout-v1` to `main`, and when? | — | ✅ Resolved: merged + deployed 2026-09-29 |
| ~~O4~~ | Q12 · Needs Attention placement | — | ✅ Closed 2026-09-29 |
| ~~O5~~ | Add one event and one task (an action, not a decision) | 3 DoD marks | ▶ **Still the cheapest win** |

---

## D1 · How does SH read `dashboard_jobs`? ✅ DECIDED

> ✅ **Answered 2026-09-30: option A, SH authenticates.** Written up as **M11** in
> `docs/NORTH_STAR.md` §10, with the Phase 0 research list, build rules, and seven
> acceptance criteria. **Nothing is built** — per §6, a milestone does not start as
> a side effect of the session that specified it.
>
> ▶ **Recommended to jump ahead of M9**, since Career is the only section that is
> broken rather than unfinished. The queue position is Taylor's call and M11 sits
> last in the table rather than presuming it.
>
> The analysis below is kept because it is the evidence the decision rests on, and
> because it names the fix that must **never** be taken.

**This was the only decision that blocked a whole section.** Career loads, lays out
correctly, and explains its own failure, but it shows no job rows.

### Verified live, 2026-09-30, read-only

✅ **The diagnosis this repo has been repeating is correct.** It was checked
against the live database rather than inherited, because an adjacent claim in
this same area ("no MCP server can reach that project") had already turned out to
be false. `supabase-cutter` resolves to `vtrtyagltwdrbastpppl` (`Rectrix_Caedere`),
so it can be verified from here.

| Fact | Query result |
|---|---|
| `dashboard_jobs` object type | **view** (`relkind = 'v'`) |
| `dashboard_jobs` `reloptions` | **NULL** → `security_invoker` is **not set**, so it runs as its owner and **bypasses RLS** |
| `dashboard_jobs` grants | `authenticated`, `service_role`. **`anon` has nothing at all** |
| `job_applications` RLS | **enabled** |
| `job_applications` policies | **exactly 1**: `authenticated_full_access`, `ALL`, role `{authenticated}`, `USING (true)` |
| `job_applications` grants to `anon` | `REFERENCES`, `TRIGGER` only. **No SELECT** |
| Rows | `job_applications` **345**, `dashboard_jobs` **345** |
| `src/jobPipeline.js` | anon key, and `persistSession: false, autoRefreshToken: false` — configured to **never hold a session** |

🛑 **So the one-line fix would publish 345 job-application rows.** Not "some data":
the view returns the entire table, and granting `anon` SELECT on it bypasses the
one policy that currently restricts the table to `authenticated`.

⚠️ **And there is no existing anon-safe path to reuse.** Every object in this
project that grants SELECT to `anon` was enumerated; **none of them is
job-related.** So an option D of "point Career at the view that already exists"
does not exist.

### The constraint that decides this

**The anon key is committed to a public repo** (`src/jobPipeline.js`, line 4). So
for this project, *"grant it to `anon`"* and *"publish it on the internet"* are the
same sentence. Cloudflare Access protects the **app**; it does not protect the
Supabase REST API, which is reachable by anyone holding that key.

That collapses the option space: **any route through `anon` publishes the job
search.** Only authentication keeps it private.

| Option | What it means | Cost | Privacy |
|---|---|---|---|
| **A. SH authenticates** against `vtrtyagltwdrbastpppl` | Career reads as `authenticated`, the existing policy already permits it, no schema change at all | New milestone. ⚠️ A **second, separate** auth system: a session on `drtvlcgyjlofaffbwael` is not valid here, so it means a sign-in control on Career and flipping `persistSession` to `true` | ✅ Private |
| **B. A narrow public view** (`security_invoker = on`, column subset) | ⚠️ **Does not work alone.** With `security_invoker` on, the view respects RLS, and the only policy is `authenticated`-only — so `anon` would read **0 rows silently**. It also needs a new `anon` SELECT policy on `job_applications` | Two schema changes, both blocked under the no-schema-change rule | ✗ Publishes whatever it exposes, permanently |
| **C. Leave Career as an explained error state** | Zero work. The UI already says why it is empty | Career never works; DoD stays `🛑 BLOCKED` | ✅ Private |

**Recommendation: A**, as its own milestone after M9. It is now a stronger
recommendation than it was before the verification, because A turns out to need
**no schema change at all** (the `authenticated_full_access` policy already grants
exactly what Career needs) while B needs two, and B cannot be made to work
without also publishing data.

⚠️ **Do not let A start as a side effect of another milestone**, per NORTH_STAR §6.
The awkward part is not the query, it is that this is a **second Supabase project
with its own auth**, so it is a real design conversation about how many times
Taylor signs in.

🛑 **Never store a password or service-role key in this repo to avoid that second
sign-in.** The repo is public; that is the same incident as the `anon` grant with
extra steps.

### ✅ Option A is not novel work — there is a working precedent

`taylorritchie/tracker.html` reads the **same** tables in the **same** project and
works. It works because it has a `signIn` / `signUp` flow (`tracker.html:211`) and
therefore connects as `authenticated`, which the `authenticated_full_access`
policy permits.

So the pattern option A needs is already written and already in production
against this exact database. **SH's Career view is the only consumer in the
ecosystem that tries to read job data as `anon`**, which is why it is the only one
broken.

▶ **Concrete starting point when this becomes a milestone:** read the sign-in
block in `tracker.html` first, then change `src/jobPipeline.js` from
`persistSession: false` to a persisted session plus a sign-in control on the
Career view. No schema change, no new policy, no grant.

⚠️ **Historical note so this is not "fixed" the wrong way again.** On 2026-09-22 an
`anon_read_only` policy plus an `anon` SELECT grant **were** added to
`job_applications`, explicitly accepting "this widens read access to the
publishable key on GitHub Pages". **Both were removed again before 2026-09-30** —
verified: the only surviving policy is `authenticated_full_access` and `anon` is
down to `REFERENCES, TRIGGER`. The write revokes from that same change **did**
survive. Read that as the privacy hardening wave deliberately closing an opening,
not as damage: `tracker.html` signs in, so nothing depended on it. **Re-adding an
`anon` read to unblock Career would be re-opening a hole that was closed on
purpose.**

## D2 · Q1 · Create the Google OAuth client 🛑

**M8 (Google Calendar one-way sync) is Blocked on this and nothing else.** Claude
cannot create Google Cloud credentials. You create an OAuth client with redirect
URI `sh.tayloraritchie.com`, for `taylor.ritchie14@gmail.com`. The exact console
steps get written during M8 prep, and that prep half is available now.

Decided already, for the record: read-only pull into `horizon_events`, nothing
pushed back to Google, built as an in-app OAuth button on Calendar rather than a
scheduled script.

## D3 · Q2 · Typed columns for event times ⚠️

`horizon_events.start_time` / `end_time` are free-form `text` ("10:00 AM"), which
is why `src/timeline.js` parses defensively and flags unreadable values instead
of hiding them. Google returns RFC3339 datetimes, so M8 needs this settled first.

**Recommended:** add typed `starts_at` / `ends_at timestamptz` alongside, backfill
from the parseable text, and keep the text columns until you approve removing
them. That is a schema change, so it needs your yes before anything runs.

## D4 · Q3 · The heartbeat script

`push-status-to-systemhorizon.ps1` writes to a table nothing in the Vite app
reads. Retarget it at SH, or leave it feeding the legacy pages? Not blocking
anything. **Recommended:** retarget, since the legacy pages are the stale half.

## D5 · Q4 · `Sidequests` vs `Side Quests`

The project **area** is `Sidequests`; the nav **group** is `Side Quests`.
**Recommended: keep both as-is.** They answer different questions and nothing is
broken. Listed only so it stops looking like a bug on each fresh read.

## D6 · Q9 · Make the lint gate mean what it says

`oxlint` exits 0 when it emits warnings, and the ruleset has a `"warn"` level
(`react/only-export-components`). Verified by probe: an unused variable produced a
warning **and** exit code 0. So gate item 1's "lint clean" currently means "no
errors".

There are **zero** warnings on `main` today, so tightening it breaks nothing.
**Recommended:** `"lint": "oxlint --deny-warnings"`, one line in `package.json`,
no lockfile change.

## D7 · Q10 · Nav group labels fail WCAG AA

`.nav-group-toggle` is `#6d7485` on `#0a0b1b` = **4.17:1**, under the 4.5:1
minimum, on 10px uppercase monospace where contrast matters more rather than
less. These are interactive button labels ("Projects", "System", "Side Quests"),
not decoration. For comparison on the same background: `.nav-item` `#adb5c6` =
9.48:1 ✓, Side Quests item text `#8f97a8` = 6.65:1 ✓.

**Recommended:** raise to about `#8a93a6` (≈6.2:1), still clearly subordinate to
the items. ⚠️ This is a visible change to **your** design, so it is RED and
untouched until you say go.

## D8 · Q11 · Commit message trailers ⚠️

`AGENTS.md` says every commit ends `NEXT: <single next step>`. Your global
`CLAUDE.md` says end every commit with `Co-Authored-By:`. Both cannot be last.

**This was answered in `HANDOFF.md` on 2026-09-25 (AGENTS.md wins inside this
repo: `NEXT:` last, no trailer) but NORTH_STAR §12 still reads Open.** That is a
bookkeeping discrepancy, not a real decision. ▶ Confirm the answer still stands
and it gets recorded in NORTH_STAR, closing Q11 properly.

---

## ▶ O5 · The cheapest thing on this page

Not a decision, and still the highest-value action available:

**Add one event in Calendar and a few tasks in Flow.**

`horizon_events` holds 0 rows and `horizon_tasks` holds 1. That single action
turns three `⚠️` DoD marks (Calendar, Flow, Horizon's Today & Next) into verified
behavior, because right now the only thing those screens can prove is that their
empty states render.

## Resolved, kept so they are not re-asked

- **O1 · Career cap.** The guessed hard 25 became `PIPELINE_LIMIT` plus a **Show
  all N** toggle after your review (`bc80700`), so nothing is silently cut and
  the panel counts above still match the list below.
- **O2 · Archive grouping.** Date-grouped cards lost to a **sortable, filterable,
  searchable table** with sticky headers after your review (`35dc298`, `c25cd97`).
- **O3 · Merge to `main`.** Merged (`754a052`), pushed, and deployed;
  Pages run 36627212047 for `8e143d4` is `completed / success`. The branch-only
  rule from the original task is spent. ⚠️ Note for next time: that task also
  said "do NOT merge to the branch GitHub Pages serves", and the merge happened
  anyway. If that rule matters on a future pass, it needs restating.
- **O4 · Q12 · Needs Attention placement.** Closed 2026-09-29: it stays under the
  hero. The IA's "right alert stack" is superseded by an expandable right-side
  shell panel you intend to add. ⚠️ Whoever builds that panel must **not** move
  `NeedsAttention` into it by reflex; `src/needsAttention.js` is a pure function,
  so the same data can feed a panel without the Home section moving. The panel
  itself is unspecified and is a new conversation, not a side effect.

## Housekeeping, no decision required

- The `warroom-merge` branch is identical to `main` and can be deleted.
- Post-draft: consider moving War Room state out of `localStorage` into Supabase.
  No urgency now that the draft is over.
