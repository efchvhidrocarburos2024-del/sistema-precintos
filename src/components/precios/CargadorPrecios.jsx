import { useState } from 'react'
import * as XLSX from 'xlsx'
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

export default function CargadorPrecios({ puedeCargar, onVolver, onSubirExitoso }) {
  const [subVista, setSubVista] = useState('precios')
  const [archivoExcel, setArchivoExcel] = useState(null)
  const [subiendo, setSubiendo] = useState(false)
  const [hojasPreview, setHojasPreview] = useState([])
  const [hojaActiva, setHojaActiva] = useState(0)

  const [archivoExcelTope, setArchivoExcelTope] = useState(null)
  const [subiendoTope, setSubiendoTope] = useState(false)
  const [previewDataTope, setPreviewDataTope] = useState([])
  const [previewHeadersTope, setPreviewHeadersTope] = useState([])

  const handleFileChange = (e) => {
    const file = e.target.files[0]; if (!file) return
    setArchivoExcel(file)
    const reader = new FileReader()
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: 'binary' })
      const hojas = wb.SheetNames.map(sheetName => {
        const data = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' })
        const headerIndex = data.findIndex(row => row.some(cell => normalizarTexto(cell).includes('PLANTA')))
        if (headerIndex === -1) return null
        const headers = data[headerIndex]
        const idxPlanta = headers.findIndex(c => normalizarTexto(c).includes('PLANTA'))
        const idxCodigo = headers.findIndex(c => normalizarTexto(c).includes('CODIGO'))
        const colInicio = Math.max(0, idxCodigo !== -1 ? idxCodigo : idxPlanta)
        let colFin = -1
        headers.forEach((c, i) => { if (String(c).trim() !== '') colFin = i })
        if (colFin < colInicio) return null
        return {
          nombre: sheetName,
          headers: headers.slice(colInicio, colFin + 1),
          rows: data.slice(headerIndex + 1).filter(row => esPlantaValida(row[idxPlanta])).map(row => row.slice(colInicio, colFin + 1))
        }
      }).filter(h => h && h.rows.length > 0)
      setHojasPreview(hojas)
      setHojaActiva(0)
    }
    reader.readAsBinaryString(file)
  }

  const handleFileChangeTope = (e) => {
    const file = e.target.files[0]; if (!file) return
    setArchivoExcelTope(file)
    const reader = new FileReader()
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: 'binary' })
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' })
      let headerIndex = data.findIndex(row => row.some(c => normalizarTexto(c).includes('PLANTA')))
      if (headerIndex === -1) headerIndex = 0
      setPreviewHeadersTope(data[headerIndex])
      setPreviewDataTope(data.slice(headerIndex + 1).filter(row => row.some(cell => cell !== '')))
    }
    reader.readAsBinaryString(file)
  }

  const handleSubir = async (esTope) => {
    const file = esTope ? archivoExcelTope : archivoExcel
    if (!file) return
    esTope ? setSubiendoTope(true) : setSubiendo(true)
    try {
      await onSubirExitoso(file, esTope)
      if (esTope) { setArchivoExcelTope(null); setPreviewDataTope([]); setPreviewHeadersTope([]) }
      else { setArchivoExcel(null); setHojasPreview([]); setHojaActiva(0) }
    } finally {
      esTope ? setSubiendoTope(false) : setSubiendo(false)
    }
  }

  const btnTabStyle = (activo) => ({
    padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px',
    backgroundColor: activo ? 'var(--primary-blue)' : '#f3f4f6', color: activo ? 'white' : '#4b5563', transition: 'all 0.2s'
  })

  if (!puedeCargar) return <div style={{ padding: '50px', textAlign: 'center' }}><h2>No tienes permisos.</h2></div>

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
      <header style={{ padding: '20px 40px', display: 'flex', alignItems: 'center', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <button onClick={onVolver} style={{ background: '#f3f4f6', border: '1px solid #d1d5db', color: '#374151', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>← Volver al Menú</button>
        <h1 style={{ margin: '0 0 0 15px', color: 'var(--primary-blue)', fontSize: '28px', fontWeight: '900' }}>Cargar Nueva Lista & Topes</h1>
      </header>
      <main style={{ padding: '40px 20px', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button style={btnTabStyle(subVista === 'precios')} onClick={() => { setSubVista('precios'); setHojasPreview([]); setHojaActiva(0); setArchivoExcel(null) }}>📄 Cargar Precios</button>
          <button style={btnTabStyle(subVista === 'topes')} onClick={() => { setSubVista('topes'); setPreviewDataTope([]); setPreviewHeadersTope([]); setArchivoExcelTope(null) }}>📊 Cargar Topes</button>
        </div>
        <Card style={{ padding: '30px' }}>
          {subVista === 'precios' ? (
            <>
              <h2>Subir Lista de Precios</h2>
              <input type="file" accept=".xlsx" onChange={handleFileChange} style={{ marginTop: '15px' }} />
              {hojasPreview.length > 0 && (
                <div style={{ marginTop: '30px' }}>
                  <h3 style={{ color: 'var(--primary-blue)', marginBottom: '15px', fontSize: '18px' }}>📋 Vista Previa: {archivoExcel.name}</h3>
                  {hojasPreview.length > 1 && (
                    <div style={{ display: 'flex', gap: '5px', marginBottom: '15px', flexWrap: 'wrap' }}>
                      {hojasPreview.map((hoja, i) => (
                        <button key={i} onClick={() => setHojaActiva(i)} style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', backgroundColor: hojaActiva === i ? 'var(--primary-blue)' : '#f3f4f6', color: hojaActiva === i ? 'white' : '#4b5563' }}>{hoja.nombre}</button>
                      ))}
                    </div>
                  )}
                  {hojasPreview[hojaActiva].rows.length > 0 ? (
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '20px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', tableLayout: 'fixed' }}>
                        <thead style={{ backgroundColor: 'var(--primary-blue)', color: 'white' }}>
                          <tr>
                            {hojasPreview[hojaActiva].headers.map((h, i) => {
                              const hn = normalizarTexto(h)
                              return <th key={i} style={{ padding: '6px 3px', textAlign: hn.includes('CODIGO') || hn.includes('PLANTA') ? 'left' : 'center', whiteSpace: 'normal', wordBreak: 'break-word', fontSize: '9px', lineHeight: '1.2', borderBottom: '2px solid #1e293b' }}>{String(h).trim()}</th>
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {hojasPreview[hojaActiva].rows.slice(0, 20).map((row, rI) => (
                            <tr key={rI} style={{ backgroundColor: rI % 2 === 0 ? 'white' : '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                              {row.map((cell, cI) => <td key={cI} style={{ padding: '5px 3px', color: '#374151', textAlign: cI <= 1 ? 'left' : 'center', whiteSpace: 'normal', wordBreak: 'break-word' }}>{typeof cell === 'number' ? (Number.isInteger(cell) ? cell : cell.toFixed(4)) : String(cell).trim()}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280', backgroundColor: '#f9fafb', borderRadius: '8px', marginBottom: '20px' }}>No hay datos de plantas válidos.</div>}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Boton variante="success" onClick={() => handleSubir(false)} disabled={subiendo}>{subiendo ? '⏳ Subiendo...' : '✅ Confirmar y Subir'}</Boton>
                    <Boton variante="outline" onClick={() => { setArchivoExcel(null); setHojasPreview([]); setHojaActiva(0) }}>❌ Cancelar</Boton>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <h2>Subir Archivo de Topes</h2>
              <input type="file" accept=".xlsx" onChange={handleFileChangeTope} style={{ marginTop: '15px' }} />
              {previewDataTope.length > 0 && (
                <div style={{ marginTop: '30px' }}>
                  <h3 style={{ color: '#059669', marginBottom: '15px', fontSize: '18px' }}>📋 Vista Previa: {archivoExcelTope.name}</h3>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '20px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead style={{ backgroundColor: '#059669', color: 'white' }}>
                        <tr>{previewHeadersTope.map((h, i) => <th key={i} style={{ padding: '10px 8px', textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '2px solid #059669' }}>{String(h).trim()}</th>)}</tr>
                      </thead>
                      <tbody>
                        {previewDataTope.slice(0, 20).map((row, rI) => (
                          <tr key={rI} style={{ backgroundColor: rI % 2 === 0 ? 'white' : '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                            {row.map((cell, cI) => <td key={cI} style={{ padding: '8px', color: '#374151' }}>{typeof cell === 'number' ? (Number.isInteger(cell) ? cell : cell.toFixed(4)) : String(cell).trim()}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Boton variante="success" onClick={() => handleSubir(true)} disabled={subiendoTope}>{subiendoTope ? '⏳ Subiendo...' : '✅ Confirmar y Subir'}</Boton>
                    <Boton variante="outline" onClick={() => { setArchivoExcelTope(null); setPreviewDataTope([]); setPreviewHeadersTope([]) }}>❌ Cancelar</Boton>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </main>
    </div>
  )
}