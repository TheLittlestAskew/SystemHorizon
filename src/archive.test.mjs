import test from 'node:test'
import assert from 'node:assert/strict'
import { ARCHIVE_REPOS, ARCHIVE_SORT_KEYS, HANDOFF_TOOLS, filterArchive, parseHandoffEntries, sortArchive } from './archive.js'

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
    id: 'SystemHorizon::0',
    repo: 'SystemHorizon',
    timestamp: '2026-09-27 13:53 ET',
    source: 'Claude Code',
    detail: '',
    summary: 'M7 shipped, the Home field-status strip.',
  })
  assert.deepEqual(entries.map((e) => e.id), ['SystemHorizon::0', 'SystemHorizon::1', 'SystemHorizon::2'], 'ids are unique and positional')
  assert.equal(entries[2].source, 'Claude desktop')
})

test('parseHandoffEntries returns nothing for a file with no entries', () => {
  assert.deepEqual(parseHandoffEntries('# HANDOFF\n\nNo log yet.\n', 'empty_repo'), [])
})

test('parseHandoffEntries keeps a malformed header instead of dropping the entry', () => {
  const [entry] = parseHandoffEntries('x\n### not a timestamp\n- **Changed:** still real work.\n', 'odd_repo')
  assert.equal(entry.timestamp, '', 'no leading date means no timestamp, so it sorts last rather than first')
  assert.equal(entry.source, '')
  assert.equal(entry.summary, 'still real work.')
})

test('parseHandoffEntries caps a runaway summary at 240 characters', () => {
  const long = 'x'.repeat(500)
  const [entry] = parseHandoffEntries(`y\n### 2026-09-27 10:00 ET · Codex\n- **Changed:** ${long}\n`, 'r')
  assert.equal(entry.summary.length, 240)
})







test('ARCHIVE_REPOS is a unique list, so failure rows cannot collide on repo name', () => {
  assert.equal(new Set(ARCHIVE_REPOS).size, ARCHIVE_REPOS.length)
  assert.equal(ARCHIVE_REPOS.length > 0, true)
})

// 🛑 Repos that are PRIVATE or RENAMED can never be fetched here, because the
// request is an anonymous GET against raw.githubusercontent.com and this repo
// is public, so no token can ship with it to authenticate one.
//
// `sitl_vault` sat in this list failing on every single load. It had TWO
// independent reasons, which is what made it worth pinning: the repo was
// renamed to `skitl_vault`, AND `skitl_vault` is private. Fixing only the name
// looks like a fix and still 404s.
//
// A permanently-failing repo also destroys the value of the failure notice:
// if one repo always errors, the banner is wallpaper and a NEW outage goes
// unnoticed. Keeping this list fetchable is what keeps that signal honest.
test('🛑 no known-unfetchable repo is in ARCHIVE_REPOS', () => {
  const unfetchable = {
    sitl_vault: 'renamed to skitl_vault on 2026-10-02, and skitl_vault is private',
    skitl_vault: 'private; raw.githubusercontent.com serves public repos only',
    septentrion: 'private',
    'claude-artifacts': 'private',
    'aftermath-atlas': 'private',
    'aftermath-admin': 'private',
    'creative-writing': 'private',
    obsidian_vault: 'private',
    Dimension20: 'private',
    Dimension_20: 'private',
  }
  const offenders = ARCHIVE_REPOS.filter((repo) => unfetchable[repo])
    .map((repo) => `${repo} (${unfetchable[repo]})`)
  assert.deepEqual(offenders, [],
    'a private or renamed repo 404s on every load and turns the failure notice into wallpaper')
})

test('the public repo list still holds the five that actually resolve', () => {
  // Confirmed against the live repo list on 2026-10-04: these five are public
  // and each returned 200 for HANDOFF.md on main.
  assert.deepEqual([...ARCHIVE_REPOS].sort(), [
    'SystemHorizon', 'ashfall_vault', 'pacts_power_vault', 'rectrixcaedere', 'taylorritchie',
  ])
})

// --- sorting -------------------------------------------------------------

const ROWS = [
  { id: 'a::0', repo: 'taylorritchie', timestamp: '2026-09-27 09:10 ET', source: 'Codex', summary: 'Rotated the log.' },
  { id: 'b::0', repo: 'SystemHorizon', timestamp: '2026-09-27 13:53 ET', source: 'Claude Code', summary: 'Shipped the field-status strip.' },
  { id: 'c::0', repo: 'sitl_vault', timestamp: '2026-09-26 20:02 ET', source: 'Claude desktop', summary: 'Re-seeded the registry.' },
]

test('sortArchive defaults to newest first', () => {
  assert.deepEqual(sortArchive(ROWS, 'timestamp').map((r) => r.id), ['b::0', 'a::0', 'c::0'])
})

test('sortArchive reverses on asc', () => {
  assert.deepEqual(sortArchive(ROWS, 'timestamp', 'asc').map((r) => r.id), ['c::0', 'a::0', 'b::0'])
})

test('sortArchive sorts by repo and by tool', () => {
  assert.deepEqual(sortArchive(ROWS, 'repo', 'asc').map((r) => r.repo), ['SystemHorizon', 'sitl_vault', 'taylorritchie'])
  assert.deepEqual(sortArchive(ROWS, 'source', 'asc').map((r) => r.source), ['Claude Code', 'Claude desktop', 'Codex'])
})

test('sortArchive does not mutate its input', () => {
  const copy = ROWS.map((r) => ({ ...r }))
  sortArchive(ROWS, 'repo', 'asc')
  assert.deepEqual(ROWS, copy)
})

test('sortArchive is independent of input order', () => {
  const forward = sortArchive(ROWS, 'repo', 'asc').map((r) => r.id)
  const backward = sortArchive([...ROWS].reverse(), 'repo', 'asc').map((r) => r.id)
  assert.deepEqual(forward, backward)
})

test('sortArchive breaks a same-key tie on timestamp then id, never on input order', () => {
  const tied = [
    { id: 'z::1', repo: 'r', timestamp: '2026-09-27 10:00 ET', source: 'Codex', summary: '' },
    { id: 'a::0', repo: 'r', timestamp: '2026-09-27 10:00 ET', source: 'Codex', summary: '' },
    { id: 'm::0', repo: 'r', timestamp: '2026-09-28 10:00 ET', source: 'Codex', summary: '' },
  ]
  assert.deepEqual(sortArchive(tied, 'repo', 'asc').map((r) => r.id), ['m::0', 'a::0', 'z::1'])
})

test('sortArchive rejects an unknown key rather than silently returning input order', () => {
  assert.throws(() => sortArchive(ROWS, 'nope'), /unknown archive sort key/)
  assert.deepEqual(ARCHIVE_SORT_KEYS, ['timestamp', 'repo', 'source'])
})

test('sortArchive tolerates missing fields', () => {
  const ragged = [{ id: '1' }, { id: '2', repo: 'a', timestamp: '2026-09-27 10:00 ET', source: 'Codex' }]
  assert.equal(sortArchive(ragged, 'repo', 'asc').length, 2)
})

// --- filtering -----------------------------------------------------------

test('filterArchive with no criteria returns everything', () => {
  assert.equal(filterArchive(ROWS).length, 3)
  assert.equal(filterArchive(ROWS, {}).length, 3)
})

test('filterArchive narrows by repo and by tool', () => {
  assert.deepEqual(filterArchive(ROWS, { repo: 'sitl_vault' }).map((r) => r.id), ['c::0'])
  assert.deepEqual(filterArchive(ROWS, { source: 'Codex' }).map((r) => r.id), ['a::0'])
})

test('filterArchive combines repo, tool, and query', () => {
  assert.equal(filterArchive(ROWS, { repo: 'sitl_vault', source: 'Codex' }).length, 0, 'filters are AND, not OR')
  assert.deepEqual(filterArchive(ROWS, { source: 'Claude Code', query: 'strip' }).map((r) => r.id), ['b::0'])
})

test('filterArchive query is case-insensitive and spans every visible field', () => {
  assert.deepEqual(filterArchive(ROWS, { query: 'CODEX' }).map((r) => r.id), ['a::0'], 'tool')
  assert.deepEqual(filterArchive(ROWS, { query: 'sitl' }).map((r) => r.id), ['c::0'], 'repo')
  assert.deepEqual(filterArchive(ROWS, { query: '09-26' }).map((r) => r.id), ['c::0'], 'timestamp')
  assert.deepEqual(filterArchive(ROWS, { query: 'registry' }).map((r) => r.id), ['c::0'], 'summary')
})

test('filterArchive treats a whitespace-only query as no query', () => {
  assert.equal(filterArchive(ROWS, { query: '   ' }).length, 3)
})

test('filterArchive matches unlabelled entries under the Unlabelled bucket', () => {
  const rows = [{ id: 'x::0', repo: 'r', timestamp: '2026-09-27 10:00 ET', source: '', summary: 's' }]
  assert.equal(filterArchive(rows, { source: 'Unlabelled' }).length, 1)
  assert.equal(filterArchive(rows, { source: 'Codex' }).length, 0)
})

test('filterArchive returns nothing when nothing matches, rather than everything', () => {
  assert.deepEqual(filterArchive(ROWS, { query: 'zzzzz' }), [])
})

// --- header and tool-label parsing --------------------------------------
// Every case below came from running the parser against the real HANDOFF.md
// files on 2026-09-29. None of them are invented.

const withLog = (header, changed = 'did a thing') => `# H\n\n## Log\n\n### ${header}\n- **Changed:** ${changed}\n`

test('parseHandoffEntries only reads headings under ## Log', () => {
  const md = `# H\n\n### Standing work order (still pending, from the 2026-07-04 vault audit)\nnot an entry\n\n## Log\n\n### 2026-09-27 13:53 ET · Codex\n- **Changed:** real entry.\n`
  const entries = parseHandoffEntries(md, 'ashfall_vault')
  assert.equal(entries.length, 1, 'the pre-Log heading is not an entry')
  assert.equal(entries[0].source, 'Codex')
})

test('parseHandoffEntries normalizes a tool label and keeps its suffix as detail', () => {
  const [e] = parseHandoffEntries(withLog('2026-09-02 22:20 ET · Claude Code (TOOLS.md tool inventory added)'), 'r')
  assert.equal(e.source, 'Claude Code', 'the filter needs one bucket, not one per suffix')
  assert.equal(e.detail, 'TOOLS.md tool inventory added', 'and the suffix is not thrown away')
})

test('parseHandoffEntries handles an em-dash suffix as well as parentheses', () => {
  const [e] = parseHandoffEntries(withLog('2026-09-29 13:20 ET · Claude Code — the session page is rebuilt'), 'r')
  assert.equal(e.source, 'Claude Code')
  assert.equal(e.detail, 'the session page is rebuilt')
})

test('parseHandoffEntries accepts a date with no time', () => {
  const [e] = parseHandoffEntries(withLog('2026-09-28 · Claude Code — SITL pages read Supabase'), 'r')
  assert.equal(e.timestamp, '2026-09-28')
  assert.equal(e.source, 'Claude Code')
})

test('parseHandoffEntries keeps every known label distinct', () => {
  for (const label of HANDOFF_TOOLS) {
    const [e] = parseHandoffEntries(withLog(`2026-09-27 10:00 ET · ${label}`), 'r')
    assert.equal(e.source, label, `${label} round-trips`)
    assert.equal(e.detail, '')
  }
})

test('parseHandoffEntries does not let one Claude label swallow another', () => {
  assert.equal(parseHandoffEntries(withLog('2026-09-27 10:00 ET · Claude chat (live schema audit)'), 'r')[0].source, 'Claude chat')
  assert.equal(parseHandoffEntries(withLog('2026-09-27 10:00 ET · Claude desktop'), 'r')[0].source, 'Claude desktop')
  assert.equal(parseHandoffEntries(withLog('2026-09-27 10:00 ET · Claude Code'), 'r')[0].source, 'Claude Code')
})

test('parseHandoffEntries leaves an unrecognized label unlabelled rather than guessing', () => {
  const [e] = parseHandoffEntries(withLog('2026-09-27 10:00 ET · Claude (chat) — DM Dossier vault planned'), 'r')
  assert.equal(e.source, '', 'not guessed into a bucket')
  assert.equal(e.detail, 'Claude (chat) — DM Dossier vault planned', 'but the raw text survives')
})

test('an undated entry sorts below every dated one, not above', () => {
  const rows = [
    { id: 'junk', repo: 'r', timestamp: '', source: 'Codex', summary: '' },
    { id: 'real', repo: 'r', timestamp: '2026-09-27 13:53 ET', source: 'Codex', summary: '' },
  ]
  assert.deepEqual(sortArchive(rows, 'timestamp', 'desc').map((r) => r.id), ['real', 'junk'])
})

test('filterArchive searches the detail text too', () => {
  const rows = [{ id: '1', repo: 'r', timestamp: '2026-09-27', source: 'Claude Code', detail: 'S17 CONVO 2', summary: 'nothing relevant' }]
  assert.equal(filterArchive(rows, { query: 's17' }).length, 1)
})
