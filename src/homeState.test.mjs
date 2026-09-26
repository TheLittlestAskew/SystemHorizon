import test from 'node:test'
import assert from 'node:assert/strict'
import { CAPTURE_BODY_MAX, ROUTED_KINDS, captureBodyError, captureFromRow, captureToRow, pendingCaptures, routeCapturePatch, nowFromRow, nowToRow, resolveNow } from './homeState.js'

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
  assert.deepEqual(nowFromRow({ task_id: 't1', note: null, set_at: '2026-09-26T09:00:00Z' }), { taskId: 't1', note: '', setAt: '2026-09-26T09:00:00Z' })
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
