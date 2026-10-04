import test from 'node:test'
import assert from 'node:assert/strict'
import {
  STREAM_CAP, parseEntryTime, daysSince, describeAge, compareStreamEntries,
  handoffToStreamEntry, handoffEntriesFrom, buildStream, describeFailures,
  describeEmptyStream, streamFooter, ACTIVITY_START, describeOrigin, formatEntryWhen,
} from './pulseStream.js'

const NOW = new Date(2026, 9, 4, 14, 0, 0) // 2026-10-04 14:00 local

const SH = { id: 'p1', name: 'System Horizon', repoNames: ['SystemHorizon'] }
const NO_REPO = { id: 'p2', name: 'Learn JavaScript', repoNames: null }
const UNMONITORED = { id: 'p3', name: 'Atlas', repoNames: ['aftermath-atlas'] }

function activity(id, occurredAt, projectId = 'p1') {
  return { id: `activity::${id}`, source: 'activity', kind: 'task_created', projectId, summary: `entry ${id}`, occurredAt }
}
function handoff(id, repo, timestamp) {
  return { id: `handoff::${id}`, source: 'handoff', repo, tool: 'Claude Code', summary: `handoff ${id}`, occurredAt: timestamp, projectId: null, projectName: null }
}

// --- empty -------------------------------------------------------------------

test('empty inputs produce an empty stream, not a crash', () => {
  const stream = buildStream([], [])
  assert.deepEqual(stream.entries, [])
  assert.equal(stream.total, 0)
  assert.equal(stream.hidden, 0)
  assert.deepEqual(stream.failures, [])
})

test('null and undefined inputs are tolerated', () => {
  assert.equal(buildStream(null, undefined).total, 0)
  assert.equal(buildStream(undefined, null, { failures: null }).total, 0)
})

test('the empty state names the start date rather than implying nothing happened', () => {
  // Real history before logging started lives in the handoff entries, so the
  // sentence must not read as "you have never done anything".
  assert.match(describeEmptyStream(null), new RegExp(ACTIVITY_START))
  assert.match(describeEmptyStream(null), /Nothing has moved yet/)
  assert.match(describeEmptyStream(SH), /Nothing recorded for System Horizon yet/)
})

// --- single sources ----------------------------------------------------------

test('activity only', () => {
  const stream = buildStream([activity('a', '2026-10-03T10:00:00Z')], [])
  assert.equal(stream.total, 1)
  assert.equal(stream.entries[0].source, 'activity')
})

test('handoffs only', () => {
  const stream = buildStream([], [handoff('h', 'SystemHorizon', '2026-10-03')])
  assert.equal(stream.total, 1)
  assert.equal(stream.entries[0].source, 'handoff')
})

// --- merged ordering ---------------------------------------------------------

test('merged ordering is newest first across both sources', () => {
  const stream = buildStream(
    [activity('a1', '2026-10-01 09:00'), activity('a2', '2026-10-04 09:00')],
    [handoff('h1', 'SystemHorizon', '2026-10-03'), handoff('h2', 'SystemHorizon', '2026-09-28')],
  )
  assert.deepEqual(stream.entries.map((e) => e.id), [
    'activity::a2', 'handoff::h1', 'activity::a1', 'handoff::h2',
  ])
})

test('an untimestamped handoff sorts LAST, never first', () => {
  // archive.js precedent: raw text used to beat every real date.
  const stream = buildStream(
    [activity('a1', '2026-09-01 09:00')],
    [handoff('h1', 'SystemHorizon', ''), handoff('h2', 'SystemHorizon', '2026-10-03')],
  )
  assert.deepEqual(stream.entries.map((e) => e.id), ['handoff::h2', 'activity::a1', 'handoff::h1'])
})

test('two undated entries still have a stable total order', () => {
  const a = handoff('zzz', 'SystemHorizon', '')
  const b = handoff('aaa', 'SystemHorizon', '')
  assert.equal(compareStreamEntries(a, b) > 0, true)
  assert.equal(compareStreamEntries(b, a) < 0, true)
})

test('the sort is stable across two renders of the same data', () => {
  // Two entries banked in the same minute must not swap places between renders.
  const rows = [
    handoff('b', 'SystemHorizon', '2026-10-03 09:30'),
    handoff('a', 'SystemHorizon', '2026-10-03 09:30'),
    activity('c', '2026-10-03 09:30'),
  ]
  const first = buildStream([], rows).entries.map((e) => e.id)
  const second = buildStream([], [...rows].reverse()).entries.map((e) => e.id)
  assert.deepEqual(first, second)
})

// --- project scope -----------------------------------------------------------

test('project scope filters BOTH sources', () => {
  const stream = buildStream(
    [activity('a1', '2026-10-04 09:00', 'p1'), activity('a2', '2026-10-04 10:00', 'other')],
    [handoff('h1', 'SystemHorizon', '2026-10-03'), handoff('h2', 'sitl_vault', '2026-10-03')],
    { project: SH },
  )
  assert.deepEqual(stream.entries.map((e) => e.id), ['activity::a1', 'handoff::h1'])
})

test('a project with no mapped repo shows activity only, and says why', () => {
  const stream = buildStream(
    [activity('a1', '2026-10-04 09:00', 'p2')],
    [handoff('h1', 'SystemHorizon', '2026-10-03')],
    { project: NO_REPO },
  )
  assert.deepEqual(stream.entries.map((e) => e.id), ['activity::a1'])
  // Criterion 6: not an empty column, a sentence.
  assert.equal(stream.notice, 'No repo linked, so handoffs are not shown.')
})

test('a project linked only to an unmonitored repo names it', () => {
  const stream = buildStream([], [handoff('h1', 'SystemHorizon', '2026-10-03')], { project: UNMONITORED })
  assert.deepEqual(stream.entries, [])
  assert.match(stream.notice, /aftermath-atlas/)
  assert.match(stream.notice, /not monitored/)
})

test('an activity row whose project was deleted renders in portfolio scope only', () => {
  // horizon_activity.project_id is `on delete set null`, so the row survives the
  // project. It is real history and must not vanish, but it is not this
  // project's either.
  const orphan = activity('orphan', '2026-10-04 09:00', null)
  assert.equal(buildStream([orphan], []).total, 1)
  assert.equal(buildStream([orphan], [], { project: SH }).total, 0)
})

test('portfolio scope carries no notice', () => {
  assert.equal(buildStream([], []).notice, '')
})

// --- failures ----------------------------------------------------------------

test('a failed repo fetch is NAMED, not dropped', () => {
  const stream = buildStream([], [], { failures: [{ repo: 'sitl_vault', message: 'HTTP 404' }] })
  assert.deepEqual(stream.failures.map((f) => f.repo), ['sitl_vault'])
  assert.match(describeFailures(stream.failures), /Could not read the handoff for sitl_vault/)
})

test('several failures are named collectively', () => {
  const text = describeFailures([{ repo: 'a' }, { repo: 'b' }])
  assert.match(text, /Could not read handoffs for a, b/)
})

test('no failures produces no sentence at all', () => {
  assert.equal(describeFailures([]), '')
  assert.equal(describeFailures(null), '')
})

test('project scope only reports failures for repos that project owns', () => {
  const failures = [{ repo: 'sitl_vault' }, { repo: 'SystemHorizon' }]
  assert.deepEqual(buildStream([], [], { project: SH, failures }).failures.map((f) => f.repo), ['SystemHorizon'])
  // Portfolio scope still reports both.
  assert.equal(buildStream([], [], { failures }).failures.length, 2)
})

// --- the cap -----------------------------------------------------------------

test('the cap applies to the MERGED list and reports the remainder', () => {
  const many = Array.from({ length: 40 }, (_, i) => activity(`a${String(i).padStart(2, '0')}`, `2026-10-04 ${String(i % 24).padStart(2, '0')}:00`))
  const more = Array.from({ length: 30 }, (_, i) => handoff(`h${String(i).padStart(2, '0')}`, 'SystemHorizon', '2026-10-01'))
  const stream = buildStream(many, more)
  // 70 entries total, capped at 50 -- not 50 of each.
  assert.equal(stream.total, 70)
  assert.equal(stream.entries.length, STREAM_CAP)
  assert.equal(stream.hidden, 20)
})

test('under the cap nothing is hidden', () => {
  const stream = buildStream([activity('a', '2026-10-04 09:00')], [])
  assert.equal(stream.hidden, 0)
})

test('an explicit cap is honoured so the number is never silently different', () => {
  const rows = Array.from({ length: 5 }, (_, i) => activity(`a${i}`, `2026-10-0${i + 1} 09:00`))
  const stream = buildStream(rows, [], { cap: 2 })
  assert.equal(stream.entries.length, 2)
  assert.equal(stream.hidden, 3)
})

// --- time rule (spec section 2b) ---------------------------------------------

test('a date-only handoff is read as LOCAL midnight, not UTC', () => {
  // Date.parse('2026-10-04') gives UTC midnight, which is the evening of Oct 3
  // in America/New_York -- that would shift every date-only handoff by a day.
  const parsed = parseEntryTime('2026-10-04')
  assert.equal(parsed.getFullYear(), 2026)
  assert.equal(parsed.getMonth(), 9)
  assert.equal(parsed.getDate(), 4)
  assert.equal(parsed.getHours(), 0)
})

test('an ISO string carrying its own offset is NOT re-read as local', () => {
  // The M8 double-shift bug: 09:00-04:00 must stay 13:00Z, never become 17:00Z.
  const parsed = parseEntryTime('2026-10-03T13:00:00.000Z')
  assert.equal(parsed.toISOString(), '2026-10-03T13:00:00.000Z')
})

test('a handoff time with a trailing zone label parses', () => {
  const parsed = parseEntryTime('2026-10-04 09:30 ET')
  assert.equal(parsed.getHours(), 9)
  assert.equal(parsed.getMinutes(), 30)
})

test('an unparseable or empty timestamp is null, never a guess', () => {
  assert.equal(parseEntryTime(''), null)
  assert.equal(parseEntryTime(null), null)
  assert.equal(parseEntryTime('   '), null)
  assert.equal(parseEntryTime('not a date'), null)
})

test('the day boundary rule: 11pm yesterday reads 1d, not today', () => {
  // A 24-hour span would call this "today" for another nine hours and the row
  // would flip between today and 1d across an afternoon.
  const lateYesterday = new Date(2026, 9, 3, 23, 0, 0)
  assert.equal(daysSince(lateYesterday, NOW), 1)
  assert.equal(describeAge(lateYesterday, NOW), '1d')

  // Early this morning is still today, even though it is >12h ago.
  assert.equal(describeAge(new Date(2026, 9, 4, 1, 0, 0), NOW), 'today')
})

test('null last_activity reads "never", never "0d"', () => {
  // A missing timestamp is not "moved today".
  assert.equal(daysSince(null, NOW), null)
  assert.equal(describeAge(null, NOW), 'never')
  assert.equal(describeAge(undefined, NOW), 'never')
})

test('a future timestamp reads today rather than a negative day count', () => {
  assert.equal(describeAge(new Date(2026, 9, 6), NOW), 'today')
})

test('describeAge counts calendar days across a month boundary', () => {
  assert.equal(describeAge('2026-09-26', NOW), '8d')
})

// --- handoff normalising -----------------------------------------------------

test('a handoff entry is labelled with its owning project when there is one', () => {
  const entry = handoffToStreamEntry({ id: 'SystemHorizon::0', repo: 'SystemHorizon', timestamp: '2026-10-03', source: 'Claude Code', summary: 'did a thing' }, [SH])
  assert.equal(entry.projectId, 'p1')
  assert.equal(entry.projectName, 'System Horizon')
  assert.equal(entry.id, 'handoff::SystemHorizon::0')
  assert.equal(entry.source, 'handoff')
})

test('a handoff for an unclaimed repo still renders, with no project label', () => {
  const entry = handoffToStreamEntry({ id: 'wtff_vault::0', repo: 'wtff_vault', timestamp: '2026-10-03', source: '', summary: 's' }, [SH])
  assert.equal(entry.projectId, null)
  assert.equal(entry.tool, 'Unlabelled')
})

test('handoffEntriesFrom parses real markdown and namespaces every id', () => {
  const markdown = '# H\n\n## Log\n\n### 2026-10-03 09:30 ET · Claude Code\n\n- **Changed:** did a thing\n\n### 2026-10-01 · Codex\n\n- **Changed:** did another\n'
  const entries = handoffEntriesFrom([{ repo: 'SystemHorizon', markdown }], [SH])
  assert.equal(entries.length, 2)
  assert.equal(entries.every((e) => e.id.startsWith('handoff::')), true)
  assert.equal(entries.every((e) => e.source === 'handoff'), true)
  assert.equal(entries[0].tool, 'Claude Code')
  assert.equal(entries[0].projectName, 'System Horizon')
})

test('handoffEntriesFrom tolerates a repo that returned no markdown', () => {
  assert.deepEqual(handoffEntriesFrom([{ repo: 'SystemHorizon', markdown: null }], []), [])
  assert.deepEqual(handoffEntriesFrom(null, []), [])
})

// --- timestamp formatting ----------------------------------------------------

test('an activity timestamp renders as local wall-clock, not raw ISO', () => {
  // Caught on the first live render: handoffs read "2026-10-04 11:35 ET" while
  // activity rows read "2026-10-04T20:04:26.876497+00:00" directly beneath.
  const when = formatEntryWhen({ source: 'activity', occurredAt: '2026-10-04T20:04:26.876497+00:00' })
  assert.match(when, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)
  assert.equal(when.includes('T'), false)
  assert.equal(when.includes('.'), false)
})

test('a handoff timestamp passes through untouched', () => {
  // It is what Taylor typed; re-parsing to pretty-print it risks changing what
  // it says.
  assert.equal(formatEntryWhen({ source: 'handoff', occurredAt: '2026-10-04 11:35 ET' }), '2026-10-04 11:35 ET')
  assert.equal(formatEntryWhen({ source: 'handoff', occurredAt: '2026-10-01' }), '2026-10-01')
})

test('an undated entry says so rather than rendering an empty cell', () => {
  assert.equal(formatEntryWhen({ source: 'handoff', occurredAt: '' }), 'undated')
  assert.equal(formatEntryWhen({ source: 'activity', occurredAt: null }), 'undated')
  assert.equal(formatEntryWhen({}), 'undated')
})

test('an unparseable activity timestamp falls back to the raw value, never to a guess', () => {
  assert.equal(formatEntryWhen({ source: 'activity', occurredAt: 'not a date' }), 'not a date')
})

test('the formatter pads months, days, hours and minutes', () => {
  const when = formatEntryWhen({ source: 'activity', occurredAt: new Date(2026, 0, 5, 9, 7) })
  assert.equal(when, '2026-01-05 09:07')
})

// --- origin label ------------------------------------------------------------

test('a handoff entry is labelled with its repo and tool', () => {
  assert.equal(describeOrigin({ source: 'handoff', repo: 'SystemHorizon', tool: 'Claude Code' }), 'SystemHorizon · Claude Code')
})

test('a handoff with no tool still names the repo', () => {
  assert.equal(describeOrigin({ source: 'handoff', repo: 'SystemHorizon', tool: '' }), 'SystemHorizon')
})

test('an activity row is labelled with its project name', () => {
  assert.equal(describeOrigin(activity('a', '2026-10-04', 'p1'), [SH]), 'System Horizon')
})

test('an activity row with no project reads "No project", not blank', () => {
  assert.equal(describeOrigin(activity('a', '2026-10-04', null), [SH]), 'No project')
})

test('a project_id that resolves to nothing reads "Unknown project", never blank', () => {
  // project_id is `on delete set null`, so a NON-null id that matches no project
  // means the log and the registry disagree. A blank would read as "no project"
  // when it is not -- the taskProject.js lesson.
  assert.equal(describeOrigin(activity('a', '2026-10-04', 'ghost'), [SH]), 'Unknown project')
})

// --- footer ------------------------------------------------------------------

test('the footer counts projects and how many moved this week', () => {
  const projects = [
    { id: 'a', lastActivity: '2026-10-03 09:00' },  // 1d
    { id: 'b', lastActivity: '2026-09-26 09:00' },  // 8d
    { id: 'c', lastActivity: null },                // never
  ]
  assert.deepEqual(streamFooter(projects, NOW), { projects: 3, movedThisWeek: 1 })
})

test('exactly 7 days counts as this week; 8 does not', () => {
  assert.equal(streamFooter([{ lastActivity: '2026-09-27 09:00' }], NOW).movedThisWeek, 1)
  assert.equal(streamFooter([{ lastActivity: '2026-09-26 09:00' }], NOW).movedThisWeek, 0)
})

test('an empty registry footers as zero, not NaN', () => {
  assert.deepEqual(streamFooter([], NOW), { projects: 0, movedThisWeek: 0 })
  assert.deepEqual(streamFooter(null, NOW), { projects: 0, movedThisWeek: 0 })
})
