// M12 Pulse: the view.
//
// Lives in its own file because App.jsx is already 2100+ lines (spec section 8).
// Every DECISION in here is imported from a pure module with tests; this file
// renders and nothing else.
//
// The organising idea is SELECTION. No project selected is portfolio scope;
// selecting one in the left column re-scopes the stream AND all four pane tabs;
// selecting it again clears back to portfolio. That is what makes this a
// master-detail view rather than the metrics wall section 2 forbids.

import { useEffect, useMemo, useState } from 'react'
import SidePane from './SidePane.jsx'
import { readCollapsed, writeCollapsed } from './sidePaneState.js'
import { ARCHIVE_REPOS, parseHandoffEntries } from './archive.js'
import {
  buildStream, handoffToStreamEntry, describeFailures, describeEmptyStream,
  streamFooter, describeAge, describeOrigin, formatEntryWhen,
} from './pulseStream.js'
import {
  PULSE_TABS, overviewPayload, mirrorsPayload, upcomingPayload, stalePayload,
  ringCaption, FRESH_WINDOW_DAYS,
} from './pulsePane.js'
import { repoStatusFlags } from './needsAttention.js'
import { groupByArea } from './areas.js'

const PANE_ID = 'pulse'

// Matches projectFromRow's mapping, so the dot in the left column and the dot
// on the registry card mean the same thing. No new colours (section 3).
function toneFor(project) {
  return project.health === 'Green' ? 'cyan' : project.health === 'Yellow' || project.health === 'Red' ? 'coral' : 'violet'
}

// A parked project is not stale -- staleness is not a defect for something
// deliberately paused -- so it shows its status word instead of a day count.
const PARKED = new Set(['Paused', 'Idea'])

function ProjectRow({ project, selected, now, onSelect }) {
  const parked = PARKED.has(project.status)
  return <button
    type="button"
    className={`pulse-project${selected ? ' pulse-project-selected' : ''}${parked ? ' pulse-project-parked' : ''}`}
    aria-pressed={selected}
    onClick={() => onSelect(project.id)}
  >
    <span className={`signal ${toneFor(project)}`} aria-hidden="true" />
    <span className="pulse-project-name">{project.name}</span>
    <span className="pulse-project-age">{parked ? project.status : describeAge(project.lastActivity, now)}</span>
  </button>
}

// One arc, no gradient, no drop shadow, and the number is readable without the
// arc (the tufte rule, spec section 7.3). Colour carries status only.
function Ring({ reading, onSelectStale }) {
  if (reading.state === 'none') {
    // NOT 0%. Zero of zero is undefined, not failure.
    return <div className="pulse-ring pulse-ring-empty">
      <strong>No active projects</strong>
      <small>{ringCaption(reading)}</small>
    </div>
  }
  const RADIUS = 34
  const circumference = 2 * Math.PI * RADIUS
  const filled = (reading.percent / 100) * circumference
  const tone = reading.percent === 100 ? 'cyan' : reading.percent >= 50 ? 'amber' : 'coral'

  return <div className="pulse-ring">
    <svg viewBox="0 0 80 80" role="img" aria-label={reading.label} className={`pulse-ring-art pulse-ring-${tone}`}>
      <circle className="pulse-ring-track" cx="40" cy="40" r={RADIUS} />
      <circle
        className="pulse-ring-arc" cx="40" cy="40" r={RADIUS}
        strokeDasharray={`${filled} ${circumference - filled}`}
        transform="rotate(-90 40 40)"
      />
    </svg>
    <strong className="pulse-ring-value">{reading.percent}%</strong>
    <small>active projects moved in {FRESH_WINDOW_DAYS}d</small>
    {reading.stale.length > 0 && <button
      type="button"
      className="pulse-ring-shortfall"
      onClick={() => onSelectStale(reading.oldest?.id)}
    >{ringCaption(reading)} →</button>}
    {reading.stale.length === 0 && <small className="pulse-ring-clean">{ringCaption(reading)}</small>}
  </div>
}

function MirrorRows({ payload }) {
  return <>
    {payload.notice && <p className="pulse-note">{payload.notice}</p>}
    {payload.rows.map((repo) => {
      const { flags, tone } = repoStatusFlags(repo)
      return <div className="pulse-pane-row" key={repo.id ?? repo.repoName}>
        <span className={`signal ${tone}`} aria-hidden="true" />
        <div>
          <strong>{repo.repoName}</strong>
          {flags.length > 0
            ? <small>{flags.join(' · ')}</small>
            : <small>Clean — matches remote, nothing uncommitted.</small>}
        </div>
      </div>
    })}
    {payload.unclaimed?.length > 0 && <p className="pulse-note">
      Tracked but in no project: {payload.unclaimed.join(', ')}.
    </p>}
  </>
}

export default function PulseView({ projects = [], tasks = [], events = [], repoHealth = [], activity = [], activityError = '', logFailures = 0, onOpenProject, onAddTask, onCapture }) {
  const [selectedId, setSelectedId] = useState(null)
  const [activeTab, setActiveTab] = useState(PULSE_TABS[0].id)
  const [collapsed, setCollapsed] = useState(() => readCollapsed(PANE_ID))
  const [handoffs, setHandoffs] = useState([])
  const [failures, setFailures] = useState([])
  const [draft, setDraft] = useState('')
  const [composerError, setComposerError] = useState('')
  const [saving, setSaving] = useState(false)

  // Re-reads on every render rather than being frozen at mount: a view left open
  // across midnight must not keep calling yesterday "today".
  const now = new Date()

  useEffect(() => { writeCollapsed(PANE_ID, collapsed) }, [collapsed])

  // Same fetch Archive uses. allSettled separates the failures and they are
  // NAMED rather than thrown away (section 4, no silent fallbacks).
  useEffect(() => {
    let cancelled = false
    Promise.allSettled(ARCHIVE_REPOS.map((repo) =>
      fetch(`https://raw.githubusercontent.com/TheLittlestAskew/${repo}/main/HANDOFF.md`).then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.text()
      }).then((text) => parseHandoffEntries(text, repo))
    )).then((results) => {
      if (cancelled) return
      setHandoffs(results.flatMap((result) => result.status === 'fulfilled' ? result.value : []))
      setFailures(results.flatMap((result, index) =>
        result.status === 'rejected' ? [{ repo: ARCHIVE_REPOS[index], message: result.reason?.message ?? 'fetch failed' }] : []))
    })
    return () => { cancelled = true }
  }, [])

  const selected = projects.find((project) => project.id === selectedId) ?? null

  // A selected project that disappears (deleted, or the registry reloaded) must
  // not leave the view scoped to a ghost.
  useEffect(() => {
    if (selectedId && !projects.some((project) => project.id === selectedId)) setSelectedId(null)
  }, [projects, selectedId])

  const handoffEntries = useMemo(
    () => handoffs.map((entry) => handoffToStreamEntry(entry, projects)),
    [handoffs, projects],
  )

  const stream = buildStream(activity, handoffEntries, { project: selected, failures })
  const footer = streamFooter(projects, now)

  // Area grouping reuses the registry's own AREA_ORDER, so the two views speak
  // one vocabulary and cannot drift. An unknown area is appended, never dropped.
  const grouped = useMemo(() => groupByArea(projects), [projects])

  function toggleSelect(id) {
    // Selecting the same project again clears back to portfolio scope.
    setSelectedId((current) => current === id ? null : id)
  }

  async function submitComposer(event) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || saving) return
    setSaving(true)
    // The composer STATES what it will do, because the target changes with
    // selection. A failed save shows the error and KEEPS the text -- the M3
    // rule, and the one that protects against losing a thought.
    const message = selected
      ? await onAddTask?.({ name: text, status: 'Active', projectId: selected.id })
      : await onCapture?.(text)
    setSaving(false)
    if (message) { setComposerError(message); return }
    setComposerError('')
    setDraft('')
  }

  const paneArgs = { projects, tasks, events, repoHealth, project: selected, now }
  const tabs = PULSE_TABS.map((tab) => ({
    ...tab,
    render: () => {
      if (tab.id === 'overview') {
        const payload = overviewPayload(paneArgs)
        if (payload.scope === 'project') {
          return <div className="pulse-pane-body">
            <div className="pulse-pane-stat"><span>Status</span><strong>{payload.status}</strong></div>
            <div className="pulse-pane-stat"><span>Health</span><strong>{payload.health}</strong></div>
            <div className="pulse-pane-stat"><span>Signal</span><strong>{payload.signal}</strong></div>
            <div className="pulse-pane-stat"><span>Open tasks</span><strong>{payload.openTasks}</strong></div>
            <div className="pulse-pane-stat"><span>Last moved</span><strong>{payload.age}</strong></div>
            <p className="pulse-next-action">{payload.nextAction}</p>
            <button type="button" className="pulse-pane-link" onClick={() => onOpenProject?.(selected.id)}>Open project detail →</button>
          </div>
        }
        return <div className="pulse-pane-body">
          <Ring reading={payload.ring} onSelectStale={(id) => id && setSelectedId(id)} />
          <div className="pulse-pane-stat"><span>Active</span><strong>{payload.counts.Active ?? 0}</strong></div>
          <div className="pulse-pane-stat"><span>Paused</span><strong>{payload.counts.Paused ?? 0}</strong></div>
          <div className="pulse-pane-stat"><span>Idea</span><strong>{payload.counts.Idea ?? 0}</strong></div>
          <div className="pulse-pane-stat"><span>Open tasks</span><strong>{payload.openTasks}</strong></div>
          <div className="pulse-pane-stat"><span>Moved this week</span><strong>{payload.movedThisWeek}</strong></div>
        </div>
      }

      if (tab.id === 'mirrors') {
        return <div className="pulse-pane-body"><MirrorRows payload={mirrorsPayload(paneArgs)} /></div>
      }

      if (tab.id === 'upcoming') {
        const payload = upcomingPayload(paneArgs)
        return <div className="pulse-pane-body">
          {payload.notice && <p className="pulse-note">{payload.notice}</p>}
          {payload.rows.map((event) => <div className="pulse-pane-row" key={event.id}>
            <div>
              <strong>{event.title}</strong>
              <small>{event.date}{event.startTime ? ` · ${event.startTime}` : ' · All day'}</small>
            </div>
          </div>)}
        </div>
      }

      const payload = stalePayload(paneArgs)
      return <div className="pulse-pane-body">
        {payload.notice && <p className="pulse-note">{payload.notice}</p>}
        {payload.rows.map((project) => <button
          type="button" className="pulse-pane-row pulse-pane-row-button" key={project.id}
          onClick={() => setSelectedId(project.id)}
        >
          <div>
            <strong>{project.name}</strong>
            <small>last moved {describeAge(project.lastActivity, now)}</small>
          </div>
        </button>)}
      </div>
    },
  }))

  return <section className="pulse-view" aria-labelledby="pulse-heading">
    <header className="view-header">
      <div>
        <p className="eyebrow">Projects / Pulse</p>
        <h2 id="pulse-heading">What has moved</h2>
        <p>The registry shows state and Flow shows task status. This shows motion — and what has stopped moving.</p>
      </div>
    </header>

    <div className="pulse-columns">
      <div className="pulse-projects" aria-label="Projects">
        {projects.length === 0 && <p className="empty-state">No projects in the registry yet.</p>}
        {grouped.map(([area, items]) => <div className="pulse-area" key={area}>
          <h3 className="pulse-area-heading">{area}</h3>
          {items.map((project) => <ProjectRow
            key={project.id} project={project} now={now}
            selected={project.id === selectedId} onSelect={toggleSelect}
          />)}
        </div>)}
      </div>

      <div className="pulse-stream">
        <form className="pulse-composer" onSubmit={submitComposer}>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            // The placeholder states the target, because it changes with selection.
            placeholder={selected ? `Add a task to ${selected.name}…` : 'Capture a thought…'}
            aria-label={selected ? `Add a task to ${selected.name}` : 'Capture a thought'}
          />
          <button type="submit" className="button coral" disabled={!draft.trim() || saving}>{saving ? 'Saving…' : 'Add'}</button>
        </form>
        {composerError && <p className="database-error" role="alert">{composerError}</p>}

        {/* Each failure gets its own visible message; none is swallowed. */}
        {activityError && <p className="database-error" role="alert">Could not load your activity: {activityError}</p>}
        {stream.failures.length > 0 && <p className="pulse-note" role="status">{describeFailures(stream.failures)}</p>}
        {logFailures > 0 && <p className="pulse-note" role="status">⚠️ {logFailures} action{logFailures === 1 ? " wasn't" : "s weren't"} logged this session.</p>}
        {stream.notice && <p className="pulse-note">{stream.notice}</p>}

        {stream.entries.length === 0
          ? <p className="empty-state">{describeEmptyStream(selected)}</p>
          : <ol className="pulse-entries">
            {stream.entries.map((entry) => <li className="pulse-entry" key={entry.id}>
              <div className="pulse-entry-head">
                <span className="pulse-entry-when">{formatEntryWhen(entry)}</span>
                <span className="pulse-entry-origin">{describeOrigin(entry, projects)}</span>
              </div>
              <p>{entry.summary}</p>
            </li>)}
          </ol>}

        {/* Never a silent cut. */}
        {stream.hidden > 0 && <p className="pulse-note">{stream.hidden} more not shown.</p>}

        <p className="pulse-footer">{footer.projects} project{footer.projects === 1 ? '' : 's'} · {footer.movedThisWeek} moved this week</p>
      </div>

      <SidePane
        label={selected ? selected.name : 'Portfolio'}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        collapsed={collapsed}
        onToggle={setCollapsed}
      />
    </div>
  </section>
}
