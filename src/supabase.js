import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://drtvlcgyjlofaffbwael.supabase.co'
const supabasePublishableKey = 'sb_publishable_MITAm9B6x2IwI8ycF0xgTg_8kwT80LA'

export const supabase = createClient(supabaseUrl, supabasePublishableKey)
