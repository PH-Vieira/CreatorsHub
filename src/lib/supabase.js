import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ysefipscpfbonomulqdg.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzZWZpcHNjcGZib25vbXVscWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMDk4MDMsImV4cCI6MjA3NzY4NTgwM30.UoHNAV4TtMraLB-C8IZpdsBtcM7N1Myx_EAZonbloN8'

export const supabase = createClient(supabaseUrl, supabaseKey)