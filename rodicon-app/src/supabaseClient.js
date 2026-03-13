import { createClient } from '@supabase/supabase-js'

const fallbackUrl = 'https://weasdmqugzmtftbtfjwg.supabase.co'
const fallbackAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlYXNkbXF1Z3ptdGZ0YnRmandnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NTc3MzMsImV4cCI6MjA4MDUzMzczM30.k2JwnDyQh2EivxnPo5JVFKL8hTg2mx1bMPaq8M2Awcs'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || fallbackUrl
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || fallbackAnonKey

export const supabase = createClient(supabaseUrl, supabaseKey)
