import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cycleReading, daysInMonth, daysLeftInYear, monthCycle } from './cycle.js'

// Local-time constructor on purpose: `new Date(2026, 9, 3)` is local midnight,
// where `new Date('2026-10-03')` is UTC midnight and would be Oct 2 in ET. The
// fixtures must be built the same way the code reads the clock, or the test
// agrees with itself instead of with the calendar.
const on = (y, m, d) => new Date(y, m - 1, d)

test('the live defect: 2026-10-03 is 89 days from the end of the year, not 232', () => {
  assert.equal(daysLeftInYear(on(2026, 10, 3)), 89)
})

test('the last day of the year has zero days left, not one', () => {
  assert.equal(daysLeftInYear(on(2026, 12, 31)), 0)
})

test('the first day of a year leaves every other day of it', () => {
  assert.equal(daysLeftInYear(on(2026, 1, 1)), 364)
  assert.equal(daysLeftInYear(on(2028, 1, 1)), 365, 'a leap year has one more')
})

test('leap day is handled by the calendar, not by a rule', () => {
  assert.equal(daysInMonth(2028, 1), 29, 'February 2028 is a leap February')
  assert.equal(daysInMonth(2026, 1), 28)
  assert.equal(daysLeftInYear(on(2028, 2, 29)), 306)
})

test('month lengths come out right at both ends of the year', () => {
  assert.equal(daysInMonth(2026, 0), 31, 'January')
  assert.equal(daysInMonth(2026, 3), 30, 'April')
  assert.equal(daysInMonth(2026, 11), 31, 'December')
})

test('the month cycle counts today as elapsed', () => {
  assert.deepEqual(monthCycle(on(2026, 10, 3)), { completed: 3, total: 31, label: 'day 3 of 31' })
  assert.deepEqual(monthCycle(on(2026, 2, 28)), { completed: 28, total: 28, label: 'day 28 of 28' })
})

test('completed never exceeds total, so the matrix cannot overfill', () => {
  for (const month of Array.from({ length: 12 }, (_, i) => i + 1)) {
    const total = daysInMonth(2026, month - 1)
    const reading = monthCycle(on(2026, month, total))
    assert.ok(reading.completed <= reading.total, `month ${month} overfilled`)
  }
})

// A DST boundary is where a naive (end - start) / 86400000 goes wrong: the day
// is 23 or 25 hours long, so the quotient lands just off a whole number. Both
// US transitions are covered because they fall in different directions.
test('a DST transition does not drop or add a day', () => {
  assert.equal(daysLeftInYear(on(2026, 3, 7)) - daysLeftInYear(on(2026, 3, 9)), 2,
    'spring forward: two calendar days apart')
  assert.equal(daysLeftInYear(on(2026, 10, 31)) - daysLeftInYear(on(2026, 11, 2)), 2,
    'fall back: two calendar days apart')
})

test('cycleReading carries the real year, never a literal', () => {
  const reading = cycleReading(on(2027, 5, 15))
  assert.equal(reading.year, 2027)
  assert.equal(reading.daysLeft, 230)
  assert.equal(reading.total, 31)
})

// The guard against this regressing into a constant again: a value that does
// not move with the clock is exactly the bug that was just removed.
test('every field moves with the clock', () => {
  const jan = cycleReading(on(2026, 1, 15))
  const apr = cycleReading(on(2026, 4, 15))
  assert.notEqual(jan.daysLeft, apr.daysLeft, 'daysLeft must track the date')
  // January has 31 days and April 30 -- chosen because January and July are
  // BOTH 31, so an obvious-looking pair would have asserted nothing.
  assert.notEqual(jan.total, apr.total, 'total must track the month')
  assert.notEqual(cycleReading(on(2026, 6, 1)).year, cycleReading(on(2027, 6, 1)).year)
})
