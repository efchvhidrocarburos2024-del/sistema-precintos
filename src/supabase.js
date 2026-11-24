// src/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // CAMBIO CLAVE: Usamos flujo implícito para que el enlace de recuperación 
    // llegue con #access_token y #type=recovery. Esto evita el error 
    // "PKCE code verifier not found" cuando el usuario abre el link del 
    // correo en una pestaña nueva, otro navegador o su celular.
    flowType: 'implicit'
  }
})