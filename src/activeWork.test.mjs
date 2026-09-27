import test from 'node:test'
import assert from 'node:assert/strict'
import { ACTIVE_WORK_LIMIT, rankActiveWork } from './activeWork.js'

// The executable form of M6's acceptance in docs/NORTH_STAR.md: exactly three
// ranked projects with name, return point and health signal, ranked by recency
// of activity, with the tied-data case made explicit.

function proj(over = {}) {
  return { id: 'p1', name: 'Project', status: 'Active', health: 'Green', tone: 'cyan', signal: 50, nextAction: 'Do the thing', lastActivity: '2026-09-20T00:00:00Z', ...over }
}

test('ranks by recency of activity, most recent first', () => {
  const projects = [
    proj({ id: 'old', name: 'Old', lastActivity: '2026-09-01T00:00:00Z' }),
    proj({ id: 'new', name: 'New', lastActivity: '2026-09-27T00:00:00Z' }),
    proj({ id: 'mid', name: 'Mid', lastActivity: '2026-09-15T00:00:00Z' }),
  ]
  const { items, tiedOnActivity } = rankActiveWork({ projects })
  assert.deepEqual(items.map((i) => i.id), ['new', 'mid', 'old'])
  assert.equal(tiedOnActivity, false)
})

test('returns at most three, and counts what it held back', () => {
  const projects = Array.from({ length: 7 }, (_, i) =>
    proj({ id: `p${i}`, name: `P${i}`, lastActivity: `2026-09-${String(i + 10).padStart(2, '0')}T00:00:00Z` }))
  const { items, hidden, candidateCount } = rankActiveWork({ projects })
  assert.equal(items.length, ACTIVE_WORK_LIMIT)
  assert.equal(candidateCount, 7)
  assert.equal(hidden, 4)
})

test('only Active projects are candidates', () => {
  const projects = [
    proj({ id: 'active', status: 'Active' }),
    proj({ id: 'paused', status: 'Paused', lastActivity: '2026-09-27T00:00:00Z' }),
    proj({ id: 'idea', status: 'Idea', lastActivity: '2026-09-27T00:00:00Z' }),
  ]
  const { items, candidateCount } = rankActiveWork({ projects })
  assert.deepEqual(items.map((i) => i.id), ['active'])
  assert.equal(candidateCount, 1)
})

// The live state on 2026-09-27: one re-seed stamped every row identically.
test('identical activity timestamps are reported as tied, not passed off as ranked', () => {
  const stamp = '2026-09-26T21:04:29.672Z'
  const projects = [
    proj({ id: 'a', name: 'Alpha', signal: 40, lastActivity: stamp }),
    proj({ id: 'b', name: 'Bravo', signal: 90, lastActivity: stamp }),
    proj({ id: 'c', name: 'Charlie', signal: 70, lastActivity: stamp }),
  ]
  const { items, tiedOnActivity } = rankActiveWork({ projects })
  assert.equal(tiedOnActivity, true, 'the caller must be able to disclose that recency did no work')
  // Falls back to signal, so the order is at least meaningful and stable.
  assert.deepEqual(items.map((i) => i.id), ['b', 'c', 'a'])
})

test('a single candidate is not reported as tied', () => {
  const { tiedOnActivity } = rankActiveWork({ projects: [proj()] })
  assert.equal(tiedOnActivity, false)
})

test('no candidates yields an empty ranking, not a crash', () => {
  const empty = rankActiveWork({ projects: [] })
  assert.deepEqual(empty.items, [])
  assert.equal(empty.tiedOnActivity, false)
  assert.equal(empty.candidateCount, 0)
  assert.equal(empty.hidden, 0)
  assert.deepEqual(rankActiveWork().items, [])
})

test('projects with no recorded activity sort last', () => {
  const projects = [
    proj({ id: 'never', name: 'Never', lastActivity: null }),
    proj({ id: 'dated', name: 'Dated', lastActivity: '2026-09-01T00:00:00Z' }),
  ]
  const { items } = rankActiveWork({ projects })
  assert.deepEqual(items.map((i) => i.id), ['dated', 'never'])
})

test('all-null activity is tied, and falls back to signal', () => {
  const projects = [
    proj({ id: 'low', signal: 10, lastActivity: null }),
    proj({ id: 'high', signal: 95, lastActivity: null }),
  ]
  const { items, tiedOnActivity } = rankActiveWork({ projects })
  assert.equal(tiedOnActivity, true)
  assert.deepEqual(items.map((i) => i.id), ['high', 'low'])
})

test('every item carries the three things M6 requires', () => {
  const { items } = rankActiveWork({ projects: [proj({ nextAction: 'Ship M6' })] })
  const item = items[0]
  assert.equal(item.name, 'Project')
  assert.equal(item.returnPoint, 'Ship M6')
  assert.equal(item.health, 'Green')
  assert.equal(item.tone, 'cyan')
})

test('a missing next action falls back rather than rendering blank', () => {
  for (const nextAction of [null, undefined, '']) {
    const { items } = rankActiveWork({ projects: [proj({ nextAction })] })
    assert.equal(items[0].returnPoint, 'Choose the next honest move.')
  }
})

test('open task counts exclude Done and other projects', () => {
  const tasks = [
    { id: 't1', projectId: 'p1', status: 'Active' },
    { id: 't2', projectId: 'p1', status: 'Done' },
    { id: 't3', projectId: 'p1', status: 'Waiting' },
    { id: 't4', projectId: 'other', status: 'Active' },
    { id: 't5', projectId: null, status: 'Active' },
  ]
  const { items } = rankActiveWork({ projects: [proj({ id: 'p1' })], tasks })
  assert.equal(items[0].openTasks, 2)
})

test('missing tasks and missing signals do not break the ranking', () => {
  const projects = [proj({ id: 'a', signal: undefined }), proj({ id: 'b', signal: 30 })]
  const { items } = rankActiveWork({ projects })
  // Same timestamp, so signal decides; a missing signal sorts below a real one.
  assert.deepEqual(items.map((i) => i.id), ['b', 'a'])
  assert.equal(items[0].signal, 30)
  assert.equal(items[1].signal, null)
  assert.equal(items[0].openTasks, 0)
})

test('ordering does not depend on input order', () => {
  const projects = [
    proj({ id: 'a', name: 'Same', signal: 50 }),
    proj({ id: 'b', name: 'Same', signal: 50 }),
  ]
  const forward = rankActiveWork({ projects }).items.map((i) => i.id)
  const reversed = rankActiveWork({ projects: [...projects].reverse() }).items.map((i) => i.id)
  assert.deepEqual(forward, reversed)
})
