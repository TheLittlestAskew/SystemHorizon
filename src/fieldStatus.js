// Home field-status strip, per docs/NORTH_STAR.md M7 and section 3: four slots,
// Horizon | Projects | Career | System. Side Quests and Calendar get no slot.
//
// Every slot must carry a decision, not a decorative number (section 2). So each
// one answers "is this area asking anything of me right now", and the tone is the
// answer: cyan nothing, peach something to be aware of, coral something failed.

import { GDOL_WEEKLY_CONTACTS, gdolWeekEnding, gdolWeekWindow, inGdolWindow, repoStatusFlags } from './needsAttention.js'
import { pendingCaptures, resolveNow } from './homeState.js'
import { ACTIVE_STATUS } from './activeWork.js'

const NEEDS_ATTENTION_HEALTH = new Set(['Yellow', 'Red'])

function horizonSlot(now, tasks, captures) {
  const resolved = resolveNow(now, tasks)
  const waiting = pendingCaptures(captures).length
  const captureNote = waiting > 0 ? `${waiting} capture${waiting === 1 ? '' : 's'} to route` : 'Inbox clear'
  if (resolved.state !== 'set') {
    return { id: 'horizon', label: 'Horizon', value: 'No Now set', detail: captureNote, tone: 'peach', view: 'Horizon' }
  }
  return {
    id: 'horizon', label: 'Horizon',
    value: resolved.done ? 'Now complete' : 'Now set',
    detail: captureNote,
    tone: resolved.done ? 'peach' : 'cyan',
    view: 'Horizon',
  }
}

function projectsSlot(projects) {
  const active = projects.filter((project) => project.status === ACTIVE_STATUS)
  const unwell = active.filter((project) => NEEDS_ATTENTION_HEALTH.has(project.health)).length
  return {
    id: 'projects', label: 'Projects',
    value: `${active.length} active`,
    // Not "not green": Idle is also not green but is not a problem, so only
    // Yellow and Red count and the wording has to match that.
    detail: unwell > 0 ? `${unwell} need attention` : 'None need attention',
    tone: unwell > 0 ? 'peach' : 'cyan',
    view: 'Projects',
  }
}

// `jobSignedIn` defaults to true because every caller holding job rows was signed
// in to have got them. The state that matters is signed-out WITH an empty list:
// without this guard that renders as "0/3 contacts", which is a claim about her
// GDOL week invented from absent data. Section 4 forbids exactly that, and this is
// the surface closest to her unemployment reporting, so it must not guess.
function careerSlot(jobs, jobError, now, jobSignedIn = true) {
  if (jobError) {
    return { id: 'career', label: 'Career', value: 'Unavailable', detail: 'Job pipeline error', tone: 'coral', view: 'Career' }
  }
  if (!jobSignedIn) {
    return { id: 'career', label: 'Career', value: 'Sign in', detail: 'Job pipeline not connected', tone: 'peach', view: 'Career' }
  }
  const thisWeek = gdolWeekWindow(gdolWeekEnding(now))
  const contacts = jobs.filter((job) => inGdolWindow(job.ws_activity_date, thisWeek)).length
  const met = contacts >= GDOL_WEEKLY_CONTACTS
  return {
    id: 'career', label: 'Career',
    value: `${contacts}/${GDOL_WEEKLY_CONTACTS} contacts`,
    detail: met ? 'Week requirement met' : `${GDOL_WEEKLY_CONTACTS - contacts} more this week`,
    tone: met ? 'cyan' : 'peach',
    view: 'Career',
  }
}

function systemSlot(repoHealth, repoHealthError) {
  if (repoHealthError) {
    return { id: 'system', label: 'System', value: 'Unavailable', detail: 'Repo health error', tone: 'coral', view: 'Mirrors' }
  }
  if (repoHealth.length === 0) {
    return { id: 'system', label: 'System', value: 'No data', detail: 'Freshness sync has not run', tone: 'peach', view: 'Mirrors' }
  }
  const flagged = repoHealth.filter((repo) => repoStatusFlags(repo).flags.length > 0).length
  return {
    id: 'system', label: 'System',
    value: flagged > 0 ? `${flagged} flagged` : 'All clean',
    detail: `${repoHealth.length} repo${repoHealth.length === 1 ? '' : 's'} tracked`,
    tone: flagged > 0 ? 'peach' : 'cyan',
    view: 'Mirrors',
  }
}

// Order is fixed by section 3 and never sorted: this is a stable strip, not a
// ranking, so the slots must stay where the eye last found them.
export function buildFieldStatus({ now = null, tasks = [], captures = [], projects = [], jobs = [], jobError = '', jobSignedIn = true, repoHealth = [], repoHealthError = '', clock = new Date() } = {}) {
  return [
    horizonSlot(now, tasks, captures),
    projectsSlot(projects),
    careerSlot(jobs, jobError, clock, jobSignedIn),
    systemSlot(repoHealth, repoHealthError),
  ]
}
