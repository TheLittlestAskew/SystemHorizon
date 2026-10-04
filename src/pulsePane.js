// M12 Pulse: the right column's four tabs, and the ring.
//
// Every function here answers for BOTH scopes -- portfolio (no project selected)
// and project. The rule that makes the pane honest is criterion 6: a tab that
// cannot apply says WHY in a sentence. There is no blank tab anywhere in here,
// and no empty list standing in for an explanation.
//
// Pure, with the clock injected (the cycle.js precedent), so every boundary
// below is deterministic in test rather than true-only-on-the-day-it-ran.

import { daysSince, describeAge } from './pulseStream.js'
import { repoHealthForProject, projectRepoNotice, projectRepoStatus, unclaimedRepos } from './projectRepos.js'
import { repoStatusFlags } from './needsAttention.js'
import { compareEvents, toDateKey, addDays } from './timeline.js'

// The freshness window the ring, the Stale tab and the left column all share.
// One constant, because three surfaces disagreeing about "recent" is worse than
// any one of them being wrong.
export const FRESH_WINDOW_DAYS = 14

// Upcoming looks the same distance forward that staleness looks back.
export const UPCOMING_WINDOW_DAYS = 14

// 🛑 THE BOUNDARY, DECIDED ONCE: exactly FRESH_WINDOW_DAYS old counts as STALE.
// Same call the capacity TTL made -- "exactly at the limit counts as stale so
// the boundary has one answer". A project is fresh only if it moved strictly
// inside the window.
export function isFresh(lastActivity, now = new Date()) {
  const days = daysSince(lastActivity, now)
  // null means never. Never is not fresh; it is infinitely stale.
  if (days === null) return false
  return days < FRESH_WINDOW_DAYS
}

function isActive(project) {
  return project?.status === 'Active'
}

// Active projects that have not moved inside the window, oldest first.
// A null last_activity sorts first, because "never" is staler than any date.
export function staleProjects(projects, now = new Date()) {
  const list = Array.isArray(projects) ? projects : []
  return list
    .filter((project) => isActive(project) && !isFresh(project.lastActivity, now))
    .sort((a, b) => {
      const ad = daysSince(a.lastActivity, now)
      const bd = daysSince(b.lastActivity, now)
      if (ad === null && bd === null) return String(a.name ?? '').localeCompare(String(b.name ?? ''))
      if (ad === null) return -1
      if (bd === null) return 1
      if (ad !== bd) return bd - ad
      return String(a.name ?? '').localeCompare(String(b.name ?? ''))
    })
}

/**
 * The ring: percent of ACTIVE projects whose last_activity is inside the window.
 *
 * Returns a discriminated state rather than a bare number, because 0/0 is
 * undefined and rendering it as 0% would state a failure that did not happen.
 *
 *   { state: 'none' }     no active projects at all
 *   { state: 'reading', percent, fresh, total, stale[], oldest }
 */
export function ringReading(projects, now = new Date()) {
  const active = (Array.isArray(projects) ? projects : []).filter(isActive)
  if (active.length === 0) {
    // NOT 0%. Zero of zero is undefined, not failure.
    return { state: 'none', label: 'No active projects', percent: null, fresh: 0, total: 0, stale: [], oldest: null }
  }
  const stale = staleProjects(active, now)
  const fresh = active.length - stale.length
  return {
    state: 'reading',
    percent: Math.round((fresh / active.length) * 100),
    fresh,
    total: active.length,
    stale,
    // The ring's shortfall is a CONTROL: activating it selects this project.
    oldest: stale[0] ?? null,
    label: `${fresh} of ${active.length} active projects moved in ${FRESH_WINDOW_DAYS} days`,
  }
}

// The sentence under the ring. Section 2 forbids a decorative number, so a
// shortfall always names the action and a clean reading confirms rather than
// rendering an empty space.
export function ringCaption(reading) {
  if (reading.state === 'none') return 'Add an active project and this starts reading.'
  if (reading.stale.length === 0) return `Everything active has moved in the last ${FRESH_WINDOW_DAYS} days.`
  return `${reading.stale.length} haven't`
}

// --- Overview ----------------------------------------------------------------

export function overviewPayload({ projects = [], tasks = [], project = null, now = new Date() } = {}) {
  if (project) {
    const open = tasks.filter((task) => task.projectId === project.id && task.status !== 'Done')
    return {
      scope: 'project',
      name: project.name,
      status: project.status,
      health: project.health,
      signal: project.signal ?? 0,
      openTasks: open.length,
      age: describeAge(project.lastActivity, now),
      // nextAction is what the pane exists to surface: the one move.
      nextAction: project.nextAction || 'Choose the next honest move.',
    }
  }
  const counts = { Active: 0, Paused: 0, Idea: 0 }
  for (const p of projects) {
    if (counts[p.status] === undefined) counts[p.status] = 0
    counts[p.status] += 1
  }
  const moved = projects.filter((p) => {
    const days = daysSince(p.lastActivity, now)
    return days !== null && days <= 7
  }).length
  return {
    scope: 'portfolio',
    counts,
    openTasks: tasks.filter((task) => task.status !== 'Done').length,
    movedThisWeek: moved,
    ring: ringReading(projects, now),
  }
}

// --- Mirrors -----------------------------------------------------------------

// Worst first, then by name -- byte-for-byte the ordering MirrorsView uses, so
// the two views can never disagree about which repo is worst.
function orderWorstFirst(rows) {
  return [...rows].sort((a, b) => {
    const af = repoStatusFlags(a).flags.length
    const bf = repoStatusFlags(b).flags.length
    if (af !== bf) return bf - af
    return String(a.repoName ?? '').localeCompare(String(b.repoName ?? ''))
  })
}

export function mirrorsPayload({ repoHealth = [], projects = [], project = null } = {}) {
  if (project) {
    const status = projectRepoStatus(project)
    if (!status.hasRepo) {
      // Criterion 6: a sentence, not a blank tab.
      return { scope: 'project', rows: [], notice: projectRepoNotice(project), unclaimed: [] }
    }
    const rows = orderWorstFirst(repoHealthForProject(repoHealth, project))
    // Linked to a repo that the collector has never reported on. Saying so beats
    // an empty list that looks identical to "all clean".
    const missing = status.linked.filter((name) => !repoHealth.some((row) => row.repoName === name))
    const notice = missing.length > 0
      ? `${missing.join(', ')} ${missing.length === 1 ? 'has' : 'have'} no mirror data yet.`
      : projectRepoNotice(project)
    return { scope: 'project', rows, notice, unclaimed: [] }
  }
  const flagged = repoHealth.filter((row) => repoStatusFlags(row).flags.length > 0)
  return {
    scope: 'portfolio',
    rows: orderWorstFirst(flagged),
    notice: flagged.length === 0 && repoHealth.length > 0 ? 'Every tracked repo is clean.' : '',
    // Repos nobody claimed still surface here. A repo in no project is exactly
    // what goes unnoticed.
    unclaimed: unclaimedRepos(repoHealth, projects),
  }
}

// --- Upcoming ----------------------------------------------------------------

export function upcomingPayload({ events = [], project = null, now = new Date(), windowDays = UPCOMING_WINDOW_DAYS } = {}) {
  const todayKey = toDateKey(now)
  const endKey = addDays(todayKey, windowDays)
  const scoped = project ? events.filter((event) => event.projectId === project.id) : events
  // Date strings are ISO, so lexical comparison IS chronological comparison.
  const inWindow = scoped.filter((event) => event.date >= todayKey && event.date <= endKey)
  // compareEvents is the comparator that fixed "10:00 AM" sorting before
  // "9:00 AM". Reusing it means the pane cannot regress that bug separately.
  const rows = [...inWindow].sort(compareEvents)

  let notice = ''
  if (rows.length === 0) {
    notice = project
      ? `Nothing scheduled for ${project.name} in the next ${windowDays} days.`
      : `Nothing scheduled in the next ${windowDays} days.`
    // Distinguish "no events at all" from "only past events", because they call
    // for different actions.
    if (scoped.length > 0 && scoped.every((event) => event.date < todayKey)) {
      notice = project
        ? `${project.name} has events, but all of them are in the past.`
        : 'Every event on the calendar is in the past.'
    }
  }
  return { scope: project ? 'project' : 'portfolio', rows, notice }
}

// --- Stale -------------------------------------------------------------------

export function stalePayload({ projects = [], project = null, now = new Date() } = {}) {
  if (project) {
    // 🛑 Staleness is a PORTFOLIO question. In project scope the tab explains
    // itself and reports this project's own age rather than rendering blank.
    const age = describeAge(project.lastActivity, now)
    const detail = age === 'never'
      ? `${project.name} has no recorded activity yet.`
      : age === 'today'
        ? `${project.name} last moved today.`
        : `${project.name} last moved ${age.replace(/^(\d+)d$/, '$1 days')} ago.`
    return { scope: 'project', rows: [], notice: `Staleness is a portfolio view. ${detail}` }
  }
  const rows = staleProjects(projects, now)
  return {
    scope: 'portfolio',
    rows,
    notice: rows.length === 0
      ? `Nothing active has gone quiet for ${FRESH_WINDOW_DAYS} days.`
      : '',
  }
}

// The four tabs, in order. Exported as data so navConfig-style tests can assert
// membership without booting React.
export const PULSE_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'mirrors', label: 'Mirrors' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'stale', label: 'Stale' },
]
