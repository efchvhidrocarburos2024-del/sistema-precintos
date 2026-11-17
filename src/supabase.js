import { createClient } from '@supabase/supabase-js'

// Esto tomará las llaves desde Vercel (o desde un archivo .env en tu PC)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)