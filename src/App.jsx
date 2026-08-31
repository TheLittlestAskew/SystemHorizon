import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import { jobPipeline } from './jobPipeline'
import WarRoomView from './WarRoomView'
import './App.css'

const navItems = ['Horizon', 'Projects', 'Flow', 'Calendar', 'Career', 'Mirrors', 'Archive', 'Swift', 'Travel', 'War Room']

// Minimal line icons, hand-drawn in a thin-stroke/rounded-terminal style (not
// copied from any licensed set) - one per nav item, 24x24 viewBox, currentColor
// stroke so they pick up the existing nav-item/active color rules for free.
const navIcons = {
  Horizon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="11" r="5" /><line x1="3" y1="18" x2="21" y2="18" /></svg>,
  Projects: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" /></svg>,
  Flow: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="4" height="14" rx="1" /><rect x="10" y="5" width="4" height="9" rx="1" /><rect x="17" y="5" width="4" height="12" rx="1" /></svg>,
  Calendar: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="8" y1="3" x2="8" y2="7" /><line x1="16" y1="3" x2="16" y2="7" /></svg>,
  Career: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="12" rx="2" /><path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="3" y1="13" x2="21" y2="13" /></svg>,
  Mirrors: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 11a8 8 0 0 0-14.9-3.5" /><path d="M4 5v4h4" /><path d="M4 13a8 8 0 0 0 14.9 3.5" /><path d="M20 19v-4h-4" /></svg>,
  Archive: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8l3-4h12l3 4" /><rect x="3" y="8" width="18" height="12" rx="1" /><line x1="3" y1="8" x2="21" y2="8" /></svg>,
  Swift: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="18" r="2.4" /><circle cx="17" cy="16" r="2.4" /><path d="M9.4 18V6l10-2v12" /></svg>,
  Travel: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" /></svg>,
  'War Room': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" /></svg>,
}

const initialProjects = [
  { id: 'system-horizon', name: 'System Horizon', area: 'Ops & Infra', kind: 'app', status: 'Active', health: 'Yellow', tone: 'coral', metric: '10/15 views live', signal: 67, summary: 'The cross-device control panel for projects, return points, and the next true thing.', nextAction: 'Restore or locate the missing tayls-task-manager.jsx source.', details: ['Known trap: recurring strip is hardcoded.', 'Failed Flows is still unbuilt.', 'Future grocery page: maintain a needed/regular list, compare local Walmart, Kroger, and Publix prices, recommend the cheapest store per item, and show each store cart total.', 'Future grocery handoff: where retailer capabilities allow it, add the recommended items to the appropriate online carts.', 'Future desktop capture widget: accept quick brain-dumps and route each thought to its rightful System Horizon area.', 'Future repo and mirror health check: show GitHub repositories and designated local mirrors that have uncommitted work, unpushed commits, remote commits waiting locally, or unbanked handoffs.', 'Future private health organizer: track current prescriptions and refill dates, plus a running list of topics to raise with a doctor.', 'Future family gift notes: maintain family-member profiles with private Christmas gift ideas and related notes.', 'The missing JSX source stays visible until resolved.'] },
  { id: 'septentrion', name: 'Septentrion / Observatory', area: 'Ops & Infra', kind: 'app + vault', status: 'Active', health: 'Green', tone: 'cyan', metric: '5 panels · daily 07:30 task', signal: 88, summary: 'The mind palace: a Return Point that stays current from every repo handoff.', nextAction: 'Choose the jobs-Supabase connection and finish the HTML Embed path.', details: ['5 operational panels are shipped.', 'Daily generator task is scheduled for 07:30.', 'Repo feeds need a freshness check on the eventual live page.'] },
  { id: 'rectrix-caedere', name: 'Rectrix Caedere', area: 'Aftermath', kind: 'app + content', status: 'Active', health: 'Green', tone: 'cyan', metric: 'Live site + roll dashboard', signal: 86, summary: 'Campaign, public brand system, and the flagship creative-data product at rectrixcaedere.com.', nextAction: 'Confirm the latest roll-sync health and surface its freshness.', details: ['Oracle-deck product concept and brand assets belong here.', 'The historic prop-types black-screen bug is resolved.', 'Canonical name: campaign + brand + public site.'] },
  { id: 'aftermath-meridian', name: 'Aftermath Meridian', area: 'Aftermath', kind: 'app', status: 'Active', health: 'Yellow', tone: 'coral', metric: 'Spread · Court · Orrery', signal: 42, summary: 'The live roll-analytics website behind Rectrix Caedere and Dimension 20 data.', nextAction: 'Reconcile the diverged branch and six orphaned remote migrations.', details: ['Open: seed.sql line-30 quoting bug.', 'Browser extension is part of the product.', 'Aftermath Atlas is the Supabase data layer, not a duplicate project.'] },
  { id: 'sitl', name: 'Sky Is The Limit', area: 'Aftermath', kind: 'automation + archive', status: 'Active', health: 'Green', tone: 'cyan', metric: 'mp3 → note → approve', signal: 91, summary: 'The transcription pipeline that turns campaign audio into approved session notes.', nextAction: 'Check watcher status and clear the pending-approvals queue.', details: ['AssemblyAI custom spelling is part of the pipeline.', 'The scheduled watcher auto-starts.', 'This is the pattern cloned for Dimension 20.'] },
  { id: 'flowers-forget', name: 'Where The Flowers Forget', area: 'Aftermath', kind: 'archive', status: 'Paused', health: 'Yellow', tone: 'violet', metric: 'Season 02 integrated', signal: 48, summary: 'Campaign archive of transcripts, session notes, and roll logs.', nextAction: 'Keep the archive parked until the next season or import needs attention.', details: ['Season 02 is integrated into Aftermath Meridian.', 'Best future view: processed-versus-pending episode progress.', 'No live pipeline is needed while paused.'] },
  { id: 'ashfall-britannia', name: 'Ashfall Britannia', area: 'Aftermath', kind: 'archive', status: 'Active', health: 'Green', tone: 'cyan', metric: 'Player journal', signal: 76, summary: 'A campaign vault framed as your player journal, not campaign operations.', nextAction: 'Add the most recent session and character-note return point.', details: ['Your role is Player.', 'Taylor (DM) is a different Taylor.', 'Keep the page lighter than the analytics projects.'] },
  { id: 'pacts-power', name: 'Pacts & Power', area: 'Aftermath', kind: 'archive', status: 'Paused', health: 'Idle', tone: 'violet', metric: 'Vault synced', signal: 22, summary: 'A settled campaign vault with its audio cleanup and sync work complete.', nextAction: 'Leave parked unless the campaign resumes or retrieval is needed.', details: ['PAT → GCM sync work is complete.', 'No dashboard tile until it is active again.', 'This is a minimal archive, not a live system.'] },
  { id: 'dimension-20', name: 'Dimension 20 pipeline', area: 'Aftermath', kind: 'automation + archive', status: 'Active', health: 'Yellow', tone: 'coral', metric: 'Episode 1 proven · 2–17 pending', signal: 39, summary: 'A high-volume transcript-to-session-note pipeline feeding the Aftermath Atlas data layer.', nextAction: 'Process Episodes 2–17, then establish the campaign progress matrix.', details: ['24 campaigns and 225 transcripts are imported.', 'Reconciliation policy needs visible source notes.', 'Writes to Aftermath Atlas.'] },
  { id: 'career-ops', name: 'Resume & Job Hunting', area: 'Career', kind: 'automation', status: 'Active', health: 'Green', tone: 'cyan', metric: 'Tracker + weekly discovery', signal: 84, summary: 'The job-search command center: applications, resume variants, compliance, and next moves.', nextAction: 'Check this week’s three GA DOL work-search contacts.', details: ['Funnel: Discovered → Applied → Interview → Offer.', 'Recent scores include MAVEN 94% and NDI 84%.', 'Sunday and Friday GDOL toasts support the deadline.'] },
  { id: 'storybook-resume', name: 'Storybook Resume', area: 'Career', kind: 'app', status: 'Idea', health: 'Idle', tone: 'violet', metric: '9 scenes · 0/10 built', signal: 0, summary: 'A scroll-snap resume built as a career journey, with an Among Trees design DNA.', nextAction: 'Choose the first of the committed ten build tasks when capacity opens.', details: ['The nine-scene storyboard exists.', 'The 10-task plan is committed.', 'Nothing is built yet, so this stays out of Horizon.'] },
  { id: 'nonprofit-power-platform', name: 'Nonprofit Power Platform', area: 'Career', kind: 'content / case study', status: 'Paused', health: 'Yellow', tone: 'coral', metric: '129 sanitized tr_ tables', signal: 55, summary: 'A public-safe case study of a six-area Power Platform build, designed without exposing private source data.', nextAction: 'Review the unmerged branches and decide whether to finish the public case-study merge.', details: ['Public repo contains zero PII.', 'Source-private and public-sanitized work stay separated.', 'This is for hiring-manager review, not a live operations tile.'] },
  { id: 'invisible-string-theory', name: 'Invisible String Theory', area: 'Swift', kind: 'intel', status: 'Active', health: 'Green', tone: 'cyan', metric: 'Signals + merch watch', signal: 79, summary: 'A Taylor Swift intelligence project for Easter eggs, merch, and evidence-backed next-move predictions.', nextAction: 'Review the newest Swiftwatch detection against the prediction log.', details: ['Signal library includes song-title source notes.', 'Merch tracker separates available, wishlist, and owned.', 'Swiftwatch is the sensor; this is the analyst.'] },
  { id: 'swiftwatch', name: 'Swiftwatch', area: 'Swift', kind: 'intel / monitor', status: 'Active', health: 'Green', tone: 'cyan', metric: '2 watches · chain verified', signal: 90, summary: 'A local change-detection monitor for the Taylor Swift store and taylorswift.com.', nextAction: 'Verify the two watch freshness timestamps after the next notification cycle.', details: ['Store checks every 30 minutes; site checks every 2 hours.', 'changedetection → Apprise → ntfy → BurntToast is verified.', 'Duplicate-toast bug was fixed.'] },
  { id: 'fantasy-football', name: 'Fantasy Football', area: 'Learning', kind: 'app + learning', status: 'Active', health: 'Yellow', tone: 'violet', metric: 'ESPN league tracker', signal: 45, summary: 'A season-long ESPN league tracker that doubles as a guided coding project.', nextAction: 'Verify the product scope, then make the next feature checklist concrete.', details: ['The app is both a tool and a learning vehicle.', 'GitHub access and guided practice are recent work.', 'Keep learning goals visible alongside build progress.'] },
  { id: 'learn-javascript', name: 'Learn JavaScript', area: 'Learning', kind: 'learning', status: 'Active', health: 'Idle', tone: 'violet', metric: 'Ongoing skill track', signal: 30, summary: 'The deliberate JavaScript practice track behind the apps you are learning to build and maintain.', nextAction: 'Log the next concept or exercise as a visible return point.', details: ['Self-rated as beginner, with strong editing and systems instincts.', 'Future view: concepts learned, exercises, and consistency.', 'Optional home tile only if a study streak becomes useful.'] },
]

function projectFromRow(row) {
  return { id: row.id, name: row.name, area: row.area, kind: row.kind ?? 'project', status: row.status, health: row.health, tone: row.health === 'Green' ? 'cyan' : row.health === 'Yellow' || row.health === 'Red' ? 'coral' : 'violet', metric: row.metric_value ?? 'No metric yet', signal: row.signal ?? 0, summary: row.description ?? 'No description yet.', nextAction: row.next_action ?? 'Choose the next honest move.', details: row.notes ?? [] }
}

function projectToRow(project) {
  return { name: project.name, description: project.summary, area: project.area, status: project.status, kind: project.kind, health: project.health, metric_value: project.metric, next_action: project.nextAction, notes: project.details, signal: project.signal, last_activity: new Date().toISOString() }
}

function taskFromRow(row) {
  return { id: row.id, projectId: row.project_id, name: row.name, status: row.status, notes: row.notes ?? '', createdAt: row.created_at, completedAt: row.completed_at }
}

function taskToRow(task) {
  return { project_id: task.projectId ?? null, name: task.name, status: task.status, notes: task.notes || null }
}

function eventFromRow(row) {
  return { id: row.id, projectId: row.project_id, title: row.title, date: row.event_date, startTime: row.start_time, endTime: row.end_time, notes: row.notes ?? '' }
}

function eventToRow(event) {
  return { project_id: event.projectId ?? null, title: event.title, event_date: event.date, start_time: event.startTime || null, end_time: event.endTime || null, notes: event.notes || null }
}

function repoHealthFromRow(row) {
  return { id: row.id, repoName: row.repo_name, localPath: row.local_path, hasLocalMirror: row.has_local_mirror, uncommittedCount: row.uncommitted_count, aheadCount: row.ahead_count, behindCount: row.behind_count, localHeadSha: row.local_head_sha, localHeadAt: row.local_head_at, remoteHeadSha: row.remote_head_sha, lastHandoffAt: row.last_handoff_at, checkError: row.check_error, checkedAt: row.checked_at }
}

function swiftWatchFromRow(row) {
  return { id: row.id, watchName: row.watch_name, url: row.url, intervalMinutes: row.interval_minutes, lastCheckedAt: row.last_checked_at, lastChangedAt: row.last_changed_at, changeCount: row.change_count, status: row.status, lastError: row.last_error, notes: row.notes }
}

function swiftCollectionFromRow(row) {
  return { id: row.id, itemName: row.item_name, category: row.category, era: row.era, variant: row.variant, status: row.status, priority: row.priority, priceCents: row.price_cents, currency: row.currency, url: row.url, imageUrl: row.image_url, acquiredOn: row.acquired_on, quantity: row.quantity, notes: row.notes }
}

function swiftCollectionToRow(item) {
  return { item_name: item.itemName, category: item.category || null, era: item.era || null, variant: item.variant || null, status: item.status || 'wishlist', priority: item.priority ?? 3, price_cents: item.priceCents ?? null, currency: item.currency || 'USD', url: item.url || null, image_url: item.imageUrl || null, acquired_on: item.acquiredOn || null, quantity: item.quantity ?? 1, notes: item.notes || null }
}

function swiftEventFromRow(row) {
  return { id: row.id, title: row.title, date: row.event_date, kind: row.kind, era: row.era, recurring: row.recurring, significance: row.significance, predicted: row.predicted, confidence: row.confidence, source: row.source, notes: row.notes }
}

function swiftEventToRow(event) {
  return { title: event.title, event_date: event.date || null, kind: event.kind || null, era: event.era || null, recurring: !!event.recurring, significance: event.significance ?? 3, predicted: !!event.predicted, confidence: event.predicted && event.confidence != null ? event.confidence : null, source: event.source || null, notes: event.notes || null }
}

function formatSwiftPrice(cents, currency) {
  if (cents == null) return null
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(cents / 100)
  } catch {
    return `$${(cents / 100).toFixed(2)}`
  }
}

function travelFromRow(row) {
  return { id: row.id, tripName: row.trip_name, route: row.route, departDate: row.depart_date, returnDate: row.return_date, priceCents: row.price_cents, currency: row.currency, checkedOn: row.checked_on, notes: row.notes }
}

function travelToRow(entry) {
  return { trip_name: entry.tripName, route: entry.route || null, depart_date: entry.departDate || null, return_date: entry.returnDate || null, price_cents: entry.priceCents, currency: entry.currency || 'USD', checked_on: entry.checkedOn, notes: entry.notes || null }
}

function Button({ tone = 'quiet', className = '', children, ...props }) {
  return <button className={`button ${tone} ${className}`} {...props}>{children}</button>
}

function Signal({ tone = 'cyan' }) {
  return <span className={`signal ${tone}`} aria-hidden="true" />
}

function DateReadout() {
  const date = new Date()
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date)
  const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date)

  return <div className="date-readout" aria-label={`${weekday}, ${month} ${date.getDate()}`}>
    <span>{weekday}</span>
    <strong>{String(date.getDate()).padStart(2, '0')}</strong>
    <small>{month}</small>
  </div>
}

function DotMatrix({ completed = 18, total = 35 }) {
  const safeTotal = Math.max(1, total)
  const safeCompleted = Math.min(Math.max(0, completed), safeTotal)

  return <div className="dot-matrix" aria-label={`${safeCompleted} of ${safeTotal} days complete`}>
    {Array.from({ length: safeTotal }, (_, index) => <span className={index < safeCompleted ? 'complete' : ''} key={index} />)}
  </div>
}

function ProjectRegistry({ projects, selectedProjectId, onSelectProject, onAddProject, onSeedProjects, onOpenProject }) {
  const [filter, setFilter] = useState('All')
  const [isAdding, setIsAdding] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [formError, setFormError] = useState('')
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0]
  const visibleProjects = filter === 'All' ? projects : projects.filter((project) => project.status === filter)

  async function submitProject(event) {
    event.preventDefault()
    const cleanName = projectName.trim()
    if (!cleanName) {
      setFormError('Give the project a name first.')
      return
    }
    if (projects.some((project) => project.name.toLowerCase() === cleanName.toLowerCase())) {
      setFormError('That project is already in the registry.')
      return
    }
    const id = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    if (!id) {
      setFormError('Use at least one letter or number in the name.')
      return
    }
    try {
      await onAddProject({ name: cleanName, area: 'Unsorted', kind: 'project', status: 'Idea', health: 'Idle', tone: 'violet', metric: 'No metric yet', summary: 'A newly registered project awaiting its first useful description.', nextAction: 'Add a clear purpose and first return point.', details: ['Add the work this project represents.', 'Choose the one next action that makes it real.'], signal: 12 })
      setProjectName('')
      setFormError('')
      setIsAdding(false)
    } catch (error) {
      setFormError(error.message || 'The project could not be saved.')
    }
  }

  return <section className="registry-view" aria-labelledby="registry-heading">
    <header className="view-header">
      <div>
        <p className="eyebrow">System index / 02</p>
        <h2 id="registry-heading">Project registry</h2>
        <p>Sixteen real systems, archives, and experiments. Every one has an honest next move.</p>
      </div>
      <Button tone="coral" onClick={() => setIsAdding((open) => !open)}>{isAdding ? 'Close panel' : 'Add project'}</Button>
    </header>

    {isAdding && <form className="new-project-form" onSubmit={submitProject}>
      <label htmlFor="new-project-name">Name the work you are balancing</label>
      <div>
        <input id="new-project-name" value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Project name" autoFocus />
        <Button tone="coral" type="submit">Register</Button>
      </div>
      {formError && <p role="alert">{formError}</p>}
    </form>}

    <div className="registry-controls" role="group" aria-label="Filter projects by status">
      {['All', 'Active', 'Paused', 'Idea'].map((option) => <button className={filter === option ? 'selected' : ''} key={option} type="button" onClick={() => setFilter(option)}>{option}</button>)}
    </div>

    <div className="registry-layout">
      <div className="registry-list" aria-label="Registered projects">
        {visibleProjects.map((project) => <button className={selectedProject?.id === project.id ? 'registry-row selected' : 'registry-row'} key={project.id} type="button" onClick={() => onSelectProject(project.id)}>
          <Signal tone={project.tone} />
          <span><strong>{project.name}</strong><small>{project.area} · {project.metric}</small></span>
          <b>{project.status}</b>
        </button>)}
        {visibleProjects.length === 0 && <div className="empty-state"><p>No project records yet.</p><Button tone="coral" type="button" onClick={onSeedProjects}>Load portfolio registry</Button></div>}
      </div>
      {selectedProject && <article className="project-inspector" aria-live="polite">
        <div className="inspector-topline"><span>{selectedProject.area} · {selectedProject.kind}</span><span>{selectedProject.health} health</span></div>
        <h3>{selectedProject.name}</h3>
        <p>{selectedProject.summary}</p>
        <div className="signal-meter"><span style={{ width: `${selectedProject.signal}%` }} /></div>
        <dl>
          <div><dt>State</dt><dd><Signal tone={selectedProject.tone} /> {selectedProject.status}</dd></div>
          <div><dt>Headline</dt><dd>{selectedProject.metric}</dd></div>
          <div><dt>Next action</dt><dd>{selectedProject.nextAction}</dd></div>
        </dl>
        <section className="project-detail-notes" aria-label={`${selectedProject.name} project notes`}>
          <span>Field notes</span>
          <ul>{selectedProject.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
        </section>
        <Button tone="coral" className="open-project-page" type="button" onClick={() => onOpenProject(selectedProject.id)}>Open project page</Button>
      </article>}
    </div>
  </section>
}

function TaskRow({ task, projectName, onStatusChange, onDelete }) {
  return <article className="task-row">
    <div><strong>{task.name}</strong>{projectName ? <span>{projectName}</span> : null}{task.notes ? <small>{task.notes}</small> : null}</div>
    <div className="task-controls">
      <select aria-label={`Status for ${task.name}`} value={task.status} onChange={(event) => onStatusChange(task.id, event.target.value)}>
        {['Active', 'Waiting', 'Parked', 'Done'].map((status) => <option key={status} value={status}>{status}</option>)}
      </select>
      <button type="button" onClick={() => onDelete(task.id)} aria-label={`Delete ${task.name}`}>×</button>
    </div>
  </article>
}

function ProjectDetailView({ project, tasks, onBack, onAddTask, onUpdateTaskStatus, onDeleteTask }) {
  const [taskName, setTaskName] = useState('')
  const projectTasks = tasks.filter((task) => task.projectId === project.id)
  const openTasks = projectTasks.filter((task) => task.status !== 'Done')
  const doneTasks = projectTasks.filter((task) => task.status === 'Done')

  function submitTask(event) {
    event.preventDefault()
    const cleanName = taskName.trim()
    if (!cleanName) return
    onAddTask({ projectId: project.id, name: cleanName, status: 'Active', notes: '' })
    setTaskName('')
  }

  return <section className="project-page" aria-labelledby="project-page-heading">
    <button className="back-link" type="button" onClick={onBack}>← Back to registry</button>
    <header className="view-header project-page-header">
      <div>
        <p className="eyebrow">{project.area} · {project.kind}</p>
        <h2 id="project-page-heading">{project.name}</h2>
        <p>{project.summary}</p>
      </div>
      <div className="project-page-badges"><span><Signal tone={project.tone} /> {project.status}</span><span>{project.health} health</span></div>
    </header>
    <div className="signal-meter"><span style={{ width: `${project.signal}%` }} /></div>
    <div className="project-page-grid">
      <article className="career-panel"><span>Next action</span><p>{project.nextAction}</p></article>
      <article className="career-panel"><span>Headline</span><p>{project.metric}</p></article>
    </div>
    <section className="project-page-notes" aria-label={`${project.name} field notes`}>
      <span>Field notes</span>
      <ul>{project.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
    </section>
    <section className="task-board" aria-label={`${project.name} tasks`}>
      <div className="instrument-heading"><span>Tasks</span><b>{openTasks.length} open</b></div>
      <form className="task-form" onSubmit={submitTask}>
        <input value={taskName} onChange={(event) => setTaskName(event.target.value)} placeholder="Add a task for this project" />
        <Button tone="coral" type="submit">Add</Button>
      </form>
      <div className="task-list">
        {openTasks.length ? openTasks.map((task) => <TaskRow key={task.id} task={task} onStatusChange={onUpdateTaskStatus} onDelete={onDeleteTask} />) : <p className="empty-state">No open tasks. Add the first one above.</p>}
      </div>
      {doneTasks.length > 0 && <details className="task-done-list"><summary>{doneTasks.length} done</summary>{doneTasks.map((task) => <TaskRow key={task.id} task={task} onStatusChange={onUpdateTaskStatus} onDelete={onDeleteTask} />)}</details>}
    </section>
  </section>
}

// GDOL weeks end on Saturday. Mirrors Septentrion's dashboard/collectors/jobs.js
// so the two panels agree on what "this week" and "last week" mean.
function gdolWeekEnding(now = new Date()) {
  const d = new Date(now)
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7))
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function gdolWeekWindow(weekEnding) {
  const end = new Date(`${weekEnding}T00:00:00Z`)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - 6)
  return { start: start.toISOString().slice(0, 10), end: weekEnding }
}

function shiftDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function inGdolWindow(dateStr, win) {
  return !!dateStr && dateStr >= win.start && dateStr <= win.end
}

const A_RATED_STATUS = new Set(['Discovered', 'Saved'])
const UNREPORTED_STATUS = new Set(['Applied', 'Interview'])

function CareerView({ jobs, jobError }) {
  const now = new Date()
  const weekEnding = gdolWeekEnding(now)
  const thisWeek = gdolWeekWindow(weekEnding)
  const prevWeek = gdolWeekWindow(shiftDays(weekEnding, -7))
  const today = now.toISOString().slice(0, 10)

  const weeklyContacts = jobs.filter((job) => inGdolWindow(job.ws_activity_date, thisWeek)).length
  const appliedThisWeek = jobs.filter((job) => inGdolWindow(job.submitted, thisWeek) || inGdolWindow(job.ws_activity_date, thisWeek)).length
  const unreportedLastWeek = jobs.filter((job) => UNREPORTED_STATUS.has(job.status) && job.ws_reported === false && inGdolWindow(job.ws_activity_date, prevWeek)).length
  const aRated = jobs
    .filter((job) => typeof job.match_percent === 'number' && job.match_percent >= 85 && A_RATED_STATUS.has(job.status) && (!job.deadline || job.deadline >= today))
    .sort((a, b) => b.match_percent - a.match_percent)
  const activeJobs = jobs.filter((job) => !['Rejected', 'Archived', 'Withdrawn'].includes(job.status))
  const safeUrl = (url) => { try { const parsed = new URL(url); return ['http:', 'https:'].includes(parsed.protocol) ? url : '' } catch { return '' } }

  return <section className="career-view" aria-labelledby="career-heading"><header className="view-header"><div><p className="eyebrow">Career operations / 05</p><h2 id="career-heading">Job search field</h2><p>Live readout from the Claude Code job pipeline. Update jobs through that workflow, not this dashboard.</p></div></header>{jobError ? <p className="database-error" role="alert">Job pipeline error: {jobError}</p> : <>{unreportedLastWeek > 0 && <p className="database-error" role="alert">{unreportedLastWeek} work-search contact{unreportedLastWeek === 1 ? '' : 's'} from last week still {unreportedLastWeek === 1 ? 'needs' : 'need'} to be reported to GA DOL.</p>}<div className="career-grid"><article className="career-panel compliance-panel"><span>This week’s work search</span><strong>{weeklyContacts}<small>/3 contacts</small></strong><p>{weeklyContacts >= 3 ? 'GA DOL contact requirement met for this week.' : `${3 - weeklyContacts} more contact${3 - weeklyContacts === 1 ? '' : 's'} needed this week.`}</p><p className="career-source">{appliedThisWeek} application{appliedThisWeek === 1 ? '' : 's'} logged this week · Source: Claude Code → dashboard_jobs</p></article><article className="career-panel"><span>Active applications</span><strong>{activeJobs.length}</strong><p>Live pipeline data, without a second System Horizon tracker.</p><div className="career-statuses">{['Discovered', 'Docs Created', 'Applied', 'Interview'].map((status) => <div key={status}><small>{status}</small><b>{jobs.filter((job) => job.status === status).length}</b></div>)}</div></article></div><div className="career-workbench">{aRated.length > 0 && <section className="application-list" aria-label="A-rated leads"><div className="instrument-heading"><span>A-rated leads (≥85% match, still open)</span><b>{aRated.length}</b></div>{aRated.map((job) => { const postUrl = safeUrl(job.post_url); return <article key={job.id}><div><strong>{job.title || 'Untitled role'}</strong><span>{job.organization || 'Organization unknown'}{job.location ? ` · ${job.location}` : ''}</span><small>{job.recommendation ? `${job.recommendation} recommendation` : 'No recommendation yet'}{job.deadline ? ` · Due ${job.deadline}` : ''}</small></div><div className="application-status"><b>{job.status || 'Unknown'}</b><small>{job.match_percent}% match</small>{postUrl ? <a href={postUrl} target="_blank" rel="noreferrer">Open posting</a> : null}</div></article> })}</section>}<section className="application-list" aria-label="Applications"><div className="instrument-heading"><span>Automated application pipeline</span><b>{jobs.length}</b></div>{jobs.length ? jobs.map((job) => { const postUrl = safeUrl(job.post_url); return <article key={job.id}><div><strong>{job.title || 'Untitled role'}</strong><span>{job.organization || 'Organization unknown'}{job.location ? ` · ${job.location}` : ''}</span><small>{job.recommendation ? `${job.recommendation} recommendation` : 'No recommendation yet'}{job.deadline ? ` · Due ${job.deadline}` : ''}</small></div><div className="application-status"><b>{job.status || 'Unknown'}</b>{typeof job.match_percent === 'number' ? <small>{job.match_percent}% match</small> : null}{postUrl ? <a href={postUrl} target="_blank" rel="noreferrer">Open posting</a> : null}</div></article> }) : <p className="empty-state">No jobs are currently visible in the pipeline.</p>}</section></div></>}</section>
}

function AccessGate() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isWorking, setIsWorking] = useState(false)

  async function submit(mode) {
    setMessage('')
    if (!email.trim() || password.length < 8) {
      setMessage('Use your email and a password of at least 8 characters.')
      return
    }
    setIsWorking(true)
    const result = mode === 'signup' ? await supabase.auth.signUp({ email: email.trim(), password }) : await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setIsWorking(false)
    setMessage(result.error ? result.error.message : mode === 'signup' && !result.data.session ? 'Check your email to confirm the account, then sign in.' : '')
  }

  return <main className="access-gate"><div><p className="eyebrow">Private system access</p><h1>System Horizon</h1><p>Your project and career data is owner-only in Supabase.</p><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /></label><div><Button tone="coral" type="button" disabled={isWorking} onClick={() => submit('signin')}>Sign in</Button><Button type="button" disabled={isWorking} onClick={() => submit('signup')}>Create account</Button></div>{message && <p role="alert">{message}</p>}</div></main>
}

function Horizon({ projects, onProjects }) {
  const [capture, setCapture] = useState('')
  const [captures, setCaptures] = useState([])
  const [focusDone, setFocusDone] = useState(false)
  const [capacity, setCapacity] = useState('Steady')

  function saveCapture(event) {
    event.preventDefault()
    const nextCapture = capture.trim()
    if (!nextCapture) return
    setCaptures((current) => [nextCapture, ...current])
    setCapture('')
  }

  return <>
    <section className="horizon-stage" aria-labelledby="today-heading">
      <div className="topographic-field" aria-hidden="true"><span /><span /><span /><span /></div>
      <div className="stage-topline"><span>Horizon / live map</span><span><Signal /> Systems nominal</span></div>
      <div className="stage-copy">
        <p className="eyebrow">Today’s operating cue</p>
        <h2 id="today-heading">Choose the next<br />true thing.</h2>
        <p>One clear move is enough to alter the whole field.</p>
      </div>
      <div className="focus-console">
        <div><span>Primary vector</span><strong>{focusDone ? 'Vector complete' : 'Define the first System Horizon data model.'}</strong><small>{focusDone ? 'The system has a new return point.' : 'Projects, moving parts, state, then next action.'}</small></div>
        <Button tone={focusDone ? 'quiet' : 'coral'} onClick={() => setFocusDone((done) => !done)}>{focusDone ? 'Reopen' : 'Mark done'}</Button>
      </div>
      <div className="stage-coordinate">041° 28′ / field depth</div>
    </section>

    <section className="instrument-grid" aria-label="Horizon modules">
      <article className="instrument capacity-instrument">
        <div className="instrument-heading"><span>Capacity / now</span><b>01</b></div>
        <div className="capacity-reading"><strong>{capacity}</strong><small>{capacity === 'Light' ? 'Make the next move small.' : capacity === 'High focus' ? 'Protect a meaningful build block.' : 'Enough room for a deep block.'}</small></div>
        <div className="segmented-control" role="group" aria-label="Set current capacity">
          {['Light', 'Steady', 'High focus'].map((option) => <button className={capacity === option ? 'selected' : ''} key={option} type="button" onClick={() => setCapacity(option)}>{option}</button>)}
        </div>
      </article>

      <article className="instrument time-instrument">
        <div className="instrument-heading"><span>Cycle remaining</span><b>02</b></div>
        <div className="day-counter"><strong>232</strong><span>days left in 2026</span></div>
        <DotMatrix completed={18} total={35} />
      </article>

      <article className="instrument project-instrument">
        <div className="instrument-heading"><span>Project radar</span><button type="button" onClick={onProjects}>Open registry</button></div>
        <div className="project-radar-list">
          {projects.map((project) => <button key={project.id} type="button" onClick={onProjects}><Signal tone={project.tone} /><span>{project.name}</span><small>{project.status}</small><i style={{ '--signal': `${project.signal}%` }} /></button>)}
        </div>
      </article>

      <article className="instrument capture-instrument">
        <div className="instrument-heading"><span>Quick capture</span><b>04</b></div>
        <form onSubmit={saveCapture}>
          <label htmlFor="quick-capture">Loose thread, task, or thought</label>
          <div><input id="quick-capture" value={capture} onChange={(event) => setCapture(event.target.value)} placeholder="Catch it before it evaporates" /><Button tone="coral" type="submit">Save</Button></div>
        </form>
        <p className={captures.length ? 'capture-confirmed' : 'capture-note'}>{captures.length ? `${captures.length} ${captures.length === 1 ? 'item' : 'items'} captured. It has a home.` : 'Do not solve the whole thing here.'}</p>
      </article>
    </section>
  </>
}

function FlowView({ tasks, projects, onOpenProjects, onAddTask, onUpdateTaskStatus, onDeleteTask }) {
  const [taskName, setTaskName] = useState('')
  const [taskProjectId, setTaskProjectId] = useState('')
  const columns = ['Active', 'Waiting', 'Parked', 'Done']
  const projectName = (id) => projects.find((project) => project.id === id)?.name

  function submitTask(event) {
    event.preventDefault()
    const cleanName = taskName.trim()
    if (!cleanName) return
    onAddTask({ projectId: taskProjectId || null, name: cleanName, status: 'Active', notes: '' })
    setTaskName('')
  }

  return <section className="flow-view" aria-labelledby="flow-heading">
    <header className="view-header">
      <div><p className="eyebrow">System index / 03</p><h2 id="flow-heading">Flow board</h2><p>Every open thread across every project, sorted by what state it is actually in.</p></div>
      <Button tone="coral" onClick={onOpenProjects}>Open registry</Button>
    </header>
    <form className="flow-quick-add" onSubmit={submitTask}>
      <input value={taskName} onChange={(event) => setTaskName(event.target.value)} placeholder="New task or thread" />
      <select aria-label="Attach to project" value={taskProjectId} onChange={(event) => setTaskProjectId(event.target.value)}>
        <option value="">No project</option>
        {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
      </select>
      <Button tone="coral" type="submit">Add to flow</Button>
    </form>
    <div className="flow-columns">
      {columns.map((status) => {
        const columnTasks = tasks.filter((task) => task.status === status)
        return <div className={`flow-column${status === 'Active' ? ' flow-column-active' : ''}`} key={status}>
          <div className="instrument-heading"><span>{status}</span><b>{columnTasks.length}</b></div>
          <div className="flow-column-list">
            {columnTasks.length ? columnTasks.map((task) => <TaskRow key={task.id} task={task} projectName={projectName(task.projectId)} onStatusChange={onUpdateTaskStatus} onDelete={onDeleteTask} />) : <p className="empty-state">Nothing here.</p>}
          </div>
        </div>
      })}
    </div>
  </section>
}

function CalendarView({ events, projects, tasks, onAddEvent, onDeleteEvent, onUpdateTaskStatus, onDeleteTask }) {
  const [mode, setMode] = useState('Agenda')
  const [cursor, setCursor] = useState(() => { const date = new Date(); date.setDate(1); return date })
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [isAdding, setIsAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [time, setTime] = useState('')

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(cursor)
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = [...Array.from({ length: firstWeekday }, () => null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)]
  const dateKey = (day) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const eventsFor = (dateStr) => events.filter((event) => event.date === dateStr)
  const projectName = (id) => projects.find((project) => project.id === id)?.name
  const todayKey = new Date().toISOString().slice(0, 10)

  const upcomingEvents = [...events]
    .filter((event) => event.date >= todayKey)
    .sort((a, b) => a.date === b.date ? (a.startTime || '').localeCompare(b.startTime || '') : (a.date < b.date ? -1 : 1))
  const eventGroups = []
  for (const event of upcomingEvents) {
    const last = eventGroups[eventGroups.length - 1]
    if (last && last.date === event.date) last.items.push(event)
    else eventGroups.push({ date: event.date, label: new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' }).format(new Date(`${event.date}T00:00:00`)), items: [event] })
  }
  const activeEvent = upcomingEvents.find((event) => event.id === selectedEventId) ?? upcomingEvents[0] ?? null
  const openTasks = [...tasks].filter((task) => task.status !== 'Done').sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))

  function shiftMonth(delta) {
    const next = new Date(cursor)
    next.setMonth(next.getMonth() + delta)
    setCursor(next)
  }

  function submitEvent(event) {
    event.preventDefault()
    const cleanTitle = title.trim()
    if (!cleanTitle) return
    onAddEvent({ title: cleanTitle, date: selectedDate, startTime: time.trim() || null, endTime: null, projectId: null, notes: '' })
    setTitle('')
    setTime('')
    setIsAdding(false)
  }

  const eventForm = isAdding && <form className="event-form" onSubmit={submitEvent}>
    <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} aria-label="Event date" />
    <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="New event" autoFocus />
    <input value={time} onChange={(event) => setTime(event.target.value)} placeholder="10:00 AM" />
    <Button tone="coral" type="submit">Add</Button>
  </form>

  const detailPanel = <div className="calendar-detail-panel">
    {activeEvent ? <>
      <span className="calendar-detail-date">{new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(`${activeEvent.date}T00:00:00`))}{activeEvent.startTime ? ` · ${activeEvent.startTime}` : ''}</span>
      <h3>{activeEvent.title}</h3>
      {activeEvent.projectId ? <p className="calendar-detail-project">{projectName(activeEvent.projectId)}</p> : null}
      {activeEvent.notes ? <p>{activeEvent.notes}</p> : null}
      <Button type="button" onClick={() => onDeleteEvent(activeEvent.id)}>Delete event</Button>
    </> : <p className="empty-state">No upcoming events. Add one to see it here.</p>}
  </div>

  return <section className="calendar-view" aria-labelledby="calendar-heading">
    <header className="view-header">
      <div><p className="eyebrow">System index / 04</p><h2 id="calendar-heading">Calendar field</h2><p>Commitments, build blocks, and the space around them.</p></div>
    </header>

    <div className="registry-controls calendar-mode-toggle" role="group" aria-label="Calendar view mode">
      {['Agenda', 'Month'].map((option) => <button className={mode === option ? 'selected' : ''} key={option} type="button" onClick={() => setMode(option)}>{option}</button>)}
    </div>

    {mode === 'Agenda' ? <div className="calendar-layout">
      <div className="calendar-side">
        <div className="month-nav"><button type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month">‹</button><span>{monthLabel}</span><button type="button" onClick={() => shiftMonth(1)} aria-label="Next month">›</button></div>
        <div className="calendar-grid" role="grid" aria-label={monthLabel}>
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((label) => <div className="calendar-weekday" key={label}>{label}</div>)}
          {cells.map((day, index) => {
            if (day === null) return <div className="calendar-cell empty" key={`empty-${index}`} />
            const dateStr = dateKey(day)
            const dayEvents = eventsFor(dateStr)
            return <button className={`calendar-cell${dateStr === selectedDate ? ' selected' : ''}${dateStr === todayKey ? ' today' : ''}`} key={dateStr} type="button" onClick={() => setSelectedDate(dateStr)}>
              <span>{day}</span>
              {dayEvents.length > 0 && <i aria-hidden="true">{dayEvents.length}</i>}
            </button>
          })}
        </div>
        <div className="calendar-task-list">
          <div className="instrument-heading"><span>Tasks</span><b>{openTasks.length}</b></div>
          <div className="calendar-task-rows">
            {openTasks.length ? openTasks.map((task) => <TaskRow key={task.id} task={task} projectName={projectName(task.projectId)} onStatusChange={onUpdateTaskStatus} onDelete={onDeleteTask} />) : <p className="empty-state">Nothing open.</p>}
          </div>
        </div>
      </div>

      <div className="calendar-events-column">
        <div className="calendar-events-header">
          <span>Upcoming</span>
          <Button tone="coral" type="button" onClick={() => setIsAdding((open) => !open)}>{isAdding ? 'Close' : 'Add event'}</Button>
        </div>
        {eventForm}
        <div className="calendar-event-groups">
          {eventGroups.length ? eventGroups.map((group) => <div className="calendar-date-group" key={group.date}>
            <div className="calendar-date-heading">{group.label}</div>
            {group.items.map((event) => <button key={event.id} type="button" className={`calendar-event-row${activeEvent?.id === event.id ? ' selected' : ''}`} onClick={() => setSelectedEventId(event.id)}>
              <span className="calendar-event-time">{event.startTime || '—'}</span>
              <span className="calendar-event-info"><strong>{event.title}</strong>{event.projectId ? <small>{projectName(event.projectId)}</small> : null}</span>
            </button>)}
          </div>) : <p className="empty-state">Nothing scheduled ahead. Add an event to see it here.</p>}
        </div>
      </div>

      {detailPanel}
    </div> : <div className="calendar-month-layout">
      <div className="calendar-month-main">
        <div className="calendar-month-toolbar">
          <div className="month-nav"><button type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month">‹</button><span>{monthLabel}</span><button type="button" onClick={() => shiftMonth(1)} aria-label="Next month">›</button></div>
          <Button tone="coral" type="button" onClick={() => setIsAdding((open) => !open)}>{isAdding ? 'Close' : 'Add event'}</Button>
        </div>
        {eventForm}
        <div className="calendar-month-grid" role="grid" aria-label={monthLabel}>
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((label) => <div className="calendar-weekday" key={label}>{label}</div>)}
          {cells.map((day, index) => {
            if (day === null) return <div className="calendar-month-cell empty" key={`empty-${index}`} />
            const dateStr = dateKey(day)
            const dayEvents = eventsFor(dateStr)
            const shown = dayEvents.slice(0, 2)
            const overflow = dayEvents.length - shown.length
            return <div className={`calendar-month-cell${dateStr === todayKey ? ' today' : ''}${dateStr === selectedDate ? ' selected' : ''}`} key={dateStr} role="gridcell" onClick={() => setSelectedDate(dateStr)}>
              <span className="calendar-month-day-num">{day}</span>
              <div className="calendar-month-events">
                {shown.map((event) => <button key={event.id} type="button" className={`calendar-month-event${activeEvent?.id === event.id ? ' selected' : ''}`} onClick={(clickEvent) => { clickEvent.stopPropagation(); setSelectedEventId(event.id) }}>{event.startTime ? `${event.startTime} ` : ''}{event.title}</button>)}
                {overflow > 0 && <span className="calendar-month-more">+{overflow} more</span>}
              </div>
            </div>
          })}
        </div>
      </div>
      {detailPanel}
    </div>}
  </section>
}

const ARCHIVE_REPOS = ['SystemHorizon', 'ashfall_vault', 'rectrixcaedere', 'taylorritchie', 'sitl_vault', 'pacts_power_vault']

function parseHandoffEntries(markdown, repo) {
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

function ArchiveView() {
  const [entries, setEntries] = useState([])
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let cancelled = false
    Promise.allSettled(ARCHIVE_REPOS.map((repo) =>
      fetch(`https://raw.githubusercontent.com/TheLittlestAskew/${repo}/main/HANDOFF.md`).then((response) => {
        if (!response.ok) throw new Error(`${repo}: HTTP ${response.status}`)
        return response.text()
      }).then((text) => parseHandoffEntries(text, repo))
    )).then((results) => {
      if (cancelled) return
      const merged = results.flatMap((result) => result.status === 'fulfilled' ? result.value : [])
      merged.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
      setEntries(merged.slice(0, 40))
      setStatus(merged.length ? 'ready' : 'empty')
    })
    return () => { cancelled = true }
  }, [])

  return <section className="archive-view" aria-labelledby="archive-heading">
    <header className="view-header"><div><p className="eyebrow">System index / 07</p><h2 id="archive-heading">Archive field</h2><p>Live pull of the most recent HANDOFF.md entries from every repo with handoff enabled.</p></div></header>
    {status === 'loading' && <p className="empty-state">Pulling repo handoffs…</p>}
    {status === 'empty' && <p className="database-error" role="alert">Could not read any HANDOFF.md files. Check network access to raw.githubusercontent.com.</p>}
    <div className="archive-feed">
      {entries.map((entry, index) => <article className="archive-entry" key={`${entry.repo}-${index}`}>
        <div className="archive-entry-meta"><b>{entry.repo}</b><span>{entry.timestamp}</span>{entry.source ? <span>{entry.source}</span> : null}</div>
        <p>{entry.summary}</p>
      </article>)}
    </div>
  </section>
}

function relativeTime(iso) {
  if (!iso) return 'never'
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.round(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

function repoStatusFlags(repo) {
  if (!repo.hasLocalMirror) return { flags: [repo.checkError || 'No local mirror on this machine'], tone: 'violet' }
  const flags = []
  if (repo.checkError) flags.push(repo.checkError)
  if (repo.uncommittedCount > 0) flags.push(`${repo.uncommittedCount} uncommitted change${repo.uncommittedCount === 1 ? '' : 's'}`)
  if (repo.aheadCount > 0) flags.push(`${repo.aheadCount} unpushed commit${repo.aheadCount === 1 ? '' : 's'}`)
  if (repo.behindCount > 0) flags.push(`${repo.behindCount} commit${repo.behindCount === 1 ? '' : 's'} behind remote`)
  if (repo.localHeadAt && repo.lastHandoffAt && repo.localHeadAt > repo.lastHandoffAt) flags.push('Unbanked handoff')
  return { flags, tone: flags.length ? 'coral' : 'cyan' }
}

function MirrorsView({ repoHealth }) {
  const rows = [...repoHealth].sort((a, b) => {
    const aFlags = repoStatusFlags(a).flags.length
    const bFlags = repoStatusFlags(b).flags.length
    if (aFlags !== bFlags) return bFlags - aFlags
    return a.repoName.localeCompare(b.repoName)
  })
  const flaggedCount = rows.filter((repo) => repoStatusFlags(repo).flags.length > 0).length

  return <section className="mirrors-view" aria-labelledby="mirrors-heading">
    <header className="view-header">
      <div>
        <p className="eyebrow">System index / 06</p>
        <h2 id="mirrors-heading">Mirror freshness</h2>
        <p>GitHub repos and local mirrors, checked for uncommitted work, unpushed commits, commits behind, and unbanked handoffs.</p>
      </div>
    </header>
    {rows.length > 0 && <div className="mirrors-summary">
      <div><span>Attention needed</span><p>{rows.length} repositor{rows.length === 1 ? 'y' : 'ies'} tracked across GitHub and local mirrors.</p></div>
      <strong className={flaggedCount === 0 ? 'clean' : ''}>{flaggedCount === 0 ? 'All clean' : flaggedCount}</strong>
    </div>}
    {rows.length === 0 && <p className="empty-state">No repo health data yet. Run the mirror-freshness sync script (scripts/mirror-freshness/) to populate this panel.</p>}
    <div className="mirrors-list">
      {rows.map((repo) => {
        const { flags, tone } = repoStatusFlags(repo)
        return <article className="mirror-row" key={repo.id}>
          <div className="mirror-row-heading">
            <Signal tone={tone} />
            <strong>{repo.repoName}</strong>
            <small>checked {relativeTime(repo.checkedAt)}</small>
          </div>
          {flags.length > 0
            ? <ul className="mirror-flags">{flags.map((flag) => <li key={flag}>{flag}</li>)}</ul>
            : <p className="mirror-clean">Clean — matches remote, nothing uncommitted, handoff banked.</p>}
        </article>
      })}
    </div>
  </section>
}

const SWIFT_COLLECTION_STATUSES = ['wishlist', 'owned', 'available', 'preorder', 'sold_out']
const SWIFT_COLLECTION_CATEGORIES = ['vinyl', 'cd', 'cassette', 'apparel', 'book', 'accessory', 'other']
const SWIFT_EVENT_KINDS = ['anniversary', 'release', 'tour', 'birthday', 'numerology', 'announcement', 'other']

function swiftWatchTone(status) {
  return status === 'ok' ? 'cyan' : status === 'stale' ? 'violet' : 'coral'
}

function SwiftWatchPanel({ watches }) {
  return <div className="swift-watch-list">
    {watches.length === 0 && <p className="empty-state">No Swiftwatch data yet. Run the Swiftwatch sync script on your machine to populate this panel — see the mirror-freshness sync in TheLittlestAskew/septentrion for the pattern to copy.</p>}
    {watches.map((watch) => <article className="mirror-row swift-watch-row" key={watch.id}>
      <div className="mirror-row-heading">
        <Signal tone={swiftWatchTone(watch.status)} />
        <strong>{watch.watchName}</strong>
        <small>checked {relativeTime(watch.lastCheckedAt)}</small>
      </div>
      <dl className="swift-watch-meta">
        <div><dt>Last change</dt><dd>{relativeTime(watch.lastChangedAt)}</dd></div>
        <div><dt>Changes seen</dt><dd>{watch.changeCount ?? 0}</dd></div>
        {watch.intervalMinutes ? <div><dt>Interval</dt><dd>{watch.intervalMinutes}m</dd></div> : null}
        {watch.url ? <div><dt>Target</dt><dd><a href={watch.url} target="_blank" rel="noreferrer">{watch.url}</a></dd></div> : null}
      </dl>
      {watch.lastError && <p className="swift-watch-error">{watch.lastError}</p>}
      {watch.notes && <p className="swift-watch-notes">{watch.notes}</p>}
    </article>)}
  </div>
}

function SwiftCollectionPanel({ items, onAdd, onUpdateStatus, onDelete }) {
  const [filter, setFilter] = useState('All')
  const [isAdding, setIsAdding] = useState(false)
  const [form, setForm] = useState({ itemName: '', category: 'vinyl', era: '', variant: '', status: 'wishlist', priority: 3, priceCents: '', url: '', notes: '' })
  const [formError, setFormError] = useState('')

  const visible = filter === 'All' ? items : items.filter((item) => item.status === filter)

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    const cleanName = form.itemName.trim()
    if (!cleanName) {
      setFormError('Give the item a name first.')
      return
    }
    try {
      await onAdd({
        itemName: cleanName,
        category: form.category,
        era: form.era.trim() || null,
        variant: form.variant.trim() || null,
        status: form.status,
        priority: Number(form.priority) || 3,
        priceCents: form.priceCents.trim() ? Math.round(Number(form.priceCents) * 100) : null,
        url: form.url.trim() || null,
        notes: form.notes.trim() || null,
      })
      setForm({ itemName: '', category: 'vinyl', era: '', variant: '', status: 'wishlist', priority: 3, priceCents: '', url: '', notes: '' })
      setFormError('')
      setIsAdding(false)
    } catch (error) {
      setFormError(error.message || 'The item could not be saved.')
    }
  }

  return <div className="swift-tab-panel">
    <div className="swift-panel-toolbar">
      <div className="registry-controls" role="group" aria-label="Filter collection by status">
        {['All', ...SWIFT_COLLECTION_STATUSES].map((option) => <button className={filter === option ? 'selected' : ''} key={option} type="button" onClick={() => setFilter(option)}>{option === 'All' ? 'All' : option.replace('_', ' ')}</button>)}
      </div>
      <Button tone="coral" type="button" onClick={() => setIsAdding((open) => !open)}>{isAdding ? 'Close' : 'Add item'}</Button>
    </div>

    {isAdding && <form className="swift-item-form" onSubmit={submit}>
      <input value={form.itemName} onChange={(event) => updateField('itemName', event.target.value)} placeholder="Item name" autoFocus />
      <select value={form.category} onChange={(event) => updateField('category', event.target.value)} aria-label="Category">
        {SWIFT_COLLECTION_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
      </select>
      <input value={form.era} onChange={(event) => updateField('era', event.target.value)} placeholder="Era (e.g. Folklore)" />
      <input value={form.variant} onChange={(event) => updateField('variant', event.target.value)} placeholder="Variant / pressing" />
      <select value={form.status} onChange={(event) => updateField('status', event.target.value)} aria-label="Status">
        {SWIFT_COLLECTION_STATUSES.map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}
      </select>
      <select value={form.priority} onChange={(event) => updateField('priority', event.target.value)} aria-label="Priority, 1 is grail, 5 is idle curiosity">
        {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n === 1 ? '1 · grail' : n === 5 ? '5 · idle' : n}</option>)}
      </select>
      <input value={form.priceCents} onChange={(event) => updateField('priceCents', event.target.value)} placeholder="Price (USD)" inputMode="decimal" />
      <input value={form.url} onChange={(event) => updateField('url', event.target.value)} placeholder="Link" />
      <input className="swift-item-notes" value={form.notes} onChange={(event) => updateField('notes', event.target.value)} placeholder="Notes" />
      <Button tone="coral" type="submit">Save item</Button>
      {formError && <p role="alert">{formError}</p>}
    </form>}

    <div className="swift-collection-list">
      {visible.length === 0 && <p className="empty-state">Nothing here yet.</p>}
      {visible.map((item) => <article className="swift-item-row" key={item.id}>
        <div>
          <strong>{item.itemName}</strong>
          <span>{item.category}{item.era ? ` · ${item.era}` : ''}{item.variant ? ` · ${item.variant}` : ''}</span>
          {formatSwiftPrice(item.priceCents, item.currency) && <small>{formatSwiftPrice(item.priceCents, item.currency)}</small>}
          {item.notes && <small>{item.notes}</small>}
        </div>
        <div className="task-controls">
          <select aria-label={`Status for ${item.itemName}`} value={item.status} onChange={(event) => onUpdateStatus(item.id, event.target.value)}>
            {SWIFT_COLLECTION_STATUSES.map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}
          </select>
          <button type="button" onClick={() => onDelete(item.id)} aria-label={`Delete ${item.itemName}`}>×</button>
        </div>
      </article>)}
    </div>
  </div>
}

function SwiftEventRow({ event, onDelete }) {
  return <article className="swift-event-row">
    <div>
      <strong>{event.title}</strong>
      <span>{event.date || 'No date'} · {event.kind}{event.recurring ? ' · annual' : ''}</span>
      {event.source && <small>Source: {event.source}</small>}
      {event.notes && <small>{event.notes}</small>}
    </div>
    <div className="swift-event-badge-group">
      {event.predicted ? <span className="swift-badge predicted">Predicted{typeof event.confidence === 'number' ? ` · ${event.confidence}%` : ''}</span> : <span className="swift-badge logged">Logged</span>}
      <button type="button" onClick={() => onDelete(event.id)} aria-label={`Delete ${event.title}`}>×</button>
    </div>
  </article>
}

function SwiftEventsPanel({ events, onAdd, onDelete }) {
  const [isAdding, setIsAdding] = useState(false)
  const [form, setForm] = useState({ title: '', date: '', kind: 'anniversary', recurring: false, predicted: false, confidence: '', source: '', notes: '' })
  const [formError, setFormError] = useState('')
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = events.filter((event) => !event.date || event.date >= today)
  const past = events.filter((event) => event.date && event.date < today)

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    const cleanTitle = form.title.trim()
    if (!cleanTitle) {
      setFormError('Give the event a title first.')
      return
    }
    try {
      await onAdd({
        title: cleanTitle,
        date: form.date || null,
        kind: form.kind,
        recurring: form.recurring,
        predicted: form.predicted,
        confidence: form.predicted && form.confidence.trim() ? Number(form.confidence) : null,
        source: form.source.trim() || null,
        notes: form.notes.trim() || null,
      })
      setForm({ title: '', date: '', kind: 'anniversary', recurring: false, predicted: false, confidence: '', source: '', notes: '' })
      setFormError('')
      setIsAdding(false)
    } catch (error) {
      setFormError(error.message || 'The event could not be saved.')
    }
  }

  return <div className="swift-tab-panel">
    <div className="swift-panel-toolbar">
      <p className="swift-panel-note">Forecasts and logged dates stay visually distinct — a guess never renders as a fact.</p>
      <Button tone="coral" type="button" onClick={() => setIsAdding((open) => !open)}>{isAdding ? 'Close' : 'Add event'}</Button>
    </div>

    {isAdding && <form className="swift-item-form" onSubmit={submit}>
      <input value={form.title} onChange={(event) => updateField('title', event.target.value)} placeholder="Event title" autoFocus />
      <input type="date" value={form.date} onChange={(event) => updateField('date', event.target.value)} aria-label="Date" />
      <select value={form.kind} onChange={(event) => updateField('kind', event.target.value)} aria-label="Kind">
        {SWIFT_EVENT_KINDS.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
      </select>
      <label className="swift-checkbox"><input type="checkbox" checked={form.recurring} onChange={(event) => updateField('recurring', event.target.checked)} /> Recurring annually</label>
      <label className="swift-checkbox"><input type="checkbox" checked={form.predicted} onChange={(event) => updateField('predicted', event.target.checked)} /> This is a prediction, not a fact</label>
      {form.predicted && <input value={form.confidence} onChange={(event) => updateField('confidence', event.target.value)} placeholder="Confidence 0-100" inputMode="numeric" />}
      <input value={form.source} onChange={(event) => updateField('source', event.target.value)} placeholder="Source / reasoning" />
      <input className="swift-item-notes" value={form.notes} onChange={(event) => updateField('notes', event.target.value)} placeholder="Notes" />
      <Button tone="coral" type="submit">Save event</Button>
      {formError && <p role="alert">{formError}</p>}
    </form>}

    <section className="swift-event-section">
      <div className="instrument-heading"><span>Upcoming</span><b>{upcoming.length}</b></div>
      <div className="swift-event-list">{upcoming.length ? upcoming.map((event) => <SwiftEventRow event={event} onDelete={onDelete} key={event.id} />) : <p className="empty-state">Nothing upcoming.</p>}</div>
    </section>
    {past.length > 0 && <details className="task-done-list"><summary>{past.length} past</summary>{past.map((event) => <SwiftEventRow event={event} onDelete={onDelete} key={event.id} />)}</details>}
  </div>
}

function SwiftView({ watches, collection, events, onAddCollectionItem, onUpdateCollectionStatus, onDeleteCollectionItem, onAddEvent, onDeleteEvent }) {
  const [tab, setTab] = useState('Watch')

  return <section className="swift-view" aria-labelledby="swift-heading">
    <header className="view-header">
      <div>
        <p className="eyebrow">System index / 08</p>
        <h2 id="swift-heading">Swift field</h2>
        <p>Swiftwatch status, the collection tracker, and the prediction calendar for Invisible String Theory.</p>
      </div>
    </header>
    <div className="registry-controls swift-tabs" role="group" aria-label="Swift view tabs">
      {['Watch', 'Collection', 'Calendar'].map((option) => <button className={tab === option ? 'selected' : ''} key={option} type="button" onClick={() => setTab(option)}>{option}</button>)}
    </div>
    {tab === 'Watch' && <SwiftWatchPanel watches={watches} />}
    {tab === 'Collection' && <SwiftCollectionPanel items={collection} onAdd={onAddCollectionItem} onUpdateStatus={onUpdateCollectionStatus} onDelete={onDeleteCollectionItem} />}
    {tab === 'Calendar' && <SwiftEventsPanel events={events} onAdd={onAddEvent} onDelete={onDeleteEvent} />}
  </section>
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const target = new Date(`${dateStr}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target - today) / 86400000)
}

function TravelEntryRow({ entry, isLowest, onDelete }) {
  return <article className="swift-item-row">
    <div>
      <strong>{formatSwiftPrice(entry.priceCents, entry.currency)}</strong>
      <span>checked {entry.checkedOn}{entry.route ? ` · ${entry.route}` : ''}</span>
      {entry.notes && <small>{entry.notes}</small>}
    </div>
    <div className="swift-event-badge-group">
      {isLowest && <span className="swift-badge logged">Lowest seen</span>}
      <button type="button" onClick={() => onDelete(entry.id)} aria-label={`Delete price check from ${entry.checkedOn}`}>×</button>
    </div>
  </article>
}

function TravelView({ entries, onAdd, onDelete }) {
  const [isAdding, setIsAdding] = useState(false)
  const [form, setForm] = useState({ tripName: '', route: '', departDate: '', returnDate: '', priceDollars: '', checkedOn: new Date().toISOString().slice(0, 10), notes: '' })
  const [formError, setFormError] = useState('')

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    const cleanTrip = form.tripName.trim()
    const priceNum = Number(form.priceDollars)
    if (!cleanTrip) { setFormError('Give the trip a name first.'); return }
    if (!form.priceDollars.trim() || Number.isNaN(priceNum) || priceNum <= 0) { setFormError('Enter a valid price.'); return }
    try {
      await onAdd({
        tripName: cleanTrip,
        route: form.route.trim() || null,
        departDate: form.departDate || null,
        returnDate: form.returnDate || null,
        priceCents: Math.round(priceNum * 100),
        currency: 'USD',
        checkedOn: form.checkedOn || new Date().toISOString().slice(0, 10),
        notes: form.notes.trim() || null,
      })
      setForm((current) => ({ ...current, priceDollars: '', notes: '', checkedOn: new Date().toISOString().slice(0, 10) }))
      setFormError('')
      setIsAdding(false)
    } catch (error) {
      setFormError(error.message || 'The price check could not be saved.')
    }
  }

  const trips = new Map()
  for (const entry of entries) {
    const tripKey = entry.tripName.trim().toLowerCase()
    if (!trips.has(tripKey)) trips.set(tripKey, [])
    trips.get(tripKey).push(entry)
  }

  return <section className="travel-view" aria-labelledby="travel-heading">
    <header className="view-header">
      <div>
        <p className="eyebrow">System index / 09</p>
        <h2 id="travel-heading">Travel field</h2>
        <p>Manual price log for trips you're watching. Log a price whenever you check, and the lowest seen gets flagged.</p>
      </div>
      <Button tone="coral" type="button" onClick={() => setIsAdding((open) => !open)}>{isAdding ? 'Close' : 'Log a price'}</Button>
    </header>

    {isAdding && <form className="swift-item-form" onSubmit={submit}>
      <input value={form.tripName} onChange={(event) => updateField('tripName', event.target.value)} placeholder="Trip name (e.g. PAX Unplugged)" autoFocus />
      <input value={form.route} onChange={(event) => updateField('route', event.target.value)} placeholder="Route (e.g. ATL-PHL round trip)" />
      <input type="date" value={form.departDate} onChange={(event) => updateField('departDate', event.target.value)} aria-label="Depart date" />
      <input type="date" value={form.returnDate} onChange={(event) => updateField('returnDate', event.target.value)} aria-label="Return date" />
      <input value={form.priceDollars} onChange={(event) => updateField('priceDollars', event.target.value)} placeholder="Price (USD)" inputMode="decimal" />
      <input type="date" value={form.checkedOn} onChange={(event) => updateField('checkedOn', event.target.value)} aria-label="Checked on" />
      <input className="swift-item-notes" value={form.notes} onChange={(event) => updateField('notes', event.target.value)} placeholder="Notes (airline, times, source site)" />
      <Button tone="coral" type="submit">Save price check</Button>
      {formError && <p role="alert">{formError}</p>}
    </form>}

    {trips.size === 0 && <p className="empty-state">No price checks logged yet. Log the first one above.</p>}

    {[...trips.entries()].map(([tripName, tripEntries]) => {
      const sorted = [...tripEntries].sort((a, b) => (a.checkedOn < b.checkedOn ? 1 : -1))
      const lowestCents = Math.min(...tripEntries.map((entry) => entry.priceCents))
      const first = tripEntries[0]
      const departIn = daysUntil(first.departDate)
      return { tripName, sorted, lowestCents, first, departIn }
    }).sort((a, b) => {
      const aSoon = a.departIn != null && a.departIn >= 0
      const bSoon = b.departIn != null && b.departIn >= 0
      if (aSoon && bSoon) return a.departIn - b.departIn
      return aSoon ? -1 : bSoon ? 1 : 0
    }).map(({ tripName, sorted, lowestCents, first, departIn }, index) => {
      const isSoonest = index === 0 && departIn != null && departIn >= 0
      return <section key={tripName} className={`swift-event-section${isSoonest ? ' travel-soonest' : ''}`}>
        <div className="instrument-heading">
          <span>{first.tripName}{first.route ? ` · ${first.route}` : ''}</span>
          <b>{sorted.length} check{sorted.length === 1 ? '' : 's'}{departIn != null && departIn >= 0 ? ` · ${departIn}d to departure` : ''}</b>
        </div>
        <div className="swift-collection-list">
          {sorted.map((entry) => <TravelEntryRow key={entry.id} entry={entry} isLowest={entry.priceCents === lowestCents} onDelete={onDelete} />)}
        </div>
      </section>
    })}
  </section>
}

function App() {
  const [activeView, setActiveView] = useState('Horizon')
  const [navCollapsed, setNavCollapsed] = useState(() => {
    try { return window.localStorage.getItem('system-horizon-nav-collapsed') === 'true' }
    catch { return false }
  })
  const [session, setSession] = useState(null)
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [tasks, setTasks] = useState([])
  const [events, setEvents] = useState([])
  const [jobs, setJobs] = useState([])
  const [jobError, setJobError] = useState('')
  const [repoHealth, setRepoHealth] = useState([])
  const [swiftWatch, setSwiftWatch] = useState([])
  const [swiftCollection, setSwiftCollection] = useState([])
  const [swiftEvents, setSwiftEvents] = useState([])
  const [travelWatch, setTravelWatch] = useState([])
  const [databaseError, setDatabaseError] = useState('')
  const greeting = useMemo(() => new Date().getHours() < 12 ? 'Morning field check' : new Date().getHours() < 18 ? 'Afternoon field check' : 'Evening field check', [])

  async function loadProjects() {
    const { data, error } = await supabase.from('horizon_projects').select('*').order('last_activity', { ascending: false, nullsFirst: false })
    if (error) throw error
    const projectRows = data.length ? data : await initializePortfolioRegistry()
    const mapped = projectRows.map(projectFromRow)
    setProjects(mapped)
    setSelectedProjectId((current) => current && mapped.some((project) => project.id === current) ? current : mapped[0]?.id ?? null)
  }

  async function initializePortfolioRegistry() {
    const { data, error } = await supabase.from('horizon_projects').upsert(initialProjects.map(projectToRow), { onConflict: 'owner,name' }).select()
    if (error) throw error
    return data
  }

  async function loadTasks() {
    const { data, error } = await supabase.from('horizon_tasks').select('*').order('created_at', { ascending: false })
    if (error) throw error
    setTasks((data ?? []).map(taskFromRow))
  }

  async function loadEvents() {
    const { data, error } = await supabase.from('horizon_events').select('*').order('event_date', { ascending: true })
    if (error) throw error
    setEvents((data ?? []).map(eventFromRow))
  }

  async function loadJobPipeline() {
    const { data, error } = await jobPipeline.from('dashboard_jobs').select('id,status,title,organization,location,match_percent,recommendation,post_url,deadline,submitted,ws_activity_date,ws_reported').order('last_update', { ascending: false })
    if (error) {
      setJobs([])
      setJobError(error.message || 'Could not load the Claude Code job pipeline.')
      return
    }
    setJobs(data ?? [])
    setJobError('')
  }

  async function loadRepoHealth() {
    const { data, error } = await supabase.from('horizon_repo_health').select('*').order('repo_name', { ascending: true })
    if (error) throw error
    setRepoHealth((data ?? []).map(repoHealthFromRow))
  }

  async function loadSwiftWatch() {
    const { data, error } = await supabase.from('horizon_swift_watch').select('*').order('watch_name', { ascending: true })
    if (error) throw error
    setSwiftWatch((data ?? []).map(swiftWatchFromRow))
  }

  async function loadSwiftCollection() {
    const { data, error } = await supabase.from('horizon_swift_collection').select('*').order('priority', { ascending: true })
    if (error) throw error
    setSwiftCollection((data ?? []).map(swiftCollectionFromRow))
  }

  async function loadSwiftEvents() {
    const { data, error } = await supabase.from('horizon_swift_events').select('*').order('event_date', { ascending: true })
    if (error) throw error
    setSwiftEvents((data ?? []).map(swiftEventFromRow))
  }

  async function loadTravelWatch() {
    const { data, error } = await supabase.from('horizon_travel_watch').select('*').order('checked_on', { ascending: false })
    if (error) throw error
    setTravelWatch((data ?? []).map(travelFromRow))
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => subscription.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    try { window.localStorage.setItem('system-horizon-nav-collapsed', String(navCollapsed)) }
    catch { /* Navigation preference is optional when storage is blocked. */ }
  }, [navCollapsed])

  useEffect(() => {
    if (!session) return
    Promise.all([loadProjects(), loadTasks(), loadEvents(), loadJobPipeline(), loadRepoHealth(), loadSwiftWatch(), loadSwiftCollection(), loadSwiftEvents(), loadTravelWatch()]).catch((error) => setDatabaseError(error.message || 'Could not load private records.'))
  }, [session])

  async function addProject(project) {
    const { data, error } = await supabase.from('horizon_projects').insert(projectToRow(project)).select().single()
    if (error) throw error
    const saved = projectFromRow(data)
    setProjects((current) => [saved, ...current])
    setSelectedProjectId(saved.id)
  }

  async function seedProjects() {
    try {
      await initializePortfolioRegistry()
    } catch (error) {
      setDatabaseError(error.message || 'Could not load the portfolio registry.')
      return
    }
    await loadProjects()
  }

  function openProject(projectId) {
    setSelectedProjectId(projectId)
    setActiveView('ProjectDetail')
  }

  async function addTask(task) {
    const { data, error } = await supabase.from('horizon_tasks').insert(taskToRow(task)).select().single()
    if (error) { setDatabaseError(error.message || 'Could not save the task.'); return }
    setTasks((current) => [taskFromRow(data), ...current])
  }

  async function updateTaskStatus(id, status) {
    const patch = { status, completed_at: status === 'Done' ? new Date().toISOString() : null }
    const { data, error } = await supabase.from('horizon_tasks').update(patch).eq('id', id).select().single()
    if (error) { setDatabaseError(error.message || 'Could not update the task.'); return }
    const saved = taskFromRow(data)
    setTasks((current) => current.map((task) => task.id === id ? saved : task))
  }

  async function deleteTask(id) {
    setTasks((current) => current.filter((task) => task.id !== id))
    const { error } = await supabase.from('horizon_tasks').delete().eq('id', id)
    if (error) { setDatabaseError(error.message || 'Could not delete the task.'); await loadTasks() }
  }

  async function addEvent(event) {
    const { data, error } = await supabase.from('horizon_events').insert(eventToRow(event)).select().single()
    if (error) { setDatabaseError(error.message || 'Could not save the event.'); return }
    setEvents((current) => [...current, eventFromRow(data)].sort((a, b) => a.date < b.date ? -1 : 1))
  }

  async function deleteEvent(id) {
    setEvents((current) => current.filter((event) => event.id !== id))
    const { error } = await supabase.from('horizon_events').delete().eq('id', id)
    if (error) { setDatabaseError(error.message || 'Could not delete the event.'); await loadEvents() }
  }

  async function addSwiftCollectionItem(item) {
    const { data, error } = await supabase.from('horizon_swift_collection').insert(swiftCollectionToRow(item)).select().single()
    if (error) { setDatabaseError(error.message || 'Could not save the collection item.'); return }
    setSwiftCollection((current) => [swiftCollectionFromRow(data), ...current])
  }

  async function updateSwiftCollectionStatus(id, status) {
    const { data, error } = await supabase.from('horizon_swift_collection').update({ status }).eq('id', id).select().single()
    if (error) { setDatabaseError(error.message || 'Could not update the collection item.'); return }
    const saved = swiftCollectionFromRow(data)
    setSwiftCollection((current) => current.map((item) => item.id === id ? saved : item))
  }

  async function deleteSwiftCollectionItem(id) {
    setSwiftCollection((current) => current.filter((item) => item.id !== id))
    const { error } = await supabase.from('horizon_swift_collection').delete().eq('id', id)
    if (error) { setDatabaseError(error.message || 'Could not delete the collection item.'); await loadSwiftCollection() }
  }

  async function addSwiftEvent(event) {
    const { data, error } = await supabase.from('horizon_swift_events').insert(swiftEventToRow(event)).select().single()
    if (error) { setDatabaseError(error.message || 'Could not save the event.'); return }
    setSwiftEvents((current) => [...current, swiftEventFromRow(data)].sort((a, b) => (a.date || '') < (b.date || '') ? -1 : 1))
  }

  async function deleteSwiftEvent(id) {
    setSwiftEvents((current) => current.filter((event) => event.id !== id))
    const { error } = await supabase.from('horizon_swift_events').delete().eq('id', id)
    if (error) { setDatabaseError(error.message || 'Could not delete the event.'); await loadSwiftEvents() }
  }

  async function addTravelEntry(entry) {
    const { data, error } = await supabase.from('horizon_travel_watch').insert(travelToRow(entry)).select().single()
    if (error) throw error
    setTravelWatch((current) => [travelFromRow(data), ...current])
  }

  async function deleteTravelEntry(id) {
    setTravelWatch((current) => current.filter((entry) => entry.id !== id))
    const { error } = await supabase.from('horizon_travel_watch').delete().eq('id', id)
    if (error) { setDatabaseError(error.message || 'Could not delete the price check.'); await loadTravelWatch() }
  }

  if (!session) return <AccessGate />

  const selectedProject = projects.find((project) => project.id === selectedProjectId)
  const pageTitle = activeView === 'Horizon' ? 'System Horizon' : activeView === 'ProjectDetail' ? (selectedProject?.name ?? 'Project') : activeView

  const isWarRoom = activeView === 'War Room'

  return <div className="app-provider">
    <div className={`app-shell${navCollapsed ? ' nav-collapsed' : ''}${isWarRoom ? ' warroom-active' : ''}`}>
      <aside className="side-nav" aria-label="Primary navigation">
        <button className="brand-mark" type="button" aria-label="Open Horizon" onClick={() => setActiveView('Horizon')}><span>SH</span><i aria-hidden="true" /></button>
        <button className="nav-collapse" type="button" aria-label={navCollapsed ? 'Expand navigation' : 'Collapse navigation'} aria-pressed={navCollapsed} onClick={() => setNavCollapsed((collapsed) => !collapsed)}><span aria-hidden="true">{navCollapsed ? '›' : '‹'}</span><b>{navCollapsed ? 'Expand' : 'Collapse'}</b></button>
        <nav>{navItems.map((label) => <button className={activeView === label || (activeView === 'ProjectDetail' && label === 'Projects') ? 'nav-item active' : 'nav-item'} key={label} type="button" onClick={() => setActiveView(label)}><span className="nav-icon" aria-hidden="true">{navIcons[label]}</span><b>{label}</b></button>)}</nav>
        <div className="nav-footer"><Signal /><span>Sync stable</span></div>
      </aside>

      <main className={isWarRoom ? 'main-content warroom-main' : 'main-content'}>
        <header className="topbar">
          <div><span>{greeting}</span><h1>{pageTitle}</h1></div>
          <div className="topbar-tools"><label className="search-field"><span>Search</span><input aria-label="Search System Horizon" placeholder="Find a system" /></label><Button type="button" onClick={() => supabase.auth.signOut()}>Sign out</Button><DateReadout /></div>
        </header>
        {databaseError && <p className="database-error" role="alert">Database error: {databaseError}</p>}
        {activeView === 'ProjectDetail' && selectedProject ? <ProjectDetailView project={selectedProject} tasks={tasks} onBack={() => setActiveView('Projects')} onAddTask={addTask} onUpdateTaskStatus={updateTaskStatus} onDeleteTask={deleteTask} />
          : activeView === 'Projects' ? <ProjectRegistry projects={projects} selectedProjectId={selectedProjectId} onSelectProject={setSelectedProjectId} onAddProject={addProject} onSeedProjects={seedProjects} onOpenProject={openProject} />
          : activeView === 'Flow' ? <FlowView tasks={tasks} projects={projects} onOpenProjects={() => setActiveView('Projects')} onAddTask={addTask} onUpdateTaskStatus={updateTaskStatus} onDeleteTask={deleteTask} />
          : activeView === 'Calendar' ? <CalendarView events={events} projects={projects} tasks={tasks} onAddEvent={addEvent} onDeleteEvent={deleteEvent} onUpdateTaskStatus={updateTaskStatus} onDeleteTask={deleteTask} />
          : activeView === 'Career' ? <CareerView jobs={jobs} jobError={jobError} />
          : activeView === 'Mirrors' ? <MirrorsView repoHealth={repoHealth} />
          : activeView === 'Archive' ? <ArchiveView />
          : activeView === 'Swift' ? <SwiftView watches={swiftWatch} collection={swiftCollection} events={swiftEvents} onAddCollectionItem={addSwiftCollectionItem} onUpdateCollectionStatus={updateSwiftCollectionStatus} onDeleteCollectionItem={deleteSwiftCollectionItem} onAddEvent={addSwiftEvent} onDeleteEvent={deleteSwiftEvent} />
          : activeView === 'Travel' ? <TravelView entries={travelWatch} onAdd={addTravelEntry} onDelete={deleteTravelEntry} />
          : activeView === 'War Room' ? <WarRoomView />
          : <Horizon projects={projects} onProjects={() => setActiveView('Projects')} />}
      </main>
    </div>
  </div>
}

export default App
