import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  POSITIONS, seasonYear, overallToRoundPick, myOverallPicks,
  parseRankingsCSV, normalizeAdpPayload, mergeOrder, moveInOrder,
  applyEspnPicks, describeEspnPoll, teamForSeat,
} from './warRoomLogic'
import './WarRoom.css'

// Both endpoints are Vercel functions in TheLittlestAskew/Fantasy-Football and both
// send Access-Control-Allow-Origin: *, so System Horizon can call them cross-origin
// with no proxy of its own. api/adp.js exists because Fantasy Football Calculator
// sends no CORS header; api/draft.js exists because the ESPN cookies must stay
// server-side. Neither is duplicated here on purpose — one source of truth.
const API_BASE = 'https://fantasy-football-taylor-ritchie-s-projects.vercel.app'
const ADP_URL = (year) => `${API_BASE}/api/adp?teams=14&year=${year}`
const ESPN_DRAFT_URL = (leagueId, year) =>
  `${API_BASE}/api/draft?leagueId=${encodeURIComponent(leagueId)}&year=${year}`
const ESPN_POLL_MS = 5000

// Draft state is deliberately local to the browser, not Supabase. See the DESIGN
// NOTE in HANDOFF.md: a live draft is a single-device, single-day, latency-critical
// activity, and a 5-second poll writing to Supabase is a failure path that has
// never been exercised. Moving this to Supabase is a post-draft change.
const LS_KEY = 'warroom_sh_v1'

const DEFAULT_STATE = {
  // rounds: 14, not the standalone board's 16. Verified 2026-08-29 against the live
  // endpoint: /api/draft returns teams:20 and totalPicks:280, and 280/20 = 14. A
  // 16 here invents two rounds that don't exist and pushes "your next pick" wrong.
  settings: { teams: 20, slot: 9, rounds: 14 },
  players: [],
  order: [],
  statuses: {},
  // Player key -> overall pick. This drives the visual board and is kept local
  // with the existing draft state so every filled cell has an honest source.
  draftSlots: {},
  notes: {},
  history: [],
  source: null,
  fetchedAt: null,
  // teamId 16 = "Hits Different" = Taylor Ritchie, confirmed against the live ESPN
  // league JSON (members[] -> teams[] -> pickOrder cross-check) on 2026-08-25. A
  // prior session had this wrong as 17, which is a different owner's team
  // ("Goldfish Bowl"). Do not change without re-verifying against a fresh pull.
  espn: { leagueId: '1573934181', teamId: 16, lastAppliedOverall: 0 },
}

const WAR_ROOM_TABS = [
  { id: 'draft', label: 'Draft Board' },
  { id: 'players', label: 'Player Pool' },
  { id: 'team', label: 'My Team' },
  { id: 'settings', label: 'Settings' },
]

function loadState() {
  // Corrupted or blocked storage must start clean rather than throw on boot.
  let raw = null
  try { raw = window.localStorage.getItem(LS_KEY) } catch { return { state: DEFAULT_STATE, restored: false } }
  if (!raw) return { state: DEFAULT_STATE, restored: false }
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.players)) return { state: DEFAULT_STATE, restored: false }
    return {
      state: {
        ...DEFAULT_STATE,
        ...parsed,
        settings: { ...DEFAULT_STATE.settings, ...parsed.settings },
        espn: { ...DEFAULT_STATE.espn, ...parsed.espn },
      },
      restored: true,
    }
  } catch {
    return { state: DEFAULT_STATE, restored: false }
  }
}

function PositionChip({ pos }) {
  return <span className={`wr-pos wr-pos-${pos}`}>{pos}</span>
}

function WarRoomView() {
  const boot = useRef(loadState()).current
  const [state, setState] = useState(boot.state)
  const [status, setStatus] = useState({ text: 'loading…', isError: false })
  const [espnStatus, setEspnStatus] = useState('')
  const [espnError, setEspnError] = useState(false)
  const [syncOn, setSyncOn] = useState(false)
  const [ui, setUi] = useState({ posFilter: 'ALL', search: '', hideTaken: true, edit: false, openNote: null })
  const [activeTab, setActiveTab] = useState('draft')
  const [panel, setPanel] = useState({ open: false, message: '' })
  const [csvText, setCsvText] = useState('')
  const [csvError, setCsvError] = useState('')
  const [transferText, setTransferText] = useState('')
  const [transferMsg, setTransferMsg] = useState('')

  // The poll runs on an interval, so it must read the freshest state rather than
  // whatever was captured when the interval was created.
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])

  useEffect(() => {
    try { window.localStorage.setItem(LS_KEY, JSON.stringify(state)) }
    catch { setStatus({ text: 'warning: could not save (storage full or blocked)', isError: true }) }
  }, [state])

  const adoptPlayers = useCallback((players, source) => {
    setState((current) => ({
      ...current,
      players,
      source,
      fetchedAt: Date.now(),
      order: mergeOrder(current.order, players),
    }))
  }, [])

  const fetchADP = useCallback(async () => {
    setStatus({ text: 'fetching ADP…', isError: false })
    try {
      const response = await fetch(ADP_URL(seasonYear()), { signal: AbortSignal.timeout(12000) })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const { players, error } = normalizeAdpPayload(await response.json())
      if (error) throw new Error(error)
      adoptPlayers(players, 'ffc')
      setStatus({ text: `${players.length} players · FFC ADP · ${new Date().toLocaleDateString()}`, isError: false })
      setPanel({ open: false, message: '' })
    } catch (error) {
      // Explicit failure path: say exactly what broke and open the CSV fallback.
      setStatus({ text: 'ADP fetch failed', isError: true })
      setPanel({
        open: true,
        message: `Could not load ADP from Fantasy Football Calculator (${error.message}). Paste a rankings CSV below, or hit Refresh ADP again.`,
      })
    }
  }, [adoptPlayers])

  useEffect(() => {
    if (boot.restored && boot.state.players.length) {
      const label = boot.state.source === 'csv' ? 'imported CSV' : 'FFC ADP'
      const when = boot.state.fetchedAt ? new Date(boot.state.fetchedAt).toLocaleDateString() : 'unknown date'
      setStatus({ text: `${boot.state.players.length} players · ${label} · saved ${when}`, isError: false })
    } else {
      fetchADP()
    }
  }, [boot, fetchADP])

  const pollEspn = useCallback(async () => {
    const current = stateRef.current
    const { leagueId, teamId, lastAppliedOverall } = current.espn
    if (!leagueId) { setEspnStatus('no ESPN league ID set'); setEspnError(true); return }
    try {
      const response = await fetch(ESPN_DRAFT_URL(leagueId, seasonYear()), { signal: AbortSignal.timeout(12000) })
      const json = await response.json()
      if (!response.ok) {
        setEspnStatus(`sync error: ${json && json.error ? json.error : `HTTP ${response.status}`}`)
        setEspnError(true)
        return
      }
      const result = applyEspnPicks({
        picks: json.picks,
        players: current.players,
        statuses: current.statuses,
        draftSlots: current.draftSlots,
        lastAppliedOverall,
        myTeamId: teamId,
      })
      if (result.applied) {
        setState((prev) => ({
          ...prev,
          statuses: { ...prev.statuses, ...result.statuses },
          draftSlots: { ...prev.draftSlots, ...result.draftSlots },
          espn: { ...prev.espn, lastAppliedOverall: result.lastAppliedOverall },
        }))
      }
      setEspnStatus(describeEspnPoll(json, result.unmatched))
      setEspnError(false)
    } catch (error) {
      setEspnStatus(`sync failed: ${error && error.message ? error.message : 'network error'}`)
      setEspnError(true)
    }
  }, [])

  useEffect(() => {
    if (!syncOn) return undefined
    pollEspn()
    const handle = setInterval(pollEspn, ESPN_POLL_MS)
    return () => clearInterval(handle)
  }, [syncOn, pollEspn])

  function setPlayerStatus(key, next) {
    setState((current) => {
      const prev = current.statuses[key] || null
      const prevSlot = current.draftSlots[key] || null
      const resolved = prev === next ? null : next // tapping again undoes it
      const statuses = { ...current.statuses }
      const draftSlots = { ...current.draftSlots }
      if (resolved) statuses[key] = resolved
      else delete statuses[key]
      if (resolved) {
        const highestSlot = Math.max(0, ...Object.values(draftSlots).filter(Number.isInteger))
        draftSlots[key] = highestSlot + 1
      }
      else delete draftSlots[key]
      const history = [...current.history, { key, prev, prevSlot }].slice(-100)
      return { ...current, statuses, draftSlots, history }
    })
  }

  function undo() {
    setState((current) => {
      if (!current.history.length) return current
      const history = current.history.slice()
      const last = history.pop()
      const statuses = { ...current.statuses }
      const draftSlots = { ...current.draftSlots }
      if (last.prev) statuses[last.key] = last.prev
      else delete statuses[last.key]
      if (last.prevSlot) draftSlots[last.key] = last.prevSlot
      else delete draftSlots[last.key]
      return { ...current, statuses, draftSlots, history }
    })
  }

  function resetDraft() {
    if (!window.confirm('Clear all drafted/mine marks? Rankings and notes stay.')) return
    setState((current) => ({
      ...current,
      statuses: {},
      draftSlots: {},
      history: [],
      espn: { ...current.espn, lastAppliedOverall: 0 },
    }))
  }

  function saveNote(key, value) {
    setState((current) => {
      const notes = { ...current.notes }
      const clean = value.trim()
      if (clean) notes[key] = clean
      else delete notes[key]
      return { ...current, notes }
    })
    setUi((current) => ({ ...current, openNote: null }))
  }

  function updateSetting(field, rawValue) {
    const value = parseInt(rawValue, 10)
    setState((current) => ({
      ...current,
      settings: {
        ...current.settings,
        [field]: Number.isInteger(value) && value > 0 ? value : (field === 'slot' ? null : current.settings[field]),
      },
    }))
  }

  function importCsv() {
    const { players, error } = parseRankingsCSV(csvText)
    if (error) { setCsvError(error); return }
    adoptPlayers(players, 'csv')
    setCsvError('')
    setStatus({ text: `${players.length} players · imported CSV`, isError: false })
    setPanel({ open: false, message: '' })
  }

  function exportState() {
    // sh.tayloraritchie.com and thelittlestaskew.github.io are separate origins, so
    // localStorage does NOT carry over between the two War Rooms. This is the bridge.
    setTransferText(JSON.stringify(state))
    setTransferMsg('Copied board state below. Paste it into the other War Room to move your ranks, notes and picks across.')
  }

  function importState() {
    try {
      const parsed = JSON.parse(transferText)
      if (!parsed || !Array.isArray(parsed.players)) throw new Error('That JSON has no players array.')
      setState({
        ...DEFAULT_STATE,
        ...parsed,
        settings: { ...DEFAULT_STATE.settings, ...parsed.settings },
        espn: { ...DEFAULT_STATE.espn, ...parsed.espn },
      })
      setTransferMsg(`Loaded ${parsed.players.length} players from pasted state.`)
    } catch (error) {
      setTransferMsg(`Could not load that state: ${error.message}`)
    }
  }

  const playersByKey = useMemo(() => new Map(state.players.map((p) => [p.key, p])), [state.players])

  const rows = useMemo(() => {
    const query = ui.search.trim().toLowerCase()
    const out = []
    let rank = 0
    for (const key of state.order) {
      const player = playersByKey.get(key)
      if (!player) continue
      rank++
      const playerStatus = state.statuses[key] || ''
      if (ui.hideTaken && playerStatus) continue
      if (ui.posFilter !== 'ALL' && player.pos !== ui.posFilter) continue
      if (query && !(player.name.toLowerCase().includes(query) || (player.team || '').toLowerCase().includes(query))) continue
      out.push({ player, rank, status: playerStatus })
    }
    return out
  }, [state.order, state.statuses, playersByKey, ui.search, ui.posFilter, ui.hideTaken])

  const { teams, slot, rounds } = state.settings
  const takenCount = Object.keys(state.statuses).length
  const overall = takenCount + 1
  const roundPick = overallToRoundPick(overall, teams)
  const mine = myOverallPicks(slot, teams, rounds)
  const nextMine = mine.find((n) => n >= overall)

  const myTeam = useMemo(() => {
    const picked = Object.keys(state.statuses)
      .filter((key) => state.statuses[key] === 'mine')
      .map((key) => playersByKey.get(key))
      .filter(Boolean)
    return POSITIONS.flatMap((pos) => picked.filter((p) => p.pos === pos))
  }, [state.statuses, playersByKey])

  const boardPicks = useMemo(() => {
    const byOverall = new Map()
    for (const [key, overallPick] of Object.entries(state.draftSlots || {})) {
      if (!Number.isInteger(overallPick) || overallPick < 1) continue
      const player = playersByKey.get(key)
      if (player) byOverall.set(overallPick, player)
    }
    return Array.from({ length: rounds }, (_, roundIndex) => {
      return Array.from({ length: teams }, (_, pickIndex) => {
        const overallPick = roundIndex * teams + pickIndex + 1
        const roundPick = overallToRoundPick(overallPick, teams)
        return {
          overall: overallPick,
          seat: roundPick?.seat ?? pickIndex + 1,
          player: byOverall.get(overallPick) ?? null,
          isMine: roundPick?.seat === slot,
          isCurrent: overallPick === overall,
        }
      })
    })
  }, [state.draftSlots, playersByKey, rounds, teams, slot, overall])

  const draftQueue = useMemo(() => Array.from({ length: 5 }, (_, index) => {
    const queuedOverall = overall + index
    const queued = overallToRoundPick(queuedOverall, teams)
    return { overall: queuedOverall, round: queued?.round ?? '?', seat: queued?.seat ?? '?' }
  }), [overall, teams])

  return <section className="warroom-view" aria-labelledby="warroom-heading">
    <header className="view-header">
      <div>
        <p className="eyebrow">System index / 10</p>
        <h2 id="warroom-heading">War Room</h2>
        <p>
          20-team PPR snake draft board. ADP from Fantasy Football Calculator, live picks from ESPN.
          Board state is saved in this browser only.
        </p>
      </div>
      <div className="warroom-header-actions">
        <button type="button" className="button" onClick={() => setActiveTab('settings')} aria-current={activeTab === 'settings' ? 'page' : undefined}>Settings</button>
        <button type="button" className="button" onClick={() => setPanel({ open: !panel.open, message: '' })}>Import CSV</button>
        <button type="button" className="button" onClick={fetchADP}>Refresh ADP</button>
        <button
          type="button"
          className={syncOn ? 'button coral' : 'button'}
          onClick={() => setSyncOn((on) => !on)}
          aria-pressed={syncOn}
        >
          ESPN Sync: {syncOn ? 'On' : 'Off'}
        </button>
      </div>
    </header>

    <nav className="warroom-tabs" aria-label="War Room pages">
      {WAR_ROOM_TABS.map((tab) => <button
        key={tab.id}
        type="button"
        className={activeTab === tab.id ? 'warroom-tab active' : 'warroom-tab'}
        aria-current={activeTab === tab.id ? 'page' : undefined}
        onClick={() => setActiveTab(tab.id)}
      >{tab.label}</button>)}
    </nav>

    <p className={status.isError ? 'warroom-status error' : 'warroom-status'} role="status">{status.text}</p>
    {syncOn && <p className={espnError ? 'warroom-status error' : 'warroom-status'} role="status">ESPN · {espnStatus || 'polling…'}</p>}

    {activeTab === 'settings' && <div className="warroom-settings warroom-tab-page">
      <label>Teams<input type="number" min="2" max="32" inputMode="numeric" defaultValue={teams} onChange={(e) => updateSetting('teams', e.target.value)} /></label>
      <label>Your slot<input type="number" min="1" max="32" inputMode="numeric" defaultValue={slot ?? ''} onChange={(e) => updateSetting('slot', e.target.value)} /></label>
      <label>Rounds<input type="number" min="1" max="30" inputMode="numeric" defaultValue={rounds} onChange={(e) => updateSetting('rounds', e.target.value)} /></label>
      <label>ESPN league ID<input type="text" inputMode="numeric" defaultValue={state.espn.leagueId} onChange={(e) => {
        const value = e.target.value.trim()
        if (/^\d+$/.test(value)) setState((c) => ({ ...c, espn: { ...c.espn, leagueId: value } }))
      }} /></label>
      <label>ESPN team ID (you)<input type="number" min="1" inputMode="numeric" defaultValue={state.espn.teamId ?? ''} onChange={(e) => {
        const value = parseInt(e.target.value, 10)
        if (Number.isInteger(value) && value > 0) setState((c) => ({ ...c, espn: { ...c.espn, teamId: value } }))
      }} /></label>
      <div className="warroom-settings-actions">
        <button type="button" className="button" onClick={undo}>Undo</button>
        <button type="button" className="button" onClick={resetDraft}>Reset draft</button>
        <button type="button" className="button" onClick={exportState}>Copy board state</button>
        <button type="button" className="button" onClick={importState}>Load pasted state</button>
      </div>
      <label className="warroom-transfer">
        Board state transfer (this app and the standalone War Room are different origins, so nothing syncs between them automatically)
        <textarea value={transferText} onChange={(e) => setTransferText(e.target.value)} placeholder="Paste board state JSON here, or hit Copy board state to export." />
      </label>
      {transferMsg && <p className="warroom-transfer-msg">{transferMsg}</p>}
    </div>}

    <div className="warroom-pickbar">
      <span>On the clock <b className="warroom-mono">{roundPick ? `${roundPick.round}.${String(roundPick.pick).padStart(2, '0')} (#${overall})` : '?'}</b></span>
      {!slot ? <span className="warroom-dim">Set your slot in Settings to track your picks</span>
        : nextMine === overall ? <span className="warroom-up">YOU ARE UP</span>
        : nextMine ? <span className="warroom-dim">Your next pick: #{nextMine} (in {nextMine - overall})</span>
        : <span className="warroom-dim">No picks left</span>}
      <span className="warroom-dim">{state.players.length ? `${state.players.length} ranked · ${teams * rounds} total picks` : ''}</span>
    </div>

    {panel.open && <div className="warroom-panel">
      {panel.message && <p className="warroom-status error">{panel.message}</p>}
      <p>Paste a rankings CSV (a FantasyPros cheat-sheet export works: needs rank, player name, team and position columns; tier and bye are optional).</p>
      <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} placeholder={'"RK","TIERS","PLAYER NAME","TEAM","POS","BYE WEEK"'} />
      <div>
        <button type="button" className="button coral" onClick={importCsv}>Load pasted CSV</button>
        {csvError && <span className="warroom-status error">{csvError}</span>}
      </div>
    </div>}

    {activeTab === 'draft' && <div className="warroom-draft-layout">
      <section className="warroom-available" aria-label="Available players">
        <div className="warroom-controls">
          <input type="search" value={ui.search} onChange={(e) => setUi((c) => ({ ...c, search: e.target.value }))} placeholder="Search player or team" aria-label="Search players" />
          <div className="warroom-chips" role="group" aria-label="Position filter">
            {['ALL', ...POSITIONS].map((pos) => <button
              key={pos}
              type="button"
              className={ui.posFilter === pos ? 'warroom-chip selected' : 'warroom-chip'}
              aria-pressed={ui.posFilter === pos}
              onClick={() => setUi((c) => ({ ...c, posFilter: pos }))}
            >{pos}</button>)}
          </div>
          <button type="button" className={ui.hideTaken ? 'warroom-chip selected' : 'warroom-chip'} aria-pressed={ui.hideTaken} onClick={() => setUi((c) => ({ ...c, hideTaken: !c.hideTaken }))}>Hide drafted</button>
          <button type="button" className={ui.edit ? 'warroom-chip selected' : 'warroom-chip'} aria-pressed={ui.edit} onClick={() => setUi((c) => ({ ...c, edit: !c.edit }))}>Edit ranks</button>
        </div>

        <ul className="warroom-board">
          {rows.length === 0 && <li className="warroom-row"><span className="warroom-empty">No players match. Load ADP or import a CSV above.</span></li>}
          {rows.map(({ player, rank, status: rowStatus }) => <li key={player.key} className={`warroom-row ${rowStatus}`}>
            <span className="warroom-rank warroom-mono">{rank}</span>
            <span className="warroom-who">
              <span className="warroom-name">{player.name}</span>
              <span className="warroom-meta">
                <PositionChip pos={player.pos} />
                <span>{player.team || 'FA'}{player.bye ? ` · bye ${player.bye}` : ''}</span>
                <span className="warroom-mono">ADP {player.adp < 900 ? player.adp.toFixed(1) : '-'}</span>
                {player.tier ? <span className="warroom-mono">T{player.tier}</span> : null}
              </span>
            </span>
            <span className="warroom-acts">
              {ui.edit ? <>
                <button type="button" onClick={() => setState((c) => ({ ...c, order: moveInOrder(c.order, player.key, 'top') }))} aria-label={`Move ${player.name} to top`}>⤒</button>
                <button type="button" onClick={() => setState((c) => ({ ...c, order: moveInOrder(c.order, player.key, -1) }))} aria-label={`Move ${player.name} up`}>↑</button>
                <button type="button" onClick={() => setState((c) => ({ ...c, order: moveInOrder(c.order, player.key, 1) }))} aria-label={`Move ${player.name} down`}>↓</button>
              </> : <>
                <button type="button" className={state.notes[player.key] ? 'warroom-note has' : 'warroom-note'} onClick={() => setUi((c) => ({ ...c, openNote: c.openNote === player.key ? null : player.key }))} aria-label={`Note on ${player.name}`}>✎</button>
                <button type="button" onClick={() => setPlayerStatus(player.key, 'taken')} aria-label={`${player.name} drafted by someone else`}>✕</button>
                <button type="button" className="warroom-claim" onClick={() => setPlayerStatus(player.key, 'mine')} aria-label={`${player.name} is my pick`}>＋</button>
              </>}
            </span>
            {ui.openNote === player.key && <span className="warroom-notebox">
              <textarea
                autoFocus
                defaultValue={state.notes[player.key] || ''}
                placeholder="Sleeper? Fade? Handcuff?"
                onBlur={(e) => saveNote(player.key, e.target.value)}
              />
            </span>}
          </li>)}
        </ul>
      </section>

      <section className="warroom-draft-grid" aria-label="Live snake draft board">
        <div className="warroom-grid-heading">
          <div><span>Live draft board</span><strong>{teams}-team snake</strong></div>
          <span className="warroom-dim">Round {roundPick?.round ?? '?'} · pick {roundPick?.pick ?? '?'}</span>
        </div>
        <div className="warroom-grid-scroll">
          <div className="warroom-grid" style={{ '--wr-teams': teams }}>
            <div className="warroom-grid-corner">Rd</div>
            {Array.from({ length: teams }, (_, seatIndex) => <div className={seatIndex + 1 === slot ? 'warroom-team-head mine' : 'warroom-team-head'} key={`head-${seatIndex + 1}`}>
              <small>{seatIndex + 1}</small><b>{teamForSeat(seatIndex + 1)?.name ?? `Seat ${seatIndex + 1}`}</b>
            </div>)}
            {boardPicks.map((round, roundIndex) => <Fragment key={`round-${roundIndex}`}>
              <div className="warroom-round-label" key={`round-${roundIndex}`}>{roundIndex + 1}</div>
              {round.map((pick) => <div className={`warroom-draft-cell${pick.isMine ? ' mine' : ''}${pick.isCurrent ? ' current' : ''}${pick.player ? ' filled' : ''}`} key={pick.overall}>
                <small>#{pick.overall}</small>
                {pick.player ? <><b>{pick.player.name}</b><PositionChip pos={pick.player.pos} /></> : <span>{pick.isCurrent ? 'On the clock' : (teamForSeat(pick.seat)?.name ?? `Seat ${pick.seat}`)}</span>}
              </div>)}
            </Fragment>)}
          </div>
        </div>
      </section>

      <aside className="warroom-sidebar">
        <div className="instrument-heading"><span>My team</span><b>{myTeam.length} picked</b></div>
        {myTeam.length === 0
          ? <p className="empty-state">No picks yet. Tap ＋ on a player when you draft them.</p>
          : <div className="warroom-myteam">
            {myTeam.map((player) => <div key={player.key} className="warroom-slot">
              <PositionChip pos={player.pos} />
              <span>{player.name}</span>
              <small className="warroom-mono">{player.bye ? `bye ${player.bye}` : ''}</small>
            </div>)}
          </div>}
        <div className="warroom-queue">
          <div className="instrument-heading"><span>Up next</span><b>{draftQueue.length}</b></div>
          {draftQueue.map((queued, index) => <div className={index === 0 ? 'warroom-queue-row current' : 'warroom-queue-row'} key={queued.overall}>
            <span>{queued.round}.{String(queued.overall - ((queued.round - 1) * teams)).padStart(2, '0')}</span>
            <b>{queued.seat === slot ? 'Your seat' : (teamForSeat(queued.seat)?.name ?? `Seat ${queued.seat}`)}</b>
          </div>)}
        </div>
      </aside>
    </div>}

    {activeTab === 'players' && <section className="warroom-player-page warroom-tab-page" aria-label="Player pool">
      <div className="warroom-controls">
        <input type="search" value={ui.search} onChange={(e) => setUi((current) => ({ ...current, search: e.target.value }))} placeholder="Search player or team" aria-label="Search players" />
        <div className="warroom-chips" role="group" aria-label="Position filter">
          {['ALL', ...POSITIONS].map((pos) => <button
            key={pos}
            type="button"
            className={ui.posFilter === pos ? 'warroom-chip selected' : 'warroom-chip'}
            aria-pressed={ui.posFilter === pos}
            onClick={() => setUi((current) => ({ ...current, posFilter: pos }))}
          >{pos}</button>)}
        </div>
        <button type="button" className={ui.hideTaken ? 'warroom-chip selected' : 'warroom-chip'} aria-pressed={ui.hideTaken} onClick={() => setUi((current) => ({ ...current, hideTaken: !current.hideTaken }))}>Hide drafted</button>
        <button type="button" className={ui.edit ? 'warroom-chip selected' : 'warroom-chip'} aria-pressed={ui.edit} onClick={() => setUi((current) => ({ ...current, edit: !current.edit }))}>Edit ranks</button>
      </div>

      <ul className="warroom-board">
        {rows.length === 0 && <li className="warroom-row"><span className="warroom-empty">No players match. Load ADP or import a CSV above.</span></li>}
        {rows.map(({ player, rank, status: rowStatus }) => <li key={player.key} className={`warroom-row ${rowStatus}`}>
          <span className="warroom-rank warroom-mono">{rank}</span>
          <span className="warroom-who">
            <span className="warroom-name">{player.name}</span>
            <span className="warroom-meta">
              <PositionChip pos={player.pos} />
              <span>{player.team || 'FA'}{player.bye ? ` · bye ${player.bye}` : ''}</span>
              <span className="warroom-mono">ADP {player.adp < 900 ? player.adp.toFixed(1) : '-'}</span>
              {player.tier ? <span className="warroom-mono">T{player.tier}</span> : null}
            </span>
          </span>
          <span className="warroom-acts">
            {ui.edit ? <>
              <button type="button" onClick={() => setState((current) => ({ ...current, order: moveInOrder(current.order, player.key, 'top') }))} aria-label={`Move ${player.name} to top`}>⤒</button>
              <button type="button" onClick={() => setState((current) => ({ ...current, order: moveInOrder(current.order, player.key, -1) }))} aria-label={`Move ${player.name} up`}>↑</button>
              <button type="button" onClick={() => setState((current) => ({ ...current, order: moveInOrder(current.order, player.key, 1) }))} aria-label={`Move ${player.name} down`}>↓</button>
            </> : <>
              <button type="button" className={state.notes[player.key] ? 'warroom-note has' : 'warroom-note'} onClick={() => setUi((current) => ({ ...current, openNote: current.openNote === player.key ? null : player.key }))} aria-label={`Note on ${player.name}`}>✎</button>
              <button type="button" onClick={() => setPlayerStatus(player.key, 'taken')} aria-label={`${player.name} drafted by someone else`}>✕</button>
              <button type="button" className="warroom-claim" onClick={() => setPlayerStatus(player.key, 'mine')} aria-label={`${player.name} is my pick`}>＋</button>
            </>}
          </span>
          {ui.openNote === player.key && <span className="warroom-notebox">
            <textarea autoFocus defaultValue={state.notes[player.key] || ''} placeholder="Sleeper? Fade? Handcuff?" onBlur={(e) => saveNote(player.key, e.target.value)} />
          </span>}
        </li>)}
      </ul>
    </section>}

    {activeTab === 'team' && <section className="warroom-team-page warroom-tab-page" aria-label="My team">
      <div className="warroom-team-card">
        <div className="instrument-heading"><span>My team</span><b>{myTeam.length} picked</b></div>
        {myTeam.length === 0
          ? <p className="empty-state">No picks yet. Use Player Pool to claim a player when you draft them.</p>
          : <div className="warroom-myteam">
            {myTeam.map((player) => <div key={player.key} className="warroom-slot">
              <PositionChip pos={player.pos} />
              <span>{player.name}</span>
              <small className="warroom-mono">{player.team || 'FA'}{player.bye ? ` · bye ${player.bye}` : ''}</small>
            </div>)}
          </div>}
      </div>
      <div className="warroom-team-card warroom-queue-card">
        <div className="instrument-heading"><span>Up next</span><b>{draftQueue.length}</b></div>
        {draftQueue.map((queued, index) => <div className={index === 0 ? 'warroom-queue-row current' : 'warroom-queue-row'} key={queued.overall}>
          <span>{queued.round}.{String(queued.overall - ((queued.round - 1) * teams)).padStart(2, '0')}</span>
          <b>{queued.seat === slot ? 'Your seat' : (teamForSeat(queued.seat)?.name ?? `Seat ${queued.seat}`)}</b>
        </div>)}
      </div>
    </section>}
  </section>
}

export default WarRoomView
