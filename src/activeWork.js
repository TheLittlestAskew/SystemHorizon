// Active Work ranking, per docs/NORTH_STAR.md M6 and the IA doc's information
// priority 4: exactly three ranked projects with name, return point and health
// signal, replacing the all-project radar.
//
// Ranking input is recency of activity (Taylor's call, 2026-09-27).
//
// What last_activity actually measures, and who writes it: it is a plain column
// on horizon_projects with a now() default on insert. Nothing in the app updates
// it after that, and until 2026-09-27 the registry seed overwrote it on every
// upsert, so all 16 rows still share one timestamp. A ranking cannot invent an
// order the data does not contain, so `tiedOnActivity` reports when recency did
// no work and the caller must say so rather than implying a meaningful order.

export const ACTIVE_WORK_LIMIT = 3

// "Active work" is the registry's own Active status. Paused and Idea are
// deliberately excluded: the IA wants what she is working on, not everything.
export const ACTIVE_STATUS = 'Active'

function activityKey(project) {
  return project.lastActivity ?? ''
}

// Recency first, then signal, then name, then id. The trailing keys are not
// decoration: with recency currently tied across every row, they are the order
// the user actually sees, so they have to be deterministic.
function compareProjects(a, b) {
  const aKey = activityKey(a)
  const bKey = activityKey(b)
  if (aKey !== bKey) {
    if (!aKey) return 1
    if (!bKey) return -1
    return aKey < bKey ? 1 : -1
  }
  const aSignal = typeof a.signal === 'number' ? a.signal : -1
  const bSignal = typeof b.signal === 'number' ? b.signal : -1
  if (aSignal !== bSignal) return bSignal - aSignal
  const byName = (a.name ?? '').localeCompare(b.name ?? '')
  if (byName !== 0) return byName
  return String(a.id ?? '').localeCompare(String(b.id ?? ''))
}

export function rankActiveWork({ projects = [], tasks = [], limit = ACTIVE_WORK_LIMIT } = {}) {
  const candidates = projects.filter((project) => project.status === ACTIVE_STATUS)
  const ranked = candidates.slice().sort(compareProjects)
  const top = ranked.slice(0, limit)

  const distinctActivity = new Set(candidates.map(activityKey)).size
  const openTasksFor = (projectId) => tasks.filter((task) => task.projectId === projectId && task.status !== 'Done').length

  return {
    items: top.map((project) => ({
      id: project.id,
      name: project.name,
      returnPoint: project.nextAction || 'Choose the next honest move.',
      health: project.health,
      tone: project.tone,
      signal: typeof project.signal === 'number' ? project.signal : null,
      lastActivity: project.lastActivity ?? null,
      openTasks: openTasksFor(project.id),
    })),
    // True when recency could not distinguish the candidates, so the visible
    // order came from the signal tiebreak instead.
    tiedOnActivity: candidates.length > 1 && distinctActivity <= 1,
    candidateCount: candidates.length,
    hidden: Math.max(0, candidates.length - top.length),
  }
}
