// The registry's area taxonomy and its fixed reading order.
//
// Pulled out of App.jsx in M12 so PulseView can share it. Importing it from
// App.jsx would be circular -- App.jsx imports PulseView -- and duplicating the
// list would let the two views drift into disagreeing about what an area is,
// which is exactly the kind of quiet divergence the registry re-seed had to fix
// once already (M2, 8 of 16 rows carrying a stale taxonomy).

export const AREA_ORDER = ['Ops & Infra', 'Aftermath', 'Undercroft', 'Sidequests', 'Career', 'Learning']

// Known areas first in their locked order, then anything else in the order it
// was encountered. An area outside the list -- a freshly added project still at
// the default 'Unsorted' -- is APPENDED, never dropped, which is the rule the
// registry already follows in two places.
export function orderedAreas(projects) {
  const present = Array.from(new Set((Array.isArray(projects) ? projects : []).map((project) => project.area || 'Unsorted')))
  return [...AREA_ORDER, ...present.filter((area) => !AREA_ORDER.includes(area))]
}

// Groups projects by area in that order, dropping areas with no projects so an
// empty heading never renders. Within an area, input order is preserved, so the
// caller's sort (recency, in Pulse's case) still decides the rows.
export function groupByArea(projects) {
  const list = Array.isArray(projects) ? projects : []
  return orderedAreas(list)
    .map((area) => [area, list.filter((project) => (project.area || 'Unsorted') === area)])
    .filter(([, items]) => items.length > 0)
}
