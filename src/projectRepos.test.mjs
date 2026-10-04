import test from 'node:test'
import assert from 'node:assert/strict'
import {
  projectRepoStatus, projectRepoNotice, repoHealthForProject,
  unclaimedRepos, handoffReposForProject, projectForRepo, duplicateRepoClaims,
} from './projectRepos.js'
import { ARCHIVE_REPOS } from './archive.js'

// SystemHorizon and pacts_power_vault are in ARCHIVE_REPOS; 'aftermath-atlas' is not.
// (sitl_vault was removed 2026-10-04: renamed to skitl_vault, which is private.)
const SH = { id: 'p1', name: 'System Horizon', repoNames: ['SystemHorizon'] }
const MULTI = { id: 'p2', name: 'Septentrion', repoNames: ['SystemHorizon', 'pacts_power_vault'] }
const UNMONITORED = { id: 'p3', name: 'Aftermath Meridian', repoNames: ['aftermath-atlas'] }
const MIXED = { id: 'p4', name: 'Mixed', repoNames: ['SystemHorizon', 'aftermath-atlas'] }
const NO_REPO = { id: 'p5', name: 'Learn JavaScript', repoNames: null }

test('the fixtures match the real ARCHIVE_REPOS set', () => {
  // If ARCHIVE_REPOS changes, these fixtures must still mean what they say.
  assert.equal(ARCHIVE_REPOS.includes('SystemHorizon'), true)
  assert.equal(ARCHIVE_REPOS.includes('pacts_power_vault'), true)
  // The repo this list dropped on 2026-10-04 must stay dropped.
  assert.equal(ARCHIVE_REPOS.includes('sitl_vault'), false)
  assert.equal(ARCHIVE_REPOS.includes('aftermath-atlas'), false)
})

test('one repo resolves as linked and monitored', () => {
  const status = projectRepoStatus(SH)
  assert.deepEqual(status, { linked: ['SystemHorizon'], monitored: ['SystemHorizon'], unmonitored: [], hasRepo: true })
  assert.equal(projectRepoNotice(SH), '')
})

test('several repos all resolve', () => {
  const status = projectRepoStatus(MULTI)
  assert.deepEqual(status.linked, ['SystemHorizon', 'pacts_power_vault'])
  assert.deepEqual(status.monitored, ['SystemHorizon', 'pacts_power_vault'])
  assert.deepEqual(handoffReposForProject(MULTI), ['SystemHorizon', 'pacts_power_vault'])
})

test('no repo is a real state with its own sentence, not an empty tab', () => {
  const status = projectRepoStatus(NO_REPO)
  assert.deepEqual(status, { linked: [], monitored: [], unmonitored: [], hasRepo: false })
  // Criterion 6: every not-applicable state renders a sentence saying why.
  assert.equal(projectRepoNotice(NO_REPO), 'No repo linked, so handoffs are not shown.')
  assert.deepEqual(handoffReposForProject(NO_REPO), [])
})

test('a missing, undefined or non-array repoNames all read as "no repo"', () => {
  // The column is nullable and existing rows have never been seeded, so null is
  // the live state for all 16 projects until Re-sync registry runs.
  for (const project of [{ name: 'x' }, { name: 'x', repoNames: undefined }, { name: 'x', repoNames: 'SystemHorizon' }]) {
    assert.equal(projectRepoStatus(project).hasRepo, false)
    assert.equal(projectRepoNotice(project), 'No repo linked, so handoffs are not shown.')
  }
})

test('blank entries in the array are dropped rather than rendered as empty chips', () => {
  const project = { name: 'x', repoNames: ['SystemHorizon', '', '   ', null] }
  assert.deepEqual(projectRepoStatus(project).linked, ['SystemHorizon'])
})

test('a repo outside ARCHIVE_REPOS is reported as linked but not monitored', () => {
  const status = projectRepoStatus(UNMONITORED)
  assert.deepEqual(status.monitored, [])
  assert.deepEqual(status.unmonitored, ['aftermath-atlas'])
  assert.equal(status.hasRepo, true)
  // Naming it is the difference between "nothing here" and "here is why".
  const notice = projectRepoNotice(UNMONITORED)
  assert.match(notice, /aftermath-atlas/)
  assert.match(notice, /not monitored/)
})

test('a mix of monitored and unmonitored repos names both', () => {
  const notice = projectRepoNotice(MIXED)
  assert.match(notice, /Showing handoffs for SystemHorizon/)
  assert.match(notice, /aftermath-atlas is linked but not monitored/)
  assert.deepEqual(handoffReposForProject(MIXED), ['SystemHorizon'])
})

test('the notice pluralises so it never reads "are not monitored" for one repo', () => {
  assert.equal(projectRepoNotice({ name: 'x', repoNames: ['a'] }), 'Linked to a, which is not monitored for handoffs.')
  assert.equal(projectRepoNotice({ name: 'x', repoNames: ['a', 'b'] }), 'Linked to a, b, which are not monitored for handoffs.')
  // And on the mixed path, where the clause is a separate sentence.
  assert.match(projectRepoNotice(MIXED), /aftermath-atlas is linked but not monitored/)
  assert.match(projectRepoNotice({ name: 'x', repoNames: ['SystemHorizon', 'a', 'b'] }), /a, b are linked but not monitored/)
})

// --- repo health -------------------------------------------------------------

const HEALTH = [
  { repoName: 'SystemHorizon', flags: ['Unbanked handoff'] },
  { repoName: 'pacts_power_vault', flags: [] },
  { repoName: 'wtff_vault', flags: ['4 uncommitted changes'] },
]

test('portfolio scope returns every repo-health row', () => {
  assert.equal(repoHealthForProject(HEALTH, null).length, 3)
})

test('project scope returns only that project\'s repos', () => {
  assert.deepEqual(repoHealthForProject(HEALTH, SH).map((r) => r.repoName), ['SystemHorizon'])
  assert.deepEqual(repoHealthForProject(HEALTH, MULTI).map((r) => r.repoName), ['SystemHorizon', 'pacts_power_vault'])
})

test('a project with no repo gets an empty list, which the notice explains', () => {
  assert.deepEqual(repoHealthForProject(HEALTH, NO_REPO), [])
  assert.equal(projectRepoNotice(NO_REPO), 'No repo linked, so handoffs are not shown.')
})

test('a repo in horizon_repo_health but in no project is never dropped', () => {
  // wtff_vault is flagged with 4 uncommitted changes and belongs to no project.
  // Dropping it would hide a real problem.
  assert.deepEqual(unclaimedRepos(HEALTH, [SH, MULTI]), ['wtff_vault'])
})

test('with no projects at all, every repo is unclaimed rather than none', () => {
  assert.deepEqual(unclaimedRepos(HEALTH, []), ['SystemHorizon', 'pacts_power_vault', 'wtff_vault'])
})

// --- reverse lookup ----------------------------------------------------------

test('a repo resolves back to its owning project', () => {
  assert.equal(projectForRepo([SH, UNMONITORED], 'SystemHorizon')?.name, 'System Horizon')
  assert.equal(projectForRepo([SH, UNMONITORED], 'aftermath-atlas')?.name, 'Aftermath Meridian')
})

test('an unknown repo id returns null rather than throwing', () => {
  assert.equal(projectForRepo([SH], 'nope'), null)
  assert.equal(projectForRepo([SH], null), null)
  assert.equal(projectForRepo([], 'SystemHorizon'), null)
  assert.equal(projectForRepo(null, 'SystemHorizon'), null)
})

test('two projects claiming one repo is reported, not silently resolved', () => {
  // First match wins so the entry renders once, but the registry mistake is
  // surfaced rather than left to make a project label look arbitrary.
  const dupes = duplicateRepoClaims([SH, MULTI])
  assert.deepEqual(dupes, [{ repo: 'SystemHorizon', owners: ['System Horizon', 'Septentrion'] }])
  assert.equal(projectForRepo([SH, MULTI], 'SystemHorizon')?.name, 'System Horizon')
})

test('no duplicates is an empty list, not null', () => {
  assert.deepEqual(duplicateRepoClaims([SH, UNMONITORED]), [])
  assert.deepEqual(duplicateRepoClaims([]), [])
})
