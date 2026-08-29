// Pure logic for the War Room draft board. No DOM, no React, no network — so it
// can be unit-tested in Node. The React view (WarRoomView.jsx) is the only thing
// that touches state, storage, or fetch.
//
// Ported from the standalone single-file War Room (TheLittlestAskew/Fantasy-Football
// index.html). Behaviour is intentionally identical; only the packaging changed.

export const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DST']

export function seasonYear(now = new Date()) {
  // NFL season year: Jan and Feb still belong to the previous season's drafts,
  // so before March we use last year. Otherwise current year.
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) return new Date().getFullYear()
  return now.getMonth() < 2 ? now.getFullYear() - 1 : now.getFullYear()
}

export function normalizePos(raw) {
  // Accepts "WR", "WR1", "D/ST", "DEF", "PK" etc. Returns canonical or null.
  if (typeof raw !== 'string') return null
  const p = raw.toUpperCase().replace(/[^A-Z]/g, '')
  if (p.startsWith('QB')) return 'QB'
  if (p.startsWith('RB')) return 'RB'
  if (p.startsWith('WR')) return 'WR'
  if (p.startsWith('TE')) return 'TE'
  if (p === 'K' || p === 'PK') return 'K'
  if (p === 'DST' || p === 'DEF' || p === 'D') return 'DST'
  return null
}

export function playerKey(name, pos) {
  // Stable key that survives a data refresh. Lowercased, punctuation stripped.
  if (!name) return null
  return String(name).toLowerCase().replace(/[^a-z0-9]/g, '') + '|' + (pos || '')
}

/* ---------- snake draft math ---------- */

export function overallToRoundPick(overall, teams) {
  // 1-based overall pick -> {round, pick, seat}. Guards bad input.
  if (!Number.isInteger(overall) || overall < 1) return null
  if (!Number.isInteger(teams) || teams < 1) return null
  const round = Math.ceil(overall / teams)
  const idx = overall - (round - 1) * teams // 1..teams in draft order
  const seat = round % 2 === 1 ? idx : teams - idx + 1 // seat number on the clock
  return { round, pick: idx, seat }
}

export function myOverallPicks(slot, teams, rounds) {
  // All overall pick numbers belonging to a seat in a snake draft.
  if (!Number.isInteger(teams) || teams < 1) return []
  if (!Number.isInteger(rounds) || rounds < 1) return []
  if (!Number.isInteger(slot) || slot < 1 || slot > teams) return []
  const picks = []
  for (let r = 1; r <= rounds; r++) {
    picks.push(r % 2 === 1 ? (r - 1) * teams + slot : (r - 1) * teams + (teams - slot + 1))
  }
  return picks
}

/* ---------- CSV parsing (FantasyPros-style or generic) ---------- */

export function parseCSVLine(line) {
  // Handles quoted fields with commas and doubled quotes.
  const out = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ }
      else if (ch === '"') inQ = false
      else cur += ch
    } else {
      if (ch === '"') inQ = true
      else if (ch === ',') { out.push(cur); cur = '' }
      else cur += ch
    }
  }
  out.push(cur)
  return out
}

export function parseRankingsCSV(text) {
  // Returns {players, error}. Never throws.
  if (typeof text !== 'string' || !text.trim()) return { players: [], error: 'Nothing pasted.' }
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return { players: [], error: 'Need a header row plus at least one player.' }

  const header = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase())
  const col = (...names) => header.findIndex((h) => names.some((n) => h.includes(n)))
  const iName = col('player')
  const iPos = col('pos')
  const iTeam = col('team')
  const iRank = col('rk', 'rank')
  const iBye = col('bye')
  const iTier = col('tier')
  if (iName === -1 || iPos === -1) {
    return { players: [], error: 'Could not find PLAYER and POS columns in the header.' }
  }

  const players = []
  const seen = new Set()
  for (let li = 1; li < lines.length; li++) {
    const f = parseCSVLine(lines[li])
    const name = (f[iName] || '').trim()
    const pos = normalizePos(f[iPos])
    if (!name || !pos) continue // skip junk rows
    const key = playerKey(name, pos)
    if (seen.has(key)) continue // skip duplicates
    seen.add(key)
    players.push({
      key,
      name,
      pos,
      team: iTeam !== -1 ? (f[iTeam] || '').trim().toUpperCase() : '',
      bye: iBye !== -1 ? parseInt(f[iBye], 10) || null : null,
      adp: iRank !== -1 ? parseFloat(f[iRank]) || li : li,
      tier: iTier !== -1 ? parseInt(f[iTier], 10) || null : null,
    })
  }
  if (!players.length) return { players: [], error: 'Parsed 0 players. Check the column headers.' }
  return { players, error: null }
}

/* ---------- ADP normalisation ---------- */

export function normalizeAdpPayload(json) {
  // Shapes the Fantasy Football Calculator response into board players.
  // Returns {players, error}. Never throws.
  if (!json || !Array.isArray(json.players) || !json.players.length) {
    return { players: [], error: 'empty player list' }
  }
  const seen = new Set()
  const players = []
  for (const p of json.players) {
    const pos = normalizePos(p.position)
    const key = playerKey(p.name, pos)
    if (!pos || !key || seen.has(key)) continue
    seen.add(key)
    players.push({
      key,
      name: p.name,
      pos,
      team: (p.team || '').toUpperCase(),
      bye: Number.isInteger(p.bye) ? p.bye : null,
      adp: typeof p.adp === 'number' ? p.adp : 999,
      tier: null,
    })
  }
  players.sort((a, b) => a.adp - b.adp)
  return { players, error: players.length ? null : 'no usable players in payload' }
}

/* ---------- rank order merging ---------- */

export function mergeOrder(previousOrder, players) {
  // Keep the existing custom order for players still present, append new ones
  // in the order they arrive (already ADP-sorted). Preserves hand-reordering
  // across a data refresh.
  const valid = new Set((players || []).map((p) => p.key))
  const kept = (previousOrder || []).filter((k) => valid.has(k))
  const known = new Set(kept)
  for (const p of players || []) if (!known.has(p.key)) kept.push(p.key)
  return kept
}

export function moveInOrder(order, key, dir) {
  // dir: -1 up, +1 down, 'top'. Returns a NEW array; never mutates.
  if (!Array.isArray(order)) return []
  const i = order.indexOf(key)
  if (i === -1) return order.slice()
  const next = order.slice()
  next.splice(i, 1)
  const j = dir === 'top' ? 0 : Math.max(0, Math.min(next.length, i + dir))
  next.splice(j, 0, key)
  return next
}

/* ---------- ESPN pick application ---------- */

export function applyEspnPicks({ picks, players, statuses, lastAppliedOverall, myTeamId }) {
  // Pure: takes a poll's picks and returns the next statuses plus a report.
  // ESPN is the source of truth here, so a pick always lands as taken/mine and
  // never toggles itself back off.
  const nextStatuses = { ...statuses }
  const nameIndex = new Map()
  for (const p of players || []) nameIndex.set(playerKey(p.name, p.pos), p.key)

  let applied = 0
  let unmatched = 0
  let highest = Number.isInteger(lastAppliedOverall) ? lastAppliedOverall : 0

  const fresh = (Array.isArray(picks) ? picks : [])
    .filter((p) => p && Number.isInteger(p.overall) && p.overall > (lastAppliedOverall || 0))
    .sort((a, b) => a.overall - b.overall)

  for (const pick of fresh) {
    if (!pick.name || !pick.pos) { unmatched++; continue }
    const k = playerKey(pick.name, pick.pos)
    if (!nameIndex.has(k)) { unmatched++; continue }
    const targetKey = nameIndex.get(k)
    // null is not zero, and null is not "not mine": only match on a real id.
    const isMine = myTeamId != null && pick.teamId === myTeamId
    nextStatuses[targetKey] = isMine ? 'mine' : 'taken'
    applied++
    highest = Math.max(highest, pick.overall)
  }

  return { statuses: nextStatuses, lastAppliedOverall: highest, applied, unmatched }
}

export function describeEspnPoll(json, unmatched) {
  // Human-readable one-liner for the sync status. Draft state is read from the
  // API's own flags, never inferred from a pick count.
  const parts = []
  if (json && json.inProgress) parts.push('draft live')
  else if (json && json.drafted) parts.push('draft complete')
  else parts.push('draft not started')
  parts.push(((json && json.picks) || []).length + ' picks made')
  if (unmatched) parts.push(unmatched + ' unmatched this poll')
  return parts.join(' · ')
}
