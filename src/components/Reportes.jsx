import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function Reportes() {
  const [viajes, setViajes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtroFecha, setFiltroFecha] = useState('este_mes') // Por defecto mostramos el mes actual

  // Función para calcular el rango de fechas
  const obtenerRangoFechas = () => {
    const ahora = new Date()
    let inicio = null
    let fin = new Date().toISOString()

    if (filtroFecha === 'este_mes') {
      inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString()
    } else if (filtroFecha === 'mes_pasado') {
      inicio = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1).toISOString()
      fin = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59).toISOString()
    } else if (filtroFecha === 'este_ano') {
      inicio = new Date(ahora.getFullYear(), 0, 1).toISOString()
    } else if (filtroFecha === 'ultimos_30_dias') {
      const hace30Dias = new Date()
      hace30Dias.setDate(hace30Dias.getDate() - 30)
      inicio = hace30Dias.toISOString()
    }
    
    return { inicio, fin }
  }

  useEffect(() => {
    async function cargarViajes() {
      setCargando(true)
      const { inicio, fin } = obtenerRangoFechas()

      let query = supabase.from('vista_reporte_viajes').select('*')

      if (inicio) {
        query = query.gte('fecha', inicio).lte('fecha', fin)
      }

      const { data } = await query.order('fecha', { ascending: false }).limit(200)
      
      if (data) setViajes(data)
      setCargando(false)
    }
    cargarViajes()
  }, [filtroFecha])

  // --- EXPORTAR A EXCEL (CSV) ---
  const exportarACSV = () => {
    if (viajes.length === 0) {
      toast.error("No hay datos para exportar")
      return
    }

    const cabeceras = ['FECHA', 'SCOP', 'DEL', 'AL', 'N° PRECINTOS', 'ESTADO', 'OBSERVACIONES']
    
    const filas = viajes.map(v => {
      const fecha = new Date(v.fecha).toLocaleString().replace(',', '')
      return `${fecha};${v.scop};${v.del || ''};${v.al || ''};${v.n_precintos};${v.estado_viaje};${v.observaciones || ''}`
    })

    const contenidoCSV = [cabeceras.join(';'), ...filas].join('\n')
    
    const blob = new Blob(["\uFEFF" + contenidoCSV], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Reporte_Viajes_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success("Excel exportado correctamente")
  }

  // --- EXPORTAR A PDF ---
  const generarPDF = () => {
    if (viajes.length === 0) {
      toast.error("No hay datos para generar el PDF")
      return
    }

    const doc = new jsPDF('landscape', 'pt', 'a4')
    
    // Cabecera
    doc.setFontSize(18)
    doc.setTextColor(11, 95, 165)
    doc.text('PETROAMÉRICA', 40, 40)
    
    doc.setFontSize(12)
    doc.setTextColor(50, 50, 50)
    doc.text('Reporte de Viajes (SCOP)', 40, 60)
    
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    const fechaActual = new Date().toLocaleString('es-PE')
    doc.text(`Generado el: ${fechaActual} | Filtro: ${filtroFecha.replace('_', ' ').toUpperCase()}`, 40, 80)

    // Tabla
    const tableColumn = ["Fecha", "SCOP", "Del", "Al", "N° Precintos", "Estado", "Observaciones"]
    const tableRows = viajes.map(v => [
      new Date(v.fecha).toLocaleString('es-PE'),
      v.scop,
      v.del || '-',
      v.al || '-',
      v.n_precintos,
      v.estado_viaje,
      v.observaciones || '-'
    ])

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 100,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [11, 95, 165], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [243, 244, 246] },
      margin: { top: 100, left: 40, right: 40 },
      columnStyles: {
        6: { cellWidth: 180 } // Hacemos la columna de observaciones más ancha
      }
    })

    // Pie de página
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(`Página ${i} de ${pageCount} - Sistema de Precintos`, 40, doc.internal.pageSize.height - 20)
    }

    doc.save(`Reporte_Viajes_${new Date().toISOString().split('T')[0]}.pdf`)
    toast.success("Reporte PDF generado exitosamente")
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', fontFamily: 'Arial', padding: '20px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ color: '#0B5FA5', margin: 0 }}>Historial de Viajes (SCOP)</h2>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select 
            value={filtroFecha} 
            onChange={(e) => setFiltroFecha(e.target.value)}
            style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white', color: 'black', fontWeight: 'bold' }}
          >
            <option value="este_mes">Este Mes</option>
            <option value="mes_pasado">Mes Pasado</option>
            <option value="ultimos_30_dias">Últimos 30 días</option>
            <option value="este_ano">Este Año</option>
            <option value="todo">Histórico (Todo)</option>
          </select>

          <button onClick={exportarACSV} style={{ padding: '10px 20px', background: '#16A34A', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            📥 Excel
          </button>
          <button onClick={generarPDF} style={{ padding: '10px 20px', background: '#DC2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            📄 PDF
          </button>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        {cargando ? (
          <p style={{ padding: '20px', textAlign: 'center' }}>Cargando reporte...</p>
        ) : viajes.length === 0 ? (
          <p style={{ padding: '30px', textAlign: 'center', color: '#666' }}>No hay viajes registrados en este periodo.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '800px' }}>
              <thead style={{ backgroundColor: '#0B5FA5', color: 'white' }}>
                <tr style={{ textAlign: 'left' }}>
                  <th style={{ padding: '12px' }}>FECHA</th>
                  <th style={{ padding: '12px' }}>SCOP</th>
                  <th style={{ padding: '12px' }}>DEL</th>
                  <th style={{ padding: '12px' }}>AL</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>N° PRECINTOS</th>
                  <th style={{ padding: '12px' }}>ESTADO</th>
                  <th style={{ padding: '12px' }}>OBS</th>
                </tr>
              </thead>
              <tbody>
                {viajes.map((v) => (
                  <tr key={v.id_transaccion} style={{ borderBottom: '1px solid #eee', backgroundColor: v.estado_viaje === 'ANULADA' ? '#fef2f2' : 'white' }}>
                    <td style={{ padding: '10px' }}>{new Date(v.fecha).toLocaleString('es-PE')}</td>
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
          </div>
        )}
      </div>
    </div>
  )
}