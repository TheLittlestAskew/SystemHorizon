// Today and Next timeline, per docs/NORTH_STAR.md M5 and the IA doc's
// information priority 3: a short chronological list, not a mini calendar.
//
// horizon_events.start_time / end_time are free-form `text` (the Calendar's
// input is a plain text box with a "10:00 AM" placeholder), and changing the
// column type is RED until Q2 is answered. So times are parsed defensively
// here, and anything unparseable is shown with a marker rather than hidden:
// dropping an event silently is worse than rendering it oddly.

// Minutes from midnight. All-day events sort before timed ones; unparseable
// times cannot be placed, so they sort last within their day.
const ALL_DAY = -1
const UNPLACEABLE = Number.MAX_SAFE_INTEGER

function twelveHour(hour, meridiem) {
  if (hour < 1 || hour > 12) return null
  const pm = meridiem.toLowerCase() === 'p'
  if (hour === 12) return pm ? 12 : 0
  return pm ? hour + 12 : hour
}

function placed(hour, minute, raw) {
  if (hour === null || hour > 23 || minute > 59) return unparseable(raw)
  const suffix = hour < 12 ? 'AM' : 'PM'
  const shown = hour % 12 === 0 ? 12 : hour % 12
  return {
    minutes: hour * 60 + minute,
    display: `${shown}:${String(minute).padStart(2, '0')} ${suffix}`,
    allDay: false,
    unparsed: false,
  }
}

function unparseable(raw) {
  return { minutes: UNPLACEABLE, display: raw, allDay: false, unparsed: true }
}

// Accepts "10:00 AM", "10 AM", "10a.m.", "14:30". The display is normalized
// because the source is a free-text box, so one timeline can hold several
// spellings of the same time.
export function parseEventTime(raw) {
  const text = (raw ?? '').trim()
  if (!text) return { minutes: ALL_DAY, display: '', allDay: true, unparsed: false }

  let match = text.match(/^(\d{1,2}):(\d{2})\s*([ap])\.?\s*m\.?$/i)
  if (match) return placed(twelveHour(Number(match[1]), match[3]), Number(match[2]), text)

  match = text.match(/^(\d{1,2})\s*([ap])\.?\s*m\.?$/i)
  if (match) return placed(twelveHour(Number(match[1]), match[2]), 0, text)

  match = text.match(/^(\d{1,2}):(\d{2})$/)
  if (match) return placed(Number(match[1]), Number(match[2]), text)

  return unparseable(text)
}

export function toDateKey(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function addDays(dateKey, days) {
  const d = new Date(`${dateKey}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function dayLabel(dateKey, todayKey) {
  if (dateKey === todayKey) return 'Today'
  if (dateKey === addDays(todayKey, 1)) return 'Tomorrow'
  const d = new Date(`${dateKey}T00:00:00`)
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).format(d)
}

// Total order: date, then all-day before timed, then time, then title, then id.
// Title and id are tiebreaks so the order never depends on input order.
export function compareEvents(a, b) {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1
  const at = parseEventTime(a.startTime).minutes
  const bt = parseEventTime(b.startTime).minutes
  if (at !== bt) return at - bt
  const at2 = (a.title ?? '').localeCompare(b.title ?? '')
  if (at2 !== 0) return at2
  return String(a.id ?? '').localeCompare(String(b.id ?? ''))
}

// Groups upcoming events by day. `limit` keeps the list short, per the IA;
// whatever it cuts is counted in `hidden` rather than silently discarded.
export function buildTimeline({ events = [], now = new Date(), limit = 6 } = {}) {
  const todayKey = toDateKey(now)

  const upcoming = events
    .filter((event) => event.date && event.date >= todayKey)
    .sort(compareEvents)

  const shown = upcoming.slice(0, limit)
  const groups = []
  for (const event of shown) {
    const time = parseEventTime(event.startTime)
    const item = { id: event.id, title: event.title, projectId: event.projectId ?? null, ...time }
    const last = groups[groups.length - 1]
    if (last && last.date === event.date) last.items.push(item)
    else groups.push({ date: event.date, label: dayLabel(event.date, todayKey), isToday: event.date === todayKey, items: [item] })
  }

  return {
    groups,
    hidden: Math.max(0, upcoming.length - shown.length),
    unparsedCount: shown.filter((event) => parseEventTime(event.startTime).unparsed).length,
  }
}
