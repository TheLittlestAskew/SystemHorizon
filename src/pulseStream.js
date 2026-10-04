// M12 Pulse: the centre column's stream.
//
// A reverse-chronological merge of TWO sources that do not share a time format:
//
//   1. horizon_activity rows      -- timestamptz, what Taylor did in SH
//   2. parsed HANDOFF.md entries  -- free text, often date-only, sometimes absent
//
// The whole job of this module is to put those on one timeline honestly. It
// never invents a timestamp for an entry that has none: an undated handoff sorts
// to the BOTTOM, following archive.js, where raw text used to beat every real
// date.
//
// Pure. The network fetch and the parsing live in archive.js and App.jsx.

import { parseHandoffEntries } from './archive.js'
import { handoffReposForProject, projectRepoNotice, projectForRepo } from './projectRepos.js'

// Caps the MERGED list, not each source. 50 each would be 100 rows.
export const STREAM_CAP = 50

// --- time, stated once (spec section 2b) -------------------------------------
//
// Three surfaces depend on "how long ago" and they must agree, so the rule lives
// here and pulsePane.js imports it.
//
// Handoff timestamps arrive as "2026-10-04", "2026-10-04 09:30" or
// "2026-10-04 09:30 ET". A date-only value is treated as that day at 00:00
// LOCAL, not UTC: parsing "2026-10-04" with Date.parse gives UTC midnight, which
// in America/New_York is the evening of Oct 3, shifting the day by one.
export function parseEntryTime(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const text = String(value ?? '').trim()
  if (!text) return null

  // Date-only, with no time component at all.
  const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (dateOnly) {
    const [, y, m, d] = dateOnly
    return new Date(Number(y), Number(m) - 1, Number(d))
  }

  // "YYYY-MM-DD HH:MM" with an optional trailing zone label. The label is
  // dropped rather than honoured: AGENTS.md fixes it as ET, which is the zone
  // the browser is already in, and guessing an offset from a 2-letter string
  // would be worse than reading it as local.
  const dateTime = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/)
  if (dateTime) {
    const [, y, m, d, hh, mm, ss] = dateTime
    // An ISO string carrying its own offset (Z or +00:00) must NOT be re-read as
    // local -- that is the M8 double-shift bug. Those go to Date directly.
    if (/[Zz]$|[+-]\d{2}:?\d{2}$/.test(text)) {
      const parsed = new Date(text)
      return Number.isNaN(parsed.getTime()) ? null : parsed
    }
    return new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss ?? 0))
  }

  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

// Calendar-day difference in the browser's local zone, NOT a 24-hour span.
// Something at 11pm yesterday reads 1d, not "today". Matches cycle.js exactly.
const MS_PER_DAY = 86_400_000
function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

export function daysSince(value, now = new Date()) {
  const then = parseEntryTime(value)
  if (!then) return null
  return Math.round((startOfLocalDay(now) - startOfLocalDay(then)) / MS_PER_DAY)
}

// The words the left column and the Stale tab both use, so they cannot disagree.
// null last_activity reads "never", never "0d": a missing timestamp is not
// "moved today".
export function describeAge(value, now = new Date()) {
  const days = daysSince(value, now)
  if (days === null) return 'never'
  if (days <= 0) return 'today'
  return `${days}d`
}

// --- merge -------------------------------------------------------------------

function timeKey(entry) {
  const parsed = parseEntryTime(entry.occurredAt ?? entry.timestamp)
  return parsed ? parsed.getTime() : null
}

// Total order, so the list never reorders between renders. Newest first;
// anything undated sinks below everything dated; ties break on id.
export function compareStreamEntries(a, b) {
  const at = timeKey(a), bt = timeKey(b)
  if (at === null && bt !== null) return 1
  if (bt === null && at !== null) return -1
  if (at !== null && bt !== null && at !== bt) return bt - at
  return String(a.id ?? '').localeCompare(String(b.id ?? ''))
}

// Normalises a parsed handoff entry into the shape the stream renders.
export function handoffToStreamEntry(entry, projects = []) {
  const project = projectForRepo(projects, entry.repo)
  return {
    id: `handoff::${entry.id}`,
    source: 'handoff',
    repo: entry.repo,
    tool: entry.source || 'Unlabelled',
    detail: entry.detail ?? '',
    summary: entry.summary ?? '',
    occurredAt: entry.timestamp || null,
    projectId: project?.id ?? null,
    projectName: project?.name ?? null,
  }
}

// Parses the raw fetch results. `results` is [{ repo, markdown }] for successes
// and `failures` is [{ repo, message }] -- Promise.allSettled already separates
// them and the old Archive code threw the rejections away (NORTH_STAR section 4).
export function handoffEntriesFrom(results, projects = []) {
  return (Array.isArray(results) ? results : [])
    .flatMap(({ repo, markdown }) => parseHandoffEntries(markdown ?? '', repo))
    .map((entry) => handoffToStreamEntry(entry, projects))
}

/**
 * Build the stream.
 *
 * @param activity   rows already mapped through activityFromRow
 * @param handoffs   entries already mapped through handoffEntriesFrom
 * @param options    { project, failures, cap }
 *
 * Returns { entries, total, hidden, notice, failures } where `hidden` is the
 * number dropped by the cap. Nothing is ever silently truncated: `hidden` is
 * rendered in words, per the Career precedent.
 */
export function buildStream(activity, handoffs, { project = null, failures = [], cap = STREAM_CAP } = {}) {
  const activityRows = Array.isArray(activity) ? activity : []
  const handoffRows = Array.isArray(handoffs) ? handoffs : []

  let scopedActivity = activityRows
  let scopedHandoffs = handoffRows
  let notice = ''

  if (project) {
    // An activity row whose project was deleted has project_id null (the FK is
    // `on delete set null`). It still belongs in portfolio scope, but it is not
    // this project's, so it is excluded here rather than attributed wrongly.
    scopedActivity = activityRows.filter((row) => row.projectId === project.id)

    const repos = handoffReposForProject(project)
    scopedHandoffs = repos.length === 0 ? [] : handoffRows.filter((row) => repos.includes(row.repo))
    notice = projectRepoNotice(project)
  }

  const merged = [...scopedActivity, ...scopedHandoffs].sort(compareStreamEntries)
  const limit = Number.isFinite(cap) && cap > 0 ? cap : merged.length

  return {
    entries: merged.slice(0, limit),
    total: merged.length,
    hidden: Math.max(0, merged.length - limit),
    notice,
    // Failed repo fetches are NAMED, never dropped. In project scope only the
    // failures for repos this project actually owns are relevant.
    failures: project
      ? (failures ?? []).filter((f) => handoffReposForProject(project).includes(f.repo))
      : (failures ?? []),
  }
}

// The sentence for a failed fetch, so the UI never has to compose it.
export function describeFailures(failures) {
  const list = Array.isArray(failures) ? failures : []
  if (list.length === 0) return ''
  const names = list.map((f) => f.repo).join(', ')
  return list.length === 1
    ? `Could not read the handoff for ${names}, so its entries are missing.`
    : `Could not read handoffs for ${names}, so their entries are missing.`
}

// The empty state names when logging started, rather than implying nothing has
// ever happened. Real history before that date lives in the handoff entries.
export const ACTIVITY_START = '2026-10-04'

export function describeEmptyStream(project) {
  return project
    ? `Nothing recorded for ${project.name} yet. Activity logging started ${ACTIVITY_START}.`
    : `Nothing has moved yet. Activity logging started ${ACTIVITY_START}.`
}

// The timestamp as it reads in the stream.
//
// The two sources arrive in different formats and the first live render showed
// them side by side: handoffs as "2026-10-04 11:35 ET" and activity rows as the
// raw "2026-10-04T20:04:26.876497+00:00". One timeline has to read as one
// timeline, so a machine timestamp is rendered to LOCAL wall-clock -- the same
// zone Taylor's handoff entries are already written in.
//
// A handoff's own text is passed through untouched rather than reformatted: it
// is what she typed, and re-parsing it to pretty-print it risks changing what
// it says. An undated entry says so instead of showing an empty cell.
export function formatEntryWhen(entry) {
  const raw = entry?.occurredAt ?? entry?.timestamp
  if (!raw) return 'undated'
  if (entry?.source === 'handoff') return String(raw)
  const parsed = parseEntryTime(raw)
  if (!parsed) return String(raw)
  const pad = (n) => String(n).padStart(2, '0')
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())} ${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`
}

// The label on an entry saying where it came from.
//
// An activity row pointing at a project that is not in the list gets "Unknown
// project", NOT a blank: project_id is `on delete set null`, so a non-null id
// that resolves to nothing means the registry and the log disagree, and that is
// worth seeing rather than hiding. Same reasoning as taskProject.js's "Unknown
// project" option, which exists because a blank reads as unassigned when it is not.
export function describeOrigin(entry, projects = []) {
  if (entry?.source === 'handoff') {
    const repo = entry.repo || 'unknown repo'
    return entry.tool ? `${repo} · ${entry.tool}` : repo
  }
  if (!entry?.projectId) return 'No project'
  const found = (Array.isArray(projects) ? projects : []).find((project) => project.id === entry.projectId)
  return found?.name ?? 'Unknown project'
}

// Footer: "<n> projects · <n> moved this week".
export function streamFooter(projects, now = new Date()) {
  const list = Array.isArray(projects) ? projects : []
  const moved = list.filter((project) => {
    const days = daysSince(project.lastActivity, now)
    return days !== null && days <= 7
  }).length
  return { projects: list.length, movedThisWeek: moved }
}
