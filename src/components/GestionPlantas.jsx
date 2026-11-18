import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'
import { PageHeader, Card, Input, Boton, Tabla, Badge, Spinner } from './ui'

export default function GestionPlantas() {
  const [plantas, setPlantas] = useState([])
  const [cargando, setCargando] = useState(true)

  // Estados del formulario
  const [idEditando, setIdEditando] = useState(null)
  const [nombre, setNombre] = useState('')
  const [codigo, setCodigo] = useState('')
  const [prefijo, setPrefijo] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    cargarPlantas()
  }, [])

  async function cargarPlantas() {
    setCargando(true)
    const { data, error } = await supabase.from('plantas').select('*').order('nombre')
    if (!error) setPlantas(data)
    setCargando(false)
  }

  const guardarPlanta = async (e) => {
    e.preventDefault()
    if (!nombre || !codigo || !prefijo) {
      toast.error('Todos los campos son obligatorios')
      return
    }

    setGuardando(true)
    const datosPlanta = {
      nombre: nombre.trim(),
      codigo: codigo.trim().toUpperCase(),
      prefijo_correlativo: prefijo.trim().toUpperCase()
    }

    if (idEditando) {
      const { error } = await supabase.from('plantas').update(datosPlanta).eq('id_planta', idEditando)
      if (error) {
        toast.error('Error al actualizar: ' + error.message)
      } else {
        toast.success('Planta actualizada correctamente')
        limpiarFormulario()
        cargarPlantas()
      }
    } else {
      const { error } = await supabase.from('plantas').insert([datosPlanta])
      if (error) {
        toast.error('Error al crear: ' + error.message)
      } else {
        toast.success('Planta creada correctamente')
        limpiarFormulario()
        cargarPlantas()
      }
    }
    setGuardando(false)
  }

  const editarPlanta = (planta) => {
    setIdEditando(planta.id_planta)
    setNombre(planta.nombre)
    setCodigo(planta.codigo)
    setPrefijo(planta.prefijo_correlativo || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const eliminarPlanta = async (id, nombrePlanta) => {
    if (window.confirm(`¿Estás seguro de eliminar la planta ${nombrePlanta}? Esta acción no se puede deshacer.`)) {
      const { error } = await supabase.from('plantas').delete().eq('id_planta', id)
      if (error) {
        toast.error('No se puede eliminar. Esta planta ya tiene precintos o usuarios asociados.')
      } else {
        toast.success('Planta eliminada')
        cargarPlantas()
      }
    }
  }

  const limpiarFormulario = () => {
    setIdEditando(null)
    setNombre('')
    setCodigo('')
    setPrefijo('')
  }

  return (
    <div className="page-container" style={{ maxWidth: '900px' }}>
      <PageHeader titulo="Gestión de Plantas" />

      {/* FORMULARIO */}
      <Card titulo={idEditando ? '✏️ Editar Planta' : '🏭 Nueva Planta'}>
        <form onSubmit={guardarPlanta}>
          <div className="form-row">
            <Input
              label="Nombre de la Planta"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Planta Lima"
              required
            />
            <Input
              label="Código Corto"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Ej. LIM"
              required
            />
            <Input
              label="Prefijo Correlativo"
              value={prefijo}
              onChange={(e) => setPrefijo(e.target.value)}
              placeholder="Ej. LIMA"
              required
            />
          </div>

          <div className="form-actions">
            {idEditando && (
              <Boton
                variante="secondary"
                onClick={limpiarFormulario}
                disabled={guardando}
              >
                Cancelar
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
                  ? 'Actualizar'
                  : 'Guardar'}
            </Boton>
          </div>
        </form>
      </Card>

      {/* TABLA DE PLANTAS */}
      <Card>
        {cargando ? (
          <Spinner />
        ) : (
          <Tabla
            columnas={['Nombre', 'Código', 'Prefijo', 'Acciones']}
            hayDatos={plantas.length > 0}
            vacio="No hay plantas registradas."
          >
            {plantas.map((p) => (
              <tr key={p.id_planta}>
                <td style={{ fontWeight: 'bold' }}>{p.nombre}</td>
                <td>{p.codigo}</td>
                <td>
                  <Badge variante="secondary">
                    {p.prefijo_correlativo || 'N/A'}
                  </Badge>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <Boton
                      variante="warning"
                      tamano="sm"
                      onClick={() => editarPlanta(p)}
                    >
                      ✏️ Editar
                    </Boton>
                    <Boton
                      variante="danger"
                      tamano="sm"
                      onClick={() => eliminarPlanta(p.id_planta, p.nombre)}
                    >
                      🗑️ Borrar
                    </Boton>
                  </div>
                </td>
              </tr>
            ))}
          </Tabla>
        )}
      </Card>
    </div>
  )
}