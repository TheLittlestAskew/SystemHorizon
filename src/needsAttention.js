// Home "Needs attention" aggregator, per docs/NORTH_STAR.md M4 and the IA doc's
// information priority 2. At most five alerts, each with an explicit reason and
// date, ordered deterministically.
//
// This module also owns the GA DOL week maths and the repo-health flag rules.
// They were in App.jsx, used only by CareerView and MirrorsView; Home now needs
// the same rules, and the IA's data rules say to use existing data rather than
// add a second source of truth. One definition, imported by all three.

// Severity doubles as the sort key, so lower is more urgent. Only these two
// appear as alerts: "stable" is the absence of one. Severity carries no color;
// the component maps it to a reserved status token, so this module stays pure
// logic and the palette lives in one place.
export const SEVERITY = { action: 1, awareness: 2 }

// A FLOOD GUARD, not a layout constant. It was 5, which hid 4 routine alerts
// behind "4 more not shown" while 182px of dead space sat directly beneath the
// panel -- the cap was costing information and buying nothing.
//
// 🛑 Do NOT tune this to make the two Home columns the same height. Both columns
// are data-driven (the neighbour renders however many events exist), so no
// single value balances them on any day but the one it was measured on -- that
// is how `232 days left` happened. Column balance is a CSS concern; this number
// only answers "how many alerts before the list stops being readable".
export const ATTENTION_LIMIT = 12

// The mirror-freshness collector is a scheduled local script, so a gap means it
// stopped running. A week is long enough to not cry wolf over a quiet weekend.
export const MIRROR_STALE_DAYS = 7

// GA DOL requires three work-search contacts per benefit week.
export const GDOL_WEEKLY_CONTACTS = 3

export const A_RATED_STATUS = new Set(['Discovered', 'Saved'])
export const UNREPORTED_STATUS = new Set(['Applied', 'Interview'])

export function gdolWeekEnding(now = new Date()) {
  const d = new Date(now)
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7))
  return toDateKey(d)
}

export function gdolWeekWindow(weekEnding) {
  const end = new Date(`${weekEnding}T00:00:00Z`)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - 6)
  return { start: start.toISOString().slice(0, 10), end: weekEnding }
}

export function shiftDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function inGdolWindow(dateStr, win) {
  return !!dateStr && dateStr >= win.start && dateStr <= win.end
}

export function toDateKey(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function repoStatusFlags(repo) {
  if (!repo.hasLocalMirror) return { flags: [repo.checkError || 'No local mirror on this machine'], tone: 'violet' }
  const flags = []
  if (repo.checkError) flags.push(repo.checkError)
  if (repo.uncommittedCount > 0) flags.push(`${repo.uncommittedCount} uncommitted change${repo.uncommittedCount === 1 ? '' : 's'}`)
  if (repo.aheadCount > 0) flags.push(`${repo.aheadCount} unpushed commit${repo.aheadCount === 1 ? '' : 's'}`)
  if (repo.behindCount > 0) flags.push(`${repo.behindCount} commit${repo.behindCount === 1 ? '' : 's'} behind remote`)
  if (repo.localHeadAt && repo.lastHandoffAt && repo.localHeadAt > repo.lastHandoffAt) flags.push('Unbanked handoff')
  return { flags, tone: flags.length ? 'coral' : 'cyan' }
}

function daysOld(iso, now) {
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return null
  return Math.floor((now.getTime() - then.getTime()) / 86400000)
}

// Alerts with no date sort last within their severity; `id` is the final
// tiebreak so the order never depends on input order.
function compareAlerts(a, b) {
  if (a.severity !== b.severity) return a.severity - b.severity
  if (a.date !== b.date) {
    if (!a.date) return 1
    if (!b.date) return -1
    return a.date < b.date ? -1 : 1
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

function careerAlerts(jobs, now) {
  const today = toDateKey(now)
  const weekEnding = gdolWeekEnding(now)
  const thisWeek = gdolWeekWindow(weekEnding)
  const prevWeek = gdolWeekWindow(shiftDays(weekEnding, -7))
  const out = []

  const unreported = jobs.filter((job) => UNREPORTED_STATUS.has(job.status) && job.ws_reported === false && inGdolWindow(job.ws_activity_date, prevWeek)).length
  if (unreported > 0) {
    out.push({
      id: 'career:gdol-unreported', source: 'career', severity: SEVERITY.action, date: prevWeek.end,
      reason: `${unreported} work-search contact${unreported === 1 ? '' : 's'} from last week still unreported to GA DOL`,
    })
  }

  const contacts = jobs.filter((job) => inGdolWindow(job.ws_activity_date, thisWeek)).length
  if (contacts < GDOL_WEEKLY_CONTACTS) {
    const missing = GDOL_WEEKLY_CONTACTS - contacts
    out.push({
      id: 'career:gdol-shortfall', source: 'career', severity: SEVERITY.awareness, date: weekEnding,
      reason: `${missing} more work-search contact${missing === 1 ? '' : 's'} needed by ${weekEnding}`,
    })
  }

  for (const job of jobs) {
    // An application already sent cannot miss its own deadline.
    if (!job.deadline || UNREPORTED_STATUS.has(job.status) || job.deadline > today) continue
    out.push({
      id: `career:deadline:${job.id}`, source: 'career', severity: SEVERITY.action, date: job.deadline,
      reason: `${job.title || 'Untitled role'} deadline ${job.deadline === today ? 'is today' : 'has passed'}`,
    })
  }

  for (const job of jobs) {
    if (typeof job.match_percent !== 'number' || job.match_percent < 85) continue
    if (!A_RATED_STATUS.has(job.status)) continue
    if (job.deadline && job.deadline < today) continue
    out.push({
      id: `career:lead:${job.id}`, source: 'career', severity: SEVERITY.awareness, date: job.deadline ?? null,
      reason: `${job.title || 'Untitled role'} is a ${job.match_percent}% match with no application yet`,
    })
  }

  return out
}

function mirrorAlerts(repoHealth, now, staleAfterDays) {
  const out = []

  for (const repo of repoHealth) {
    const { flags } = repoStatusFlags(repo)
    if (!flags.length) continue
    const severity = repo.checkError ? SEVERITY.action : SEVERITY.awareness
    out.push({
      id: `mirrors:${repo.id ?? repo.repoName}`, source: 'mirrors', severity,
      date: repo.checkedAt ? repo.checkedAt.slice(0, 10) : null,
      reason: `${repo.repoName}: ${flags.join(', ')}`,
    })
  }

  // Every flag above is only as fresh as the check that produced it, so a
  // stalled collector is itself an alert rather than a silent caveat.
  const newest = repoHealth.map((repo) => repo.checkedAt).filter(Boolean).sort().at(-1)
  const age = newest ? daysOld(newest, now) : null
  if (age !== null && age >= staleAfterDays) {
    out.push({
      id: 'mirrors:stale', source: 'mirrors', severity: SEVERITY.awareness, date: newest.slice(0, 10),
      reason: `Mirror data is ${age} days old: the freshness collector has not run`,
    })
  }

  return out
}

// A failing source contributes an error instead of alerts; the other source
// still renders. Never returns more than ATTENTION_LIMIT alerts.
export function buildNeedsAttention({ jobs = [], jobError = '', jobSignedIn = true, repoHealth = [], repoError = '', now = new Date(), staleAfterDays = MIRROR_STALE_DAYS } = {}) {
  const alerts = []
  const errors = []

  // Signed out is neither an error nor a reason to raise an alert: every career
  // rule counts rows, so running them on an empty list would fabricate compliance
  // facts ("3 more work-search contacts needed") from data we simply do not have.
  // The signed-out state is surfaced by the field-status strip instead, where it is
  // one click from resolved. `jobSignedIn` defaults true so callers holding job
  // rows behave as before.
  if (jobError) errors.push({ source: 'career', message: jobError })
  else if (jobSignedIn) alerts.push(...careerAlerts(jobs, now))

  if (repoError) errors.push({ source: 'mirrors', message: repoError })
  else alerts.push(...mirrorAlerts(repoHealth, now, staleAfterDays))

  const ordered = alerts.slice().sort(compareAlerts)
  return {
    alerts: ordered.slice(0, ATTENTION_LIMIT),
    overflow: Math.max(0, ordered.length - ATTENTION_LIMIT),
    errors,
  }
}

// The hero's status line. It was the literal text "Systems nominal", rendered
// unconditionally -- so on 2026-10-03 it reassured Taylor that systems were
// nominal while nine alerts sat directly below it and the mirror-freshness
// collector had been dead for forty days.
//
// 🛑 An unconditional reassurance is worse than a wrong number: `232 days left`
// is merely false, but "nominal" actively tells her not to look. A status
// indicator that cannot report a bad state is decoration wearing an
// instrument's clothes.
//
// Severity order is errors > action > awareness > clear. Errors outrank action
// because a source that failed to load is an UNKNOWN, not a clean read -- the
// one state that must never be reported as nominal.
export function systemStatus({ alerts = [], errors = [] } = {}) {
  if (errors.length > 0) return { tone: 'coral', label: 'Sources unavailable', level: 'error' }

  const action = alerts.filter((alert) => alert.severity === SEVERITY.action).length
  if (action > 0) return { tone: 'coral', label: `${action} need${action === 1 ? 's' : ''} action`, level: 'action' }

  if (alerts.length > 0) return { tone: 'peach', label: `${alerts.length} to be aware of`, level: 'awareness' }

  return { tone: 'cyan', label: 'Systems nominal', level: 'clear' }
}
