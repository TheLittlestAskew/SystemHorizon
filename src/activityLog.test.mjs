import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import * as activityLog from './activityLog.js'
import {
  ACTIVITY_KINDS, ACTIVITY_SUMMARY_MAX, activityRow, activityFromRow,
  projectAddedActivity, registryResyncedActivity, taskCreatedActivity,
  taskStatusActivity, taskLinkedActivity, taskFlaggedActivity,
  taskDeletedActivity, captureAddedActivity, eventAddedActivity,
  calendarSyncedActivity,
} from './activityLog.js'

// --- the closed kind set -----------------------------------------------------

test('the kind set matches horizon_activity_kind_check exactly', () => {
  // Proven live by rejection: every one of these inserted, and 'banked' failed
  // with SQLSTATE 23514. If this list and the CHECK ever diverge, every write of
  // the new kind fails at runtime, so the list is pinned here.
  assert.deepEqual([...ACTIVITY_KINDS].sort(), [
    'calendar_synced', 'capture_added', 'event_added', 'project_added',
    'registry_resynced', 'task_completed', 'task_created', 'task_deleted',
    'task_flagged', 'task_linked', 'task_status',
  ])
  assert.equal(ACTIVITY_KINDS.length, 11)
})

test('every kind in the closed set builds a row', () => {
  for (const kind of ACTIVITY_KINDS) {
    const row = activityRow({ kind, summary: 'something happened' })
    assert.equal(row.kind, kind)
    assert.equal(row.summary, 'something happened')
  }
})

test('a kind outside the set is rejected and never written', () => {
  assert.throws(() => activityRow({ kind: 'banked', summary: 'x' }), /unknown activity kind: banked/)
  assert.throws(() => activityRow({ kind: '', summary: 'x' }), /unknown activity kind/)
  assert.throws(() => activityRow({ kind: 'task_promoted', summary: 'x' }), /unknown activity kind/)
})

test('a row with no usable summary is rejected rather than written blank', () => {
  // A stream line with no text is indistinguishable from a rendering bug.
  assert.throws(() => activityRow({ kind: 'task_created', summary: '' }), /summary is required/)
  assert.throws(() => activityRow({ kind: 'task_created', summary: '   ' }), /summary is required/)
  assert.throws(() => activityRow({ kind: 'task_created', summary: null }), /summary is required/)
})

// --- criterion 4: append-only ------------------------------------------------

test('🛑 the module exposes no update or delete path (M12 criterion 4)', () => {
  // The database WOULD permit an update: all four RLS policies exist because
  // NORTH_STAR section 4 requires one per command. The guarantee that SH never
  // rewrites history is held here and by a grep over src/, not by the schema.
  const names = Object.keys(activityLog)
  const mutators = names.filter((n) => /update|delete|remove|patch|destroy|edit|revise/i.test(n))
  // taskDeletedActivity is a BUILDER for a 'task_deleted' row -- it records that
  // a task was deleted; it does not delete an activity row. Nothing else may match.
  assert.deepEqual(mutators, ['taskDeletedActivity'])
  for (const name of names) {
    assert.notEqual(typeof activityLog[name], 'undefined')
  }
})

test('🛑 nothing in src/ ever updates or deletes an activity row (M12 criterion 4)', () => {
  // The module-surface test above covers the pure layer. This covers the OTHER
  // half of the same guarantee: the database would permit an update, so the
  // promise only holds if no caller anywhere makes one. Asserted by reading the
  // source rather than by convention, because a future session will not know
  // the convention.
  const dir = fileURLToPath(new URL('.', import.meta.url))
  const sources = readdirSync(dir).filter((name) => /\.(js|jsx)$/.test(name))
  assert.ok(sources.length > 5, 'the source scan must actually find files')

  const offenders = []
  for (const name of sources) {
    // Comments are stripped first: activityLog.js documents the forbidden
    // pattern in prose, and a doc comment must not read as a violation.
    const code = readFileSync(new URL(`./${name}`, import.meta.url), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
    for (const match of code.matchAll(/from\(\s*['"]horizon_activity['"]\s*\)\s*\.\s*(\w+)/g)) {
      if (match[1] !== 'select' && match[1] !== 'insert') offenders.push(`${name}: .${match[1]}(`)
    }
  }
  assert.deepEqual(offenders, [], 'an append-only log that can be rewritten is not a record of fact')

  // Guard the guard: the scan must be able to SEE the two legitimate calls, or
  // it would pass vacuously on a file it failed to read.
  const app = readFileSync(new URL('./App.jsx', import.meta.url), 'utf8')
  const calls = [...app.matchAll(/from\(\s*['"]horizon_activity['"]\s*\)\s*\.\s*(\w+)/g)].map((m) => m[1])
  assert.deepEqual(calls.sort(), ['insert', 'select'], 'exactly one read and one append are expected')
})

test('activityRow never emits an id, an owner or a clock', () => {
  const row = activityRow({ kind: 'task_created', summary: 'x' })
  // id and occurred_at are server-generated; owner defaults to auth.uid() the
  // same way every other horizon_ table does. A client-supplied clock in an
  // append-only log is a value nobody measured.
  assert.equal('id' in row, false)
  assert.equal('owner' in row, false)
  assert.equal('occurred_at' in row, false)
  assert.deepEqual(Object.keys(row).sort(), ['kind', 'project_id', 'subject_id', 'summary'])
})

// --- status branching --------------------------------------------------------

test('task_completed vs task_status branches on the NEW status', () => {
  const task = { id: 't1', name: 'Fix the grid', projectId: 'p1' }
  assert.equal(taskStatusActivity(task, 'Active', 'Done').kind, 'task_completed')
  assert.equal(taskStatusActivity(task, 'Active', 'Waiting').kind, 'task_status')
  assert.equal(taskStatusActivity(task, 'Done', 'Active').kind, 'task_status')
  assert.equal(taskStatusActivity(task, 'Parked', 'Done').kind, 'task_completed')
})

test('a status summary names both ends of the move', () => {
  const task = { id: 't1', name: 'Fix the grid', projectId: 'p1' }
  const moved = taskStatusActivity(task, 'Active', 'Waiting')
  assert.match(moved.summary, /Active/)
  assert.match(moved.summary, /Waiting/)
  // "changed status" without the ends does not tell her what happened.
  assert.match(moved.summary, /from Active to Waiting/)
})

test('a status move with no previous status still reads as a sentence', () => {
  const row = taskStatusActivity({ id: 't1', name: 'X' }, null, 'Waiting')
  assert.match(row.summary, /no status to Waiting/)
})

test('completing a task names what it was, without saying "was Done"', () => {
  const task = { id: 't1', name: 'Fix the grid' }
  assert.match(taskStatusActivity(task, 'Active', 'Done').summary, /Completed "Fix the grid" \(was Active\)/)
  // Done -> Done would otherwise read "(was Done)", which is noise.
  assert.equal(taskStatusActivity(task, 'Done', 'Done').summary, 'Completed "Fix the grid"')
})

// --- promotion ---------------------------------------------------------------

test('a promotion toggle produces task_flagged, never task_status', () => {
  const task = { id: 't1', name: 'Ship M12', projectId: 'p1' }
  const flagged = taskFlaggedActivity(task, 'candidate')
  assert.equal(flagged.kind, 'task_flagged')
  assert.match(flagged.summary, /handoff candidate/)

  const cleared = taskFlaggedActivity(task, 'none')
  assert.equal(cleared.kind, 'task_flagged')
  assert.match(cleared.summary, /Cleared the handoff flag/)

  // Marking a handoff candidate is not a status change. A line reading "status
  // changed" when the status did not change is a lie the log must not tell.
  assert.notEqual(flagged.kind, 'task_status')
  assert.notEqual(cleared.kind, 'task_status')
})

// --- Google sync -------------------------------------------------------------

test('Google sync produces exactly ONE entry for 0, 1 and 36 events', () => {
  // Her 2026-10-02 sync reconciled 36 events. One row each would bury her own
  // actions under machine noise and make the stream useless.
  for (const result of [{}, { inserted: 1 }, { inserted: 20, updated: 16 }]) {
    const row = calendarSyncedActivity(result)
    assert.equal(row.kind, 'calendar_synced')
    assert.equal(typeof row.summary, 'string')
  }
  assert.match(calendarSyncedActivity({}).summary, /already up to date/)
  assert.match(calendarSyncedActivity({ inserted: 20, updated: 16 }).summary, /20 added, 16 updated/)
  assert.match(calendarSyncedActivity({ deleted: 3 }).summary, /3 removed/)
})

test('a zero-change sync still logs, because "already up to date" is a real answer', () => {
  // The 2026-10-02 idempotency bug was found because a sync reported "16
  // updated" when it should have reported nothing to do. Logging the no-op is
  // what makes that visible next time.
  const row = calendarSyncedActivity({ inserted: 0, updated: 0, deleted: 0 })
  assert.equal(row.kind, 'calendar_synced')
  assert.match(row.summary, /already up to date/)
})

// --- project_id nullability --------------------------------------------------

test('project_id may be null, because captures have none', () => {
  const row = captureAddedActivity({ id: 'c1', body: 'a thought' })
  assert.equal(row.project_id, null)
  assert.equal(row.kind, 'capture_added')
  assert.match(row.summary, /a thought/)
})

test('registry re-sync logs ONE entry naming the count, not one per project', () => {
  const row = registryResyncedActivity(16)
  assert.equal(row.kind, 'registry_resynced')
  assert.match(row.summary, /16 projects/)
  assert.equal(row.project_id, null)
  // Singular reads correctly too.
  assert.match(registryResyncedActivity(1).summary, /1 project\b/)
  assert.match(registryResyncedActivity(0).summary, /0 projects/)
})

// --- the remaining builders --------------------------------------------------

test('project, task, link, delete and event builders carry the right ids', () => {
  assert.deepEqual(projectAddedActivity({ id: 'p1', name: 'Pulse' }), {
    kind: 'project_added', project_id: 'p1', subject_id: 'p1', summary: 'Added project "Pulse"',
  })
  assert.deepEqual(taskCreatedActivity({ id: 't1', name: 'Write tests', projectId: 'p1' }), {
    kind: 'task_created', project_id: 'p1', subject_id: 't1', summary: 'Added task "Write tests"',
  })
  assert.deepEqual(taskDeletedActivity({ id: 't1', name: 'Write tests', projectId: 'p1' }), {
    kind: 'task_deleted', project_id: 'p1', subject_id: 't1', summary: 'Deleted task "Write tests"',
  })
  assert.deepEqual(eventAddedActivity({ id: 'e1', name: 'Session', date: '2026-10-11', projectId: 'p1' }), {
    kind: 'event_added', project_id: 'p1', subject_id: 'e1', summary: 'Added event "Session" on 2026-10-11',
  })
})

test('linking names the new project; unlinking says so instead of going blank', () => {
  const task = { id: 't1', name: 'Write tests' }
  const filed = taskLinkedActivity(task, 'p2', 'System Horizon')
  assert.equal(filed.project_id, 'p2')
  assert.match(filed.summary, /Filed "Write tests" under System Horizon/)

  // Unfiling is as real an action as filing, so it still produces a line.
  const unfiled = taskLinkedActivity(task, null, null)
  assert.equal(unfiled.project_id, null)
  assert.match(unfiled.summary, /Unfiled "Write tests"/)
})

test('an untitled item degrades to a word, never to empty quotes', () => {
  // `Added task ""` reads like a rendering bug rather than a real entry.
  assert.match(taskCreatedActivity({ id: 't1', name: '' }).summary, /an untitled task/)
  assert.match(taskCreatedActivity({ id: 't1', name: '   ' }).summary, /an untitled task/)
  assert.match(projectAddedActivity({ id: 'p1' }).summary, /an untitled project/)
})

test('a long summary is capped so one capture cannot dominate the stream', () => {
  const row = captureAddedActivity({ id: 'c1', body: 'x'.repeat(2000) })
  assert.equal(row.summary.length, ACTIVITY_SUMMARY_MAX)
})

test('whitespace in a summary is flattened, so a pasted block stays one line', () => {
  const row = captureAddedActivity({ id: 'c1', body: 'first line\n\n   second line\t\tthird' })
  assert.equal(row.summary, 'Captured "first line second line third"')
})

// --- reading back ------------------------------------------------------------

test('activityFromRow namespaces the id so it cannot collide with a handoff id', () => {
  const entry = activityFromRow({ id: 'abc', kind: 'task_created', project_id: 'p1', subject_id: 't1', summary: 'Added task "X"', occurred_at: '2026-10-04T12:00:00Z' })
  assert.equal(entry.id, 'activity::abc')
  assert.equal(entry.source, 'activity')
  assert.equal(entry.kind, 'task_created')
  assert.equal(entry.projectId, 'p1')
  assert.equal(entry.occurredAt, '2026-10-04T12:00:00Z')
})

test('activityFromRow tolerates nulls without inventing values', () => {
  const entry = activityFromRow({ id: 'abc', kind: 'capture_added', summary: 'x' })
  assert.equal(entry.projectId, null)
  assert.equal(entry.subjectId, null)
  assert.equal(entry.occurredAt, null)
})
