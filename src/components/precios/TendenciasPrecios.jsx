import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, Boton } from '../ui'
import toast from 'react-hot-toast'

const normalizarTexto = (txt) => String(txt || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ').replace(/N°/gi, 'N').trim().toUpperCase()
const esPlantaValida = (nombre) => {
  const n = normalizarTexto(nombre)
  if (!n || n.length < 3 || n.includes('*') || !isNaN(Number(n))) return false
  if (n.includes('TOTAL') || n.includes('IGV') || n.includes('ISC') || n.includes('RODAJE') || n.includes('INCREMENTO') || n.includes('INCLUSION') || n.includes('DISMINUCION') || n.includes('SISE') || n.includes('INGRESO')) return false
  return true
}

const extraerFecha = (nombre) => {
  if (!nombre) return '1900-01-01'
  const regex = /(\d{4}[-_]\d{2}[-_]\d{2})|(\d{2}[-_]\d{2}[-_]\d{4})/
  const match = nombre.match(regex)
  if (!match) return '1900-01-01'
  let fechaStr = match[0].replace(/_/g, '-')
  if (fechaStr.indexOf('-') === 2) {
    const [d, m, a] = fechaStr.split('-')
    fechaStr = `${a}-${m}-${d}`
  }
  return fechaStr
}

const COLORS = ['#0B5FA5', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f43f5e', '#84cc16', '#f97316', '#6366f1']

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const sorted = [...payload].sort((a, b) => b.value - a.value)
    return (
      <div style={{ backgroundColor: '#1e293b', color: 'white', padding: '12px 16px', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', maxHeight: '350px', overflowY: 'auto', border: '1px solid #334155' }}>
        <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#cbd5e1', fontWeight: 'bold', borderBottom: '1px solid #334155', paddingBottom: '5px' }}>{label}</p>
        {sorted.map((entry, index) => (
          <div key={index} style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', fontSize: '12px', marginBottom: '6px' }}>
            <span style={{ color: entry.color, display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: entry.color }}></span>
              {entry.name}:
            </span>
            <span style={{ fontWeight: 'bold' }}>S/ {Number(entry.value).toFixed(4)}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export default function TendenciasPrecios({ archivos, opcionesPlantas, opcionesProductos, onVolver }) {
  const [planta, setPlanta] = useState('')
  const [producto, setProducto] = useState('')
  const [hoja, setHoja] = useState('Precio Base')
  const [datos, setDatos] = useState([])
  const [lineas, setLineas] = useState([])
  const [metricas, setMetricas] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const parseExcelFile = async (url, targetSheetName) => {
    const res = await fetch(url)
    const wb = XLSX.read(await res.arrayBuffer(), { type: 'array' })
    const searchTerm = targetSheetName.toLowerCase().replace('precios planta ', '').replace('precio ', '')
    const sheetName = wb.SheetNames.find(n => n.toLowerCase().includes(searchTerm)) || wb.SheetNames[0]
    const data = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' })
    const hIdx = data.findIndex(row => row.some(cell => normalizarTexto(cell).includes('PLANTAS')))
    return { headers: data[hIdx !== -1 ? hIdx : 0], rows: data.slice((hIdx !== -1 ? hIdx : 0) + 1).filter(row => row.some(cell => cell !== '')) }
  }

  const cargarTendencias = async () => {
    if (!planta || !producto) return toast.error('Selecciona una planta y un producto')
    setCargando(true); setDatos([]); setMetricas(null); setError('')
    try {
      const archivosProcesar = archivos.slice(0, 15).reverse()
      if (archivosProcesar.length < 2) throw new Error("Se necesitan al menos 2 listas para calcular una tendencia.")

      const tendenciaAgrupada = {}
      let nombresLineas = new Set()

      for (const file of archivosProcesar) {
        const data = await parseExcelFile(file.url_archivo, hoja)
        const idxPlanta = data.headers.findIndex(h => normalizarTexto(h).includes('PLANTAS'))
        const fecha = extraerFecha(file.nombre_archivo)
        if (!tendenciaAgrupada[fecha]) tendenciaAgrupada[fecha] = { fecha }

        if (planta === 'TODOS' && producto !== 'TODOS') {
          const idxProd = data.headers.findIndex(h => normalizarTexto(h) === normalizarTexto(producto))
          if (idxProd !== -1) {
            data.rows.forEach(fila => {
              const nombrePlanta = String(fila[idxPlanta]).trim()
              if (esPlantaValida(nombrePlanta)) {
                const valor = parseFloat(String(fila[idxProd]).replace(',', '.'))
                if (!isNaN(valor) && valor > 0 && isFinite(valor)) {
                  tendenciaAgrupada[fecha][nombrePlanta] = valor
                  nombresLineas.add(nombrePlanta)
                }
              }
            })
          }
        } else if (planta !== 'TODOS' && producto === 'TODOS') {
          const fila = data.rows.find(r => normalizarTexto(r[idxPlanta]) === normalizarTexto(planta))
          if (fila) {
            data.headers.forEach((h, i) => {
              const hNorm = normalizarTexto(h)
              if (hNorm.includes('PLANTAS') || hNorm.includes('CODIGO') || hNorm.includes('USO INTERNO') || !hNorm) return
              const valor = parseFloat(String(fila[i]).replace(',', '.'))
              if (!isNaN(valor) && valor > 0 && isFinite(valor)) {
                tendenciaAgrupada[fecha][String(h).trim()] = valor
                nombresLineas.add(String(h).trim())
              }
            })
          }
        } else if (planta === 'TODOS' && producto === 'TODOS') {
          data.rows.forEach(fila => {
            const nombrePlanta = String(fila[idxPlanta]).trim()
            if (esPlantaValida(nombrePlanta)) {
              let suma = 0, count = 0
              data.headers.forEach((h, i) => {
                const hNorm = normalizarTexto(h)
                if (hNorm.includes('PLANTAS') || hNorm.includes('CODIGO') || hNorm.includes('USO INTERNO') || !hNorm) return
                const valor = parseFloat(String(fila[i]).replace(',', '.'))
                if (!isNaN(valor) && valor > 0 && isFinite(valor)) { suma += valor; count++ }
              })
              if (count > 0) {
                tendenciaAgrupada[fecha][nombrePlanta] = suma / count
                nombresLineas.add(nombrePlanta)
              }
            }
          })
        } else {
          const idxProd = data.headers.findIndex(h => normalizarTexto(h) === normalizarTexto(producto))
          const fila = data.rows.find(r => normalizarTexto(r[idxPlanta]) === normalizarTexto(planta))
          if (fila && idxProd !== -1) {
            const valor = parseFloat(String(fila[idxProd]).replace(',', '.'))
            const nombreLinea = `${planta} - ${producto}`
            if (!isNaN(valor) && valor > 0 && isFinite(valor)) {
              tendenciaAgrupada[fecha][nombreLinea] = valor
              nombresLineas.add(nombreLinea)
            }
          }
        }
      }

      const datosArray = Object.values(tendenciaAgrupada).sort((a, b) => a.fecha.localeCompare(b.fecha))
      if (datosArray.length < 2) throw new Error("No hay suficientes datos históricos válidos.")

      setDatos(datosArray)
      const lineasArray = Array.from(nombresLineas)
      setLineas(lineasArray)

      if (lineasArray.length > 0) {
        let actual = 0, min = Infinity, max = -Infinity, variacion = 0, labelRef = ''
        if (planta === 'TODOS' && producto === 'TODOS') {
          labelRef = 'Promedio Global (Plantas)'
          const promedios = datosArray.map(d => {
            const vals = Object.entries(d).filter(([k, v]) => k !== 'fecha' && v !== undefined).map(([_, v]) => v)
            return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : undefined
          }).filter(v => v !== undefined)
          if (promedios.length > 0) {
            actual = promedios[promedios.length - 1]
            variacion = promedios.length > 1 ? actual - promedios[promedios.length - 2] : 0
            const allVals = datosArray.flatMap(d => Object.entries(d).filter(([k, v]) => k !== 'fecha' && v !== undefined).map(([_, v]) => v))
            min = Math.min(...allVals); max = Math.max(...allVals)
          }
        } else {
          const primeraLinea = lineasArray[0]
          labelRef = primeraLinea
          const precios = datosArray.map(d => d[primeraLinea]).filter(v => v !== undefined)
          if (precios.length > 0) {
            actual = precios[precios.length - 1]
            variacion = precios.length > 1 ? actual - precios[precios.length - 2] : 0
            min = Math.min(...precios); max = Math.max(...precios)
          }
        }
        setMetricas({ actual, min, max, variacion, lineaReferencia: labelRef })
      } else {
        setMetricas(null)
      }
    } catch (error) {
      setError(error.message)
    } finally {
      setCargando(false)
    }
  }

  const exportarExcel = () => {
    if (!datos || datos.length === 0) return toast.error('No hay datos para exportar')
    const ws = XLSX.utils.json_to_sheet(datos)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Tendencia')
    XLSX.writeFile(wb, `Tendencia_${hoja}.xlsx`)
    toast.success('Datos exportados a Excel')
  }

  const selectStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', backgroundColor: '#1e293b', color: '#fff', fontWeight: 'bold', boxSizing: 'border-box' }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
      <header style={{ padding: '20px 40px', display: 'flex', alignItems: 'center', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <button onClick={onVolver} style={{ background: '#f3f4f6', border: '1px solid #d1d5db', color: '#374151', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>← Volver al Menú</button>
        <h1 style={{ margin: '0 0 0 15px', color: 'var(--primary-blue)', fontSize: '28px', fontWeight: '900' }}>Gráfico de Tendencias</h1>
      </header>
      <main style={{ padding: '40px 20px', maxWidth: '1100px', margin: '0 auto' }}>
        <Card style={{ padding: '30px', marginBottom: '20px' }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '22px', color: 'var(--text-dark)' }}>Análisis de Tendencias</h2>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>Hoja de Precio</label>
              <select value={hoja} onChange={(e) => setHoja(e.target.value)} style={selectStyle}>
                <option value="Precio Base">Precio Base</option>
                <option value="Precios Planta Sin IGV">Precios Planta Sin IGV</option>
                <option value="Precios Planta Con IGV">Precios Planta Con IGV</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>Planta</label>
              <select value={planta} onChange={(e) => setPlanta(e.target.value)} style={selectStyle}>
                <option value="">Seleccione...</option>
                {opcionesPlantas.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>Producto</label>
              <select value={producto} onChange={(e) => setProducto(e.target.value)} style={selectStyle}>
                <option value="">Seleccione...</option>
                {opcionesProductos.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <Boton variante="primary" onClick={cargarTendencias} disabled={cargando || !planta || !producto} style={{ height: '42px' }}>{cargando ? 'Generando...' : '📈 Generar Gráfico'}</Boton>
          </div>
        </Card>

        {error && (
          <Card style={{ padding: '20px', backgroundColor: '#fef2f2', border: '1px solid #f87171', marginBottom: '20px' }}>
            <p style={{ margin: 0, color: '#991b1b', fontWeight: 'bold' }}>⚠️ {error}</p>
          </Card>
        )}

        {metricas && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
            <Card style={{ padding: '20px', textAlign: 'center', borderTop: '4px solid var(--primary-blue)' }}>
              <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: 'var(--text-light)', fontWeight: 'bold', textTransform: 'uppercase' }}>Precio Actual ({metricas.lineaReferencia})</p>
              <h3 style={{ margin: 0, fontSize: '24px', color: 'var(--primary-blue)' }}>S/ {metricas.actual.toFixed(4)}</h3>
            </Card>
            <Card style={{ padding: '20px', textAlign: 'center', borderTop: `4px solid ${metricas.variacion > 0 ? '#ef4444' : metricas.variacion < 0 ? '#10b981' : '#6b7280'}` }}>
              <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: 'var(--text-light)', fontWeight: 'bold', textTransform: 'uppercase' }}>Variación Reciente</p>
              <h3 style={{ margin: 0, fontSize: '24px', color: metricas.variacion > 0 ? '#ef4444' : metricas.variacion < 0 ? '#10b981' : '#6b7280' }}>{metricas.variacion > 0 ? '+' : ''}{metricas.variacion.toFixed(4)}</h3>
            </Card>
            <Card style={{ padding: '20px', textAlign: 'center', borderTop: '4px solid #10b981' }}>
              <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: 'var(--text-light)', fontWeight: 'bold', textTransform: 'uppercase' }}>Precio Mínimo</p>
              <h3 style={{ margin: 0, fontSize: '24px', color: '#166534' }}>S/ {metricas.min.toFixed(4)}</h3>
            </Card>
            <Card style={{ padding: '20px', textAlign: 'center', borderTop: '4px solid #ef4444' }}>
              <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: 'var(--text-light)', fontWeight: 'bold', textTransform: 'uppercase' }}>Precio Máximo</p>
              <h3 style={{ margin: 0, fontSize: '24px', color: '#991b1b' }}>S/ {metricas.max.toFixed(4)}</h3>
            </Card>
          </div>
        )}

        <Card style={{ padding: '20px', height: '500px', display: 'flex', flexDirection: 'column' }}>
          {cargando ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>⏳</div>
              <p style={{ color: 'var(--primary-blue)', fontWeight: 'bold' }}>Analizando historial...</p>
            </div>
          ) : datos.length > 0 ? (
            <>
              <h3 style={{ textAlign: 'center', color: 'var(--primary-blue)', margin: '0 0 15px 0', fontSize: '18px', fontWeight: 'bold' }}>
                Tendencia Histórica: {hoja} ({planta !== 'TODOS' ? planta : 'Todas las Plantas'} - {producto !== 'TODOS' ? producto : 'Todos los Productos'})
              </h3>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                <button onClick={exportarExcel} style={{ padding: '6px 12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>⬇️ Exportar Excel</button>
              </div>
              <div style={{ width: '100%', height: '100%', minHeight: '350px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={datos} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 12, fill: '#64748b' }} tickMargin={10} />
                    <YAxis domain={['auto', 'auto']} tickFormatter={(val) => val.toFixed(2)} tick={{ fontSize: 12, fill: '#64748b' }} width={60} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '15px' }} />
                    {lineas.map((linea, index) => (
                      <Line key={linea} type="monotone" dataKey={linea} name={linea} stroke={COLORS[index % COLORS.length]} strokeWidth={3} dot={{ r: 3, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} connectNulls />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-light)' }}>
              <div style={{ fontSize: '50px', marginBottom: '15px' }}>📉</div>
              <h3 style={{ margin: 0 }}>Sin datos para mostrar</h3>
              <p>Selecciona una planta y un producto para generar el gráfico.</p>
            </div>
          )}
        </Card>
      </main>
    </div>
  )
}