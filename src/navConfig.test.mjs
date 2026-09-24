import test from 'node:test'
import assert from 'node:assert/strict'
import { navGroups, navUtilityItems, defaultOpenNavGroups } from './navConfig.js'

// The information architecture locked in docs/NORTH_STAR.md section 3. These
// tests are the executable form of that section's acceptance criteria, so a
// future nav edit that drifts from the locked IA fails the gate instead of
// shipping.

// Every view App.jsx can route to from the sidebar. ProjectDetail is reached by
// clicking a project inside Projects, not from the nav, so it is not listed.
const EVERY_VIEW = ['Horizon', 'Projects', 'Flow', 'Calendar', 'Career', 'Mirrors', 'Archive', 'Swift', 'Travel', 'War Room']

function readingOrder() {
  return [...navUtilityItems, ...navGroups.flatMap((group) => group.items)]
}

test('Calendar is the pinned utility and the only one', () => {
  assert.deepEqual(navUtilityItems, ['Calendar'])
})

test('area group order is exactly Horizon, Projects, Career, System, Side Quests', () => {
  assert.deepEqual(navGroups.map((group) => group.label), ['Horizon', 'Projects', 'Career', 'System', 'Side Quests'])
})

test('group contents match the locked IA', () => {
  const byLabel = Object.fromEntries(navGroups.map((group) => [group.label, group.items]))
  assert.deepEqual(byLabel.Horizon, ['Horizon'])
  assert.deepEqual(byLabel.Projects, ['Projects', 'Flow'])
  assert.deepEqual(byLabel.Career, ['Career'])
  assert.deepEqual(byLabel.System, ['Mirrors', 'Archive'])
  assert.deepEqual(byLabel['Side Quests'], ['Swift', 'War Room', 'Travel'])
})

test('every view is reachable from the nav exactly once', () => {
  const order = readingOrder()
  assert.deepEqual([...order].sort(), [...EVERY_VIEW].sort())
  assert.equal(new Set(order).size, order.length, 'a view is listed in more than one nav slot')
})

test('Calendar reads first in the nav, above Horizon', () => {
  const order = readingOrder()
  assert.equal(order[0], 'Calendar')
  assert.equal(order[1], 'Horizon')
})

test('retired labels are gone', () => {
  const labels = navGroups.map((group) => group.label)
  for (const retired of ['Core', 'Life', 'Life & Watch']) assert.ok(!labels.includes(retired), `${retired} still present`)
})

test('single-view areas are direct links, multi-view areas are groups', () => {
  for (const group of navGroups) {
    if (group.items.length === 1) assert.equal(group.direct, true, `${group.label} has one view and must be a direct link`)
    else assert.notEqual(group.direct, true, `${group.label} has ${group.items.length} views and must be a group`)
  }
})

test('Side Quests is the only group collapsed by default, and direct links are never in the open set', () => {
  const open = defaultOpenNavGroups()
  assert.ok(!open.has('sidequests'), 'Side Quests must start collapsed')
  assert.deepEqual([...open].sort(), ['projects', 'system'])
  for (const group of navGroups.filter((candidate) => candidate.direct)) {
    assert.ok(!open.has(group.id), `${group.label} is a direct link and needs no open state`)
  }
})

test('defaultOpenNavGroups returns a fresh Set each call, so state cannot leak between mounts', () => {
  const first = defaultOpenNavGroups()
  first.clear()
  assert.equal(defaultOpenNavGroups().size, 2)
})

test('exactly one group is marked the side tier', () => {
  assert.deepEqual(navGroups.filter((group) => group.tier === 'side').map((group) => group.id), ['sidequests'])
})
