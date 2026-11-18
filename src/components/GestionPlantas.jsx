import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'

export default function GestionPlantas() {
  const [plantas, setPlantas] = useState([])
  const [cargando, setCargando] = useState(true)
  
  // Estados del formulario
  const [idEditando, setIdEditando] = useState(null) // Si es null, estamos creando. Si tiene ID, editamos.
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
      toast.error("Todos los campos son obligatorios")
      return
    }

    setGuardando(true)
    // Convertimos el prefijo a mayúsculas
    const datosPlanta = { 
      nombre: nombre.trim(), 
      codigo: codigo.trim().toUpperCase(), 
      prefijo_correlativo: prefijo.trim().toUpperCase() 
    }

    if (idEditando) {
      // ACTUALIZAR
      const { error } = await supabase.from('plantas').update(datosPlanta).eq('id_planta', idEditando)
      if (error) {
        toast.error("Error al actualizar: " + error.message)
      } else {
        toast.success("Planta actualizada correctamente")
        limpiarFormulario()
        cargarPlantas()
      }
    } else {
      // CREAR
      const { error } = await supabase.from('plantas').insert([datosPlanta])
      if (error) {
        toast.error("Error al crear: " + error.message)
      } else {
        toast.success("Planta creada correctamente")
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
    window.scrollTo({ top: 0, behavior: 'smooth' }) // Subimos para ver el formulario
  }

  const eliminarPlanta = async (id, nombrePlanta) => {
    if (window.confirm(`¿Estás seguro de eliminar la planta ${nombrePlanta}? Esta acción no se puede deshacer.`)) {
      const { error } = await supabase.from('plantas').delete().eq('id_planta', id)
      if (error) {
        // Si hay error de llave foránea (porque tiene precintos asociados)
        toast.error("No se puede eliminar. Esta planta ya tiene precintos o usuarios asociados.")
      } else {
        toast.success("Planta eliminada")
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
    <div style={{ width: '90%', maxWidth: '900px', margin: '20px auto', fontFamily: 'Arial', padding: '20px', boxSizing: 'border-box' }}>
      
      {/* FORMULARIO */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
        <h2 style={{ color: '#0B5FA5', marginTop: 0, textAlign: 'center' }}>
          {idEditando ? '✏️ Editar Planta' : '🏭 Nueva Planta'}
        </h2>
        
        <form onSubmit={guardarPlanta} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', alignItems: 'end' }}>
          
          <div>
            <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Nombre de la Planta:</label>
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Planta Lima" required style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white', color: 'black', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Código Corto:</label>
            <input type="text" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ej. LIM" required style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white', color: 'black', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Prefijo Correlativo:</label>
            <input type="text" value={prefijo} onChange={(e) => setPrefijo(e.target.value)} placeholder="Ej. LIMA" required style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white', color: 'black', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" disabled={guardando} style={{ flex: 1, padding: '10px', background: idEditando ? '#EAB308' : '#16A34A', color: idEditando ? 'black' : 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              {guardando ? 'Guardando...' : (idEditando ? 'Actualizar' : 'Guardar')}
            </button>
            
            {idEditando && (
              <button type="button" onClick={limpiarFormulario} style={{ padding: '10px', background: '#6B7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* TABLA DE PLANTAS */}
      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        {cargando ? (
          <p style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Cargando plantas...</p>
        ) : plantas.length === 0 ? (
          <p style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No hay plantas registradas.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead style={{ backgroundColor: '#0B5FA5', color: 'white' }}>
                <tr style={{ textAlign: 'left' }}>
                  <th style={{ padding: '12px' }}>Nombre</th>
                  <th style={{ padding: '12px' }}>Código</th>
                  <th style={{ padding: '12px' }}>Prefijo</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {plantas.map((p) => (
                  <tr key={p.id_planta} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{p.nombre}</td>
                    <td style={{ padding: '12px' }}>{p.codigo}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ padding: '4px 8px', backgroundColor: '#e5e7eb', borderRadius: '4px', fontWeight: 'bold' }}>
                        {p.prefijo_correlativo || 'N/A'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button onClick={() => editarPlanta(p)} style={{ padding: '6px 10px', background: '#EAB308', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginRight: '10px' }}>
                        ✏️ Editar
                      </button>
                      <button onClick={() => eliminarPlanta(p.id_planta, p.nombre)} style={{ padding: '6px 10px', background: '#DC2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                        🗑️ Borrar
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