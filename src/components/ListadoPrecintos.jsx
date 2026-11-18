import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { PageHeader, Card, Input, Select, Boton, Tabla, Badge, Spinner } from './ui'

export default function ListadoPrecintos() {
  const [precintos, setPrecintos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [pagina, setPagina] = useState(0)
  const [totalRegistros, setTotalRegistros] = useState(0)
  const itemsPorPagina = 20

  useEffect(() => {
    async function cargarPrecintos() {
      setCargando(true)

      let query = supabase
        .from('precintos')
        .select(`
          id_precinto, correlativo, estado, color, valor_sin_igv, fecha_recepcion, plantas ( nombre )
        `, { count: 'exact' })

      if (filtroTexto) query = query.ilike('correlativo', `%${filtroTexto}%`)
      if (filtroEstado) query = query.eq('estado', filtroEstado)

      const from = pagina * itemsPorPagina
      const to = from + itemsPorPagina - 1

      query = query.order('fecha_recepcion', { ascending: false }).range(from, to)

      const { data, error, count } = await query

      if (!error && data) {
        setPrecintos(data)
        setTotalRegistros(count || 0)
      }
      setCargando(false)
    }

    cargarPrecintos()
  }, [pagina, filtroTexto, filtroEstado])

  const totalPaginas = Math.ceil(totalRegistros / itemsPorPagina)

  const limpiarFiltros = () => {
    setFiltroTexto('')
    setFiltroEstado('')
    setPagina(0)
  }

  // --- EXPORTAR A EXCEL (CSV) ---
  const exportarCSV = async () => {
    setCargando(true)
    let query = supabase.from('precintos').select(`correlativo, estado, color, valor_sin_igv, fecha_recepcion, plantas(nombre)`)
    if (filtroTexto) query = query.ilike('correlativo', `%${filtroTexto}%`)
    if (filtroEstado) query = query.eq('estado', filtroEstado)

    const { data } = await query.order('fecha_recepcion', { ascending: false })

    if (!data || data.length === 0) {
      toast.error('No hay datos para exportar con los filtros actuales')
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

    toast.success('Archivo Excel exportado correctamente')
    setCargando(false)
  }

  // --- EXPORTAR A PDF ---
  const generarPDF = async () => {
    setCargando(true)

    let query = supabase.from('precintos').select(`correlativo, estado, color, valor_sin_igv, fecha_recepcion, plantas(nombre)`)
    if (filtroTexto) query = query.ilike('correlativo', `%${filtroTexto}%`)
    if (filtroEstado) query = query.eq('estado', filtroEstado)

    const { data } = await query.order('fecha_recepcion', { ascending: false })

    if (!data || data.length === 0) {
      toast.error('No hay datos para generar el PDF')
      setCargando(false)
      return
    }

    const doc = new jsPDF('landscape', 'pt', 'a4')

    // Cabecera
    doc.setFontSize(18)
    doc.setTextColor(11, 95, 165)
    doc.text('PETROAMÉRICA', 40, 40)

    doc.setFontSize(12)
    doc.setTextColor(50, 50, 50)
    doc.text('Reporte de Inventario de Precintos', 40, 60)

    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    const fechaActual = new Date().toLocaleString('es-PE')
    let filtrosAplicados = `Generado el: ${fechaActual}`
    if (filtroTexto) filtrosAplicados += ` | Filtro Correlativo: "${filtroTexto}"`
    if (filtroEstado) filtrosAplicados += ` | Estado: ${filtroEstado}`
    doc.text(filtrosAplicados, 40, 80)

    // Tabla
    const tableColumn = ['Correlativo', 'Planta', 'Color', 'Valor (S/)', 'Estado', 'Fecha Recepción']
    const tableRows = data.map(p => [
      p.correlativo,
      p.plantas?.nombre || 'Sin Planta',
      p.color || '-',
      `S/ ${p.valor_sin_igv?.toFixed(2) || '0.00'}`,
      p.estado,
      new Date(p.fecha_recepcion).toLocaleDateString('es-PE')
    ])

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 100,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [11, 95, 165], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [243, 244, 246] },
      margin: { top: 100, left: 40, right: 40 }
    })

    // Pie de página
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(
        `Página ${i} de ${pageCount} - Sistema de Precintos`,
        40,
        doc.internal.pageSize.height - 20
      )
    }

    doc.save(`Reporte_Precintos_${new Date().toISOString().slice(0, 10)}.pdf`)
    toast.success('Reporte PDF generado exitosamente')
    setCargando(false)
  }

  // Colores para badges según estado
  const varianteEstado = (estado) => {
    switch (estado) {
      case 'DISPONIBLE': return 'success'
      case 'ASIGNADO': return 'info'
      case 'DEVUELTO': return 'warning'
      case 'EN_MAL_ESTADO': return 'warning'
      case 'ROTO_EN_USO': return 'danger'
      case 'BAJA': return 'secondary'
      default: return 'secondary'
    }
  }

  return (
    <div className="page-container" style={{ maxWidth: '1100px' }}>
      <PageHeader titulo="Inventario de Precintos">
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Boton variante="success" onClick={exportarCSV} disabled={cargando}>
            📥 Exportar a Excel
          </Boton>
          <Boton variante="danger" onClick={generarPDF} disabled={cargando}>
            📄 Descargar PDF
          </Boton>
        </div>
      </PageHeader>

      {/* FILTROS */}
      <Card>
        <div className="form-row">
          <Input
            label="Buscar por correlativo"
            value={filtroTexto}
            onChange={(e) => { setFiltroTexto(e.target.value); setPagina(0) }}
            placeholder="Ej. CAL-100"
          />
          <Select
            label="Estado"
            value={filtroEstado}
            onChange={(e) => { setFiltroEstado(e.target.value); setPagina(0) }}
            placeholder="Todos los estados"
            options={[
              { value: 'DISPONIBLE', label: 'Disponible' },
              { value: 'ASIGNADO', label: 'Asignado' },
              { value: 'DEVUELTO', label: 'Devuelto' },
              { value: 'EN_MAL_ESTADO', label: 'En Mal Estado' },
              { value: 'ROTO_EN_USO', label: 'Roto en Uso' },
              { value: 'BAJA', label: 'Baja' }
            ]}
          />
          <div className="form-group" style={{ justifyContent: 'flex-end' }}>
            <Boton variante="secondary" onClick={limpiarFiltros}>
              Limpiar
            </Boton>
          </div>
        </div>
      </Card>

      {/* TABLA */}
      {cargando ? (
        <Spinner />
      ) : (
        <>
          <Tabla
            columnas={['Correlativo', 'Planta', 'Color', 'Valor (S/)', 'Estado', 'Fecha']}
            hayDatos={precintos.length > 0}
            vacio="No se encontraron precintos con estos filtros."
          >
            {precintos.map((p) => (
              <tr key={p.id_precinto}>
                <td style={{ fontWeight: 'bold' }}>{p.correlativo}</td>
                <td>{p.plantas?.nombre || 'Sin Planta'}</td>
                <td>
                  <Badge variante="secondary">{p.color || '-'}</Badge>
                </td>
                <td>S/ {p.valor_sin_igv?.toFixed(2) || '0.00'}</td>
                <td>
                  <Badge variante={varianteEstado(p.estado)}>{p.estado}</Badge>
                </td>
                <td style={{ color: 'var(--text-light)' }}>
                  {new Date(p.fecha_recepcion).toLocaleDateString('es-PE')}
                </td>
              </tr>
            ))}
          </Tabla>

          {/* PAGINACIÓN */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            marginTop: '20px'
          }}>
            <span style={{ color: 'var(--text-light)', fontSize: '14px' }}>
              Mostrando <strong>{precintos.length}</strong> de <strong>{totalRegistros}</strong> registros totales
            </span>

            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <Boton
                variante="secondary"
                tamano="sm"
                onClick={() => setPagina(p => Math.max(0, p - 1))}
                disabled={pagina === 0 || cargando}
              >
                Anterior
              </Boton>

              <span style={{
                padding: '6px 12px',
                backgroundColor: 'var(--primary-blue)',
                color: 'var(--white)',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '12px',
                whiteSpace: 'nowrap'
              }}>
                Página {pagina + 1} de {totalPaginas || 1}
              </span>

              <Boton
                variante="secondary"
                tamano="sm"
                onClick={() => setPagina(p => Math.min(totalPaginas - 1, p + 1))}
                disabled={pagina >= totalPaginas - 1 || cargando}
              >
                Siguiente
              </Boton>
            </div>
          </div>
        </>
      )}
    </div>
  )
}