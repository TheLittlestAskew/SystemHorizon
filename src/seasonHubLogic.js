// In-season War Room logic: builds the /api/hub URL, checks the response shape,
// and turns it into a copy-paste prompt for Claude (where Flaim is connected).
// The hub endpoint lives in TheLittlestAskew/Fantasy-Football next to
// api/draft.js, so the ESPN cookies stay in one place.

export const HUB_POLL_MS = 120000

export function hubUrl(apiBase, leagueId, teamId, year) {
  if (!/^\d+$/.test(String(leagueId))) throw new Error('ESPN league ID must be numeric')
  if (!Number.isInteger(teamId) || teamId < 1) throw new Error('ESPN team ID must be a positive integer')
  const params = new URLSearchParams({ leagueId: String(leagueId), teamId: String(teamId) })
  if (year != null) params.set('year', String(year))
  return `${apiBase}/api/hub?${params}`
}

// Throws on a payload the panels can't render, so a broken deploy shows as an
// error instead of four empty panels that look like a quiet week.
export function validateHub(json) {
  if (!json || typeof json !== 'object') throw new Error('hub returned no JSON')
  if (json.error) throw new Error(json.error)
  if (!Number.isInteger(json.week)) throw new Error('hub response has no week')
  for (const key of ['standings', 'freeAgents', 'transactions']) {
    if (!Array.isArray(json[key])) throw new Error(`hub response is missing ${key}`)
  }
  return json
}

export function fmtPts(n) {
  return typeof n === 'number' && Number.isFinite(n) ? n.toFixed(1) : '–'
}

// ESPN transaction times are epoch milliseconds.
export function fmtWhen(ms, now = Date.now()) {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return ''
  const mins = Math.round((now - ms) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 48) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

// Positions present in the free-agent list, in a stable football order.
const POS_ORDER = ['QB', 'RB', 'WR', 'TE', 'K', 'D/ST', 'DT', 'DE', 'LB', 'CB', 'S']
export function freeAgentPositions(freeAgents) {
  const present = new Set((freeAgents || []).map((p) => p.pos).filter(Boolean))
  return POS_ORDER.filter((p) => present.has(p)).concat([...present].filter((p) => !POS_ORDER.includes(p)))
}

function lineupLines(side) {
  return (side.lineup || []).map((p) =>
    `- ${p.slot}: ${p.name} (${p.pos || '?'}, ${p.proTeam || '?'})` +
    ` ${fmtPts(p.points)} pts, proj ${fmtPts(p.projected)}${p.injuryStatus ? `, ${p.injuryStatus}` : ''}`)
}

// A prompt that stands on its own (the numbers are in it), and also tells
// Claude to use Flaim for anything it needs beyond what's pasted.
export function buildClaudePrompt(hub) {
  validateHub(hub)
  const lines = [
    `Fantasy football check-in for week ${hub.week}${hub.leagueName ? ` of ${hub.leagueName}` : ''} (ESPN league ${hub.leagueId}, my team ID ${hub.teamId}).`,
    'If you have Flaim connected, use it to check anything this snapshot is missing. Read-only advice only.',
    '',
  ]
  const m = hub.matchup
  if (m && m.me && m.opponent) {
    lines.push(`## My matchup: ${m.me.name} ${fmtPts(m.me.score)} (proj ${fmtPts(m.me.projected)}) vs ${m.opponent.name} ${fmtPts(m.opponent.score)} (proj ${fmtPts(m.opponent.projected)})`)
    lines.push('', `### My lineup`, ...lineupLines(m.me), '', `### Opponent lineup`, ...lineupLines(m.opponent), '')
  } else {
    lines.push('## No matchup this week (bye or not published yet).', '')
  }
  const mine = hub.standings.find((t) => t.teamId === hub.teamId)
  if (mine) lines.push(`## Standing: seed ${mine.seed ?? '?'}, ${mine.wins}-${mine.losses}${mine.ties ? `-${mine.ties}` : ''}, ${fmtPts(mine.pointsFor)} PF`, '')
  if (hub.freeAgents.length) {
    lines.push('## Top healthy free agents (by projection)')
    for (const p of hub.freeAgents.slice(0, 12)) lines.push(`- ${p.name} (${p.pos || '?'}, ${p.proTeam || '?'}) proj ${fmtPts(p.projected)}, ${p.percentOwned ?? '?'}% owned`)
    lines.push('')
  }
  lines.push('Questions: Is my lineup optimal for what is left this week? Which free agent, if any, should I pick up, and who would I drop? Any injury risk I should plan around?')
  return lines.join('\n')
}
