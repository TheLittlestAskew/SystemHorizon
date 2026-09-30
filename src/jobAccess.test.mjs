import test from 'node:test'
import assert from 'node:assert/strict'
import { JOB_ACCESS, jobAccessState } from './jobAccess.js'

test('signed in with no error is the only state that can be trusted for numbers', () => {
  const access = jobAccessState({ signedIn: true, error: '' })
  assert.equal(access.state, JOB_ACCESS.ready)
  assert.equal(access.message, '')
})

test('signed out is its own state, not an error', () => {
  const access = jobAccessState({ signedIn: false, error: '' })
  assert.equal(access.state, JOB_ACCESS.signedOut)
  assert.equal(access.message, '', 'signed out carries no error text to render')
})

test('a real error outranks being signed out, so it is never hidden behind a sign-in prompt', () => {
  const access = jobAccessState({ signedIn: false, error: 'permission denied for view dashboard_jobs' })
  assert.equal(access.state, JOB_ACCESS.error)
  assert.equal(access.message, 'permission denied for view dashboard_jobs')
})

test('an error while signed in is still an error', () => {
  assert.equal(jobAccessState({ signedIn: true, error: 'network unreachable' }).state, JOB_ACCESS.error)
})

test('defaults are the safe direction: no argument means do not trust the numbers', () => {
  assert.equal(jobAccessState().state, JOB_ACCESS.signedOut)
})

test('whitespace-only error is not an error', () => {
  // Supabase hands back '' on success; a stray '  ' must not flip Career into a
  // red error state with a blank message.
  assert.equal(jobAccessState({ signedIn: true, error: '   ' }).state, JOB_ACCESS.ready)
})

test('a non-string error is coerced rather than crashing the view', () => {
  const access = jobAccessState({ signedIn: true, error: new Error('boom').message })
  assert.equal(access.state, JOB_ACCESS.error)
  assert.equal(access.message, 'boom')
})

