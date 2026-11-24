// src/components/precios/CotizadorPrecios.jsx
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabase'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { Card, Boton } from '../ui'
import toast from 'react-hot-toast'

const TASA_IGV = 0.18
const TASA_PERCEPCION = 0.01

// ============================================================
// UTILIDADES
// ============================================================
const normalizarTexto = (txt) => String(txt || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').replace(/N°/gi, 'N').trim().toUpperCase()
const parseNum = (v) => parseFloat(String(v).replace(',', '.'))

const numeroALetras = (num) => {
  if (!num || isNaN(num)) return 'CERO'
  const unidades = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE']
  const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA']
  const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS']
  let n = Math.floor(num)
  if (n === 0) return 'CERO'
  let res = ''
  if (n >= 1000) {
    const miles = Math.floor(n / 1000)
    res += (miles === 1 ? 'MIL ' : numeroALetras(miles) + ' MIL ')
    n %= 1000
  }
  if (n >= 100) {
    res += (n === 100 ? 'CIEN ' : centenas[Math.floor(n / 100)] + ' ')
    n %= 100
  }
  if (n >= 20) {
    res += decenas[Math.floor(n / 10)]
    if (n % 10 > 0) res += ' Y ' + unidades[n % 10] + ' '
    else res += ' '
  } else if (n >= 10) {
    const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE']
    res += especiales[n - 10] + ' '
  } else if (n > 0) {
    res += unidades[n] + ' '
  }
  return res.trim()
}

const generarNumeroCotizacion = () => `COT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`

// ============================================================
// ✅ MEJORA 3: Detección resiliente de hojas de Excel
// Busca por palabras clave en lugar de coincidencias exactas,
// para no fallar si el proveedor renombra la hoja.
// ============================================================
const encontrarHojaPrecios = (sheetNames) => {
  const lowerNames = sheetNames.map(n => n.toLowerCase())
  const buscarPor = (claves) => {
    const idx = lowerNames.findIndex(n => claves.some(c => n.includes(c)))
    return idx !== -1 ? sheetNames[idx] : null
  }

  // Prioridad 1: hoja "Sin IGV" / "Precio Base"
  const sinIgv = buscarPor(['sin igv', 'precio base', 'base sin'])
  if (sinIgv) return sinIgv

  // Prioridad 2: cualquier hoja con "precio" o "planta"
  const generic = buscarPor(['precio', 'planta'])
  if (generic) return generic

  // Último recurso: primera hoja
  return sheetNames[0]
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function CotizadorPrecios({ archivos, archivosTopes, onVolver, onCotizacionGuardada }) {
  const [cotKey, setCotKey] = useState(0)
  const [cotCargandoDatos, setCotCargandoDatos] = useState(true)
  const [cotErrorDatos, setCotErrorDatos] = useState('')
  const [cotDatos, setCotDatos] = useState(null)
  const [cotColTope, setCotColTope] = useState('')
  
  const [fPlanta, setFPlanta] = useState('')
  const [fProducto, setFProducto] = useState('')
  const [fAlmacen, setFAlmacen] = useState('')
  const [fFactor, setFFactor] = useState('')
  const [fCantidad, setFCantidad] = useState('')
  
  const [items, setItems] = useState([])
  const [numeroLote, setNumeroLote] = useState('')
  const [cliente, setCliente] = useState('')
  const [aplicaPercepcion, setAplicaPercepcion] = useState(false)
  const [editingIndex, setEditingIndex] = useState(null)
  const [papelera, setPapelera] = useState(null)
  const [guardando, setGuardando] = useState(false)

  // ----------------------------------------------------------
  // Cargar fuentes vigentes (precios + topes)
  // ----------------------------------------------------------
  useEffect(() => {
    let mounted = true
    async function cargarFuentes() {
      setCotCargandoDatos(true)
      setCotErrorDatos('')
      try {
        const precioVigente = archivos.find(a => a.es_vigente)
        const topeVigente = archivosTopes.find(a => a.es_vigente)
        if (!precioVigente || !topeVigente) {
          setCotErrorDatos('No hay archivos de precios o topes marcados como vigentes.')
          setCotCargandoDatos(false)
          return
        }

        const descargar = async (url) => {
          const res = await fetch(url)
          if (!res.ok) throw new Error('No se pudo descargar el archivo.')
          return XLSX.read(await res.arrayBuffer(), { type: 'array' })
        }

        const [resPrecio, resTope] = await Promise.all([descargar(precioVigente.url_archivo), descargar(topeVigente.url_archivo)])

        // ✅ MEJORA 3: Uso de la función de detección inteligente
        const sheetNombre = encontrarHojaPrecios(resPrecio.SheetNames)
        const datosPrecio = XLSX.utils.sheet_to_json(resPrecio.Sheets[sheetNombre], { header: 1, defval: '' })
        let hIdx = datosPrecio.findIndex(r => r.some(c => normalizarTexto(c).includes('PLANTA')))
        if (hIdx === -1) hIdx = 0
        const headers = datosPrecio[hIdx]
        const rows = datosPrecio.slice(hIdx + 1).filter(r => r.some(c => c !== ''))

        const datosTope = XLSX.utils.sheet_to_json(resTope.Sheets[resTope.SheetNames[0]], { defval: '' })
        const cols = datosTope.length ? Object.keys(datosTope[0]) : []
        const colPlanta = cols.find(c => normalizarTexto(c).includes('PLANTA'))
        const colAlmacen = cols.find(c => normalizarTexto(c).includes('ALMACEN'))
        const colArticulo = cols.find(c => normalizarTexto(c).includes('ARTICULO'))
        const colTope = cols.find(c => normalizarTexto(c) === 'TOPE S/IGV') || cols.find(c => normalizarTexto(c).includes('TOPE'))

        if (!colPlanta || !colAlmacen || !colArticulo || !colTope) throw new Error('El archivo de topes no tiene las columnas requeridas (PLANTA, ALMACEN, ARTICULO, TOPE).')

        if (mounted) {
          setCotDatos({
            precioNombre: precioVigente.nombre_archivo,
            topeNombre: topeVigente.nombre_archivo,
            headers, rows,
            topeRows: datosTope,
            colPlanta, colAlmacen, colArticulo,
            plantas: [...new Set(rows.map(r => r[headers.findIndex(c => normalizarTexto(c).includes('PLANTA'))]).filter(Boolean))].sort(),
          })
          setCotColTope(colTope)
        }
      } catch (err) {
        if (mounted) setCotErrorDatos(err.message || 'Error al cargar fuentes de datos.')
      } finally {
        if (mounted) setCotCargandoDatos(false)
      }
    }
    cargarFuentes()
    return () => { mounted = false }
  }, [archivos, archivosTopes, cotKey])

  // ----------------------------------------------------------
  // Catálogos en cascada (planta → almacén → producto)
  // ----------------------------------------------------------
  const almacenesDisponibles = useMemo(() => {
    if (!cotDatos || !fPlanta) return []
    return [...new Set(cotDatos.topeRows.filter(r => normalizarTexto(r[cotDatos.colPlanta]) === normalizarTexto(fPlanta)).map(r => r[cotDatos.colAlmacen]).filter(Boolean))].sort()
  }, [cotDatos, fPlanta])

  const productosDisponibles = useMemo(() => {
    if (!cotDatos || !fPlanta || !fAlmacen) return []
    return [...new Set(cotDatos.topeRows.filter(r => normalizarTexto(r[cotDatos.colPlanta]) === normalizarTexto(fPlanta) && normalizarTexto(r[cotDatos.colAlmacen]) === normalizarTexto(fAlmacen)).map(r => r[cotDatos.colArticulo]).filter(Boolean))].sort()
  }, [cotDatos, fPlanta, fAlmacen])

  useEffect(() => {
    if (fPlanta && almacenesDisponibles.length > 0) {
      if (!almacenesDisponibles.includes(fAlmacen)) setFAlmacen(almacenesDisponibles[0])
    } else { setFAlmacen('') }
  }, [fPlanta, almacenesDisponibles])

  useEffect(() => {
    if (fPlanta && fAlmacen && productosDisponibles.length > 0) {
      if (!productosDisponibles.includes(fProducto)) setFProducto(productosDisponibles[0])
    } else { setFProducto('') }
  }, [fPlanta, fAlmacen, productosDisponibles])

  // ----------------------------------------------------------
  // ✅ LÓGICA DE CÁLCULO (decimales ocultos normalizados)
  // ----------------------------------------------------------
  const calcularItem = (planta, producto, almacen, factorStr, cantidadStr) => {
    if (!cotDatos) return { error: 'Cargando fuentes vigentes...' }
    if (!planta || !producto || !almacen) return { error: 'Selecciona planta, producto y almacén.' }

    const factor = parseNum(factorStr)
    const galones = parseNum(cantidadStr)
    const d = cotDatos

    // Paso 1: Obtener precio base SIN IGV de la hoja detectada
    const idxPlanta = d.headers.findIndex(c => normalizarTexto(c).includes('PLANTA'))
    const fila = d.rows.find(r => normalizarTexto(r[idxPlanta]) === normalizarTexto(planta))
    const idxProd = d.headers.findIndex(h => normalizarTexto(h) === normalizarTexto(producto))
    if (!fila || idxProd === -1) return { error: `No se encontró precio para ${producto} en planta ${planta}.` }

    // ✅ CORRECCIÓN CLAVE: El Excel puede contener más decimales de los visibles
    const precioBaseRaw = parseFloat(String(fila[idxProd]).replace(',', '.'))
    if (!Number.isFinite(precioBaseRaw)) return { error: 'Precio base no válido.' }
    const precioBaseSinIGV = Number(precioBaseRaw.toFixed(4))

    // Paso 2: Precio Base Total = Precio SIN IGV (4 dec) × Galones
    const precioBaseTotal = Number((precioBaseSinIGV * galones).toFixed(2))

    // Paso 3: Obtener TOPE S/IGV
    const t = d.topeRows.find(r =>
      normalizarTexto(r[d.colPlanta]) === normalizarTexto(planta) &&
      normalizarTexto(r[d.colArticulo]) === normalizarTexto(producto) &&
      normalizarTexto(r[d.colAlmacen]) === normalizarTexto(almacen)
    )
    if (!t) return { error: `No existe tope para ${producto} / ${planta} / ${almacen}.` }

    const topeRaw = parseFloat(String(t[cotColTope]).replace(',', '.'))
    if (!Number.isFinite(topeRaw)) return { error: 'El valor de tope no es numérico.' }
    const topeSinIGV = Number(topeRaw.toFixed(2))

    // Paso 4: Calcular Tope Total = TOPE × Galones
    const topeTotal = Number((topeSinIGV * galones).toFixed(2))

    // Paso 5: Precio 1 = Precio Base Total - Tope Total
    const precio1 = Number((precioBaseTotal - topeTotal).toFixed(2))

    // Paso 6: IGV = 18% × Precio 1
    const igv = Number((precio1 * TASA_IGV).toFixed(2))

    // Paso 7: Precio con IGV = Precio 1 + IGV
    const precioConIGV = Number((precio1 + igv).toFixed(2))

    // Paso 8: Percepción = 1% × Precio con IGV
    const percepcion = Number((precioConIGV * TASA_PERCEPCION).toFixed(2))

    // Paso 9: Precio Final con Percepción = Precio con IGV + Percepción
    const precioFinalConPercepcion = Number((precioConIGV + percepcion).toFixed(2))

    return {
      data: {
        planta, producto, almacen, factor, galones,
        precioBaseSinIGV, precioBaseTotal, topeSinIGV, topeTotal,
        precio1, igv, precioConIGV, percepcion, precioFinalConPercepcion,
      },
    }
  }

  const enriquecer = (it, aplica) => {
    const precioFinal = aplica ? it.precioFinalConPercepcion : it.precioConIGV
    return { ...it, precioFinal, aplicaPercepcion: aplica }
  }

  const preview = useMemo(
    () => calcularItem(fPlanta, fProducto, fAlmacen, fFactor, fCantidad),
    [fPlanta, fProducto, fAlmacen, fFactor, fCantidad, cotDatos, cotColTope]
  )
  const previewEnriquecido = preview.data ? enriquecer(preview.data, aplicaPercepcion) : null
  const itemsDerivados = useMemo(() => items.map(it => enriquecer(it, aplicaPercepcion)), [items, aplicaPercepcion])
  const totales = useMemo(() => ({
    count: itemsDerivados.length,
    galones: itemsDerivados.reduce((s, it) => s + (it.galones || 0), 0),
    monto: itemsDerivados.reduce((s, it) => s + (it.precioFinal || 0), 0),
  }), [itemsDerivados])

  // ----------------------------------------------------------
  // Acciones de la cotización
  // ----------------------------------------------------------
  const limpiarForm = () => { setFPlanta(''); setFProducto(''); setFAlmacen(''); setFFactor(''); setFCantidad('') }

  const agregarItem = () => {
    if (preview.error) return toast.error(preview.error)

    // ✅ MEJORA 1: Validación estricta de galones
    const galones = parseFloat(fCantidad)
    if (!galones || isNaN(galones) || galones <= 0) {
      return toast.error('La cantidad de galones debe ser un número mayor a 0.')
    }

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
    setFFactor(String(it.factor)); setFCantidad(it.galones ? String(it.galones) : '')
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
  // Guardar toda la cotización en historial
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
        precio_base_sin_igv: it.precioBaseSinIGV,
        precio_base_total: it.precioBaseTotal,
        tope_sin_igv: it.topeSinIGV,
        tope_total: it.topeTotal,
        precio_1: it.precio1,
        igv: it.igv,
        precio_con_igv: it.precioConIGV,
        percepcion: it.percepcion,
        precio_final_con_percepcion: it.precioFinalConPercepcion,
        precio_final: it.precioFinal,
        aplica_percepcion: it.aplicaPercepcion,
        galones: it.galones || 0,
        total: it.precioFinal || 0,
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
  // PDF profesional de toda la cotización
  // ----------------------------------------------------------
  const generarPDFLote = () => {
    if (itemsDerivados.length === 0) return toast.error('Agrega al menos un ítem a la cotización.')
    const toastId = toast.loading('Generando PDF profesional...')
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const W = doc.internal.pageSize.getWidth()
      const H = doc.internal.pageSize.getHeight()
      const numero = numeroLote || generarNumeroCotizacion()
      const fecha = new Date().toLocaleDateString('es-PE')

      const encabezado = () => {
        doc.setFillColor(255, 255, 255)
        doc.rect(0, 0, W, 26, 'F')
        doc.setFillColor(0, 174, 239)
        doc.rect(0, 26, W, 1.5, 'F')

        try {
          const logoData = '/logo-p.png'
          doc.addImage(logoData, 'PNG', 14, 6, 14, 14)
        } catch (e) {
          console.log('Logo no disponible')
        }

        doc.setTextColor(0, 51, 160)
        doc.setFontSize(16); doc.setFont(undefined, 'bold')
        doc.text('SIGMO · Cotización de Combustibles', 35, 12)
        doc.setFontSize(10); doc.setFont(undefined, 'normal')
        doc.text(`N° ${numero}  ·  ${fecha}`, 35, 20)

        doc.setFontSize(10)
        doc.text(`Cliente: ${cliente || '—'}`, W - 14, 12, { align: 'right' })
        doc.text(`Percepción: ${aplicaPercepcion ? 'APLICADA (1%)' : 'NO aplicada'}`, W - 14, 17, { align: 'right' })

        doc.setTextColor(40, 40, 40)
      }
      encabezado()

      autoTable(doc, {
        startY: 34,
        margin: { top: 32, left: 14, right: 14 },
        head: [['#', 'Planta', 'Producto', 'P. Final C/IGV', 'Galones', 'Total S/']],
        body: itemsDerivados.map((it, i) => [
          i + 1,
          it.planta,
          it.producto,
          it.precioConIGV.toFixed(2),
          it.galones > 0 ? it.galones.toLocaleString('es-PE') : '—',
          'S/ ' + it.precioFinal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        ]),
        foot: [['', '', '', 'TOTAL', totales.galones > 0 ? totales.galones.toLocaleString('es-PE') : '—', 'S/ ' + totales.monto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })]],
        styles: { fontSize: 10, cellPadding: 3, textColor: [40, 40, 40], halign: 'center' },
        headStyles: { fillColor: [0, 51, 160], textColor: 255, fontStyle: 'bold', fontSize: 10, halign: 'center' },
        footStyles: { fillColor: [0, 174, 239], textColor: 255, fontStyle: 'bold', fontSize: 11, halign: 'center' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center', fontStyle: 'bold', textColor: [0, 51, 160] },
          1: { halign: 'center' },
          2: { halign: 'center' },
          3: { halign: 'center' },
          4: { halign: 'center' },
          5: { halign: 'right', fontStyle: 'bold', textColor: [5, 150, 105] },
        },
        didDrawPage: (d) => { if (d.pageNumber > 1) encabezado() },
      })

      const yMontoLetras = (doc.lastAutoTable?.finalY || 40) + 8
      doc.setFontSize(9); doc.setTextColor(40, 40, 40); doc.setFont(undefined, 'bold')
      doc.text('MONTO TOTAL:', 14, yMontoLetras)
      doc.setFont(undefined, 'normal')
      const totalEnLetras = numeroALetras(totales.monto)
      const lines = doc.splitTextToSize(totalEnLetras.toUpperCase(), W - 28)
      doc.text(lines, 14, yMontoLetras + 5)

      const yCondiciones = yMontoLetras + (lines.length * 5) + 15
      doc.setFontSize(9); doc.setTextColor(40, 40, 40); doc.setFont(undefined, 'bold')
      doc.text('CONDICIONES COMERCIALES:', 14, yCondiciones)
      doc.setFont(undefined, 'normal')
      doc.text('• Validez de cotización: 7 días hábiles', 14, yCondiciones + 5)
      doc.text('• Pago: Contado / Crédito 30 días', 14, yCondiciones + 10)
      doc.text('• Precios sujetos a variación sin previo aviso', 14, yCondiciones + 15)
      doc.text('• Entrega según disponibilidad de stock', 14, yCondiciones + 20)

      const yFirma = H - 45
      doc.line(14, yFirma, 100, yFirma)
      doc.text('_________________________', 14, yFirma + 5)
      doc.text('Gerente Comercial', 14, yFirma + 10)

      doc.line(W - 86, yFirma, W - 14, yFirma)
      doc.text('_________________________', W - 86, yFirma + 5)
      doc.text('Cliente', W - 86, yFirma + 10)

      const yNota = yFirma - 10
      doc.setFontSize(8); doc.setTextColor(100, 100, 100)
      doc.text(aplicaPercepcion
        ? 'Precios calculados según fórmula: (Precio SIN IGV × Galones - TOPE × Galones) + IGV (18%) + Percepción (1%).'
        : 'Precios calculados según fórmula: (Precio SIN IGV × Galones - TOPE × Galones) + IGV (18%).',
        14, yNota
      )
      doc.text(`${totales.count} ítem(s) en esta cotización.`, 14, yNota + 4)

      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8); doc.setTextColor(130, 130, 130)
        doc.text(`Página ${i} de ${pageCount} | Generado por SIGMO v1.0`, W - 14, H - 8, { align: 'right' })
        doc.text('Petroamérica S.A.C. | Calle San Martín 583, Miraflores 15074, Lima', 14, H - 8)
      }

      doc.save(`Cotizacion_Profesional_${numero}.pdf`)
      toast.success('PDF profesional generado', { id: toastId })
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

  const AZUL = 'var(--primary-blue, #0B5FA5)'
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', boxSizing: 'border-box' }
  const selectStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', backgroundColor: 'white', boxSizing: 'border-box' }
  const labelStyle = { display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '13px', color: '#374151' }

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
            : cotDatos ? <p style={{ margin: 0, fontSize: '13px', color: '#1e40af' }}>📌 <strong>Fuentes:</strong> {cotDatos.precioNombre} | {cotDatos.topeNombre}</p> : null}
        </Card>

        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* ============ COLUMNA IZQUIERDA: configurar ítem ============ */}
          <div style={{ flex: '1 1 380px', minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <Card style={{ padding: '25px' }}>
              <h2 style={{ margin: '0 0 18px', fontSize: '20px', color: 'var(--text-dark)', textAlign: 'center' }}>
                {editingIndex !== null ? `✏️ Editando ítem #${editingIndex + 1}` : ' Cotizar'}
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div><label style={labelStyle}>Planta</label>
                  <select value={fPlanta} onChange={e => setFPlanta(e.target.value)} style={selectStyle} disabled={!cotDatos}>
                    <option value="">Seleccione...</option>{cotDatos?.plantas?.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Producto</label>
                  <select value={fProducto} onChange={e => setFProducto(e.target.value)} style={selectStyle} disabled={!cotDatos || !fPlanta || !fAlmacen}>
                    <option value="">Seleccione...</option>{productosDisponibles.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Almacén</label>
                  <select value={fAlmacen} onChange={e => setFAlmacen(e.target.value)} style={selectStyle} disabled={!cotDatos || !fPlanta}>
                    <option value="">Seleccione...</option>{almacenesDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>FACTOR (numérico)</label><input type="number" min="0" step="0.0001" value={fFactor} onChange={e => setFFactor(e.target.value)} placeholder="0.00" style={inputStyle} /></div>
                <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Cantidad (Galones)</label><input type="number" min="0" step="0.01" value={fCantidad} onChange={e => setFCantidad(e.target.value)} placeholder="0.00" style={inputStyle} /></div>
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

            <Card style={{ padding: '20px' }}>
              <h3 style={{ margin: '0 0 12px', color: AZUL, fontSize: '16px' }}>📊 Desglose de la cotización en curso</h3>
              {previewEnriquecido ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <Paso etiqueta={`PASO 1 — Precio Base SIN IGV (${previewEnriquecido.producto} en ${previewEnriquecido.planta})`} valor={`S/ ${previewEnriquecido.precioBaseSinIGV.toFixed(4)}`} color={AZUL} />
                  <Paso etiqueta={`PASO 2 — Precio Base Total (× ${previewEnriquecido.galones.toLocaleString('es-PE')} gal)`} valor={`S/ ${previewEnriquecido.precioBaseTotal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} color="#b45309" />
                  <Paso etiqueta={`PASO 3 — TOPE SIN IGV (${previewEnriquecido.almacen})`} valor={`S/ ${previewEnriquecido.topeSinIGV.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} color="#047857" />
                  <Paso etiqueta={`PASO 4 — Tope Total (× ${previewEnriquecido.galones.toLocaleString('es-PE')} gal)`} valor={`S/ ${previewEnriquecido.topeTotal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} color="#047857" />
                  <Paso etiqueta="PASO 5 — Precio 1 = Base Total - Tope Total" valor={`S/ ${previewEnriquecido.precio1.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} color="#047857" />
                  <Paso etiqueta="PASO 6 — IGV (18%)" valor={`S/ ${previewEnriquecido.igv.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} color="#047857" />
                  <Paso etiqueta="PASO 7 — Precio con IGV" valor={`S/ ${previewEnriquecido.precioConIGV.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} color={AZUL} />
                  {aplicaPercepcion && <Paso etiqueta="PASO 8 — Percepción (1%)" valor={`S/ ${previewEnriquecido.percepcion.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} color="#b45309" />}
                  {aplicaPercepcion && <Paso etiqueta="PASO 9 — Precio Final (con Percepción)" valor={`S/ ${previewEnriquecido.precioFinalConPercepcion.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} color={AZUL} fuerte />}
                  {!aplicaPercepcion && <Paso etiqueta="PRECIO FINAL (sin Percepción)" valor={`S/ ${previewEnriquecido.precioConIGV.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} color={AZUL} fuerte />}
                  {previewEnriquecido.galones > 0 && <Paso etiqueta={`TOTAL: ${previewEnriquecido.galones.toLocaleString('es-PE')} gal`} valor={`S/ ${previewEnriquecido.precioFinal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} color="#10b981" fuerte />}
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
                <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--text-dark)' }}> Cotización</h2>
                {numeroLote && <span style={{ padding: '4px 12px', borderRadius: '999px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', fontWeight: 'bold', fontSize: '13px' }}>{numeroLote}</span>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'end', marginBottom: '15px' }}>
                <div>
                  <label style={labelStyle}>Cliente (aplica a toda la cotización)</label>
                  <input type="text" value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Nombre del cliente" style={inputStyle} />
                </div>
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
                        <th style={{ padding: '10px 6px', textAlign: 'right' }}>P. Final C/IGV</th>
                        <th style={{ padding: '10px 6px', textAlign: 'right' }}>Galones</th>
                        <th style={{ padding: '10px 6px', textAlign: 'right' }}>Total S/</th>
                        <th style={{ padding: '10px 6px' }}>Acc</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemsDerivados.map((it, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #eee', backgroundColor: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                          <td style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 'bold', color: AZUL }}>{i + 1}</td>
                          <td style={{ padding: '8px 6px', whiteSpace: 'nowrap' }}>{it.planta}</td>
                          <td style={{ padding: '8px 6px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{it.producto}</td>
                          <td style={{ padding: '8px 6px', whiteSpace: 'nowrap' }}>{it.almacen}</td>
                          <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 'bold', color: AZUL }}>{it.precioConIGV.toFixed(2)}</td>
                          <td style={{ padding: '8px 6px', textAlign: 'right', whiteSpace: 'nowrap' }}>{it.galones > 0 ? it.galones.toLocaleString('es-PE') : '—'}</td>
                          <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 'bold', color: it.precioFinal > 0 ? '#059669' : '#6b7280', fontSize: '14px' }}>{it.precioFinal > 0 ? it.precioFinal.toFixed(2) : '—'}</td>
                          <td style={{ padding: '8px 6px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <button onClick={() => editarItem(i)} title="Editar" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px' }}>✏️</button>
                            <button onClick={() => eliminarItem(i)} title="Eliminar" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px' }}>🗑️</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ backgroundColor: '#eff6ff', fontWeight: 'bold' }}>
                        <td colSpan={5} style={{ padding: '10px 6px', textAlign: 'right', color: '#1e40af' }}>TOTALES ({totales.count} ítems)</td>
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
                <Boton variante="primary" onClick={generarPDFLote} disabled={itemsDerivados.length === 0}>📄 Generar PDF Profesional</Boton>
                <Boton variante="outline" onClick={vaciarLote} disabled={itemsDerivados.length === 0}>🧹 Vaciar</Boton>
                {papelera && <Boton variante="outline" onClick={deshacer}>↩️ Deshacer</Boton>}
              </div>
              <p style={{ margin: '12px 0 0', fontSize: '12px', color: 'var(--text-light)' }}>
                El PDF profesional incluye logo corporativo, condiciones comerciales y espacio para firmas. La percepción se aplica a toda la cotización; recalcula los totales al instante.
              </p>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}