// Archive view logic, pulled out of App.jsx so it is reachable from node:test
// (App.jsx imports App.css, which node cannot load). Same shape as timeline.js
// and needsAttention.js: pure functions here, rendering only in the component.
//
// The source is each repo's HANDOFF.md fetched over the network, not a table.
// Nothing here writes anything.

// 🛑 EVERY REPO HERE MUST BE PUBLIC. The fetch is an anonymous GET against
// raw.githubusercontent.com, which serves public repos only; a private repo
// returns 404 and is indistinguishable from a missing file. SystemHorizon is
// itself a PUBLIC repo, so the alternative -- shipping a token to authenticate
// the request -- would publish that token. There is no client-side fix for a
// private repo here, which is why this list can only ever hold public ones.
//
// ⚠️ `sitl_vault` was removed 2026-10-04. It had been failing every load, and
// BOTH of its reasons matter, because fixing only one looks like a fix and
// is not:
//   1. the repo was RENAMED to `skitl_vault` in the 2026-10-02 SKITL rename, and
//   2. `skitl_vault` is PRIVATE, so the anonymous fetch 404s under the new name
//      too. It does have a real HANDOFF.md; nothing here can reach it.
// ▶ To bring SITL's handoffs back, `skitl_vault` has to become public. That is
// Taylor's call, not a code change.
export const ARCHIVE_REPOS = ['SystemHorizon', 'ashfall_vault', 'rectrixcaedere', 'taylorritchie', 'pacts_power_vault']

// The closed label set from AGENTS.md. Longest first so "Claude desktop" is
// tested before any shorter prefix could swallow it.
export const HANDOFF_TOOLS = ['Claude desktop', 'Claude Code', 'Claude chat', 'ChatGPT', 'Codex']

// Real logs put free text after the label — "Claude Code (S17 CONVO 2 — full
// vault propagation)". Splitting on the first "·" and keeping the remainder as
// the tool produced 31 distinct "tools" across 5 repos, which makes a filter
// useless. The label is normalized and the suffix is kept as `detail`, so
// nothing is lost and the filter has 5 buckets instead of 31.
function splitSource(blob) {
  const text = (blob ?? '').trim()
  if (!text) return { source: '', detail: '' }
  const label = HANDOFF_TOOLS.find((l) => text === l || text.startsWith(`${l} `) || text.startsWith(`${l}(`))
  if (!label) return { source: '', detail: text }
  return { source: label, detail: text.slice(label.length).replace(/^[\s(—-]+|\)$/g, '').trim() }
}

// AGENTS.md fixes the header as "### YYYY-MM-DD HH:MM ET · <tool>", but the
// time and zone are frequently missing. Only a leading ISO date counts; a header
// without one yields an empty timestamp so it sorts to the bottom instead of the
// top, where raw text used to beat every real date.
function splitHeader(headerLine) {
  const match = headerLine.match(/^(\d{4}-\d{2}-\d{2})(?:\s+(\d{1,2}:\d{2})(?:\s*([A-Za-z]{1,4}))?)?\s*(?:·\s*(.*))?$/)
  if (!match) {
    // No leading date: keep whatever follows a "·" as the tool blob, if any.
    const fallback = headerLine.split('·')
    return { timestamp: '', blob: fallback.length > 1 ? fallback.slice(1).join('·') : '' }
  }
  const [, date, time, zone, blob] = match
  const timestamp = time ? `${date} ${time.padStart(5, '0')}${zone ? ` ${zone}` : ''}` : date
  return { timestamp, blob: blob ?? '' }
}

export function parseHandoffEntries(markdown, repo) {
  // Only headings under "## Log" are entries. Splitting the whole file pulled in
  // unrelated h3s — ashfall_vault's "Standing work order" was sorting above every
  // real entry because "S" outranks "2".
  const logAt = markdown.indexOf('\n## Log')
  const scoped = logAt === -1 ? markdown : markdown.slice(logAt)
  const blocks = scoped.split(/\n### /).slice(1)

  return blocks.map((block, index) => {
    const [headerLine, ...rest] = block.split('\n')
    const body = rest.join('\n')
    const { timestamp, blob } = splitHeader(headerLine.trim())
    const { source, detail } = splitSource(blob)
    const changedMatch = body.match(/\*\*Changed:\*\*\s*([\s\S]*?)(?:\n- \*\*|\n\n|$)/)
    const summary = (changedMatch ? changedMatch[1] : body).replace(/\s+/g, ' ').trim().slice(0, 240)
    // Position within its own file, so the id survives sorting and filtering.
    // Timestamp alone is not unique enough: two tools can bank in the same minute.
    return { id: `${repo}::${index}`, repo, timestamp, source, detail, summary }
  })
}

export const ARCHIVE_SORT_KEYS = ['timestamp', 'repo', 'source']

// Total order on every key, so sorting never depends on input order: the chosen
// key first, then timestamp newest-first, then id. Without the id tiebreak two
// entries banked in the same minute by the same tool could swap places between
// renders and make the table look unstable.
export function sortArchive(entries, key, dir = 'desc') {
  if (!ARCHIVE_SORT_KEYS.includes(key)) throw new Error(`unknown archive sort key: ${key}`)
  const sign = dir === 'asc' ? 1 : -1
  return [...entries].sort((a, b) => {
    const av = a[key] ?? '', bv = b[key] ?? ''
    if (av !== bv) return av < bv ? -sign : sign
    const at = a.timestamp ?? '', bt = b.timestamp ?? ''
    if (at !== bt) return at < bt ? 1 : -1
    return String(a.id ?? '').localeCompare(String(b.id ?? ''))
  })
}

// Repo and tool are exact matches; the query is a case-insensitive substring
// across every field she can see, so searching "codex" or "supabase" both work.
export function filterArchive(entries, { repo = 'All', source = 'All', query = '' } = {}) {
  const needle = query.trim().toLowerCase()
  return entries.filter((entry) => {
    if (repo !== 'All' && entry.repo !== repo) return false
    if (source !== 'All' && (entry.source || 'Unlabelled') !== source) return false
    if (!needle) return true
    return `${entry.repo} ${entry.timestamp} ${entry.source} ${entry.detail ?? ''} ${entry.summary}`.toLowerCase().includes(needle)
  })
}
