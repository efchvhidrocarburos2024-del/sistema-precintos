import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function Conciliacion() {
  const [plantas, setPlantas] = useState([])
  const [plantaSeleccionada, setPlantaSeleccionada] = useState('')
  const [resultados, setResultados] = useState(null)
  const [justificacion, setJustificacion] = useState('')
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  // 1. Cargar las plantas al iniciar (CORREGIDO a id_planta)
  useEffect(() => {
    const fetchPlantas = async () => {
      const { data } = await supabase.from('plantas').select('id_planta, nombre')
      if (data) setPlantas(data)
    }
    fetchPlantas()
  }, [])

  // 2. Función que hace la matemática
  const ejecutarConciliacion = async () => {
    if (!plantaSeleccionada) {
      setMensaje('⚠️ Selecciona una planta primero.')
      return
    }

    setCargando(true)
    setMensaje('')
    setResultados(null)

    // ⚠️ ATENCIÓN: Aquí uso 'id_planta' asumiendo que así se llama la columna en tu tabla 'precintos'.
    // Si en tu tabla 'precintos' se llama 'planta_id', cambia el .eq() de abajo.
    const { data: precintos, error } = await supabase
      .from('precintos')
      .select('estado')
      .eq('id_planta', plantaSeleccionada) 

    if (error) {
      setMensaje('❌ Error al consultar: ' + error.message)
      setCargando(false)
      return
    }

    // Calculamos los totales
    let disponibles = 0, asignados = 0, devueltos = 0, rotos = 0

    precintos.forEach(p => {
      if (p.estado === 'DISPONIBLE') disponibles++
      if (p.estado === 'ASIGNADO') asignados++
      if (p.estado === 'DEVUELTO') devueltos++
      if (p.estado === 'ROTO' || p.estado === 'DAÑADO') rotos++
    })

    const totalSistema = precintos.length
    const sumaEstados = disponibles + asignados + devueltos + rotos
    const cuadra = (totalSistema === sumaEstados)

    setResultados({
      disponibles, asignados, devueltos, rotos, totalSistema, sumaEstados, cuadra
    })
    
    if (cuadra) {
      setMensaje('✅ El inventario CUADRA perfectamente.')
    } else {
      setMensaje('❌ DESCUADRE DETECTADO. Debes justificar antes de cerrar.')
    }
    
    setCargando(false)
  }

  // 3. Guardar el cierre semanal
  const guardarCierre = async () => {
    if (!resultados.cuadra && !justificacion) {
      setMensaje('⚠️ Escribe una justificación para el descuadre.')
      return
    }

    setCargando(true)
    const user = await supabase.auth.getUser()

    const { error } = await supabase.from('conciliaciones').insert([{
      planta_id: plantaSeleccionada,
      total_disponibles: resultados.disponibles,
      total_asignados: resultados.asignados,
      total_devueltos: resultados.devueltos,
      total_rotos: resultados.rotos,
      total_precintos: resultados.totalSistema,
      estado: resultados.cuadra ? 'CUADRADO' : 'DESCUADRADO',
      justificacion: resultados.cuadra ? null : justificacion,
      creado_por: user.data.user?.id
    }])

    if (error) {
      setMensaje('❌ Error al guardar: ' + error.message)
    } else {
      setMensaje('💾 Cierre semanal guardado exitosamente en el historial.')
      setResultados(null)
      setJustificacion('')
      setPlantaSeleccionada('')
    }
    setCargando(false)
  }

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', fontFamily: 'Arial', padding: '20px' }}>
      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#0B5FA5', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>Cierre y Conciliación Semanal</h2>
        
        <div style={{ display: 'flex', gap: '15px', marginTop: '20px', alignItems: 'center' }}>
          <select 
            value={plantaSeleccionada} 
            onChange={(e) => setPlantaSeleccionada(e.target.value)}
            style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', flex: 1 }}
          >
            <option value="">Seleccione una planta para auditar...</option>
            {/* CORREGIDO a id_planta */}
            {plantas.map(p => (
              <option key={p.id_planta} value={p.id_planta}>{p.nombre}</option>
            ))}
          </select>
          
          <button 
            onClick={ejecutarConciliacion} 
            disabled={cargando || !plantaSeleccionada}
            style={{ padding: '10px 20px', background: '#0B5FA5', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {cargando ? 'Calculando...' : 'Ejecutar Conciliación'}
          </button>
        </div>

        {/* RESULTADOS (Sin cambios) */}
        {resultados && (
          <div style={{ marginTop: '30px', border: `2px solid ${resultados.cuadra ? '#16A34A' : '#DC2626'}`, borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ textAlign: 'center', color: resultados.cuadra ? '#16A34A' : '#DC2626', marginBottom: '20px' }}>
              {resultados.cuadra ? '✅ INVENTARIO CUADRADO' : '❌ DESCUADRE EN INVENTARIO'}
            </h3>
            
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginBottom: '20px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9f9f9' }}>
                  <th style={{ padding: '10px' }}>Estado</th>
                  <th style={{ padding: '10px' }}>Cantidad</th>
                </tr>
              </thead>
              <tbody>
                <tr><td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>Disponibles</td><td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{resultados.disponibles}</td></tr>
                <tr><td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>Asignados</td><td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{resultados.asignados}</td></tr>
                <tr><td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>Devueltos</td><td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{resultados.devueltos}</td></tr>
                <tr><td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>Rotos / Dañados</td><td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{resultados.rotos}</td></tr>
                <tr style={{ fontWeight: 'bold', backgroundColor: '#f0f4f8' }}>
                  <td style={{ padding: '10px' }}>Suma de Estados (Sistema)</td>
                  <td style={{ padding: '10px' }}>{resultados.sumaEstados}</td>
                </tr>
                <tr style={{ fontWeight: 'bold', backgroundColor: '#f0f4f8' }}>
                  <td style={{ padding: '10px' }}>Total Físico (Registros)</td>
                  <td style={{ padding: '10px' }}>{resultados.totalSistema}</td>
                </tr>
              </tbody>
            </table>

            {!resultados.cuadra && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px', color: '#DC2626' }}>Justificación del Descuadre:</label>
                <textarea 
                  value={justificacion}
                  onChange={(e) => setJustificacion(e.target.value)}
                  placeholder="Ej. Se perdieron 2 precintos en el camión, se reportó a gerencia..."
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', minHeight: '80px' }}
                />
              </div>
            )}

            <button 
              onClick={guardarCierre}
              disabled={cargando}
              style={{ width: '100%', padding: '12px', background: resultados.cuadra ? '#16A34A' : '#DC2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              {cargando ? 'Guardando...' : `Guardar Cierre Semanal (${resultados.cuadra ? 'Cuadrado' : 'Con Descuadre'})`}
            </button>
          </div>
        )}

        {mensaje && <p style={{ textAlign: 'center', marginTop: '20px', fontWeight: 'bold', color: mensaje.includes('❌') || mensaje.includes('⚠️') ? 'red' : 'green' }}>{mensaje}</p>}
      </div>
    </div>
  )
}