// Archive view logic, pulled out of App.jsx so it is reachable from node:test
// (App.jsx imports App.css, which node cannot load). Same shape as timeline.js
// and needsAttention.js: pure functions here, rendering only in the component.
//
// The source is each repo's HANDOFF.md fetched over the network, not a table.
// Nothing here writes anything.

export const ARCHIVE_REPOS = ['SystemHorizon', 'ashfall_vault', 'rectrixcaedere', 'taylorritchie', 'sitl_vault', 'pacts_power_vault']

// AGENTS.md fixes the entry header as "### YYYY-MM-DD HH:MM ET · <tool>" and
// the body as "- **Changed:** ...". A block that does not match keeps whatever
// it has rather than being skipped: these files are hand-edited by four
// different tools, so a malformed entry is likelier than a missing one.
export function parseHandoffEntries(markdown, repo) {
  const blocks = markdown.split(/\n### /).slice(1)
  return blocks.map((block) => {
    const [headerLine, ...rest] = block.split('\n')
    const body = rest.join('\n')
    const headerMatch = headerLine.match(/^(\S+\s+\S+\s+\S+)\s*·\s*(.+)$/)
    const timestamp = headerMatch ? headerMatch[1] : headerLine.trim()
    const source = headerMatch ? headerMatch[2].trim() : ''
    const changedMatch = body.match(/\*\*Changed:\*\*\s*([\s\S]*?)(?:\n- \*\*|\n\n|$)/)
    const summary = (changedMatch ? changedMatch[1] : body).replace(/\s+/g, ' ').trim().slice(0, 240)
    return { repo, timestamp, source, summary }
  })
}

// Handoff timestamps read "YYYY-MM-DD HH:MM ET". The date is the grouping key
// because handoffs are read chronologically across repos, not one repo at a
// time. Anything without a leading date groups under "Undated" rather than
// being dropped.
export function archiveDateOf(timestamp) {
  const match = (timestamp ?? '').match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : 'Undated'
}

// Runs of the same date collapse into one group. Input must already be sorted;
// this deliberately does not re-sort, so the caller's ordering is what renders.
export function groupArchiveByDate(entries) {
  const groups = []
  for (const entry of entries) {
    const date = archiveDateOf(entry.timestamp)
    const last = groups[groups.length - 1]
    if (last && last.date === date) last.items.push(entry)
    else groups.push({ date, items: [entry] })
  }
  return groups
}
