import { createClient } from '@supabase/supabase-js'

// The job pipeline is a SECOND Supabase project, separate from the app's own
// (src/supabase.js -> drtvlcgyjlofaffbwael). It needs its own client because a
// session on one project is not valid on the other.
//
// This key is the project's anon key and is intentionally public, like the app's.
// It is not what grants access: `dashboard_jobs` grants SELECT to `authenticated`
// only, so Career must sign in. Do NOT "fix" an empty Career by granting anon --
// the view has security_invoker unset, so it runs as its owner and bypasses
// job_applications' RLS, and this repo is public. That grant publishes the whole
// job search. See NORTH_STAR.md section 10, M11.
const jobPipelineUrl = 'https://vtrtyagltwdrbastpppl.supabase.co'
const jobPipelineAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0cnR5YWdsdHdkcmJhc3RwcHBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNTY5NTAsImV4cCI6MjA5MTkzMjk1MH0.hnpwjHGIqiUN_VmmIkOAAFGGCKsyYgl7AO3FW5vDIeM'

// persistSession is on so signing in survives a reload. `storageKey` is
// deliberately NOT set: supabase-js derives it from the project ref
// (`sb-${hostname.split('.')[0]}-auth-token`), so this client lands on
// `sb-vtrtyagltwdrbastpppl-auth-token` and the app client on
// `sb-drtvlcgyjlofaffbwael-auth-token`. Hardcoding it would restate a library
// default and could drift from the URL it mirrors. The isolation is asserted by
// test instead -- see src/jobPipeline.test.mjs.
export const jobPipeline = createClient(jobPipelineUrl, jobPipelineAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
})
