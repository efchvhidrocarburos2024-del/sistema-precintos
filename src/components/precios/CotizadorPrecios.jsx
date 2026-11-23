// src/components/precios/CotizadorPrecios.jsx
import { useState, useEffect, useMemo } from 'react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from '../../supabase'
import toast from 'react-hot-toast'
import { Card, Boton } from '../ui'

const AZUL = '#0033A0'
const CYAN = '#00AEEF'

export default function CotizadorPrecios({ archivos, archivosTopes, setPantalla }) {
  const [listaPrecios, setListaPrecios] = useState([])
  const [listaTopes, setListaTopes] = useState([])
  const [hojaPrecioSel, setHojaPrecioSel] = useState(null)
  const [topeSel, setTopeSel] = useState(null)
  const [plantas, setPlantas] = useState([])
  const [productos, setProductos] = useState([])
  const [almacenes, setAlmacenes] = useState([])
  
  const [plantaSel, setPlantaSel] = useState('')
  const [productoSel, setProductoSel] = useState('')
  const [almacenSel, setAlmacenSel] = useState('')
  const [factor, setFactor] = useState(0)
  const [cantidad, setCantidad] = useState(0)
  
  const [cotizacion, setCotizacion] = useState([])
  const [cliente, setCliente] = useState('')
  const [aplicarPercepcion, setAplicarPercepcion] = useState(true)
  
  const numeroCotizacion = useMemo(() => {
    const hoy = new Date()
    return `COT-${hoy.getFullYear()}${String(hoy.getMonth()+1).padStart(2,'0')}${String(hoy.getDate()).padStart(2,'0')}-${String(Math.floor(Math.random()*900)+100)}`
  }, [])

  // Cargar datos de Excel cuando se selecciona una hoja de precios
  useEffect(() => {
    if (!hojaPrecioSel) {
      setListaPrecios([])
      setPlantas([])
      setProductos([])
      setAlmacenes([])
      return
    }
    
    const cargarDatos = async () => {
      try {
        const res = await fetch(hojaPrecioSel.url_archivo)
        const wb = XLSX.read(await res.arrayBuffer(), { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const datos = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
        
        const headerIndex = datos.findIndex(row => row.some(cell => String(cell).toUpperCase().includes('PLANTA')))
        if (headerIndex === -1) { toast.error('No se encontró la cabecera PLANTA'); return }
        
        const headers = datos[headerIndex].map(h => String(h).trim().toUpperCase())
        const idxPlanta = headers.findIndex(h => h.includes('PLANTA'))
        const idxProducto = headers.findIndex(h => h.includes('PRODUCTO') || h.includes('COMBUSTIBLE'))
        const idxAlmacen = headers.findIndex(h => h.includes('ALMACEN') || h.includes('TERMINAL'))
        const idxPrecio = headers.findIndex(h => h.includes('PRECIO') && !h.includes('TOPE'))
        
        if (idxPlanta === -1 || idxProducto === -1 || idxAlmacen === -1 || idxPrecio === -1) {
          toast.error('No se encontraron todas las columnas necesarias')
          return
        }
        
        const lista = datos.slice(headerIndex + 1)
          .filter(row => row[idxPlanta] && row[idxProducto] && row[idxAlmacen] && row[idxPrecio])
          .map(row => ({
            planta: String(row[idxPlanta]).trim().toUpperCase(),
            producto: String(row[idxProducto]).trim().toUpperCase(),
            almacen: String(row[idxAlmacen]).trim().toUpperCase(),
            precio: Number(row[idxPrecio]) || 0
          }))
        
        setListaPrecios(lista)
        setPlantas([...new Set(lista.map(i => i.planta))].sort())
        setProductos([...new Set(lista.filter(i => i.planta === plantaSel).map(i => i.producto))].sort())
        setAlmacenes([...new Set(lista.filter(i => i.planta === plantaSel && i.producto === productoSel).map(i => i.almacen))].sort())
      } catch (error) {
        console.error('Error cargando precios:', error)
        toast.error('Error al cargar la lista de precios')
      }
    }
    
    cargarDatos()
  }, [hojaPrecioSel, plantaSel, productoSel])

  // Cargar topes cuando se selecciona
  useEffect(() => {
    if (!topeSel) {
      setListaTopes([])
      return
    }
    
    const cargarTopes = async () => {
      try {
        const res = await fetch(topeSel.url_archivo)
        const wb = XLSX.read(await res.arrayBuffer(), { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const datos = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
        
        const headerIndex = datos.findIndex(row => row.some(cell => String(cell).toUpperCase().includes('PRODUCTO')))
        if (headerIndex === -1) { toast.error('No se encontró la cabecera PRODUCTO en topes'); return }
        
        const headers = datos[headerIndex].map(h => String(h).trim().toUpperCase())
        const idxProducto = headers.findIndex(h => h.includes('PRODUCTO') || h.includes('COMBUSTIBLE'))
        const idxTope = headers.findIndex(h => h.includes('TOPE') || h.includes('LÍMITE'))
        
        if (idxProducto === -1 || idxTope === -1) {
          toast.error('No se encontraron columnas PRODUCTO y TOPE en el archivo')
          return
        }
        
        const topes = datos.slice(headerIndex + 1)
          .filter(row => row[idxProducto] && row[idxTope])
          .map(row => ({
            producto: String(row[idxProducto]).trim().toUpperCase(),
            tope: Number(row[idxTope]) || 0
          }))
        
        setListaTopes(topes)
      } catch (error) {
        console.error('Error cargando topes:', error)
        toast.error('Error al cargar la lista de topes')
      }
    }
    
    cargarTopes()
  }, [topeSel])

  // Actualizar productos cuando cambia la planta
  useEffect(() => {
    if (plantaSel && listaPrecios.length > 0) {
      setProductos([...new Set(listaPrecios.filter(i => i.planta === plantaSel).map(i => i.producto))].sort())
      setProductoSel('')
      setAlmacenSel('')
    } else {
      setProductos([])
      setAlmacenes([])
    }
  }, [plantaSel, listaPrecios])

  // Actualizar almacenes cuando cambia el producto
  useEffect(() => {
    if (plantaSel && productoSel && listaPrecios.length > 0) {
      setAlmacenes([...new Set(listaPrecios.filter(i => i.planta === plantaSel && i.producto === productoSel).map(i => i.almacen))].sort())
      setAlmacenSel('')
    } else {
      setAlmacenes([])
    }
  }, [plantaSel, productoSel, listaPrecios])

  const calcularPrecioFinal = () => {
    const item = listaPrecios.find(i => i.planta === plantaSel && i.producto === productoSel && i.almacen === almacenSel)
    if (!item) return 0
    
    let precioBase = item.precio
    const tope = listaTopes.find(t => t.producto === productoSel)
    if (tope && tope.tope > 0 && precioBase > tope.tope) {
      precioBase = tope.tope
    }
    
    return factor > 0 ? precioBase * factor : precioBase
  }

  const agregarItem = () => {
    if (!plantaSel || !productoSel || !almacenSel) {
      toast.error('Selecciona planta, producto y almacén')
      return
    }
    
    const precioFinal = calcularPrecioFinal()
    if (precioFinal <= 0) {
      toast.error('Precio final inválido')
      return
    }
    
    const qty = cantidad > 0 ? cantidad : 1
    const totalSinIgv = precioFinal * qty
    const totalConPercepcion = aplicarPercepcion ? totalSinIgv * 1.01 : totalSinIgv
    
    const nuevoItem = {
      id: Date.now(),
      planta: plantaSel,
      producto: productoSel,
      almacen: almacenSel,
      precioFinal,
      cantidad: qty,
      totalSinIgv,
      totalConPercepcion
    }
    
    setCotizacion([...cotizacion, nuevoItem])
    setPlantaSel('')
    setProductoSel('')
    setAlmacenSel('')
    setFactor(0)
    setCantidad(0)
    toast.success('Item agregado a la cotización')
  }

  const eliminarItem = (id) => {
    setCotizacion(cotizacion.filter(item => item.id !== id))
    toast.success('Item eliminado')
  }

  const vaciarCotizacion = () => {
    if (cotizacion.length === 0) return
    if (window.confirm('¿Estás seguro de vaciar toda la cotización?')) {
      setCotizacion([])
      setCliente('')
      toast.success('Cotización vaciada')
    }
  }

  const generarPDF = () => {
    if (cotizacion.length === 0) {
      toast.error('No hay items para generar PDF')
      return
    }
    
    const doc = new jsPDF('landscape')
    const fecha = new Date().toLocaleDateString('es-PE')
    
    // Encabezado
    doc.setFillColor(0, 51, 160)
    doc.rect(0, 0, 297, 25, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.text('SIGMO · Cotización de Combustibles', 14, 16)
    
    doc.setFontSize(10)
    doc.text(`N° ${numeroCotizacion} · ${fecha}`, 14, 28)
    doc.text(`Cliente: ${cliente || '---'}`, 200, 28)
    doc.text(`Percepción: ${aplicarPercepcion ? 'APLICADA (1%)' : 'NO APLICADA'}`, 200, 34)
    
    // Tabla - SIN COLUMNA ALMACÉN
    const tablaData = cotizacion.map((item, idx) => [
      idx + 1,
      item.planta,
      item.producto,
      // item.almacen,  // OMITIDA
      item.precioFinal.toFixed(4),
      item.cantidad.toLocaleString('es-PE'),
      item.totalConPercepcion.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    ])
    
    const totalCantidad = cotizacion.reduce((sum, item) => sum + item.cantidad, 0)
    const totalGeneral = cotizacion.reduce((sum, item) => sum + item.totalConPercepcion, 0)
    
    autoTable(doc, {
      startY: 40,
      head: [['#', 'Planta', 'Producto', 'P. Final C/IGV', 'Cant (gal)', 'Total S/']],
      body: tablaData,
      foot: [['', '', '', 'TOTAL', totalCantidad.toLocaleString('es-PE'), totalGeneral.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })]],
      theme: 'grid',
      headStyles: { fillColor: [0, 51, 160], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10 },
      bodyStyles: { fontSize: 9, cellPadding: 4 },
      footStyles: { fillColor: [0, 174, 239], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 40 },
        2: { cellWidth: 50 },
        // 3: { cellWidth: 40 },  // ALMACÉN ELIMINADA
        3: { cellWidth: 35, halign: 'right' },  // P. FINAL
        4: { cellWidth: 30, halign: 'right' },  // CANTIDAD
        5: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }  // TOTAL
      },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 5) {
          data.cell.styles.textColor = [0, 128, 0]
          data.cell.styles.fontStyle = 'bold'
        }
        if (data.section === 'foot' && data.column.index === 5) {
          data.cell.styles.fontSize = 11
        }
      }
    })
    
    // Notas al pie
    const finalY = doc.lastAutoTable.finalY + 10
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text('Precios con IGV incluidos.', 14, finalY)
    doc.text(aplicarPercepcion ? 'Percepción del 1% aplicada sobre el precio final de cada item.' : 'Percepción NO aplicada.', 14, finalY + 4)
    doc.text(`${cotizacion.length} item(s) en esta cotización.`, 14, finalY + 8)
    
    // Guardar PDF
    const nombreArchivo = `Cotizacion_${numeroCotizacion}_${fecha.replace(/\//g, '-')}.pdf`
    doc.save(nombreArchivo)
    toast.success('PDF generado exitosamente')
  }

  const guardarEnHistorial = async () => {
    if (cotizacion.length === 0) {
      toast.error('No hay items para guardar')
      return
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('Debes iniciar sesión'); return }
      
      const cotizacionesParaGuardar = cotizacion.map(item => ({
        numero_cotizacion: numeroCotizacion,
        cliente: cliente || null,
        planta: item.planta,
        producto: item.producto,
        almacen: item.almacen,
        precio_final: item.precioFinal,
        cantidad: item.cantidad,
        total_sin_igv: item.totalSinIgv,
        total_con_percepcion: item.totalConPercepcion,
        aplico_percepcion: aplicarPercepcion,
        id_usuario: user.id
      }))
      
      const { error } = await supabase.from('cotizaciones_combustible').insert(cotizacionesParaGuardar)
      if (error) throw error
      
      toast.success(`Cotización ${numeroCotizacion} guardada en historial`)
      setCotizacion([])
      setCliente('')
    } catch (error) {
      console.error('Error guardando cotización:', error)
      toast.error('Error al guardar en historial')
    }
  }

  const totalGeneral = cotizacion.reduce((sum, item) => sum + item.totalConPercepcion, 0)
  const totalCantidad = cotizacion.reduce((sum, item) => sum + item.cantidad, 0)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
      <header style={{ padding: '20px 40px', display: 'flex', alignItems: 'center', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <button onClick={() => setPantalla('precios_menu')} style={{ background: '#f3f4f6', border: '1px solid #d1d5db', color: '#374151', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>← Volver al Menú</button>
        <h1 style={{ margin: '0 0 0 15px', color: AZUL, fontSize: '28px', fontWeight: '900' }}>Cotizar Combustibles</h1>
      </header>

      <main style={{ padding: '40px 20px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Fuentes */}
        <Card style={{ padding: '20px', marginBottom: '24px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <strong style={{ color: AZUL }}> Fuentes:</strong>{' '}
          {hojaPrecioSel ? (
            <span style={{ color: '#1e40af' }}>{hojaPrecioSel.nombre_archivo}</span>
          ) : (
            <span style={{ color: '#9ca3af' }}>Ninguna seleccionada</span>
          )}
          {' | '}
          {topeSel ? (
            <span style={{ color: '#1e40af' }}>{topeSel.nombre_archivo}</span>
          ) : (
            <span style={{ color: '#9ca3af' }}>Ninguno seleccionado</span>
          )}
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px' }}>
          {/* Panel Izquierdo - Formulario */}
          <Card style={{ padding: '24px', height: 'fit-content' }}>
            <h2 style={{ margin: '0 0 20px', textAlign: 'center', color: '#374151', fontSize: '22px' }}>Cotizar</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '13px', color: '#374151', textAlign: 'center' }}>Hoja de Precio</label>
                <select value={hojaPrecioSel?.id || ''} onChange={(e) => setHojaPrecioSel(archivos.find(a => a.id === e.target.value) || null)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#f3f4f6', fontSize: '13px' }}>
                  <option value="">Selecciona...</option>
                  {archivos.map(a => <option key={a.id} value={a.id}>{a.nombre_archivo}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '13px', color: '#374151', textAlign: 'center' }}>Columna Tope</label>
                <select value={topeSel?.id || ''} onChange={(e) => setTopeSel(archivosTopes.find(a => a.id === e.target.value) || null)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#f3f4f6', fontSize: '13px' }}>
                  <option value="">Selecciona...</option>
                  {archivosTopes.map(a => <option key={a.id} value={a.id}>{a.nombre_archivo}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '13px', color: '#374151', textAlign: 'center' }}>Planta</label>
                <select value={plantaSel} onChange={(e) => setPlantaSel(e.target.value)} disabled={!hojaPrecioSel} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: plantaSel ? '#4b5563' : '#6b7280', color: '#fff', fontSize: '13px', fontWeight: 'bold' }}>
                  <option value="">Seleccione...</option>
                  {plantas.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '13px', color: '#374151', textAlign: 'center' }}>Producto</label>
                <select value={productoSel} onChange={(e) => setProductoSel(e.target.value)} disabled={!plantaSel} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: productoSel ? '#4b5563' : '#6b7280', color: '#fff', fontSize: '13px', fontWeight: 'bold' }}>
                  <option value="">Seleccione...</option>
                  {productos.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '13px', color: '#374151', textAlign: 'center' }}>Almacén</label>
                <select value={almacenSel} onChange={(e) => setAlmacenSel(e.target.value)} disabled={!productoSel} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: almacenSel ? '#4b5563' : '#6b7280', color: '#fff', fontSize: '13px', fontWeight: 'bold' }}>
                  <option value="">Seleccione...</option>
                  {almacenes.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '13px', color: '#374151', textAlign: 'center' }}>FACTOR (numérico)</label>
                <input type="number" step="0.01" value={factor} onChange={(e) => setFactor(Number(e.target.value))} placeholder="0.00" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#374151', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '13px', color: '#374151', textAlign: 'center' }}>Cantidad (Galones) — opcional</label>
              <input type="number" step="0.01" value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))} placeholder="0.00" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#374151', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>

            <Boton variante="success" onClick={agregarItem} style={{ width: '100%', padding: '12px', fontSize: '15px', fontWeight: 'bold' }}>+ Agregar a la cotización</Boton>
          </Card>

          {/* Panel Derecho - Cotización */}
          <Card style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#374151', fontSize: '22px' }}>Cotización</h2>
              <span style={{ padding: '6px 12px', borderRadius: '20px', backgroundColor: '#eff6ff', color: AZUL, fontWeight: 'bold', fontSize: '13px' }}>{numeroCotizacion}</span>
            </div>

            {/* Cliente y Percepción */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '13px', color: '#374151', textAlign: 'center' }}>Cliente (aplica a toda la cotización)</label>
                <input type="text" value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nombre del cliente" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#374151', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginTop: '26px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#fef3c7', border: '1px solid #f59e0b', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', color: '#92400e' }}>
                  <input type="checkbox" checked={aplicarPercepcion} onChange={(e) => setAplicarPercepcion(e.target.checked)} style={{ accentColor: '#059669', width: '16px', height: '16px' }} />
                  Percepción (1%) × 1.01
                </label>
              </div>
            </div>

            {/* Tabla de Cotización */}
            {cotizacion.length > 0 ? (
              <>
                <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '16px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead style={{ backgroundColor: '#1e293b', color: '#fff' }}>
                      <tr>
                        <th style={{ padding: '10px 8px', textAlign: 'center', width: '30px' }}>#</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left' }}>Planta</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left' }}>Producto</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left' }}>Almacén</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right' }}>P. Final</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right' }}>Cant</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right' }}>Total S/</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', width: '60px' }}>Acc</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cotizacion.map((item, idx) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 'bold', color: AZUL }}>{idx + 1}</td>
                          <td style={{ padding: '10px 8px', fontWeight: 600 }}>{item.planta}</td>
                          <td style={{ padding: '10px 8px' }}>{item.producto}</td>
                          <td style={{ padding: '10px 8px' }}>{item.almacen}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 'bold', color: AZUL }}>{item.precioFinal.toFixed(4)}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right' }}>{item.cantidad.toLocaleString('es-PE')}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>{item.totalConPercepcion.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                            <Boton variante="outline" tamano="sm" onClick={() => eliminarItem(item.id)} style={{ padding: '4px 8px', fontSize: '12px' }}>️🗑️</Boton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot style={{ backgroundColor: '#eff6ff', fontWeight: 'bold' }}>
                      <tr>
                        <td colSpan={5} style={{ padding: '12px 8px', textAlign: 'right', color: AZUL }}>TOTALES ({cotizacion.length} ítems)</td>
                        <td style={{ padding: '12px 8px', textAlign: 'right', color: '#374151' }}>{totalCantidad.toLocaleString('es-PE')}</td>
                        <td style={{ padding: '12px 8px', textAlign: 'right', color: '#059669', fontSize: '16px' }}>S/ {totalGeneral.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Botones de acción */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <Boton variante="success" onClick={guardarEnHistorial} disabled={cotizacion.length === 0}>💾 Guardar Cotización en Historial ({cotizacion.length})</Boton>
                  <Boton variante="primary" onClick={generarPDF} disabled={cotizacion.length === 0}>📄 Generar PDF de cotización</Boton>
                  <Boton variante="outline" onClick={vaciarCotizacion} disabled={cotizacion.length === 0}> Vaciar</Boton>
                </div>

                <p style={{ marginTop: '16px', fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
                  El PDF y el guardado incluyen <strong>todos los ítems de la cotización</strong> con un mismo número. La percepción se aplica a toda la cotización y recalcula los totales al instante.
                </p>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
                <p style={{ fontSize: '15px', fontWeight: 'bold' }}>La cotización está vacía</p>
                <p style={{ fontSize: '13px' }}>Selecciona planta, producto y agrega ítems para comenzar</p>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  )
}