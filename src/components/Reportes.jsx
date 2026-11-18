import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { PageHeader, Card, Select, Boton, Spinner } from './ui'

export default function Reportes() {
  const [viajes, setViajes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtroFecha, setFiltroFecha] = useState('este_mes')

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
        6: { cellWidth: 180 }
      }
    })

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
    <div className="page-container" style={{ maxWidth: '1100px' }}>
      <PageHeader titulo="Historial de Viajes (SCOP)" />

      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: '10px',
        flexWrap: 'wrap',
        marginBottom: '20px'
      }}>
        <Select
          value={filtroFecha}
          onChange={(e) => setFiltroFecha(e.target.value)}
          label={null}
          placeholder={null}
          aria-label="Filtro de fecha"
          options={[
            { value: 'este_mes', label: 'Este Mes' },
            { value: 'mes_pasado', label: 'Mes Pasado' },
            { value: 'ultimos_30_dias', label: 'Últimos 30 días' },
            { value: 'este_ano', label: 'Este Año' },
            { value: 'todo', label: 'Histórico (Todo)' }
          ]}
        />
        <Boton variante="success" onClick={exportarACSV}>📥 Excel</Boton>
        <Boton variante="danger" onClick={generarPDF}>📄 PDF</Boton>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {cargando ? (
          <Spinner />
        ) : viajes.length === 0 ? (
          <p style={{ padding: '30px', textAlign: 'center', color: 'var(--text-light)' }}>
            No hay viajes registrados en este periodo.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '800px' }}>
              <thead style={{ backgroundColor: 'var(--primary-blue)', color: 'white' }}>
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
                  <tr key={v.id_transaccion} style={{
                    borderBottom: '1px solid #eee',
                    backgroundColor: v.estado_viaje === 'ANULADA' ? '#fef2f2' : 'white'
                  }}>
                    <td style={{ padding: '10px' }}>{new Date(v.fecha).toLocaleString('es-PE')}</td>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{v.scop}</td>
                    <td style={{ padding: '10px' }}>{v.del}</td>
                    <td style={{ padding: '10px' }}>{v.al}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>{v.n_precintos}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        backgroundColor: v.estado_viaje === 'ANULADA' ? '#FEE2E2' : '#DCFCE7',
                        color: v.estado_viaje === 'ANULADA' ? '#991B1B' : '#166534'
                      }}>
                        {v.estado_viaje}
                      </span>
                    </td>
                    <td style={{ padding: '10px', color: 'var(--text-light)' }}>{v.observaciones || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}