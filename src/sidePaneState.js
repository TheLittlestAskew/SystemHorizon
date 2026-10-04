// SidePane's persisted collapse state.
//
// In its own module rather than in SidePane.jsx for two reasons: a file that
// exports both a component and helpers breaks React Fast Refresh, and a pure
// module is reachable from node:test while a .jsx importing App.css is not.
//
// Section 4 bans NEW localStorage state in general and names the nav collapse
// as the standing exception for per-device chrome preferences. This is the same
// class: which pane is open is a property of the screen, not of the work.

export const SIDEPANE_STORAGE_PREFIX = 'horizon_sidepane_'

export function sidePaneStorageKey(id) {
  return `${SIDEPANE_STORAGE_PREFIX}${id}`
}

// Both wrapped: localStorage throws in private mode and on a blocked origin.
// A pane that cannot remember its own width is not worth crashing a view over,
// and the default (expanded) is the safe direction -- it can never hide content.
export function readCollapsed(id) {
  try { return window.localStorage.getItem(sidePaneStorageKey(id)) === 'true' }
  catch { return false }
}

export function writeCollapsed(id, collapsed) {
  try { window.localStorage.setItem(sidePaneStorageKey(id), String(collapsed)) }
  catch { /* ignored on purpose: see above */ }
}
