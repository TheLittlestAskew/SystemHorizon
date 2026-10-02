// M8: Google Calendar -> System Horizon, one way only.
//
// Everything in this file is pure. The network call, the token, and the Supabase
// writes live in App.jsx; this module decides WHAT should change, so the decision
// is testable without a browser, a Google account, or a database.
//
// 🛑 ONE DIRECTION. Nothing here produces a request to Google. SH holds a
// read-only copy; Google remains the source of truth for anything it owns.

export const SOURCE_SH = 'sh'
export const SOURCE_GOOGLE = 'google'

// Google's own scope string. The narrower `calendar.events.owned.readonly` was
// considered and rejected: it covers only calendars Taylor owns, so a shared or
// subscribed calendar would silently vanish from Home, which is worse than
// reading one scope wider. Still events-only and still read-only.
export const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events.readonly'

// ---------------------------------------------------------------------------
// Mapping one Google event to a horizon_events row
// ---------------------------------------------------------------------------

// Google gives either `dateTime` (RFC 3339, carries its own offset) or `date`
// (all-day, no time at all). They are not interchangeable.
//
// 🛑 RFC 3339 goes straight into starts_at. It must NEVER travel through Q2's
// `AT TIME ZONE 'America/New_York'` wall-clock path: that path exists to give a
// zone to text that has none, and applying it to a value that already carries an
// offset shifts it a second time.
export function googleTimeToIso(slot) {
  if (!slot) return null
  if (slot.dateTime) {
    const parsed = new Date(slot.dateTime)
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
  }
  return null // all-day: the date is kept in event_date, there is no instant
}

export function isAllDay(event) {
  return Boolean(event?.start?.date && !event?.start?.dateTime)
}

// The calendar grid and the Agenda both key off event_date, so a Google event
// still needs one even when it carries a full timestamp.
export function googleEventDate(event) {
  if (event?.start?.date) return event.start.date
  const iso = googleTimeToIso(event?.start)
  return iso ? iso.slice(0, 10) : null
}

// Returns null for anything unusable rather than inventing a row. A Google event
// with no id cannot be deduped, and one with no start cannot be placed.
export function mapGoogleEvent(event) {
  if (!event?.id) return null
  const date = googleEventDate(event)
  if (!date) return null
  return {
    source: SOURCE_GOOGLE,
    external_id: event.id,
    title: String(event.summary ?? '').trim() || '(untitled Google event)',
    event_date: date,
    starts_at: googleTimeToIso(event.start),
    ends_at: googleTimeToIso(event.end),
    // The text columns stay empty for Google rows. They exist for hand-typed
    // wall-clock entries; duplicating a typed value as text would create a second
    // version that could drift.
    start_time: null,
    end_time: null,
    notes: String(event.description ?? '').trim() || null,
  }
}

// Google marks deletions as status 'cancelled' rather than omitting them.
export function isCancelled(event) {
  return event?.status === 'cancelled'
}

// ---------------------------------------------------------------------------
// Reconcile: what to insert, update, delete
// ---------------------------------------------------------------------------

// Fields compared to decide whether an existing Google row needs rewriting. Only
// what the mapper sets, so an unrelated column change never looks like a drift.
const COMPARED_TEXT = ['title', 'event_date', 'notes']
const COMPARED_INSTANT = ['starts_at', 'ends_at']

// 🛑 Timestamps are compared as INSTANTS, not as text, and that distinction is
// the whole reason this function exists in this shape.
//
// Postgres hands back '2026-10-03 13:00:00+00'; the mapper produces
// '2026-10-03T13:00:00.000Z'. Same moment, different string. Comparing them as
// text marked every timed event as changed on every single sync -- 16 pointless
// writes per run against Taylor's real calendar, churning updated_at each time.
//
// ⚠️ The original tests could not catch this: they built the 'existing' rows from
// mapGoogleEvent's own output, so both sides were already ISO and agreed. A test
// that round-trips through the database's text format is what proves it.
function sameInstant(a, b) {
  if (a == null && b == null) return true
  if (a == null || b == null) return false
  const left = new Date(a).getTime()
  const right = new Date(b).getTime()
  // Two unparseable values are only 'the same' if their text is identical; NaN
  // compares false to everything, which would otherwise mean perpetual updates.
  if (Number.isNaN(left) || Number.isNaN(right)) return String(a) === String(b)
  return left === right
}

function differs(existing, mapped) {
  if (COMPARED_TEXT.some((key) => (existing?.[key] ?? null) !== (mapped[key] ?? null))) return true
  return COMPARED_INSTANT.some((key) => !sameInstant(existing?.[key] ?? null, mapped[key] ?? null))
}

// Pure. Given Google's events and the Google-sourced rows SH already holds,
// decide the three lists.
//
// 🛑 `existingRows` must contain ONLY rows with source='google'. Passing SH-native
// rows would make them candidates for deletion, which is why the caller filters
// and why `toDelete` is keyed on external_id rather than on row id alone.
export function reconcileGoogleEvents(googleEvents = [], existingRows = []) {
  const existing = new Map()
  for (const row of existingRows ?? []) {
    if (row?.source !== SOURCE_GOOGLE || !row?.external_id) continue
    existing.set(row.external_id, row)
  }

  const toInsert = []
  const toUpdate = []
  const skipped = []
  // Ids Google still offers as live events. Everything Google-sourced that SH
  // holds and this set does not name gets deleted: that covers both a cancelled
  // event and one that fell out of the synced window.
  const liveIds = new Set()

  for (const event of googleEvents ?? []) {
    if (!event?.id) { skipped.push({ reason: 'no id', event }); continue }
    // 'cancelled' is Google's way of saying deleted. It is a deletion
    // instruction, not an event, so it never becomes a live id.
    if (isCancelled(event)) continue

    const mapped = mapGoogleEvent(event)
    if (!mapped) { skipped.push({ reason: 'unmappable', event }); continue }
    // Dedupe WITHIN the batch, not just against what SH already holds. Two
    // payload entries sharing an id would otherwise both be planned as inserts,
    // and the partial unique index on (owner, external_id) would reject the
    // second write mid-sync. Found by test, not by reasoning.
    if (liveIds.has(event.id)) { skipped.push({ reason: 'duplicate id in batch', event }); continue }
    liveIds.add(event.id)

    const row = existing.get(event.id)
    if (!row) toInsert.push(mapped)
    else if (differs(row, mapped)) toUpdate.push({ id: row.id, ...mapped })
  }

  const toDelete = [...existing.values()].filter((row) => !liveIds.has(row.external_id))

  return { toInsert, toUpdate, toDelete, skipped }
}
// A spoken summary, so the UI never reports a silent no-op as success.
export function describeSync({ toInsert = [], toUpdate = [], toDelete = [], skipped = [] } = {}) {
  const bits = []
  if (toInsert.length) bits.push(`${toInsert.length} added`)
  if (toUpdate.length) bits.push(`${toUpdate.length} updated`)
  if (toDelete.length) bits.push(`${toDelete.length} removed`)
  const main = bits.length ? bits.join(', ') : 'already up to date'
  return skipped.length ? `${main} · ${skipped.length} skipped` : main
}
