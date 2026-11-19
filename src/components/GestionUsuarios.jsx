import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'
import { Card, Input, Select, Boton } from './ui'

const btnHeaderStyle = { background: '#f3f4f6', border: '1px solid #d1d5db', color: '#374151', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }

export default function GestionUsuarios({ setPantalla }) {
  const [usuarios, setUsuarios] = useState([])
  const [roles, setRoles] = useState([])
  const [plantas, setPlantas] = useState([])
  const [cargando, setCargando] = useState(true)

  // Estados del Modal
  const [modalAbierto, setModalAbierto] = useState(false)
  const [usuarioEditando, setUsuarioEditando] = useState(null)
  const [formRol, setFormRol] = useState('')
  const [formPlanta, setFormPlanta] = useState('')
  const [formActivo, setFormActivo] = useState(true)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    setCargando(true)
    
    // Cargar usuarios con sus roles y plantas
    const { data: usrs, error: errUsrs } = await supabase
      .from('usuarios')
      .select(`
        id_usuario,
        email,
        activo,
        roles ( id_rol, codigo, nombre ),
        plantas ( id_planta, nombre )
      `)
      .order('email')

    // Cargar catálogos
    const { data: rls } = await supabase.from('roles').select('*').order('nombre')
    const { data: plnts } = await supabase.from('plantas').select('*').eq('activo', true).order('nombre')

    if (errUsrs) {
      toast.error('Error al cargar usuarios')
      console.error(errUsrs)
    } else {
      setUsuarios(usrs || [])
    }
    
    if (rls) setRoles(rls)
    if (plnts) setPlantas(plnts)
    
    setCargando(false)
  }

  const abrirModal = (usuario) => {
    setUsuarioEditando(usuario)
    setFormRol(usuario.roles?.id_rol || '')
    setFormPlanta(usuario.plantas?.id_planta || '')
    setFormActivo(usuario.activo !== false)
    setModalAbierto(true)
  }

  const cerrarModal = () => {
    setModalAbierto(false)
    setUsuarioEditando(null)
  }

  async function guardarCambios(e) {
    e.preventDefault()
    if (!formRol) return toast.error('Debes seleccionar un rol')
    
    setGuardando(true)
    
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({
          id_rol: formRol,
          id_planta: formPlanta || null,
          activo: formActivo
        })
        .eq('id_usuario', usuarioEditando.id_usuario)

      if (error) throw error

      toast.success('Usuario actualizado correctamente')
      cerrarModal()
      cargarDatos()
    } catch (error) {
      toast.error('Error: ' + error.message)
    } finally {
      setGuardando(false)
    }
  }

  // Función para obtener el nombre del rol seleccionado en el form
  const rolSeleccionadoCodigo = roles.find(r => r.id_rol === formRol)?.codigo

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header Unificado */}
      <header style={{ padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={() => setPantalla('precintos_menu')} style={btnHeaderStyle}>← Volver al Menú</button>
          <h1 style={{ margin: 0, color: 'var(--primary-blue)', fontSize: '28px', fontWeight: '900' }}>Gestión de Usuarios</h1>
        </div>
      </header>

      <main style={{ flex: 1, padding: '40px 20px', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ color: 'var(--text-dark)', fontSize: '22px', margin: 0 }}>Directorio de Usuarios</h2>
            <p style={{ color: 'var(--text-light)', margin: '5px 0 0 0', fontSize: '14px' }}>Administra los roles y accesos al sistema SIGMO.</p>
          </div>
          {/* Nota: La creación de usuarios en Auth requiere un flujo aparte (Dashboard o RPC) */}
          <Boton variante="outline" onClick={cargarDatos}>🔄 Refrescar</Boton>
        </div>

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {cargando ? (
            <p style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)' }}>Cargando usuarios...</p>
          ) : usuarios.length === 0 ? (
            <p style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)' }}>No hay usuarios registrados.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead style={{ backgroundColor: 'var(--primary-blue)', color: 'white' }}>
                  <tr style={{ textAlign: 'left' }}>
                    <th style={{ padding: '15px' }}>USUARIO (EMAIL)</th>
                    <th style={{ padding: '15px' }}>ROL</th>
                    <th style={{ padding: '15px' }}>PLANTA / TERMINAL</th>
                    <th style={{ padding: '15px' }}>ESTADO</th>
                    <th style={{ padding: '15px', textAlign: 'center' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.id_usuario} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '15px', fontWeight: 'bold', color: 'var(--text-dark)' }}>
                        {u.email || 'Sin correo registrado'}
                      </td>
                      <td style={{ padding: '15px' }}>
                        <span style={{ padding: '4px 10px', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                          {u.roles?.codigo || 'SIN ROL'}
                        </span>
                      </td>
                      <td style={{ padding: '15px', color: 'var(--text-light)' }}>
                        {u.plantas?.nombre || '-'}
                      </td>
                      <td style={{ padding: '15px' }}>
                        <span style={{ 
                          padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                          backgroundColor: u.activo !== false ? '#DCFCE7' : '#FEE2E2',
                          color: u.activo !== false ? '#166534' : '#991B1B'
                        }}>
                          {u.activo !== false ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        <Boton variante="outline" tamano="sm" onClick={() => abrirModal(u)}>✏️ Editar</Boton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>

      {/* MODAL PARA EDITAR USUARIO */}
      {modalAbierto && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '450px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 5px 0', color: 'var(--text-dark)', fontSize: '20px' }}>Editar Usuario</h3>
            <p style={{ margin: '0 0 20px 0', color: 'var(--text-light)', fontSize: '14px' }}>{usuarioEditando?.email}</p>
            
            <form onSubmit={guardarCambios} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              <Select 
                label="Rol del Usuario" 
                value={formRol} 
                onChange={(e) => setFormRol(e.target.value)} 
                required 
                options={[
                  { value: '', label: 'Seleccione un rol...' },
                  ...roles.map(r => ({ value: r.id_rol, label: r.nombre }))
                ]} 
              />

              {/* Solo mostrar selector de planta si el rol es admin_planta */}
              {rolSeleccionadoCodigo === 'admin_planta' && (
                <Select 
                  label="Planta Asignada (Requerido)" 
                  value={formPlanta} 
                  onChange={(e) => setFormPlanta(e.target.value)} 
                  required
                  options={[
                    { value: '', label: 'Seleccione una planta...' },
                    ...plantas.map(p => ({ value: p.id_planta, label: p.nombre }))
                  ]} 
                />
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                <input 
                  type="checkbox" 
                  id="checkActivo" 
                  checked={formActivo} 
                  onChange={(e) => setFormActivo(e.target.checked)} 
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="checkActivo" style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-dark)', cursor: 'pointer' }}>
                  Usuario Activo (Puede iniciar sesión)
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <Boton variante="outline" onClick={cerrarModal} style={{ flex: 1 }} disabled={guardando}>Cancelar</Boton>
                <Boton tipo="submit" variante="primary" style={{ flex: 2 }} disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Guardar Cambios'}
                </Boton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}