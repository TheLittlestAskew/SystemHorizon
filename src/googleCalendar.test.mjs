import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CALENDAR_SCOPE,
  SOURCE_GOOGLE,
  describeSync,
  googleEventDate,
  googleTimeToIso,
  isAllDay,
  isCancelled,
  mapGoogleEvent,
  reconcileGoogleEvents,
} from './googleCalendar.js'

const TIMED = {
  id: 'g1',
  summary: 'Standup',
  start: { dateTime: '2026-10-03T09:00:00-04:00' },
  end: { dateTime: '2026-10-03T09:15:00-04:00' },
}
const ALLDAY = { id: 'g2', summary: 'Birthday', start: { date: '2026-10-05' }, end: { date: '2026-10-06' } }

function existingFrom(event, overrides = {}) {
  return { id: `row-${event.id}`, ...mapGoogleEvent(event), ...overrides }
}

test('the scope is events-only and read-only', () => {
  assert.equal(CALENDAR_SCOPE, 'https://www.googleapis.com/auth/calendar.events.readonly')
  assert.match(CALENDAR_SCOPE, /readonly$/, 'a writable calendar scope would break the one-way rule')
})

test('🛑 criterion 7: RFC 3339 keeps its own offset and is not shifted again', () => {
  // 09:00 at -04:00 is 13:00Z. If this ever reads 17:00Z, something has pushed
  // the value through Q2's America/New_York wall-clock path a second time.
  assert.equal(googleTimeToIso(TIMED.start), '2026-10-03T13:00:00.000Z')
  assert.equal(mapGoogleEvent(TIMED).starts_at, '2026-10-03T13:00:00.000Z')
})

test('a UTC-offset and a Z timestamp for the same instant map identically', () => {
  assert.equal(
    googleTimeToIso({ dateTime: '2026-10-03T09:00:00-04:00' }),
    googleTimeToIso({ dateTime: '2026-10-03T13:00:00Z' }),
  )
})

test('an all-day event keeps its date and has no instant', () => {
  assert.equal(isAllDay(ALLDAY), true)
  assert.equal(isAllDay(TIMED), false)
  const mapped = mapGoogleEvent(ALLDAY)
  assert.equal(mapped.event_date, '2026-10-05')
  assert.equal(mapped.starts_at, null, 'an all-day event has no instant to invent')
})

test('a timed event still gets an event_date, because the grid keys off it', () => {
  assert.equal(googleEventDate(TIMED), '2026-10-03')
})

test('Google rows never carry the free-form text times', () => {
  // Those columns exist for hand-typed wall-clock entries. Writing a second copy
  // of a typed value there would create a version that can drift.
  const mapped = mapGoogleEvent(TIMED)
  assert.equal(mapped.start_time, null)
  assert.equal(mapped.end_time, null)
  assert.equal(mapped.source, SOURCE_GOOGLE)
  assert.equal(mapped.external_id, 'g1')
})

test('unusable events map to null rather than inventing a row', () => {
  assert.equal(mapGoogleEvent({ summary: 'no id' }), null)
  assert.equal(mapGoogleEvent({ id: 'x' }), null, 'no start means nowhere to place it')
  assert.equal(mapGoogleEvent({ id: 'x', start: { dateTime: 'not a date' } }), null)
  assert.equal(mapGoogleEvent(null), null)
})

test('a title-less event is labelled, not blank', () => {
  assert.equal(mapGoogleEvent({ id: 'x', start: { date: '2026-10-05' } }).title, '(untitled Google event)')
})

test('criterion 6: a first sync inserts', () => {
  const plan = reconcileGoogleEvents([TIMED, ALLDAY], [])
  assert.equal(plan.toInsert.length, 2)
  assert.equal(plan.toUpdate.length, 0)
  assert.equal(plan.toDelete.length, 0)
})

test('🛑 criterion 6: re-running sync with no changes does NOTHING', () => {
  // The duplicate-on-resync bug is the one this milestone most needs not to have.
  const existing = [existingFrom(TIMED), existingFrom(ALLDAY)]
  const plan = reconcileGoogleEvents([TIMED, ALLDAY], existing)
  assert.deepEqual(plan.toInsert, [])
  assert.deepEqual(plan.toUpdate, [])
  assert.deepEqual(plan.toDelete, [])
  assert.equal(describeSync(plan), 'already up to date')
})

test('criterion 6: a moved event updates in place, it does not duplicate', () => {
  const existing = [existingFrom(TIMED)]
  const moved = { ...TIMED, start: { dateTime: '2026-10-03T11:00:00-04:00' }, end: { dateTime: '2026-10-03T11:15:00-04:00' } }
  const plan = reconcileGoogleEvents([moved], existing)
  assert.equal(plan.toInsert.length, 0, 'a moved event must not become a second row')
  assert.equal(plan.toUpdate.length, 1)
  assert.equal(plan.toUpdate[0].id, 'row-g1', 'the update must target the existing row')
  assert.equal(plan.toUpdate[0].starts_at, '2026-10-03T15:00:00.000Z')
})

test('criterion 6: a renamed event updates', () => {
  const plan = reconcileGoogleEvents([{ ...TIMED, summary: 'Standup (moved room)' }], [existingFrom(TIMED)])
  assert.equal(plan.toUpdate.length, 1)
  assert.equal(plan.toUpdate[0].title, 'Standup (moved room)')
})

test('criterion 6: a cancelled event is deleted, not re-inserted', () => {
  assert.equal(isCancelled({ status: 'cancelled' }), true)
  const plan = reconcileGoogleEvents([{ id: 'g1', status: 'cancelled' }], [existingFrom(TIMED)])
  assert.equal(plan.toInsert.length, 0)
  assert.equal(plan.toDelete.length, 1)
  assert.equal(plan.toDelete[0].external_id, 'g1')
})

test('criterion 6: an event that fell out of the window is deleted too', () => {
  const plan = reconcileGoogleEvents([], [existingFrom(TIMED)])
  assert.equal(plan.toDelete.length, 1)
})

test('🛑 SH-native events are never touched by a sync', () => {
  // The worst possible bug here would be a Google sync deleting her own events.
  const shRows = [
    { id: 'sh1', source: 'sh', external_id: null, title: 'Hand typed', event_date: '2026-10-03' },
    { id: 'sh2', source: 'sh', external_id: null, title: 'Also hers', event_date: '2026-10-04' },
  ]
  const plan = reconcileGoogleEvents([TIMED], shRows)
  assert.deepEqual(plan.toDelete, [], 'an sh row must never be a deletion candidate')
  assert.equal(plan.toUpdate.length, 0)
  assert.equal(plan.toInsert.length, 1, 'the Google event is still new')
})

test('a google row with no external_id is ignored rather than deleted blindly', () => {
  const plan = reconcileGoogleEvents([], [{ id: 'bad', source: 'google', external_id: null }])
  assert.deepEqual(plan.toDelete, [], 'without an id it cannot be matched, so it is not ours to delete')
})

test('two Google events sharing an id do not both insert', () => {
  // Shouldnt happen, but the unique index would reject the second write, so the
  // plan must not produce one.
  const plan = reconcileGoogleEvents([TIMED, { ...TIMED, summary: 'dupe' }], [])
  const ids = plan.toInsert.map((row) => row.external_id)
  assert.equal(new Set(ids).size, ids.length, 'the insert list must not contain the same external_id twice')
  assert.equal(plan.toInsert.length, 1, 'only the first entry for an id is planned')
  assert.equal(plan.skipped.length, 1)
  assert.equal(plan.skipped[0].reason, 'duplicate id in batch')
})

test('unmappable events are counted as skipped, never silently dropped', () => {
  const plan = reconcileGoogleEvents([{ summary: 'no id' }, { id: 'y' }], [])
  assert.equal(plan.skipped.length, 2)
  assert.match(describeSync(plan), /2 skipped/)
})

test('describeSync speaks every outcome, including doing nothing', () => {
  assert.equal(describeSync({ toInsert: [1], toUpdate: [1, 2], toDelete: [1] }), '1 added, 2 updated, 1 removed')
  assert.equal(describeSync({}), 'already up to date')
  assert.equal(describeSync(), 'already up to date')
})

test('no argument at all is safe', () => {
  const plan = reconcileGoogleEvents()
  assert.deepEqual(plan, { toInsert: [], toUpdate: [], toDelete: [], skipped: [] })
})

// ---------------------------------------------------------------------------
// The round-trip tests. Everything above builds "existing" rows from the mapper's
// own output, so both sides are ISO and agree -- which is exactly why they missed
// a live bug where all 16 of Taylor's timed events were rewritten on every sync.
// These use the format Postgres actually returns.
// ---------------------------------------------------------------------------

// What Supabase hands back for a timestamptz: space separator, +00 offset, no ms.
function asPostgresRow(event) {
  const mapped = mapGoogleEvent(event)
  const pg = (iso) => (iso ? iso.replace('T', ' ').replace('.000Z', '+00') : null)
  return { id: `row-${event.id}`, ...mapped, starts_at: pg(mapped.starts_at), ends_at: pg(mapped.ends_at) }
}

test('🛑 a re-sync against DATABASE-FORMAT timestamps is still a no-op', () => {
  // The live bug: '2026-10-03 13:00:00+00' !== '2026-10-03T13:00:00.000Z' as text,
  // so every timed event looked changed and was rewritten on every run.
  const existing = [asPostgresRow(TIMED)]
  assert.match(existing[0].starts_at, /^\d{4}-\d{2}-\d{2} /, 'the fixture must use the space-separated DB format')
  const plan = reconcileGoogleEvents([TIMED], existing)
  assert.deepEqual(plan.toUpdate, [], 'same instant in a different text format is NOT a change')
  assert.equal(describeSync(plan), 'already up to date')
})

test('a real time change is still detected across formats', () => {
  const existing = [asPostgresRow(TIMED)]
  const moved = { ...TIMED, start: { dateTime: '2026-10-03T11:00:00-04:00' }, end: TIMED.end }
  const plan = reconcileGoogleEvents([moved], existing)
  assert.equal(plan.toUpdate.length, 1, 'comparing instants must not make it blind to real moves')
})

test('an equivalent offset is not a change either', () => {
  // 09:00-04:00 and 13:00Z are the same moment expressed two ways.
  const existing = [asPostgresRow(TIMED)]
  const restated = { ...TIMED, start: { dateTime: '2026-10-03T13:00:00Z' }, end: { dateTime: '2026-10-03T13:15:00Z' } }
  assert.deepEqual(reconcileGoogleEvents([restated], existing).toUpdate, [])
})

test('an all-day row round-trips as a no-op too', () => {
  const plan = reconcileGoogleEvents([ALLDAY], [asPostgresRow(ALLDAY)])
  assert.deepEqual(plan.toUpdate, [], 'null timestamps must compare equal, not update forever')
})

test('null versus a real timestamp is still a change', () => {
  const existing = [{ ...asPostgresRow(TIMED), starts_at: null }]
  assert.equal(reconcileGoogleEvents([TIMED], existing).toUpdate.length, 1)
})

test('two unparseable timestamps only match when their text matches', () => {
  const base = asPostgresRow(TIMED)
  const junk = [{ ...base, starts_at: 'not a date' }]
  // Against a real value it is a change, and it must not loop forever on NaN.
  assert.equal(reconcileGoogleEvents([TIMED], junk).toUpdate.length, 1)
})
