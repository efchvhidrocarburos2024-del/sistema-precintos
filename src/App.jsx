import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './supabase'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import './App.css'

// --- Componentes de módulos ---
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
import GestionCatalogos from './components/GestionCatalogos'
import GestionPrecios from "./components/precios/GestionPrecios"

// --- Componentes refactorizados ---
import LobbyModulos from './components/LobbyModulos'
import MenuPrecintos from './components/MenuPrecintos'
import NavbarPrecintos from './components/NavbarPrecintos'

// --- Utilidades centralizadas ---
import { puedeAccederPantalla, PANTALLAS_CON_NAVBAR } from './utils/permisos'
import { throttle } from './utils/throttle'

// ============================================================
// CONSTANTES
// ============================================================
const TIEMPO_INACTIVIDAD_TOTAL = 60 * 60 * 1000
const TIEMPO_DE_AVISO = TIEMPO_INACTIVIDAD_TOTAL - 2 * 60 * 1000
const STORAGE_KEY_PANTALLA = 'sigmo_pantalla'

const COLORES_PA = {
  azul: '#0033A0',
  grisFondo: '#f5f7fa',
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
function App() {
  console.log('🚀 App.jsx iniciado')
  
  const [sesion, setSesion] = useState(null)
  const [pantalla, setPantalla] = useState(
    () => sessionStorage.getItem(STORAGE_KEY_PANTALLA) || ''
  )
  const [rol, setRol] = useState(null)
  const [permisos, setPermisos] = useState([])
  const [cargandoRol, setCargandoRol] = useState(true)
  const [esRecuperacion, setEsRecuperacion] = useState(false)

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
  // Autenticación (Listener automático)
  // ----------------------------------------------------------
  useEffect(() => {
    console.log('🔐 Configurando listener de autenticación...')
    
    if (
      window.location.hash.includes('type=recovery') ||
      window.location.search.includes('type=recovery')
    ) {
      setEsRecuperacion(true)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log(' Sesión inicial:', session ? 'Activa' : 'Inactiva')
      setSesion(session)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('🔄 Cambio de estado de autenticación:', _event)
      setSesion(session)
      if (_event === 'PASSWORD_RECOVERY') {
        setEsRecuperacion(true)
      }
    })

    return () => {
      console.log('🧹 Limpiando listener de autenticación')
      authListener.subscription.unsubscribe()
    }
  }, [])

  // ----------------------------------------------------------
  // Roles y permisos (con caché)
  // ----------------------------------------------------------
  useEffect(() => {
    console.log('👤 Verificando rol y permisos...')
    
    if (!sesion) {
      console.log('️ Sin sesión, limpiando rol')
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
      console.log('✅ Usando rol en caché:', cachedRol)
      setRol(cachedRol)
      setPermisos(JSON.parse(cachedPermisos || '[]'))
      setCargandoRol(false)
      return
    }

    async function obtenerRolUsuario() {
      console.log('📡 Obteniendo rol desde base de datos...')
      setCargandoRol(true)
      
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select(`roles ( codigo ), permisos`)
          .eq('id_usuario', sesion.user.id)
          .single()

        if (error) {
          console.error('❌ Error al obtener rol:', error)
          setRol('auditor')
          setPermisos([])
        } else if (data) {
          const nuevoRol = data.roles?.codigo?.toLowerCase() || 'auditor'
          const nuevosPermisos = data.permisos || []
          console.log('✅ Rol obtenido:', nuevoRol)
          setRol(nuevoRol)
          setPermisos(nuevosPermisos)
          sessionStorage.setItem('sigmo_rol', nuevoRol)
          sessionStorage.setItem('sigmo_permisos', JSON.stringify(nuevosPermisos))
        } else {
          console.warn('⚠️ No se encontraron datos de usuario')
          setRol('auditor')
          setPermisos([])
        }
      } catch (err) {
        console.error('❌ Error inesperado:', err)
        setRol('auditor')
        setPermisos([])
      } finally {
        setCargandoRol(false)
      }
    }

    obtenerRolUsuario()
  }, [sesion])

  // ----------------------------------------------------------
  // Validación: si la pantalla persistida ya no es accesible, volver al lobby
  // ----------------------------------------------------------
  useEffect(() => {
    if (cargandoRol || !sesion || !rol) return
    
    console.log('🔍 Validando acceso a pantalla:', pantalla)
    
    if (pantalla && !puedeAccederPantalla(pantalla, rol, permisos)) {
      console.warn('️ Acceso denegado a pantalla:', pantalla)
      setPantalla('')
      sessionStorage.removeItem(STORAGE_KEY_PANTALLA)
    }
  }, [cargandoRol, sesion, rol, permisos, pantalla])

  // ----------------------------------------------------------
  // Cerrar sesión
  // ----------------------------------------------------------
  const cerrarSesion = useCallback(async () => {
    console.log('🚪 Cerrando sesión...')
    await supabase.auth.signOut()
    setPantalla('')
    setRol(null)
    setPermisos([])
    setMostrarAviso(false)
    sessionStorage.removeItem('sigmo_rol')
    sessionStorage.removeItem('sigmo_permisos')
    sessionStorage.removeItem(STORAGE_KEY_PANTALLA)
  }, [])

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
  // --- VISTAS PÚBLICAS ---
  // ----------------------------------------------------------
  if (!sesion) {
    console.log(' Renderizando vista pública')
    if (esRecuperacion) return <ResetPassword />
    if (pantalla === 'forgot') return <ForgotPassword setPantalla={setPantalla} />
    return <Login setPantalla={setPantalla} />
  }

  // --- PANTALLA DE CARGA ---
  if (cargandoRol) {
    console.log('⏳ Mostrando pantalla de carga')
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: COLORES_PA.grisFondo }}>
        <h2 style={{ color: COLORES_PA.azul }}>Cargando perfil...</h2>
      </div>
    )
  }

  // ----------------------------------------------------------
  // Cálculo de pantalla efectiva (evita "flash" no autorizado)
  // ----------------------------------------------------------
  const pantallaAccesible =
    pantalla && puedeAccederPantalla(pantalla, rol, permisos) ? pantalla : ''
  const mostrarNavbar = PANTALLAS_CON_NAVBAR.includes(pantallaAccesible)

  console.log('✅ Renderizando aplicación principal')
  console.log(' Estado:', { pantallaAccesible, mostrarNavbar, rol })

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
      
      {/* GestionPrecios sin setPantalla */}
      {pantallaAccesible === 'precios_menu' && (
        <GestionPrecios rol={rol} />
      )}

      {/* VISTAS CON NAVBAR INTERNA */}
      {mostrarNavbar && (
        <div style={{ minHeight: '100vh' }}>
          <NavbarPrecintos sesion={sesion} cerrarSesion={cerrarSesion} setPantalla={setPantalla} />
          <div style={{ paddingTop: '20px', paddingBottom: '40px' }}>
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
          </div>
        </div>
      )}
    </div>
  )
}

export default App