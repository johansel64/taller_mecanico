import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nmzclrhmlywnidpvmqqn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5temNscmhtbHl3bmlkcHZtcXFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTQ5NzUsImV4cCI6MjA2ODY3MDk3NX0.vUjHQXS3Fwhb7s27FjxU59Xaq-SeQ2KXzGVq1sh4Lqg'

export const supabase = createClient(supabaseUrl, supabaseKey)