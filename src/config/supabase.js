import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bzvdstodtdsihoxufcha.supabase.co'
const supabaseKey = 'sb_publishable_UfCd5yCWfE68YtmAlzrRIQ_25z7drMQ'

export const supabase = createClient(supabaseUrl, supabaseKey)