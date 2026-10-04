import test from 'node:test'
import assert from 'node:assert/strict'
import { AREA_ORDER, orderedAreas, groupByArea } from './areas.js'

// Caught live during M12's first render: Pulse grouped by Map insertion order,
// which followed the projects array's recency sort, so the left column read
// "Ops & Infra, Sidequests, Aftermath, Undercroft..." while the registry read
// "Ops & Infra, Aftermath, Undercroft, Sidequests...". Two views, one taxonomy,
// two different orders. These pin the shared definition.

const P = (name, area) => ({ id: name, name, area })

test('the locked area order is exactly the registry taxonomy', () => {
  assert.deepEqual(AREA_ORDER, ['Ops & Infra', 'Aftermath', 'Undercroft', 'Sidequests', 'Career', 'Learning'])
})

test('areas read in the locked order regardless of input order', () => {
  // Input deliberately in recency order, which is what broke it.
  const projects = [P('a', 'Sidequests'), P('b', 'Ops & Infra'), P('c', 'Learning'), P('d', 'Aftermath')]
  assert.deepEqual(groupByArea(projects).map(([area]) => area), ['Ops & Infra', 'Aftermath', 'Sidequests', 'Learning'])
})

test('an area outside the locked list is appended, never dropped', () => {
  const projects = [P('a', 'Unsorted'), P('b', 'Ops & Infra')]
  const areas = groupByArea(projects).map(([area]) => area)
  assert.deepEqual(areas, ['Ops & Infra', 'Unsorted'])
  assert.ok(areas.includes('Unsorted'), 'a freshly added project must still be reachable')
})

test('a project with no area at all lands in Unsorted rather than vanishing', () => {
  const grouped = groupByArea([{ id: 'x', name: 'x' }, { id: 'y', name: 'y', area: '' }])
  assert.deepEqual(grouped, [['Unsorted', [{ id: 'x', name: 'x' }, { id: 'y', name: 'y', area: '' }]]])
})

test('an empty area renders no heading', () => {
  const grouped = groupByArea([P('a', 'Career')])
  assert.deepEqual(grouped.map(([area]) => area), ['Career'])
})

test('input order is preserved WITHIN an area, so the caller\'s sort still decides', () => {
  const projects = [P('second', 'Career'), P('first', 'Career')]
  assert.deepEqual(groupByArea(projects)[0][1].map((p) => p.name), ['second', 'first'])
})

test('orderedAreas lists every locked area even when no project uses it', () => {
  // The accordion wants every section header; grouping drops the empty ones.
  assert.deepEqual(orderedAreas([P('a', 'Career')]), AREA_ORDER)
})

test('empty and malformed input do not throw', () => {
  assert.deepEqual(groupByArea([]), [])
  assert.deepEqual(groupByArea(null), [])
  assert.deepEqual(orderedAreas(null), AREA_ORDER)
})

test('every project survives grouping', () => {
  const projects = [P('a', 'Career'), P('b', 'Unsorted'), P('c', 'Ops & Infra'), P('d', 'Career')]
  const total = groupByArea(projects).reduce((sum, [, items]) => sum + items.length, 0)
  assert.equal(total, projects.length)
})
