// src/App.jsx
import { useState, useEffect, useRef, useCallback, lazy, Suspense, Component } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from './supabase'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import './App.css'

// ============================================================
// SHELL — carga inmediata (primera pintura y navegación)
// ============================================================
import Login from './components/Login'
import LobbyModulos from './components/LobbyModulos'
import MenuPrecintos from './components/MenuPrecintos'
import NavbarPrecintos from './components/NavbarPrecintos'
import ResetPassword from './components/ResetPassword'

// ============================================================
// MÓDULOS — carga perezosa (cada uno genera su propio chunk)
// ============================================================
const ForgotPassword = lazy(() => import('./components/ForgotPassword'))

const RegistroLotes = lazy(() => import('./components/RegistroLotes'))
const RegistroViajes = lazy(() => import('./components/RegistroViajes'))
const Excepciones = lazy(() => import('./components/Excepciones'))
const ListadoPrecintos = lazy(() => import('./components/ListadoPrecintos'))
const Dashboard = lazy(() => import('./components/Dashboard'))
const Reportes = lazy(() => import('./components/Reportes'))
const Bitacora = lazy(() => import('./components/Bitacora'))
const Conciliacion = lazy(() => import('./components/Conciliacion'))
const ProyeccionDemanda = lazy(() => import('./components/ProyeccionDemanda'))
const CambiarPassword = lazy(() => import('./components/CambiarPassword'))
const GestionPlantas = lazy(() => import('./components/GestionPlantas'))
const PanelRespaldos = lazy(() => import('./components/PanelRespaldos'))

const GestionUsuarios = lazy(() => import('./components/GestionUsuarios'))
const GestionCatalogos = lazy(() => import('./components/GestionCatalogos'))
const RepositorioDocumental = lazy(() => import('./components/RepositorioDocumental'))

// OJO: vive en la subcarpeta precios/ y tiene export default propio.
const GestionPrecios = lazy(() => import('./components/precios/GestionPrecios'))

// --- Utilidades centralizadas ---
import { puedeAccederPantalla, PANTALLAS_CON_NAVBAR } from './utils/permisos'
import { throttle } from './utils/throttle'

// ============================================================
// CONSTANTES
// ============================================================
const TIEMPO_INACTIVIDAD_TOTAL = 60 * 60 * 1000
const TIEMPO_DE_AVISO = TIEMPO_INACTIVIDAD_TOTAL - 2 * 60 * 1000
const STORAGE_KEY_PANTALLA = 'sigmo_pantalla'
const RUTA_RECUPERACION = '/reset-password'

// ============================================================
// FALLBACK DE CARGA (Suspense)
// ============================================================
function CargandoModulo({ texto = 'Cargando módulo…' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 14 }}>
      <style>{'@keyframes sigmo-girar { to { transform: rotate(360deg); } }'}</style>
      <div style={{ width: 38, height: 38, borderRadius: '50%', border: '4px solid #e5e7eb', borderTopColor: '#0B5FA5', animation: 'sigmo-girar 0.8s linear infinite' }} />
      <p style={{ color: '#0B5FA5', fontWeight: 'bold', margin: 0 }}>{texto}</p>
    </div>
  )
}

// ============================================================
// ERROR BOUNDARY — un módulo roto ya no tumba toda la app
// ============================================================
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('SIGMO · Error en módulo:', error, info)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    const esErrorDeCarga = /dynamically imported module|Loading chunk|Importing a module script failed/i.test(
      String(error?.message || error)
    )

    return (
      <div style={{ maxWidth: 480, margin: '60px auto', padding: 24, background: 'white', borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.08)', textAlign: 'center' }}>
        <h2 style={{ color: '#B91C1C', marginTop: 0 }}>⚠️ Ocurrió un error en este módulo</h2>
        <p style={{ color: '#374151', fontSize: 14 }}>
          {esErrorDeCarga
            ? 'No se pudo descargar el módulo (posible actualización de la app o conexión inestable). Recarga para obtener la última versión.'
            : String(error?.message || error)}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 16px', background: '#0B5FA5', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}>
            Recargar aplicación
          </button>
          <button onClick={() => this.setState({ error: null })} style={{ padding: '10px 16px', background: '#6B7280', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}>
            Reintentar
          </button>
        </div>
      </div>
    )
  }
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
function App() {
  const location = useLocation()
  const navigate = useNavigate()

  const [sesion, setSesion] = useState(null)
  const [pantalla, setPantalla] = useState(
    () => sessionStorage.getItem(STORAGE_KEY_PANTALLA) || ''
  )
  const [rol, setRol] = useState(null)
  const [permisos, setPermisos] = useState([])
  const [cargandoRol, setCargandoRol] = useState(true)

  // ✅ Detección sincrónica: ruta dedicada /reset-password (inmune a la limpieza
  // del hash) + fallback por hash para enlaces antiguos con redirectTo en la raíz.
  const [recInicial] = useState(() => {
    const hash = window.location.hash
    const sp = new URLSearchParams(window.location.search)
    const hp = new URLSearchParams(hash.replace(/^#/, ''))
    const esRec =
      window.location.pathname === RUTA_RECUPERACION ||
      (hash.includes('access_token') && (hash.includes('type=recovery') || hp.get('type') === 'recovery')) ||
      sp.get('type') === 'recovery' ||
      hp.get('type') === 'recovery' ||
      window.location.pathname.includes('/auth/v1/verify')
    const errRaw =
      sp.get('error_description') || sp.get('error') ||
      hp.get('error_description') || hp.get('error') || null
    return { esRec, errRaw }
  })
  const [esRecuperacion, setEsRecuperacion] = useState(recInicial.esRec)

  const [mostrarAviso, setMostrarAviso] = useState(false)
  const timerRef = useRef(null)
  const avisoTimerRef = useRef(null)

  // ----------------------------------------------------------
  // Persistencia de pantalla actual
  // ----------------------------------------------------------
  useEffect(() => {
    if (pantalla) {
      sessionStorage.setItem(STORAGE_KEY_PANTALLA, pantalla)
    } else {
      sessionStorage.removeItem(STORAGE_KEY_PANTALLA)
    }
  }, [pantalla])

  // ----------------------------------------------------------
  // ✅ La ruta dedicada siempre activa el modo recuperación
  // ----------------------------------------------------------
  useEffect(() => {
    if (location.pathname === RUTA_RECUPERACION) {
      setEsRecuperacion(true)
    }
  }, [location.pathname])

  // ----------------------------------------------------------
  // ✅ Aviso si el enlace llegó con error (expirado / ya usado)
  // ----------------------------------------------------------
  useEffect(() => {
    if (!recInicial.errRaw) return
    const msg = /expired|expir/i.test(recInicial.errRaw)
      ? 'El enlace de recuperación expiró. Solicita uno nuevo.'
      : /invalid|used|single.use/i.test(recInicial.errRaw)
        ? 'El enlace ya fue utilizado o es inválido. Solicita uno nuevo.'
        : 'No se pudo validar el enlace de recuperación. Solicita uno nuevo.'
    toast.error(msg, { duration: 6000 })
    window.history.replaceState(null, '', window.location.pathname)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ----------------------------------------------------------
  // Autenticación
  // ----------------------------------------------------------
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSesion(session)
      if (session && !pantalla) {
        const lastHash = sessionStorage.getItem('last_hash')
        if (lastHash && lastHash.includes('type=recovery')) {
          setEsRecuperacion(true)
          sessionStorage.removeItem('last_hash')
        }
      }
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSesion(session)
      if (_event === 'PASSWORD_RECOVERY') {
        setEsRecuperacion(true)
      }
    })

    return () => authListener.subscription.unsubscribe()
  }, [])

  // ----------------------------------------------------------
  // Roles y permisos (con caché)
  // ----------------------------------------------------------
  useEffect(() => {
    if (!sesion) {
      setRol(null)
      setPermisos([])
      setCargandoRol(false)
      sessionStorage.removeItem('sigmo_rol')
      sessionStorage.removeItem('sigmo_permisos')
      return
    }

    const cachedRol = sessionStorage.getItem('sigmo_rol')
    const cachedPermisos = sessionStorage.getItem('sigmo_permisos')

    if (cachedRol) {
      setRol(cachedRol)
      setPermisos(JSON.parse(cachedPermisos || '[]'))
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
        const nuevoRol = data.roles?.codigo?.toLowerCase() || 'auditor'
        const nuevosPermisos = data.permisos || []
        setRol(nuevoRol)
        setPermisos(nuevosPermisos)
        sessionStorage.setItem('sigmo_rol', nuevoRol)
        sessionStorage.setItem('sigmo_permisos', JSON.stringify(nuevosPermisos))
      } else {
        setRol('auditor')
        setPermisos([])
      }
      setCargandoRol(false)
    }

    obtenerRolUsuario()
  }, [sesion])

  // ----------------------------------------------------------
  // Validación: pantalla persistida inaccesible → lobby
  // ----------------------------------------------------------
  useEffect(() => {
    if (cargandoRol || !sesion || !rol) return
    if (pantalla && !puedeAccederPantalla(pantalla, rol, permisos)) {
      setPantalla('')
      sessionStorage.removeItem(STORAGE_KEY_PANTALLA)
    }
  }, [cargandoRol, sesion, rol, permisos, pantalla])

  // ----------------------------------------------------------
  // Cerrar sesión
  // ----------------------------------------------------------
  const cerrarSesion = useCallback(async () => {
    await supabase.auth.signOut()
    setPantalla('')
    setRol(null)
    setPermisos([])
    setMostrarAviso(false)
    sessionStorage.removeItem('sigmo_rol')
    sessionStorage.removeItem('sigmo_permisos')
    sessionStorage.removeItem(STORAGE_KEY_PANTALLA)
    navigate('/', { replace: true })
  }, [navigate])

  // ----------------------------------------------------------
  // ✅ Salida limpia del flujo de recuperación: baja la bandera y
  // navega a la raíz (elimina path /reset-password y cualquier hash)
  // ----------------------------------------------------------
  const finRecuperacion = useCallback(() => {
    setEsRecuperacion(false)
    navigate('/', { replace: true })
  }, [navigate])

  // ----------------------------------------------------------
  // Inactividad
  // ----------------------------------------------------------
  const reiniciarTemporizador = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (avisoTimerRef.current) clearTimeout(avisoTimerRef.current)

    setMostrarAviso(false)

    avisoTimerRef.current = setTimeout(() => {
      setMostrarAviso(true)
    }, TIEMPO_DE_AVISO)

    timerRef.current = setTimeout(() => {
      cerrarSesion()
      toast.error('Sesión cerrada por inactividad')
    }, TIEMPO_INACTIVIDAD_TOTAL)
  }, [cerrarSesion])

  useEffect(() => {
    if (!sesion) return

    const manejarActividad = throttle(() => {
      if (!mostrarAviso) reiniciarTemporizador()
    }, 1000)

    const eventos = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll']
    eventos.forEach((evento) => window.addEventListener(evento, manejarActividad))
    reiniciarTemporizador()

    return () => {
      eventos.forEach((evento) => window.removeEventListener(evento, manejarActividad))
      if (timerRef.current) clearTimeout(timerRef.current)
      if (avisoTimerRef.current) clearTimeout(avisoTimerRef.current)
    }
  }, [sesion, mostrarAviso, reiniciarTemporizador])

  // ----------------------------------------------------------
  // --- ✅ FLUJO DE RECUPERACIÓN (prioridad máxima, con o sin sesión) ---
  // ----------------------------------------------------------
  if (esRecuperacion) {
    return (
      <>
        <Toaster position="top-right" toastOptions={{ duration: 4000, style: { fontWeight: 'bold' } }} />
        <ErrorBoundary key="reset-password">
          <ResetPassword setPantalla={setPantalla} onFinRecuperacion={finRecuperacion} />
        </ErrorBoundary>
      </>
    )
  }

  // ----------------------------------------------------------
  // --- VISTAS PÚBLICAS (sin sesión) ---
  // ----------------------------------------------------------
  if (!sesion) {
    return (
      <>
        <Toaster position="top-right" toastOptions={{ duration: 4000, style: { fontWeight: 'bold' } }} />
        <ErrorBoundary key={pantalla || 'login'}>
          <Suspense fallback={<CargandoModulo texto="Cargando…" />}>
            {pantalla === 'forgot'
              ? <ForgotPassword setPantalla={setPantalla} />
              : <Login setPantalla={setPantalla} />}
          </Suspense>
        </ErrorBoundary>
      </>
    )
  }

  // --- PANTALLA DE CARGA ---
  if (cargandoRol) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f3f4f6' }}>
        <h2 style={{ color: '#0B5FA5' }}>Cargando perfil...</h2>
      </div>
    )
  }

  // ----------------------------------------------------------
  // Pantalla efectiva (evita "flash" no autorizado)
  // ----------------------------------------------------------
  const pantallaAccesible =
    pantalla && puedeAccederPantalla(pantalla, rol, permisos) ? pantalla : ''
  const mostrarNavbar = PANTALLAS_CON_NAVBAR.includes(pantallaAccesible)

  // ----------------------------------------------------------
  // --- VISTAS CON SESIÓN ---
  // ----------------------------------------------------------
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
      <Toaster position="top-right" toastOptions={{ duration: 4000, style: { fontWeight: 'bold' } }} />

      {mostrarAviso && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ color: 'var(--danger-red)', marginTop: 0 }}>⚠️ Sesión a punto de expirar</h2>
            <p style={{ color: 'var(--text-dark)', marginBottom: '25px', fontSize: '15px' }}>
              Tu sesión se cerrará en <strong>2 minutos</strong>.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={reiniciarTemporizador} style={{ padding: '10px', background: 'var(--primary-green)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', flex: 1 }}>
                Mantener sesión
              </button>
              <button onClick={cerrarSesion} style={{ padding: '10px', background: '#6B7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', flex: 1 }}>
                Cerrar ahora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VISTAS SIN NAVBAR */}
      <ErrorBoundary key={pantallaAccesible || 'lobby'}>
        <Suspense fallback={<CargandoModulo />}>
          {pantallaAccesible === '' && (
            <LobbyModulos sesion={sesion} cerrarSesion={cerrarSesion} setPantalla={setPantalla} rol={rol} />
          )}
          {pantallaAccesible === 'precintos_menu' && (
            <MenuPrecintos setPantalla={setPantalla} rol={rol} permisos={permisos} />
          )}
          {pantallaAccesible === 'repositorio' && (
            <RepositorioDocumental setPantalla={setPantalla} rol={rol} />
          )}
          {pantallaAccesible === 'catalogos' && <GestionCatalogos setPantalla={setPantalla} />}
          {pantallaAccesible === 'usuarios' && <GestionUsuarios setPantalla={setPantalla} />}
          {pantallaAccesible === 'precios_menu' && (
            <GestionPrecios setPantalla={setPantalla} rol={rol} />
          )}
        </Suspense>
      </ErrorBoundary>

      {/* VISTAS CON NAVBAR INTERNA */}
      {mostrarNavbar && (
        <div style={{ minHeight: '100vh' }}>
          <NavbarPrecintos sesion={sesion} cerrarSesion={cerrarSesion} setPantalla={setPantalla} pantalla={pantallaAccesible} />
          <div style={{ paddingTop: '20px', paddingBottom: '40px' }}>
            <ErrorBoundary key={pantallaAccesible}>
              <Suspense fallback={<CargandoModulo />}>
                {pantallaAccesible === 'lotes' && <RegistroLotes />}
                {pantallaAccesible === 'admin' && <RegistroViajes />}
                {pantallaAccesible === 'excepciones' && <Excepciones />}
                {pantallaAccesible === 'precintos' && <ListadoPrecintos />}
                {pantallaAccesible === 'dashboard' && <Dashboard />}
                {pantallaAccesible === 'reportes' && <Reportes />}
                {pantallaAccesible === 'bitacora' && <Bitacora />}
                {pantallaAccesible === 'conciliacion' && <Conciliacion />}
                {pantallaAccesible === 'proyeccion' && <ProyeccionDemanda />}
                {pantallaAccesible === 'cambiar-password' && <CambiarPassword />}
                {pantallaAccesible === 'plantas' && <GestionPlantas />}
                {pantallaAccesible === 'respaldos' && <PanelRespaldos />}
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>
      )}
    </div>
  )
}

export default App