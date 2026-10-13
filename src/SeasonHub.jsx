import { useCallback, useEffect, useMemo, useState } from 'react'
import { HUB_POLL_MS, hubUrl, validateHub, fmtPts, fmtWhen, freeAgentPositions, buildClaudePrompt, headToHead, barPct, scoreShare } from './seasonHubLogic'

// In-season War Room page: this week's matchup, standings, waivers and league
// moves from /api/hub. Refreshes every 2 minutes while the tab is visible, so a
// game-day Sunday stays live without hammering ESPN from a background tab.
function Lineup({ side, label }) {
  if (!side) return null
  return <div className="season-side">
    <div className="season-side-head">
      <span className="eyebrow">{label}</span>
      <b>{side.name}</b>
      <span className="season-score">{fmtPts(side.score)}</span>
      <small className="warroom-mono">proj {fmtPts(side.projected)}</small>
    </div>
    <table className="season-table">
      <thead><tr><th scope="col">Slot</th><th scope="col">Player</th><th scope="col" className="num">Pts</th><th scope="col" className="num">Proj</th></tr></thead>
      <tbody>
        {side.lineup.map((p) => <tr key={p.id} className={p.starting ? undefined : 'season-bench'}>
          <td className="warroom-mono">{p.slot}</td>
          <td>
            {p.name} <small className="warroom-mono">{p.pos} · {p.proTeam || 'FA'}</small>
            {p.injuryStatus && <span className="season-injury">{p.injuryStatus.replace('_', ' ')}</span>}
          </td>
          <td className="num">{fmtPts(p.points)}</td>
          <td className="num">{fmtPts(p.projected)}</td>
        </tr>)}
      </tbody>
    </table>
  </div>
}

// Big-number scoreboard: both scores, projections, and one bar splitting the
// points scored so far. The bar is decoration; every number is also in text.
function Scoreboard({ matchup, week }) {
  const { me, opponent } = matchup
  const share = scoreShare(me.score, opponent && opponent.score)
  const final = Boolean(matchup.winner) && matchup.winner !== 'UNDECIDED'
  return <div className="season-scoreboard">
    <div className="season-team">
      <span className="eyebrow">You</span>
      <b>{me.name}</b>
      <small className="warroom-mono">proj {fmtPts(me.projected)}</small>
    </div>
    <div className="season-bigscore">
      <span className={final ? 'season-live final' : 'season-live'}>{final ? 'Final' : 'Live'} · Week {week}</span>
      <p><span>{fmtPts(me.score)}</span><i aria-hidden="true">:</i><span className="visually-hidden"> to </span><span>{fmtPts(opponent ? opponent.score : null)}</span></p>
    </div>
    <div className="season-team right">
      <span className="eyebrow">Opponent</span>
      <b>{opponent ? opponent.name : 'Bye'}</b>
      <small className="warroom-mono">proj {fmtPts(opponent ? opponent.projected : null)}</small>
    </div>
    {share != null && <div className="season-share" aria-hidden="true"><span style={{ width: `${share}%` }} /></div>}
  </div>
}

// Slot-by-slot bars, the fantasy version of a match-stats panel. Points once a
// player has any, the projection (dimmed, marked "proj") until then.
function HeadToHead({ matchup }) {
  const { rows, scale } = useMemo(() => headToHead(matchup), [matchup])
  if (!rows.length) return <p className="empty-state">No starters set on either side yet.</p>
  const cell = (player, value, played, leading, sideClass) => <div className={`season-h2h-side ${sideClass}${leading ? ' lead' : ''}${played ? '' : ' proj'}`}>
    <div className="season-h2h-who">
      <span>{player ? player.name : 'Empty'}</span>
      {player && player.injuryStatus && <span className="season-injury">{player.injuryStatus.replace('_', ' ')}</span>}
    </div>
    <b className="warroom-mono">{fmtPts(value)}{player && !played && value != null ? <small> proj</small> : null}</b>
    <div className="season-bar" aria-hidden="true"><span style={{ width: `${barPct(value, scale)}%` }} /></div>
  </div>
  return <ul className="season-h2h">
    {rows.map((r, i) => <li key={`${r.slot}-${i}`}>
      {cell(r.me, r.meValue, r.mePlayed, r.lead === 'me', 'left')}
      <span className="season-h2h-slot warroom-mono">{r.slot}</span>
      {cell(r.opp, r.oppValue, r.oppPlayed, r.lead === 'opp', 'right')}
    </li>)}
  </ul>
}

// Last five results as pills, oldest on the left, newest on the right.
function Form({ results }) {
  if (!results || !results.length) return null
  return <span className="season-form" role="img" aria-label={`Last ${results.length}: ${results.join(' ')}`}>
    {results.map((r, i) => <i key={i} className={`season-pill ${r}`} aria-hidden="true">{r}</i>)}
  </span>
}

function SeasonHub({ apiBase, leagueId, teamId }) {
  const [hub, setHub] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [faPos, setFaPos] = useState('ALL')
  const [copyMsg, setCopyMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(hubUrl(apiBase, leagueId, teamId), { signal: AbortSignal.timeout(30000) })
      const json = await response.json().catch(() => null)
      if (!response.ok) throw new Error((json && json.error) || `HTTP ${response.status}`)
      setHub(validateHub(json))
      setError('')
    } catch (err) {
      // Keep the last good data on screen; the error line says it's stale.
      setError(err && err.message ? err.message : 'could not reach the hub')
    } finally {
      setLoading(false)
    }
  }, [apiBase, leagueId, teamId])

  useEffect(() => {
    load()
    const tick = () => { if (document.visibilityState === 'visible') load() }
    const handle = setInterval(tick, HUB_POLL_MS)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(handle); document.removeEventListener('visibilitychange', tick) }
  }, [load])

  const positions = useMemo(() => freeAgentPositions(hub && hub.freeAgents), [hub])
  const freeAgents = useMemo(() => (hub ? hub.freeAgents.filter((p) => faPos === 'ALL' || p.pos === faPos) : []), [hub, faPos])

  const copyForClaude = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(buildClaudePrompt(hub))
      setCopyMsg('Copied. Paste it into Claude (with Flaim connected) for start/sit and pickup advice.')
    } catch (err) {
      setCopyMsg(`Copy failed: ${err && err.message ? err.message : 'clipboard blocked'}`)
    }
  }, [hub])

  const m = hub && hub.matchup
  const sectionErrors = (hub && hub.errors) || {}

  return <div className="season-hub warroom-tab-page">
    <div className="season-toolbar">
      <p className={error ? 'warroom-status error' : 'warroom-status'} role="status">
        {error
          ? `ESPN · ${error}${hub ? ` (showing data from ${fmtWhen(Date.parse(hub.fetchedAt))})` : ''}`
          : hub ? `Week ${hub.week} · updated ${fmtWhen(Date.parse(hub.fetchedAt))} · refreshes every 2 min` : 'loading…'}
      </p>
      <div className="season-actions">
        <button type="button" className="button" onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>
        <button type="button" className="button coral" onClick={copyForClaude} disabled={!hub}>Copy for Claude</button>
      </div>
    </div>
    {copyMsg && <p className="warroom-status" role="status">{copyMsg}</p>}

    {hub && <>
      <section className="season-card season-matchup" aria-label="This week's matchup">
        {sectionErrors.matchup && <p className="warroom-status error">{sectionErrors.matchup}</p>}
        {m && m.me ? <>
          <Scoreboard matchup={m} week={hub.week} />
          <div className="instrument-heading season-subhead"><span>Head to head</span><b>starters, slot by slot</b></div>
          <HeadToHead matchup={m} />
          <details className="season-details">
            <summary>Full lineups and bench</summary>
            <div className="season-sides">
              <Lineup side={m.me} label="You" />
              <Lineup side={m.opponent} label="Opponent" />
            </div>
          </details>
        </> : <p className="empty-state">No matchup this week: a bye, or ESPN hasn't published it yet.</p>}
      </section>

      <div className="season-grid">
        <section className="season-card" aria-label="Standings">
          <div className="instrument-heading"><span>Standings</span><b>{hub.standings.length} teams</b></div>
          {sectionErrors.standings && <p className="warroom-status error">{sectionErrors.standings}</p>}
          <div className="season-scroll">
            <table className="season-table">
              <thead><tr><th scope="col" className="num">#</th><th scope="col">Team</th><th scope="col">W-L</th><th scope="col" className="num">PF</th><th scope="col" className="num">PA</th><th scope="col">Form</th></tr></thead>
              <tbody>
                {hub.standings.map((t, i) => <tr key={t.teamId} className={t.teamId === hub.teamId ? 'season-mine' : undefined}>
                  <td className="num warroom-mono">{t.seed ?? i + 1}</td>
                  <td>{t.name}{t.division && <small className="warroom-mono"> {t.division.replace(/ Divi?son| Division/i, '')}</small>}</td>
                  <td className="warroom-mono">{t.wins}-{t.losses}{t.ties ? `-${t.ties}` : ''}</td>
                  <td className="num">{fmtPts(t.pointsFor)}</td>
                  <td className="num">{fmtPts(t.pointsAgainst)}</td>
                  <td><Form results={t.form} />{(!t.form || !t.form.length) && <span className="warroom-mono">{t.streak || ''}</span>}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </section>

        <section className="season-card" aria-label="League leaders">
          <div className="instrument-heading"><span>League leaders</span><b>top starters, week {hub.week}</b></div>
          {sectionErrors.leaders && <p className="warroom-status error">{sectionErrors.leaders}</p>}
          {!Array.isArray(hub.leaders)
            ? <p className="empty-state">The data feed isn't sending leaders yet.</p>
            : hub.leaders.length === 0
              ? <p className="empty-state">No starter has scored yet this week.</p>
              : <ol className="season-leaders">
                {hub.leaders.map((p, i) => <li key={p.id} className={p.teamId === hub.teamId ? 'season-mine' : undefined}>
                  <span className="season-rank warroom-mono">{i + 1}</span>
                  <div><b>{p.name}</b> <small className="warroom-mono">{p.pos} · {p.proTeam || 'FA'}</small><small>{p.team}</small></div>
                  <span className="season-leader-pts warroom-mono">{fmtPts(p.points)}</span>
                </li>)}
              </ol>}
        </section>

        <section className="season-card" aria-label="Waiver wire">
          <div className="instrument-heading"><span>Waiver wire</span><b>healthy, by projection</b></div>
          {sectionErrors.freeAgents && <p className="warroom-status error">{sectionErrors.freeAgents}</p>}
          <div className="season-filter" role="group" aria-label="Filter free agents by position">
            {['ALL', ...positions].map((pos) => <button key={pos} type="button"
              className={faPos === pos ? 'warroom-tab active' : 'warroom-tab'}
              aria-pressed={faPos === pos} onClick={() => setFaPos(pos)}>{pos}</button>)}
          </div>
          {freeAgents.length === 0
            ? <p className="empty-state">No healthy free agents at {faPos} in the top 60 by ownership.</p>
            : <table className="season-table">
              <thead><tr><th scope="col">Player</th><th scope="col" className="num">Proj</th><th scope="col" className="num">Own%</th></tr></thead>
              <tbody>
                {freeAgents.map((p) => <tr key={p.id}>
                  <td>{p.name} <small className="warroom-mono">{p.pos} · {p.proTeam || 'FA'}</small>
                    {p.injuryStatus && <span className="season-injury">{p.injuryStatus.replace('_', ' ')}</span>}</td>
                  <td className="num">{fmtPts(p.projected)}</td>
                  <td className="num">{p.percentOwned ?? '–'}</td>
                </tr>)}
              </tbody>
            </table>}
        </section>

        <section className="season-card" aria-label="League transactions">
          <div className="instrument-heading"><span>League moves</span><b>this week + last</b></div>
          {sectionErrors.transactions && <p className="warroom-status error">{sectionErrors.transactions}</p>}
          {hub.transactions.length === 0
            ? <p className="empty-state">No executed adds, drops or trades in the last two weeks.</p>
            : <ul className="season-moves">
              {hub.transactions.map((t) => <li key={t.id}>
                <div><b>{t.team || 'League'}</b> <small className="warroom-mono">{t.type} · {fmtWhen(t.at)}</small></div>
                {t.adds.map((a) => <span key={`a${a.player}`} className="season-add">+ {a.player}</span>)}
                {t.drops.map((d) => <span key={`d${d.player}`} className="season-drop">− {d.player}</span>)}
                {t.trades.map((x) => <span key={`t${x.player}`} className="season-trade">⇄ {x.player} → {x.to || '?'}</span>)}
              </li>)}
            </ul>}
        </section>
      </div>
    </>}
  </div>
}

export default SeasonHub
