// src/components/precios/CotizadorPrecios.jsx
import { useState, useEffect, useMemo } from 'react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from '../../supabase'
import { Card, Boton } from '../ui'
import toast from 'react-hot-toast'

const TASA_IGV = 0.18
const TASA_PERCEPCION = 0.01
const HOJA_PRECIO_COTIZACION = 'Precios Planta Con IGV'

const normalizarTexto = (txt) => String(txt || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').replace(/N°/gi, 'N').trim().toUpperCase()
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
const parseNum = (v) => {
  const n = parseFloat(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', boxSizing: 'border-box' }
const selectStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #334155', fontSize: '14px', backgroundColor: '#1e293b', color: '#fff', fontWeight: 'bold', boxSizing: 'border-box' }
const readOnlyFieldStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', backgroundColor: '#f3f4f6', color: '#374151', fontWeight: 'bold', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '42px', textAlign: 'center' }
const labelStyle = { display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px' }
const AZUL = 'var(--primary-blue, #0B5FA5)'

export default function CotizadorPrecios({ archivos, archivosTopes, onVolver, onCotizacionGuardada }) {
  // Fuentes vigentes
  const [cotDatos, setCotDatos] = useState(null)
  const [cotCargandoDatos, setCotCargandoDatos] = useState(false)
  const [cotErrorDatos, setCotErrorDatos] = useState('')
  const [cotColTope, setCotColTope] = useState('TOPE S/IGV')
  const [cotKey, setCotKey] = useState(0)

  // Formulario del ítem en curso
  const [fPlanta, setFPlanta] = useState('')
  const [fProducto, setFProducto] = useState('')
  const [fAlmacen, setFAlmacen] = useState('')
  const [fFactor, setFFactor] = useState('')
  const [fCantidad, setFCantidad] = useState('')
  const [editingIndex, setEditingIndex] = useState(null)

  // Lote (varias cotizaciones juntas)
  const [items, setItems] = useState([])
  const [numeroLote, setNumeroLote] = useState('')
  const [cliente, setCliente] = useState('')
  const [aplicaPercepcion, setAplicaPercepcion] = useState(true)
  const [papelera, setPapelera] = useState(null)
  const [guardando, setGuardando] = useState(false)

  // ----------------------------------------------------------
  // Carga de archivos vigentes
  // ----------------------------------------------------------
  useEffect(() => {
    const cargarDatosCotizador = async () => {
      setCotCargandoDatos(true); setCotErrorDatos('')
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
          topeRows, colPlanta, colAlmacen, colArticulo, colTopes, colTopeAuto,
        })
      } catch (e) {
        setCotErrorDatos(e.message); setCotDatos(null)
      } finally {
        setCotCargandoDatos(false)
      }
    }
    cargarDatosCotizador()
  }, [cotKey])

  const almacenes = useMemo(() => {
    if (!cotDatos) return []
    return [...new Set(cotDatos.topeRows.map(r => String(r[cotDatos.colAlmacen] || '').trim()).filter(Boolean))].sort()
  }, [cotDatos])

  // ----------------------------------------------------------
  // Cálculo de un ítem (misma matemática de negocio)
  // ----------------------------------------------------------
  const calcularItem = (planta, producto, almacen, factorStr, cantidadStr) => {
    if (!cotDatos) return { error: 'Cargando fuentes vigentes...' }
    if (!planta || !producto || !almacen) return { error: 'Selecciona planta, producto y almacén.' }
    const factor = parseNum(factorStr)
    const cantidad = parseNum(cantidadStr)
    const d = cotDatos
    const fila = d.filas.find(r => normalizarTexto(r[d.idxPlanta]) === normalizarTexto(planta))
    const idxProd = d.headers.findIndex(h => normalizarTexto(h) === normalizarTexto(producto))
    if (!fila || idxProd === -1) return { error: `No se encontró precio para ${producto} en planta ${planta}.` }
    const precioBase = parseFloat(String(fila[idxProd]).replace(',', '.'))
    if (isNaN(precioBase)) return { error: 'Precio base no válido.' }
    const t = d.topeRows.find(r =>
      normalizarTexto(r[d.colPlanta]) === normalizarTexto(planta) &&
      normalizarTexto(r[d.colArticulo]) === normalizarTexto(producto) &&
      normalizarTexto(r[d.colAlmacen]) === normalizarTexto(almacen)
    )
    if (!t) return { error: `No existe tope para ${producto} / ${planta} / ${almacen}.` }
    const tope = parseFloat(String(t[cotColTope]).replace(',', '.'))
    if (isNaN(tope)) return { error: 'El valor de tope no es numérico.' }
    const topeAjustado = tope - factor
    const finalSinPercepcion = precioBase - (topeAjustado * (1 + TASA_IGV))
    return {
      data: { planta, producto, almacen, precioBase, tope, factor, topeAjustado, finalSinPercepcion, cantidad, colTope: cotColTope },
    }
  }

  const enriquecer = (it, aplica) => {
    const finalConPercepcion = it.finalSinPercepcion * (1 + TASA_PERCEPCION)
    const precioFinal = aplica ? finalConPercepcion : it.finalSinPercepcion
    const total = it.cantidad > 0 ? precioFinal * it.cantidad : 0
    return { ...it, finalConPercepcion, precioFinal, total, aplicaPercepcion: aplica }
  }

  const preview = useMemo(
    () => calcularItem(fPlanta, fProducto, fAlmacen, fFactor, fCantidad),
    [fPlanta, fProducto, fAlmacen, fFactor, fCantidad, cotDatos, cotColTope]
  )
  const previewEnriquecido = preview.data ? enriquecer(preview.data, aplicaPercepcion) : null

  const itemsDerivados = useMemo(() => items.map(it => enriquecer(it, aplicaPercepcion)), [items, aplicaPercepcion])
  const totales = useMemo(() => ({
    count: itemsDerivados.length,
    galones: itemsDerivados.reduce((s, it) => s + (it.cantidad || 0), 0),
    monto: itemsDerivados.reduce((s, it) => s + (it.total || 0), 0),
  }), [itemsDerivados])

  // ----------------------------------------------------------
  // Acciones del lote
  // ----------------------------------------------------------
  const limpiarForm = () => { setFPlanta(''); setFProducto(''); setFAlmacen(''); setFFactor(''); setFCantidad('') }

  const agregarItem = () => {
    if (preview.error) return toast.error(preview.error)
    if (editingIndex !== null) {
      setItems(prev => prev.map((it, i) => (i === editingIndex ? preview.data : it)))
      setEditingIndex(null)
      limpiarForm()
      toast.success('Ítem actualizado en la cotización')
      return
    }
    const dup = items.some(it =>
      it.planta === preview.data.planta && it.producto === preview.data.producto &&
      it.almacen === preview.data.almacen && it.factor === preview.data.factor
    )
    if (dup) return toast.error('Ese ítem (planta/producto/almacén/factor) ya está en la cotización. Edítalo si cambia la cantidad.')
    if (items.length === 0) setNumeroLote(generarNumeroCotizacion())
    setItems(prev => [...prev, preview.data])
    setPapelera(null)
    limpiarForm()
    toast.success('Ítem agregado a la cotización')
  }

  const editarItem = (i) => {
    const it = items[i]
    setFPlanta(it.planta); setFProducto(it.producto); setFAlmacen(it.almacen)
    setFFactor(String(it.factor)); setFCantidad(it.cantidad ? String(it.cantidad) : '')
    setEditingIndex(i)
  }

  const eliminarItem = (i) => {
    setPapelera({ items: [...items], numero: numeroLote })
    setItems(prev => prev.filter((_, idx) => idx !== i))
    if (editingIndex === i) { setEditingIndex(null); limpiarForm() }
    toast('Ítem eliminado. Puedes deshacer.', { icon: '🗑️' })
  }

  const vaciarLote = () => {
    if (items.length === 0) return
    setPapelera({ items: [...items], numero: numeroLote })
    setItems([]); setNumeroLote(''); setEditingIndex(null); limpiarForm()
    toast('Cotización vaciada. Puedes deshacer.', { icon: '🧹' })
  }

  const deshacer = () => {
    if (!papelera) return
    setItems(papelera.items)
    if (papelera.numero) setNumeroLote(papelera.numero)
    setPapelera(null)
    toast.success('Restaurado')
  }

  // ----------------------------------------------------------
  // Guardar TODO el lote en historial
  // ----------------------------------------------------------
  const guardarLote = async () => {
    if (itemsDerivados.length === 0) return toast.error('Agrega al menos un ítem a la cotización.')
    setGuardando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const hoy = new Date().toISOString().split('T')[0]
      const numero = numeroLote || generarNumeroCotizacion()
      const rows = itemsDerivados.map(it => ({
        numero_cotizacion: numero,
        fecha_cotizacion: hoy,
        cliente: cliente || null,
        planta: it.planta,
        almacen: it.almacen,
        producto: it.producto,
        precio_base: it.precioBase,
        tope: it.tope,
        factor: it.factor,
        tope_ajustado: it.topeAjustado,
        precio_final_sin_percepcion: it.finalSinPercepcion,
        precio_final_con_percepcion: it.aplicaPercepcion ? it.finalConPercepcion : null,
        aplica_percepcion: it.aplicaPercepcion,
        cantidad: it.cantidad || 0,
        total: it.total || 0,
        archivo_precios: cotDatos?.precioNombre || null,
        archivo_topes: cotDatos?.topeNombre || null,
        creado_por: user?.email || null,
      }))
      const { data, error } = await supabase.from('cotizaciones').insert(rows).select()
      if (error) throw error
      toast.success(`Cotización ${numero} guardada en historial (${rows.length} ítems)`)
      if (onCotizacionGuardada) onCotizacionGuardada(data[0])
      setItems([]); setNumeroLote(''); setPapelera(null); setEditingIndex(null); limpiarForm()
    } catch (error) {
      toast.error('Error al guardar: ' + error.message)
    } finally {
      setGuardando(false)
    }
  }

  // ----------------------------------------------------------
  // PDF de TODO el lote
  // ----------------------------------------------------------
  const generarPDFLote = () => {
    if (itemsDerivados.length === 0) return toast.error('Agrega al menos un ítem a la cotización.')
    const toastId = toast.loading('Generando PDF de la cotización...')
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const W = doc.internal.pageSize.getWidth()
      const numero = numeroLote || generarNumeroCotizacion()
      const fecha = new Date().toLocaleDateString('es-PE')

      const encabezado = () => {
        doc.setFillColor(0, 51, 160)
        doc.rect(0, 0, W, 24, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(15); doc.setFont(undefined, 'bold')
        doc.text('SIGMO · Cotización de Combustibles', 14, 11)
        doc.setFontSize(10); doc.setFont(undefined, 'normal')
        doc.text(`N° ${numero}  ·  ${fecha}`, 14, 18)
        doc.setFontSize(10)
        doc.text(`Cliente: ${cliente || '—'}`, W - 14, 11, { align: 'right' })
        doc.text(`Percepción: ${aplicaPercepcion ? 'APLICADA (1%)' : 'NO aplicada'}`, W - 14, 18, { align: 'right' })
        doc.setTextColor(40, 40, 40)
      }
      encabezado()

      doc.setFontSize(9)
      doc.text(`Fuentes: ${cotDatos?.precioNombre || '—'}  |  ${cotDatos?.topeNombre || '—'}  ·  Hoja: ${HOJA_PRECIO_COTIZACION}  ·  Columna tope: ${cotColTope}`, 14, 30)

      autoTable(doc, {
        startY: 34,
        margin: { top: 30 },
        head: [['#', 'Planta', 'Producto', 'Almacén', 'P. Base C/IGV', 'Tope', 'Factor', 'Tope Ajust.', 'P. Final C/IGV', 'Cant (gal)', 'Total S/']],
        body: itemsDerivados.map((it, i) => [
          i + 1, it.planta, it.producto, it.almacen,
          it.precioBase.toFixed(4), it.tope.toFixed(4), it.factor.toFixed(4), it.topeAjustado.toFixed(4),
          it.precioFinal.toFixed(4),
          it.cantidad > 0 ? it.cantidad.toLocaleString('es-PE') : '—',
          it.total > 0 ? it.total.toFixed(2) : '—',
        ]),
        foot: [[ '', '', '', '', '', '', '', '', 'TOTAL', totales.galones > 0 ? totales.galones.toLocaleString('es-PE') : '—', totales.monto.toFixed(2) ]],
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [0, 51, 160], textColor: 255, fontStyle: 'bold' },
        footStyles: { fillColor: [0, 174, 239], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        didDrawPage: (d) => { if (d.pageNumber > 1) encabezado() },
      })

      // Desglose detallado por ítem
      const desglose = []
      itemsDerivados.forEach((it, i) => {
        desglose.push([`${i + 1} · ${it.producto} / ${it.planta}`, 'Paso 1 — Precio Base C/IGV', it.precioBase.toFixed(4)])
        desglose.push(['', `Paso 2 — ${it.colTope} (${it.almacen}) − Factor (${it.factor.toFixed(4)})`, it.topeAjustado.toFixed(4)])
        desglose.push(['', 'Paso 3 — P. Final = Base − (Tope Ajust. × 1.18)', it.finalSinPercepcion.toFixed(4)])
        if (it.aplicaPercepcion) desglose.push(['', 'P. Final + Percepción (× 1.01)', it.finalConPercepcion.toFixed(4)])
        desglose.push(['', `Total (${it.cantidad > 0 ? it.cantidad.toLocaleString('es-PE') + ' gal' : 'sin cantidad'})`, it.total > 0 ? it.total.toFixed(2) : '—'])
      })
      autoTable(doc, {
        startY: (doc.lastAutoTable?.finalY || 40) + 8,
        margin: { top: 30 },
        head: [['Ítem', 'Concepto', 'Valor S/']],
        body: desglose,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [30, 41, 59], textColor: 255 },
        columnStyles: { 0: { cellWidth: 70, fontStyle: 'bold' }, 2: { cellWidth: 30, halign: 'right' } },
        didDrawPage: (d) => { if (d.pageNumber > 1) encabezado() },
      })

      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8); doc.setTextColor(120, 120, 120)
        doc.text(`Página ${i} de ${pageCount}`, W - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' })
        doc.text('Documento generado por SIGMO · Precios, Topes & Cotización', 14, doc.internal.pageSize.getHeight() - 8)
      }

      doc.save(`Cotizacion_${numero}.pdf`)
      toast.success('PDF de la cotización generado', { id: toastId })
    } catch (error) {
      toast.error('Error al generar PDF: ' + error.message, { id: toastId })
    }
  }

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------
  const Paso = ({ etiqueta, valor, color, fuerte }) => (
    <div style={{ backgroundColor: '#f9fafb', borderLeft: `4px solid ${color}`, padding: '10px 14px', borderRadius: '6px' }}>
      <p style={{ margin: 0, fontSize: '11px', color: '#6b7280', fontWeight: 'bold' }}>{etiqueta}</p>
      <p style={{ margin: '3px 0 0', fontSize: fuerte ? '20px' : '16px', fontWeight: 'bold', color }}>{valor}</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
      <header style={{ padding: '20px 40px', display: 'flex', alignItems: 'center', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <button onClick={onVolver} style={{ background: '#f3f4f6', border: '1px solid #d1d5db', color: '#374151', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>← Volver al Menú</button>
        <h1 style={{ margin: '0 0 0 15px', color: AZUL, fontSize: '28px', fontWeight: '900' }}>Cotizar Combustibles</h1>
      </header>

      <main style={{ padding: '30px 20px', maxWidth: '1400px', margin: '0 auto' }}>
        <Card style={{ padding: '15px 20px', marginBottom: '15px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', textAlign: 'left' }}>
          {cotCargandoDatos ? <p style={{ margin: 0, color: '#1e40af', fontWeight: 'bold' }}>⏳ Cargando archivos vigentes...</p>
            : cotErrorDatos ? <div><p style={{ margin: '0 0 10px 0', color: '#991b1b', fontWeight: 'bold' }}>⚠️ {cotErrorDatos}</p><Boton variante="outline" tamano="sm" onClick={() => setCotKey(k => k + 1)}>🔄 Reintentar</Boton></div>
            : cotDatos ? <p style={{ margin: 0, fontSize: '13px', color: '#1e40af' }}>📌 <strong>Fuentes:</strong> {cotDatos.precioNombre} &nbsp;|&nbsp; {cotDatos.topeNombre}</p> : null}
        </Card>

        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* ============ COLUMNA IZQUIERDA: configurar ítem ============ */}
          <div style={{ flex: '1 1 380px', minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <Card style={{ padding: '25px' }}>
              <h2 style={{ margin: '0 0 18px', fontSize: '20px', color: 'var(--text-dark)', textAlign: 'center' }}>
                {editingIndex !== null ? `✏️ Editando ítem #${editingIndex + 1}` : '🧾 Cotizar'}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div><label style={labelStyle}>Hoja de Precio</label><div style={readOnlyFieldStyle}>{HOJA_PRECIO_COTIZACION}</div></div>
                <div><label style={labelStyle}>Columna Tope</label><div style={readOnlyFieldStyle}>{cotColTope}</div></div>
                <div><label style={labelStyle}>Planta</label>
                  <select value={fPlanta} onChange={e => setFPlanta(e.target.value)} style={selectStyle} disabled={!cotDatos}>
                    <option value="">Seleccione...</option>{cotDatos?.plantas?.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Producto</label>
                  <select value={fProducto} onChange={e => setFProducto(e.target.value)} style={selectStyle} disabled={!cotDatos}>
                    <option value="">Seleccione...</option>{cotDatos?.productos?.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Almacén</label>
                  <select value={fAlmacen} onChange={e => setFAlmacen(e.target.value)} style={selectStyle} disabled={!cotDatos}>
                    <option value="">Seleccione...</option>{almacenes.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>FACTOR (numérico)</label><input type="number" min="0" step="0.0001" value={fFactor} onChange={e => setFFactor(e.target.value)} placeholder="0.00" style={inputStyle} /></div>
                <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Cantidad (Galones) — opcional</label><input type="number" min="0" step="0.01" value={fCantidad} onChange={e => setFCantidad(e.target.value)} placeholder="0.00" style={inputStyle} /></div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
                <Boton variante="success" onClick={agregarItem} disabled={!!preview.error || cotCargandoDatos} style={{ flex: 1 }}>
                  {editingIndex !== null ? '💾 Actualizar ítem' : '➕ Agregar a la cotización'}
                </Boton>
                {editingIndex !== null && (
                  <Boton variante="outline" onClick={() => { setEditingIndex(null); limpiarForm() }}>Cancelar</Boton>
                )}
              </div>
            </Card>

            {/* Desglose en vivo del ítem en curso */}
            <Card style={{ padding: '20px' }}>
              <h3 style={{ margin: '0 0 12px', color: AZUL, fontSize: '16px' }}>📊 Desglose de la cotización en curso</h3>
              {previewEnriquecido ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <Paso etiqueta={`PASO 1 — Precio Base C/IGV (${previewEnriquecido.producto} en ${previewEnriquecido.planta})`} valor={`S/ ${previewEnriquecido.precioBase.toFixed(4)}`} color={AZUL} />
                  <Paso etiqueta={`PASO 2 — ${previewEnriquecido.colTope} (${previewEnriquecido.almacen}) − Factor (${previewEnriquecido.factor.toFixed(4)})`} valor={`S/ ${previewEnriquecido.tope.toFixed(4)} − ${previewEnriquecido.factor.toFixed(4)} = ${previewEnriquecido.topeAjustado.toFixed(4)}`} color="#b45309" />
                  <Paso etiqueta="PASO 3 — P. Final = Base − (Tope Ajust. × 1.18)" valor={`S/ ${previewEnriquecido.finalSinPercepcion.toFixed(4)}`} color="#047857" />
                  {aplicaPercepcion && <Paso etiqueta="P. Final + Percepción (× 1.01)" valor={`S/ ${previewEnriquecido.finalConPercepcion.toFixed(4)}`} color={AZUL} fuerte />}
                  {previewEnriquecido.cantidad > 0 && <Paso etiqueta={`TOTAL: ${previewEnriquecido.cantidad.toLocaleString('es-PE')} gal × S/ ${previewEnriquecido.precioFinal.toFixed(4)}`} valor={`S/ ${previewEnriquecido.total.toFixed(2)}`} color="#10b981" fuerte />}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-light)' }}>
                  {preview.error && (fPlanta || fProducto || fAlmacen) ? `⚠️ ${preview.error}` : 'Selecciona planta, producto y almacén para ver el desglose en vivo.'}
                </p>
              )}
            </Card>
          </div>

          {/* ============ COLUMNA DERECHA: cotización ============ */}
          <div style={{ flex: '2 1 560px', minWidth: '320px' }}>
            <Card style={{ padding: '25px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--text-dark)' }}>📚 Cotización</h2>
                {numeroLote && <span style={{ padding: '4px 12px', borderRadius: '999px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', fontWeight: 'bold', fontSize: '13px' }}>{numeroLote}</span>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'end', marginBottom: '15px' }}>
                <div><label style={labelStyle}>Cliente (aplica a toda la cotización)</label><input type="text" value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Nombre del cliente" style={inputStyle} /></div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#92400e', fontSize: '13px', backgroundColor: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px', padding: '10px 12px' }}>
                  <input type="checkbox" checked={aplicaPercepcion} onChange={e => setAplicaPercepcion(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                  Percepción (1%) × 1.01
                </label>
              </div>

              {itemsDerivados.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', backgroundColor: '#f9fafb', borderRadius: '10px', border: '1px dashed #d1d5db' }}>
                  <div style={{ fontSize: '44px', marginBottom: '10px' }}>🗂️</div>
                  <h3 style={{ margin: '0 0 6px', color: 'var(--text-dark)' }}>La cotización está vacía</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-light)' }}>Configura un ítem a la izquierda y pulsa «Agregar a la cotización». Puedes acumular varias cotizaciones y guardarlas o exportarlas juntas.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '10px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead style={{ backgroundColor: '#1e293b', color: 'white' }}>
                      <tr>
                        <th style={{ padding: '10px 6px' }}>#</th>
                        <th style={{ padding: '10px 6px', textAlign: 'left' }}>Planta</th>
                        <th style={{ padding: '10px 6px', textAlign: 'left' }}>Producto</th>
                        <th style={{ padding: '10px 6px', textAlign: 'left' }}>Almacén</th>
                        <th style={{ padding: '10px 6px', textAlign: 'right' }}>P. Base</th>
                        <th style={{ padding: '10px 6px', textAlign: 'right' }}>Tope Ajust.</th>
                        <th style={{ padding: '10px 6px', textAlign: 'right' }}>P. Final</th>
                        <th style={{ padding: '10px 6px', textAlign: 'right' }}>Cant</th>
                        <th style={{ padding: '10px 6px', textAlign: 'right' }}>Total S/</th>
                        <th style={{ padding: '10px 6px' }}>Acc</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemsDerivados.map((it, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #eee', backgroundColor: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                          <td style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 'bold', color: AZUL }}>{i + 1}</td>
                          <td style={{ padding: '8px 6px' }}>{it.planta}</td>
                          <td style={{ padding: '8px 6px', fontWeight: 'bold' }}>{it.producto}</td>
                          <td style={{ padding: '8px 6px' }}>{it.almacen}</td>
                          <td style={{ padding: '8px 6px', textAlign: 'right' }}>{it.precioBase.toFixed(4)}</td>
                          <td style={{ padding: '8px 6px', textAlign: 'right' }}>{it.topeAjustado.toFixed(4)}</td>
                          <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 'bold', color: AZUL }}>{it.precioFinal.toFixed(4)}</td>
                          <td style={{ padding: '8px 6px', textAlign: 'right' }}>{it.cantidad > 0 ? it.cantidad.toLocaleString('es-PE') : '—'}</td>
                          <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 'bold', color: it.total > 0 ? '#059669' : '#6b7280' }}>{it.total > 0 ? it.total.toFixed(2) : '—'}</td>
                          <td style={{ padding: '8px 6px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <button onClick={() => editarItem(i)} title="Editar" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px' }}>✏️</button>
                            <button onClick={() => eliminarItem(i)} title="Eliminar" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px' }}>🗑️</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ backgroundColor: '#eff6ff', fontWeight: 'bold' }}>
                        <td colSpan={7} style={{ padding: '10px 6px', textAlign: 'right', color: '#1e40af' }}>TOTALES ({totales.count} ítems)</td>
                        <td style={{ padding: '10px 6px', textAlign: 'right', color: '#1e40af' }}>{totales.galones > 0 ? totales.galones.toLocaleString('es-PE') : '—'}</td>
                        <td style={{ padding: '10px 6px', textAlign: 'right', color: '#059669', fontSize: '14px' }}>S/ {totales.monto.toFixed(2)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '18px' }}>
                <Boton variante="success" onClick={guardarLote} disabled={guardando || itemsDerivados.length === 0}>{guardando ? '⏳ Guardando...' : `💾 Guardar Cotización en Historial (${totales.count})`}</Boton>
                <Boton variante="primary" onClick={generarPDFLote} disabled={itemsDerivados.length === 0}>📄 Generar PDF de cotización</Boton>
                <Boton variante="outline" onClick={vaciarLote} disabled={itemsDerivados.length === 0}>🧹 Vaciar</Boton>
                {papelera && <Boton variante="outline" onClick={deshacer}>↩️ Deshacer</Boton>}
              </div>
              <p style={{ margin: '12px 0 0', fontSize: '12px', color: 'var(--text-light)' }}>
                El PDF y el guardado incluyen <strong>todos los ítems de la cotización</strong> con un mismo número. La percepción se aplica a toda la cotización y recalcula los totales al instante.
              </p>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}