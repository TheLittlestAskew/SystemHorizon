import test from 'node:test'
import assert from 'node:assert/strict'
import { ARCHIVE_REPOS, archiveDateOf, groupArchiveByDate, parseHandoffEntries } from './archive.js'

const SAMPLE = `# HANDOFF

## Log

### 2026-09-27 13:53 ET · Claude Code
- **Changed:** M7 shipped, the Home field-status strip.
- **Commit:** \`1ac7d17\`
- **Next:** M9

### 2026-09-27 09:10 ET · Codex
- **Changed:** Rotated the handoff log.
- **Commit:** \`0238f2a\`

### 2026-09-26 20:02 ET · Claude desktop
- **Changed:** Re-seeded the project registry.
`

test('parseHandoffEntries pulls timestamp, tool label, and the Changed line', () => {
  const entries = parseHandoffEntries(SAMPLE, 'SystemHorizon')
  assert.equal(entries.length, 3)
  assert.deepEqual(entries[0], {
    repo: 'SystemHorizon',
    timestamp: '2026-09-27 13:53 ET',
    source: 'Claude Code',
    summary: 'M7 shipped, the Home field-status strip.',
  })
  assert.equal(entries[2].source, 'Claude desktop')
})

test('parseHandoffEntries returns nothing for a file with no entries', () => {
  assert.deepEqual(parseHandoffEntries('# HANDOFF\n\nNo log yet.\n', 'empty_repo'), [])
})

test('parseHandoffEntries keeps a malformed header instead of dropping the entry', () => {
  const [entry] = parseHandoffEntries('x\n### not a timestamp\n- **Changed:** still real work.\n', 'odd_repo')
  assert.equal(entry.timestamp, 'not a timestamp')
  assert.equal(entry.source, '')
  assert.equal(entry.summary, 'still real work.')
})

test('parseHandoffEntries caps a runaway summary at 240 characters', () => {
  const long = 'x'.repeat(500)
  const [entry] = parseHandoffEntries(`y\n### 2026-09-27 10:00 ET · Codex\n- **Changed:** ${long}\n`, 'r')
  assert.equal(entry.summary.length, 240)
})

test('archiveDateOf takes the date off the front of a handoff timestamp', () => {
  assert.equal(archiveDateOf('2026-09-27 13:53 ET'), '2026-09-27')
  assert.equal(archiveDateOf('2026-09-27'), '2026-09-27')
})

test('archiveDateOf files anything undated rather than dropping it', () => {
  assert.equal(archiveDateOf('not a timestamp'), 'Undated')
  assert.equal(archiveDateOf(''), 'Undated')
  assert.equal(archiveDateOf(null), 'Undated')
  assert.equal(archiveDateOf(undefined), 'Undated')
})

test('groupArchiveByDate collapses same-day entries across repos into one group', () => {
  const groups = groupArchiveByDate([
    { repo: 'SystemHorizon', timestamp: '2026-09-27 13:53 ET' },
    { repo: 'taylorritchie', timestamp: '2026-09-27 09:10 ET' },
    { repo: 'sitl_vault', timestamp: '2026-09-26 20:02 ET' },
  ])
  assert.deepEqual(groups.map((group) => [group.date, group.items.length]), [['2026-09-27', 2], ['2026-09-26', 1]])
})

test('groupArchiveByDate preserves the order it was given and never re-sorts', () => {
  const groups = groupArchiveByDate([
    { timestamp: '2026-09-26 10:00 ET' },
    { timestamp: '2026-09-27 10:00 ET' },
  ])
  assert.deepEqual(groups.map((group) => group.date), ['2026-09-26', '2026-09-27'])
})

test('groupArchiveByDate reopens a date that appears again after another date', () => {
  const groups = groupArchiveByDate([
    { timestamp: '2026-09-27 13:00 ET' },
    { timestamp: '2026-09-26 13:00 ET' },
    { timestamp: '2026-09-27 08:00 ET' },
  ])
  assert.equal(groups.length, 3, 'a non-contiguous date is a second group, not a silent merge')
})

test('groupArchiveByDate handles no entries at all', () => {
  assert.deepEqual(groupArchiveByDate([]), [])
})

test('ARCHIVE_REPOS is a unique list, so failure rows cannot collide on repo name', () => {
  assert.equal(new Set(ARCHIVE_REPOS).size, ARCHIVE_REPOS.length)
  assert.equal(ARCHIVE_REPOS.length > 0, true)
})
