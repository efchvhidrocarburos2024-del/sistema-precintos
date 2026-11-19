import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './supabase'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import './App.css'

// Importación de todos los componentes
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
import RepositorioDocumental from './components/RepositorioDocumental'

const TIEMPO_INACTIVIDAD_TOTAL = 60 * 60 * 1000;
const TIEMPO_DE_AVISO = TIEMPO_INACTIVIDAD_TOTAL - (2 * 60 * 1000);

// ============================================================================
// COMPONENTE: LOBBY DE MÓDULOS (Pantalla Principal SIGMO)
// ============================================================================
function LobbyModulos({ sesion, cerrarSesion, setPantalla, rol }) {
  // Matriz de accesos
  const rolesPrecintos = ['admin_sistema', 'admin_planta', 'jefe_operaciones', 'analista_operaciones', 'auditor'];
  const rolesRepositorio = ['admin_sistema', 'admin_planta', 'jefe_operaciones', 'analista_operaciones', 'asesor_comercial', 'auditor'];

  const puedeVerPrecintos = rolesPrecintos.includes(rol);
  const puedeVerRepositorio = rolesRepositorio.includes(rol);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Cabecera del Lobby */}
      <header style={{ padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <div>
          <h1 style={{ margin: 0, color: 'var(--primary-blue)', fontSize: '32px', fontWeight: '900', letterSpacing: '1.5px' }}>SIGMO</h1>
          <span style={{ color: 'var(--text-light)', fontSize: '14px', fontWeight: '500' }}>Sistema de Gestión Modular</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ color: 'var(--text-dark)', fontWeight: '600', fontSize: '14px' }}>👤 {sesion.user.email} ({rol?.toUpperCase() || 'SIN ROL'})</span>
          <button onClick={cerrarSesion} style={{ padding: '8px 16px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', color: '#374151' }}>
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* Contenido del Lobby */}
      <main style={{ flex: 1, padding: '60px 20px', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <h2 style={{ color: 'var(--text-dark)', fontSize: '28px', marginBottom: '10px' }}>Bienvenido a tu plataforma</h2>
          <p style={{ color: 'var(--text-light)', fontSize: '16px' }}>Selecciona el módulo que deseas administrar</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px' }}>
          
          {/* MÓDULO 1: PRECINTOS */}
          {puedeVerPrecintos && (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '30px', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '2px solid var(--primary-blue)' }}>
              <div style={{ fontSize: '50px', marginBottom: '15px' }}>📦</div>
              <h3 style={{ color: 'var(--primary-blue)', marginBottom: '15px', fontSize: '20px' }}>Gestión de Precintos</h3>
              <p style={{ color: 'var(--text-light)', marginBottom: '25px', fontSize: '14px', lineHeight: '1.5' }}>
                Control de viajes, SCOP, inventario de plantas y reportes operativos.
              </p>
              <button 
                onClick={() => setPantalla('dashboard')} 
                style={{ width: '100%', padding: '12px', borderRadius: '6px', border: 'none', background: 'var(--primary-blue)', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}
              >
                Entrar al Módulo
              </button>
            </div>
          )}

          {/* MÓDULO 2: REPOSITORIO DOCUMENTAL */}
          {puedeVerRepositorio && (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '30px', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '2px solid var(--primary-blue)' }}>
              <div style={{ fontSize: '50px', marginBottom: '15px' }}>📂</div>
              <h3 style={{ color: 'var(--primary-blue)', marginBottom: '15px', fontSize: '20px' }}>Repositorio Documental</h3>
              <p style={{ color: 'var(--text-light)', marginBottom: '25px', fontSize: '14px', lineHeight: '1.5' }}>
                Busca archivos técnicos, operativos y guías por categorías.
              </p>
              <button 
                onClick={() => setPantalla('repositorio')} 
                style={{ width: '100%', padding: '12px', borderRadius: '6px', border: 'none', background: 'var(--primary-blue)', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}
              >
                Entrar al Módulo
              </button>
            </div>
          )}

          {/* MÓDULO FUTURO: FLOTA (BLOQUEADO) */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '30px', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', opacity: 0.6 }}>
            <div style={{ fontSize: '50px', marginBottom: '15px' }}>🚚</div>
            <h3 style={{ color: 'var(--text-dark)', marginBottom: '15px', fontSize: '20px' }}>Gestión de Flota</h3>
            <p style={{ color: 'var(--text-light)', marginBottom: '25px', fontSize: '14px', lineHeight: '1.5' }}>
              Control de vehículos, rutas y conductores.
            </p>
            <button disabled style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc', background: '#f3f4f6', color: '#9ca3af', fontWeight: 'bold', fontSize: '15px', cursor: 'not-allowed' }}>
              Próximamente
            </button>
          </div>

        </div>
      </main>
    </div>
  )
}

// ============================================================================
// COMPONENTE PRINCIPAL: APP
// ============================================================================
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

  // Lógica de Autenticación
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

  // Lógica de Roles y Permisos
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

  // Lógica de Inactividad
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

  // Funciones de Navegación
  const navegar = (pantallaDestino) => {
    setPantalla(pantallaDestino)
    setMenuAbierto(false)
  }

  const tienePermiso = (permisoExtra, rolesPermitidos) => {
    if (rolesPermitidos.includes(rol)) return true
    if (permisos.includes(permisoExtra)) return true
    return false
  }

  // --- VISTAS PÚBLICAS (SIN SESIÓN) ---
  if (!sesion) {
    if (esRecuperacion) return <ResetPassword />
    if (pantalla === 'forgot') return <ForgotPassword setPantalla={setPantalla} />
    return <Login setPantalla={setPantalla} />
  }

  // --- PANTALLA DE CARGA ---
  if (cargandoRol) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f3f4f6' }}>
        <h2 style={{ color: '#0B5FA5' }}>Cargando perfil...</h2>
      </div>
    )
  }

  // --- VISTA LOBBY (SIGMO) ---
  if (pantalla === '') {
    return (
      <>
        <Toaster position="top-right" toastOptions={{ duration: 4000, style: { fontWeight: 'bold' } }} />
        {mostrarAviso && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2 style={{ color: 'var(--danger-red)', marginTop: 0 }}>⚠️ Sesión a punto de expirar</h2>
              <p style={{ color: 'var(--text-dark)', marginBottom: '25px', fontSize: '15px' }}>Tu sesión se cerrará en <strong>2 minutos</strong>.</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={reiniciarTemporizador} style={{ padding: '10px', background: 'var(--primary-green)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', flex: 1 }}>Mantener sesión</button>
                <button onClick={cerrarSesion} style={{ padding: '10px', background: '#6B7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', flex: 1 }}>Cerrar ahora</button>
              </div>
            </div>
          </div>
        )}
        <LobbyModulos sesion={sesion} cerrarSesion={cerrarSesion} setPantalla={setPantalla} rol={rol} />
      </>
    )
  }

  // --- VISTA: MÓDULO REPOSITORIO DOCUMENTAL ---
  if (pantalla === 'repositorio') {
    return (
      <>
        <Toaster position="top-right" toastOptions={{ duration: 4000, style: { fontWeight: 'bold' } }} />
        {mostrarAviso && (
           <div className="modal-overlay">
           <div className="modal-content">
             <h2 style={{ color: 'var(--danger-red)', marginTop: 0 }}>⚠️ Sesión a punto de expirar</h2>
             <p style={{ color: 'var(--text-dark)', marginBottom: '25px', fontSize: '15px' }}>Tu sesión se cerrará en <strong>2 minutos</strong>.</p>
             <div style={{ display: 'flex', gap: '10px' }}>
               <button onClick={reiniciarTemporizador} style={{ padding: '10px', background: 'var(--primary-green)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', flex: 1 }}>Mantener sesión</button>
               <button onClick={cerrarSesion} style={{ padding: '10px', background: '#6B7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', flex: 1 }}>Cerrar ahora</button>
             </div>
           </div>
         </div>
        )}
        <RepositorioDocumental setPantalla={setPantalla} rol={rol} />
      </>
    )
  }

  // --- VISTA DEL MÓDULO DE PRECINTOS ---
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

      {/* NAVEGACIÓN DEL MÓDULO PRECINTOS */}
      <nav className="nav-container">
        {/* LOGO Y BOTÓN VOLVER */}
        <div className="nav-logo" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => navegar('')} 
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
            title="Volver al menú de módulos de SIGMO"
          >
            ← SIGMO
          </button>
          <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'white' }}>Precintos</span>
        </div>
        
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
        {/* RENDERIZADO DE COMPONENTES DEL MÓDULO PRECINTOS */}
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

      </div>
    </div>
  )
}

export default App