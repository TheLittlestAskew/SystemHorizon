// M8, the impure half: load Google Identity Services, get a token, read events.
// The decisions all live in src/googleCalendar.js, which is pure. This file is
// only the boundary: script, token, network.
//
// 🛑 ONE DIRECTION. Every request here is a GET. Nothing writes to Google.
//
// 🛑 THE TOKEN NEVER LEAVES THIS MODULE'S CALL STACK. It is passed as an argument,
// never returned into component state, never put in localStorage or Supabase, and
// never logged. Google's own docs are explicit that the token model does not
// persist it, and that is relied on rather than worked around.

import { CALENDAR_SCOPE } from './googleCalendar.js'

const GIS_SRC = 'https://accounts.google.com/gsi/client'

// The client ID is intentionally public, like the Supabase publishable key in
// src/supabase.js (NORTH_STAR section 4). An OAuth *web* client ID ships in page
// source by design; what protects it is the authorized-origins list on the client,
// which is why both production and localhost:5173 are registered.
export const GOOGLE_CLIENT_ID = '613785660540-oeffpui2ikcur84uev9i2qs2hqi3q1qq.apps.googleusercontent.com'

// Loaded on first use rather than from index.html, so a page view that never syncs
// makes no request to Google at all.
let gisPromise = null

export function loadGoogleIdentity() {
  if (gisPromise) return gisPromise
  gisPromise = new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('Google sign-in needs a browser.'))
      return
    }
    if (window.google?.accounts?.oauth2) {
      resolve(window.google.accounts.oauth2)
      return
    }
    const existing = document.querySelector(`script[src="${GIS_SRC}"]`)
    const script = existing ?? document.createElement('script')
    script.addEventListener('load', () => {
      if (window.google?.accounts?.oauth2) resolve(window.google.accounts.oauth2)
      else reject(new Error('Google Identity loaded but exposed no oauth2 client.'))
    })
    script.addEventListener('error', () => {
      // Reset so a later attempt can retry rather than being stuck on a rejected
      // promise forever.
      gisPromise = null
      reject(new Error('Could not load Google sign-in. Check the network, or a blocker.'))
    })
    if (!existing) {
      script.src = GIS_SRC
      script.async = true
      document.head.appendChild(script)
    }
  })
  return gisPromise
}

// ⚠️ MUST be called from a user gesture. Google requires `requestAccessToken()`
// to originate from a user-driven event, and a popup raised from a timer is also
// what browsers block. This is why there is no background sync and no sync-on-mount.
export async function requestAccessToken() {
  const oauth2 = await loadGoogleIdentity()
  return new Promise((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: CALENDAR_SCOPE,
      callback: (response) => {
        if (response?.error) {
          // 'access_denied' is her closing the popup. Anything else while the
          // consent screen is in Testing is usually a missing test user.
          reject(new Error(response.error === 'access_denied'
            ? 'Google sign-in was cancelled.'
            : `Google sign-in failed: ${response.error}`))
          return
        }
        if (!response?.access_token) {
          reject(new Error('Google returned no access token.'))
          return
        }
        resolve(response.access_token)
      },
    })
    client.requestAccessToken()
  })
}

// The window to sync. Deliberately bounded: an unbounded pull would drag years of
// history into horizon_events, and anything outside the window is treated as gone
// by the reconcile, so the bounds are a real contract rather than a page size.
export const SYNC_WINDOW = { pastDays: 7, futureDays: 60 }

export function syncWindow(now = new Date(), window = SYNC_WINDOW) {
  const from = new Date(now.getTime() - window.pastDays * 86400000)
  const to = new Date(now.getTime() + window.futureDays * 86400000)
  return { timeMin: from.toISOString(), timeMax: to.toISOString() }
}

// GET only. `singleEvents=true` expands recurring events into instances, which is
// what a dated calendar view needs; without it a weekly meeting arrives as one
// rule and renders once. `showDeleted=true` is what lets a cancellation reach the
// reconcile so the SH copy can be removed.
export async function fetchGoogleEvents(accessToken, { now = new Date(), window = SYNC_WINDOW } = {}) {
  const { timeMin, timeMax } = syncWindow(now, window)
  const items = []
  let pageToken = null

  do {
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
    url.searchParams.set('timeMin', timeMin)
    url.searchParams.set('timeMax', timeMax)
    url.searchParams.set('singleEvents', 'true')
    url.searchParams.set('showDeleted', 'true')
    url.searchParams.set('orderBy', 'startTime')
    url.searchParams.set('maxResults', '250')
    if (pageToken) url.searchParams.set('pageToken', pageToken)

    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!response.ok) {
      // The body can echo request context, so only the status is surfaced; the
      // token must never reach a message or a log.
      if (response.status === 401 || response.status === 403) {
        throw new Error('Google refused the request. Re-authorize, and check you are listed as a test user on the OAuth consent screen.')
      }
      throw new Error(`Reading Google Calendar failed (${response.status}).`)
    }
    const page = await response.json()
    items.push(...(page.items ?? []))
    pageToken = page.nextPageToken ?? null
  } while (pageToken)

  return items
}
