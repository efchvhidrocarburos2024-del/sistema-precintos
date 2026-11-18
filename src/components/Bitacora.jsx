import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function Bitacora() {
  const [eventos, setEventos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState('')

  useEffect(() => {
    async function cargarBitacora() {
      const { data, error } = await supabase
        .from('bitacora_eventos')
        .select(`
          id_evento,
          accion,
          detalles,
          fecha,
          usuarios ( email ),
          plantas ( nombre )
        `)
        .order('fecha', { ascending: false })
        .limit(100)

      if (!error && data) {
        setEventos(data)
      }
      setCargando(false)
    }
    cargarBitacora()
  }, [])

  // Filtrar en tiempo real
  const eventosFiltrados = eventos.filter(e => {
    const mensajeDetalle = e.detalles?.mensaje || ''
    return (
      e.accion.toLowerCase().includes(filtro.toLowerCase()) || 
      mensajeDetalle.toLowerCase().includes(filtro.toLowerCase()) ||
      (e.usuarios?.email || '').toLowerCase().includes(filtro.toLowerCase())
    )
  })

  return (
    <div style={{ maxWidth: '1100px', margin: '20px auto', fontFamily: 'Arial', padding: '20px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
      <h2 style={{ color: '#0B5FA5', marginBottom: '20px', textAlign: 'center' }}>Bitácora de Auditoría</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <input 
          type="text" 
          placeholder="Buscar por acción, detalle o correo del usuario..." 
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          style={{ width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white', color: 'black', boxSizing: 'border-box' }}
        />
      </div>

      {cargando ? (
        <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>Cargando bitácora...</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '12px' }}>Fecha / Hora</th>
                <th style={{ padding: '12px' }}>Usuario</th>
                <th style={{ padding: '12px' }}>Planta</th>
                <th style={{ padding: '12px' }}>Acción</th>
                <th style={{ padding: '12px' }}>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {eventosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No se encontraron eventos.</td>
                </tr>
              ) : (
                eventosFiltrados.map((e) => (
                  <tr key={e.id_evento} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px', color: '#666' }}>
                      {new Date(e.fecha).toLocaleString('es-PE')}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>
                      {e.usuarios?.email || 'Sistema'}
                    </td>
                    <td style={{ padding: '12px', color: '#444' }}>
                      {e.plantas?.nombre || 'Global'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
                        backgroundColor: '#E0E7FF', color: '#3730A3'
                      }}>
                        {e.accion}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#444' }}>
                      {/* Extraemos el mensaje del JSON, si no existe, mostramos el JSON completo */}
                      {e.detalles?.mensaje || JSON.stringify(e.detalles)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}