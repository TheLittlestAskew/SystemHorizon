import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SYNC, syncStatus } from './syncStatus.js'

test('reports stable only when nothing has failed', () => {
  const status = syncStatus({ databaseError: '', sourceErrors: [] })
  assert.equal(status.level, SYNC.stable)
  assert.equal(status.label, 'Sync stable')
  assert.equal(status.tone, 'cyan')
  assert.equal(syncStatus().label, 'Sync stable', 'no argument is the same as clear')
})

test('the app database outranks the secondary sources', () => {
  // Not softened into "3 sources down": if the app cannot read its own data,
  // it is not partially degraded.
  const status = syncStatus({ databaseError: 'connection refused', sourceErrors: ['a', 'b', 'c'] })
  assert.equal(status.level, SYNC.failed)
  assert.equal(status.label, 'Sync failed')
  assert.equal(status.tone, 'coral')
})

test('a failed secondary source is degraded, not stable', () => {
  const status = syncStatus({ sourceErrors: ['repo health unavailable'] })
  assert.equal(status.level, SYNC.degraded)
  assert.notEqual(status.label, 'Sync stable')
  assert.equal(status.label, 'One source down')
  assert.equal(status.tone, 'peach')
})

test('counts multiple downed sources and pluralises', () => {
  assert.equal(syncStatus({ sourceErrors: ['a', 'b'] }).label, '2 sources down')
  assert.equal(syncStatus({ sourceErrors: ['a', 'b', 'c'] }).label, '3 sources down')
})

// Empty strings are the IDLE state of these error slots, not failures: App.jsx
// initialises all three to ''. Treating '' as an error would make the footer
// report a permanent outage on a perfectly healthy load.
test('empty-string error slots are not failures', () => {
  const status = syncStatus({ databaseError: '', sourceErrors: ['', '', ''] })
  assert.equal(status.level, SYNC.stable)
  assert.equal(status.label, 'Sync stable')
})

test('mixed empty and real errors count only the real ones', () => {
  assert.equal(syncStatus({ sourceErrors: ['', 'boom', ''] }).label, 'One source down')
})

// The regression guard: the bug was that no input could produce a bad state.
test('some input produces each of the three levels', () => {
  const levels = new Set([
    syncStatus({}).level,
    syncStatus({ sourceErrors: ['x'] }).level,
    syncStatus({ databaseError: 'x' }).level,
  ])
  assert.equal(levels.size, 3, 'every level must be reachable, or the indicator is decoration')
})
