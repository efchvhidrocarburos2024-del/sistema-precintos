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
import Conciliacion from './components/Conciliacion'
import ProyeccionDemanda from './components/ProyeccionDemanda'
import ListadoPrecintos from './components/ListadoPrecintos' // <-- NUEVO IMPORT

function App() {
  const [sesion, setSesion] = useState(null)
  const [pantalla, setPantalla] = useState('')
  
  // ESTADO PARA EL ROL Y CARGA
  const [rol, setRol] = useState(null) 
  const [cargandoRol, setCargandoRol] = useState(true)

  const [esRecuperacion, setEsRecuperacion] = useState(false)

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

  // CONSULTAR EL ROL EN LA TABLA USUARIOS
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
        .select(`
          roles (
            codigo
          )
        `)
        .eq('id_usuario', sesion.user.id)
        .single()

      if (error) {
        console.error('Error al obtener rol:', error)
        setRol('auditor') // Rol por defecto si hay error
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

  // --- LÓGICA DE PANTALLAS SIN SESIÓN ---
  if (!sesion) {
    if (esRecuperacion) return <ResetPassword />
    if (pantalla === 'forgot') return <ForgotPassword setPantalla={setPantalla} />
    return <Login setPantalla={setPantalla} />
  }

  // Mientras carga el rol desde la base de datos
  if (cargandoRol) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f3f4f6' }}>
        <h2 style={{ color: '#0B5FA5' }}>Cargando perfil...</h2>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 30px', backgroundColor: '#0B5FA5', flexWrap: 'wrap' }}>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          
          {/* 1. REGISTRO DE LOTES */}
          {(rol === 'admin_sistema' || rol === 'analista_operaciones' || rol === 'jefe_operaciones' || rol === 'jefe_proyecto') && (
            <button onClick={() => setPantalla('lotes')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', border: 'none', borderRadius: '4px', backgroundColor: pantalla === 'lotes' ? 'white' : 'transparent', color: pantalla === 'lotes' ? '#0B5FA5' : 'white' }}>Registro de Lotes</button>
          )}
          
          {/* 2. PANTALLAS DE PLANTA */}
          {(rol === 'admin_sistema' || rol === 'admin_planta') && (
            <>
              <button onClick={() => setPantalla('admin')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', border: 'none', borderRadius: '4px', backgroundColor: pantalla === 'admin' ? 'white' : 'transparent', color: pantalla === 'admin' ? '#0B5FA5' : 'white' }}>Registrar Viajes (SCOP)</button>
              <button onClick={() => setPantalla('excepciones')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', border: 'none', borderRadius: '4px', backgroundColor: pantalla === 'excepciones' ? 'white' : 'transparent', color: pantalla === 'excepciones' ? '#0B5FA5' : 'white' }}>Excepciones</button>
            </>
          )}

          {/* 3. LISTADO DE PRECINTOS (NUEVO) */}
          {(rol === 'admin_sistema' || rol === 'admin_planta' || rol === 'analista_operaciones' || rol === 'jefe_operaciones' || rol === 'auditor' || rol === 'jefe_proyecto') && (
            <button onClick={() => setPantalla('precintos')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', border: 'none', borderRadius: '4px', backgroundColor: pantalla === 'precintos' ? 'white' : 'transparent', color: pantalla === 'precintos' ? '#0B5FA5' : 'white' }}>Precintos</button>
          )}

          {/* 4. DASHBOARD Y REPORTES */}
          {(rol === 'admin_sistema' || rol === 'auditor' || rol === 'analista_operaciones' || rol === 'jefe_operaciones' || rol === 'jefe_proyecto' || rol === 'admin_planta') && (
            <>
              <button onClick={() => setPantalla('dashboard')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', border: 'none', borderRadius: '4px', backgroundColor: pantalla === 'dashboard' ? 'white' : 'transparent', color: pantalla === 'dashboard' ? '#0B5FA5' : 'white' }}>Dashboard</button>
              <button onClick={() => setPantalla('reportes')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', border: 'none', borderRadius: '4px', backgroundColor: pantalla === 'reportes' ? 'white' : 'transparent', color: pantalla === 'reportes' ? '#0B5FA5' : 'white' }}>Reportes</button>
            </>
          )}

          {/* 5. CONCILIACIÓN */}
          {(rol === 'admin_sistema' || rol === 'jefe_proyecto' || rol === 'analista_operaciones' || rol === 'jefe_operaciones') && (
            <button onClick={() => setPantalla('conciliacion')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', border: 'none', borderRadius: '4px', backgroundColor: pantalla === 'conciliacion' ? 'white' : 'transparent', color: pantalla === 'conciliacion' ? '#0B5FA5' : 'white' }}>Conciliación</button>
          )}

          {/* 6. PROYECCIÓN DEMANDA */}
          {(rol === 'admin_sistema' || rol === 'jefe_proyecto' || rol === 'jefe_operaciones' || rol === 'analista_operaciones') && (
            <button onClick={() => setPantalla('proyeccion')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', border: 'none', borderRadius: '4px', backgroundColor: pantalla === 'proyeccion' ? 'white' : 'transparent', color: pantalla === 'proyeccion' ? '#0B5FA5' : 'white' }}>Proyección Demanda</button>
          )}

          {/* 7. CREAR USUARIOS */}
          {(rol === 'admin_sistema' || rol === 'jefe_proyecto') && (
            <button onClick={() => setPantalla('usuarios')} style={{ padding: '10px 15px', cursor: 'pointer', fontWeight: 'bold', border: 'none', borderRadius: '4px', backgroundColor: pantalla === 'usuarios' ? 'white' : 'transparent', color: pantalla === 'usuarios' ? '#0B5FA5' : 'white' }}>Crear Usuarios</button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', color: 'white', fontSize: '14px' }}>
          <span>👤 {sesion.user.email} ({rol ? rol.toUpperCase() : 'SIN ROL'})</span>
          
          <button onClick={() => setPantalla('cambiar-password')} style={{ padding: '8px 12px', background: '#EAB308', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Mi Perfil</button>
          
          <button onClick={cerrarSesion} style={{ padding: '8px 12px', background: '#DC2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Salir</button>
        </div>
      </nav>

      <div style={{ paddingTop: '20px' }}>
        {/* RENDERIZADO DE COMPONENTES */}
        {pantalla === 'lotes' && (rol === 'admin_sistema' || rol === 'analista_operaciones' || rol === 'jefe_operaciones' || rol === 'jefe_proyecto') && <RegistroLotes />}
        
        {pantalla === 'admin' && (rol === 'admin_sistema' || rol === 'admin_planta') && <RegistroViajes />}
        
        {pantalla === 'excepciones' && (rol === 'admin_sistema' || rol === 'admin_planta') && <Excepciones />}
        
        {/* NUEVO RENDERIZADO DE PRECINTOS */}
        {pantalla === 'precintos' && (rol === 'admin_sistema' || rol === 'admin_planta' || rol === 'analista_operaciones' || rol === 'jefe_operaciones' || rol === 'auditor' || rol === 'jefe_proyecto') && <ListadoPrecintos />}

        {pantalla === 'dashboard' && <Dashboard />}
        {pantalla === 'reportes' && <Reportes />}
        
        {pantalla === 'usuarios' && (rol === 'admin_sistema' || rol === 'jefe_proyecto') && <GestionUsuarios />}
        
        {pantalla === 'conciliacion' && (rol === 'admin_sistema' || rol === 'jefe_proyecto' || rol === 'analista_operaciones' || rol === 'jefe_operaciones') && <Conciliacion />}
        
        {pantalla === 'proyeccion' && (rol === 'admin_sistema' || rol === 'jefe_proyecto' || rol === 'jefe_operaciones' || rol === 'analista_operaciones') && <ProyeccionDemanda />}

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