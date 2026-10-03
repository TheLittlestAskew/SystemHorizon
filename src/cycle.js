// The Cycle remaining instrument, derived from the clock instead of asserted.
//
// It shipped with `232` days left and a dot matrix reading `18 of 35 days
// complete`, both hardcoded. On 2026-10-03 the real answer was 89, so the
// instrument stated a falsehood for every day it was on screen, and 35 is not
// the length of any real period. A number nobody computes is a number nobody
// can trust.
//
// Everything here reads LOCAL date components, never UTC and never an ISO
// string. The app renders in Taylor's browser in America/New_York; on an
// October evening a UTC-based day number is already tomorrow's, so `new
// Date().toISOString().slice(0,10)` would show the wrong day after 8pm.

const MS_PER_DAY = 86_400_000

// A midnight-local timestamp. Subtracting two of these gives whole days with no
// DST remainder to round away: both endpoints sit at local midnight, so the
// one-hour shift cancels rather than accumulating into a 23- or 25-hour day.
function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

export function daysBetween(from, to) {
  return Math.round((startOfLocalDay(to) - startOfLocalDay(from)) / MS_PER_DAY)
}

export function daysInMonth(year, monthIndex) {
  // Day 0 of the next month is the last day of this one, which gets February
  // and leap years right without a table or a modulo rule.
  return new Date(year, monthIndex + 1, 0).getDate()
}

// Days remaining in the calendar year, counting today as spent.
// Dec 31 returns 0 -- the year is not "1 day left" on its final day.
export function daysLeftInYear(now = new Date()) {
  const year = now.getFullYear()
  return daysBetween(now, new Date(year, 11, 31))
}

// The month as the visible cycle: one dot per day, filled for days elapsed.
// A month is the right grain for a dot matrix -- 365 dots is a texture, not a
// reading, and 35 was neither.
export function monthCycle(now = new Date()) {
  const year = now.getFullYear()
  const monthIndex = now.getMonth()
  const total = daysInMonth(year, monthIndex)
  return { completed: now.getDate(), total, label: `day ${now.getDate()} of ${total}` }
}

export function cycleReading(now = new Date()) {
  return { daysLeft: daysLeftInYear(now), year: now.getFullYear(), ...monthCycle(now) }
}
