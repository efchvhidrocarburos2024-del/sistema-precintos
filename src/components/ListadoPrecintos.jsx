import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function ListadoPrecintos() {
  const [precintos, setPrecintos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState('')

  useEffect(() => {
    async function cargarPrecintos() {
      const { data, error } = await supabase
        .from('precintos')
        .select(`
          id_precinto,
          correlativo,
          estado,
          color,
          valor_sin_igv,
          fecha_recepcion,
          plantas ( nombre )
        `)
        .order('fecha_recepcion', { ascending: false })
        .limit(100)

      if (!error && data) {
        setPrecintos(data)
      }
      setCargando(false)
    }
    cargarPrecintos()
  }, [])

  // Filtrar en tiempo real
  const precintosFiltrados = precintos.filter(p => 
    p.correlativo.toLowerCase().includes(filtro.toLowerCase()) || 
    (p.plantas?.nombre || '').toLowerCase().includes(filtro.toLowerCase())
  )

  // --- FUNCIÓN PARA EXPORTAR A EXCEL/CSV ---
  const exportarCSV = () => {
    if (precintosFiltrados.length === 0) {
      alert("No hay datos para exportar")
      return
    }

    // Definir cabeceras
    const headers = ['Correlativo', 'Planta', 'Color', 'Valor sin IGV', 'Estado', 'Fecha de Recepcion']
    
    // Mapear los datos a filas
    const rows = precintosFiltrados.map(p => [
      p.correlativo,
      p.plantas?.nombre || 'Sin Planta',
      p.color || '-',
      p.valor_sin_igv?.toFixed(2) || '0.00',
      p.estado,
      new Date(p.fecha_recepcion).toLocaleDateString('es-PE')
    ])

    // Construir el string CSV (con comillas para evitar problemas con comas en los nombres)
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Crear el archivo y forzar la descarga (agregamos \uFEFF para que Excel reconozca tildes y ñ)
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Inventario_Precintos_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '20px auto', fontFamily: 'Arial', padding: '20px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ color: '#0B5FA5', margin: 0 }}>Inventario de Precintos</h2>
        
        {/* BOTÓN DE EXPORTAR */}
        <button 
          onClick={exportarCSV}
          style={{ padding: '10px 20px', background: '#16A34A', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          📥 Exportar a Excel
        </button>
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <input 
          type="text" 
          placeholder="Buscar por correlativo o planta..." 
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          style={{ 
            width: '100%', 
            padding: '10px', 
            borderRadius: '4px', 
            border: '1px solid #ccc', 
            boxSizing: 'border-box',
            backgroundColor: 'white', // Forzamos fondo blanco
            color: 'black'            // Forzamos texto oscuro
          }}
        />
      </div>

      {cargando ? (
        <p style={{ textAlign: 'center', color: '#666' }}>Cargando precintos...</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '12px' }}>Correlativo</th>
                <th style={{ padding: '12px' }}>Planta</th>
                <th style={{ padding: '12px' }}>Color</th>
                <th style={{ padding: '12px' }}>Valor (S/)</th>
                <th style={{ padding: '12px' }}>Estado</th>
                <th style={{ padding: '12px' }}>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {precintosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No se encontraron precintos.</td>
                </tr>
              ) : (
                precintosFiltrados.map((p) => (
                  <tr key={p.id_precinto} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{p.correlativo}</td>
                    <td style={{ padding: '12px' }}>{p.plantas?.nombre || 'Sin Planta'}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ padding: '4px 8px', backgroundColor: '#e5e7eb', borderRadius: '4px' }}>{p.color || '-'}</span>
                    </td>
                    <td style={{ padding: '12px' }}>S/ {p.valor_sin_igv?.toFixed(2) || '0.00'}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
                        backgroundColor: p.estado === 'DISPONIBLE' ? '#DCFCE7' : '#FEE2E2', 
                        color: p.estado === 'DISPONIBLE' ? '#166534' : '#991B1B'
                      }}>
                        {p.estado}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#666' }}>
                      {new Date(p.fecha_recepcion).toLocaleDateString('es-PE')}
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