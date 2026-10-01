// Assigning an existing task to a project. The Flow quick-add could always set a
// project at creation time, but nothing could change it afterwards, so tasks
// created with the dropdown left on "No project" were stuck that way. That is not
// cosmetic: `touchProjectActivity` returns early without a projectId, so those
// tasks could never stamp `horizon_projects.last_activity`, which is the input M6's
// Active Work ranking reads. Four unassigned tasks held the whole ranking at a tie.

export const NO_PROJECT = ''

// A `<select>` whose value matches no option renders as if nothing were selected,
// so a task pointing at a project that was deleted or is not loaded would display
// "No project" and read as unassigned when it is not. That is the silent fallback
// section 4 forbids, so an unmatched id gets its own visible option instead.
export function taskProjectOptions(projects = [], currentId = null) {
  const known = (projects ?? []).filter((project) => project?.id)
  const options = [
    { value: NO_PROJECT, label: 'No project', unknown: false },
    ...known.map((project) => ({ value: project.id, label: project.name ?? '(unnamed project)', unknown: false })),
  ]
  if (currentId && !known.some((project) => project.id === currentId)) {
    options.push({ value: currentId, label: `Unknown project (${currentId})`, unknown: true })
  }
  return options
}

// '' is what a `<select>` reports for the "No project" option, but the column is a
// nullable uuid: writing '' would be a type error, not an unassignment.
export function normalizeProjectSelection(value) {
  const text = typeof value === 'string' ? value.trim() : ''
  return text === '' ? null : text
}

// True when the write is worth sending. Re-selecting the project a task already has
// should not spend a round trip, and must not restamp the project's activity.
export function isProjectChange(task, value) {
  return (task?.projectId ?? null) !== normalizeProjectSelection(value)
}
