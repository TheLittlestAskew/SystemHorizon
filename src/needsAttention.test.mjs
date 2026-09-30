import test from 'node:test'
import assert from 'node:assert/strict'
import { ATTENTION_LIMIT, GDOL_WEEKLY_CONTACTS, SEVERITY, buildNeedsAttention, gdolWeekEnding, inGdolWindow, repoStatusFlags, toDateKey } from './needsAttention.js'

// The executable form of M4's acceptance criteria in docs/NORTH_STAR.md: never
// more than five alerts, deterministic order (severity then date), and tests for
// 0 / 5 / 12 inputs, missing dates, and a source that errors.

// A Saturday, so gdolWeekEnding(NOW) is this same day and the week maths is easy
// to reason about in the fixtures below.
const NOW = new Date('2026-09-26T12:00:00')
const TODAY = toDateKey(NOW)

// Three contacts this week clears the GA DOL shortfall, so fixtures that do not
// want that alert can spread this in.
function satisfiedGdol() {
  const week = gdolWeekEnding(NOW)
  return [1, 2, 3].map((n) => ({ id: `q${n}`, status: 'Applied', ws_activity_date: week, ws_reported: true }))
}

test('no inputs yields no alerts and no errors', () => {
  const result = buildNeedsAttention({ now: NOW })
  // With zero jobs the GA DOL shortfall is real, so assert on the empty-source
  // case explicitly rather than pretending zero input means zero alerts.
  assert.equal(result.errors.length, 0)
  assert.equal(result.alerts.length, 1)
  assert.equal(result.alerts[0].id, 'career:gdol-shortfall')
})

test('a fully satisfied week with clean mirrors needs nothing', () => {
  const result = buildNeedsAttention({
    now: NOW,
    jobs: satisfiedGdol(),
    repoHealth: [{ id: 'r1', repoName: 'clean', hasLocalMirror: true, uncommittedCount: 0, aheadCount: 0, behindCount: 0, checkedAt: '2026-09-25T00:00:00Z' }],
  })
  assert.deepEqual(result.alerts, [])
  assert.equal(result.overflow, 0)
  assert.equal(result.errors.length, 0)
})

test('never returns more than five alerts, and reports the overflow', () => {
  // 12 inputs: 12 flagged repos.
  const repoHealth = Array.from({ length: 12 }, (_, i) => ({
    id: `r${String(i).padStart(2, '0')}`, repoName: `repo-${i}`, hasLocalMirror: true,
    uncommittedCount: 1, aheadCount: 0, behindCount: 0, checkedAt: '2026-09-25T00:00:00Z',
  }))
  const result = buildNeedsAttention({ now: NOW, jobs: satisfiedGdol(), repoHealth })
  assert.equal(result.alerts.length, ATTENTION_LIMIT)
  assert.equal(result.overflow, 12 - ATTENTION_LIMIT)
})

test('exactly five alerts reports no overflow', () => {
  const repoHealth = Array.from({ length: 5 }, (_, i) => ({
    id: `r${i}`, repoName: `repo-${i}`, hasLocalMirror: true,
    uncommittedCount: 1, aheadCount: 0, behindCount: 0, checkedAt: '2026-09-25T00:00:00Z',
  }))
  const result = buildNeedsAttention({ now: NOW, jobs: satisfiedGdol(), repoHealth })
  assert.equal(result.alerts.length, 5)
  assert.equal(result.overflow, 0)
})

test('action-needed sorts before awareness regardless of input order', () => {
  const result = buildNeedsAttention({
    now: NOW,
    jobs: [
      ...satisfiedGdol(),
      // awareness: a high-fit lead
      { id: 'lead', status: 'Discovered', match_percent: 92, title: 'Ops Lead' },
      // action: a deadline that has passed
      { id: 'late', status: 'Discovered', deadline: '2026-09-01', title: 'Late Role' },
    ],
    repoHealth: [{ id: 'r1', repoName: 'broken', hasLocalMirror: true, checkError: 'fetch failed', uncommittedCount: 0, aheadCount: 0, behindCount: 0, checkedAt: '2026-09-25T00:00:00Z' }],
  })
  const severities = result.alerts.map((a) => a.severity)
  assert.deepEqual(severities, [...severities].sort((a, b) => a - b), 'alerts must be ordered by severity')
  assert.equal(result.alerts[0].severity, SEVERITY.action)
  assert.equal(result.alerts.at(-1).severity, SEVERITY.awareness)
})

test('within one severity, earlier dates come first and undated alerts come last', () => {
  const result = buildNeedsAttention({
    now: NOW,
    jobs: [
      ...satisfiedGdol(),
      { id: 'a', status: 'Discovered', match_percent: 90, title: 'Dated', deadline: '2026-12-01' },
      { id: 'b', status: 'Discovered', match_percent: 90, title: 'Undated' },
    ],
  })
  const leads = result.alerts.filter((a) => a.id.startsWith('career:lead:'))
  assert.equal(leads.length, 2)
  assert.equal(leads[0].date, '2026-12-01')
  assert.equal(leads[1].date, null, 'the undated lead must sort last')
})

test('ordering is stable and independent of input order', () => {
  const jobs = [
    { id: 'z', status: 'Discovered', match_percent: 90, title: 'Z' },
    { id: 'a', status: 'Discovered', match_percent: 90, title: 'A' },
  ]
  const forward = buildNeedsAttention({ now: NOW, jobs: [...satisfiedGdol(), ...jobs] })
  const reversed = buildNeedsAttention({ now: NOW, jobs: [...satisfiedGdol(), ...[...jobs].reverse()] })
  assert.deepEqual(forward.alerts.map((a) => a.id), reversed.alerts.map((a) => a.id))
})

test('a deadline today reads differently from one that has passed', () => {
  const result = buildNeedsAttention({
    now: NOW,
    jobs: [...satisfiedGdol(), { id: 'today', status: 'Discovered', deadline: TODAY, title: 'Due Now' }],
  })
  const alert = result.alerts.find((a) => a.id === 'career:deadline:today')
  assert.match(alert.reason, /is today/)
})

test('an already-applied job never raises a deadline alert', () => {
  const result = buildNeedsAttention({
    now: NOW,
    jobs: [...satisfiedGdol(), { id: 'sent', status: 'Applied', deadline: '2026-01-01', title: 'Sent' }],
  })
  assert.equal(result.alerts.some((a) => a.id.startsWith('career:deadline:')), false)
})

test('a job with no deadline and no match percent raises nothing', () => {
  const result = buildNeedsAttention({
    now: NOW,
    jobs: [...satisfiedGdol(), { id: 'quiet', status: 'Discovered', title: 'Quiet' }],
  })
  assert.deepEqual(result.alerts, [])
})

test('the GA DOL shortfall counts down toward the weekly requirement', () => {
  const week = gdolWeekEnding(NOW)
  const result = buildNeedsAttention({
    now: NOW,
    jobs: [{ id: 'c1', status: 'Applied', ws_activity_date: week, ws_reported: true }],
  })
  const alert = result.alerts.find((a) => a.id === 'career:gdol-shortfall')
  assert.match(alert.reason, new RegExp(`^${GDOL_WEEKLY_CONTACTS - 1} more work-search contacts`))
  assert.equal(alert.date, week)
})

test('an unreported contact from last week is action-needed', () => {
  const lastWeek = '2026-09-18'
  const result = buildNeedsAttention({
    now: NOW,
    jobs: [...satisfiedGdol(), { id: 'u1', status: 'Applied', ws_activity_date: lastWeek, ws_reported: false }],
  })
  const alert = result.alerts.find((a) => a.id === 'career:gdol-unreported')
  assert.equal(alert.severity, SEVERITY.action)
  assert.equal(alert.date, '2026-09-19', 'dated to the week it was missed, not today')
})

test('stale mirror data raises its own alert', () => {
  const result = buildNeedsAttention({
    now: NOW,
    jobs: satisfiedGdol(),
    repoHealth: [{ id: 'r1', repoName: 'clean', hasLocalMirror: true, uncommittedCount: 0, aheadCount: 0, behindCount: 0, checkedAt: '2026-08-24T09:41:26Z' }],
  })
  const alert = result.alerts.find((a) => a.id === 'mirrors:stale')
  assert.ok(alert, 'month-old check data must be surfaced')
  assert.match(alert.reason, /33 days old/)
})

test('fresh mirror data raises no staleness alert, and missing dates do not crash', () => {
  const fresh = buildNeedsAttention({
    now: NOW, jobs: satisfiedGdol(),
    repoHealth: [{ id: 'r1', repoName: 'clean', hasLocalMirror: true, uncommittedCount: 0, aheadCount: 0, behindCount: 0, checkedAt: '2026-09-25T00:00:00Z' }],
  })
  assert.equal(fresh.alerts.some((a) => a.id === 'mirrors:stale'), false)

  const undated = buildNeedsAttention({
    now: NOW, jobs: satisfiedGdol(),
    repoHealth: [{ id: 'r1', repoName: 'nodate', hasLocalMirror: true, uncommittedCount: 2, aheadCount: 0, behindCount: 0, checkedAt: null }],
  })
  assert.equal(undated.alerts.length, 1)
  assert.equal(undated.alerts[0].date, null)
  assert.equal(undated.alerts.some((a) => a.id === 'mirrors:stale'), false)
})

test('a failing career source still lets mirrors render, and shows the error', () => {
  const result = buildNeedsAttention({
    now: NOW,
    jobError: 'pipeline unreachable',
    repoHealth: [{ id: 'r1', repoName: 'wtff_vault', hasLocalMirror: true, uncommittedCount: 4, aheadCount: 0, behindCount: 0, checkedAt: '2026-09-25T00:00:00Z' }],
  })
  assert.deepEqual(result.errors, [{ source: 'career', message: 'pipeline unreachable' }])
  assert.equal(result.alerts.length, 1)
  assert.equal(result.alerts[0].source, 'mirrors')
  assert.equal(result.alerts.some((a) => a.source === 'career'), false)
})

test('a failing mirrors source still lets career render, and shows the error', () => {
  const result = buildNeedsAttention({
    now: NOW,
    repoError: 'repo health unreachable',
    jobs: [{ id: 'late', status: 'Discovered', deadline: '2026-09-01', title: 'Late Role' }],
  })
  assert.deepEqual(result.errors, [{ source: 'mirrors', message: 'repo health unreachable' }])
  assert.equal(result.alerts.some((a) => a.source === 'career'), true)
  assert.equal(result.alerts.some((a) => a.source === 'mirrors'), false)
})

test('both sources failing yields two errors and no alerts', () => {
  const result = buildNeedsAttention({ now: NOW, jobError: 'a', repoError: 'b' })
  assert.equal(result.errors.length, 2)
  assert.deepEqual(result.alerts, [])
})

test('every alert carries an id, source, reason and severity, and no color', () => {
  const result = buildNeedsAttention({
    now: NOW,
    jobs: [{ id: 'late', status: 'Discovered', deadline: '2026-09-01', title: 'Late Role' }],
    repoHealth: [{ id: 'r1', repoName: 'wtff_vault', hasLocalMirror: true, uncommittedCount: 4, aheadCount: 0, behindCount: 0, checkedAt: '2026-08-24T09:41:26Z' }],
  })
  assert.ok(result.alerts.length > 0)
  for (const alert of result.alerts) {
    assert.ok(alert.id && alert.source && alert.reason, `incomplete alert: ${JSON.stringify(alert)}`)
    assert.ok([SEVERITY.action, SEVERITY.awareness].includes(alert.severity))
    // Color is the component's job. A palette value leaking into the aggregator
    // is how two surfaces end up disagreeing about what amber means.
    assert.equal('tone' in alert, false, `alert must not carry a color: ${JSON.stringify(alert)}`)
  }
})

test('moved helpers still behave as they did in App.jsx', () => {
  assert.equal(gdolWeekEnding(new Date('2026-09-23T12:00:00')), '2026-09-26')
  assert.equal(inGdolWindow('2026-09-20', { start: '2026-09-20', end: '2026-09-26' }), true)
  assert.equal(inGdolWindow(null, { start: '2026-09-20', end: '2026-09-26' }), false)
  assert.deepEqual(repoStatusFlags({ hasLocalMirror: false, checkError: null }).flags, ['No local mirror on this machine'])
  assert.deepEqual(repoStatusFlags({ hasLocalMirror: true, uncommittedCount: 1, aheadCount: 2, behindCount: 0 }).flags, ['1 uncommitted change', '2 unpushed commits'])
  assert.equal(repoStatusFlags({ hasLocalMirror: true, uncommittedCount: 0, aheadCount: 0, behindCount: 0 }).tone, 'cyan')
})

// M11 criterion 2b: signed out, no career rule may run. Every one of them counts
// rows, so an empty list would fabricate a GDOL shortfall alert claiming contacts
// are needed when the truth is that the pipeline was never read.
test('signed out raises no career alert and reports no error', () => {
  const result = buildNeedsAttention({ jobs: [], jobSignedIn: false, repoHealth: [] })
  assert.equal(result.alerts.filter((a) => a.source === 'career').length, 0)
  assert.equal(result.errors.filter((e) => e.source === 'career').length, 0, 'signed out is not an error')
})

test('signed out specifically suppresses the fabricated GDOL shortfall', () => {
  const signedOut = buildNeedsAttention({ jobs: [], jobSignedIn: false })
  const signedIn = buildNeedsAttention({ jobs: [], jobSignedIn: true })
  assert.equal(signedOut.alerts.find((a) => a.id === 'career:gdol-shortfall'), undefined)
  assert.ok(signedIn.alerts.find((a) => a.id === 'career:gdol-shortfall'), 'signed in with 0 contacts is a real shortfall')
})

test('a real error while signed out is still reported as an error', () => {
  const result = buildNeedsAttention({ jobs: [], jobSignedIn: false, jobError: 'permission denied' })
  assert.equal(result.errors.filter((e) => e.source === 'career').length, 1)
})

test('signed in remains the default so existing callers are unchanged', () => {
  assert.ok(buildNeedsAttention({ jobs: [] }).alerts.some((a) => a.source === 'career'))
})
