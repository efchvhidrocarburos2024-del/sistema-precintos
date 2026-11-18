import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'
import { PageHeader, Card, Input, Select, Boton, Tabla, Badge, Spinner } from './ui'

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

  // Permisos (arreglo de strings)
  const [permisos, setPermisos] = useState([])

  const permisosDisponibles = [
    { id: 'bitacora', label: 'Ver Bitácora de Auditoría' },
    { id: 'proyeccion', label: 'Ver Proyección de Demanda' },
    { id: 'conciliacion', label: 'Ejecutar Conciliación' },
    { id: 'usuarios', label: 'Administrar Usuarios' },
    { id: 'plantas', label: 'Configurar Plantas' },
    { id: 'respaldos', label: 'Descargar Respaldos' },
    { id: 'todas_plantas', label: 'Acceso a todas las plantas' },
  ]

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    setCargando(true)
    const [resRoles, resPlantas, resUsuarios] = await Promise.all([
      supabase.from('roles').select('*').order('nombre'),
      supabase.from('plantas').select('*').order('nombre'),
      supabase.from('usuarios').select(`
        id_usuario, email, nombre_completo, activo, permisos,
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
    setPermisos([])
  }

  const editarUsuario = (u) => {
    setIdEditando(u.id_usuario)
    setEmail(u.email)
    setNombre(u.nombre_completo || '')
    setPassword('')
    setRol(u.roles?.codigo?.toLowerCase() || 'admin_planta')
    setIdPlanta(u.plantas?.id_planta || plantas[0]?.id_planta || '')
    setActivo(u.activo)
    setPermisos(u.permisos || [])
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const togglePermiso = (permisoId) => {
    if (permisos.includes(permisoId)) {
      setPermisos(permisos.filter(p => p !== permisoId))
    } else {
      setPermisos([...permisos, permisoId])
    }
  }

  const guardarUsuario = async (e) => {
    e.preventDefault()
    setGuardando(true)

    if (idEditando) {
      const { data, error } = await supabase.functions.invoke('gestionar-usuario', {
        body: {
          id_usuario: idEditando,
          email: email,
          nombre_completo: nombre,
          rol: rol,
          id_planta: rol === 'admin_planta' ? idPlanta : null,
          activo: activo,
          password: password,
          permisos: permisos
        }
      })

      if (error || (data && data.error)) {
        toast.error(data?.error || error.message)
      } else {
        toast.success('Usuario actualizado correctamente')
        limpiarFormulario()
        cargarDatos()
      }
    } else {
      if (!password) {
        toast.error('La contraseña es obligatoria para nuevos usuarios')
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
        try {
          await supabase.functions.invoke('enviar-credenciales', {
            body: { email: email, nombre: nombre, password: password, rol: rol }
          })
          toast.success('Credenciales enviadas por correo')
        } catch (err) {}
        limpiarFormulario()
        cargarDatos()
      }
    }
    setGuardando(false)
  }

  return (
    <div className="page-container" style={{ maxWidth: '1100px' }}>
      <PageHeader titulo="Gestión de Usuarios" />

      {/* FORMULARIO */}
      <Card titulo={idEditando ? '✏️ Editar Usuario' : '👤 Crear Nuevo Usuario'}>
        <form onSubmit={guardarUsuario}>
          <div className="form-row">
            <Input
              label="Correo (Email)"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={idEditando !== null}
              required
            />
            <Input
              label="Nombre Completo"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
            <Input
              label={idEditando ? 'Contraseña (Opcional)' : 'Contraseña'}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!idEditando}
              minLength={6}
              placeholder={idEditando ? 'Dejar en blanco para no cambiar' : ''}
            />
          </div>

          <div className="form-row">
            <Select
              label="Rol"
              value={rol}
              onChange={(e) => setRol(e.target.value)}
              placeholder={null}
              options={roles.map(r => ({
                value: r.codigo.toLowerCase(),
                label: r.nombre
              }))}
            />

            {rol === 'admin_planta' && (
              <Select
                label="Planta"
                value={idPlanta}
                onChange={(e) => setIdPlanta(e.target.value)}
                placeholder={null}
                options={plantas.map(p => ({
                  value: p.id_planta,
                  label: p.nombre
                }))}
              />
            )}

            {idEditando && (
              <Select
                label="Estado"
                value={activo ? 'true' : 'false'}
                onChange={(e) => setActivo(e.target.value === 'true')}
                placeholder={null}
                options={[
                  { value: 'true', label: 'Activo (Permitir acceso)' },
                  { value: 'false', label: 'Inactivo (Bloquear acceso)' }
                ]}
              />
            )}
          </div>

          {/* SECCIÓN DE PERMISOS EXTRA (SOLO AL EDITAR) */}
          {idEditando && (
            <div style={{
              backgroundColor: '#f9fafb',
              padding: '15px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              marginTop: '10px'
            }}>
              <label style={{
                fontWeight: '600',
                fontSize: '13px',
                display: 'block',
                marginBottom: '12px',
                color: 'var(--primary-blue)'
              }}>
                Conceder Permisos Especiales (Opcional)
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                {permisosDisponibles.map(p => (
                  <label
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={permisos.includes(p.id)}
                      onChange={() => togglePermiso(p.id)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    {p.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="form-actions">
            {idEditando && (
              <Boton
                variante="secondary"
                onClick={limpiarFormulario}
                disabled={guardando}
              >
                Cancelar Edición
              </Boton>
            )}
            <Boton
              tipo="submit"
              variante={idEditando ? 'warning' : 'success'}
              disabled={guardando}
            >
              {guardando
                ? 'Guardando...'
                : idEditando
                  ? 'Actualizar Usuario y Permisos'
                  : 'Crear Usuario'}
            </Boton>
          </div>
        </form>
      </Card>

      {/* TABLA DE USUARIOS */}
      <Card titulo="Listado de Usuarios">
        {cargando ? (
          <Spinner />
        ) : (
          <Tabla
            columnas={['Email', 'Nombre', 'Rol', 'Planta', 'Estado', 'Acciones']}
            hayDatos={usuarios.length > 0}
            vacio="No hay usuarios registrados."
          >
            {usuarios.map((u) => (
              <tr key={u.id_usuario} style={{ backgroundColor: u.activo ? 'white' : '#fef2f2' }}>
                <td style={{ fontWeight: 'bold' }}>
                  {u.email}
                  {u.permisos && u.permisos.length > 0 && (
                    <span
                      title={`Permisos extra: ${u.permisos.join(', ')}`}
                      style={{ marginLeft: '8px', cursor: 'help', fontSize: '16px' }}
                    >
                      ⭐
                    </span>
                  )}
                </td>
                <td>{u.nombre_completo || '-'}</td>
                <td>
                  <Badge variante="info">{u.roles?.codigo || 'SIN ROL'}</Badge>
                </td>
                <td>{u.plantas?.nombre || 'Global'}</td>
                <td style={{ textAlign: 'center' }}>
                  <Badge variante={u.activo ? 'success' : 'danger'}>
                    {u.activo ? 'ACTIVO' : 'INACTIVO'}
                  </Badge>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <Boton
                    variante="primary"
                    tamano="sm"
                    onClick={() => editarUsuario(u)}
                  >
                    ✏️ Editar
                  </Boton>
                </td>
              </tr>
            ))}
          </Tabla>
        )}
      </Card>
    </div>
  )
}