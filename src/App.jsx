import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { Toaster } from 'react-hot-toast'

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

function App() {
  const [sesion, setSesion] = useState(null)
  const [pantalla, setPantalla] = useState('')
  const [rol, setRol] = useState(null) 
  const [cargandoRol, setCargandoRol] = useState(true)
  const [esRecuperacion, setEsRecuperacion] = useState(false)
  
  // ESTADO PARA EL MENÚ MÓVIL
  const [menuAbierto, setMenuAbierto] = useState(false)

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
      setCargandoRol(false)
      return
    }

    async function obtenerRolUsuario() {
      setCargandoRol(true)
      const { data, error } = await supabase
        .from('usuarios')
        .select(`roles ( codigo )`)
        .eq('id_usuario', sesion.user.id)
        .single()

      if (error) {
        console.error('Error al obtener rol:', error)
        setRol('auditor')
      } else if (data && data.roles) {
        setRol(data.roles.codigo.toLowerCase()) 
      } else {
        setRol('auditor')
      }
      setCargandoRol(false)
    }

    obtenerRolUsuario()
  }, [sesion])

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    setPantalla('')
    setRol(null)
  }

  const navegar = (pantallaDestino) => {
    setPantalla(pantallaDestino)
    setMenuAbierto(false) // Cierra el menú al hacer clic en una opción en móvil
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
      
      {/* ESTILOS RESPONSIVOS GLOBALES */}
      <style>{`
        .nav-container { display: flex; justify-content: space-between; align-items: center; padding: 15px 30px; background-color: #0B5FA5; flex-wrap: wrap; }
        .nav-buttons { display: flex; gap: 10px; flex-wrap: wrap; }
        .user-info { display: flex; align-items: center; gap: 15px; color: white; font-size: 14px; }
        .btn-menu { display: none; background: none; border: none; color: white; font-size: 24px; cursor: pointer; }
        
        /* DISEÑO PARA CELULARES Y TABLETS */
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

      <nav className="nav-container">
        
        {/* LOGO O TÍTULO PARA MÓVIL */}
        <div style={{ color: 'white', fontWeight: 'bold', fontSize: '18px' }}>
          Petroamérica
        </div>

        {/* BOTÓN HAMBURGUESA */}
        <button className="btn-menu" onClick={() => setMenuAbierto(!menuAbierto)}>
          {menuAbierto ? '✕' : '☰'}
        </button>

        {/* BOTONES DEL MENÚ */}
        <div className={`nav-buttons ${menuAbierto ? 'abierto' : ''}`}>
          
          {(rol === 'admin_sistema' || rol === 'analista_operaciones' || rol === 'jefe_operaciones' || rol === 'jefe_proyecto') && (
            <button onClick={() => navegar('lotes')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', border: 'none', borderRadius: '4px', backgroundColor: pantalla === 'lotes' ? 'white' : 'transparent', color: pantalla === 'lotes' ? '#0B5FA5' : 'white' }}>Registro de Lotes</button>
          )}
          
          {(rol === 'admin_sistema' || rol === 'admin_planta') && (
            <>
              <button onClick={() => navegar('admin')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', border: 'none', borderRadius: '4px', backgroundColor: pantalla === 'admin' ? 'white' : 'transparent', color: pantalla === 'admin' ? '#0B5FA5' : 'white' }}>Registrar Viajes (SCOP)</button>
              <button onClick={() => navegar('excepciones')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', border: 'none', borderRadius: '4px', backgroundColor: pantalla === 'excepciones' ? 'white' : 'transparent', color: pantalla === 'excepciones' ? '#0B5FA5' : 'white' }}>Excepciones</button>
            </>
          )}

          {(rol === 'admin_sistema' || rol === 'admin_planta' || rol === 'analista_operaciones' || rol === 'jefe_operaciones' || rol === 'auditor' || rol === 'jefe_proyecto') && (
            <button onClick={() => navegar('precintos')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', border: 'none', borderRadius: '4px', backgroundColor: pantalla === 'precintos' ? 'white' : 'transparent', color: pantalla === 'precintos' ? '#0B5FA5' : 'white' }}>Precintos</button>
          )}

          {(rol === 'admin_sistema' || rol === 'auditor' || rol === 'analista_operaciones' || rol === 'jefe_operaciones' || rol === 'jefe_proyecto' || rol === 'admin_planta') && (
            <>
              <button onClick={() => navegar('dashboard')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', border: 'none', borderRadius: '4px', backgroundColor: pantalla === 'dashboard' ? 'white' : 'transparent', color: pantalla === 'dashboard' ? '#0B5FA5' : 'white' }}>Dashboard</button>
              <button onClick={() => navegar('reportes')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', border: 'none', borderRadius: '4px', backgroundColor: pantalla === 'reportes' ? 'white' : 'transparent', color: pantalla === 'reportes' ? '#0B5FA5' : 'white' }}>Reportes</button>
            </>
          )}

          {(rol === 'admin_sistema' || rol === 'jefe_proyecto' || rol === 'analista_operaciones' || rol === 'jefe_operaciones') && (
            <button onClick={() => navegar('conciliacion')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', border: 'none', borderRadius: '4px', backgroundColor: pantalla === 'conciliacion' ? 'white' : 'transparent', color: pantalla === 'conciliacion' ? '#0B5FA5' : 'white' }}>Conciliación</button>
          )}

          {(rol === 'admin_sistema' || rol === 'jefe_proyecto' || rol === 'jefe_operaciones' || rol === 'analista_operaciones') && (
            <button onClick={() => navegar('proyeccion')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', border: 'none', borderRadius: '4px', backgroundColor: pantalla === 'proyeccion' ? 'white' : 'transparent', color: pantalla === 'proyeccion' ? '#0B5FA5' : 'white' }}>Proyección Demanda</button>
          )}

          {(rol === 'admin_sistema' || rol === 'auditor' || rol === 'jefe_operaciones' || rol === 'jefe_proyecto') && (
            <button onClick={() => navegar('bitacora')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', border: 'none', borderRadius: '4px', backgroundColor: pantalla === 'bitacora' ? 'white' : 'transparent', color: pantalla === 'bitacora' ? '#0B5FA5' : 'white' }}>Bitácora</button>
          )}

          {(rol === 'admin_sistema' || rol === 'jefe_proyecto') && (
            <button onClick={() => navegar('usuarios')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', border: 'none', borderRadius: '4px', backgroundColor: pantalla === 'usuarios' ? 'white' : 'transparent', color: pantalla === 'usuarios' ? '#0B5FA5' : 'white' }}>Crear Usuarios</button>
          )}
        </div>

        {/* INFO DE USUARIO Y BOTONES DE SESIÓN */}
        <div className="user-info">
          <span>👤 {sesion.user.email} ({rol ? rol.toUpperCase() : 'SIN ROL'})</span>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => navegar('cambiar-password')} style={{ padding: '8px 12px', background: '#EAB308', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Mi Perfil</button>
            <button onClick={cerrarSesion} style={{ padding: '8px 12px', background: '#DC2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Salir</button>
          </div>
        </div>
      </nav>

      <div style={{ paddingTop: '20px', paddingBottom: '40px' }}>
        {pantalla === 'lotes' && (rol === 'admin_sistema' || rol === 'analista_operaciones' || rol === 'jefe_operaciones' || rol === 'jefe_proyecto') && <RegistroLotes />}
        {pantalla === 'admin' && (rol === 'admin_sistema' || rol === 'admin_planta') && <RegistroViajes />}
        {pantalla === 'excepciones' && (rol === 'admin_sistema' || rol === 'admin_planta') && <Excepciones />}
        {pantalla === 'precintos' && (rol === 'admin_sistema' || rol === 'admin_planta' || rol === 'analista_operaciones' || rol === 'jefe_operaciones' || rol === 'auditor' || rol === 'jefe_proyecto') && <ListadoPrecintos />}
        {pantalla === 'dashboard' && <Dashboard />}
        {pantalla === 'reportes' && <Reportes />}
        {pantalla === 'bitacora' && (rol === 'admin_sistema' || rol === 'auditor' || rol === 'jefe_operaciones' || rol === 'jefe_proyecto') && <Bitacora />}
        {pantalla === 'usuarios' && (rol === 'admin_sistema' || rol === 'jefe_proyecto') && <GestionUsuarios />}
        {pantalla === 'conciliacion' && (rol === 'admin_sistema' || rol === 'jefe_proyecto' || rol === 'analista_operaciones' || rol === 'jefe_operaciones') && <Conciliacion />}
        {pantalla === 'proyeccion' && (rol === 'admin_sistema' || rol === 'jefe_proyecto' || rol === 'jefe_operaciones' || rol === 'analista_operaciones') && <ProyeccionDemanda />}
        {pantalla === 'cambiar-password' && <CambiarPassword />}
        
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