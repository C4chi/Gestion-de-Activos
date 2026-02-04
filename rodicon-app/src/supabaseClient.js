import { createClient } from '@supabase/supabase-js'

// ⚠️ REEMPLAZA ESTOS VALORES CON LOS DE TU PROYECTO SUPABASE
const supabaseUrl = 'https://weasdmqugzmtftbtfjwg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlYXNkbXF1Z3ptdGZ0YnRmandnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NTc3MzMsImV4cCI6MjA4MDUzMzczM30.k2JwnDyQh2EivxnPo5JVFKL8hTg2mx1bMPaq8M2Awcs'

export const supabase = createClient(supabaseUrl, supabaseKey)