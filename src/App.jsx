import { useMemo, useState } from 'react'
import './App.css'

const navItems = [
  ['Horizon', '01'],
  ['Projects', '02'],
  ['Flow', '03'],
  ['Calendar', '04'],
  ['Archive', '05'],
]

const initialProjects = [
  { id: 'septentrion', name: 'Septentrion', status: 'Active', tone: 'cyan', nextAction: 'Define the first stable project-registry export.', signal: 78 },
  { id: 'system-horizon', name: 'System Horizon', status: 'In focus', tone: 'coral', nextAction: 'Build the Project Registry as the first working module.', signal: 92 },
  { id: 'aftermath-atlas', name: 'Aftermath Atlas', status: 'Waiting', tone: 'violet', nextAction: 'Choose the next table-facing workflow to improve.', signal: 36 },
  { id: 'career-ops', name: 'Career ops', status: 'Active', tone: 'cyan', nextAction: 'Review the next highest-value job-search action.', signal: 64 },
]

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

function ProjectRegistry({ projects, selectedProjectId, onSelectProject, onAddProject }) {
  const [filter, setFilter] = useState('All')
  const [isAdding, setIsAdding] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [formError, setFormError] = useState('')
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0]
  const visibleProjects = filter === 'All' ? projects : projects.filter((project) => project.status === filter)

  function submitProject(event) {
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
    onAddProject({ id, name: cleanName, status: 'Waiting', tone: 'violet', nextAction: 'Add a clear purpose and first return point.', signal: 12 })
    setProjectName('')
    setFormError('')
    setIsAdding(false)
  }

  return <section className="registry-view" aria-labelledby="registry-heading">
    <header className="view-header">
      <div>
        <p className="eyebrow">System index / 02</p>
        <h2 id="registry-heading">Project registry</h2>
        <p>Every active system, with its next honest move.</p>
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
      {['All', 'Active', 'In focus', 'Waiting'].map((option) => <button className={filter === option ? 'selected' : ''} key={option} type="button" onClick={() => setFilter(option)}>{option}</button>)}
    </div>

    <div className="registry-layout">
      <div className="registry-list" aria-label="Registered projects">
        {visibleProjects.map((project) => <button className={selectedProject.id === project.id ? 'registry-row selected' : 'registry-row'} key={project.id} type="button" onClick={() => onSelectProject(project.id)}>
          <Signal tone={project.tone} />
          <span><strong>{project.name}</strong><small>{project.nextAction}</small></span>
          <b>{project.status}</b>
        </button>)}
        {visibleProjects.length === 0 && <p className="empty-state">No projects match that signal yet.</p>}
      </div>
      {selectedProject && <article className="project-inspector" aria-live="polite">
        <div className="inspector-topline"><span>Selected signal</span><span>{String(selectedProject.signal).padStart(2, '0')}%</span></div>
        <h3>{selectedProject.name}</h3>
        <p>{selectedProject.nextAction}</p>
        <div className="signal-meter"><span style={{ width: `${selectedProject.signal}%` }} /></div>
        <dl><div><dt>State</dt><dd><Signal tone={selectedProject.tone} /> {selectedProject.status}</dd></div><div><dt>Next action</dt><dd>{selectedProject.nextAction}</dd></div></dl>
      </article>}
    </div>
  </section>
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
      secondaryItems: ['Aftermath Atlas workflow', 'Career priorities review'],
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
  const [projects, setProjects] = useState(initialProjects)
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjects[0].id)
  const greeting = useMemo(() => new Date().getHours() < 12 ? 'Morning field check' : new Date().getHours() < 18 ? 'Afternoon field check' : 'Evening field check', [])

  function addProject(project) {
    setProjects((current) => [...current, project])
    setSelectedProjectId(project.id)
  }

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
          <div className="topbar-tools"><label className="search-field"><span>Search</span><input aria-label="Search System Horizon" placeholder="Find a system" /></label><DateReadout /></div>
        </header>
        {activeView === 'Projects' ? <ProjectRegistry projects={projects} selectedProjectId={selectedProjectId} onSelectProject={setSelectedProjectId} onAddProject={addProject} /> : activeView === 'Horizon' ? <Horizon projects={projects} onProjects={() => setActiveView('Projects')} /> : <ScaffoldView view={activeView} onOpenProjects={() => setActiveView('Projects')} />}
      </main>
    </div>
  </div>
}

export default App
