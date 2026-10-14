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

// Starters paired slot by slot for the head-to-head bars. Both lineups come
// back in the same slot order, so index N on each side is the same slot. A
// player's value is their actual points once they have any, else the
// projection; `scale` is the largest value on the board, so every bar shares
// one ruler. Negative scores (a defense can go below zero) draw as an empty bar.
export function headToHead(matchup) {
  const starters = (side) => ((side && side.lineup) || []).filter((p) => p.starting)
  const mine = starters(matchup && matchup.me)
  const theirs = starters(matchup && matchup.opponent)
  const value = (p) => (!p ? null : typeof p.points === 'number' ? p.points : typeof p.projected === 'number' ? p.projected : null)
  const rows = []
  for (let i = 0; i < Math.max(mine.length, theirs.length); i += 1) {
    const me = mine[i] || null
    const opp = theirs[i] || null
    const meValue = value(me)
    const oppValue = value(opp)
    rows.push({
      slot: (me || opp).slot,
      me, opp, meValue, oppValue,
      mePlayed: Boolean(me) && typeof me.points === 'number',
      oppPlayed: Boolean(opp) && typeof opp.points === 'number',
      lead: meValue == null || oppValue == null || meValue === oppValue ? null : meValue > oppValue ? 'me' : 'opp',
    })
  }
  const scale = Math.max(0, ...rows.flatMap((r) => [r.meValue, r.oppValue]).filter((v) => v != null))
  return { rows, scale }
}

// Bar length as a whole percent of the shared scale, 0 when there is nothing to draw.
export function barPct(value, scale) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || !(scale > 0)) return 0
  return Math.min(100, Math.round((value / scale) * 100))
}

// My share of the two scores, for the scoreboard bar. null until someone has points.
export function scoreShare(mine, theirs) {
  const a = typeof mine === 'number' && mine > 0 ? mine : 0
  const b = typeof theirs === 'number' && theirs > 0 ? theirs : 0
  return a + b > 0 ? Math.round((a / (a + b)) * 100) : null
}

// My Team grouping: starters in lineup order, then bench, then IR, with the
// starter totals that actually count toward the matchup. A missing or empty
// lineup gives empty groups and null totals, never 0.0 for "no data".
export function rosterGroups(lineup) {
  const players = Array.isArray(lineup) ? lineup : []
  const starters = players.filter((p) => p.starting)
  const ir = players.filter((p) => !p.starting && p.slot === 'IR')
  const bench = players.filter((p) => !p.starting && p.slot !== 'IR')
  const sum = (key) => {
    const values = starters.map((p) => p[key]).filter((v) => typeof v === 'number' && Number.isFinite(v))
    return values.length ? Math.round(values.reduce((a, b) => a + b, 0) * 10) / 10 : null
  }
  return {
    starters, bench, ir,
    count: players.length,
    starterPoints: sum('points'),
    starterProjected: sum('projected'),
    injured: players.filter((p) => p.injuryStatus).length,
  }
}
