// M12 Pulse: project <-> repo resolution.
//
// The gap this closes: horizon_repo_health is keyed on repo_name and handoff
// entries on repo, but horizon_projects had no repo column at all, so a
// project-scoped Mirrors tab and a project-scoped handoff stream had nothing to
// join on. horizon_projects.repo_names text[] is that key.
//
// Everything here REPORTS a gap rather than hiding it (NORTH_STAR section 4, no
// silent fallbacks). "No repo linked" and "linked but not monitored" are real
// states with their own sentences, never a blank tab or a dropped row.

import { ARCHIVE_REPOS } from './archive.js'

function names(project) {
  const list = project?.repoNames
  if (!Array.isArray(list)) return []
  // Trim and drop blanks: a stray '' in the array would otherwise match nothing
  // and render as an empty repo chip.
  return list.map((n) => String(n ?? '').trim()).filter(Boolean)
}

// What the UI needs to know about one project's repos, including what it CANNOT
// show and why.
//
//   linked      every repo name on the project
//   monitored   those Archive actually fetches a HANDOFF.md for
//   unmonitored those that are real repos but have no handoff feed here
//   hasRepo     false means "no repo linked", which is a state, not an error
export function projectRepoStatus(project) {
  const linked = names(project)
  const monitored = linked.filter((n) => ARCHIVE_REPOS.includes(n))
  const unmonitored = linked.filter((n) => !ARCHIVE_REPOS.includes(n))
  return { linked, monitored, unmonitored, hasRepo: linked.length > 0 }
}

// The sentence the UI renders. Returned as text rather than built in JSX so the
// "every not-applicable state says why" rule (criterion 6) is assertable.
export function projectRepoNotice(project) {
  const { monitored, unmonitored, hasRepo } = projectRepoStatus(project)
  if (!hasRepo) return 'No repo linked, so handoffs are not shown.'
  if (monitored.length === 0) {
    // Linked to something real that Archive does not fetch. Naming it is the
    // difference between "nothing here" and "here is why nothing is here".
    return `Linked to ${unmonitored.join(', ')}, which ${unmonitored.length === 1 ? 'is' : 'are'} not monitored for handoffs.`
  }
  if (unmonitored.length > 0) {
    return `Showing handoffs for ${monitored.join(', ')}. ${unmonitored.join(', ')} ${unmonitored.length === 1 ? 'is' : 'are'} linked but not monitored.`
  }
  return ''
}

// Repo-health rows for one project, or all of them in portfolio scope.
//
// Ordering is the caller's job (Mirrors already sorts worst-first); this only
// decides membership, so the two views cannot disagree about which repo belongs
// to which project.
// The key is `repoName`, which is what repoHealthFromRow produces from
// horizon_repo_health.repo_name. Reading `repo` here would silently match
// nothing and render every project as having no monitored repos.
export function repoHealthForProject(repoHealth, project) {
  const rows = Array.isArray(repoHealth) ? repoHealth : []
  if (!project) return rows
  const linked = names(project)
  if (linked.length === 0) return []
  return rows.filter((row) => linked.includes(row?.repoName))
}

// Repos that exist in horizon_repo_health but belong to no project.
//
// They are NEVER dropped -- they surface in portfolio scope. A repo nobody
// claimed is exactly the kind of thing that goes unnoticed, which is the
// failure Mirrors exists to prevent.
export function unclaimedRepos(repoHealth, projects) {
  const claimed = new Set((Array.isArray(projects) ? projects : []).flatMap(names))
  const rows = Array.isArray(repoHealth) ? repoHealth : []
  return rows.filter((row) => row?.repoName && !claimed.has(row.repoName)).map((row) => row.repoName)
}

// Which repos' handoff entries belong to a project. Empty means the stream shows
// activity only, with projectRepoNotice() explaining it.
export function handoffReposForProject(project) {
  return projectRepoStatus(project).monitored
}

// Reverse lookup: the project that owns a repo, or null. Used to label a handoff
// entry with its project in portfolio scope.
//
// First match wins and that is deliberate: two projects claiming one repo is a
// registry mistake, and silently picking one is better than rendering the entry
// twice. The duplicate is reported separately by duplicateRepoClaims().
export function projectForRepo(projects, repo) {
  if (!repo) return null
  const list = Array.isArray(projects) ? projects : []
  return list.find((project) => names(project).includes(repo)) ?? null
}

// A repo claimed by more than one project. Not fatal, but it means a stream
// entry's project label is arbitrary, so the registry should be corrected.
export function duplicateRepoClaims(projects) {
  const seen = new Map()
  for (const project of Array.isArray(projects) ? projects : []) {
    for (const repo of names(project)) {
      if (!seen.has(repo)) seen.set(repo, [])
      seen.get(repo).push(project.name)
    }
  }
  return [...seen.entries()]
    .filter(([, owners]) => owners.length > 1)
    .map(([repo, owners]) => ({ repo, owners }))
}
