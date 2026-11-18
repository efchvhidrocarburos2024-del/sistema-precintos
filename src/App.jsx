import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './supabase'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'

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

// CONSTANTES DE TIEMPO (En milisegundos)
const TIEMPO_INACTIVIDAD_TOTAL = 60 * 60 * 1000; // 1 Hora (3600000 ms)
const TIEMPO_DE_AVISO = TIEMPO_INACTIVIDAD_TOTAL - (2 * 60 * 1000); // Avisar 2 minutos antes

function App() {
  const [sesion, setSesion] = useState(null)
  const [pantalla, setPantalla] = useState('')
  const [rol, setRol] = useState(null) 
  const [permisos, setPermisos] = useState([]) // NUEVO ESTADO PARA PERMISOS EXTRA
  const [cargandoRol, setCargandoRol] = useState(true)
  const [esRecuperacion, setEsRecuperacion] = useState(false)
  const [menuAbierto, setMenuAbierto] = useState(false)

  // ESTADOS Y REFERENCIAS PARA EL AUTO-CIERRE DE SESIÓN
  const [mostrarAviso, setMostrarAviso] = useState(false)
  const timerRef = useRef(null)
  const avisoTimerRef = useRef(null)

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
        .select(`roles ( codigo ), permisos`) // Agregamos el campo permisos
        .eq('id_usuario', sesion.user.id)
        .single()

      if (error) {
        console.error('Error al obtener rol:', error)
        setRol('auditor')
        setPermisos([])
      } else if (data) {
        setRol(data.roles?.codigo?.toLowerCase() || 'auditor') 
        setPermisos(data.permisos || []) // Guardamos el arreglo de permisos
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

  // --- LÓGICA DE INACTIVIDAD ---
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
      if (!mostrarAviso) {
        reiniciarTemporizador()
      }
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

  // --- FUNCIÓN AUXILIAR DE PERMISOS ---
  // Retorna true si el rol está permitido por defecto O si el usuario tiene el permiso extra
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
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      
      <style>{`
        .nav-container { display: flex; justify-content: space-between; align-items: center; padding: 15px 30px; background-color: #0B5FA5; flex-wrap: wrap; }
        .nav-buttons { display: flex; gap: 10px; flex-wrap: wrap; }
        .user-info { display: flex; align-items: center; gap: 15px; color: white; font-size: 14px; }
        .btn-menu { display: none; background: none; border: none; color: white; font-size: 24px; cursor: pointer; }
        
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 9999; }
        .modal-content { background: white; padding: 30px; border-radius: 8px; max-width: 400px; width: 90%; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }

        @media (max-width: 900px) {
          .nav-container { padding: 10px 15px; }
          .nav-buttons { display: none; width: 100%; flex-direction: column; margin-top: 15px; gap: 5px; }
          .nav-buttons.abierto { display: flex; }
          .btn-menu { display: block; }
          .user-info { width: 100%; justify-content: space-between; margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 10px; }
          .nav-buttons button { width: 100%; text-align: left; padding: 12px !important; }
        }
      `}</style>

      <Toaster position="top-right" toastOptions={{ duration: 4000, style: { fontWeight: 'bold' } }} />

      {/* MODAL DE AVISO DE INACTIVIDAD */}
      {mostrarAviso && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ color: '#DC2626', marginTop: 0 }}>⚠️ Sesión a punto de expirar</h2>
            <p style={{ color: '#444', marginBottom: '25px', fontSize: '15px' }}>
              Tu sesión se cerrará automáticamente en <strong>2 minutos</strong> por inactividad. ¿Deseas mantenerla abierta?
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button 
                onClick={reiniciarTemporizador} 
                style={{ padding: '12px 20px', background: '#16A34A', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', flex: 1 }}
              >
                Sí, mantener sesión
              </button>
              <button 
                onClick={cerrarSesion} 
                style={{ padding: '12px 20px', background: '#6B7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', flex: 1 }}
              >
                Cerrar ahora
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="nav-container">
        <div style={{ color: 'white', fontWeight: 'bold', fontSize: '18px' }}>Petroamérica</div>
        
        <button className="btn-menu" onClick={() => setMenuAbierto(!menuAbierto)}>
          {menuAbierto ? '✕' : '☰'}
        </button>

        <div className={`nav-buttons ${menuAbierto ? 'abierto' : ''}`}>
          
          {tienePermiso('lotes', ['admin_sistema', 'analista_operaciones', 'jefe_operaciones', 'jefe_proyecto']) && (
            <button onClick={() => navegar('lotes')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', border: 'none', borderRadius: '4px', backgroundColor: pantalla === 'lotes' ? 'white' : 'transparent', color: pantalla === 'lotes' ? '#0B5FA5' : 'white' }}>Registro de Lotes</button>
          )}
          
          {tienePermiso('viajes', ['admin_sistema', 'admin_planta']) && (
            <>
              <button onClick={() => navegar('admin')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', border: 'none', borderRadius: '4px', backgroundColor: pantalla === 'admin' ? 'white' : 'transparent', color: pantalla === 'admin' ? '#0B5FA5' : 'white' }}>Registrar Viajes (SCOP)</button>
              <button onClick={() => navegar('excepciones')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', border: 'none', borderRadius: '4px', backgroundColor: pantalla === 'excepciones' ? 'white' : 'transparent', color: pantalla === 'excepciones' ? '#0B5FA5' : 'white' }}>Excepciones</button>
            </>
          )}

          {tienePermiso('precintos', ['admin_sistema', 'admin_planta', 'analista_operaciones', 'jefe_operaciones', 'auditor', 'jefe_proyecto']) && (
            <button onClick={() => navegar('precintos')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', border: 'none', borderRadius: '4px', backgroundColor: pantalla === 'precintos' ? 'white' : 'transparent', color: pantalla === 'precintos' ? '#0B5FA5' : 'white' }}>Precintos</button>
          )}

          {tienePermiso('dashboard', ['admin_sistema', 'auditor', 'analista_operaciones', 'jefe_operaciones', 'jefe_proyecto', 'admin_planta']) && (
            <>
              <button onClick={() => navegar('dashboard')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', border: 'none', borderRadius: '4px', backgroundColor: pantalla === 'dashboard' ? 'white' : 'transparent', color: pantalla === 'dashboard' ? '#0B5FA5' : 'white' }}>Dashboard</button>
              <button onClick={() => navegar('reportes')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', border: 'none', borderRadius: '4px', backgroundColor: pantalla === 'reportes' ? 'white' : 'transparent', color: pantalla === 'reportes' ? '#0B5FA5' : 'white' }}>Reportes</button>
            </>
          )}

          {tienePermiso('conciliacion', ['admin_sistema', 'jefe_proyecto', 'analista_operaciones', 'jefe_operaciones']) && (
            <button onClick={() => navegar('conciliacion')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', border: 'none', borderRadius: '4px', backgroundColor: pantalla === 'conciliacion' ? 'white' : 'transparent', color: pantalla === 'conciliacion' ? '#0B5FA5' : 'white' }}>Conciliación</button>
          )}

          {tienePermiso('proyeccion', ['admin_sistema', 'jefe_proyecto', 'jefe_operaciones', 'analista_operaciones']) && (
            <button onClick={() => navegar('proyeccion')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', border: 'none', borderRadius: '4px', backgroundColor: pantalla === 'proyeccion' ? 'white' : 'transparent', color: pantalla === 'proyeccion' ? '#0B5FA5' : 'white' }}>Proyección Demanda</button>
          )}

          {tienePermiso('bitacora', ['admin_sistema', 'auditor', 'jefe_operaciones', 'jefe_proyecto']) && (
            <button onClick={() => navegar('bitacora')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', border: 'none', borderRadius: '4px', backgroundColor: pantalla === 'bitacora' ? 'white' : 'transparent', color: pantalla === 'bitacora' ? '#0B5FA5' : 'white' }}>Bitácora</button>
          )}

          {tienePermiso('usuarios', ['admin_sistema', 'jefe_proyecto']) && (
            <button onClick={() => navegar('usuarios')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', border: 'none', borderRadius: '4px', backgroundColor: pantalla === 'usuarios' ? 'white' : 'transparent', color: pantalla === 'usuarios' ? '#0B5FA5' : 'white' }}>Administrar Usuarios</button>
          )}

          {tienePermiso('plantas', ['admin_sistema']) && (
            <button onClick={() => navegar('plantas')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', border: 'none', borderRadius: '4px', backgroundColor: pantalla === 'plantas' ? 'white' : 'transparent', color: pantalla === 'plantas' ? '#0B5FA5' : 'white' }}>Config. Plantas</button>
          )}

          {tienePermiso('respaldos', ['admin_sistema']) && (
            <button onClick={() => navegar('respaldos')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', border: 'none', borderRadius: '4px', backgroundColor: pantalla === 'respaldos' ? 'white' : 'transparent', color: pantalla === 'respaldos' ? '#0B5FA5' : 'white' }}>Respaldos</button>
          )}
        </div>

        <div className="user-info">
          <span>👤 {sesion.user.email} ({rol ? rol.toUpperCase() : 'SIN ROL'})</span>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => navegar('cambiar-password')} style={{ padding: '8px 12px', background: '#EAB308', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Mi Perfil</button>
            <button onClick={cerrarSesion} style={{ padding: '8px 12px', background: '#DC2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Salir</button>
          </div>
        </div>
      </nav>

      <div style={{ paddingTop: '20px', paddingBottom: '40px' }}>
        
        {/* RENDERIZADO DE COMPONENTES CON VALIDACIÓN DE PERMISOS */}
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
          <div style={{ textAlign: 'center', marginTop: '100px', color: '#666', padding: '0 20px' }}>
            <h2>Bienvenido al Sistema de Precintos</h2>
            <p>Selecciona una opción en el menú superior para comenzar.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App