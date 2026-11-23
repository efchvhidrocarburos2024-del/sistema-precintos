// src/components/precios/VisualizadorPrecios.jsx
import { useState } from 'react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Card, Boton } from '../ui'
import toast from 'react-hot-toast'

const normalizarTexto = (txt) => String(txt || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ').replace(/N°/gi, 'N').trim().toUpperCase()
const esPlantaValida = (nombre) => {
  const n = normalizarTexto(nombre)
  if (!n || n.length < 3 || n.includes('*') || !isNaN(Number(n))) return false
  if (n.match(/\d{4}-\d{2}-\d{2}/) || n.match(/\d{2}\/\d{2}\/\d{4}/)) return false
  if (n.includes('TOTAL') || n.includes('IGV') || n.includes('ISC') || n.includes('RODAJE') || n.includes('INCREMENTO') || n.includes('INCLUSION') || n.includes('DISMINUCION') || n.includes('SISE') || n.includes('INGRESO')) return false
  return true
}

export default function VisualizadorPrecios({ archivos, archivosTopes, puedeGestionar, onMarcarVigente, onEliminar, onIrComparar, onVolver }) {
  const [subVista, setSubVista] = useState('precios')
  const [modalEliminarAbierto, setModalEliminarAbierto] = useState(false)
  const [archivoAEliminar, setArchivoAEliminar] = useState(null)
  const [eliminando, setEliminando] = useState(false)

  const verComoPDF = async (file) => {
    const toastId = toast.loading('Generando PDF...')
    try {
      const res = await fetch(file.url_archivo)
      const wb = XLSX.read(await res.arrayBuffer(), { type: 'array' })
      const doc = new jsPDF('landscape')
      let hayTabla = false

      wb.SheetNames.forEach((sheetName) => {
        const filas = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' })
        const headerIndex = filas.findIndex(row => row.some(cell => normalizarTexto(cell).includes('PLANTA')))
        if (headerIndex === -1) return

        const headerRow = filas[headerIndex]
        const idxPlanta = headerRow.findIndex(c => normalizarTexto(c).includes('PLANTA'))
        const idxCodigo = headerRow.findIndex(c => normalizarTexto(c).includes('CODIGO'))
        const colInicio = Math.max(0, idxCodigo !== -1 ? idxCodigo : idxPlanta)
        let colFin = -1
        headerRow.forEach((c, i) => { if (String(c).trim() !== '') colFin = i })
        if (colFin < colInicio) return

        const cuerpo = filas.slice(headerIndex + 1).filter(row => esPlantaValida(row[idxPlanta])).map(row => row.slice(colInicio, colFin + 1))
        if (cuerpo.length === 0) return

        if (hayTabla) doc.addPage()
        hayTabla = true
        doc.setFontSize(14); doc.setTextColor(11, 95, 165)
        doc.text(`Archivo: ${file.nombre_archivo}`, 14, 15)
        doc.setFontSize(10); doc.setTextColor(100, 100, 100)
        doc.text(`Hoja: ${sheetName}`, 14, 22)
        autoTable(doc, {
          head: [headerRow.slice(colInicio, colFin + 1).map(c => String(c).trim())],
          body: cuerpo.map(row => row.map(v => typeof v === 'number' ? (Number.isInteger(v) ? String(v) : String(Number(v.toFixed(4)))) : String(v).trim())),
          startY: 28, styles: { fontSize: 7 }, headStyles: { fillColor: [11, 95, 165] }
        })
      })

      if (!hayTabla) { toast.error('No se encontró ninguna tabla', { id: toastId }); return }
      window.open(doc.output('bloburl'), '_blank')
      toast.success('PDF generado', { id: toastId })
    } catch (error) {
      toast.error('Error al generar PDF', { id: toastId })
    }
  }

  // Ambas pestañas usan el azul corporativo de los módulos
  const btnTabStyle = (activo) => ({
    padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px',
    backgroundColor: activo ? 'var(--primary-blue)' : '#f3f4f6', color: activo ? 'white' : '#4b5563', transition: 'all 0.2s',
    boxShadow: activo ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
  })

  const thStyle = { padding: '15px', color: 'white' }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
      <header style={{ padding: '20px 40px', display: 'flex', alignItems: 'center', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <button onClick={onVolver} style={{ background: '#f3f4f6', border: '1px solid #d1d5db', color: '#374151', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>← Volver al Menú</button>
        <h1 style={{ margin: '0 0 0 15px', color: 'var(--primary-blue)', fontSize: '28px', fontWeight: '900' }}>Visualizar Listas & Topes</h1>
      </header>

      <main style={{ padding: '40px 20px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button style={btnTabStyle(subVista === 'precios')} onClick={() => setSubVista('precios')}>📄 Listas de Precios</button>
            <button style={btnTabStyle(subVista === 'topes')} onClick={() => setSubVista('topes')}>📊 Topes</button>
          </div>
          <Boton variante="outline" onClick={() => onIrComparar(subVista)} style={{ color: 'var(--primary-blue)' }}>⚖️ Comparar {subVista === 'precios' ? 'Precios' : 'Topes'}</Boton>
        </div>

        <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#6b7280' }}>
          📅 La columna <strong>FECHA DE SUBIDA</strong> indica la fecha en que el documento se cargó al sistema (no la fecha interna de la lista).
        </p>

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: 'var(--primary-blue)', textAlign: 'left' }}>
              <tr>
                <th style={thStyle}>FECHA DE SUBIDA</th>
                <th style={thStyle}>NOMBRE</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>ESTADO</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {(subVista === 'precios' ? archivos : archivosTopes).map(f => (
                <tr key={f.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '15px', color: '#374151' }}>{new Date(f.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '15px', fontWeight: 'bold', color: '#111827' }}>{subVista === 'precios' ? '📄' : '📊'} {f.nombre_archivo}</td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>{f.es_vigente ? <span style={{ color: '#166534', fontWeight: 'bold' }}>VIGENTE</span> : 'HISTÓRICO'}</td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <Boton variante="outline" tamano="sm" onClick={() => verComoPDF(f)} title="Ver como PDF">👁️</Boton>
                      {puedeGestionar && !f.es_vigente && <Boton variante="success" tamano="sm" onClick={() => onMarcarVigente(f.id, f.nombre_archivo, subVista)} title="Marcar como vigente">✅</Boton>}
                      {puedeGestionar && <Boton variante="danger" tamano="sm" onClick={() => { setArchivoAEliminar({ ...f, tipo: subVista }); setModalEliminarAbierto(true) }} title="Eliminar">🗑️</Boton>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </main>

      {modalEliminarAbierto && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '450px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <h3 style={{ color: 'var(--danger-red)', marginTop: 0 }}>⚠️ Confirmar Eliminación</h3>
            <p>¿Eliminar permanentemente <strong>{archivoAEliminar?.nombre_archivo}</strong>?</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <Boton variante="outline" onClick={() => setModalEliminarAbierto(false)} style={{ flex: 1 }} disabled={eliminando}>Cancelar</Boton>
              <Boton variante="danger" onClick={() => onEliminar(archivoAEliminar, () => setModalEliminarAbierto(false))} style={{ flex: 1 }} disabled={eliminando}>{eliminando ? 'Eliminando...' : 'Sí, Eliminar'}</Boton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}