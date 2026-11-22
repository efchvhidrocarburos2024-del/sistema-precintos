import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from '../../supabase'
import { Card, Boton } from '../ui'
import toast from 'react-hot-toast'

const TASA_IGV = 0.18
const TASA_PERCEPCION = 0.01
const HOJA_PRECIO_COTIZACION = 'Precios Planta Con IGV'

const normalizarTexto = (txt) => String(txt || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ').replace(/N°/gi, 'N').trim().toUpperCase()
const esPlantaValida = (nombre) => {
  const n = normalizarTexto(nombre)
  if (!n || n.length < 3 || n.includes('*') || !isNaN(Number(n))) return false
  if (n.includes('TOTAL') || n.includes('IGV') || n.includes('ISC') || n.includes('RODAJE') || n.includes('INCREMENTO') || n.includes('INCLUSION') || n.includes('DISMINUCION') || n.includes('SISE') || n.includes('INGRESO')) return false
  return true
}

const generarNumeroCotizacion = () => {
  const hoy = new Date()
  const yyyy = hoy.getFullYear()
  const mm = String(hoy.getMonth() + 1).padStart(2, '0')
  const dd = String(hoy.getDate()).padStart(2, '0')
  const random = String(Math.floor(Math.random() * 900) + 100)
  return `COT-${yyyy}${mm}${dd}-${random}`
}

const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', boxSizing: 'border-box' }
const selectStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', backgroundColor: '#1e293b', color: '#fff', fontWeight: 'bold', boxSizing: 'border-box' }
const readOnlyFieldStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', backgroundColor: '#f3f4f6', color: '#374151', fontWeight: 'bold', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '42px' }

export default function CotizadorPrecios({ archivos, archivosTopes, onVolver, onCotizacionGuardada }) {
  const [cotCliente, setCotCliente] = useState('')
  const [cotDatos, setCotDatos] = useState(null)
  const [cotCargandoDatos, setCotCargandoDatos] = useState(false)
  const [cotErrorDatos, setCotErrorDatos] = useState('')
  const [cotPlanta, setCotPlanta] = useState('')
  const [cotProducto, setCotProducto] = useState('')
  const [cotAlmacen, setCotAlmacen] = useState('')
  const [cotColTope, setCotColTope] = useState('TOPE S/IGV')
  const [cotFactor, setCotFactor] = useState('')
  const [cotCantidad, setCotCantidad] = useState('')
  const [cotAplicarPercepcion, setCotAplicarPercepcion] = useState(true)
  const [cotResultado, setCotResultado] = useState(null)
  const [cotKey, setCotKey] = useState(0)
  const [cotGuardando, setCotGuardando] = useState(false)

  const cargarDatosCotizador = async () => {
    setCotCargandoDatos(true); setCotErrorDatos(''); setCotResultado(null)
    try {
      const { data: precioVigente } = await supabase.from('precios_archivos').select('*').eq('es_vigente', true).maybeSingle()
      const { data: topeVigente } = await supabase.from('topes_archivos').select('*').eq('es_vigente', true).maybeSingle()
      if (!precioVigente) throw new Error('No hay lista de Precios VIGENTE.')
      if (!topeVigente) throw new Error('No hay archivo de Topes VIGENTE.')

      const resP = await fetch(precioVigente.url_archivo)
      const wbP = XLSX.read(await resP.arrayBuffer(), { type: 'array' })
      const sheetP = wbP.SheetNames.find(n => n.toLowerCase() === HOJA_PRECIO_COTIZACION.toLowerCase())
      if (!sheetP) throw new Error(`No se encontró la hoja "${HOJA_PRECIO_COTIZACION}".`)
      
      const gridP = XLSX.utils.sheet_to_json(wbP.Sheets[sheetP], { header: 1, defval: '' })
      const hIdx = gridP.findIndex(r => r.some(c => normalizarTexto(c).includes('PLANTA')))
      if (hIdx === -1) throw new Error('No se encontró la tabla de precios.')
      
      const headers = gridP[hIdx].map(h => String(h).trim())
      const idxPlanta = headers.findIndex(h => normalizarTexto(h).includes('PLANTA'))
      const filas = gridP.slice(hIdx + 1).filter(r => esPlantaValida(r[idxPlanta]))

      const plantas = [...new Set(filas.map(r => String(r[idxPlanta]).trim()))].sort()
      const productos = headers.filter(h => h && !normalizarTexto(h).includes('PLANTA') && !normalizarTexto(h).includes('CODIGO') && !normalizarTexto(h).includes('USO INTERNO'))

      const resT = await fetch(topeVigente.url_archivo)
      const wbT = XLSX.read(await resT.arrayBuffer(), { type: 'array' })
      const sheetT = wbT.SheetNames.find(n => n.toLowerCase().includes('tope')) || wbT.SheetNames[0]
      const topeRows = XLSX.utils.sheet_to_json(wbT.Sheets[sheetT], { defval: '' })
      const cols = topeRows.length ? Object.keys(topeRows[0]) : []
      
      const colPlanta = cols.find(c => normalizarTexto(c) === 'PLANTA') || cols.find(c => normalizarTexto(c).includes('PLANTA'))
      const colAlmacen = cols.find(c => normalizarTexto(c).includes('ALMACEN'))
      const colArticulo = cols.find(c => normalizarTexto(c).includes('ARTICULO'))
      const colTopes = cols.filter(c => normalizarTexto(c).includes('TOPE'))
      
      if (!colPlanta || !colAlmacen || !colArticulo) throw new Error('El archivo de Topes no tiene columnas PLANTA / ALMACEN / ARTICULO.')

      const colTopeAuto = colTopes[0] || 'TOPE S/IGV'
      setCotColTope(colTopeAuto)
      setCotDatos({
        precioNombre: precioVigente.nombre_archivo, topeNombre: topeVigente.nombre_archivo,
        hojaUsada: sheetP, headers, idxPlanta, filas, plantas, productos,
        topeRows, colPlanta, colAlmacen, colArticulo, colTopes, colTopeAuto
      })
    } catch (e) {
      setCotErrorDatos(e.message); setCotDatos(null)
    } finally {
      setCotCargandoDatos(false)
    }
  }

  const ejecutarCotizacion = () => {
    setCotResultado(null)
    if (!cotDatos || !cotPlanta || !cotProducto || !cotAlmacen || !cotColTope) return

    const d = cotDatos
    const factor = parseFloat(String(cotFactor).replace(',', '.')) || 0

    const fila = d.filas.find(r => normalizarTexto(r[d.idxPlanta]) === normalizarTexto(cotPlanta))
    const idxProd = d.headers.findIndex(h => normalizarTexto(h) === normalizarTexto(cotProducto))
    if (!fila || idxProd === -1) { toast.error(`No se encontró precio para ${cotProducto} en planta ${cotPlanta}`); return }
    const precioBase = parseFloat(String(fila[idxProd]).replace(',', '.'))
    if (isNaN(precioBase)) { toast.error('Precio base no válido'); return }

    const t = d.topeRows.find(r =>
      normalizarTexto(r[d.colPlanta]) === normalizarTexto(cotPlanta) &&
      normalizarTexto(r[d.colArticulo]) === normalizarTexto(cotProducto) &&
      normalizarTexto(r[d.colAlmacen]) === normalizarTexto(cotAlmacen)
    )
    if (!t) { toast.error(`No existe tope para ${cotProducto} / ${cotPlanta} / ${cotAlmacen}`); return }
    const tope = parseFloat(String(t[cotColTope]).replace(',', '.'))
    if (isNaN(tope)) { toast.error('El valor de tope no es numérico'); return }

    const topeAjustado = tope - factor
    const finalSinPercepcion = precioBase - topeAjustado * (1 + TASA_IGV)
    const finalConPercepcion = finalSinPercepcion * (1 + TASA_PERCEPCION)
    const cantidad = parseFloat(String(cotCantidad).replace(',', '.')) || 0
    const precioFinal = cotAplicarPercepcion ? finalConPercepcion : finalSinPercepcion
    const total = precioFinal * cantidad

    setCotResultado({ precioBase, tope, factor, topeAjustado, colTope: cotColTope, finalSinPercepcion, finalConPercepcion, precioFinal, cantidad, total, aplicarPercepcion: cotAplicarPercepcion })
  }

  useEffect(() => { cargarDatosCotizador() }, [cotKey])
  useEffect(() => {
    if (!cotDatos || !cotPlanta || !cotProducto || !cotAlmacen || !cotColTope) { setCotResultado(null); return }
    ejecutarCotizacion()
  }, [cotPlanta, cotProducto, cotAlmacen, cotColTope, cotFactor, cotCantidad, cotAplicarPercepcion, cotDatos])

  const generarPDFCotizacion = () => {
    if (!cotResultado) return toast.error('Selecciona los criterios para cotizar')
    const r = cotResultado
    const doc = new jsPDF()
    const nro = generarNumeroCotizacion()

    doc.setFillColor(11, 95, 165); doc.rect(0, 0, 210, 30, 'F')
    doc.setTextColor(255, 255, 255); doc.setFontSize(18); doc.setFont('helvetica', 'bold')
    doc.text('COTIZACIÓN DE COMBUSTIBLES', 14, 13)
    doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.text('HIDROMUNDO S.A.C.', 14, 21)

    doc.setTextColor(60, 60, 60); doc.setFontSize(10)
    doc.text(`N°: ${nro}`, 14, 40)
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-PE')}`, 14, 46)
    doc.text(`Cliente: ${cotCliente || 'Cliente general'}`, 14, 52)
    doc.text(`Planta: ${cotPlanta}`, 130, 40)
    doc.text(`Almacén: ${cotAlmacen}`, 130, 46)

    const tituloPrecio = r.aplicarPercepcion ? 'FINAL C/IGV + PERC. (S/)' : 'FINAL C/IGV (S/)'
    const head = [['PRODUCTO', tituloPrecio, 'CANT. (GAL)', 'TOTAL (S/)']]
    const body = [[
      cotProducto, r.precioFinal.toFixed(4),
      r.cantidad > 0 ? r.cantidad.toLocaleString('es-PE', { minimumFractionDigits: 2 }) : '—',
      r.cantidad > 0 ? r.total.toFixed(2) : '—'
    ]]

    autoTable(doc, {
      startY: 62, head, body, theme: 'grid',
      headStyles: { fillColor: [11, 95, 165], fontSize: 9, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { fontSize: 11, cellPadding: 6 },
      columnStyles: { 0: { halign: 'left', cellWidth: 60 }, 1: { halign: 'right', fontStyle: 'bold' }, 2: { halign: 'center' }, 3: { halign: 'right', fontStyle: 'bold' } }
    })

    let y = doc.lastAutoTable.finalY + 14
    if (r.cantidad > 0) {
      doc.setFillColor(11, 95, 165); doc.rect(110, y, 86, 14, 'F')
      doc.setTextColor(255, 255, 255); doc.setFontSize(10); doc.setFont('helvetica', 'bold')
      doc.text('TOTAL A PAGAR:', 114, y + 9)
      doc.setFontSize(13); doc.text(`S/ ${r.total.toFixed(2)}`, 192, y + 9, { align: 'right' })
      y += 22
    }

    doc.setFontSize(9); doc.setTextColor(80, 80, 80); doc.setFont('helvetica', 'italic')
    doc.text('Cotización válida por 3 días calendario.', 14, y)

    doc.save(`${nro}.pdf`)
    toast.success(`PDF ${nro} generado`)
  }

  const guardarCotizacion = async () => {
    if (!cotResultado) return toast.error('Primero calcula la cotización')
    setCotGuardando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const nro = generarNumeroCotizacion()
      const hoy = new Date().toISOString().split('T')[0]
      
      const { data, error } = await supabase.from('cotizaciones').insert({
        numero_cotizacion: nro, fecha_cotizacion: hoy, cliente: cotCliente || null,
        planta: cotPlanta, almacen: cotAlmacen, producto: cotProducto,
        precio_base: cotResultado.precioBase, tope: cotResultado.tope, factor: cotResultado.factor,
        tope_ajustado: cotResultado.topeAjustado, precio_final_sin_percepcion: cotResultado.finalSinPercepcion,
        precio_final_con_percepcion: cotAplicarPercepcion ? cotResultado.finalConPercepcion : null,
        aplica_percepcion: cotAplicarPercepcion, cantidad: cotResultado.cantidad || 0, total: cotResultado.total || 0,
        archivo_precios: cotDatos?.precioNombre || null, archivo_topes: cotDatos?.topeNombre || null,
        creado_por: user?.email || null
      }).select()
      
      if (error) throw error
      toast.success(`Cotización ${nro} guardada en historial`)
      if (onCotizacionGuardada) onCotizacionGuardada(data[0])
    } catch (error) {
      toast.error('Error al guardar: ' + error.message)
    } finally {
      setCotGuardando(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
      <header style={{ padding: '20px 40px', display: 'flex', alignItems: 'center', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <button onClick={onVolver} style={{ background: '#f3f4f6', border: '1px solid #d1d5db', color: '#374151', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>← Volver al Menú</button>
        <h1 style={{ margin: '0 0 0 15px', color: 'var(--primary-blue)', fontSize: '28px', fontWeight: '900' }}>Cotizar Combustibles</h1>
      </header>
      <main style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
        <Card style={{ padding: '15px 20px', marginBottom: '15px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', textAlign: 'left' }}>
          {cotCargandoDatos ? <p style={{ margin: 0, color: '#1e40af', fontWeight: 'bold' }}>⏳ Cargando archivos vigentes...</p>
          : cotErrorDatos ? <div><p style={{ margin: '0 0 10px 0', color: '#991b1b', fontWeight: 'bold' }}>⚠️ {cotErrorDatos}</p><Boton variante="outline" tamano="sm" onClick={() => setCotKey(k => k + 1)}>🔄 Reintentar</Boton></div>
          : cotDatos ? <p style={{ margin: 0, fontSize: '13px', color: '#1e40af' }}>📌 <strong>Fuentes:</strong> {cotDatos.precioNombre} &nbsp;|&nbsp; {cotDatos.topeNombre}</p> : null}
        </Card>

        <Card style={{ padding: '30px', marginBottom: '20px' }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '22px', color: 'var(--text-dark)', textAlign: 'center' }}>🧾 Nueva Cotización</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px' }}>
            <div><label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px' }}>Hoja de Precio</label><div style={readOnlyFieldStyle}>{HOJA_PRECIO_COTIZACION}</div></div>
            <div><label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px' }}>Planta</label><select value={cotPlanta} onChange={(e) => setCotPlanta(e.target.value)} style={selectStyle} disabled={!cotDatos}><option value="">Seleccione...</option>{cotDatos?.plantas?.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
            <div><label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px' }}>Producto</label><select value={cotProducto} onChange={(e) => setCotProducto(e.target.value)} style={selectStyle} disabled={!cotDatos}><option value="">Seleccione...</option>{cotDatos?.productos?.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
            <div><label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px' }}>Almacén</label><select value={cotAlmacen} onChange={(e) => setCotAlmacen(e.target.value)} style={selectStyle} disabled={!cotDatos}><option value="">Seleccione...</option>{cotDatos?.topeRows ? [...new Set(cotDatos.topeRows.map(r => String(r[cotDatos?.colAlmacen] || '').trim()).filter(Boolean))].sort().map(a => <option key={a} value={a}>{a}</option>) : null}</select></div>
            <div><label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px' }}>Columna Tope</label><div style={readOnlyFieldStyle}>{cotColTope}</div></div>
            <div><label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px' }}>FACTOR (numérico)</label><input type="number" min="0" step="0.0001" value={cotFactor} onChange={(e) => setCotFactor(e.target.value)} placeholder="0.00" style={inputStyle} /></div>
            <div><label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px', whiteSpace: 'nowrap' }}>Cantidad (Galones) — opcional</label><input type="number" min="0" step="0.01" value={cotCantidad} onChange={(e) => setCotCantidad(e.target.value)} placeholder="0.00" style={inputStyle} /></div>
            <div><label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px' }}>Cliente — opcional</label><input type="text" value={cotCliente} onChange={(e) => setCotCliente(e.target.value)} placeholder="Nombre del cliente" style={inputStyle} /></div>
          </div>
          <div style={{ marginTop: '20px', padding: '12px 16px', backgroundColor: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input type="checkbox" id="aplicarPercepcion" checked={cotAplicarPercepcion} onChange={(e) => setCotAplicarPercepcion(e.target.checked)} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
            <label htmlFor="aplicarPercepcion" style={{ cursor: 'pointer', fontWeight: 'bold', color: '#92400e', fontSize: '14px' }}>Aplicar Percepción ({(TASA_PERCEPCION * 100).toFixed(0)}%) — multiplicar precio final × {(1 + TASA_PERCEPCION).toFixed(2)}</label>
          </div>
        </Card>

        {cotResultado && (
          <Card style={{ padding: '30px' }}>
            <h3 style={{ marginTop: 0, color: 'var(--primary-blue)', textAlign: 'center' }}>📊 Desglose de la Cotización</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div style={{ backgroundColor: '#f9fafb', borderLeft: '4px solid var(--primary-blue)', padding: '12px 16px', borderRadius: '6px' }}>
                <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>PASO 1 — Precio Base C/IGV ({cotProducto} en {cotPlanta})</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: 'bold', color: 'var(--primary-blue)' }}>S/ {cotResultado.precioBase.toFixed(4)}</p>
              </div>
              <div style={{ backgroundColor: '#f9fafb', borderLeft: '4px solid #f59e0b', padding: '12px 16px', borderRadius: '6px' }}>
                <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>PASO 2 — {cotResultado.colTope} ({cotAlmacen}) − FACTOR ({cotResultado.factor.toFixed(4)})</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: 'bold', color: '#b45309' }}>S/ {cotResultado.tope.toFixed(4)} − {cotResultado.factor.toFixed(4)} = {cotResultado.topeAjustado.toFixed(4)}</p>
              </div>
              <div style={{ backgroundColor: '#f9fafb', borderLeft: '4px solid #10b981', padding: '12px 16px', borderRadius: '6px' }}>
                <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>PASO 3 — Precio Final C/IGV = {cotResultado.precioBase.toFixed(4)} − ({cotResultado.topeAjustado.toFixed(4)} × {1 + TASA_IGV})</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: 'bold', color: '#047857' }}>S/ {cotResultado.finalSinPercepcion.toFixed(4)}</p>
              </div>
              {cotAplicarPercepcion && (
                <div style={{ backgroundColor: '#eff6ff', border: '2px solid var(--primary-blue)', padding: '12px 16px', borderRadius: '6px' }}>
                  <p style={{ margin: 0, fontSize: '12px', color: '#1e40af', fontWeight: 'bold' }}>PRECIO FINAL C/IGV + PERCEPCIÓN ({(TASA_PERCEPCION * 100).toFixed(0)}%) = {cotResultado.finalSinPercepcion.toFixed(4)} × {(1 + TASA_PERCEPCION).toFixed(2)}</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '900', color: 'var(--primary-blue)' }}>S/ {cotResultado.finalConPercepcion.toFixed(4)}</p>
                </div>
              )}
              {cotResultado.cantidad > 0 && (
                <div style={{ backgroundColor: '#0f172a', padding: '12px 16px', borderRadius: '6px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', fontWeight: 'bold' }}>TOTAL: {cotResultado.cantidad.toLocaleString('es-PE')} gal × S/ {cotResultado.precioFinal.toFixed(4)}</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '900', color: '#10b981' }}>S/ {cotResultado.total.toFixed(2)}</p>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Boton variante="success" onClick={guardarCotizacion} disabled={cotGuardando}>{cotGuardando ? '⏳ Guardando...' : '💾 Guardar en Historial'}</Boton>
              <Boton variante="primary" onClick={generarPDFCotizacion}>📄 Generar PDF</Boton>
              <Boton variante="outline" onClick={() => { setCotPlanta(''); setCotProducto(''); setCotAlmacen(''); setCotFactor(''); setCotCantidad(''); setCotResultado(null) }}>🔄 Nueva Cotización</Boton>
            </div>
          </Card>
        )}
      </main>
    </div>
  )
}