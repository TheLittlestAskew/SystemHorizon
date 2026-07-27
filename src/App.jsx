import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import './App.css'

const navItems = [
  ['Horizon', '01'],
  ['Projects', '02'],
  ['Flow', '03'],
  ['Calendar', '04'],
  ['Career', '05'],
  ['Archive', '06'],
]

const initialProjects = [
  { id: 'system-horizon', name: 'System Horizon', area: 'Ops & Infra', kind: 'app', status: 'Active', health: 'Yellow', tone: 'coral', metric: '10/15 views live', signal: 67, summary: 'The cross-device control panel for projects, return points, and the next true thing.', nextAction: 'Restore or locate the missing tayls-task-manager.jsx source.', details: ['Known trap: recurring strip is hardcoded.', 'Failed Flows is still unbuilt.', 'The missing JSX source stays visible until resolved.'] },
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

function ProjectRegistry({ projects, selectedProjectId, onSelectProject, onAddProject, onSeedProjects }) {
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
      </article>}
    </div>
  </section>
}

function CareerView({ applications, contacts, onAddApplication, onAddContact }) {
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [score, setScore] = useState('')
  const [organization, setOrganization] = useState('')
  const [contactType, setContactType] = useState('Application')
  const [formError, setFormError] = useState('')
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const weeklyContacts = contacts.filter((contact) => new Date(`${contact.contact_date}T00:00:00`) >= weekStart).length
  const activeApplications = applications.filter((application) => !['Rejected', 'Archived'].includes(application.status))

  async function submitApplication(event) {
    event.preventDefault()
    if (!company.trim() || !role.trim()) {
      setFormError('Add both the company and role.')
      return
    }
    try {
      await onAddApplication({ company: company.trim(), role: role.trim(), score: score ? Number(score) : null })
      setCompany('')
      setRole('')
      setScore('')
      setFormError('')
    } catch (error) { setFormError(error.message || 'The application could not be saved.') }
  }

  async function submitContact(event) {
    event.preventDefault()
    if (!organization.trim()) {
      setFormError('Name the organization or person you contacted.')
      return
    }
    try {
      await onAddContact({ organization: organization.trim(), contact_type: contactType })
      setOrganization('')
      setFormError('')
    } catch (error) { setFormError(error.message || 'The work-search contact could not be saved.') }
  }

  return <section className="career-view" aria-labelledby="career-heading"><header className="view-header"><div><p className="eyebrow">Career operations / 05</p><h2 id="career-heading">Job search field</h2><p>Applications, compliance, and the next move that earns its place.</p></div></header><div className="career-grid"><article className="career-panel compliance-panel"><span>This week’s work search</span><strong>{weeklyContacts}<small>/3 contacts</small></strong><p>{weeklyContacts >= 3 ? 'GA DOL contact requirement met for this week.' : `${3 - weeklyContacts} more contact${3 - weeklyContacts === 1 ? '' : 's'} needed this week.`}</p><form onSubmit={submitContact}><label>Organization or contact<input value={organization} onChange={(event) => setOrganization(event.target.value)} placeholder="Employer, recruiter, or network contact" /></label><label>Contact type<select value={contactType} onChange={(event) => setContactType(event.target.value)}>{['Application', 'Employer contact', 'Networking', 'Interview', 'Follow-up'].map((type) => <option key={type}>{type}</option>)}</select></label><Button tone="coral" type="submit">Log contact</Button></form></article><article className="career-panel"><span>Active applications</span><strong>{activeApplications.length}</strong><p>Discovered, applied, or moving through interviews.</p><div className="career-statuses">{['Discovered', 'Applied', 'Interview', 'Offer'].map((status) => <div key={status}><small>{status}</small><b>{applications.filter((application) => application.status === status).length}</b></div>)}</div></article></div><div className="career-workbench"><form className="career-form" onSubmit={submitApplication}><div><label>Company<input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Organization" /></label><label>Role<input value={role} onChange={(event) => setRole(event.target.value)} placeholder="Job title" /></label><label>Match score<input type="number" min="0" max="100" value={score} onChange={(event) => setScore(event.target.value)} placeholder="Optional" /></label><Button tone="coral" type="submit">Add application</Button></div>{formError && <p role="alert">{formError}</p>}</form><section className="application-list" aria-label="Applications"><div className="instrument-heading"><span>Application pipeline</span><b>{applications.length}</b></div>{applications.length ? applications.map((application) => <article key={application.id}><div><strong>{application.company}</strong><span>{application.role}</span></div><small>{application.status}{application.score ? ` · ${application.score}%` : ''}</small></article>) : <p className="empty-state">No applications yet. Add the first one above.</p>}</section></div></section>
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

function ScaffoldView({ view, onOpenProjects }) {
  const views = {
    Flow: {
      code: '03',
      title: 'Flow board',
      description: 'A single place to decide what is active, waiting, parked, or done.',
      primary: 'Active queue',
      primaryItems: ['Define the System Horizon data model', 'Choose the next Septentrion connection'],
      secondary: 'Waiting room',
      secondaryItems: ['Aftermath Meridian workflow', 'Career priorities review'],
      note: 'Later, this becomes the drag-and-drop working queue. For now, the states and ownership are scaffolded.',
    },
    Calendar: {
      code: '04',
      title: 'Calendar field',
      description: 'A time-aware view for commitments, build blocks, and the space around them.',
      primary: 'Today’s frame',
      primaryItems: ['10:00   Build block', '13:30   Admin orbit', '16:00   Close the loop'],
      secondary: 'Planning horizon',
      secondaryItems: ['This week', 'Next week', 'Someday, not scheduled'],
      note: 'Later, this will connect scheduled work, capacity, and the real calendar. Nothing is assumed or synced yet.',
    },
    Archive: {
      code: '05',
      title: 'Archive field',
      description: 'The retrieval layer for handoffs, decisions, artifacts, and settled work.',
      primary: 'Retrieval paths',
      primaryItems: ['Project handoffs', 'Decision records', 'Reference artifacts'],
      secondary: 'Archive status',
      secondaryItems: ['No source connected yet', 'Ready for Septentrion index', 'Search stays local until linked'],
      note: 'Later, this becomes the doorway into durable project memory. This scaffold deliberately does not pretend the archive is connected.',
    },
  }
  const current = views[view] ?? views.Flow

  return <section className="scaffold-view" aria-labelledby="scaffold-heading">
    <header className="view-header scaffold-header">
      <div>
        <p className="eyebrow">System index / {current.code}</p>
        <h2 id="scaffold-heading">{current.title}</h2>
        <p>{current.description}</p>
      </div>
      {view === 'Flow' ? <Button tone="coral" onClick={onOpenProjects}>Open projects</Button> : <span className="scaffold-status">Scaffold ready</span>}
    </header>

    <div className="scaffold-grid">
      <article className="scaffold-card primary-card">
        <div className="instrument-heading"><span>{current.primary}</span><b>01</b></div>
        <div className="scaffold-list">
          {current.primaryItems.map((item, index) => <div key={item}><Signal tone={index === 0 ? 'cyan' : 'violet'} /><span>{item}</span><small>{String(index + 1).padStart(2, '0')}</small></div>)}
        </div>
      </article>
      <article className="scaffold-card secondary-card">
        <div className="instrument-heading"><span>{current.secondary}</span><b>02</b></div>
        <div className="scaffold-list">
          {current.secondaryItems.map((item, index) => <div key={item}><span className="scaffold-mark">{index + 1}</span><span>{item}</span></div>)}
        </div>
      </article>
      <article className="scaffold-card note-card">
        <div className="instrument-heading"><span>Connection status</span><b>03</b></div>
        <p>{current.note}</p>
        <span className="connection-note"><Signal tone="coral" /> Not connected yet</span>
      </article>
    </div>
  </section>
}

function App() {
  const [activeView, setActiveView] = useState('Horizon')
  const [session, setSession] = useState(null)
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [applications, setApplications] = useState([])
  const [contacts, setContacts] = useState([])
  const [databaseError, setDatabaseError] = useState('')
  const greeting = useMemo(() => new Date().getHours() < 12 ? 'Morning field check' : new Date().getHours() < 18 ? 'Afternoon field check' : 'Evening field check', [])

  async function loadProjects() {
    const { data, error } = await supabase.from('horizon_projects').select('*').order('last_activity', { ascending: false, nullsFirst: false })
    if (error) throw error
    const mapped = data.map(projectFromRow)
    setProjects(mapped)
    setSelectedProjectId((current) => current && mapped.some((project) => project.id === current) ? current : mapped[0]?.id ?? null)
  }

  async function loadCareerData() {
    const [applicationResult, contactResult] = await Promise.all([supabase.from('horizon_applications').select('*').order('discovered_at', { ascending: false }), supabase.from('horizon_work_search_contacts').select('*').order('contact_date', { ascending: false })])
    if (applicationResult.error) throw applicationResult.error
    if (contactResult.error) throw contactResult.error
    setApplications(applicationResult.data)
    setContacts(contactResult.data)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => subscription.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return
    Promise.all([loadProjects(), loadCareerData()]).catch((error) => setDatabaseError(error.message || 'Could not load private records.'))
  }, [session])

  async function addProject(project) {
    const { data, error } = await supabase.from('horizon_projects').insert(projectToRow(project)).select().single()
    if (error) throw error
    const saved = projectFromRow(data)
    setProjects((current) => [saved, ...current])
    setSelectedProjectId(saved.id)
  }

  async function seedProjects() {
    const { error } = await supabase.from('horizon_projects').upsert(initialProjects.map(projectToRow), { onConflict: 'owner,name' })
    if (error) {
      setDatabaseError(error.message || 'Could not load the portfolio registry.')
      return
    }
    await loadProjects()
  }

  async function addApplication(application) {
    const { data, error } = await supabase.from('horizon_applications').insert(application).select().single()
    if (error) throw error
    setApplications((current) => [data, ...current])
  }

  async function addContact(contact) {
    const { data, error } = await supabase.from('horizon_work_search_contacts').insert(contact).select().single()
    if (error) throw error
    setContacts((current) => [data, ...current])
  }

  if (!session) return <AccessGate />

  return <div className="app-provider">
    <div className="app-shell">
      <aside className="side-nav" aria-label="Primary navigation">
        <button className="brand-mark" type="button" aria-label="Open Horizon" onClick={() => setActiveView('Horizon')}><span>SH</span><i aria-hidden="true" /></button>
        <nav>{navItems.map(([label, code]) => <button className={activeView === label ? 'nav-item active' : 'nav-item'} key={label} type="button" onClick={() => setActiveView(label)}><span>{code}</span><b>{label}</b></button>)}</nav>
        <div className="nav-footer"><Signal /><span>Sync stable</span></div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div><span>{greeting}</span><h1>{activeView === 'Horizon' ? 'System Horizon' : activeView}</h1></div>
          <div className="topbar-tools"><label className="search-field"><span>Search</span><input aria-label="Search System Horizon" placeholder="Find a system" /></label><Button type="button" onClick={() => supabase.auth.signOut()}>Sign out</Button><DateReadout /></div>
        </header>
        {databaseError && <p className="database-error" role="alert">Database error: {databaseError}</p>}
        {activeView === 'Projects' ? <ProjectRegistry projects={projects} selectedProjectId={selectedProjectId} onSelectProject={setSelectedProjectId} onAddProject={addProject} onSeedProjects={seedProjects} /> : activeView === 'Career' ? <CareerView applications={applications} contacts={contacts} onAddApplication={addApplication} onAddContact={addContact} /> : activeView === 'Horizon' ? <Horizon projects={projects} onProjects={() => setActiveView('Projects')} /> : <ScaffoldView view={activeView} onOpenProjects={() => setActiveView('Projects')} />}
      </main>
    </div>
  </div>
}

export default App
