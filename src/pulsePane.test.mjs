import test from 'node:test'
import assert from 'node:assert/strict'
import {
  FRESH_WINDOW_DAYS, UPCOMING_WINDOW_DAYS, PULSE_TABS, isFresh, staleProjects,
  ringReading, ringCaption, overviewPayload, mirrorsPayload, upcomingPayload, stalePayload,
} from './pulsePane.js'

const NOW = new Date(2026, 9, 4, 14, 0, 0) // 2026-10-04 14:00 local

// `now` is injected everywhere, so none of these are true only on the day they ran.
function project(over = {}) {
  return { id: 'p1', name: 'System Horizon', area: 'Ops & Infra', status: 'Active', health: 'Green', signal: 90, lastActivity: '2026-10-03 09:00', nextAction: 'Ship M12', repoNames: ['SystemHorizon'], ...over }
}

test('the four tabs are present, in order', () => {
  assert.deepEqual(PULSE_TABS.map((t) => t.id), ['overview', 'mirrors', 'upcoming', 'stale'])
})

// --- the boundary ------------------------------------------------------------

test('🛑 exactly FRESH_WINDOW_DAYS old counts as STALE, decided once', () => {
  // Same call the capacity TTL made: exactly at the limit is stale, so the
  // boundary has exactly one answer rather than depending on which surface asks.
  const exactly = new Date(2026, 9, 4 - FRESH_WINDOW_DAYS, 9, 0, 0)
  const justInside = new Date(2026, 9, 4 - FRESH_WINDOW_DAYS + 1, 9, 0, 0)
  assert.equal(isFresh(exactly, NOW), false)
  assert.equal(isFresh(justInside, NOW), true)
})

test('a null last_activity is never fresh', () => {
  // "never" is infinitely stale, not "moved today".
  assert.equal(isFresh(null, NOW), false)
  assert.equal(isFresh(undefined, NOW), false)
  assert.equal(isFresh('', NOW), false)
})

test('the day-boundary rule holds here too: 11pm yesterday is 1d, not today', () => {
  assert.equal(isFresh(new Date(2026, 9, 3, 23, 0, 0), NOW), true)
})

// --- the ring ----------------------------------------------------------------

test('zero active projects reads "No active projects", NOT 0%', () => {
  // 0/0 is undefined, not failure. Rendering 0% would state a problem that
  // does not exist.
  const reading = ringReading([{ ...project(), status: 'Paused' }], NOW)
  assert.equal(reading.state, 'none')
  assert.equal(reading.percent, null)
  assert.equal(reading.label, 'No active projects')
  assert.match(ringCaption(reading), /Add an active project/)
})

test('an empty registry also reads "No active projects"', () => {
  assert.equal(ringReading([], NOW).state, 'none')
  assert.equal(ringReading(null, NOW).state, 'none')
})

test('every active project fresh reads 100% and hides the shortfall', () => {
  const reading = ringReading([project(), project({ id: 'p2', name: 'B' })], NOW)
  assert.equal(reading.percent, 100)
  assert.equal(reading.fresh, 2)
  assert.deepEqual(reading.stale, [])
  assert.equal(reading.oldest, null)
  assert.match(ringCaption(reading), /Everything active has moved/)
})

test('no active project fresh reads 0% with every one in the shortfall', () => {
  const reading = ringReading([
    project({ id: 'p1', name: 'A', lastActivity: '2026-08-01' }),
    project({ id: 'p2', name: 'B', lastActivity: null }),
  ], NOW)
  assert.equal(reading.percent, 0)
  assert.equal(reading.fresh, 0)
  assert.equal(reading.stale.length, 2)
  assert.equal(ringCaption(reading), "2 haven't")
})

test('a null last_activity counts as stale in the ring', () => {
  const reading = ringReading([project(), project({ id: 'p2', name: 'B', lastActivity: null })], NOW)
  assert.equal(reading.percent, 50)
  assert.deepEqual(reading.stale.map((p) => p.name), ['B'])
})

test('paused and idea projects are excluded from the ring entirely', () => {
  // Staleness is not a defect for a parked project.
  const reading = ringReading([
    project(),
    project({ id: 'p2', name: 'Parked', status: 'Paused', lastActivity: '2026-01-01' }),
    project({ id: 'p3', name: 'Notion', status: 'Idea', lastActivity: null }),
  ], NOW)
  assert.equal(reading.total, 1)
  assert.equal(reading.percent, 100)
})

test('the shortfall is a control: oldest is the project it selects', () => {
  const reading = ringReading([
    project({ id: 'p1', name: 'Recent stale', lastActivity: '2026-09-15' }),
    project({ id: 'p2', name: 'Older stale', lastActivity: '2026-08-01' }),
  ], NOW)
  assert.equal(reading.oldest.name, 'Older stale')
})

test('never-moved sorts ahead of any dated project in the shortfall', () => {
  const reading = ringReading([
    project({ id: 'p1', name: 'Old', lastActivity: '2026-01-01' }),
    project({ id: 'p2', name: 'Never', lastActivity: null }),
  ], NOW)
  assert.equal(reading.oldest.name, 'Never')
})

test('stale ordering is deterministic when two projects share an age', () => {
  const rows = staleProjects([
    project({ id: 'p2', name: 'Zeta', lastActivity: '2026-08-01' }),
    project({ id: 'p1', name: 'Alpha', lastActivity: '2026-08-01' }),
  ], NOW)
  assert.deepEqual(rows.map((p) => p.name), ['Alpha', 'Zeta'])
})

// --- Overview ----------------------------------------------------------------

test('Overview in portfolio scope counts by status and carries the ring', () => {
  const payload = overviewPayload({
    projects: [project(), project({ id: 'p2', status: 'Paused' }), project({ id: 'p3', status: 'Idea' })],
    tasks: [{ id: 't1', status: 'Active' }, { id: 't2', status: 'Done' }],
    now: NOW,
  })
  assert.equal(payload.scope, 'portfolio')
  assert.equal(payload.counts.Active, 1)
  assert.equal(payload.counts.Paused, 1)
  assert.equal(payload.counts.Idea, 1)
  assert.equal(payload.openTasks, 1)
  assert.equal(payload.ring.state, 'reading')
})

test('Overview tolerates a status outside the known three rather than dropping it', () => {
  const payload = overviewPayload({ projects: [project({ status: 'Archived' })], now: NOW })
  assert.equal(payload.counts.Archived, 1)
})

test('Overview in project scope reports that project and its next action', () => {
  const payload = overviewPayload({
    projects: [project()],
    tasks: [{ id: 't1', projectId: 'p1', status: 'Active' }, { id: 't2', projectId: 'p1', status: 'Done' }, { id: 't3', projectId: 'other', status: 'Active' }],
    project: project(),
    now: NOW,
  })
  assert.equal(payload.scope, 'project')
  assert.equal(payload.name, 'System Horizon')
  assert.equal(payload.openTasks, 1)
  assert.equal(payload.signal, 90)
  assert.equal(payload.nextAction, 'Ship M12')
  assert.equal(payload.age, '1d')
})

test('Overview in project scope falls back to a sentence when nextAction is blank', () => {
  const payload = overviewPayload({ project: project({ nextAction: '' }), now: NOW })
  assert.equal(payload.nextAction, 'Choose the next honest move.')
})

// --- Mirrors -----------------------------------------------------------------

const HEALTH = [
  { id: 'r1', repoName: 'SystemHorizon', hasLocalMirror: true, uncommittedCount: 0, aheadCount: 0, behindCount: 12, localHeadAt: null, lastHandoffAt: null },
  { id: 'r2', repoName: 'sitl_vault', hasLocalMirror: true, uncommittedCount: 0, aheadCount: 0, behindCount: 0, localHeadAt: null, lastHandoffAt: null },
  { id: 'r3', repoName: 'wtff_vault', hasLocalMirror: true, uncommittedCount: 4, aheadCount: 2, behindCount: 0, localHeadAt: null, lastHandoffAt: null },
]

test('Mirrors in portfolio scope shows flagged repos worst first', () => {
  const payload = mirrorsPayload({ repoHealth: HEALTH, projects: [], now: NOW })
  // wtff_vault has 2 flags, SystemHorizon 1, sitl_vault 0 (excluded).
  assert.deepEqual(payload.rows.map((r) => r.repoName), ['wtff_vault', 'SystemHorizon'])
})

test('Mirrors with no flags at all says so rather than rendering blank', () => {
  const clean = [{ id: 'r2', repoName: 'sitl_vault', hasLocalMirror: true, uncommittedCount: 0, aheadCount: 0, behindCount: 0 }]
  const payload = mirrorsPayload({ repoHealth: clean, projects: [] })
  assert.deepEqual(payload.rows, [])
  assert.equal(payload.notice, 'Every tracked repo is clean.')
})

test('Mirrors reports repos claimed by no project', () => {
  const payload = mirrorsPayload({ repoHealth: HEALTH, projects: [project()] })
  assert.deepEqual(payload.unclaimed, ['sitl_vault', 'wtff_vault'])
})

test('Mirrors in project scope shows only that project\'s repos', () => {
  const payload = mirrorsPayload({ repoHealth: HEALTH, projects: [project()], project: project() })
  assert.deepEqual(payload.rows.map((r) => r.repoName), ['SystemHorizon'])
  assert.deepEqual(payload.unclaimed, [])
})

test('Mirrors in project scope with no repo linked renders the sentence', () => {
  const payload = mirrorsPayload({ repoHealth: HEALTH, project: project({ repoNames: null }) })
  assert.deepEqual(payload.rows, [])
  assert.equal(payload.notice, 'No repo linked, so handoffs are not shown.')
})

test('a linked repo the collector has never seen is named, not shown as clean', () => {
  // An empty list looks identical to "all clean", which would be a silent
  // fallback. The repo gets named instead.
  const payload = mirrorsPayload({ repoHealth: HEALTH, project: project({ repoNames: ['ghost_repo'] }) })
  assert.deepEqual(payload.rows, [])
  assert.match(payload.notice, /ghost_repo has no mirror data yet/)
})

// --- Upcoming ----------------------------------------------------------------

const EVENTS = [
  { id: 'e1', projectId: 'p1', title: 'Later', date: '2026-10-11', startTime: '10:00 AM' },
  { id: 'e2', projectId: 'p1', title: 'Earlier same day', date: '2026-10-11', startTime: '9:00 AM' },
  { id: 'e3', projectId: 'other', title: 'Other project', date: '2026-10-06', startTime: null },
  { id: 'e4', projectId: 'p1', title: 'Past', date: '2026-09-01', startTime: '10:00 AM' },
  { id: 'e5', projectId: 'p1', title: 'Beyond the window', date: '2026-12-01', startTime: '10:00 AM' },
]

test('Upcoming sorts chronologically, with 9:00 AM before 10:00 AM', () => {
  // This is the bug compareEvents exists to prevent; reusing it means Pulse
  // cannot regress it separately.
  const payload = upcomingPayload({ events: EVENTS, now: NOW })
  assert.deepEqual(payload.rows.map((e) => e.title), ['Other project', 'Earlier same day', 'Later'])
})

test('Upcoming excludes the past and anything beyond the window', () => {
  const payload = upcomingPayload({ events: EVENTS, now: NOW })
  assert.equal(payload.rows.some((e) => e.title === 'Past'), false)
  assert.equal(payload.rows.some((e) => e.title === 'Beyond the window'), false)
})

test('Upcoming in project scope filters on project_id', () => {
  const payload = upcomingPayload({ events: EVENTS, project: project(), now: NOW })
  assert.deepEqual(payload.rows.map((e) => e.title), ['Earlier same day', 'Later'])
})

test('Upcoming with no events at all says nothing is scheduled', () => {
  const payload = upcomingPayload({ events: [], now: NOW })
  assert.deepEqual(payload.rows, [])
  assert.match(payload.notice, new RegExp(`next ${UPCOMING_WINDOW_DAYS} days`))
})

test('Upcoming with ONLY past events says so, which is a different problem', () => {
  // "nothing scheduled" and "everything already happened" call for different
  // actions, so they get different sentences in both scopes.
  const past = [{ id: 'e', projectId: 'p1', title: 'Past', date: '2026-09-01', startTime: '10:00 AM' }]

  const portfolio = upcomingPayload({ events: past, now: NOW })
  assert.deepEqual(portfolio.rows, [])
  assert.equal(portfolio.notice, 'Every event on the calendar is in the past.')

  const scoped = upcomingPayload({ events: past, project: project(), now: NOW })
  assert.deepEqual(scoped.rows, [])
  assert.match(scoped.notice, /System Horizon has events, but all of them are in the past/)

  // And the genuinely-empty case stays distinct from both.
  assert.match(upcomingPayload({ events: [], now: NOW }).notice, /Nothing scheduled/)
})

test('Upcoming with an unparseable time still renders the event, sorted last that day', () => {
  // parseEventTime flags "10:AM" unparsed and sorts it last. Flag, never guess,
  // and never hide.
  const events = [
    { id: 'a', projectId: 'p1', title: 'Broken time', date: '2026-10-06', startTime: '10:AM' },
    { id: 'b', projectId: 'p1', title: 'Good time', date: '2026-10-06', startTime: '9:00 AM' },
  ]
  const payload = upcomingPayload({ events, now: NOW })
  assert.equal(payload.rows.length, 2)
  assert.deepEqual(payload.rows.map((e) => e.title), ['Good time', 'Broken time'])
})

test('an event exactly at the window edge is included', () => {
  const edge = { id: 'edge', projectId: 'p1', title: 'Edge', date: '2026-10-18', startTime: '10:00 AM' }
  assert.equal(upcomingPayload({ events: [edge], now: NOW }).rows.length, 1)
  const past = { id: 'past', projectId: 'p1', title: 'Past edge', date: '2026-10-19', startTime: '10:00 AM' }
  assert.equal(upcomingPayload({ events: [past], now: NOW }).rows.length, 0)
})

test('an event dated today is upcoming, not past', () => {
  const today = { id: 't', projectId: 'p1', title: 'Today', date: '2026-10-04', startTime: '10:00 AM' }
  assert.equal(upcomingPayload({ events: [today], now: NOW }).rows.length, 1)
})

// --- Stale -------------------------------------------------------------------

test('Stale in portfolio scope lists stale active projects, oldest first', () => {
  const payload = stalePayload({
    projects: [
      project({ id: 'p1', name: 'Fresh' }),
      project({ id: 'p2', name: 'Stale', lastActivity: '2026-09-01' }),
      project({ id: 'p3', name: 'Staler', lastActivity: '2026-08-01' }),
    ],
    now: NOW,
  })
  assert.deepEqual(payload.rows.map((p) => p.name), ['Staler', 'Stale'])
  assert.equal(payload.notice, '')
})

test('Stale with nothing stale confirms rather than rendering an empty list', () => {
  const payload = stalePayload({ projects: [project()], now: NOW })
  assert.deepEqual(payload.rows, [])
  assert.match(payload.notice, new RegExp(`${FRESH_WINDOW_DAYS} days`))
})

test('🛑 Stale in PROJECT scope returns the explanatory state, never a blank tab', () => {
  const payload = stalePayload({ project: project({ lastActivity: '2026-09-23' }), now: NOW })
  assert.equal(payload.scope, 'project')
  assert.deepEqual(payload.rows, [])
  assert.match(payload.notice, /Staleness is a portfolio view/)
  assert.match(payload.notice, /last moved 11 days ago/)
})

test('Stale in project scope handles today and never without reading "0d ago"', () => {
  assert.match(stalePayload({ project: project({ lastActivity: new Date(2026, 9, 4, 9) }), now: NOW }).notice, /last moved today/)
  assert.match(stalePayload({ project: project({ lastActivity: null }), now: NOW }).notice, /no recorded activity yet/)
})

// --- every tab answers in both scopes ----------------------------------------

test('every tab returns a usable payload in BOTH scopes', () => {
  const args = { projects: [project()], tasks: [], events: EVENTS, repoHealth: HEALTH, now: NOW }
  for (const scope of [null, project()]) {
    const payloads = [
      overviewPayload({ ...args, project: scope }),
      mirrorsPayload({ ...args, project: scope }),
      upcomingPayload({ ...args, project: scope }),
      stalePayload({ ...args, project: scope }),
    ]
    for (const payload of payloads) {
      assert.equal(typeof payload, 'object')
      assert.equal(payload === null, false)
    }
  }
})

test('every tab that returns no rows also returns a sentence (criterion 6)', () => {
  // The rule that keeps the pane honest: no blank tab anywhere.
  const empty = { projects: [], tasks: [], events: [], repoHealth: [], now: NOW }
  const scoped = project({ repoNames: null, lastActivity: null })
  const cases = [
    mirrorsPayload({ ...empty, project: scoped }),
    upcomingPayload({ ...empty, project: scoped }),
    stalePayload({ ...empty, project: scoped }),
    upcomingPayload(empty),
    stalePayload(empty),
  ]
  for (const payload of cases) {
    assert.equal(payload.rows.length, 0)
    assert.equal(payload.notice.length > 0, true, `empty tab had no sentence: ${JSON.stringify(payload)}`)
  }
})
