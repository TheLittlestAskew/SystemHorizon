import test from 'node:test'
import assert from 'node:assert/strict'
import { NO_PROJECT, isProjectChange, normalizeProjectSelection, taskProjectOptions } from './taskProject.js'

const PROJECTS = [
  { id: 'p1', name: 'System Horizon' },
  { id: 'p2', name: 'Swiftwatch' },
]

test('options always lead with No project so unassigning is reachable', () => {
  const options = taskProjectOptions(PROJECTS, null)
  assert.equal(options[0].value, NO_PROJECT)
  assert.equal(options[0].label, 'No project')
  assert.deepEqual(options.slice(1).map((o) => o.label), ['System Horizon', 'Swiftwatch'])
})

test('an unmatched project id gets its own visible option instead of reading as unassigned', () => {
  // Without this the <select> would fall back to "No project" and a task that IS
  // assigned would look unassigned -- a silent fallback, which section 4 forbids.
  const options = taskProjectOptions(PROJECTS, 'p-deleted')
  const unknown = options.find((o) => o.unknown)
  assert.ok(unknown, 'an unknown current id must surface as an option')
  assert.equal(unknown.value, 'p-deleted')
  assert.match(unknown.label, /Unknown project/)
  assert.equal(options.filter((o) => o.unknown).length, 1)
})

test('a current id that IS known adds no extra option', () => {
  assert.equal(taskProjectOptions(PROJECTS, 'p1').length, 3)
  assert.equal(taskProjectOptions(PROJECTS, 'p1').some((o) => o.unknown), false)
})

test('projects without an id are skipped rather than rendering a broken option', () => {
  const options = taskProjectOptions([{ name: 'no id here' }, ...PROJECTS], null)
  assert.equal(options.length, 3)
})

test('a project with no name still gets a usable label', () => {
  assert.equal(taskProjectOptions([{ id: 'p9' }], null)[1].label, '(unnamed project)')
})

test('missing or empty input still yields the No project option', () => {
  assert.deepEqual(taskProjectOptions().map((o) => o.value), [NO_PROJECT])
  assert.deepEqual(taskProjectOptions(null, null).map((o) => o.value), [NO_PROJECT])
})

test("the select's empty string becomes null, not an empty uuid", () => {
  assert.equal(normalizeProjectSelection(''), null)
  assert.equal(normalizeProjectSelection('   '), null)
  assert.equal(normalizeProjectSelection(undefined), null)
  assert.equal(normalizeProjectSelection('p1'), 'p1')
})

test('re-selecting the same project is not a change, so it spends no write and no stamp', () => {
  assert.equal(isProjectChange({ projectId: 'p1' }, 'p1'), false)
  assert.equal(isProjectChange({ projectId: null }, ''), false)
  assert.equal(isProjectChange({ projectId: undefined }, ''), false)
})

test('assigning, reassigning and unassigning all count as changes', () => {
  assert.equal(isProjectChange({ projectId: null }, 'p1'), true, 'assign')
  assert.equal(isProjectChange({ projectId: 'p1' }, 'p2'), true, 'reassign')
  assert.equal(isProjectChange({ projectId: 'p1' }, ''), true, 'unassign')
})

test('the four real tasks that caused this: all null, all a change once assigned', () => {
  const stuck = [{ projectId: null }, { projectId: null }, { projectId: null }, { projectId: null }]
  assert.equal(stuck.every((task) => isProjectChange(task, 'p1')), true)
})
