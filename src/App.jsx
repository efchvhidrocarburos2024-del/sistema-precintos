import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './supabase'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import './App.css' // <-- IMPORTAMOS EL CSS GLOBAL

import Login from './components/Login'
import RegistroLotes from './components/RegistroLotes'
import RegistroViajes from './components/RegistroViajes'
import Excepciones from './components/Excepciones'
import Dashboard from './components/Dashboard'
import Reportes from './components/Reportes'
import GestionUsuarios from './components/GestionUsuarios'
import CambiarPassword from './components/CambiarPassword'
import ForgotPassword from './components/ForgotPassword'
import ResetPassword from './components/ResetPassword'
import Conciliacion from './components/Conciliacion'
import ProyeccionDemanda from './components/ProyeccionDemanda'
import ListadoPrecintos from './components/ListadoPrecintos'
import Bitacora from './components/Bitacora'
import GestionPlantas from './components/GestionPlantas'
import PanelRespaldos from './components/PanelRespaldos'

const TIEMPO_INACTIVIDAD_TOTAL = 60 * 60 * 1000;
const TIEMPO_DE_AVISO = TIEMPO_INACTIVIDAD_TOTAL - (2 * 60 * 1000);

function App() {
  const [sesion, setSesion] = useState(null)
  const [pantalla, setPantalla] = useState('')
  const [rol, setRol] = useState(null) 
  const [permisos, setPermisos] = useState([])
  const [cargandoRol, setCargandoRol] = useState(true)
  const [esRecuperacion, setEsRecuperacion] = useState(false)
  const [menuAbierto, setMenuAbierto] = useState(false)

  const [mostrarAviso, setMostrarAviso] = useState(false)
  const timerRef = useRef(null)
  const avisoTimerRef = useRef(null)

  // ... (Lógica de autenticación y roles se mantiene igual) ...
  useEffect(() => {
    if (window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery')) {
      setEsRecuperacion(true)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSesion(session)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSesion(session)
      if (_event === 'PASSWORD_RECOVERY') {
        setEsRecuperacion(true)
      }
    })

    return () => authListener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!sesion) {
      setRol(null)
      setPermisos([])
      setCargandoRol(false)
      return
    }

    async function obtenerRolUsuario() {
      setCargandoRol(true)
      const { data, error } = await supabase
        .from('usuarios')
        .select(`roles ( codigo ), permisos`)
        .eq('id_usuario', sesion.user.id)
        .single()

      if (error) {
        console.error('Error al obtener rol:', error)
        setRol('auditor')
        setPermisos([])
      } else if (data) {
        setRol(data.roles?.codigo?.toLowerCase() || 'auditor') 
        setPermisos(data.permisos || [])
      } else {
        setRol('auditor')
        setPermisos([])
      }
      setCargandoRol(false)
    }

    obtenerRolUsuario()
  }, [sesion])

  const cerrarSesion = useCallback(async () => {
    await supabase.auth.signOut()
    setPantalla('')
    setRol(null)
    setPermisos([])
    setMostrarAviso(false)
  }, [])

  const reiniciarTemporizador = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (avisoTimerRef.current) clearTimeout(avisoTimerRef.current)
    
    setMostrarAviso(false)

    avisoTimerRef.current = setTimeout(() => {
      setMostrarAviso(true)
    }, TIEMPO_DE_AVISO)

    timerRef.current = setTimeout(() => {
      cerrarSesion()
      toast.error("Sesión cerrada por inactividad")
    }, TIEMPO_INACTIVIDAD_TOTAL)
  }, [cerrarSesion])

  useEffect(() => {
    if (!sesion) return

    const eventos = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll']
    
    const manejarActividad = () => {
      if (!mostrarAviso) reiniciarTemporizador()
    }

    eventos.forEach(evento => window.addEventListener(evento, manejarActividad))
    reiniciarTemporizador()

    return () => {
      eventos.forEach(evento => window.removeEventListener(evento, manejarActividad))
      if (timerRef.current) clearTimeout(timerRef.current)
      if (avisoTimerRef.current) clearTimeout(avisoTimerRef.current)
    }
  }, [sesion, mostrarAviso, reiniciarTemporizador])

  const navegar = (pantallaDestino) => {
    setPantalla(pantallaDestino)
    setMenuAbierto(false)
  }

  const tienePermiso = (permisoExtra, rolesPermitidos) => {
    if (rolesPermitidos.includes(rol)) return true
    if (permisos.includes(permisoExtra)) return true
    return false
  }

  if (!sesion) {
    if (esRecuperacion) return <ResetPassword />
    if (pantalla === 'forgot') return <ForgotPassword setPantalla={setPantalla} />
    return <Login setPantalla={setPantalla} />
  }

  if (cargandoRol) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f3f4f6' }}>
        <h2 style={{ color: '#0B5FA5' }}>Cargando perfil...</h2>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
      
      <Toaster position="top-right" toastOptions={{ duration: 4000, style: { fontWeight: 'bold' } }} />

      {mostrarAviso && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ color: 'var(--danger-red)', marginTop: 0 }}>⚠️ Sesión a punto de expirar</h2>
            <p style={{ color: 'var(--text-dark)', marginBottom: '25px', fontSize: '15px' }}>
              Tu sesión se cerrará automáticamente en <strong>2 minutos</strong> por inactividad. ¿Deseas mantenerla abierta?
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={reiniciarTemporizador} style={{ padding: '12px 20px', background: 'var(--primary-green)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', flex: 1 }}>
                Sí, mantener sesión
              </button>
              <button onClick={cerrarSesion} style={{ padding: '12px 20px', background: '#6B7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', flex: 1 }}>
                Cerrar ahora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NAVEGACIÓN CON CLASES CSS */}
      <nav className="nav-container">
        <div className="nav-logo">Petroamérica</div>
        
        <button className="btn-menu" onClick={() => setMenuAbierto(!menuAbierto)}>
          {menuAbierto ? '✕' : '☰'}
        </button>

        <div className={`nav-buttons ${menuAbierto ? 'abierto' : ''}`}>
          
          {tienePermiso('lotes', ['admin_sistema', 'analista_operaciones', 'jefe_operaciones', 'jefe_proyecto']) && (
            <button onClick={() => navegar('lotes')} className={`nav-btn ${pantalla === 'lotes' ? 'active' : ''}`}>Registro de Lotes</button>
          )}
          
          {tienePermiso('viajes', ['admin_sistema', 'admin_planta']) && (
            <>
              <button onClick={() => navegar('admin')} className={`nav-btn ${pantalla === 'admin' ? 'active' : ''}`}>Registrar Viajes (SCOP)</button>
              <button onClick={() => navegar('excepciones')} className={`nav-btn ${pantalla === 'excepciones' ? 'active' : ''}`}>Excepciones</button>
            </>
          )}

          {tienePermiso('precintos', ['admin_sistema', 'admin_planta', 'analista_operaciones', 'jefe_operaciones', 'auditor', 'jefe_proyecto']) && (
            <button onClick={() => navegar('precintos')} className={`nav-btn ${pantalla === 'precintos' ? 'active' : ''}`}>Precintos</button>
          )}

          {tienePermiso('dashboard', ['admin_sistema', 'auditor', 'analista_operaciones', 'jefe_operaciones', 'jefe_proyecto', 'admin_planta']) && (
            <>
              <button onClick={() => navegar('dashboard')} className={`nav-btn ${pantalla === 'dashboard' ? 'active' : ''}`}>Dashboard</button>
              <button onClick={() => navegar('reportes')} className={`nav-btn ${pantalla === 'reportes' ? 'active' : ''}`}>Reportes</button>
            </>
          )}

          {tienePermiso('conciliacion', ['admin_sistema', 'jefe_proyecto', 'analista_operaciones', 'jefe_operaciones']) && (
            <button onClick={() => navegar('conciliacion')} className={`nav-btn ${pantalla === 'conciliacion' ? 'active' : ''}`}>Conciliación</button>
          )}

          {tienePermiso('proyeccion', ['admin_sistema', 'jefe_proyecto', 'jefe_operaciones', 'analista_operaciones']) && (
            <button onClick={() => navegar('proyeccion')} className={`nav-btn ${pantalla === 'proyeccion' ? 'active' : ''}`}>Proyección Demanda</button>
          )}

          {tienePermiso('bitacora', ['admin_sistema', 'auditor', 'jefe_operaciones', 'jefe_proyecto']) && (
            <button onClick={() => navegar('bitacora')} className={`nav-btn ${pantalla === 'bitacora' ? 'active' : ''}`}>Bitácora</button>
          )}

          {tienePermiso('usuarios', ['admin_sistema', 'jefe_proyecto']) && (
            <button onClick={() => navegar('usuarios')} className={`nav-btn ${pantalla === 'usuarios' ? 'active' : ''}`}>Administrar Usuarios</button>
          )}

          {tienePermiso('plantas', ['admin_sistema']) && (
            <button onClick={() => navegar('plantas')} className={`nav-btn ${pantalla === 'plantas' ? 'active' : ''}`}>Config. Plantas</button>
          )}

          {tienePermiso('respaldos', ['admin_sistema']) && (
            <button onClick={() => navegar('respaldos')} className={`nav-btn ${pantalla === 'respaldos' ? 'active' : ''}`}>Respaldos</button>
          )}
        </div>

        <div className="user-info">
          <span>👤 {sesion.user.email} ({rol ? rol.toUpperCase() : 'SIN ROL'})</span>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => navegar('cambiar-password')} className="btn-profile">Mi Perfil</button>
            <button onClick={cerrarSesion} className="btn-logout">Salir</button>
          </div>
        </div>
      </nav>

      <div style={{ paddingTop: '20px', paddingBottom: '40px' }}>
        {/* RENDERIZADO DE COMPONENTES */}
        {pantalla === 'lotes' && tienePermiso('lotes', ['admin_sistema', 'analista_operaciones', 'jefe_operaciones', 'jefe_proyecto']) && <RegistroLotes />}
        {pantalla === 'admin' && tienePermiso('viajes', ['admin_sistema', 'admin_planta']) && <RegistroViajes />}
        {pantalla === 'excepciones' && tienePermiso('viajes', ['admin_sistema', 'admin_planta']) && <Excepciones />}
        {pantalla === 'precintos' && tienePermiso('precintos', ['admin_sistema', 'admin_planta', 'analista_operaciones', 'jefe_operaciones', 'auditor', 'jefe_proyecto']) && <ListadoPrecintos />}
        {pantalla === 'dashboard' && tienePermiso('dashboard', ['admin_sistema', 'auditor', 'analista_operaciones', 'jefe_operaciones', 'jefe_proyecto', 'admin_planta']) && <Dashboard />}
        {pantalla === 'reportes' && tienePermiso('dashboard', ['admin_sistema', 'auditor', 'analista_operaciones', 'jefe_operaciones', 'jefe_proyecto', 'admin_planta']) && <Reportes />}
        {pantalla === 'bitacora' && tienePermiso('bitacora', ['admin_sistema', 'auditor', 'jefe_operaciones', 'jefe_proyecto']) && <Bitacora />}
        {pantalla === 'usuarios' && tienePermiso('usuarios', ['admin_sistema', 'jefe_proyecto']) && <GestionUsuarios />}
        {pantalla === 'conciliacion' && tienePermiso('conciliacion', ['admin_sistema', 'jefe_proyecto', 'analista_operaciones', 'jefe_operaciones']) && <Conciliacion />}
        {pantalla === 'proyeccion' && tienePermiso('proyeccion', ['admin_sistema', 'jefe_proyecto', 'jefe_operaciones', 'analista_operaciones']) && <ProyeccionDemanda />}
        {pantalla === 'cambiar-password' && <CambiarPassword />}
        {pantalla === 'plantas' && tienePermiso('plantas', ['admin_sistema']) && <GestionPlantas />}
        {pantalla === 'respaldos' && tienePermiso('respaldos', ['admin_sistema']) && <PanelRespaldos />}

        {pantalla === '' && (
          <div style={{ textAlign: 'center', marginTop: '100px', color: 'var(--text-light)', padding: '0 20px' }}>
            <h2>Bienvenido al Sistema de Precintos</h2>
            <p>Selecciona una opción en el menú superior para comenzar.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App