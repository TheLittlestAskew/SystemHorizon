// Navigation structure, locked by docs/NORTH_STAR.md section 3.
// Plain data in its own module (no JSX, no React, no CSS import) so the order
// and reachability rules are assertable from node:test without booting the app.

// Calendar is a utility, not an area: pinned above the area groups, with no
// group header, no chevron, and no field-status slot on Home.
export const navUtilityItems = ['Calendar']

// `direct: true` renders a single-view area as a plain link instead of a group
// with one child. `tier: 'side'` marks the lower-priority Side Quests group.
export const navGroups = [
  { id: 'horizon', label: 'Horizon', items: ['Horizon'], direct: true },
  // M12 added Pulse third. NORTH_STAR section 3 locks nav STRUCTURE -- which
  // groups exist, Calendar as a utility, Side Quests collapsed -- and adding a
  // view inside an existing group changes none of that and removes nothing.
  { id: 'projects', label: 'Projects', items: ['Projects', 'Flow', 'Pulse'] },
  { id: 'career', label: 'Career', items: ['Career'], direct: true },
  { id: 'system', label: 'System', items: ['Mirrors', 'Archive'] },
  { id: 'sidequests', label: 'Side Quests', items: ['Swift', 'War Room', 'Travel'], tier: 'side', defaultOpen: false },
]

// Groups that start expanded. Direct links have no toggle so they are never in
// this set; Side Quests opts out to stay visually lower-priority.
export function defaultOpenNavGroups() {
  return new Set(navGroups.filter((group) => !group.direct && group.defaultOpen !== false).map((group) => group.id))
}
