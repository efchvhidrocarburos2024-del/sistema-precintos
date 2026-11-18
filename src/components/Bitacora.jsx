import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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

  // Filtro local
  const eventosFiltrados = eventos.filter(e => {
    const mensajeDetalle = e.detalles?.mensaje || ''
    return (
      e.accion.toLowerCase().includes(filtro.toLowerCase()) || 
      mensajeDetalle.toLowerCase().includes(filtro.toLowerCase()) ||
      (e.usuarios?.email || '').toLowerCase().includes(filtro.toLowerCase())
    )
  })

  // --- EXPORTAR A EXCEL ---
  const exportarCSV = () => {
    if (eventosFiltrados.length === 0) {
      toast.error("No hay datos para exportar con los filtros actuales")
      return
    }

    const headers = ['Fecha y Hora', 'Usuario', 'Planta', 'Acción', 'Detalle']
    const rows = eventosFiltrados.map(e => [
      new Date(e.fecha).toLocaleString('es-PE'),
      e.usuarios?.email || 'Sistema',
      e.plantas?.nombre || 'Global',
      e.accion,
      e.detalles?.mensaje || JSON.stringify(e.detalles)
    ])

    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Bitacora_Auditoria_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    toast.success("Archivo Excel exportado correctamente")
  }

  // --- EXPORTAR A PDF ---
  const generarPDF = () => {
    if (eventosFiltrados.length === 0) {
      toast.error("No hay datos para generar el PDF")
      return
    }

    const doc = new jsPDF('landscape', 'pt', 'a4')
    
    // Cabecera
    doc.setFontSize(18)
    doc.setTextColor(11, 95, 165) // Azul Petroamérica
    doc.text('PETROAMÉRICA', 40, 40)
    
    doc.setFontSize(12)
    doc.setTextColor(50, 50, 50)
    doc.text('Reporte de Bitácora de Auditoría', 40, 60)
    
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    const fechaActual = new Date().toLocaleString('es-PE')
    let filtrosAplicados = `Generado el: ${fechaActual}`
    if (filtro) filtrosAplicados += ` | Filtro: "${filtro}"`
    doc.text(filtrosAplicados, 40, 80)

    // Tabla
    const tableColumn = ["Fecha / Hora", "Usuario", "Planta", "Acción", "Detalle"]
    const tableRows = eventosFiltrados.map(e => [
      new Date(e.fecha).toLocaleString('es-PE'),
      e.usuarios?.email || 'Sistema',
      e.plantas?.nombre || 'Global',
      e.accion,
      e.detalles?.mensaje || '-'
    ])

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 100,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [11, 95, 165], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [243, 244, 246] },
      margin: { top: 100, left: 40, right: 40 },
      columnStyles: {
        4: { cellWidth: 200 } // Hacemos la columna de Detalle más ancha
      }
    })

    // Pie de página
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(`Página ${i} de ${pageCount} - Auditoría Sistema de Precintos`, 40, doc.internal.pageSize.height - 20)
    }

    doc.save(`Bitacora_Auditoria_${new Date().toISOString().slice(0, 10)}.pdf`)
    toast.success("Reporte PDF generado exitosamente")
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '20px auto', fontFamily: 'Arial', padding: '20px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ color: '#0B5FA5', margin: 0 }}>Bitácora de Auditoría</h2>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={exportarCSV} style={{ padding: '10px 20px', background: '#16A34A', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            📥 Exportar a Excel
          </button>
          <button onClick={generarPDF} style={{ padding: '10px 20px', background: '#DC2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            📄 Descargar PDF
          </button>
        </div>
      </div>
      
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