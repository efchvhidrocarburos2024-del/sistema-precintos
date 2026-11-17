import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function Dashboard() {
  const [conteos, setConteos] = useState({
    DISPONIBLE: 0,
    ASIGNADO: 0,
    DEVUELTO: 0,
    EN_MAL_ESTADO: 0,
    ROTO_EN_USO: 0,
    BAJA: 0
  })
  const [historial, setHistorial] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargarDatos() {
      setCargando(true)
      // 1. Traer todos los precintos para contar los estados
      const { data: precintos } = await supabase.from('precintos').select('estado')
      
      if (precintos) {
        const nuevosConteos = { DISPONIBLE: 0, ASIGNADO: 0, DEVUELTO: 0, EN_MAL_ESTADO: 0, ROTO_EN_USO: 0, BAJA: 0 }
        precintos.forEach(p => {
          if (nuevosConteos[p.estado] !== undefined) {
            nuevosConteos[p.estado]++
          }
        })
        setConteos(nuevosConteos)
      }

      // 2. Traer los últimos 15 eventos del historial
      const { data: hist } = await supabase
        .from('precintos_historial')
        .select(`
          id_historial,
          estado_anterior,
          estado_nuevo,
          accion_realizada,
          fecha,
          precintos (correlativo)
        `)
        .order('fecha', { ascending: false })
        .limit(15)

      if (hist) setHistorial(hist)
      
      setCargando(false)
    }
    cargarDatos()
  }, [])

  // Colores por estado para las tarjetas
  const colores = {
    DISPONIBLE: '#16A34A', // Verde
    ASIGNADO: '#2563EB',   // Azul
    DEVUELTO: '#D97706',   // Naranja
    EN_MAL_ESTADO: '#B45309', // Marrón oscuro
    ROTO_EN_USO: '#DC2626',   // Rojo
    BAJA: '#6B7280'        // Gris
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', fontFamily: 'Arial', padding: '20px' }}>
      
      <h2 style={{ textAlign: 'center', color: '#0B5FA5' }}>Panel de Control y Auditoría</h2>
      
      {cargando ? <p style={{ textAlign: 'center' }}>Cargando datos...</p> : (
        <>
          {/* TARJETAS DE ESTADOS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '15px', marginBottom: '30px' }}>
            {Object.entries(conteos).map(([estado, cantidad]) => (
              <div key={estado} style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderTop: `4px solid ${colores[estado]}`, textAlign: 'center' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#666' }}>{estado.replace('_', ' ')}</h4>
                <span style={{ fontSize: '24px', fontWeight: 'bold', color: colores[estado] }}>{cantidad}</span>
              </div>
            ))}
          </div>

          {/* TABLA DE HISTORIAL */}
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0, borderBottom: '2px solid #eee', paddingBottom: '10px' }}>Últimos Movimientos (Bitácora Inmutable)</h3>
            
            {historial.length === 0 ? (
              <p>No hay movimientos registrados aún.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                    <th style={{ padding: '8px' }}>Fecha / Hora</th>
                    <th style={{ padding: '8px' }}>Precinto</th>
                    <th style={{ padding: '8px' }}>Cambio de Estado</th>
                    <th style={{ padding: '8px' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((h) => (
                    <tr key={h.id_historial} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '8px', color: '#666' }}>{new Date(h.fecha).toLocaleString()}</td>
                      <td style={{ padding: '8px', fontWeight: 'bold' }}>{h.precintos?.correlativo}</td>
                      <td style={{ padding: '8px' }}>
                        <span style={{ color: '#999' }}>{h.estado_anterior || 'NUEVO'}</span> 
                        <span style={{ margin: '0 5px' }}>➔</span> 
                        <span style={{ fontWeight: 'bold', color: colores[h.estado_nuevo] }}>{h.estado_nuevo}</span>
                      </td>
                      <td style={{ padding: '8px', color: '#444' }}>{h.accion_realizada}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}