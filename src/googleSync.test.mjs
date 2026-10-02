import test from 'node:test'
import assert from 'node:assert/strict'
import { GOOGLE_CLIENT_ID, SYNC_WINDOW, syncWindow } from './googleSync.js'

const NOW = new Date('2026-10-02T12:00:00.000Z')

test('the sync window is bounded, in both directions', () => {
  // Unbounded would drag years of history into horizon_events, and the reconcile
  // treats anything outside the window as gone, so these bounds are a contract.
  const { timeMin, timeMax } = syncWindow(NOW)
  assert.equal(timeMin, '2026-09-25T12:00:00.000Z')
  assert.equal(timeMax, '2026-12-01T12:00:00.000Z')
})

test('the window is expressed in RFC 3339 UTC, which is what the API expects', () => {
  const { timeMin, timeMax } = syncWindow(NOW)
  for (const value of [timeMin, timeMax]) {
    assert.match(value, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  }
})

test('timeMin is always before timeMax', () => {
  for (const window of [SYNC_WINDOW, { pastDays: 0, futureDays: 1 }, { pastDays: 365, futureDays: 365 }]) {
    const { timeMin, timeMax } = syncWindow(NOW, window)
    assert.ok(new Date(timeMin) < new Date(timeMax), `${JSON.stringify(window)} must not invert`)
  }
})

test('a zero-width window still produces a valid, non-inverted range', () => {
  const { timeMin, timeMax } = syncWindow(NOW, { pastDays: 0, futureDays: 0 })
  assert.equal(timeMin, timeMax, 'degenerate but not invalid')
})

test('the client id is the web client, and is the public kind', () => {
  assert.match(GOOGLE_CLIENT_ID, /\.apps\.googleusercontent\.com$/)
  // A client SECRET must never appear in this repo. A secret is not of this shape,
  // but asserting the shape is what makes a paste of the wrong value fail loudly.
  assert.doesNotMatch(GOOGLE_CLIENT_ID, /GOCSPX|secret/i)
})

test('the default window matches what the docs and handoff claim', () => {
  assert.deepEqual(SYNC_WINDOW, { pastDays: 7, futureDays: 60 })
})
