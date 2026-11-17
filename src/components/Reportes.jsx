import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function Reportes() {
  const [viajes, setViajes] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargarViajes() {
      setCargando(true)
      const { data } = await supabase
        .from('vista_reporte_viajes')
        .select('*')
        .limit(100)
      
      if (data) setViajes(data)
      setCargando(false)
    }
    cargarViajes()
  }, [])

  // Función para exportar a CSV (Excel)
  const exportarACSV = () => {
    if (viajes.length === 0) return

    // Definimos los encabezados
    const cabeceras = ['FECHA', 'SCOP', 'DEL', 'AL', 'N° PRECINTOS', 'ESTADO', 'OBSERVACIONES']
    
    // Convertimos los datos a filas CSV
    const filas = viajes.map(v => {
      const fecha = new Date(v.fecha).toLocaleString().replace(',', '')
      return `${fecha};${v.scop};${v.del || ''};${v.al || ''};${v.n_precintos};${v.estado_viaje};${v.observaciones || ''}`
    })

    const contenidoCSV = [cabeceras.join(';'), ...filas].join('\n')
    
    // Creamos el archivo y forzamos la descarga
    const blob = new Blob(["\uFEFF" + contenidoCSV], { type: 'text/csv;charset=utf-8;' }) // \uFEFF es para que Excel lea bien las tildes
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Reporte_Viajes_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', fontFamily: 'Arial', padding: '20px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: '#0B5FA5', margin: 0 }}>Historial de Viajes (SCOP)</h2>
        <button 
          onClick={exportarACSV}
          style={{ padding: '10px 20px', background: '#16A34A', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
          📥 Exportar a Excel
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        {cargando ? (
          <p style={{ padding: '20px', textAlign: 'center' }}>Cargando reporte...</p>
        ) : viajes.length === 0 ? (
          <p style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Aún no hay viajes registrados.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead style={{ backgroundColor: '#0B5FA5', color: 'white' }}>
              <tr style={{ textAlign: 'left' }}>
                <th style={{ padding: '12px' }}>FECHA</th>
                <th style={{ padding: '12px' }}>SCOP</th>
                <th style={{ padding: '12px' }}>DEL</th>
                <th style={{ padding: '12px' }}>AL</th>
                <th style={{ padding: '12px' }}>N° PRECINTOS</th>
                <th style={{ padding: '12px' }}>ESTADO</th>
                <th style={{ padding: '12px' }}>OBS</th>
              </tr>
            </thead>
            <tbody>
              {viajes.map((v) => (
                <tr key={v.id_transaccion} style={{ borderBottom: '1px solid #eee', backgroundColor: v.estado_viaje === 'ANULADA' ? '#fef2f2' : 'white' }}>
                  <td style={{ padding: '10px' }}>{new Date(v.fecha).toLocaleString()}</td>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{v.scop}</td>
                  <td style={{ padding: '10px' }}>{v.del}</td>
                  <td style={{ padding: '10px' }}>{v.al}</td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>{v.n_precintos}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ 
                      padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                      backgroundColor: v.estado_viaje === 'ANULADA' ? '#FEE2E2' : '#DCFCE7',
                      color: v.estado_viaje === 'ANULADA' ? '#991B1B' : '#166534'
                    }}>
                      {v.estado_viaje}
                    </span>
                  </td>
                  <td style={{ padding: '10px', color: '#666' }}>{v.observaciones || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}