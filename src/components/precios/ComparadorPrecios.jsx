// src/components/precios/ComparadorPrecios.jsx
import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { Card, Boton } from '../ui'
import toast from 'react-hot-toast'

// ============================================================
// UTILIDADES
// ============================================================
const normalizarTexto = (txt) => String(txt || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').replace(/N°/gi, 'N').trim().toUpperCase()

const esPlantaValida = (nombre) => {
  const n = normalizarTexto(nombre)
  if (!n || n.length < 3 || n.includes('*') || !isNaN(Number(n))) return false
  if (n.match(/\d{4}-\d{2}-\d{2}/) || n.match(/\d{2}\/\d{2}\/\d{4}/)) return false
  if (n.includes('TOTAL') || n.includes('IGV') || n.includes('ISC') || n.includes('RODAJE') || n.includes('INCREMENTO') || n.includes('INCLUSION') || n.includes('DISMINUCION') || n.includes('SISE') || n.includes('INGRESO')) return false
  return true
}

// Detecta la fecha en el nombre: YYYY-MM-DD, DD-MM-YYYY (y con _ o . como separador)
const extraerFecha = (nombre) => {
  if (!nombre) return null
  const m = String(nombre).match(/(\d{4})[-_.](\d{2})[-_.](\d{2})|(\d{2})[-_.](\d{2})[-_.](\d{4})/)
  if (!m) return null
  const y = m[1] || m[6]
  const mo = m[2] || m[5]
  const d = m[3] || m[4]
  if (+mo < 1 || +mo > 12 || +d < 1 || +d > 31 || +y < 1900 || +y > 2099) return null
  return `${y}-${mo}-${d}`
}

// Clave de orden: fecha del nombre; si no tiene, fecha de subida
const fechaClave = (f) => extraerFecha(f?.nombre_archivo) || (f?.created_at ? String(f.created_at).slice(0, 10) : '1900-01-01')

const ordenarPorFecha = (lista) => [...(lista || [])].sort((a, b) => {
  const fa = fechaClave(a)
  const fb = fechaClave(b)
  if (fa !== fb) return fb.localeCompare(fa) // más reciente primero
  return new Date(b.created_at || 0) - new Date(a.created_at || 0) // desempate: subida más reciente
})

const fmtDMY = (iso) => {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const num = (v) => parseFloat(String(v).replace(',', '.'))

const celdaExcel = (it) => {
  if (it === 'NUEVO') return 'NUEVO'
  if (!it) return ''
  return Math.abs(it.diff) > 0.00001 ? Number(it.diff.toFixed(4)) : 0
}

const AZUL = 'var(--primary-blue, #0B5FA5)'
const VERDE = '#059669'
const selectStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #334155', fontSize: '13px', backgroundColor: '#1e293b', color: '#fff', fontWeight: 'bold', boxSizing: 'border-box' }
const labelStyle = { display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px', color: 'var(--text-dark, #111827)' }

// Campo fijo de solo lectura (las listas NO se seleccionan manualmente)
const campoFijoStyle = {
  width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155',
  fontSize: '13px', backgroundColor: '#1e293b', color: '#fff', fontWeight: 'bold',
  boxSizing: 'border-box', minHeight: '42px', display: 'flex', alignItems: 'center', gap: '8px',
  lineHeight: 1.3, wordBreak: 'break-word', cursor: 'default',
}

// ============================================================
// CELDA DE VARIACIÓN (rojo sube / verde baja / azul nuevo)
// ============================================================
function CeldaDiff({ it, dec = 4 }) {
  if (it === 'NUEVO') return <td style={{ padding: '8px 4px', color: '#3b82f6', fontWeight: 'bold' }}>NUEVO</td>
  if (!it) return <td style={{ padding: '8px 4px', color: '#9ca3af' }}>—</td>
  if (Math.abs(it.diff) > 0.00001) {
    return (
      <td style={{ padding: '8px 4px', color: it.diff > 0 ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>
        {it.diff > 0 ? '+' : ''}{it.diff.toFixed(dec)}
      </td>
    )
  }
  return <td style={{ padding: '8px 4px', color: '#6b7280' }}>{(0).toFixed(dec)}</td>
}

function BadgeFecha({ file }) {
  if (!file) return null
  const delNombre = extraerFecha(file.nombre_archivo)
  const iso = delNombre || (file.created_at ? String(file.created_at).slice(0, 10) : null)
  return (
    <span style={{ display: 'inline-block', marginTop: '6px', padding: '3px 10px', borderRadius: '999px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', fontSize: '11px', fontWeight: 'bold' }}>
      📅 {fmtDMY(iso)} · {delNombre ? 'fecha del nombre' : 'fecha de subida'}
    </span>
  )
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function ComparadorPrecios({ archivos, archivosTopes, onVolver }) {
  const [tipo, setTipo] = useState('precios')
  const [idBase, setIdBase] = useState('')
  const [idNuevo, setIdNuevo] = useState('')
  const [hojaComparar, setHojaComparar] = useState('Precio Base')
  const [datosComparados, setDatosComparados] = useState(null)
  const [datosComparadosTope, setDatosComparadosTope] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [filtro, setFiltro] = useState('')

  const lista = ordenarPorFecha(tipo === 'precios' ? archivos : archivosTopes)
  const fileBase = lista.find(f => f.id === idBase)
  const fileNuevo = lista.find(f => f.id === idNuevo)
  const resultado = tipo === 'precios' ? datosComparados : datosComparadosTope
  const colorTipo = tipo === 'precios' ? AZUL : VERDE

  // ----------------------------------------------------------
  // AUTOSELECCIÓN FIJA: Actual = más reciente, Previa = la anterior,
  // según la fecha del NOMBRE del archivo (Precios y Topes).
  // El usuario no puede cambiarlas ni intercambiarlas.
  // ----------------------------------------------------------
  useEffect(() => {
    const ord = ordenarPorFecha(tipo === 'precios' ? archivos : archivosTopes)
    setIdNuevo(ord[0]?.id || '')
    setIdBase(ord[1]?.id || '')
  }, [tipo, archivos, archivosTopes])

  // ----------------------------------------------------------
  // PARSEO DE EXCEL
  // ----------------------------------------------------------
  const descargar = async (url) => {
    const res = await fetch(url)
    if (!res.ok) throw new Error('No se pudo descargar uno de los archivos. Verifica que siga disponible en el repositorio.')
    return XLSX.read(await res.arrayBuffer(), { type: 'array' })
  }

  const parsePrecios = async (url, hoja) => {
    const wb = await descargar(url)
    const term = hoja.toLowerCase().replace('precios planta ', '').replace('precio ', '')
    const sheetName = wb.SheetNames.find(n => n.toLowerCase().includes(term)) || wb.SheetNames[0]
    const data = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' })
    let hIdx = data.findIndex(r => r.some(c => normalizarTexto(c).includes('PLANTA')))
    if (hIdx === -1) hIdx = 0
    return { headers: data[hIdx], rows: data.slice(hIdx + 1) }
  }

  const parseTopes = async (url) => {
    const wb = await descargar(url)
    return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })
  }

  const detectarColumnasTopes = (rows) => {
    const cols = rows.length ? Object.keys(rows[0]) : []
    const colPlanta = cols.find(c => normalizarTexto(c) === 'PLANTA') || cols.find(c => normalizarTexto(c).includes('PLANTA'))
    const colAlmacen = cols.find(c => normalizarTexto(c).includes('ALMACEN'))
    const colArticulo = cols.find(c => normalizarTexto(c).includes('ARTICULO'))
    const colTope = cols.find(c => normalizarTexto(c) === 'TOPE S/IGV') || cols.find(c => normalizarTexto(c).includes('TOPE'))
    if (!colPlanta || !colAlmacen || !colArticulo || !colTope) {
      throw new Error('El archivo de Topes debe tener columnas PLANTA, ALMACEN, ARTICULO y TOPE.')
    }
    return { colPlanta, colAlmacen, colArticulo, colTope }
  }

  // ----------------------------------------------------------
  // COMPARAR
  // ----------------------------------------------------------
  const comparar = async () => {
    if (!idBase || !idNuevo) return toast.error('Faltan listas para comparar.')
    if (idBase === idNuevo) return toast.error('Las listas deben ser diferentes.')
    setCargando(true)
    setFiltro('')
    try {
      if (tipo === 'precios') {
        const dBase = await parsePrecios(fileBase.url_archivo, hojaComparar)
        const dNuevo = await parsePrecios(fileNuevo.url_archivo, hojaComparar)

        const idxPlantaN = dNuevo.headers.findIndex(h => normalizarTexto(h).includes('PLANTA'))
        const idxCodigoN = dNuevo.headers.findIndex(h => normalizarTexto(h).includes('CODIGO'))
        const idxPlantaB = dBase.headers.findIndex(h => normalizarTexto(h).includes('PLANTA'))
        if (idxPlantaN === -1 || idxPlantaB === -1) throw new Error('No se encontró la columna PLANTA(S) en una de las listas.')

        const baseMap = {}
        dBase.rows.forEach(row => {
          if (esPlantaValida(row[idxPlantaB])) baseMap[normalizarTexto(row[idxPlantaB])] = row
        })

        const columnas = []
        dNuevo.headers.forEach((h, i) => {
          const hn = normalizarTexto(h)
          if (!hn || hn.includes('PLANTA') || hn.includes('CODIGO') || hn.includes('USO INTERNO')) return
          const bIdx = dBase.headers.findIndex(bH => normalizarTexto(bH) === hn)
          if (bIdx !== -1) columnas.push({ titulo: String(h).trim(), iN: i, iB: bIdx })
        })
        if (columnas.length === 0) throw new Error('Las listas no tienen columnas de productos en común.')

        const rows = []
        dNuevo.rows.forEach(nuevaRow => {
          if (!esPlantaValida(nuevaRow[idxPlantaN])) return
          const baseRow = baseMap[normalizarTexto(nuevaRow[idxPlantaN])]
          const variaciones = {}
          if (baseRow) {
            columnas.forEach(col => {
              const vN = num(nuevaRow[col.iN])
              const vB = num(baseRow[col.iB])
              if (!isNaN(vN) && !isNaN(vB) && vN > 0 && vB > 0) variaciones[col.titulo] = { diff: vN - vB }
              else if (!isNaN(vN) && vN > 0 && (isNaN(vB) || vB === 0)) variaciones[col.titulo] = 'NUEVO'
              else variaciones[col.titulo] = null
            })
          }
          rows.push({ codigo: idxCodigoN !== -1 ? nuevaRow[idxCodigoN] : '', planta: nuevaRow[idxPlantaN], variaciones })
        })

        setDatosComparados({
          columnas: columnas.map(c => c.titulo),
          rows,
          baseNombre: fileBase.nombre_archivo,
          nuevoNombre: fileNuevo.nombre_archivo,
          baseFecha: fechaClave(fileBase),
          nuevoFecha: fechaClave(fileNuevo),
          hoja: hojaComparar,
        })
        toast.success(`Comparación lista: ${rows.length} plantas`)
      } else {
        const rowsB = await parseTopes(fileBase.url_archivo)
        const rowsN = await parseTopes(fileNuevo.url_archivo)
        const cB = detectarColumnasTopes(rowsB)
        const cN = detectarColumnasTopes(rowsN)

        const baseMap = {}
        rowsB.forEach(r => {
          const v = num(r[cB.colTope])
          if (!isNaN(v)) {
            baseMap[`${normalizarTexto(r[cB.colPlanta])}|${normalizarTexto(r[cB.colAlmacen])}|${normalizarTexto(r[cB.colArticulo])}`] = v
          }
        })

        const rows = []
        rowsN.forEach(r => {
          const planta = String(r[cN.colPlanta]).trim()
          const almacen = String(r[cN.colAlmacen]).trim()
          const articulo = String(r[cN.colArticulo]).trim()
          const vN = num(r[cN.colTope])
          if (!esPlantaValida(planta) || !articulo || isNaN(vN)) return
          const vB = baseMap[`${normalizarTexto(planta)}|${normalizarTexto(almacen)}|${normalizarTexto(articulo)}`]
          rows.push({ planta, almacen, articulo, variacion: vB !== undefined ? { diff: vN - vB } : 'NUEVO' })
        })

        setDatosComparadosTope({
          rows,
          baseNombre: fileBase.nombre_archivo,
          nuevoNombre: fileNuevo.nombre_archivo,
          baseFecha: fechaClave(fileBase),
          nuevoFecha: fechaClave(fileNuevo),
          colTope: cN.colTope,
        })
        toast.success(`Comparación de topes lista: ${rows.length} registros`)
      }
    } catch (e) {
      toast.error('Error al comparar: ' + e.message)
    } finally {
      setCargando(false)
    }
  }

  // ----------------------------------------------------------
  // RESUMEN Y FILTRO EN VIVO
  // ----------------------------------------------------------
  const items = resultado
    ? (tipo === 'precios'
      ? resultado.rows.flatMap(r => resultado.columnas.map(c => r.variaciones[c]))
      : resultado.rows.map(r => r.variacion))
    : []
  let subidas = 0, bajadas = 0, iguales = 0, nuevos = 0
  items.forEach(it => {
    if (it === 'NUEVO') nuevos++
    else if (it && Math.abs(it.diff) > 0.00001) { if (it.diff > 0) subidas++; else bajadas++ }
    else if (it) iguales++
  })

  const q = normalizarTexto(filtro)
  const rowsFiltrados = !resultado ? [] : (tipo === 'precios'
    ? resultado.rows.filter(r => normalizarTexto(r.planta).includes(q) || String(r.codigo || '').toLowerCase().includes(filtro.toLowerCase()))
    : resultado.rows.filter(r => normalizarTexto(`${r.planta} ${r.almacen} ${r.articulo}`).includes(q)))

  // ----------------------------------------------------------
  // EXPORTAR A EXCEL
  // ----------------------------------------------------------
  const exportar = () => {
    if (!resultado) return
    let aoa, nombre
    if (tipo === 'precios') {
      aoa = [
        ['CÓDIGO', 'PLANTA', ...resultado.columnas],
        ...resultado.rows.map(r => [r.codigo, r.planta, ...resultado.columnas.map(c => celdaExcel(r.variaciones[c]))]),
      ]
      nombre = `Comparacion_Precios_${resultado.baseFecha}_vs_${resultado.nuevoFecha}.xlsx`
    } else {
      aoa = [
        ['PLANTA', 'ALMACÉN', 'ARTÍCULO', 'VARIACIÓN'],
        ...resultado.rows.map(r => [r.planta, r.almacen, r.articulo, celdaExcel(r.variacion)]),
      ]
      nombre = `Comparacion_Topes_${resultado.baseFecha}_vs_${resultado.nuevoFecha}.xlsx`
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Comparacion')
    XLSX.writeFile(wb, nombre)
    toast.success('Excel exportado')
  }

  const btnTab = (activo, color) => ({
    padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px',
    backgroundColor: activo ? color : '#f3f4f6', color: activo ? 'white' : '#4b5563', transition: 'all 0.2s',
    boxShadow: activo ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
  })

  const thStyle = { padding: '10px 6px', position: 'sticky', top: 0, zIndex: 2, backgroundColor: tipo === 'precios' ? '#1e293b' : VERDE, color: 'white', wordBreak: 'break-word' }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg, #f3f4f6)' }}>
      <style>{`
        .cmp-scroll { scrollbar-width: thin; scrollbar-color: #0B5FA5 #eef2f7; }
        .cmp-scroll::-webkit-scrollbar { height: 10px; width: 10px; }
        .cmp-scroll::-webkit-scrollbar-track { background: #eef2f7; border-radius: 8px; }
        .cmp-scroll::-webkit-scrollbar-thumb { background: #0B5FA5; border-radius: 8px; border: 2px solid #eef2f7; }
        .cmp-scroll::-webkit-scrollbar-thumb:hover { background: #0033A0; }
        .cmp-tabla tbody tr:hover { background: #eff6ff !important; }
        .cmp-resultado { animation: cmpAparecer 0.35s ease; }
        @keyframes cmpAparecer { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
      `}</style>

      <header style={{ padding: '20px 40px', display: 'flex', alignItems: 'center', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <button onClick={onVolver} style={{ background: '#f3f4f6', border: '1px solid #d1d5db', color: '#374151', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>← Volver</button>
        <h1 style={{ margin: '0 0 0 15px', color: AZUL, fontSize: '28px', fontWeight: 900 }}>
          Comparar {tipo === 'precios' ? 'Precios' : 'Topes'}
        </h1>
      </header>

      <main style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button style={btnTab(tipo === 'precios', AZUL)} onClick={() => setTipo('precios')}>
            📄 Precios ({(archivos || []).length})
          </button>
          <button style={btnTab(tipo === 'topes', VERDE)} onClick={() => setTipo('topes')}>
            📊 Topes ({(archivosTopes || []).length})
          </button>
        </div>

        <Card style={{ padding: '30px', marginBottom: '20px' }}>
          <p style={{ margin: '0 0 18px 0', fontSize: '12px', color: '#1e40af', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '8px 12px' }}>
            ⚡ <strong>Selección automática (fija):</strong> «Lista Actual» es la más reciente y «Lista Previa» la inmediatamente anterior, según la fecha en el nombre del archivo (si no tiene fecha, se usa la de subida). Se actualiza sola al subir nuevas listas.
          </p>

          {lista.length < 2 && (
            <p style={{ margin: '0 0 18px 0', fontSize: '13px', color: '#92400e', backgroundColor: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px', padding: '10px 12px', fontWeight: 'bold' }}>
              ⚠️ Se necesitan al menos dos {tipo === 'precios' ? 'listas de precios' : 'archivos de topes'} para comparar. Sube más archivos desde «Cargar Nueva Lista & Topes».
            </p>
          )}

          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <label style={labelStyle}>Lista Previa</label>
              <div style={campoFijoStyle} title={fileBase?.nombre_archivo || ''}>
                <span style={{ opacity: 0.7, flexShrink: 0 }}>🔒</span>
                <span>{fileBase ? fileBase.nombre_archivo : '—'}</span>
              </div>
              <BadgeFecha file={fileBase} />
            </div>

            <div style={{ flex: 1, minWidth: '220px' }}>
              <label style={labelStyle}>Lista Actual</label>
              <div style={campoFijoStyle} title={fileNuevo?.nombre_archivo || ''}>
                <span style={{ opacity: 0.7, flexShrink: 0 }}>🔒</span>
                <span>{fileNuevo ? fileNuevo.nombre_archivo : '—'}</span>
              </div>
              <BadgeFecha file={fileNuevo} />
            </div>

            {tipo === 'precios' && (
              <div style={{ width: '200px' }}>
                <label style={labelStyle}>Hoja</label>
                <select value={hojaComparar} onChange={(e) => setHojaComparar(e.target.value)} style={selectStyle}>
                  <option value="Precio Base">Precio Base</option>
                  <option value="Precios Planta Sin IGV">Precios Planta Sin IGV</option>
                  <option value="Precios Planta Con IGV">Precios Planta Con IGV</option>
                </select>
              </div>
            )}

            <Boton
              variante="primary"
              onClick={comparar}
              disabled={cargando || lista.length < 2 || !idBase || !idNuevo || idBase === idNuevo}
              style={{ height: '42px', backgroundColor: colorTipo }}
            >
              {cargando ? '⏳ Comparando...' : '⚖️ Comparar Ahora'}
            </Boton>
          </div>
        </Card>

        {resultado && (
          <div className="cmp-resultado">
            <Card style={{ padding: '20px', marginBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '20px', color: colorTipo }}>
                    {tipo === 'precios' ? `Variación — ${resultado.hoja}` : 'Variación de Topes'}
                  </h2>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-light, #6b7280)' }}>
                    {resultado.baseNombre} ({fmtDMY(resultado.baseFecha)}) → <strong>{resultado.nuevoNombre}</strong> ({fmtDMY(resultado.nuevoFecha)})
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    placeholder={tipo === 'precios' ? '🔍 Filtrar planta o código...' : '🔍 Filtrar planta, almacén o artículo...'}
                    style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', minWidth: '220px' }}
                  />
                  <Boton variante="success" tamano="sm" onClick={exportar}>⬇️ Exportar Excel</Boton>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '12px', fontWeight: 'bold' }}>
                <span style={{ padding: '6px 12px', borderRadius: '999px', backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>🔴 Subieron: {subidas}</span>
                <span style={{ padding: '6px 12px', borderRadius: '999px', backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>🟢 Bajaron: {bajadas}</span>
                <span style={{ padding: '6px 12px', borderRadius: '999px', backgroundColor: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' }}>🔵 Nuevos: {nuevos}</span>
                <span style={{ padding: '6px 12px', borderRadius: '999px', backgroundColor: '#f9fafb', color: '#4b5563', border: '1px solid #e5e7eb' }}>⚪ Sin cambio: {iguales}</span>
                <span style={{ padding: '6px 12px', borderRadius: '999px', backgroundColor: '#f9fafb', color: '#4b5563', border: '1px solid #e5e7eb' }}>📋 Filas: {rowsFiltrados.length} de {resultado.rows.length}</span>
              </div>
            </Card>

            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <div className="cmp-scroll" style={{ overflow: 'auto', maxHeight: '62vh' }}>
                {tipo === 'precios' ? (
                  <table className="cmp-tabla" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'center' }}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, width: '60px' }}>CÓD</th>
                        <th style={{ ...thStyle, width: '110px', textAlign: 'left' }}>PLANTAS</th>
                        {resultado.columnas.map((col, i) => <th key={i} style={thStyle}>{col}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {rowsFiltrados.map((fila, rI) => (
                        <tr key={rI} style={{ borderBottom: '1px solid #eee', backgroundColor: rI % 2 === 0 ? 'white' : '#f9fafb' }}>
                          <td style={{ padding: '8px 4px', color: 'var(--text-light, #6b7280)' }}>{fila.codigo}</td>
                          <td style={{ padding: '8px 6px', fontWeight: 'bold', textAlign: 'left' }}>{fila.planta}</td>
                          {resultado.columnas.map((col, cI) => <CeldaDiff key={cI} it={fila.variaciones[col]} />)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="cmp-tabla" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'center' }}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, textAlign: 'left' }}>PLANTA</th>
                        <th style={{ ...thStyle, textAlign: 'left' }}>ALMACÉN</th>
                        <th style={{ ...thStyle, textAlign: 'left' }}>ARTÍCULO</th>
                        <th style={thStyle}>VARIACIÓN (S/)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rowsFiltrados.map((fila, rI) => (
                        <tr key={rI} style={{ borderBottom: '1px solid #eee', backgroundColor: rI % 2 === 0 ? 'white' : '#f9fafb' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 'bold', textAlign: 'left' }}>{fila.planta}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'left' }}>{fila.almacen}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'left' }}>{fila.articulo}</td>
                          <CeldaDiff it={fila.variacion} dec={2} />
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {rowsFiltrados.length === 0 && (
                  <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-light, #6b7280)' }}>
                    Sin resultados para el filtro «{filtro}».
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {!resultado && !cargando && lista.length >= 2 && (
          <Card style={{ padding: '50px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '50px', marginBottom: '12px' }}>⚖️</div>
            <h3 style={{ margin: '0 0 8px', color: 'var(--text-dark, #111827)' }}>Listas seleccionadas automáticamente</h3>
            <p style={{ margin: 0, color: 'var(--text-light, #6b7280)', fontSize: '14px' }}>
              Pulsa «Comparar Ahora» para ver la variación entre <strong>{fileBase?.nombre_archivo}</strong> y <strong>{fileNuevo?.nombre_archivo}</strong>.
            </p>
          </Card>
        )}
      </main>
    </div>
  )
}