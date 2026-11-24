// src/components/GestionCatalogos.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'
import { Card, Input, Boton } from './ui'

// ══ PALETA CORPORATIVA PETROAMÉRICA — BANNER ══
const AZUL_PROFUNDO = '#001B5E'
const AZUL_CORPORATIVO = '#0033A0'   // ← color principal del logo
const AZUL_MEDIO = '#0057D8'
const CYAN = '#00AEEF'               // ← acento / línea inferior
const BLANCO = '#FFFFFF'

const cardStyle = {
  backgroundColor: 'white', borderRadius: '12px', padding: '30px 20px', textAlign: 'center',
  boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '2px solid transparent', cursor: 'pointer',
  transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
}
// ✅ Estilo del botón para el banner corporativo
const btnHeaderStyle = { 
  background: 'rgba(255,255,255,0.14)', 
  border: '1px solid rgba(255,255,255,0.6)', 
  color: BLANCO, 
  padding: '6px 12px', 
  borderRadius: '6px', 
  cursor: 'pointer', 
  fontSize: '13px', 
  fontWeight: 'bold' 
}

export default function GestionCatalogos({ setPantalla }) {
  const [vista, setVista] = useState('menu') // 'menu', 'proveedores', 'productos', 'plantas'
  const [datos, setDatos] = useState([])
  const [cargando, setCargando] = useState(false)
  
  // Estados para el Modal
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [formCodigo, setFormCodigo] = useState('')
  const [formNombre, setFormNombre] = useState('')
  const [guardando, setGuardando] = useState(false)

  // Función auxiliar para obtener el nombre real de la columna ID según la tabla
  const obtenerColumnaId = () => {
    if (vista === 'plantas') return 'id_planta' // Si plantas llegara a fallar, cámbialo a 'id'
    return 'id' // Proveedores y productos usan 'id'
  }

  // Función auxiliar para obtener el valor del ID del objeto
  const obtenerValorId = (item) => {
    return item.id || item.id_producto || item.id_proveedor || item.id_planta
  }

  // Cargar datos según la vista
  useEffect(() => {
    if (vista === 'menu') return
    cargarDatos()
  }, [vista])

  async function cargarDatos() {
    setCargando(true)
    const tabla = vista === 'proveedores' ? 'proveedores' : vista === 'productos' ? 'productos' : 'plantas'
    const { data, error } = await supabase.from(tabla).select('*').order('nombre')
    
    if (error) toast.error('Error al cargar datos')
    else setDatos(data || [])
    setCargando(false)
  }

  const abrirModal = (item = null) => {
    if (item) {
      setEditandoId(obtenerValorId(item))
      setFormCodigo(item.codigo || '')
      setFormNombre(item.nombre || '')
    } else {
      setEditandoId(null)
      setFormCodigo('')
      setFormNombre('')
    }
    setModalAbierto(true)
  }

  const cerrarModal = () => {
    setModalAbierto(false)
    setEditandoId(null)
    setFormCodigo('')
    setFormNombre('')
  }

  async function guardarRegistro(e) {
    e.preventDefault()
    if (!formCodigo || !formNombre) return toast.error('Completa todos los campos')
    
    setGuardando(true)
    const tabla = vista === 'proveedores' ? 'proveedores' : vista === 'productos' ? 'productos' : 'plantas'
    const idColumn = obtenerColumnaId()
    
    try {
      if (editandoId) {
        // EDICIÓN
        const { data, error } = await supabase
          .from(tabla)
          .update({ codigo: formCodigo, nombre: formNombre })
          .eq(idColumn, editandoId)
          .select()

        if (error) throw error
        if (!data || data.length === 0) throw new Error('No se pudo actualizar (bloqueado por RLS).')

        toast.success('Actualizado correctamente')
      } else {
        // CREACIÓN
        const { data, error } = await supabase
          .from(tabla)
          .insert({ codigo: formCodigo, nombre: formNombre, activo: true })
          .select()

        if (error) throw error
        if (!data || data.length === 0) throw new Error('No se pudo crear (bloqueado por RLS).')

        toast.success('Creado correctamente')
      }
      cerrarModal()
      cargarDatos()
    } catch (error) {
      toast.error('Error: ' + error.message)
    } finally {
      setGuardando(false)
    }
  }

  async function toggleActivo(item) {
    const tabla = vista === 'proveedores' ? 'proveedores' : vista === 'productos' ? 'productos' : 'plantas'
    const idColumn = obtenerColumnaId()
    const itemId = obtenerValorId(item)
    const nuevoEstado = !item.activo

    try {
      const { data, error } = await supabase
        .from(tabla)
        .update({ activo: nuevoEstado })
        .eq(idColumn, itemId)
        .select()

      if (error) throw error
      if (!data || data.length === 0) throw new Error('No se pudo cambiar el estado (bloqueado por RLS).')

      toast.success(nuevoEstado ? 'Activado' : 'Desactivado')
      cargarDatos()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const renderHeader = () => (
    <header style={{ 
      width: '100%',
      padding: '20px 40px', 
      display: 'flex', 
      alignItems: 'center', 
      gap: '15px',
      background: `linear-gradient(118deg, ${AZUL_PROFUNDO} 0%, ${AZUL_CORPORATIVO} 45%, ${AZUL_MEDIO} 78%, ${CYAN} 100%)`,
      borderBottom: `3px solid ${CYAN}`,
      boxShadow: '0 6px 18px rgba(0,27,94,0.25)',
      marginBottom: '30px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        {vista === 'menu' ? (
          <button onClick={() => setPantalla('')} style={btnHeaderStyle}>← SIGMO</button>
        ) : (
          <button onClick={() => setVista('menu')} style={btnHeaderStyle}>← Volver al Menú</button>
        )}
        
        {/* ✅ CAMBIO 1: Icono ⚙️ al lado izquierdo del título */}
        <div style={{ 
          width: '52px', 
          height: '52px', 
          display: 'grid', 
          placeItems: 'center', 
          fontSize: '26px',
          borderRadius: '14px',
          background: `linear-gradient(145deg, ${CYAN}, ${AZUL_MEDIO})`,
          border: '1px solid rgba(255,255,255,0.4)',
          boxShadow: '0 8px 20px rgba(0,27,94,0.45), inset 0 1px 0 rgba(255,255,255,0.45)',
        }}>
          ⚙️
        </div>
        
        {/* ✅ CAMBIO 2: "Administración de Catálogos" → "Catálogos Maestros" */}
        <h1 style={{ margin: 0, color: BLANCO, fontSize: '28px', fontWeight: '900' }}>
          Catálogos Maestros
        </h1>
      </div>
    </header>
  )

  // --- VISTA 1: MENÚ DE CATÁLOGOS ---
  if (vista === 'menu') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)', display: 'flex', flexDirection: 'column' }}>
        {renderHeader()}
        <main style={{ flex: 1, padding: '40px 20px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ color: 'var(--text-dark)', fontSize: '24px', marginBottom: '10px' }}>¿Qué catálogo deseas gestionar?</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            
            <div onClick={() => setVista('proveedores')} style={cardStyle} 
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = AZUL_CORPORATIVO
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,51,160,0.15), 0 10px 24px rgba(0,51,160,0.18)'
              }} 
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent'
                e.currentTarget.style.boxShadow = ''
              }}>
              <div style={{ fontSize: '50px', marginBottom: '15px' }}>🏢</div>
              <h3 style={{ color: AZUL_CORPORATIVO, marginBottom: '10px', fontSize: '18px' }}>Proveedores</h3>
              <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Gestión de empresas proveedoras.</p>
            </div>

            <div onClick={() => setVista('productos')} style={cardStyle} 
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = AZUL_CORPORATIVO
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,51,160,0.15), 0 10px 24px rgba(0,51,160,0.18)'
              }} 
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent'
                e.currentTarget.style.boxShadow = ''
              }}>
              <div style={{ fontSize: '50px', marginBottom: '15px' }}>🛢️</div>
              <h3 style={{ color: AZUL_CORPORATIVO, marginBottom: '10px', fontSize: '18px' }}>Productos</h3>
              <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Listado de combustibles y derivados.</p>
            </div>

            <div onClick={() => setVista('plantas')} style={cardStyle} 
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = AZUL_CORPORATIVO
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,51,160,0.15), 0 10px 24px rgba(0,51,160,0.18)'
              }} 
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent'
                e.currentTarget.style.boxShadow = ''
              }}>
              <div style={{ fontSize: '50px', marginBottom: '15px' }}>🏭</div>
              <h3 style={{ color: AZUL_CORPORATIVO, marginBottom: '10px', fontSize: '18px' }}>Plantas / Terminales</h3>
              <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Administración de terminales de despacho.</p>
            </div>

            <div onClick={() => setPantalla('usuarios')} style={cardStyle} 
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = AZUL_CORPORATIVO
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,51,160,0.15), 0 10px 24px rgba(0,51,160,0.18)'
              }} 
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent'
                e.currentTarget.style.boxShadow = ''
              }}>
              <div style={{ fontSize: '50px', marginBottom: '15px' }}>👥</div>
              <h3 style={{ color: AZUL_CORPORATIVO, marginBottom: '10px', fontSize: '18px' }}>Administrar Usuarios</h3>
              <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Gestión de accesos y roles del sistema.</p>
            </div>

          </div>
        </main>
      </div>
    )
  }

  // --- VISTA 2: TABLA DE DATOS (Proveedores, Productos o Plantas) ---
  const tituloTabla = vista === 'proveedores' ? 'Proveedores' : vista === 'productos' ? 'Productos' : 'Plantas / Terminales'
  const idColumn = obtenerColumnaId()

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)', display: 'flex', flexDirection: 'column' }}>
      {renderHeader()}
      
      <main style={{ flex: 1, padding: '40px 20px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: 'var(--text-dark)', fontSize: '22px', margin: 0 }}>{tituloTabla}</h2>
          <Boton variante="primary" onClick={() => abrirModal()}>+ Nuevo Registro</Boton>
        </div>

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {cargando ? (
            <p style={{ padding: '30px', textAlign: 'center' }}>Cargando datos...</p>
          ) : datos.length === 0 ? (
            <p style={{ padding: '30px', textAlign: 'center', color: 'var(--text-light)' }}>No hay registros en este catálogo.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead style={{ backgroundColor: AZUL_CORPORATIVO, color: 'white' }}>
                  <tr style={{ textAlign: 'left' }}>
                    <th style={{ padding: '15px' }}>CÓDIGO</th>
                    <th style={{ padding: '15px' }}>NOMBRE</th>
                    <th style={{ padding: '15px' }}>ESTADO</th>
                    <th style={{ padding: '15px', textAlign: 'center' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.map((item) => (
                    <tr key={obtenerValorId(item)} style={{ borderBottom: '1px solid #eee', backgroundColor: item.activo ? 'white' : '#f9fafb' }}>
                      <td style={{ padding: '15px', fontWeight: 'bold' }}>{item.codigo}</td>
                      <td style={{ padding: '15px' }}>{item.nombre}</td>
                      <td style={{ padding: '15px' }}>
                        <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', backgroundColor: item.activo ? '#DCFCE7' : '#FEE2E2', color: item.activo ? '#166534' : '#991B1B' }}>
                          {item.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <Boton variante="outline" tamano="sm" onClick={() => abrirModal(item)}>✏️ Editar</Boton>
                        <Boton variante={item.activo ? "danger" : "success"} tamano="sm" onClick={() => toggleActivo(item)}>
                          {item.activo ? 'Desactivar' : 'Activar'}
                        </Boton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>

      {/* MODAL PARA CREAR / EDITAR */}
      {modalAbierto && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '450px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 20px 0', color: 'var(--text-dark)', fontSize: '20px' }}>
              {editandoId ? 'Editar Registro' : 'Nuevo Registro'}
            </h3>
            <form onSubmit={guardarRegistro} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <Input label="Código (RUC / ID)" value={formCodigo} onChange={(e) => setFormCodigo(e.target.value)} placeholder="Ej. 20100128218" required />
              <Input label="Nombre" value={formNombre} onChange={(e) => setFormNombre(e.target.value)} placeholder="Ej. PETROPERU" required />
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <Boton variante="outline" onClick={cerrarModal} style={{ flex: 1 }} disabled={guardando}>Cancelar</Boton>
                <Boton tipo="submit" variante="primary" style={{ flex: 2 }} disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Guardar Registro'}
                </Boton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}