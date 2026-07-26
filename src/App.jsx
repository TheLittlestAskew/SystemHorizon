import { useMemo, useState } from 'react'
import './App.css'

function Button({ appearance = 'secondary', className = '', children, ...props }) {
  return <button className={`ui-button ${appearance} ${className}`} {...props}>{children}</button>
}

function Input({ className = '', ...props }) {
  return <input className={`app-input ${className}`} {...props} />
}

function Card({ className = '', children }) {
  return <section className={`module ${className}`}>{children}</section>
}

function Badge({ children }) {
  return <span className="status-badge">{children}</span>
}

function Text({ children }) {
  return <span>{children}</span>
}

const navItems = [
  ['Horizon', 'H'],
  ['Projects', 'P'],
  ['Flow', 'F'],
  ['Calendar', 'C'],
  ['Archive', 'A'],
]

const initialProjects = [
  {
    id: 'septentrion',
    name: 'Septentrion',
    summary: 'The durable memory system for projects, handoffs, and return points.',
    status: 'Active',
    tone: 'active',
    nextAction: 'Define the first stable project-registry export.',
    source: 'Septentrion vault',
    repo: 'TheLittlestAskew/septentrion',
    movingParts: ['Return Point', 'Ephemeris', 'repo handoffs'],
  },
  {
    id: 'system-horizon',
    name: 'System Horizon',
    summary: 'The live operations dashboard that helps balance the whole map.',
    status: 'In focus',
    tone: 'focus',
    nextAction: 'Build the Project Registry as the first working module.',
    source: 'Local workspace',
    repo: 'TheLittlestAskew/SystemHorizon',
    movingParts: ['dashboard shell', 'project registry', 'capacity signals'],
  },
  {
    id: 'aftermath-atlas',
    name: 'Aftermath Atlas',
    summary: 'Campaign tools and table support for the Aftermath game.',
    status: 'Waiting',
    tone: 'waiting',
    nextAction: 'Choose the next table-facing workflow to improve.',
    source: 'Aftermath Atlas vault',
    repo: 'TheLittlestAskew/aftermath-atlas',
    movingParts: ['campaign data', 'player tools', 'roll sync'],
  },
  {
    id: 'career-ops',
    name: 'Career ops',
    summary: 'The active job search, portfolio, and career-development system.',
    status: 'Active',
    tone: 'active',
    nextAction: 'Review the next highest-value job-search action.',
    source: 'Career ops workspace',
    repo: 'TheLittlestAskew/taylorritchie',
    movingParts: ['job pipeline', 'resume site', 'portfolio evidence'],
  },
]

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
    const newProject = {
      id: cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      name: cleanName,
      summary: 'Needs a clear purpose and first return point.',
      status: 'Waiting',
      tone: 'waiting',
      nextAction: 'Add the project purpose and its first next action.',
      source: 'Not connected yet',
      repo: 'No repository linked',
      movingParts: [],
    }
    onAddProject(newProject)
    setProjectName('')
    setFormError('')
    setIsAdding(false)
  }

  return (
    <section className="registry" aria-labelledby="registry-heading">
      <div className="registry-hero">
        <div>
          <p className="greeting">Project Registry</p>
          <h2 id="registry-heading">Everything in motion, in one honest map.</h2>
          <p className="intro">This is the System Horizon layer. Septentrion remains the long-term record behind it.</p>
        </div>
        <Button appearance="primary" onClick={() => setIsAdding((open) => !open)}>{isAdding ? 'Close' : 'Add project'}</Button>
      </div>

      {isAdding && (
        <form className="new-project-form" onSubmit={submitProject}>
          <label htmlFor="new-project-name">Project name</label>
          <div>
            <Input id="new-project-name" value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Name the work you are balancing" autoFocus />
            <Button appearance="primary" type="submit">Add to registry</Button>
          </div>
          {formError && <p className="form-error" role="alert">{formError}</p>}
        </form>
      )}

      <div className="registry-filter" role="group" aria-label="Filter projects by status">
        {['All', 'Active', 'In focus', 'Waiting'].map((option) => (
          <button className={filter === option ? 'selected' : ''} key={option} type="button" onClick={() => setFilter(option)}>{option}</button>
        ))}
      </div>

      <div className="registry-layout">
        <div className="registry-list" aria-label="Registered projects">
          {visibleProjects.map((project) => (
            <button className={`registry-row ${selectedProject.id === project.id ? 'is-selected' : ''}`} key={project.id} type="button" onClick={() => onSelectProject(project.id)}>
              <span className={`project-signal ${project.tone}`} aria-hidden="true" />
              <span>
                <strong>{project.name}</strong>
                <small>{project.nextAction}</small>
              </span>
              <Badge>{project.status}</Badge>
            </button>
          ))}
          {visibleProjects.length === 0 && <p className="empty-registry">Nothing matches this status yet.</p>}
        </div>

        <article className="project-detail" aria-live="polite">
          <div className="detail-title">
            <div>
              <span className="module-kicker">Selected project</span>
              <h3>{selectedProject.name}</h3>
            </div>
            <Badge>{selectedProject.status}</Badge>
          </div>
          <p className="detail-summary">{selectedProject.summary}</p>
          <dl className="project-facts">
            <div><dt>Next true action</dt><dd>{selectedProject.nextAction}</dd></div>
            <div><dt>Source</dt><dd>{selectedProject.source}</dd></div>
            <div><dt>Repository</dt><dd>{selectedProject.repo}</dd></div>
          </dl>
          <div className="moving-parts">
            <span className="module-kicker">Moving parts</span>
            {selectedProject.movingParts.length > 0 ? (
              <div>{selectedProject.movingParts.map((part) => <span key={part}>{part}</span>)}</div>
            ) : <p>No moving parts captured yet.</p>}
          </div>
        </article>
      </div>
    </section>
  )
}

function App() {
  const [activeView, setActiveView] = useState('Horizon')
  const [capture, setCapture] = useState('')
  const [captures, setCaptures] = useState([])
  const [focusDone, setFocusDone] = useState(false)
  const [capacity, setCapacity] = useState('Steady')
  const [projects, setProjects] = useState(initialProjects)
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjects[0].id)

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  }, [])

  function saveCapture(event) {
    event.preventDefault()
    const trimmedCapture = capture.trim()
    if (!trimmedCapture) return
    setCaptures((current) => [trimmedCapture, ...current])
    setCapture('')
  }

  function addProject(project) {
    setProjects((current) => [...current, project])
    setSelectedProjectId(project.id)
  }

  return (
    <div className="app-provider">
      <div className="app-shell">
        <aside className="side-nav" aria-label="Primary navigation">
          <div className="brand-mark" aria-label="System Horizon home">
            <span className="brand-orbit" aria-hidden="true" />
            <span>SH</span>
          </div>

          <nav className="nav-list">
            {navItems.map(([label, glyph]) => (
              <button
                className={`nav-item ${activeView === label ? 'is-active' : ''}`}
                key={label}
                type="button"
                onClick={() => setActiveView(label)}
              >
                <span className="nav-glyph" aria-hidden="true">{glyph}</span>
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <button className="nav-item settings" type="button" onClick={() => setActiveView('Settings')}>
            <span className="nav-glyph" aria-hidden="true">S</span>
            <span>Settings</span>
          </button>
        </aside>

        <main className="main-content">
          <header className="topbar">
            <div className="page-context">
              <span className="eyebrow">Personal operations</span>
              <h1>{activeView === 'Horizon' ? 'Your horizon' : activeView}</h1>
            </div>
            <div className="topbar-actions">
              <label className="search-field">
                <span className="search-glyph" aria-hidden="true">⌕</span>
                <Input aria-label="Search System Horizon" placeholder="Search your systems" />
              </label>
              <Button appearance="primary" onClick={() => document.getElementById('quick-capture')?.focus()}>
                Capture
              </Button>
            </div>
          </header>

          {activeView === 'Projects' ? (
            <ProjectRegistry
              projects={projects}
              selectedProjectId={selectedProjectId}
              onSelectProject={setSelectedProjectId}
              onAddProject={addProject}
            />
          ) : <>
          <section className="welcome-row" aria-labelledby="today-heading">
            <div>
              <p className="greeting">{greeting}, Tayls.</p>
              <h2 id="today-heading">Choose the next true thing.</h2>
              <p className="intro">One clear action is enough to move the whole system.</p>
            </div>
            <div className="date-block">
              <span>Friday</span>
              <strong>25</strong>
              <small>July</small>
            </div>
          </section>

          <section className="dashboard-grid" aria-label="Horizon modules">
            <Card className="focus-module">
              <div className="module-heading">
                <div>
                  <span className="module-kicker">Today</span>
                  <h3>One focused move</h3>
                </div>
                <span aria-hidden="true" className="module-icon">01</span>
              </div>
              <p className="focus-task">Define the first System Horizon data model.</p>
              <p className="module-copy">Start with projects, moving parts, current state, and next action.</p>
              <div className="focus-footer">
                <span className={focusDone ? 'completed-note' : 'time-note'}>{focusDone ? 'Marked complete' : '45 minute build block'}</span>
                <Button appearance={focusDone ? 'secondary' : 'primary'} onClick={() => setFocusDone((done) => !done)}>
                  {focusDone ? 'Undo' : 'Mark done'}
                </Button>
              </div>
            </Card>

            <Card className="capacity-module">
              <div className="module-heading">
                <div>
                  <span className="module-kicker">Capacity</span>
                  <h3>Plan for the person here</h3>
                </div>
                <span aria-hidden="true" className="module-icon">+</span>
              </div>
              <div className="capacity-state">
                <span className="capacity-number">{capacity}</span>
                <span className="capacity-caption">{capacity === 'Light' ? 'keep the next move small and clean' : capacity === 'High focus' ? 'make room for a meaningful build block' : 'enough room for a deep block'}</span>
              </div>
              <div className="capacity-options" role="group" aria-label="Set current capacity">
                {['Light', 'Steady', 'High focus'].map((option) => (
                  <button className={capacity === option ? 'selected' : ''} key={option} type="button" onClick={() => setCapacity(option)}>{option}</button>
                ))}
              </div>
            </Card>

            <Card className="projects-module">
              <div className="module-heading">
                <div>
                  <span className="module-kicker">Project radar</span>
                  <h3>Four things in motion</h3>
                </div>
                <Button appearance="subtle" aria-label="Open all projects">All</Button>
              </div>
              <div className="project-list">
                {projects.map((project) => (
                  <button className="project-row" key={project.name} type="button" onClick={() => setActiveView('Projects')}>
                    <span className={`project-signal ${project.tone}`} aria-hidden="true" />
                    <span className="project-name">
                      <strong>{project.name}</strong>
                      <small>{project.nextAction}</small>
                    </span>
                    <Badge>{project.status}</Badge>
                  </button>
                ))}
              </div>
            </Card>

            <Card className="capture-module">
              <div className="module-heading">
                <div>
                  <span className="module-kicker">Quick capture</span>
                  <h3>Catch it before it evaporates</h3>
                </div>
                <span aria-hidden="true" className="module-icon">+</span>
              </div>
              <form onSubmit={saveCapture}>
                <label className="capture-label" htmlFor="quick-capture">What needs a home?</label>
                <div className="capture-form">
                  <Input id="quick-capture" value={capture} onChange={(event) => setCapture(event.target.value)} placeholder="A task, thought, loose thread..." />
                  <Button appearance="primary" type="submit">Save</Button>
                </div>
              </form>
              {captures.length > 0 ? (
                <div className="saved-captures" aria-live="polite">
                  <span aria-hidden="true">✓</span>
                  <Text>{captures.length === 1 ? '1 item captured' : `${captures.length} items captured`}</Text>
                </div>
              ) : (
                <p className="capture-helper">Captured items will be sorted later. Do not solve the whole thing here.</p>
              )}
            </Card>

            <Card className="attention-module">
              <div className="module-heading">
                <div>
                  <span className="module-kicker">Needs attention</span>
                  <h3>Two things are waiting</h3>
                </div>
              </div>
              <div className="attention-items">
                <div>
                  <span className="attention-title">Decide the first Septentrion connection</span>
                  <span className="attention-source">System Horizon</span>
                </div>
                <div>
                  <span className="attention-title">Review current career-op priorities</span>
                  <span className="attention-source">Career ops</span>
                </div>
              </div>
            </Card>
          </section>
          </>}
        </main>
      </div>
    </div>
  )
}

export default App
