// The sidebar footer indicator. It was the literal text "Sync stable" with a
// default cyan dot, rendered on every view regardless of state -- the third
// unconditional claim found on 2026-10-03, after the hero's "Systems nominal"
// and `232 days left in 2026`.
//
// 🛑 It sits in the persistent chrome, so it is the one status visible from
// EVERY screen. An indicator that cannot report a bad state is worse there than
// anywhere else: it is the thing Taylor would glance at to decide whether to
// trust what the rest of the page says.
//
// The app's own database is ranked above the secondary sources on purpose. If
// `drtvlcgyjlofaffbwael` is unreachable the app is not partially degraded, it
// is not reading its own data at all -- that must not be softened into the same
// word as "the repo-health collector returned an error".
export const SYNC = { stable: 'stable', degraded: 'degraded', failed: 'failed' }

export function syncStatus({ databaseError = '', sourceErrors = [] } = {}) {
  if (databaseError) return { level: SYNC.failed, tone: 'coral', label: 'Sync failed' }

  const named = sourceErrors.filter(Boolean)
  if (named.length > 0) {
    return {
      level: SYNC.degraded,
      tone: 'peach',
      // Counted, not listed: the footer is a few characters wide, and naming one
      // of three errors would be more misleading than naming none.
      label: named.length === 1 ? 'One source down' : `${named.length} sources down`,
    }
  }

  return { level: SYNC.stable, tone: 'cyan', label: 'Sync stable' }
}
