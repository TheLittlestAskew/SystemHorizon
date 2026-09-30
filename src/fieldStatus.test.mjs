import test from 'node:test'
import assert from 'node:assert/strict'
import { buildFieldStatus } from './fieldStatus.js'
import { GDOL_WEEKLY_CONTACTS, gdolWeekEnding } from './needsAttention.js'

// The executable form of M7's acceptance in docs/NORTH_STAR.md section 10 and
// the slot list in section 3: exactly Horizon | Projects | Career | System, in
// that order, with no Side Quests or Calendar slot.

const CLOCK = new Date('2026-09-27T12:00:00')
const WEEK = gdolWeekEnding(CLOCK)

const slotsById = (result) => Object.fromEntries(result.map((slot) => [slot.id, slot]))

test('exactly four slots, in the locked order', () => {
  const result = buildFieldStatus({ clock: CLOCK })
  assert.deepEqual(result.map((slot) => slot.id), ['horizon', 'projects', 'career', 'system'])
  assert.deepEqual(result.map((slot) => slot.label), ['Horizon', 'Projects', 'Career', 'System'])
})

test('no Side Quests or Calendar slot exists', () => {
  const ids = buildFieldStatus({ clock: CLOCK }).map((slot) => slot.id)
  for (const banned of ['sidequests', 'side-quests', 'calendar', 'swift', 'travel', 'warroom']) {
    assert.equal(ids.includes(banned), false, `${banned} must not have a slot`)
  }
})

test('every slot links to a real view and uses a reserved tone', () => {
  const result = buildFieldStatus({ clock: CLOCK })
  const views = ['Horizon', 'Projects', 'Career', 'Mirrors']
  for (const slot of result) {
    assert.ok(views.includes(slot.view), `${slot.id} links to ${slot.view}`)
    assert.ok(['cyan', 'peach', 'coral'].includes(slot.tone), `${slot.id} tone ${slot.tone}`)
    assert.ok(slot.value && slot.detail, `${slot.id} must carry a value and a detail`)
  }
})

test('Horizon reports whether a Now is set', () => {
  const tasks = [{ id: 't1', status: 'Active', name: 'Ship it' }]
  const unset = slotsById(buildFieldStatus({ clock: CLOCK, tasks })).horizon
  assert.equal(unset.value, 'No Now set')
  assert.equal(unset.tone, 'peach')

  const set = slotsById(buildFieldStatus({ clock: CLOCK, tasks, now: { taskId: 't1', note: '', setAt: null } })).horizon
  assert.equal(set.value, 'Now set')
  assert.equal(set.tone, 'cyan')
})

test('a completed Now is awareness, not stable: it needs replacing', () => {
  const tasks = [{ id: 't1', status: 'Done', name: 'Done thing' }]
  const slot = slotsById(buildFieldStatus({ clock: CLOCK, tasks, now: { taskId: 't1', note: '', setAt: null } })).horizon
  assert.equal(slot.value, 'Now complete')
  assert.equal(slot.tone, 'peach')
})

test('Horizon counts unrouted captures and ignores routed ones', () => {
  const captures = [
    { id: 'c1', routedKind: null },
    { id: 'c2', routedKind: 'task' },
    { id: 'c3', routedKind: 'dismissed' },
    { id: 'c4', routedKind: null },
  ]
  assert.equal(slotsById(buildFieldStatus({ clock: CLOCK, captures })).horizon.detail, '2 captures to route')
  assert.equal(slotsById(buildFieldStatus({ clock: CLOCK })).horizon.detail, 'Inbox clear')
  assert.equal(slotsById(buildFieldStatus({ clock: CLOCK, captures: [{ id: 'c1', routedKind: null }] })).horizon.detail, '1 capture to route')
})

test('Projects counts only Active, and flags only Yellow and Red', () => {
  const projects = [
    { id: 'a', status: 'Active', health: 'Green' },
    { id: 'b', status: 'Active', health: 'Yellow' },
    { id: 'c', status: 'Active', health: 'Red' },
    { id: 'd', status: 'Paused', health: 'Red' },
    { id: 'e', status: 'Idea', health: 'Idle' },
  ]
  const slot = slotsById(buildFieldStatus({ clock: CLOCK, projects })).projects
  assert.equal(slot.value, '3 active')
  assert.equal(slot.detail, '2 need attention')
  assert.equal(slot.tone, 'peach')
})

test('active projects with no Yellow or Red read as stable', () => {
  const projects = [{ id: 'a', status: 'Active', health: 'Green' }, { id: 'b', status: 'Active', health: 'Idle' }]
  const slot = slotsById(buildFieldStatus({ clock: CLOCK, projects })).projects
  assert.equal(slot.detail, 'None need attention')
  assert.equal(slot.tone, 'cyan')
})

test('Career counts this week GA DOL contacts against the requirement', () => {
  const jobs = [
    { id: 'j1', ws_activity_date: WEEK },
    { id: 'j2', ws_activity_date: WEEK },
    { id: 'j3', ws_activity_date: '2026-01-01' },
  ]
  const short = slotsById(buildFieldStatus({ clock: CLOCK, jobs })).career
  assert.equal(short.value, `2/${GDOL_WEEKLY_CONTACTS} contacts`)
  assert.equal(short.detail, '1 more this week')
  assert.equal(short.tone, 'peach')
})

test('a met Career requirement reads as stable', () => {
  const jobs = Array.from({ length: GDOL_WEEKLY_CONTACTS }, (_, i) => ({ id: `j${i}`, ws_activity_date: WEEK }))
  const slot = slotsById(buildFieldStatus({ clock: CLOCK, jobs })).career
  assert.equal(slot.detail, 'Week requirement met')
  assert.equal(slot.tone, 'cyan')
})

test('a failing job pipeline is coral and says so, rather than reading as zero', () => {
  const slot = slotsById(buildFieldStatus({ clock: CLOCK, jobError: 'unreachable' })).career
  assert.equal(slot.value, 'Unavailable')
  assert.equal(slot.tone, 'coral')
})

test('System counts flagged repos', () => {
  const repoHealth = [
    { id: 'r1', repoName: 'clean', hasLocalMirror: true, uncommittedCount: 0, aheadCount: 0, behindCount: 0 },
    { id: 'r2', repoName: 'dirty', hasLocalMirror: true, uncommittedCount: 4, aheadCount: 0, behindCount: 0 },
    { id: 'r3', repoName: 'behind', hasLocalMirror: true, uncommittedCount: 0, aheadCount: 0, behindCount: 12 },
  ]
  const slot = slotsById(buildFieldStatus({ clock: CLOCK, repoHealth })).system
  assert.equal(slot.value, '2 flagged')
  assert.equal(slot.detail, '3 repos tracked')
  assert.equal(slot.tone, 'peach')
})

test('all-clean repos read as stable', () => {
  const repoHealth = [{ id: 'r1', repoName: 'clean', hasLocalMirror: true, uncommittedCount: 0, aheadCount: 0, behindCount: 0 }]
  const slot = slotsById(buildFieldStatus({ clock: CLOCK, repoHealth })).system
  assert.equal(slot.value, 'All clean')
  assert.equal(slot.detail, '1 repo tracked')
  assert.equal(slot.tone, 'cyan')
})

test('no repo data is distinguished from all clean', () => {
  const slot = slotsById(buildFieldStatus({ clock: CLOCK, repoHealth: [] })).system
  assert.equal(slot.value, 'No data')
  assert.equal(slot.tone, 'peach')
})

test('a failing repo source is coral', () => {
  const slot = slotsById(buildFieldStatus({ clock: CLOCK, repoHealthError: 'boom' })).system
  assert.equal(slot.value, 'Unavailable')
  assert.equal(slot.tone, 'coral')
})

test('called with nothing at all, it still returns four usable slots', () => {
  const result = buildFieldStatus()
  assert.equal(result.length, 4)
  for (const slot of result) {
    assert.ok(slot.value && slot.detail && slot.view && slot.tone)
  }
})

// M11 criterion 2b: signed out, Home must not claim a contact count. Without the
// guard this slot read "0/3 contacts · 3 more this week", inventing a statement
// about her GDOL week from an empty array.
test('signed out, the career slot asks for a sign-in instead of claiming 0/3 contacts', () => {
  const slot = slotsById(buildFieldStatus({ clock: CLOCK, jobs: [], jobSignedIn: false })).career
  assert.equal(slot.value, 'Sign in')
  assert.equal(slot.detail, 'Job pipeline not connected')
  assert.equal(slot.tone, 'peach', 'not coral: this is an action, not a failure')
  assert.ok(!/\d\/\d/.test(slot.value), 'no contact count may appear while signed out')
})

test('a real error still outranks being signed out in the career slot', () => {
  const slot = slotsById(buildFieldStatus({ clock: CLOCK, jobError: 'unreachable', jobSignedIn: false })).career
  assert.equal(slot.value, 'Unavailable')
  assert.equal(slot.tone, 'coral')
})

test('signed in is still the default, so existing callers keep their counts', () => {
  const slot = slotsById(buildFieldStatus({ clock: CLOCK, jobs: [] })).career
  assert.match(slot.value, /\d\/\d contacts/)
})
