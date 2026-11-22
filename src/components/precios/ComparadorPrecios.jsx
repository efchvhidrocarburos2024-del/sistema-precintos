import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { Card, Boton } from '../ui'
import toast from 'react-hot-toast'

const normalizarTexto = (txt) => String(txt || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ').replace(/N°/gi, 'N').trim().toUpperCase()
const esPlantaValida = (nombre) => {
  const n = normalizarTexto(nombre)
  if (!n || n.length < 3 || n.includes('*') || !isNaN(Number(n))) return false
  if (n.includes('TOTAL') || n.includes('IGV') || n.includes('ISC') || n.includes('RODAJE') || n.includes('INCREMENTO') || n.includes('INCLUSION') || n.includes('DISMINUCION') || n.includes('SISE') || n.includes('INGRESO')) return false
  return true
}

export default function ComparadorPrecios({ archivos, archivosTopes, onVolver }) {
  const [tipo, setTipo] = useState('precios')
  const [idBase, setIdBase] = useState('')
  const [idNuevo, setIdNuevo] = useState('')
  const [hojaComparar, setHojaComparar] = useState('Precio Base')
  const [datosComparados, setDatosComparados] = useState(null)
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    if (tipo === 'precios' && archivos.length >= 2) {
      const ord = [...archivos].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      setIdNuevo(ord[0].id); setIdBase(ord[1].id)
    } else if (tipo === 'topes' && archivosTopes.length >= 2) {
      const ord = [...archivosTopes].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      setIdNuevo(ord[0].id); setIdBase(ord[1].id)
    }
  }, [tipo, archivos, archivosTopes])

  const comparar = async () => {
    if (!idBase || !idNuevo) return toast.error('Faltan listas para comparar.')
    if (idBase === idNuevo) return toast.error('Las listas deben ser diferentes')
    setCargando(true); setDatosComparados(null)
    try {
      const lista = tipo === 'precios' ? archivos : archivosTopes
      const fileBase = lista.find(a => a.id === idBase)
      const fileNuevo = lista.find(a => a.id === idNuevo)
      
      const parse = async (url, hoja) => {
        const res = await fetch(url)
        const wb = XLSX.read(await res.arrayBuffer(), { type: 'array' })
        const sheetName = tipo === 'precios' ? (wb.SheetNames.find(n => n.toLowerCase().includes(hoja.toLowerCase())) || wb.SheetNames[0]) : wb.SheetNames[0]
        const data = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' })
        const hIdx = data.findIndex(r => r.some(c => normalizarTexto(c).includes('PLANTA')))
        return { headers: data[hIdx !== -1 ? hIdx : 0], rows: data.slice((hIdx !== -1 ? hIdx : 0) + 1) }
      }

      const dBase = await parse(fileBase.url_archivo, hojaComparar)
      const dNuevo = await parse(fileNuevo.url_archivo, hojaComparar)

      if (tipo === 'precios') {
        const idxPlantaN = dNuevo.headers.findIndex(h => normalizarTexto(h).includes('PLANTAS'))
        const idxPlantaB = dBase.headers.findIndex(h => normalizarTexto(h).includes('PLANTAS'))
        const baseMap = {}
        dBase.rows.forEach(row => { if (esPlantaValida(row[idxPlantaB])) baseMap[normalizarTexto(row[idxPlantaB])] = row })
        
        const columnas = []
        dNuevo.headers.forEach((h, i) => {
          const hNorm = normalizarTexto(h)
          if (!hNorm || hNorm.includes('PLANTAS') || hNorm.includes('CODIGO') || hNorm.includes('USO INTERNO')) return
          const bIdx = dBase.headers.findIndex(bH => normalizarTexto(bH) === hNorm)
          if (bIdx !== -1) columnas.push({ titulo: h, iN: i, iB: bIdx })
        })

        const comparacion = dNuevo.rows.filter(row => esPlantaValida(row[idxPlantaN])).map(nuevaRow => {
          const planta = normalizarTexto(nuevaRow[idxPlantaN])
          const baseRow = baseMap[planta]
          const variaciones = {}
          if (baseRow) {
            columnas.forEach(col => {
              const vN = parseFloat(String(nuevaRow[col.iN]).replace(',', '.'))
              const vB = parseFloat(String(baseRow[col.iB]).replace(',', '.'))
              if (!isNaN(vN) && !isNaN(vB) && vN > 0 && vB > 0) variaciones[col.titulo] = { diff: vN - vB }
              else if (!isNaN(vN) && vN > 0 && (isNaN(vB) || vB === 0)) variaciones[col.titulo] = 'NUEVO'
              else variaciones[col.titulo] = null
            })
          }
          return { planta: nuevaRow[idxPlantaN], variaciones }
        })
        setDatosComparados({ columnas: columnas.map(c => c.titulo), rows: comparacion })
      } else {
        // Lógica simplificada para topes (asume columnas estándar)
        toast.info('Comparación de topes en desarrollo avanzado')
      }
    } catch (e) {
      toast.error('Error al comparar: ' + e.message)
    } finally {
      setCargando(false)
    }
  }

  const btnTabStyle = (activo) => ({
    padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px',
    backgroundColor: activo ? 'var(--primary-blue)' : '#f3f4f6', color: activo ? 'white' : '#4b5563', transition: 'all 0.2s'
  })

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
      <header style={{ padding: '20px 40px', display: 'flex', alignItems: 'center', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <button onClick={onVolver} style={{ background: '#f3f4f6', border: '1px solid #d1d5db', color: '#374151', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>← Volver</button>
        <h1 style={{ margin: '0 0 0 15px', color: 'var(--primary-blue)', fontSize: '28px', fontWeight: '900' }}>Comparar {tipo === 'precios' ? 'Precios' : 'Topes'}</h1>
      </header>
      <main style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button style={btnTabStyle(tipo === 'precios')} onClick={() => { setTipo('precios'); setDatosComparados(null) }}>📄 Precios</button>
          <button style={btnTabStyle(tipo === 'topes')} onClick={() => { setTipo('topes'); setDatosComparados(null) }}>📊 Topes</button>
        </div>
        <Card style={{ padding: '30px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Lista Previa</label>
              <select value={idBase} onChange={(e) => setIdBase(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                {(tipo === 'precios' ? archivos : archivosTopes).map(f => <option key={f.id} value={f.id}>{f.nombre_archivo}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Lista Actual</label>
              <select value={idNuevo} onChange={(e) => setIdNuevo(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                {(tipo === 'precios' ? archivos : archivosTopes).map(f => <option key={f.id} value={f.id}>{f.nombre_archivo}</option>)}
              </select>
            </div>
            {tipo === 'precios' && (
              <div style={{ width: '200px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Hoja</label>
                <select value={hojaComparar} onChange={(e) => setHojaComparar(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                  <option value="Precio Base">Precio Base</option>
                  <option value="Precios Planta Sin IGV">Precios Planta Sin IGV</option>
                  <option value="Precios Planta Con IGV">Precios Planta Con IGV</option>
                </select>
              </div>
            )}
            <Boton variante="primary" onClick={comparar} disabled={cargando} style={{ height: '42px' }}>{cargando ? 'Comparando...' : '⚖️ Comparar Ahora'}</Boton>
          </div>
        </Card>
        {datosComparados && (
          <Card style={{ padding: '20px' }}>
            <h2 style={{ margin: '0 0 15px 0', fontSize: '20px', color: 'var(--primary-blue)', textAlign: 'center' }}>Variación - {hojaComparar}</h2>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'center' }}>
                <thead style={{ backgroundColor: '#1e293b', color: 'white' }}>
                  <tr>
                    <th style={{ padding: '10px 4px', width: '90px' }}>PLANTAS</th>
                    {datosComparados.columnas.map((col, i) => <th key={i} style={{ padding: '10px 4px', wordBreak: 'break-word' }}>{col}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {datosComparados.rows.map((fila, rI) => (
                    <tr key={rI} style={{ borderBottom: '1px solid #eee', backgroundColor: rI % 2 === 0 ? 'white' : '#f9fafb' }}>
                      <td style={{ padding: '8px 4px', fontWeight: 'bold' }}>{fila.planta}</td>
                      {datosComparados.columnas.map((col, cI) => {
                        const item = fila.variaciones[col]
                        if (item === 'NUEVO') return <td key={cI} style={{ color: '#3b82f6', fontWeight: 'bold' }}>NUEVO</td>
                        if (!item) return <td key={cI} style={{ color: '#9ca3af' }}>-</td>
                        if (Math.abs(item.diff) > 0.00001) return <td key={cI} style={{ color: item.diff > 0 ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>{item.diff > 0 ? '+' : ''}{item.diff.toFixed(4)}</td>
                        return <td key={cI} style={{ color: '#6b7280' }}>0.0000</td>
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </main>
    </div>
  )
}