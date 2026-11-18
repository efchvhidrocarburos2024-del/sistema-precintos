import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Login from './components/Login'
import RegistroLotes from './components/RegistroLotes'
import RegistroViajes from './components/RegistroViajes'
import Excepciones from './components/Excepciones'
import Dashboard from './components/Dashboard'
import Reportes from './components/Reportes'
import GestionUsuarios from './components/GestionUsuarios'

// --- NUEVOS COMPONENTES ---
import CambiarPassword from './components/CambiarPassword'
import ForgotPassword from './components/ForgotPassword'
import ResetPassword from './components/ResetPassword'

function App() {
  const [sesion, setSesion] = useState(null)
  const [pantalla, setPantalla] = useState('')

  // --- LÓGICA PARA DETECTAR ENLACE DE RECUPERACIÓN ---
  const [esRecuperacion, setEsRecuperacion] = useState(false)

  useEffect(() => {
    // Detectar si el usuario viene de un enlace de correo de Supabase
    if (window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery')) {
      setEsRecuperacion(true)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSesion(session)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSesion(session)
      // Si Supabase procesa el token del correo, quitamos la vista de recuperación
      if (_event === 'PASSWORD_RECOVERY') {
        setEsRecuperacion(true)
      }
    })

    return () => authListener.subscription.unsubscribe()
  }, [])

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    setPantalla('')
  }

  // --- LÓGICA DE PANTALLAS SIN SESIÓN ---
  if (!sesion) {
    // 1. Si viene de un correo de recuperación, mostramos ResetPassword
    if (esRecuperacion) {
      return <ResetPassword />
    }
    // 2. Si el usuario hizo clic en "Olvidé mi contraseña" desde el Login
    if (pantalla === 'forgot') {
      return <ForgotPassword setPantalla={setPantalla} />
    }
    // 3. Si no, mostramos el Login normal (le pasamos setPantalla por si acaso)
    return <Login setPantalla={setPantalla} />
  }

  const rol = sesion.user.user_metadata?.rol || 'auditor'

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 30px', backgroundColor: '#0B5FA5', flexWrap: 'wrap' }}>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {(rol === 'analista_operaciones' || rol === 'jefe_operaciones' || rol === 'jefe_proyecto') && (
            <button onClick={() => setPantalla('lotes')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', border: 'none', borderRadius: '4px', backgroundColor: pantalla === 'lotes' ? 'white' : 'transparent', color: pantalla === 'lotes' ? '#0B5FA5' : 'white' }}>Registro de Lotes</button>
          )}
          
          {(rol === 'admin_planta') && (
            <>
              <button onClick={() => setPantalla('admin')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', border: 'none', borderRadius: '4px', backgroundColor: pantalla === 'admin' ? 'white' : 'transparent', color: pantalla === 'admin' ? '#0B5FA5' : 'white' }}>Registrar Viajes (SCOP)</button>
              <button onClick={() => setPantalla('excepciones')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', border: 'none', borderRadius: '4px', backgroundColor: pantalla === 'excepciones' ? 'white' : 'transparent', color: pantalla === 'excepciones' ? '#0B5FA5' : 'white' }}>Excepciones</button>
            </>
          )}

          {(rol === 'auditor' || rol === 'analista_operaciones' || rol === 'jefe_operaciones' || rol === 'jefe_proyecto' || rol === 'admin_planta') && (
            <>
              <button onClick={() => setPantalla('dashboard')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', border: 'none', borderRadius: '4px', backgroundColor: pantalla === 'dashboard' ? 'white' : 'transparent', color: pantalla === 'dashboard' ? '#0B5FA5' : 'white' }}>Dashboard</button>
              <button onClick={() => setPantalla('reportes')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', border: 'none', borderRadius: '4px', backgroundColor: pantalla === 'reportes' ? 'white' : 'transparent', color: pantalla === 'reportes' ? '#0B5FA5' : 'white' }}>Reportes</button>
            </>
          )}

          {(rol === 'jefe_proyecto') && (
            <button onClick={() => setPantalla('usuarios')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', border: 'none', borderRadius: '4px', backgroundColor: pantalla === 'usuarios' ? 'white' : 'transparent', color: pantalla === 'usuarios' ? '#0B5FA5' : 'white' }}>Crear Usuarios</button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', color: 'white', fontSize: '14px' }}>
          <span>👤 {sesion.user.email} ({rol})</span>
          
          {/* NUEVO BOTÓN DE CAMBIAR CONTRASEÑA */}
          <button onClick={() => setPantalla('cambiar-password')} style={{ padding: '8px 12px', background: '#EAB308', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Mi Perfil</button>
          
          <button onClick={cerrarSesion} style={{ padding: '8px 12px', background: '#DC2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Salir</button>
        </div>
      </nav>

      <div style={{ paddingTop: '20px' }}>
        {pantalla === 'lotes' && (rol === 'analista_operaciones' || rol === 'jefe_operaciones' || rol === 'jefe_proyecto') && <RegistroLotes />}
        {pantalla === 'admin' && (rol === 'admin_planta') && <RegistroViajes />}
        {pantalla === 'excepciones' && (rol === 'admin_planta') && <Excepciones />}
        {pantalla === 'dashboard' && <Dashboard />}
        {pantalla === 'reportes' && <Reportes />}
        {pantalla === 'usuarios' && rol === 'jefe_proyecto' && <GestionUsuarios />}
        
        {/* NUEVO COMPONENTE EN PANTALLA */}
        {pantalla === 'cambiar-password' && <CambiarPassword />}
        
        {pantalla === '' && (
          <div style={{ textAlign: 'center', marginTop: '100px', color: '#666' }}>
            <h2>Bienvenido al Sistema de Precintos</h2>
            <p>Selecciona una opción en el menú superior para comenzar.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App