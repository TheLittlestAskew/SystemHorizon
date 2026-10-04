// M12 Pulse: the activity log's pure half.
//
// Builds rows for horizon_activity. Nothing here touches the network; App.jsx's
// logActivity() does the insert and owns the failure counter (spec section 5.5).
//
// 🛑 THE GUARANTEE THIS MODULE CARRIES (M12 criterion 4): SH appends to the
// activity log and NEVER updates or deletes a row in it. The table has all four
// RLS policies because NORTH_STAR section 4 requires one per command, so the
// database would permit an update — the guarantee is held here instead, the same
// way M9 holds "SH never writes promoted": this module exposes no update or
// delete path, a test asserts the exported surface, and a grep over src/ proves
// no .from('horizon_activity').update( or .delete( exists anywhere.
//
// A log you can rewrite is not a record of fact, and the stream presents itself
// as one.

// The closed set, matching horizon_activity_kind_check exactly. Proven live by
// rejection: 'banked' fails with SQLSTATE 23514.
export const ACTIVITY_KINDS = [
  'task_created', 'task_completed', 'task_status', 'task_linked',
  'task_flagged', 'task_deleted', 'project_added', 'event_added',
  'capture_added', 'registry_resynced', 'calendar_synced',
]

// A capture can run to 2000 characters and a stream line has to stay readable.
// Same cap archive.js uses on handoff summaries, so the two sources that merge
// into one stream truncate identically.
export const ACTIVITY_SUMMARY_MAX = 240

function trimSummary(text) {
  const flat = String(text ?? '').replace(/\s+/g, ' ').trim()
  return flat.length > ACTIVITY_SUMMARY_MAX ? flat.slice(0, ACTIVITY_SUMMARY_MAX) : flat
}

// Quotes a name for a summary line. An empty name would render as `Added task ""`
// which reads like a bug, so it degrades to a word instead of empty quotes.
function label(name, fallback = 'an untitled item') {
  const text = String(name ?? '').replace(/\s+/g, ' ').trim()
  return text ? `"${text}"` : fallback
}

// The single row builder. Throws on an unknown kind rather than returning a
// sentinel: the kind set is closed and internal, so a bad one is a programming
// error that must surface in tests, not a user input to be tolerated. App.jsx
// catches it so a log failure can never break the mutation that triggered it.
export function activityRow({ kind, projectId = null, subjectId = null, summary }) {
  if (!ACTIVITY_KINDS.includes(kind)) throw new Error(`unknown activity kind: ${kind}`)
  const text = trimSummary(summary)
  if (!text) throw new Error(`activity summary is required for kind: ${kind}`)
  // owner is omitted deliberately: horizon_activity.owner defaults to auth.uid(),
  // matching horizon_projects, horizon_tasks and horizon_capture. occurred_at
  // defaults to now() on the server, so the client never supplies a clock.
  return { kind, project_id: projectId, subject_id: subjectId, summary: text }
}

export function projectAddedActivity(project) {
  return activityRow({ kind: 'project_added', projectId: project?.id ?? null, subjectId: project?.id ?? null, summary: `Added project ${label(project?.name, 'an untitled project')}` })
}

// ONE entry, not one per project. The registry holds 16 rows; 16 lines for a
// single button press would bury Taylor's own actions under machine noise, which
// is the exact failure the reference layout invites (spec section 5.4).
export function registryResyncedActivity(count) {
  const n = Number.isFinite(count) ? count : 0
  return activityRow({ kind: 'registry_resynced', summary: `Re-synced the project registry (${n} project${n === 1 ? '' : 's'})` })
}

export function taskCreatedActivity(task) {
  return activityRow({ kind: 'task_created', projectId: task?.projectId ?? null, subjectId: task?.id ?? null, summary: `Added task ${label(task?.name, 'an untitled task')}` })
}

// task_completed vs task_status branches on the NEW status, so "moved to Done"
// is its own kind and the stream can weight it differently from a move to
// Waiting. The summary names BOTH ends of the move: "changed status" alone does
// not tell her what happened.
export function taskStatusActivity(task, fromStatus, toStatus) {
  const done = toStatus === 'Done'
  const name = label(task?.name, 'an untitled task')
  const from = String(fromStatus ?? '').trim()
  const summary = done
    ? `Completed ${name}${from && from !== 'Done' ? ` (was ${from})` : ''}`
    : `Moved ${name} from ${from || 'no status'} to ${String(toStatus ?? '').trim() || 'no status'}`
  return activityRow({ kind: done ? 'task_completed' : 'task_status', projectId: task?.projectId ?? null, subjectId: task?.id ?? null, summary })
}

// Unfiling is as real as filing, so a null project still produces a line rather
// than nothing. projectId is the NEW project, which is what the stream scopes on.
export function taskLinkedActivity(task, projectId, projectName) {
  const name = label(task?.name, 'an untitled task')
  const summary = projectId
    ? `Filed ${name} under ${String(projectName ?? '').trim() || 'a project'}`
    : `Unfiled ${name}`
  return activityRow({ kind: 'task_linked', projectId: projectId ?? null, subjectId: task?.id ?? null, summary })
}

// task_flagged exists rather than reusing task_status because marking a handoff
// candidate is NOT a status change, and a stream line reading "status changed"
// when the status did not change is a small lie the log should not tell.
export function taskFlaggedActivity(task, promotionState) {
  const name = label(task?.name, 'an untitled task')
  const summary = promotionState === 'candidate'
    ? `Flagged ${name} as a handoff candidate`
    : `Cleared the handoff flag on ${name}`
  return activityRow({ kind: 'task_flagged', projectId: task?.projectId ?? null, subjectId: task?.id ?? null, summary })
}

// Built from the task as it was BEFORE deletion, because afterwards there is
// nothing left to name. subject_id has no FK precisely so this row outlives it.
export function taskDeletedActivity(task) {
  return activityRow({ kind: 'task_deleted', projectId: task?.projectId ?? null, subjectId: task?.id ?? null, summary: `Deleted task ${label(task?.name, 'an untitled task')}` })
}

// Captures carry no project, so project_id is null here and the row still
// renders in portfolio scope. That is a real state, not a missing value.
export function captureAddedActivity(capture) {
  return activityRow({ kind: 'capture_added', subjectId: capture?.id ?? null, summary: `Captured ${label(capture?.body, 'an empty note')}` })
}

export function eventAddedActivity(event) {
  const when = String(event?.date ?? '').trim()
  return activityRow({ kind: 'event_added', projectId: event?.projectId ?? null, subjectId: event?.id ?? null, summary: `Added event ${label(event?.name, 'an untitled event')}${when ? ` on ${when}` : ''}` })
}

// ONE entry per sync, never one per event. Her 2026-10-02 sync reconciled 36
// events; 36 rows would make the stream useless. The counts go in the summary so
// nothing is lost by collapsing them.
export function calendarSyncedActivity({ inserted = 0, updated = 0, deleted = 0 } = {}) {
  const parts = []
  if (inserted) parts.push(`${inserted} added`)
  if (updated) parts.push(`${updated} updated`)
  if (deleted) parts.push(`${deleted} removed`)
  // Zero changes is a real and useful outcome -- it is what "already up to date"
  // looks like -- so it still logs rather than silently writing nothing.
  return activityRow({ kind: 'calendar_synced', summary: `Synced Google Calendar: ${parts.length ? parts.join(', ') : 'already up to date'}` })
}

// Maps a stored row to the shape the stream merges. `kind` is kept so the stream
// can render per-kind affordances later without a second query.
export function activityFromRow(row) {
  return {
    id: `activity::${row.id}`,
    source: 'activity',
    kind: row.kind,
    projectId: row.project_id ?? null,
    subjectId: row.subject_id ?? null,
    summary: row.summary ?? '',
    occurredAt: row.occurred_at ?? null,
  }
}
