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
  return { taskId: row.task_id ?? null, note: row.note ?? '', setAt: row.set_at }
}

export function nowToRow(taskId, note) {
  return { task_id: taskId ?? null, note: (note ?? '').trim() || null, set_at: new Date().toISOString() }
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
