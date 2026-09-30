import test from 'node:test'
import assert from 'node:assert/strict'
import { jobPipeline } from './jobPipeline.js'
import { supabase } from './supabase.js'

// This is the guard for M11's one design-invalidating risk. If the two clients
// ever shared a localStorage session key, signing in to Career would sign Taylor
// out of the app. supabase-js prevents that by deriving the key from the project
// ref, and Phase 0 verified it -- but it is a library default, not a guarantee we
// control, so it is asserted rather than trusted. If a supabase-js upgrade changes
// the derivation, this test is what says so.
test('the app and job clients do not share an auth session', () => {
  assert.notEqual(
    jobPipeline.auth.storageKey,
    supabase.auth.storageKey,
    'shared storage key: authenticating Career would sign Taylor out of the app',
  )
})

test('each client namespaces its session by its own project ref', () => {
  assert.equal(jobPipeline.auth.storageKey, 'sb-vtrtyagltwdrbastpppl-auth-token')
  assert.equal(supabase.auth.storageKey, 'sb-drtvlcgyjlofaffbwael-auth-token')
})

test('neither client is a duplicate instance on the same key', () => {
  // The "Multiple GoTrueClient instances" warning fires on instanceID > 0, and the
  // counter is per storage key. Both being 0 is the proof they are not colliding.
  assert.equal(jobPipeline.auth.instanceID, 0)
  assert.equal(supabase.auth.instanceID, 0)
})

test('the job client persists its session, so a reload does not force a new sign-in', () => {
  assert.equal(jobPipeline.auth.persistSession, true)
})
