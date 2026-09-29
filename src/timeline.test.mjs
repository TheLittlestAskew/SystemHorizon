import test from 'node:test'
import assert from 'node:assert/strict'
import { addDays, buildTimeline, compareEvents, dayLabel, parseEventTime, toDateKey } from './timeline.js'

// The executable form of M5's acceptance criteria in docs/NORTH_STAR.md:
// chronological, and handles all-day, missing times, unparseable times, and
// past-today items.

const NOW = new Date('2026-09-27T09:00:00')
const TODAY = toDateKey(NOW)

function evt(over = {}) {
  return { id: 'e1', title: 'Event', date: TODAY, startTime: null, ...over }
}

test('an empty or missing time means all-day, not a parse failure', () => {
  for (const raw of [null, undefined, '', '   ']) {
    const parsed = parseEventTime(raw)
    assert.equal(parsed.allDay, true, `expected ${JSON.stringify(raw)} to be all-day`)
    assert.equal(parsed.unparsed, false)
    assert.equal(parsed.display, '')
  }
})

test('parses 12-hour times and normalizes the display', () => {
  assert.equal(parseEventTime('10:00 AM').display, '10:00 AM')
  assert.equal(parseEventTime('10:00am').display, '10:00 AM')
  assert.equal(parseEventTime('10 AM').display, '10:00 AM')
  assert.equal(parseEventTime('7:05 p.m.').display, '7:05 PM')
  assert.equal(parseEventTime('7:05 PM').minutes, 19 * 60 + 5)
})

test('parses 24-hour times', () => {
  assert.equal(parseEventTime('14:30').display, '2:30 PM')
  assert.equal(parseEventTime('09:05').display, '9:05 AM')
  assert.equal(parseEventTime('00:30').display, '12:30 AM')
  assert.equal(parseEventTime('23:59').minutes, 23 * 60 + 59)
})

test('midnight and noon do not collide', () => {
  assert.equal(parseEventTime('12:00 AM').minutes, 0)
  assert.equal(parseEventTime('12:00 PM').minutes, 12 * 60)
  assert.equal(parseEventTime('12:00 AM').display, '12:00 AM')
  assert.equal(parseEventTime('12:00 PM').display, '12:00 PM')
})

test('nonsense times are marked unparsed and keep their original text', () => {
  for (const raw of ['whenever', '25:00', '13:00 PM', '10:75', '0 AM', 'lunchtime']) {
    const parsed = parseEventTime(raw)
    assert.equal(parsed.unparsed, true, `expected ${raw} to be unparseable`)
    assert.equal(parsed.display, raw, 'the original text must survive for display')
    assert.equal(parsed.allDay, false)
  }
})

test('within a day: all-day first, then by time, then unparseable last', () => {
  const events = [
    evt({ id: 'bad', startTime: 'whenever' }),
    evt({ id: 'ten', startTime: '10:00 AM' }),
    evt({ id: 'allday', startTime: null }),
    evt({ id: 'nine', startTime: '9:00 AM' }),
  ]
  const { groups } = buildTimeline({ events, now: NOW })
  assert.deepEqual(groups[0].items.map((i) => i.id), ['allday', 'nine', 'ten', 'bad'])
})

test('9am sorts before 10am, which raw string comparison gets wrong', () => {
  // The bug this module exists to avoid: '9:00 AM'.localeCompare('10:00 AM') > 0.
  assert.ok('9:00 AM'.localeCompare('10:00 AM') > 0, 'precondition: string sort is wrong')
  const events = [evt({ id: 'ten', startTime: '10:00 AM' }), evt({ id: 'nine', startTime: '9:00 AM' })]
  const { groups } = buildTimeline({ events, now: NOW })
  assert.deepEqual(groups[0].items.map((i) => i.id), ['nine', 'ten'])
})

test('past-today events are excluded, today and future are kept', () => {
  const events = [
    evt({ id: 'yesterday', date: addDays(TODAY, -1) }),
    evt({ id: 'lastyear', date: '2025-01-01' }),
    evt({ id: 'today', date: TODAY }),
    evt({ id: 'tomorrow', date: addDays(TODAY, 1) }),
  ]
  const { groups } = buildTimeline({ events, now: NOW })
  const ids = groups.flatMap((g) => g.items.map((i) => i.id))
  assert.deepEqual(ids, ['today', 'tomorrow'])
})

test('a far-future event still appears rather than being hidden by a horizon', () => {
  const events = [evt({ id: 'far', date: '2027-06-01' })]
  const { groups, hidden } = buildTimeline({ events, now: NOW })
  assert.equal(groups.length, 1)
  assert.equal(groups[0].items[0].id, 'far')
  assert.equal(hidden, 0)
})

test('events group by day in chronological order with useful labels', () => {
  const events = [
    evt({ id: 'c', date: addDays(TODAY, 3), startTime: '8:00 AM' }),
    evt({ id: 'a', date: TODAY, startTime: '8:00 AM' }),
    evt({ id: 'b', date: addDays(TODAY, 1), startTime: '8:00 AM' }),
  ]
  const { groups } = buildTimeline({ events, now: NOW })
  assert.deepEqual(groups.map((g) => g.date), [TODAY, addDays(TODAY, 1), addDays(TODAY, 3)])
  assert.equal(groups[0].label, 'Today')
  assert.equal(groups[0].isToday, true)
  assert.equal(groups[1].label, 'Tomorrow')
  assert.equal(groups[1].isToday, false)
  assert.match(groups[2].label, /^[A-Z][a-z]+day, [A-Z][a-z]{2} \d+$/)
})

test('the list stays short and reports what it cut', () => {
  const events = Array.from({ length: 10 }, (_, i) => evt({ id: `e${i}`, date: addDays(TODAY, i) }))
  const { groups, hidden } = buildTimeline({ events, now: NOW, limit: 6 })
  assert.equal(groups.flatMap((g) => g.items).length, 6)
  assert.equal(hidden, 4)
})

test('unparsed times are counted so the UI can flag them', () => {
  const events = [
    evt({ id: 'ok', startTime: '10:00 AM' }),
    evt({ id: 'bad1', startTime: 'whenever' }),
    evt({ id: 'bad2', startTime: 'after lunch' }),
  ]
  const { unparsedCount } = buildTimeline({ events, now: NOW })
  assert.equal(unparsedCount, 2)
})

test('no events yields no groups and nothing hidden', () => {
  const result = buildTimeline({ events: [], now: NOW })
  assert.deepEqual(result.groups, [])
  assert.equal(result.hidden, 0)
  assert.equal(result.unparsedCount, 0)
  assert.deepEqual(buildTimeline().groups, [])
})

test('an event with no date is dropped rather than crashing the sort', () => {
  const events = [evt({ id: 'nodate', date: null }), evt({ id: 'ok' })]
  const { groups } = buildTimeline({ events, now: NOW })
  assert.deepEqual(groups.flatMap((g) => g.items.map((i) => i.id)), ['ok'])
})

test('ordering is total, so it does not depend on input order', () => {
  const events = [
    evt({ id: 'b', title: 'Same', startTime: '9:00 AM' }),
    evt({ id: 'a', title: 'Same', startTime: '9:00 AM' }),
  ]
  const forward = buildTimeline({ events, now: NOW })
  const reversed = buildTimeline({ events: [...events].reverse(), now: NOW })
  assert.deepEqual(
    forward.groups.flatMap((g) => g.items.map((i) => i.id)),
    reversed.groups.flatMap((g) => g.items.map((i) => i.id)),
  )
  assert.equal(compareEvents(events[0], events[1]) > 0, true, 'id breaks the tie')
})

test('dayLabel names today and tomorrow, and dates anything further out', () => {
  assert.equal(dayLabel('2026-09-27', '2026-09-27'), 'Today')
  assert.equal(dayLabel('2026-09-28', '2026-09-27'), 'Tomorrow')
  assert.equal(dayLabel('2026-10-05', '2026-09-27'), 'Monday, Oct 5')
})

test('addDays crosses month and year boundaries', () => {
  assert.equal(addDays('2026-09-30', 1), '2026-10-01')
  assert.equal(addDays('2026-12-31', 1), '2027-01-01')
  assert.equal(addDays('2026-01-01', -1), '2025-12-31')
})

// The Calendar Agenda list used `localeCompare` on the raw start_time text,
// which sorts "10:00 AM" before "9:00 AM". These pin the bug closed now that
// CalendarView sorts with compareEvents.
test('compareEvents orders single-digit hours before double-digit ones', () => {
  const nine = { id: 'a', date: '2026-09-29', startTime: '9:00 AM', title: 'Nine' }
  const ten = { id: 'b', date: '2026-09-29', startTime: '10:00 AM', title: 'Ten' }
  assert.equal(compareEvents(nine, ten) < 0, true, '9 AM comes before 10 AM')
  assert.equal(compareEvents(ten, nine) > 0, true, 'and the reverse holds')
  assert.equal('9:00 AM'.localeCompare('10:00 AM') > 0, true, 'the old comparator got this wrong')
})

test('compareEvents sorts a full day into real chronological order', () => {
  const day = [
    { id: '1', date: '2026-09-29', startTime: '10:00 AM', title: 'Ten' },
    { id: '2', date: '2026-09-29', startTime: '9:00 AM', title: 'Nine' },
    { id: '3', date: '2026-09-29', startTime: '', title: 'All day' },
    { id: '4', date: '2026-09-29', startTime: '2:30 PM', title: 'Afternoon' },
    { id: '5', date: '2026-09-29', startTime: 'whenever', title: 'Unreadable' },
    { id: '6', date: '2026-09-28', startTime: '11:00 PM', title: 'Yesterday' },
  ]
  assert.deepEqual(
    [...day].sort(compareEvents).map((event) => event.title),
    ['Yesterday', 'All day', 'Nine', 'Ten', 'Afternoon', 'Unreadable'],
  )
})
