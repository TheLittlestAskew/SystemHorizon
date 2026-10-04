// Home page Now + Capture logic, per docs/NORTH_STAR.md M3 and the IA doc's
// information priority 1 and 5. Pure functions in their own module (no JSX, no
// React, no Supabase client) so validation, routing transitions, and the
// deleted-Now-task case are assertable from node:test without booting the app.

// Mirrors the horizon_capture body CHECK exactly. Validating client-side means a
// too-long or empty capture shows a real message instead of a raw Postgres error.
export const CAPTURE_BODY_MAX = 2000

// Mirrors the horizon_capture routed_kind CHECK exactly.
export const ROUTED_KINDS = ['task', 'event', 'project_note', 'dismissed']

export function captureBodyError(body) {
  const trimmed = (body ?? '').trim()
  if (!trimmed) return 'Write something to capture first.'
  if (trimmed.length > CAPTURE_BODY_MAX) return `Captures are capped at ${CAPTURE_BODY_MAX} characters. This one is ${trimmed.length}.`
  return ''
}

export function captureFromRow(row) {
  return { id: row.id, body: row.body, createdAt: row.created_at, routedKind: row.routed_kind ?? null, routedId: row.routed_id ?? null, routedAt: row.routed_at ?? null }
}

export function captureToRow(body) {
  return { body: (body ?? '').trim() }
}

// The inbox shows only what has not been dealt with yet; routing is deferred
// until after capture (IA information priority 5).
export function pendingCaptures(captures) {
  return (captures ?? []).filter((capture) => !capture.routedKind)
}

// Builds the paired routed_* fields together, because horizon_capture's
// routed_together CHECK rejects a half-routed row. `at` is injectable so tests
// are deterministic.
export function routeCapturePatch(kind, routedId = null, at = new Date().toISOString()) {
  if (!ROUTED_KINDS.includes(kind)) throw new Error(`Unknown capture route "${kind}".`)
  if (kind === 'task' && !routedId) throw new Error('Routing a capture to a task needs the new task id.')
  return { routed_kind: kind, routed_id: routedId, routed_at: at }
}

export function nowFromRow(row) {
  return { taskId: row.task_id ?? null, note: row.note ?? '', setAt: row.set_at, capacity: row.capacity ?? null, capacitySetAt: row.capacity_set_at ?? null }
}

export function nowToRow(taskId, note) {
  return { task_id: taskId ?? null, note: (note ?? '').trim() || null, set_at: new Date().toISOString() }
}

// Mirrors the horizon_now_capacity_check CHECK exactly.
export const CAPACITY_OPTIONS = ['Light', 'Steady', 'High focus']

// How long a self-reported capacity is allowed to speak for itself.
//
// 🛑 Deliberately a rolling window, NOT a reset at local midnight. Taylor works
// past midnight routinely, and a calendar-day rule would blank her capacity
// mid-session. 10 hours covers a working block from either end: set at 09:00 it
// goes stale by 19:00; set at 23:00 it survives to 09:00 and is stale by the
// time the next day's work starts.
//
// ⚠️ This is a judgement call, not a measurement. Retune it here and nowhere
// else — every consumer reads this constant.
export const CAPACITY_TTL_HOURS = 10

export function capacityToRow(capacity, at = new Date().toISOString()) {
  if (!CAPACITY_OPTIONS.includes(capacity)) throw new Error(`Unknown capacity "${capacity}".`)
  return { capacity, capacity_set_at: at }
}

// Resolves a stored capacity against the clock. Three states, deliberately few:
//   'unset' nothing reported yet
//   'stale' reported, but too long ago to still be claiming it is true
//   'set'   reported recently enough to stand
//
// The whole point of this function is that 'set' expires. A persisted capacity
// with no expiry is the "232 days left" defect wearing a different hat: a value
// no input changed, rendering as though it were current. `at` is injectable so
// the tests are deterministic.
export function resolveCapacity(nowRow, at = new Date()) {
  const value = nowRow?.capacity ?? null
  const setAt = nowRow?.capacitySetAt ?? null
  if (!value || !setAt) return { state: 'unset', value: null, setAt: null, ageHours: null }

  const setAtMs = new Date(setAt).getTime()
  const atMs = at instanceof Date ? at.getTime() : new Date(at).getTime()
  // An unparseable or future timestamp cannot be aged honestly, so it is not
  // allowed to assert a current capacity. It reports as stale and still carries
  // setAt, so the UI can say when it claims to have been set.
  if (!Number.isFinite(setAtMs) || !Number.isFinite(atMs) || setAtMs > atMs) {
    return { state: 'stale', value, setAt, ageHours: null }
  }

  const ageHours = (atMs - setAtMs) / 3_600_000
  return { state: ageHours >= CAPACITY_TTL_HOURS ? 'stale' : 'set', value, setAt, ageHours }
}

// "set 12m ago" / "set 3h ago" / "set 2d ago". Returns '' when there is nothing
// honest to say, so the caller renders no age line rather than an invented one.
// Days matter because a stale capacity can be arbitrarily old, and "set 72h ago"
// is a worse way to say "you set this on Tuesday".
export function capacityAgeLabel(resolved) {
  if (resolved?.ageHours == null) return ''
  const minutes = Math.floor(resolved.ageHours * 60)
  if (minutes < 1) return 'set just now'
  if (minutes < 60) return `set ${minutes}m ago`
  if (resolved.ageHours < 24) return `set ${Math.floor(resolved.ageHours)}h ago`
  const days = Math.floor(resolved.ageHours / 24)
  return `set ${days}d ago`
}

// Resolves the stored Now against loaded tasks. Three states, deliberately few:
//   'unset'   nothing chosen, or the task was deleted (FK is on delete set null)
//   'missing' a task_id that is not in the loaded task list
//   'set'     a real task to work on
// `done` comes from the task's own status, so the Now done-state is persisted
// and task-linked rather than local component state.
export function resolveNow(nowRow, tasks) {
  const note = nowRow?.note ?? ''
  const setAt = nowRow?.setAt ?? null
  if (!nowRow?.taskId) return { state: 'unset', task: null, note, setAt, done: false }
  const task = (tasks ?? []).find((candidate) => candidate.id === nowRow.taskId) ?? null
  if (!task) return { state: 'missing', task: null, note, setAt, done: false }
  return { state: 'set', task, note, setAt, done: task.status === 'Done' }
}
