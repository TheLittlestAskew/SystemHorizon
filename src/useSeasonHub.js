import { useCallback, useEffect, useState } from 'react'
import { HUB_POLL_MS, hubUrl, validateHub } from './seasonHubLogic'

// One live feed for the in-season War Room tabs (This Week and My Team), so
// switching tabs never refetches or shows two different "updated" times.
// Refreshes every 2 minutes while the page is visible, and again the moment
// it becomes visible, so a Sunday tab stays current without polling ESPN from
// a background tab.
export default function useSeasonHub(apiBase, leagueId, teamId) {
  const [hub, setHub] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(hubUrl(apiBase, leagueId, teamId), { signal: AbortSignal.timeout(30000) })
      const json = await response.json().catch(() => null)
      if (!response.ok) throw new Error((json && json.error) || `HTTP ${response.status}`)
      setHub(validateHub(json))
      setError('')
    } catch (err) {
      // Keep the last good data on screen; the status line says it's stale.
      setError(err && err.message ? err.message : 'could not reach the hub')
    } finally {
      setLoading(false)
    }
  }, [apiBase, leagueId, teamId])

  useEffect(() => {
    load()
    const tick = () => { if (document.visibilityState === 'visible') load() }
    const handle = setInterval(tick, HUB_POLL_MS)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(handle); document.removeEventListener('visibilitychange', tick) }
  }, [load])

  return { hub, error, loading, load }
}
