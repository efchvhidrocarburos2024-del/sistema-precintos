import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function ListadoPrecintos() {
  const [precintos, setPrecintos] = useState([])
  const [cargando, setCargando] = useState(true)
  
  // Estados para filtros y paginación
  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [pagina, setPagina] = useState(0)
  const [totalRegistros, setTotalRegistros] = useState(0)
  const itemsPorPagina = 20

  useEffect(() => {
    async function cargarPrecintos() {
      setCargando(true)
      
      // Iniciar la consulta con el conteo exacto para la paginación
      let query = supabase
        .from('precintos')
        .select(`
          id_precinto,
          correlativo,
          estado,
          color,
          valor_sin_igv,
          fecha_recepcion,
          plantas ( nombre )
        `, { count: 'exact' })

      // Aplicar filtros si existen
      if (filtroTexto) {
        query = query.ilike('correlativo', `%${filtroTexto}%`)
      }
      if (filtroEstado) {
        query = query.eq('estado', filtroEstado)
      }

      // Aplicar paginación (desde - hasta)
      const from = pagina * itemsPorPagina
      const to = from + itemsPorPagina - 1
      
      query = query
        .order('fecha_recepcion', { ascending: false })
        .range(from, to)

      const { data, error, count } = await query

      if (!error && data) {
        setPrecintos(data)
        setTotalRegistros(count || 0)
      }
      setCargando(false)
    }

    cargarPrecintos()
  }, [pagina, filtroTexto, filtroEstado]) // Se vuelve a ejecutar si cambian estos estados

  // Calcular total de páginas
  const totalPaginas = Math.ceil(totalRegistros / itemsPorPagina)

  // Limpiar filtros
  const limpiarFiltros = () => {
    setFiltroTexto('')
    setFiltroEstado('')
    setPagina(0)
  }

  // --- FUNCIÓN PARA EXPORTAR A EXCEL/CSV (Trae todos los datos filtrados, no solo la página actual) ---
  const exportarCSV = async () => {
    setCargando(true)
    
    // Hacemos la misma consulta pero SIN el .range() para traer todo
    let query = supabase.from('precintos').select(`correlativo, estado, color, valor_sin_igv, fecha_recepcion, plantas(nombre)`)
    if (filtroTexto) query = query.ilike('correlativo', `%${filtroTexto}%`)
    if (filtroEstado) query = query.eq('estado', filtroEstado)
    
    const { data } = await query.order('fecha_recepcion', { ascending: false })

    if (!data || data.length === 0) {
      alert("No hay datos para exportar con los filtros actuales")
      setCargando(false)
      return
    }

    const headers = ['Correlativo', 'Planta', 'Color', 'Valor sin IGV', 'Estado', 'Fecha de Recepcion']
    const rows = data.map(p => [
      p.correlativo, p.plantas?.nombre || 'Sin Planta', p.color || '-',
      p.valor_sin_igv?.toFixed(2) || '0.00', p.estado,
      new Date(p.fecha_recepcion).toLocaleDateString('es-PE')
    ])

    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Inventario_Precintos_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    setCargando(false)
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '20px auto', fontFamily: 'Arial', padding: '20px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ color: '#0B5FA5', margin: 0 }}>Inventario de Precintos</h2>
        <button onClick={exportarCSV} disabled={cargando} style={{ padding: '10px 20px', background: '#16A34A', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          📥 Exportar a Excel
        </button>
      </div>

      {/* BARRA DE FILTROS */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', backgroundColor: '#f9fafb', padding: '15px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        
        <input 
          type="text" 
          placeholder="Buscar por correlativo (Ej. CAL-100)..." 
          value={filtroTexto}
          onChange={(e) => { setFiltroTexto(e.target.value); setPagina(0); }}
          style={{ flex: '1 1 250px', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white', color: 'black' }}
        />

        <select 
          value={filtroEstado} 
          onChange={(e) => { setFiltroEstado(e.target.value); setPagina(0); }}
          style={{ flex: '0 1 200px', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white', color: 'black' }}
        >
          <option value="">Todos los estados</option>
          <option value="DISPONIBLE">Disponible</option>
          <option value="ASIGNADO">Asignado</option>
          <option value="DEVUELTO">Devuelto</option>
          <option value="EN_MAL_ESTADO">En Mal Estado</option>
          <option value="ROTO_EN_USO">Roto en Uso</option>
          <option value="BAJA">Baja</option>
        </select>

        <button onClick={limpiarFiltros} style={{ padding: '10px 15px', background: '#6B7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          Limpiar
        </button>
      </div>

      {/* TABLA DE DATOS */}
      {cargando ? (
        <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>Cargando datos desde el servidor...</p>
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
              {precintos.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#666' }}>No se encontraron precintos con estos filtros.</td>
                </tr>
              ) : (
                precintos.map((p) => (
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

      {/* CONTROLES DE PAGINACIÓN */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <span style={{ color: '#666', fontSize: '14px' }}>
          Mostrando <strong>{precintos.length}</strong> de <strong>{totalRegistros}</strong> registros totales
        </span>
        
        <div style={{ display: 'flex', gap: '5px' }}>
          <button 
            onClick={() => setPagina(p => Math.max(0, p - 1))} 
            disabled={pagina === 0 || cargando}
            style={{ padding: '8px 15px', cursor: pagina === 0 ? 'not-allowed' : 'pointer', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: pagina === 0 ? '#f3f4f6' : 'white', color: pagina === 0 ? '#999' : '#333' }}
          >
            Anterior
          </button>
          
          <span style={{ padding: '8px 15px', backgroundColor: '#0B5FA5', color: 'white', borderRadius: '4px', fontWeight: 'bold' }}>
            Página {pagina + 1} de {totalPaginas || 1}
          </span>

          <button 
            onClick={() => setPagina(p => Math.min(totalPaginas - 1, p + 1))} 
            disabled={pagina >= totalPaginas - 1 || cargando}
            style={{ padding: '8px 15px', cursor: pagina >= totalPaginas - 1 ? 'not-allowed' : 'pointer', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: pagina >= totalPaginas - 1 ? '#f3f4f6' : 'white', color: pagina >= totalPaginas - 1 ? '#999' : '#333' }}
          >
            Siguiente
          </button>
        </div>
      </div>

    </div>
  )
}