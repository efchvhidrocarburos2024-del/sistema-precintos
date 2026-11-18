import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'

export default function GestionUsuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [roles, setRoles] = useState([])
  const [plantas, setPlantas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  // Estado del Formulario
  const [idEditando, setIdEditando] = useState(null)
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState('admin_planta')
  const [idPlanta, setIdPlanta] = useState('')
  const [activo, setActivo] = useState(true)

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    setCargando(true)
    
    // Cargar roles, plantas y usuarios en paralelo
    const [resRoles, resPlantas, resUsuarios] = await Promise.all([
      supabase.from('roles').select('*').order('nombre'),
      supabase.from('plantas').select('*').order('nombre'),
      supabase.from('usuarios').select(`
        id_usuario, email, nombre_completo, activo,
        roles ( codigo ),
        plantas ( nombre )
      `).order('email')
    ])

    if (resRoles.data) setRoles(resRoles.data)
    if (resPlantas.data) {
      setPlantas(resPlantas.data)
      setIdPlanta(resPlantas.data[0]?.id_planta || '')
    }
    if (resUsuarios.data) setUsuarios(resUsuarios.data)
    
    setCargando(false)
  }

  const limpiarFormulario = () => {
    setIdEditando(null)
    setEmail('')
    setNombre('')
    setPassword('')
    setRol('admin_planta')
    setIdPlanta(plantas[0]?.id_planta || '')
    setActivo(true)
  }

  const editarUsuario = (u) => {
    setIdEditando(u.id_usuario)
    setEmail(u.email)
    setNombre(u.nombre_completo || '')
    setPassword('') // Dejamos la contraseña vacía para no sobreescribirla
    setRol(u.roles?.codigo?.toLowerCase() || 'admin_planta')
    setIdPlanta(u.plantas?.id_planta || plantas[0]?.id_planta || '')
    setActivo(u.activo)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const guardarUsuario = async (e) => {
    e.preventDefault()
    setGuardando(true)

    if (idEditando) {
      // ACTUALIZAR USUARIO EXISTENTE
      const { data, error } = await supabase.functions.invoke('gestionar-usuario', {
        body: {
          id_usuario: idEditando,
          email: email,
          nombre_completo: nombre,
          rol: rol,
          id_planta: rol === 'admin_planta' ? idPlanta : null,
          activo: activo,
          password: password
        }
      })

      if (error || (data && data.error)) {
        toast.error(data?.error || error.message)
      } else {
        toast.success("Usuario actualizado correctamente")
        limpiarFormulario()
        cargarDatos()
      }
    } else {
      // CREAR NUEVO USUARIO
      if (!password) {
        toast.error("La contraseña es obligatoria para nuevos usuarios")
        setGuardando(false)
        return
      }

      const { data, error } = await supabase.functions.invoke('crear-usuario', {
        body: {
          email: email,
          password: password,
          rol: rol,
          id_planta: rol === 'admin_planta' ? idPlanta : null
        }
      })

      if (error || (data && data.error)) {
        toast.error(data?.error || error.message)
      } else {
        toast.success(`Usuario ${email} creado con éxito.`)
        
        // --- NUEVA LÓGICA: ENVIAR CREDENCIALES POR CORREO ---
        try {
          await supabase.functions.invoke('enviar-credenciales', {
            body: {
              email: email,
              nombre: nombre,
              password: password,
              rol: rol // Enviamos el rol para que se vea en el correo
            }
          })
          toast.success('Credenciales enviadas por correo exitosamente')
        } catch (err) {
          console.error('Error al enviar credenciales:', err)
          toast.error('Usuario creado, pero no se pudo enviar el correo.')
        }
        // ----------------------------------------------------

        limpiarFormulario()
        cargarDatos()
      }
    }
    setGuardando(false)
  }

  return (
    <div style={{ width: '95%', maxWidth: '1100px', margin: '20px auto', fontFamily: 'Arial', padding: '10px', boxSizing: 'border-box' }}>
      
      {/* FORMULARIO */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
        <h2 style={{ color: '#0B5FA5', marginTop: 0, textAlign: 'center' }}>
          {idEditando ? '✏️ Editar Usuario' : '👤 Crear Nuevo Usuario'}
        </h2>
        
        <form onSubmit={guardarUsuario} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', alignItems: 'end' }}>
          
          <div>
            <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Correo (Email):</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={idEditando !== null} required style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: idEditando ? '#f3f4f6' : 'white', color: 'black', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Nombre Completo:</label>
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white', color: 'black', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Contraseña {idEditando && '(Opcional)'}:</label>
            <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} required={!idEditando} minLength="6" placeholder={idEditando ? "Dejar en blanco para no cambiar" : ""} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white', color: 'black', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Rol:</label>
            <select value={rol} onChange={(e) => setRol(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white', color: 'black', boxSizing: 'border-box' }}>
              {roles.map(r => (
                <option key={r.id_rol} value={r.codigo.toLowerCase()}>{r.nombre}</option>
              ))}
            </select>
          </div>

          {rol === 'admin_planta' && (
            <div>
              <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Planta:</label>
              <select value={idPlanta} onChange={(e) => setIdPlanta(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white', color: 'black', boxSizing: 'border-box' }}>
                {plantas.map(p => (
                  <option key={p.id_planta} value={p.id_planta}>{p.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {idEditando && (
            <div>
              <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Estado:</label>
              <select value={activo ? 'true' : 'false'} onChange={(e) => setActivo(e.target.value === 'true')} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white', color: 'black', boxSizing: 'border-box' }}>
                <option value="true">Activo (Permitir acceso)</option>
                <option value="false">Inactivo (Bloquear acceso)</option>
              </select>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', gridColumn: '1 / -1', marginTop: '10px' }}>
            <button type="submit" disabled={guardando} style={{ flex: 1, padding: '12px', background: idEditando ? '#EAB308' : '#16A34A', color: idEditando ? 'black' : 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              {guardando ? 'Guardando...' : (idEditando ? 'Actualizar Usuario' : 'Crear Usuario')}
            </button>
            
            {idEditando && (
              <button type="button" onClick={limpiarFormulario} style={{ padding: '12px 20px', background: '#6B7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                Cancelar Edición
              </button>
            )}
          </div>
        </form>
      </div>

      {/* TABLA DE USUARIOS */}
      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <h3 style={{ padding: '20px', margin: 0, borderBottom: '1px solid #eee' }}>Listado de Usuarios</h3>
        {cargando ? (
          <p style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Cargando usuarios...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead style={{ backgroundColor: '#f3f4f6', color: '#333' }}>
                <tr style={{ textAlign: 'left' }}>
                  <th style={{ padding: '12px' }}>Email</th>
                  <th style={{ padding: '12px' }}>Nombre</th>
                  <th style={{ padding: '12px' }}>Rol</th>
                  <th style={{ padding: '12px' }}>Planta</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Estado</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id_usuario} style={{ borderBottom: '1px solid #eee', backgroundColor: u.activo ? 'white' : '#fef2f2' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{u.email}</td>
                    <td style={{ padding: '12px' }}>{u.nombre_completo || '-'}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ padding: '4px 8px', backgroundColor: '#E0E7FF', color: '#3730A3', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                        {u.roles?.codigo || 'SIN ROL'}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>{u.plantas?.nombre || 'Global'}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                        backgroundColor: u.activo ? '#DCFCE7' : '#FEE2E2',
                        color: u.activo ? '#166534' : '#991B1B'
                      }}>
                        {u.activo ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button onClick={() => editarUsuario(u)} style={{ padding: '6px 12px', background: '#0B5FA5', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                        ✏️ Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}