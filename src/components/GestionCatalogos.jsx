// src/components/GestionCatalogos.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'
import { Card, Input, Boton } from './ui'

// ══ PALETA CORPORATIVA PETROAMÉRICA — BANNER ══
const AZUL_PROFUNDO = '#001B5E'
const AZUL_CORPORATIVO = '#0033A0'
const AZUL_MEDIO = '#0057D8'
const CYAN = '#00AEEF'
const BLANCO = '#FFFFFF'

const cardStyle = {
  backgroundColor: 'white', borderRadius: '12px', padding: '30px 20px', textAlign: 'center',
  boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '2px solid transparent', cursor: 'pointer',
  transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
}

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

// ✅ Estilos forzados para dropdowns legibles
const selectStyle = { 
  width: '100%', 
  padding: '10px', 
  borderRadius: '8px', 
  border: '1px solid #d1d5db', 
  fontSize: '14px',
  backgroundColor: 'white',
  color: 'black'
}

const optionStyle = { 
  backgroundColor: 'white', 
  color: 'black' 
}

export default function GestionCatalogos({ setPantalla }) {
  const [vista, setVista] = useState('menu')
  const [datos, setDatos] = useState([])
  const [cargando, setCargando] = useState(false)
  const [grupos, setGrupos] = useState([])
  
  // Estados para el Modal
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [formCodigo, setFormCodigo] = useState('')
  const [formNombre, setFormNombre] = useState('')
  const [formGrupo, setFormGrupo] = useState('')
  const [formPrefijo, setFormPrefijo] = useState('') // ✅ NUEVO: para plantas
  const [guardando, setGuardando] = useState(false)

  const obtenerColumnaId = () => {
    if (vista === 'plantas') return 'id_planta'
    return 'id'
  }

  const obtenerValorId = (item) => {
    return item.id || item.id_producto || item.id_proveedor || item.id_planta
  }

  useEffect(() => {
    if (vista === 'menu') return
    cargarDatos()
  }, [vista])

  async function cargarDatos() {
    setCargando(true)
    const tabla = vista === 'proveedores' ? 'proveedores' : vista === 'productos' ? 'productos' : 'plantas'
    
    let query
    if (vista === 'productos') {
      query = supabase.from(tabla).select('*, grupos_productos(id, nombre, codigo)').order('nombre')
    } else {
      query = supabase.from(tabla).select('*').order('nombre')
    }
    
    const { data, error } = await query
    
    if (error) {
      toast.error('Error al cargar datos')
      console.error(error)
    } else {
      setDatos(data || [])
    }
    
    if (vista === 'productos') {
      const { data: gruposData, error: gruposError } = await supabase
        .from('grupos_productos')
        .select('id, nombre, codigo')
        .eq('activo', true)
        .order('codigo')
      
      if (gruposError) {
        console.error('Error al cargar grupos:', gruposError)
      } else {
        setGrupos(gruposData || [])
      }
    }
    
    setCargando(false)
  }

  const abrirModal = (item = null) => {
    if (item) {
      setEditandoId(obtenerValorId(item))
      setFormCodigo(item.codigo || '')
      setFormNombre(item.nombre || '')
      if (vista === 'productos') {
        setFormGrupo(item.grupos_productos?.id || item.id_grupo_producto || '')
      } else {
        setFormGrupo('')
      }
      if (vista === 'plantas') {
        setFormPrefijo(item.prefijo_correlativo || '') // ✅ Cargar prefijo
      } else {
        setFormPrefijo('')
      }
    } else {
      setEditandoId(null)
      setFormCodigo('')
      setFormNombre('')
      setFormGrupo('')
      setFormPrefijo('')
    }
    setModalAbierto(true)
  }

  const cerrarModal = () => {
    setModalAbierto(false)
    setEditandoId(null)
    setFormCodigo('')
    setFormNombre('')
    setFormGrupo('')
    setFormPrefijo('')
  }

  async function guardarRegistro(e) {
    e.preventDefault()
    
    // ✅ Validaciones específicas por vista
    if (!formCodigo || !formNombre) return toast.error('Completa todos los campos')
    if (vista === 'productos' && !formGrupo) return toast.error('Debes seleccionar un Grupo de Producto')
    if (vista === 'plantas' && !formPrefijo) return toast.error('Debes ingresar el Prefijo Correlativo')
    
    setGuardando(true)
    const tabla = vista === 'proveedores' ? 'proveedores' : vista === 'productos' ? 'productos' : 'plantas'
    const idColumn = obtenerColumnaId()
    
    // ✅ Construir objeto de datos según la vista
    let datosAGuardar
    if (vista === 'plantas') {
      datosAGuardar = {
        codigo: formCodigo.trim().toUpperCase(),
        nombre: formNombre.trim(),
        prefijo_correlativo: formPrefijo.trim().toUpperCase()
      }
    } else if (vista === 'productos') {
      datosAGuardar = {
        codigo: formCodigo.trim(),
        nombre: formNombre.trim(),
        id_grupo_producto: formGrupo
      }
    } else {
      datosAGuardar = {
        codigo: formCodigo.trim(),
        nombre: formNombre.trim()
      }
    }
    
    try {
      if (editandoId) {
        const { data, error } = await supabase
          .from(tabla)
          .update(datosAGuardar)
          .eq(idColumn, editandoId)
          .select()

        if (error) throw error
        if (!data || data.length === 0) throw new Error('No se pudo actualizar (bloqueado por RLS).')

        toast.success('Actualizado correctamente')
      } else {
        const { data, error } = await supabase
          .from(tabla)
          .insert({ ...datosAGuardar, activo: true })
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
                e.currentTarget.style.transform = 'translateY(-4px)'
              }} 
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent'
                e.currentTarget.style.boxShadow = ''
                e.currentTarget.style.transform = 'translateY(0)'
              }}>
              <div style={{ fontSize: '50px', marginBottom: '15px' }}>🏢</div>
              <h3 style={{ color: AZUL_CORPORATIVO, marginBottom: '10px', fontSize: '18px' }}>Proveedores</h3>
              <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Gestión de empresas proveedoras.</p>
            </div>

            <div onClick={() => setVista('productos')} style={cardStyle} 
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = AZUL_CORPORATIVO
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,51,160,0.15), 0 10px 24px rgba(0,51,160,0.18)'
                e.currentTarget.style.transform = 'translateY(-4px)'
              }} 
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent'
                e.currentTarget.style.boxShadow = ''
                e.currentTarget.style.transform = 'translateY(0)'
              }}>
              <div style={{ fontSize: '50px', marginBottom: '15px' }}>🛢️</div>
              <h3 style={{ color: AZUL_CORPORATIVO, marginBottom: '10px', fontSize: '18px' }}>Productos</h3>
              <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Listado de combustibles y derivados.</p>
            </div>

            <div onClick={() => setVista('plantas')} style={cardStyle} 
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = AZUL_CORPORATIVO
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,51,160,0.15), 0 10px 24px rgba(0,51,160,0.18)'
                e.currentTarget.style.transform = 'translateY(-4px)'
              }} 
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent'
                e.currentTarget.style.boxShadow = ''
                e.currentTarget.style.transform = 'translateY(0)'
              }}>
              <div style={{ fontSize: '50px', marginBottom: '15px' }}>🏭</div>
              <h3 style={{ color: AZUL_CORPORATIVO, marginBottom: '10px', fontSize: '18px' }}>Plantas / Terminales</h3>
              <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Administración de terminales de despacho.</p>
            </div>

            <div onClick={() => setPantalla('usuarios')} style={cardStyle} 
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = AZUL_CORPORATIVO
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,51,160,0.15), 0 10px 24px rgba(0,51,160,0.18)'
                e.currentTarget.style.transform = 'translateY(-4px)'
              }} 
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent'
                e.currentTarget.style.boxShadow = ''
                e.currentTarget.style.transform = 'translateY(0)'
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

  // --- VISTA 2: TABLA DE DATOS ---
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
                    {vista === 'productos' && <th style={{ padding: '15px' }}>GRUPO</th>}
                    {vista === 'plantas' && <th style={{ padding: '15px' }}>PREFIJO</th>}
                    <th style={{ padding: '15px' }}>ESTADO</th>
                    <th style={{ padding: '15px', textAlign: 'center' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.map((item) => (
                    <tr key={obtenerValorId(item)} style={{ borderBottom: '1px solid #eee', backgroundColor: item.activo ? 'white' : '#f9fafb' }}>
                      <td style={{ padding: '15px', fontWeight: 'bold' }}>{item.codigo}</td>
                      <td style={{ padding: '15px' }}>{item.nombre}</td>
                      {vista === 'productos' && (
                        <td style={{ padding: '15px' }}>
                          <span style={{ 
                            padding: '4px 10px', 
                            backgroundColor: '#e0f2fe', 
                            color: '#0369a1', 
                            borderRadius: '12px', 
                            fontSize: '12px', 
                            fontWeight: 'bold' 
                          }}>
                            {item.grupos_productos?.nombre || 'Sin grupo'}
                          </span>
                        </td>
                      )}
                      {vista === 'plantas' && (
                        <td style={{ padding: '15px' }}>
                          <span style={{ 
                            padding: '4px 10px', 
                            backgroundColor: '#f3e8ff', 
                            color: '#7e22ce', 
                            borderRadius: '12px', 
                            fontSize: '12px', 
                            fontWeight: 'bold' 
                          }}>
                            {item.prefijo_correlativo || 'N/A'}
                          </span>
                        </td>
                      )}
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
              
              {/* ====== CAMPOS PARA PLANTAS ====== */}
              {vista === 'plantas' ? (
                <>
                  <Input 
                    label="Nombre de la Planta" 
                    value={formNombre} 
                    onChange={(e) => setFormNombre(e.target.value)} 
                    placeholder="Ej. Pampilla" 
                    required 
                  />
                  <Input 
                    label="Código Corto" 
                    value={formCodigo} 
                    onChange={(e) => setFormCodigo(e.target.value)} 
                    placeholder="Ej. PAM" 
                    required 
                  />
                  <Input 
                    label="Prefijo Correlativo" 
                    value={formPrefijo} 
                    onChange={(e) => setFormPrefijo(e.target.value)} 
                    placeholder="Ej. PAMPILLA" 
                    required 
                  />
                </>
              ) : (
                <>
                  {/* ====== CAMPOS PARA PROVEEDORES Y PRODUCTOS ====== */}
                  <Input 
                    label={vista === 'proveedores' ? 'Código (RUC)' : 'Código (ID)'} 
                    value={formCodigo} 
                    onChange={(e) => setFormCodigo(e.target.value)} 
                    placeholder={vista === 'proveedores' ? 'Ej. 20100128218' : 'Ej. 025'} 
                    required 
                  />
                  <Input 
                    label="Nombre" 
                    value={formNombre} 
                    onChange={(e) => setFormNombre(e.target.value)} 
                    placeholder={vista === 'proveedores' ? 'Ej. PETROPERU' : 'Ej. DIESEL'} 
                    required 
                  />
                  
                  {/* ====== DROPDOWN GRUPO (solo productos) ====== */}
                  {vista === 'productos' && (
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px', color: 'var(--text-dark)' }}>
                        Grupo de Producto *
                      </label>
                      <select 
                        value={formGrupo} 
                        onChange={(e) => setFormGrupo(e.target.value)}
                        required
                        style={selectStyle}
                      >
                        <option value="" style={optionStyle}>Seleccione un grupo...</option>
                        {grupos.map(g => (
                          <option key={g.id} value={g.id} style={optionStyle}>
                            {g.nombre} ({g.codigo})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}
              
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