import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { PageHeader, Card, Input, Tabla, Badge, Boton, Spinner } from './ui'

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

  // --- EXPORTAR A EXCEL (CSV) ---
  const exportarCSV = () => {
    if (eventosFiltrados.length === 0) {
      toast.error('No hay datos para exportar con los filtros actuales')
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

    toast.success('Archivo Excel exportado correctamente')
  }

  // --- EXPORTAR A PDF ---
  const generarPDF = () => {
    if (eventosFiltrados.length === 0) {
      toast.error('No hay datos para generar el PDF')
      return
    }

    const doc = new jsPDF('landscape', 'pt', 'a4')

    // Cabecera
    doc.setFontSize(18)
    doc.setTextColor(11, 95, 165)
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
    const tableColumn = ['Fecha / Hora', 'Usuario', 'Planta', 'Acción', 'Detalle']
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
        4: { cellWidth: 200 }
      }
    })

    // Pie de página
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(
        `Página ${i} de ${pageCount} - Auditoría Sistema de Precintos`,
        40,
        doc.internal.pageSize.height - 20
      )
    }

    doc.save(`Bitacora_Auditoria_${new Date().toISOString().slice(0, 10)}.pdf`)
    toast.success('Reporte PDF generado exitosamente')
  }

  if (cargando) return <Spinner />

  return (
    <div className="page-container">
      <PageHeader titulo="Bitácora de Auditoría">
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Boton variante="success" onClick={exportarCSV}>
            📥 Exportar a Excel
          </Boton>
          <Boton variante="danger" onClick={generarPDF}>
            📄 Descargar PDF
          </Boton>
        </div>
      </PageHeader>

      <Card>
        <Input
          label="Buscar eventos"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Buscar por acción, detalle o correo del usuario..."
        />
      </Card>

      <Tabla
        columnas={['Fecha / Hora', 'Usuario', 'Planta', 'Acción', 'Detalle']}
        hayDatos={eventosFiltrados.length > 0}
        vacio="No se encontraron eventos."
      >
        {eventosFiltrados.map((e) => (
          <tr key={e.id_evento}>
            <td style={{ color: 'var(--text-light)', whiteSpace: 'nowrap' }}>
              {new Date(e.fecha).toLocaleString('es-PE')}
            </td>
            <td style={{ fontWeight: 'bold' }}>
              {e.usuarios?.email || 'Sistema'}
            </td>
            <td>{e.plantas?.nombre || 'Global'}</td>
            <td>
              <Badge variante="info">{e.accion}</Badge>
            </td>
            <td>{e.detalles?.mensaje || JSON.stringify(e.detalles)}</td>
          </tr>
        ))}
      </Tabla>
    </div>
  )
}