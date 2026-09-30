// The job pipeline lives in a SECOND Supabase project (vtrtyagltwdrbastpppl), so
// SH has two independent auth sessions: one for the app, one for the jobs. That
// makes "can we read jobs right now" a three-way answer, not a boolean.
//
// Why three and not two: passing "signed out" through as `jobError` makes Home
// shout "Career unavailable" for a state that is one click from resolved, and
// passing it through as "no error, zero jobs" makes Home invent GDOL facts from an
// empty array ("0/3 contacts", "3 more contacts needed"). Both are the silent
// fallback NORTH_STAR section 4 forbids, on the surfaces closest to her
// unemployment reporting. So signed-out gets its own state.
export const JOB_ACCESS = {
  ready: 'ready',
  signedOut: 'signed-out',
  error: 'error',
}

// Precedence is deliberate: a real error outranks being signed out, because an
// error while signed out is still worth surfacing rather than hiding behind a
// sign-in prompt that will not fix it.
export function jobAccessState({ signedIn = false, error = '' } = {}) {
  const message = typeof error === 'string' ? error.trim() : String(error ?? '').trim()
  if (message) return { state: JOB_ACCESS.error, message }
  if (!signedIn) return { state: JOB_ACCESS.signedOut, message: '' }
  return { state: JOB_ACCESS.ready, message: '' }
}
