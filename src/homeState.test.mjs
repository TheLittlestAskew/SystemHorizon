import test from 'node:test'
import assert from 'node:assert/strict'
import { CAPTURE_BODY_MAX, ROUTED_KINDS, captureBodyError, captureFromRow, captureToRow, pendingCaptures, routeCapturePatch, nowFromRow, nowToRow, resolveNow, CAPACITY_OPTIONS, CAPACITY_TTL_HOURS, capacityToRow, resolveCapacity, capacityAgeLabel } from './homeState.js'

// The executable form of M3's acceptance criteria in docs/NORTH_STAR.md: capture
// validation (empty, whitespace-only, over-limit), routing state transitions,
// and a deleted Now task.

test('captureBodyError rejects an empty body', () => {
  assert.equal(captureBodyError('') !== '', true)
  assert.equal(captureBodyError(undefined) !== '', true)
  assert.equal(captureBodyError(null) !== '', true)
})

test('captureBodyError rejects a whitespace-only body', () => {
  for (const body of [' ', '\t', '\n', '   \t\n  ']) {
    assert.equal(captureBodyError(body) !== '', true, `expected ${JSON.stringify(body)} to be rejected`)
  }
})

test('captureBodyError accepts a body that is only valid after trimming', () => {
  assert.equal(captureBodyError('  a real thought  '), '')
})

test('captureBodyError enforces the same ceiling as the horizon_capture CHECK', () => {
  assert.equal(captureBodyError('x'.repeat(CAPTURE_BODY_MAX)), '')
  assert.equal(captureBodyError('x'.repeat(CAPTURE_BODY_MAX + 1)) !== '', true)
  // Trailing whitespace must not push an otherwise-valid body over the limit,
  // because the DB checks the trimmed length too.
  assert.equal(captureBodyError(`${'x'.repeat(CAPTURE_BODY_MAX)}    `), '')
})

test('captureToRow trims, so the DB never sees padding the UI ignored', () => {
  assert.deepEqual(captureToRow('  catch it  '), { body: 'catch it' })
})

test('captureFromRow maps nulls to explicit unrouted values', () => {
  assert.deepEqual(
    captureFromRow({ id: 'c1', body: 'thought', created_at: '2026-09-26T10:00:00Z', routed_kind: null, routed_id: null, routed_at: null }),
    { id: 'c1', body: 'thought', createdAt: '2026-09-26T10:00:00Z', routedKind: null, routedId: null, routedAt: null },
  )
})

test('pendingCaptures hides every routed kind, including dismissed', () => {
  const captures = [
    { id: 'a', routedKind: null },
    { id: 'b', routedKind: 'task' },
    { id: 'c', routedKind: 'dismissed' },
    { id: 'd', routedKind: null },
  ]
  assert.deepEqual(pendingCaptures(captures).map((capture) => capture.id), ['a', 'd'])
  assert.deepEqual(pendingCaptures([]), [])
  assert.deepEqual(pendingCaptures(undefined), [])
})

test('routeCapturePatch sets routed_kind and routed_at together', () => {
  const patch = routeCapturePatch('dismissed', null, '2026-09-26T12:00:00Z')
  assert.deepEqual(patch, { routed_kind: 'dismissed', routed_id: null, routed_at: '2026-09-26T12:00:00Z' })
  // The horizon_capture routed_together CHECK requires both or neither.
  assert.equal((patch.routed_kind === null) === (patch.routed_at === null), true)
})

test('routeCapturePatch carries the new task id when routing to a task', () => {
  assert.deepEqual(
    routeCapturePatch('task', 't1', '2026-09-26T12:00:00Z'),
    { routed_kind: 'task', routed_id: 't1', routed_at: '2026-09-26T12:00:00Z' },
  )
})

test('routeCapturePatch refuses an unknown route instead of writing a CHECK violation', () => {
  assert.throws(() => routeCapturePatch('archived'), /Unknown capture route/)
  for (const kind of ROUTED_KINDS) {
    assert.doesNotThrow(() => routeCapturePatch(kind, kind === 'task' ? 't1' : null, '2026-09-26T12:00:00Z'))
  }
})

test('routeCapturePatch refuses a task route with no task id', () => {
  assert.throws(() => routeCapturePatch('task', null), /needs the new task id/)
})

test('nowToRow nulls an empty note rather than storing an empty string', () => {
  assert.equal(nowToRow('t1', '   ').note, null)
  assert.equal(nowToRow('t1', 'why this matters').note, 'why this matters')
  assert.equal(nowToRow(undefined, '').task_id, null)
})

test('nowFromRow maps a null note to an empty string for the input', () => {
  assert.deepEqual(nowFromRow({ task_id: 't1', note: null, set_at: '2026-09-26T09:00:00Z' }), { taskId: 't1', note: '', setAt: '2026-09-26T09:00:00Z', capacity: null, capacitySetAt: null })
})

test('resolveNow reports unset when nothing has been chosen', () => {
  const resolved = resolveNow(null, [{ id: 't1', status: 'Active' }])
  assert.equal(resolved.state, 'unset')
  assert.equal(resolved.task, null)
  assert.equal(resolved.done, false)
})

test('resolveNow reports unset when the Now task was deleted', () => {
  // horizon_now.task_id is `on delete set null`, so deleting the task leaves the
  // row behind with a null task_id. That must read as "nothing chosen", not crash.
  const resolved = resolveNow({ taskId: null, note: 'still true', setAt: '2026-09-26T09:00:00Z' }, [])
  assert.equal(resolved.state, 'unset')
  assert.equal(resolved.task, null)
  assert.equal(resolved.note, 'still true')
})

test('resolveNow reports missing when the task id is not in the loaded tasks', () => {
  const resolved = resolveNow({ taskId: 't-gone', note: '', setAt: null }, [{ id: 't1', status: 'Active' }])
  assert.equal(resolved.state, 'missing')
  assert.equal(resolved.task, null)
  assert.equal(resolved.done, false)
})

test('resolveNow resolves a real task and takes done from its status', () => {
  const tasks = [{ id: 't1', name: 'Ship M3', status: 'Active' }, { id: 't2', name: 'Other', status: 'Done' }]
  const active = resolveNow({ taskId: 't1', note: 'start here', setAt: '2026-09-26T09:00:00Z' }, tasks)
  assert.equal(active.state, 'set')
  assert.equal(active.task.name, 'Ship M3')
  assert.equal(active.done, false)

  const done = resolveNow({ taskId: 't2', note: '', setAt: null }, tasks)
  assert.equal(done.state, 'set')
  assert.equal(done.done, true)
})

test('resolveNow tolerates a missing task list', () => {
  assert.equal(resolveNow({ taskId: 't1', note: '', setAt: null }, undefined).state, 'missing')
  assert.equal(resolveNow(undefined, undefined).state, 'unset')
})

// Capacity. The point of every test below is that a stored capacity EXPIRES.
// Before this, capacity was useState('Steady') and reset on reload; persisting
// it without an expiry would have turned a forgetful control into one that
// asserts a stale truth indefinitely.

const AT = new Date('2026-10-04T12:00:00Z')
const hoursBefore = (h) => new Date(AT.getTime() - h * 3_600_000).toISOString()

test('CAPACITY_OPTIONS matches the horizon_now_capacity_check CHECK exactly', () => {
  assert.deepEqual(CAPACITY_OPTIONS, ['Light', 'Steady', 'High focus'])
})

test('capacityToRow pairs the value with its own timestamp', () => {
  const row = capacityToRow('High focus', '2026-10-04T09:00:00Z')
  assert.deepEqual(row, { capacity: 'High focus', capacity_set_at: '2026-10-04T09:00:00Z' })
})

test('capacityToRow refuses a value outside the closed set', () => {
  // The DB rejects this with 23514; failing here means a clearer message and no
  // round trip. Asserted so the client set cannot silently drift from the CHECK.
  for (const bad of ['Sprinting', 'steady', '', null, undefined]) {
    assert.throws(() => capacityToRow(bad), /Unknown capacity/)
  }
})

test('capacityToRow never emits a capacity without a timestamp', () => {
  // horizon_now_capacity_together enforces this in the database. Asserting it
  // here means the client cannot even construct the rejected shape.
  const row = capacityToRow('Light')
  assert.equal(typeof row.capacity_set_at, 'string')
  assert.equal(Number.isFinite(new Date(row.capacity_set_at).getTime()), true)
})

test('resolveCapacity reports unset when nothing has been reported', () => {
  for (const input of [undefined, null, {}, { capacity: null, capacitySetAt: null }]) {
    assert.equal(resolveCapacity(input, AT).state, 'unset')
  }
})

test('resolveCapacity treats a half-set row as unset rather than guessing', () => {
  // The CHECK makes this unreachable from the database, but the resolver must
  // not invent an age if it ever sees one.
  assert.equal(resolveCapacity({ capacity: 'Light', capacitySetAt: null }, AT).state, 'unset')
  assert.equal(resolveCapacity({ capacity: null, capacitySetAt: hoursBefore(1) }, AT).state, 'unset')
})

test('resolveCapacity stands behind a recent report', () => {
  const resolved = resolveCapacity({ capacity: 'High focus', capacitySetAt: hoursBefore(3) }, AT)
  assert.equal(resolved.state, 'set')
  assert.equal(resolved.value, 'High focus')
  assert.equal(Math.round(resolved.ageHours), 3)
})

test('resolveCapacity goes stale once past the TTL', () => {
  const resolved = resolveCapacity({ capacity: 'High focus', capacitySetAt: hoursBefore(CAPACITY_TTL_HOURS + 1) }, AT)
  assert.equal(resolved.state, 'stale')
  // The value is still carried, so the UI can say what was last reported and
  // when, rather than pretending nothing was ever set.
  assert.equal(resolved.value, 'High focus')
})

test('resolveCapacity treats the TTL boundary itself as stale', () => {
  // Exactly at the limit is expired, not valid. Picked deliberately so the
  // boundary has one answer instead of depending on sub-millisecond drift.
  assert.equal(resolveCapacity({ capacity: 'Steady', capacitySetAt: hoursBefore(CAPACITY_TTL_HOURS) }, AT).state, 'stale')
  assert.equal(resolveCapacity({ capacity: 'Steady', capacitySetAt: hoursBefore(CAPACITY_TTL_HOURS - 0.01) }, AT).state, 'set')
})

test('resolveCapacity refuses to age a future or unparseable timestamp', () => {
  // A clock-skewed or corrupt stamp must not be allowed to assert a current
  // capacity forever, which is exactly what a naive age calculation would do.
  const future = resolveCapacity({ capacity: 'Light', capacitySetAt: hoursBefore(-5) }, AT)
  assert.equal(future.state, 'stale')
  assert.equal(future.ageHours, null)

  const garbage = resolveCapacity({ capacity: 'Light', capacitySetAt: 'not a date' }, AT)
  assert.equal(garbage.state, 'stale')
  assert.equal(garbage.ageHours, null)
})

test('capacityAgeLabel says nothing when there is no honest age', () => {
  assert.equal(capacityAgeLabel(resolveCapacity(null, AT)), '')
  assert.equal(capacityAgeLabel(resolveCapacity({ capacity: 'Light', capacitySetAt: 'not a date' }, AT)), '')
  assert.equal(capacityAgeLabel(undefined), '')
})

test('capacityAgeLabel reads in minutes, then hours, then days', () => {
  assert.equal(capacityAgeLabel(resolveCapacity({ capacity: 'Light', capacitySetAt: AT.toISOString() }, AT)), 'set just now')
  assert.equal(capacityAgeLabel(resolveCapacity({ capacity: 'Light', capacitySetAt: hoursBefore(0.5) }, AT)), 'set 30m ago')
  assert.equal(capacityAgeLabel(resolveCapacity({ capacity: 'Light', capacitySetAt: hoursBefore(3) }, AT)), 'set 3h ago')
  assert.equal(capacityAgeLabel(resolveCapacity({ capacity: 'Light', capacitySetAt: hoursBefore(23) }, AT)), 'set 23h ago')
  // A stale capacity can be arbitrarily old; "set 72h ago" is a worse way to
  // say "Tuesday", so the label rolls over to days rather than growing forever.
  assert.equal(capacityAgeLabel(resolveCapacity({ capacity: 'Light', capacitySetAt: hoursBefore(72) }, AT)), 'set 3d ago')
})

test('nowFromRow carries capacity through, and defaults it to unset', () => {
  const withCapacity = nowFromRow({ task_id: null, note: null, set_at: '2026-10-04T09:00:00Z', capacity: 'Light', capacity_set_at: '2026-10-04T11:00:00Z' })
  assert.equal(withCapacity.capacity, 'Light')
  assert.equal(withCapacity.capacitySetAt, '2026-10-04T11:00:00Z')

  // A row written before this migration has neither column.
  const legacy = nowFromRow({ task_id: null, note: null, set_at: '2026-10-04T09:00:00Z' })
  assert.equal(legacy.capacity, null)
  assert.equal(legacy.capacitySetAt, null)
  assert.equal(resolveCapacity(legacy, AT).state, 'unset')
})

test('nowToRow never touches the capacity columns', () => {
  // horizon_now.set_at and capacity_set_at are different clocks. Choosing a new
  // Now must not restamp or clear a capacity that is still valid.
  const row = nowToRow('t1', 'note')
  assert.equal('capacity' in row, false)
  assert.equal('capacity_set_at' in row, false)
})
