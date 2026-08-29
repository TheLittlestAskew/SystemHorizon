import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './supabase'

// Routed through the same Vercel proxy the standalone War Room used
// (TheLittlestAskew/Fantasy-Football, api/adp.js + api/draft.js). Both already
// send Access-Control-Allow-Origin: * so calling them cross-origin from
// sh.tayloraritchie.com works with no changes on that side. See that repo's
// HANDOFF.md for the CORS story and the ESPN cookie rotation note.
const ESPN_LEAGUE_ID_DEFAULT = '1573934181'
const ESPN_TEAM_ID_DEFAULT = 16 // "Hits Different" — verified against live ESPN league JSON 2026-08-25
const ADP_BASE = 'https://fantasy-football-taylor-ritchie-s-projects.vercel.app/api/adp'
const ESPN_DRAFT_BASE = 'https://fantasy-football-taylor-ritchie-s-projects.vercel.app/api/draft'
const ESPN_POLL_MS = 5000
const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DST']
const LEGACY_LS_KEY = 'warroom_v1' // one-time read for migration off the old standalone app, then ignored

/* ---------- pure helpers, ported unchanged from the standalone app ---------- */

function seasonYear() {
  const d = new Date()
  return d.getMonth() < 2 ? d.getFullYear() - 1 : d.getFullYear()
}

function normalizePos(raw) {
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

function playerKey(name, pos) {
  if (!name) return null
  return String(name).toLowerCase().replace(/[^a-z0-9]/g, '') + '|' + (pos || '')
}

function overallToRoundPick(overall, teams) {
  if (!Number.isInteger(overall) || overall < 1 || !Number.isInteger(teams) || teams < 1) return null
  const round = Math.ceil(overall / teams)
  const idx = overall - (round - 1) * teams
  const pick = round % 2 === 1 ? idx : teams - idx + 1
  return { round, pick: idx, seat: pick }
}

function myOverallPicks(slot, teams, rounds) {
  if (!Number.isInteger(slot) || slot < 1 || slot > teams) return []
  if (!Number.isInteger(teams) || teams < 1 || !Number.isInteger(rounds) || rounds < 1) return []
  const picks = []
  for (let r = 1; r <= rounds; r++) {
    picks.push(r % 2 === 1 ? (r - 1) * teams + slot : (r - 1) * teams + (teams - slot + 1))
  }
  return picks
}

function parseCSVLine(line) {
  const out = []
  let cur = '', inQ = false
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

function parseRankingsCSV(text) {
  if (typeof text !== 'string' || !text.trim()) return { players: [], error: 'Nothing pasted.' }
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return { players: [], error: 'Need a header row plus at least one player.' }
  const header = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase())
  const col = (...names) => header.findIndex((h) => names.some((n) => h.includes(n)))
  const iName = col('player'), iPos = col('pos'), iTeam = col('team'),
    iRank = col('rk', 'rank'), iBye = col('bye'), iTier = col('tier')
  if (iName === -1 || iPos === -1) return { players: [], error: 'Could not find PLAYER and POS columns in the header.' }
  const players = [], seen = new Set()
  for (let li = 1; li < lines.length; li++) {
    const f = parseCSVLine(lines[li])
    const name = (f[iName] || '').trim()
    const pos = normalizePos(f[iPos])
    if (!name || !pos) continue
    const key = playerKey(name, pos)
    if (seen.has(key)) continue
    seen.add(key)
    players.push({
      key, name, pos,
      team: iTeam !== -1 ? (f[iTeam] || '').trim().toUpperCase() : '',
      bye: iBye !== -1 ? parseInt(f[iBye], 10) || null : null,
      adp: iRank !== -1 ? parseFloat(f[iRank]) || li : li,
      tier: iTier !== -1 ? parseInt(f[iTier], 10) || null : null,
    })
  }
  if (!players.length) return { players: [], error: 'Parsed 0 players. Check the column headers.' }
  return { players, error: null }
}

function defaultBoard() {
  return {
    settings: { teams: 20, slot: ESPN_TEAM_ID_DEFAULT === 16 ? 9 : null, rounds: 16 },
    players: [],
    order: [],
    statuses: {},
    notes: {},
    history: [],
    source: null,
    fetchedAt: null,
    espn: { leagueId: ESPN_LEAGUE_ID_DEFAULT, teamId: ESPN_TEAM_ID_DEFAULT, lastAppliedOverall: 0 },
  }
}

function byKey(board) {
  return new Map(board.players.map((p) => [p.key, p]))
}

/* ---------- reducers: same logic as the standalone app's mutating functions, made pure ---------- */

function rSetPlayerStatus(board, key, next) {
  const prev = board.statuses[key] || null
  if (prev === next) next = null // tapping again un-does it
  const history = [...board.history, { key, prev }].slice(-100)
  const statuses = { ...board.statuses }
  if (next) statuses[key] = next
  else delete statuses[key]
  return { ...board, statuses, history }
}

function rUndo(board) {
  if (!board.history.length) return board
  const history = [...board.history]
  const last = history.pop()
  const statuses = { ...board.statuses }
  if (last.prev) statuses[last.key] = last.prev
  else delete statuses[last.key]
  return { ...board, statuses, history }
}

function rResetDraft(board) {
  return { ...board, statuses: {}, history: [] }
}

function rMoveKey(board, key, dir) {
  const order = [...board.order]
  const i = order.indexOf(key)
  if (i === -1) return board
  order.splice(i, 1)
  const j = dir === 'top' ? 0 : Math.max(0, Math.min(order.length, i + dir))
  order.splice(j, 0, key)
  return { ...board, order }
}

function rAdoptPlayers(board, players, source) {
  const valid = new Set(players.map((p) => p.key))
  const kept = board.order.filter((k) => valid.has(k))
  const known = new Set(kept)
  for (const p of players) if (!known.has(p.key)) kept.push(p.key)
  return { ...board, players, source, fetchedAt: Date.now(), order: kept }
}

function rSetNote(board, key, text) {
  const notes = { ...board.notes }
  if (text) notes[key] = text
  else delete notes[key]
  return { ...board, notes }
}

// ESPN picks never un-apply — ESPN is the source of truth once synced.
function rApplyEspnPicks(board, picks) {
  let next = board
  let applied = 0
  for (const { key, isMine, overall } of picks) {
    const prev = next.statuses[key] || null
    const val = isMine ? 'mine' : 'taken'
    if (prev !== val) {
      const history = [...next.history, { key, prev }].slice(-100)
      next = { ...next, statuses: { ...next.statuses, [key]: val }, history }
      applied++
    }
    if (overall > next.espn.lastAppliedOverall) {
      next = { ...next, espn: { ...next.espn, lastAppliedOverall: overall } }
    }
  }
  return { board: next, applied }
}

/* ---------- self-tests: console only, zero UI impact — same assertions as the standalone app ---------- */

function runSelfTests() {
  const t = (name, cond) => console[cond ? 'log' : 'error']((cond ? '✓' : '✗ FAIL') + ' WarRoom: ' + name)
  t('normalizePos WR1', normalizePos('WR1') === 'WR')
  t('normalizePos D/ST', normalizePos('D/ST') === 'DST')
  t('normalizePos junk', normalizePos(42) === null)
  t("playerKey stable", playerKey("Ja'Marr Chase", 'WR') === playerKey('JaMarr chase', 'WR'))
  t('snake r1', JSON.stringify(myOverallPicks(3, 20, 2)) === JSON.stringify([3, 38]))
  t('snake last seat', JSON.stringify(myOverallPicks(20, 20, 2)) === JSON.stringify([20, 21]))
  t('snake bad slot', myOverallPicks(0, 20, 2).length === 0)
  t('roundpick 21@20', (() => { const r = overallToRoundPick(21, 20); return r.round === 2 && r.pick === 1 })())
  t('roundpick bad', overallToRoundPick(0, 20) === null)
  const csv = '"RK","TIERS","PLAYER NAME","TEAM","POS","BYE WEEK"\n"1","1","Test Player","CIN","WR1","10"\n"1","1","Test Player","CIN","WR1","10"'
  const r = parseRankingsCSV(csv)
  t('csv parse + dedupe', r.error === null && r.players.length === 1 && r.players[0].bye === 10)
  t('csv empty', parseRankingsCSV('').error !== null)
}

/* ---------- component ---------- */

export function WarRoomView() {
  const [board, setBoard] = useState(defaultBoard)
  const [loaded, setLoaded] = useState(false)
  const [status, setStatus] = useState({ msg: 'loading…', isErr: false })
  const [espnStatus, setEspnStatus] = useState('')
  const [espnErr, setEspnErr] = useState(false)
  const [espnOn, setEspnOn] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelMsg, setPanelMsg] = useState('')
  const [csvBox, setCsvBox] = useState('')
  const [parseMsg, setParseMsg] = useState('')
  const [search, setSearch] = useState('')
  const [posFilter, setPosFilter] = useState('ALL')
  const [hideTaken, setHideTaken] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [openNote, setOpenNote] = useState(null)
  const [noteDraft, setNoteDraft] = useState('')

  const boardRef = useRef(board)
  boardRef.current = board
  const ownerRef = useRef(null)
  const pollRef = useRef(null)

  const persist = async (next) => {
    if (!ownerRef.current) return
    const { error } = await supabase
      .from('horizon_draft_board')
      .upsert({ owner: ownerRef.current, state: next, updated_at: new Date().toISOString() }, { onConflict: 'owner' })
    if (error) setStatus((s) => ({ msg: s.msg, isErr: s.isErr })) // keep last status; Supabase errors surface on next fetch attempt
  }

  const commit = (updater) => {
    const next = typeof updater === 'function' ? updater(boardRef.current) : updater
    boardRef.current = next
    setBoard(next)
    persist(next)
    return next
  }

  const fetchADP = async () => {
    setStatus({ msg: 'fetching ADP…', isErr: false })
    try {
      const res = await fetch(ADP_BASE + '?teams=14&year=' + seasonYear(), { signal: AbortSignal.timeout(12000) })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const json = await res.json()
      if (!json || !Array.isArray(json.players) || !json.players.length) throw new Error('empty player list')
      const seen = new Set()
      const players = []
      for (const p of json.players) {
        const pos = normalizePos(p.position)
        const key = playerKey(p.name, pos)
        if (!pos || !key || seen.has(key)) continue
        seen.add(key)
        players.push({
          key, name: p.name, pos,
          team: (p.team || '').toUpperCase(),
          bye: Number.isInteger(p.bye) ? p.bye : null,
          adp: typeof p.adp === 'number' ? p.adp : 999,
          tier: null,
        })
      }
      players.sort((a, b) => a.adp - b.adp)
      commit((prev) => rAdoptPlayers(prev, players, 'ffc'))
      setStatus({ msg: players.length + ' players, FFC ADP · ' + new Date().toLocaleDateString(), isErr: false })
      setPanelOpen(false)
    } catch (err) {
      setStatus({ msg: 'ADP fetch failed', isErr: true })
      setPanelMsg('Could not load ADP from Fantasy Football Calculator (' + err.message + '). Paste a rankings CSV instead, or try Refresh ADP again.')
      setPanelOpen(true)
    }
  }

  const fetchEspnDraft = async () => {
    const { leagueId, teamId } = boardRef.current.espn
    if (!leagueId) { setEspnStatus('no ESPN league ID set'); setEspnErr(true); return }
    try {
      const url = ESPN_DRAFT_BASE + '?leagueId=' + encodeURIComponent(leagueId) + '&year=' + seasonYear()
      const res = await fetch(url, { signal: AbortSignal.timeout(12000) })
      const json = await res.json()
      if (!res.ok) {
        setEspnStatus('ESPN sync error: ' + (json && json.error ? json.error : 'HTTP ' + res.status))
        setEspnErr(true)
        return
      }
      const nameIndex = new Map()
      for (const p of boardRef.current.players) nameIndex.set(playerKey(p.name, p.pos), p.key)
      const newPicks = (json.picks || [])
        .filter((p) => p.overall > boardRef.current.espn.lastAppliedOverall)
        .sort((a, b) => a.overall - b.overall)
      let unmatched = 0
      const resolved = []
      for (const pick of newPicks) {
        if (!pick.name || !pick.pos) { unmatched++; continue }
        const k = playerKey(pick.name, pick.pos)
        if (!nameIndex.has(k)) { unmatched++; continue }
        resolved.push({ key: nameIndex.get(k), isMine: teamId != null && pick.teamId === teamId, overall: pick.overall })
      }
      if (resolved.length) {
        const { board: next, applied } = rApplyEspnPicks(boardRef.current, resolved)
        if (applied) commit(next)
      }
      const parts = []
      if (json.inProgress) parts.push('draft live')
      else if (json.drafted) parts.push('draft complete')
      else parts.push('draft not started')
      parts.push((json.picks || []).length + ' picks made')
      if (unmatched) parts.push(unmatched + ' unmatched this poll')
      setEspnStatus(parts.join(' · '))
      setEspnErr(false)
    } catch (err) {
      setEspnStatus('ESPN sync failed: ' + (err && err.message ? err.message : 'network error'))
      setEspnErr(true)
    }
  }

  const toggleEspnSync = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
      setEspnOn(false)
      setEspnStatus('')
      setEspnErr(false)
      return
    }
    setEspnOn(true)
    fetchEspnDraft()
    pollRef.current = setInterval(fetchEspnDraft, ESPN_POLL_MS)
  }

  // Load: Supabase first, then a one-time legacy-localStorage migration, then defaults.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: userData } = await supabase.auth.getUser()
      const owner = userData?.user?.id
      if (!owner) { setLoaded(true); fetchADP(); return }
      ownerRef.current = owner
      const { data, error } = await supabase.from('horizon_draft_board').select('state').eq('owner', owner).maybeSingle()
      if (cancelled) return
      if (!error && data?.state?.players?.length) {
        boardRef.current = data.state
        setBoard(data.state)
        setSearch(''); setHideTaken(true)
        setLoaded(true)
        setStatus({
          msg: data.state.players.length + ' players, ' + (data.state.source === 'csv' ? 'imported CSV' : 'FFC ADP') +
            ' · saved ' + (data.state.fetchedAt ? new Date(data.state.fetchedAt).toLocaleDateString() : ''),
          isErr: false,
        })
        return
      }
      // no Supabase row yet — check for a legacy localStorage save from the standalone app
      let legacy = null
      try {
        const raw = localStorage.getItem(LEGACY_LS_KEY)
        if (raw) { const parsed = JSON.parse(raw); if (parsed && Array.isArray(parsed.players)) legacy = parsed }
      } catch { /* private mode or corrupted save: ignore */ }
      if (legacy) {
        const migrated = { ...defaultBoard(), ...legacy }
        boardRef.current = migrated
        setBoard(migrated)
        setLoaded(true)
        persist(migrated)
        setStatus({ msg: 'migrated ' + migrated.players.length + ' players from this browser\'s local save', isErr: false })
        return
      }
      setLoaded(true)
      fetchADP()
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    runSelfTests()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  const map = useMemo(() => byKey(board), [board.players])
  const { teams, slot, rounds } = board.settings
  const takenCount = Object.keys(board.statuses).length
  const overall = takenCount + 1
  const rp = overallToRoundPick(overall, teams)
  const mine = myOverallPicks(slot, teams, rounds)
  const nextMine = mine.find((n) => n >= overall)

  const myTeam = useMemo(() => {
    const picks = Object.keys(board.statuses).filter((k) => board.statuses[k] === 'mine').map((k) => map.get(k)).filter(Boolean)
    const groups = {}
    for (const p of picks) (groups[p.pos] = groups[p.pos] || []).push(p)
    return { count: picks.length, groups }
  }, [board.statuses, map])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const out = []
    let shownRank = 0
    for (const key of board.order) {
      const p = map.get(key)
      if (!p) continue
      shownRank++
      const st = board.statuses[key] || ''
      if (hideTaken && st) continue
      if (posFilter !== 'ALL' && p.pos !== posFilter) continue
      if (q && !(p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q))) continue
      out.push({ p, key, st, rank: shownRank, note: board.notes[key] })
    }
    return out
  }, [board.order, board.statuses, board.notes, map, search, posFilter, hideTaken])

  const openNoteFor = (key) => {
    if (openNote === key) { setOpenNote(null); return }
    setOpenNote(key)
    setNoteDraft(board.notes[key] || '')
  }
  const commitNote = () => {
    if (openNote == null) return
    const text = noteDraft.trim()
    commit((prev) => rSetNote(prev, openNote, text))
    setOpenNote(null)
  }

  const updateSetting = (field, raw) => {
    const v = parseInt(raw, 10)
    commit((prev) => ({
      ...prev,
      settings: { ...prev.settings, [field]: Number.isInteger(v) && v > 0 ? v : field === 'slot' ? null : prev.settings[field] },
    }))
  }
  const updateEspnLeague = (raw) => {
    const v = raw.trim()
    commit((prev) => ({ ...prev, espn: { ...prev.espn, leagueId: /^\d+$/.test(v) ? v : prev.espn.leagueId } }))
  }
  const updateEspnTeam = (raw) => {
    const v = parseInt(raw, 10)
    commit((prev) => ({ ...prev, espn: { ...prev.espn, teamId: Number.isInteger(v) && v > 0 ? v : prev.espn.teamId } }))
  }

  const runCsvImport = () => {
    const { players, error } = parseRankingsCSV(csvBox)
    if (error) { setParseMsg(error); return }
    commit((prev) => rAdoptPlayers(prev, players, 'csv'))
    setStatus({ msg: players.length + ' players · imported CSV', isErr: false })
    setPanelOpen(false)
    setParseMsg('')
  }

  if (!loaded) return <div className="warroom"><p className="wr-dim">Loading War Room…</p></div>

  return (
    <div className="warroom">
      <style>{`
        .warroom{--bg:oklch(0.18 0.015 285);--surface:oklch(0.22 0.018 285);--surface-2:oklch(0.26 0.02 285);--line:oklch(0.32 0.02 285);--text:oklch(0.94 0.02 90);--dim:oklch(0.69 0.015 285);--accent:oklch(0.63 0.19 35);--accent-ink:oklch(0.16 0.02 285);--accent-2:oklch(0.67 0.14 275);--danger:oklch(0.68 0.17 15);--qb:oklch(0.62 0.13 20);--rb:oklch(0.66 0.09 160);--wr:oklch(0.66 0.12 275);--te:oklch(0.72 0.11 75);--k:oklch(0.64 0.02 280);--dst:oklch(0.60 0.06 45);
          background:var(--bg);color:var(--text);border-radius:14px;padding:1rem;font:400 15px/1.5 "IBM Plex Sans",sans-serif;}
        .warroom h1,.warroom h2{font-family:Outfit,sans-serif;letter-spacing:-0.02em;margin:0}
        .warroom button{font:600 14px "IBM Plex Sans",sans-serif;color:var(--text);background:var(--surface-2);border:1px solid var(--line);border-radius:8px;padding:0.5rem 0.75rem;cursor:pointer;min-height:40px}
        .warroom button:hover{background:var(--line)}
        .warroom button.primary{background:var(--accent);color:var(--accent-ink);border-color:transparent}
        .warroom button[aria-pressed="true"]{border-color:var(--accent-2);color:var(--accent-2)}
        .warroom input,.warroom textarea{background:var(--surface);color:var(--text);border:1px solid var(--line);border-radius:8px;padding:0.5rem 0.65rem;font:inherit;min-height:40px}
        .wr-mono{font-family:"IBM Plex Mono",monospace;font-variant-numeric:tabular-nums}
        .wr-cols{display:grid;gap:1.25rem}
        @media(min-width:1024px){.wr-cols{grid-template-columns:1fr 300px;align-items:start}.wr-sidebar{position:sticky;top:0.75rem}}
        .wr-header{display:flex;flex-wrap:wrap;gap:0.5rem;align-items:center;padding-bottom:0.75rem}
        .wr-header h1{font-size:1.35rem}
        .wr-status{color:var(--dim);font-size:0.8rem;margin-left:auto}
        .wr-status.err{color:var(--danger)}
        .wr-pickbar{display:flex;flex-wrap:wrap;gap:0.4rem 1.25rem;align-items:baseline;background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:0.75rem 0.9rem 0.6rem;margin:0.5rem 0;background:linear-gradient(90deg,var(--accent),var(--accent-2)) top left/100% 3px no-repeat,var(--surface)}
        .wr-pickbar .big{font-family:Outfit,sans-serif;font-weight:700;font-size:1.25rem}
        .wr-pickbar .mine{color:var(--accent)}
        .wr-pickbar .dim{color:var(--dim);font-size:0.85rem}
        .wr-controls{display:flex;flex-wrap:wrap;gap:0.5rem;margin:0.6rem 0;align-items:center}
        .wr-controls input[type=search]{flex:1 1 160px;min-width:140px}
        .wr-chips{display:flex;gap:0.35rem;flex-wrap:wrap}
        .wr-chip{padding:0.4rem 0.7rem;border-radius:999px;min-height:36px}
        .wr-chip[aria-pressed="true"]{background:var(--accent-2);color:var(--bg);border-color:transparent}
        .wr-board{list-style:none;margin:0;padding:0;border-top:1px solid var(--line)}
        .wr-row{display:grid;gap:0.15rem 0.6rem;align-items:center;grid-template-columns:2.6rem 1fr auto;padding:0.5rem 0.15rem;border-bottom:1px solid var(--line)}
        .wr-row .rk{color:var(--dim);text-align:right;font-size:0.85rem}
        .wr-row .who{min-width:0}
        .wr-row .name{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .wr-row .meta{color:var(--dim);font-size:0.78rem;display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap}
        .wr-pos{display:inline-block;font:600 0.7rem "IBM Plex Mono",monospace;padding:0.1rem 0.4rem;border-radius:5px;color:var(--bg)}
        .wr-pos-QB{background:var(--qb)} .wr-pos-RB{background:var(--rb)} .wr-pos-WR{background:var(--wr)}
        .wr-pos-TE{background:var(--te)} .wr-pos-K{background:var(--k)} .wr-pos-DST{background:var(--dst)}
        .wr-row .acts{display:flex;gap:0.35rem}
        .wr-row.taken{opacity:0.38}
        .wr-row.taken .name{text-decoration:line-through}
        .wr-row.mine .name{color:var(--accent)}
        .wr-notebox{grid-column:1/-1}
        .wr-notebox textarea{width:100%;min-height:70px}
        .wr-sidebar{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:0.8rem 0.9rem;margin-top:0.8rem}
        .wr-sidebar h2{font-size:1rem;margin-bottom:0.5rem}
        .wr-slot{display:flex;gap:0.5rem;padding:0.25rem 0;font-size:0.9rem}
        .wr-empty{color:var(--dim)}
        .wr-settings{display:flex;gap:0.6rem;flex-wrap:wrap;background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:0.75rem;margin:0.5rem 0}
        .wr-settings label{display:flex;flex-direction:column;gap:0.25rem;font-size:0.8rem;color:var(--dim)}
        .wr-settings input{width:6.5rem}
        .wr-panel{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:0.9rem;margin:0.6rem 0}
        .wr-panel textarea{width:100%;min-height:130px;font-family:"IBM Plex Mono",monospace;font-size:12px}
        .wr-hint{color:var(--dim);font-size:0.85rem}
        .wr-err{color:var(--danger)}
        .wr-footer{color:var(--dim);font-size:0.75rem;padding-top:1rem}
      `}</style>

      <header className="wr-header">
        <h1>War Room</h1>
        <button aria-pressed={settingsOpen} onClick={() => setSettingsOpen((v) => !v)}>Settings</button>
        <button onClick={() => setPanelOpen((v) => !v)}>Import CSV</button>
        <button onClick={fetchADP}>Refresh ADP</button>
        <button aria-pressed={espnOn} className={espnErr ? 'wr-err' : ''} onClick={toggleEspnSync} title={espnStatus}>
          ESPN Sync: {espnOn ? 'On' : 'Off'}{espnStatus ? ' — ' + espnStatus : ''}
        </button>
        <span className={'wr-status' + (status.isErr ? ' err' : '')} role="status">{status.msg}</span>
      </header>

      {settingsOpen && (
        <div className="wr-settings">
          <label>Teams
            <input type="number" min="2" max="32" value={teams} onChange={(e) => updateSetting('teams', e.target.value)} />
          </label>
          <label>Your slot
            <input type="number" min="1" max="32" value={slot ?? ''} placeholder="?" onChange={(e) => updateSetting('slot', e.target.value)} />
          </label>
          <label>Rounds
            <input type="number" min="1" max="30" value={rounds} onChange={(e) => updateSetting('rounds', e.target.value)} />
          </label>
          <label>ESPN league ID
            <input type="text" inputMode="numeric" value={board.espn.leagueId || ''} onChange={(e) => updateEspnLeague(e.target.value)} />
          </label>
          <label>ESPN team ID (you)
            <input type="number" min="1" value={board.espn.teamId ?? ''} onChange={(e) => updateEspnTeam(e.target.value)} />
          </label>
          <button onClick={() => commit((prev) => rUndo(prev))}>Undo</button>
          <button onClick={() => { if (window.confirm('Clear all drafted/mine marks? Rankings and notes stay.')) commit((prev) => rResetDraft(prev)) }}>Reset draft</button>
        </div>
      )}

      <div className="wr-pickbar">
        <span>On the clock: <span className="big wr-mono">{rp ? rp.round + '.' + String(rp.pick).padStart(2, '0') + ' (#' + overall + ')' : '?'}</span></span>
        <span className="dim">
          {!slot ? 'Set your slot in Settings to track your picks'
            : nextMine === overall ? <span className="mine big">YOU ARE UP</span>
            : nextMine ? 'Your next pick: #' + nextMine + ' (in ' + (nextMine - overall) + ')'
            : 'No picks left'}
        </span>
        <span className="dim">{board.players.length ? board.players.length + ' ranked · ' + teams * rounds + ' total picks' : ''}</span>
      </div>

      {panelOpen && (
        <div className="wr-panel">
          {panelMsg && <p className="wr-hint">{panelMsg}</p>}
          <p className="wr-hint">Paste a rankings CSV below (FantasyPros cheat sheet export works: needs columns for rank, player name, team, position; tier and bye are optional).</p>
          <textarea value={csvBox} onChange={(e) => setCsvBox(e.target.value)} placeholder={'"RK","TIERS","PLAYER NAME","TEAM","POS","BYE WEEK"\n"1","1","Player Name","CIN","WR1","10"'} />
          <p><button className="primary" onClick={runCsvImport}>Load pasted CSV</button> <span className="wr-hint">{parseMsg}</span></p>
        </div>
      )}

      <div className="wr-cols">
        <section>
          <div className="wr-controls">
            <input type="search" placeholder="Search player or team" value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="wr-chips" role="group" aria-label="Position filter">
              {['ALL', ...POSITIONS].map((p) => (
                <button key={p} className="wr-chip" aria-pressed={p === posFilter} onClick={() => setPosFilter(p)}>{p}</button>
              ))}
            </div>
            <button aria-pressed={hideTaken} onClick={() => setHideTaken((v) => !v)}>Hide drafted</button>
            <button aria-pressed={editMode} onClick={() => setEditMode((v) => !v)}>Edit ranks</button>
          </div>

          <ul className="wr-board">
            {rows.length === 0 && (
              <li className="wr-row"><span></span><span className="who"><span className="meta">No players match. Load ADP or import a CSV above.</span></span></li>
            )}
            {rows.map(({ p, key, st, rank, note }) => (
              <li key={key} className={'wr-row' + (st ? ' ' + st : '')}>
                <span className="rk wr-mono">{rank}</span>
                <span className="who">
                  <span className="name">{p.name}</span>
                  <span className="meta">
                    <span className={'wr-pos wr-pos-' + p.pos}>{p.pos}</span>
                    <span>{p.team || 'FA'}{p.bye ? ' · bye ' + p.bye : ''}</span>
                    <span className="wr-mono">ADP {p.adp < 900 ? p.adp.toFixed(1) : '-'}</span>
                    {p.tier ? <span className="wr-mono">T{p.tier}</span> : null}
                  </span>
                </span>
                <span className="acts">
                  {editMode ? (
                    <>
                      <button aria-label="Move to top" onClick={() => commit((prev) => rMoveKey(prev, key, 'top'))}>⤒</button>
                      <button aria-label="Move up" onClick={() => commit((prev) => rMoveKey(prev, key, -1))}>↑</button>
                      <button aria-label="Move down" onClick={() => commit((prev) => rMoveKey(prev, key, 1))}>↓</button>
                    </>
                  ) : (
                    <>
                      <button aria-label="Note" className={note ? 'has' : ''} onClick={() => openNoteFor(key)}>✎</button>
                      <button aria-label="Drafted by someone" onClick={() => commit((prev) => rSetPlayerStatus(prev, key, 'taken'))}>✕</button>
                      <button className="primary" aria-label="My pick" onClick={() => commit((prev) => rSetPlayerStatus(prev, key, 'mine'))}>＋</button>
                    </>
                  )}
                </span>
                {openNote === key && (
                  <span className="wr-notebox">
                    <textarea
                      autoFocus
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      onBlur={commitNote}
                      placeholder="Sleeper? Fade? Handcuff?"
                    />
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <aside className="wr-sidebar">
          <h2>My team ({myTeam.count})</h2>
          {myTeam.count === 0 ? (
            <p className="wr-empty">No picks yet. Tap ＋ on a player when you draft them.</p>
          ) : (
            POSITIONS.flatMap((pos) => (myTeam.groups[pos] || []).map((p) => (
              <div className="wr-slot" key={p.key}>
                <span className={'wr-pos wr-pos-' + pos}>{pos}</span>
                <span>{p.name}</span>
                <span className="wr-mono" style={{ color: 'var(--dim)' }}>{p.bye ? 'bye ' + p.bye : ''}</span>
              </div>
            )))
          )}
        </aside>
      </div>

      <footer className="wr-footer">
        ADP data from Fantasy Football Calculator (PPR), synced live via ESPN when Sync is on. Saved to your System Horizon account.
      </footer>
    </div>
  )
}
