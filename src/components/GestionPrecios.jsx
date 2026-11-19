import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'
import { Card, Boton } from './ui'

// --- ESTILOS Y COMPONENTES UI ---
const cardStyle = { backgroundColor: 'white', borderRadius: '12px', padding: '30px 20px', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '2px solid transparent', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }
const btnHeaderStyle = { background: '#f3f4f6', border: '1px solid #d1d5db', color: '#374151', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }
const COLORS = ['#0B5FA5', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f43f5e', '#84cc16']

// Componente Skeleton (Carga fantasma)
const Skeleton = ({ height, width = '100%', borderRadius = '8px', marginBottom = '0' }) => (
  <div style={{ 
    height, width, borderRadius, marginBottom, 
    backgroundColor: '#e2e8f0', 
    animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite' 
  }} />
)

// Inyectar animación CSS para el Skeleton
const injectStyles = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: .5; }
  }
`

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const sortedPayload = [...payload].sort((a, b) => b.value - a.value);
    return (
      <div style={{ backgroundColor: '#1e293b', color: 'white', padding: '12px 16px', borderRadius: '8px', maxHeight: '350px', overflowY: 'auto', zIndex: 1000 }}>
        <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#cbd5e1', fontWeight: 'bold', borderBottom: '1px solid #334155', paddingBottom: '5px' }}>{label}</p>
        {sortedPayload.map((entry, index) => (
          <div key={index} style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', fontSize: '12px', marginBottom: '6px' }}>
            <span style={{ color: entry.color }}>{entry.name}:</span>
            <span style={{ fontWeight: 'bold' }}>S/ {Number(entry.value).toFixed(4)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function GestionPrecios({ setPantalla, rol }) {
  // Inyectar estilos de animación en el documento si no existen
  useEffect(() => {
    if (!document.getElementById('skeleton-styles')) {
      const style = document.createElement('style');
      style.id = 'skeleton-styles';
      style.innerHTML = injectStyles;
      document.head.appendChild(style);
    }
  }, []);

  const [vista, setVista] = useState('menu')
  const [archivos, setArchivos] = useState([])
  const [alertas, setAlertas] = useState([])
  const [cargando, setCargando] = useState(false)
  
  // Búsqueda global
  const [busqueda, setBusqueda] = useState('')

  // Carga de archivos
  const [archivoExcel, setArchivoExcel] = useState(null)
  const [subiendo, setSubiendo] = useState(false)

  // Comparación
  const [idBase, setIdBase] = useState('')
  const [idNuevo, setIdNuevo] = useState('')
  const [datosComparados, setDatosComparados] = useState(null)

  // Tendencias
  const [plantaSeleccionada, setPlantaSeleccionada] = useState('')
  const [productoSeleccionado, setProductoSeleccionado] = useState('')
  const [fechaDesdeTendencia, setFechaDesdeTendencia] = useState('')
  const [fechaHastaTendencia, setFechaHastaTendencia] = useState('')
  const [datosTendencia, setDatosTendencia] = useState([])
  const [lineasDinamicas, setLineasDinamicas] = useState([])
  const [metricas, setMetricas] = useState(null)
  const [cargandoTendencia, setCargandoTendencia] = useState(false)
  const [opcionesPlantas, setOpcionesPlantas] = useState([])
  const [opcionesProductos, setOpcionesProductos] = useState([])

  const puedeCargar = ['admin_sistema', 'analista_comercial', 'jefe_pricing'].includes(rol)

  const extraerFecha = (nombre) => {
    if (!nombre) return '1900-01-01';
    const match = nombre.match(/(\d{4}[-_]\d{2}[-_]\d{2})|(\d{2}[-_]\d{2}[-_]\d{4})/);
    if (!match) return '1900-01-01';
    let f = match[0].replace(/_/g, '-');
    if (f.indexOf('-') === 2) { const [d, m, a] = f.split('-'); f = `${a}-${m}-${d}`; }
    return f;
  };

  useEffect(() => {
    if (['visualizar', 'comparar', 'tendencias'].includes(vista)) fetchArchivos()
  }, [vista])

  useEffect(() => {
    if (vista === 'tendencias' && opcionesPlantas.length === 0) {
      supabase.from('historial_precios').select('planta, producto').then(({data}) => {
        if (data) {
          setOpcionesPlantas(['TODOS', ...new Set(data.map(d => d.planta))].sort())
          setOpcionesProductos(['TODOS', ...new Set(data.map(d => d.producto))].sort())
        }
      })
    }
  }, [vista, opcionesPlantas.length])

  async function fetchArchivos() {
    setCargando(true)
    const { data } = await supabase.from('precios_archivos').select('*')
    const { data: alertasData } = await supabase.from('alertas_precios').select('*').eq('leida', false).order('created_at', { ascending: false })
    
    setAlertas(alertasData || [])
    let lista = data || []
    lista.sort((a, b) => (b.es_vigente ? 1 : 0) - (a.es_vigente ? 1 : 0) || extraerFecha(b.nombre_archivo).localeCompare(extraerFecha(a.nombre_archivo)))
    setArchivos(lista)
    setCargando(false)
  }

  const handleFileChange = (e) => setArchivoExcel(e.target.files[0] || null)

  async function handleSubirArchivo() {
    if (!archivoExcel) return toast.error('No hay archivo seleccionado')
    setSubiendo(true)
    
    try {
      const fechaNueva = extraerFecha(archivoExcel.name)
      
      const { data: existe } = await supabase.from('precios_archivos').select('id').or(`nombre_archivo.eq."${archivoExcel.name}",nombre_archivo.like.%${fechaNueva}%`).limit(1)
      if (existe && existe.length > 0) throw new Error(`El archivo o la fecha ${fechaNueva} ya existen en el repositorio.`)

      const fileName = `listas_precios/${Date.now()}_${archivoExcel.name.replace(/\s+/g, '_')}`
      await supabase.storage.from('documentos_sigmo').upload(fileName, archivoExcel)
      const { data: { publicUrl } } = supabase.storage.from('documentos_sigmo').getPublicUrl(fileName)
      const { data: { user } } = await supabase.auth.getUser()

      const { data: inserted, error: dbError } = await supabase.from('precios_archivos').insert({
        nombre_archivo: archivoExcel.name, url_archivo: publicUrl, subido_por: user.email, es_vigente: true
      }).select().single()

      if (dbError) throw dbError

      toast.loading('Procesando datos en el servidor...', { id: 'procesando' })
      const { error: fnError } = await supabase.functions.invoke('process-prices', {
        body: { archivo_id: inserted.id, url_archivo: publicUrl, nombre_archivo: archivoExcel.name, fecha_lista: fechaNueva }
      })

      if (fnError) throw fnError
      toast.success('Lista procesada correctamente', { id: 'procesando' })
      setVista('menu')
      setArchivoExcel(null)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSubiendo(false)
    }
  }

  // TENDENCIAS OPTIMIZADAS CON FILTRO DE FECHAS
  const cargarTendencias = async () => {
    setCargandoTendencia(true);
    setDatosTendencia([]); setMetricas(null);

    try {
      let query = supabase.from('historial_precios').select('fecha_lista, planta, producto, precio').order('fecha_lista')

      if (plantaSeleccionada !== 'TODOS' && plantaSeleccionada !== '') query = query.eq('planta', plantaSeleccionada)
      if (productoSeleccionado !== 'TODOS' && productoSeleccionado !== '') query = query.eq('producto', productoSeleccionado)
      if (fechaDesdeTendencia) query = query.gte('fecha_lista', fechaDesdeTendencia)
      if (fechaHastaTendencia) query = query.lte('fecha_lista', fechaHastaTendencia)

      const { data, error } = await query
      if (error) throw error

      if (!data || data.length === 0) throw new Error("No hay datos en el rango seleccionado.")

      const agrupado = {}
      data.forEach(row => {
        if (!agrupado[row.fecha_lista]) agrupado[row.fecha_lista] = { fecha: row.fecha_lista }
        const key = (plantaSeleccionada === 'TODOS' || plantaSeleccionada === '') && (productoSeleccionado === 'TODOS' || productoSeleccionado === '') 
          ? row.planta 
          : `${row.planta} - ${row.producto}`
        agrupado[row.fecha_lista][key] = row.precio
      })

      const array = Object.values(agrupado)
      setDatosTendencia(array)
      const lineas = Object.keys(array[0] || {}).filter(k => k !== 'fecha')
      setLineasDinamicas(lineas)

      if (lineas.length > 0 && array.length > 1) {
        const ref = lineas[0]
        const precios = array.map(d => d[ref]).filter(v => v)
        setMetricas({
          actual: precios[precios.length - 1],
          variacion: precios[precios.length - 1] - precios[precios.length - 2],
          min: Math.min(...precios), max: Math.max(...precios), ref
        })
      }
    } catch (err) { 
      toast.error(err.message) 
    } finally { 
      setCargandoTendencia(false) 
    }
  }

  const generarComparacion = async () => {
    if (!idBase || !idNuevo) return toast.error('Selecciona dos listas')
    const fBase = archivos.find(a => a.id === idBase)?.nombre_archivo
    const fNuevo = archivos.find(a => a.id === idNuevo)?.nombre_archivo
    const fechaBase = extraerFecha(fBase), fechaNuevo = extraerFecha(fNuevo)

    setCargando(true)
    try {
      const { data: dBase } = await supabase.from('historial_precios').select('*').eq('fecha_lista', fechaBase)
      const { data: dNuevo } = await supabase.from('historial_precios').select('*').eq('fecha_lista', fechaNuevo)

      if (!dBase || !dNuevo) throw new Error('No hay datos procesados para estas fechas')

      const comparacion = dNuevo.map(nuevo => {
        const anterior = dBase.find(b => b.planta === nuevo.planta && b.producto === nuevo.producto)
        return {
          planta: nuevo.planta, producto: nuevo.producto,
          diff: anterior ? nuevo.precio - anterior.precio : 'NUEVO'
        }
      })
      setDatosComparados(comparacion)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setCargando(false)
    }
  }

  // --- RENDERIZADO ---
  const renderHeader = () => (
    <header style={{ padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <button onClick={() => vista === 'menu' ? setPantalla('') : setVista('menu')} style={btnHeaderStyle}>← Volver al Menú</button>
        <h1 style={{ margin: 0, color: 'var(--primary-blue)', fontSize: '28px', fontWeight: '900' }}>Módulo de Lista de Precios</h1>
      </div>
      {alertas.length > 0 && (
        <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🚨 {alertas.length} Alertas de variación {'>'} 3%
        </div>
      )}
    </header>
  )

  if (vista === 'menu') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)', display: 'flex', flexDirection: 'column' }}>
        {renderHeader()}
        <main style={{ flex: 1, padding: '40px 20px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
          
          {alertas.length > 0 && (
            <Card style={{ padding: '20px', marginBottom: '30px', borderLeft: '4px solid #ef4444' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#991b1b' }}>🚨 Alertas Recientes (Variación &gt; 3%)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {alertas.slice(0, 3).map(alerta => (
                  <div key={alerta.id} style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#fef2f2', padding: '10px', borderRadius: '6px', fontSize: '13px' }}>
                    <span><strong>{alerta.planta}</strong> - {alerta.producto}</span>
                    <span style={{ color: alerta.variacion > 0 ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>
                      {alerta.variacion > 0 ? '▲' : '▼'} {alerta.variacion_porcentaje.toFixed(1)}% (S/ {alerta.precio_anterior} → S/ {alerta.precio_nuevo})
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <div onClick={() => setVista('visualizar')} style={cardStyle}><h3>👁️ Visualizar Listas</h3></div>
            {puedeCargar && <div onClick={() => setVista('cargar')} style={cardStyle}><h3>📤 Cargar Nueva Lista</h3></div>}
            <div onClick={() => setVista('tendencias')} style={cardStyle}><h3>📈 Gráfico de Tendencias</h3></div>
            <div onClick={() => setVista('comparar')} style={cardStyle}><h3>⚖️ Comparar Listas</h3></div>
          </div>
        </main>
      </div>
    )
  }

  if (vista === 'cargar') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
        {renderHeader()}
        <main style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
          <Card style={{ padding: '30px' }}>
            <h2>Cargar Archivo</h2>
            <p style={{ color: 'var(--text-light)', marginBottom: '20px' }}>El sistema validará la estructura y generará alertas automáticamente.</p>
            <input type="file" accept=".xlsx, .xls" onChange={handleFileChange} />
            <div style={{ marginTop: '20px' }}>
              <Boton onClick={handleSubirArchivo} disabled={subiendo}>{subiendo ? 'Procesando en Servidor...' : 'Subir y Procesar'}</Boton>
            </div>
          </Card>
        </main>
      </div>
    )
  }

  if (vista === 'tendencias') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
        {renderHeader()}
        <main style={{ padding: '40px 20px', maxWidth: '1100px', margin: '0 auto' }}>
          
          <Card style={{ padding: '20px', marginBottom: '20px', display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-light)', marginBottom: '5px', display: 'block' }}>Planta</label>
              <select value={plantaSeleccionada} onChange={(e) => setPlantaSeleccionada(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: '#1e293b', color: 'white', border: 'none' }}>
                <option value="TODOS">TODAS LAS PLANTAS</option>
                {opcionesPlantas.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-light)', marginBottom: '5px', display: 'block' }}>Producto</label>
              <select value={productoSeleccionado} onChange={(e) => setProductoSeleccionado(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: '#1e293b', color: 'white', border: 'none' }}>
                <option value="TODOS">TODOS LOS PRODUCTOS</option>
                {opcionesProductos.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ width: '150px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-light)', marginBottom: '5px', display: 'block' }}>Desde</label>
              <input type="date" value={fechaDesdeTendencia} onChange={(e) => setFechaDesdeTendencia(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
            </div>
            <div style={{ width: '150px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-light)', marginBottom: '5px', display: 'block' }}>Hasta</label>
              <input type="date" value={fechaHastaTendencia} onChange={(e) => setFechaHastaTendencia(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
            </div>
            <Boton onClick={cargarTendencias} disabled={cargandoTendencia} style={{ height: '42px', padding: '0 25px' }}>
              {cargandoTendencia ? 'Consultando...' : '🔍 Filtrar'}
            </Boton>
          </Card>
          
          <Card style={{ minHeight: '450px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
            {cargandoTendencia ? (
              <div style={{ flex: 1 }}>
                <Skeleton height="40px" width="30%" marginBottom="20px" />
                <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                  <Skeleton height="80px" width="25%" />
                  <Skeleton height="80px" width="25%" />
                  <Skeleton height="80px" width="25%" />
                  <Skeleton height="80px" width="25%" />
                </div>
                <Skeleton height="250px" />
              </div>
            ) : datosTendencia.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {metricas && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '20px' }}>
                    <div style={{ padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid var(--primary-blue)' }}>
                      <p style={{ margin: '0 0 5px 0', fontSize: '11px', color: 'var(--text-light)', fontWeight: 'bold' }}>PRECIO ACTUAL</p>
                      <h3 style={{ margin: 0, color: 'var(--primary-blue)' }}>S/ {metricas.actual.toFixed(4)}</h3>
                    </div>
                    <div style={{ padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', borderLeft: `4px solid ${metricas.variacion > 0 ? '#ef4444' : '#10b981'}` }}>
                      <p style={{ margin: '0 0 5px 0', fontSize: '11px', color: 'var(--text-light)', fontWeight: 'bold' }}>VARIACIÓN</p>
                      <h3 style={{ margin: 0, color: metricas.variacion > 0 ? '#ef4444' : '#10b981' }}>{metricas.variacion > 0 ? '+' : ''}{metricas.variacion.toFixed(4)}</h3>
                    </div>
                    <div style={{ padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
                      <p style={{ margin: '0 0 5px 0', fontSize: '11px', color: 'var(--text-light)', fontWeight: 'bold' }}>MÍNIMO</p>
                      <h3 style={{ margin: 0, color: '#166534' }}>S/ {metricas.min.toFixed(4)}</h3>
                    </div>
                    <div style={{ padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                      <p style={{ margin: '0 0 5px 0', fontSize: '11px', color: 'var(--text-light)', fontWeight: 'bold' }}>MÁXIMO</p>
                      <h3 style={{ margin: 0, color: '#991b1b' }}>S/ {metricas.max.toFixed(4)}</h3>
                    </div>
                  </div>
                )}
                <div style={{ flex: 1, minHeight: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={datosTendencia}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="fecha" tick={{ fontSize: 12 }} /><YAxis domain={['auto', 'auto']} tickFormatter={(v) => v.toFixed(2)} /><Tooltip content={<CustomTooltip />} /><Legend />
                      {lineasDinamicas.map((l, i) => <Line key={l} type="monotone" dataKey={l} stroke={COLORS[i % COLORS.length]} strokeWidth={3} dot={{ r: 3 }} />)}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-light)' }}>
                <p>Selecciona los filtros y haz clic en "Filtrar" para ver la tendencia.</p>
              </div>
            )}
          </Card>
        </main>
      </div>
    )
  }

  if (vista === 'comparar') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
        {renderHeader()}
        <main style={{ padding: '40px 20px', maxWidth: '1000px', margin: '0 auto' }}>
          <Card style={{ padding: '20px', display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <select onChange={(e) => setIdBase(e.target.value)} style={{ padding: '10px', flex: 1, borderRadius: '6px', border: '1px solid #d1d5db' }}><option value="">Lista Base (Anterior)</option>{archivos.map(a => <option key={a.id} value={a.id}>{a.nombre_archivo}</option>)}</select>
            <select onChange={(e) => setIdNuevo(e.target.value)} style={{ padding: '10px', flex: 1, borderRadius: '6px', border: '1px solid #d1d5db' }}><option value="">Lista Nueva (Actual)</option>{archivos.map(a => <option key={a.id} value={a.id}>{a.nombre_archivo}</option>)}</select>
            <Boton onClick={generarComparacion} disabled={cargando}>{cargando ? 'Comparando...' : '⚖️ Comparar'}</Boton>
          </Card>
          
          {cargando ? (
             <Card style={{ padding: '20px' }}><Skeleton height="300px" /></Card>
          ) : datosComparados && (
            <Card style={{ padding: '20px', maxHeight: '500px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead style={{ backgroundColor: '#1e293b', color: 'white' }}>
                  <tr><th style={{ padding: '10px', textAlign: 'left' }}>Planta</th><th style={{ padding: '10px', textAlign: 'left' }}>Producto</th><th style={{ padding: '10px', textAlign: 'right' }}>Variación</th></tr>
                </thead>
                <tbody>
                  {datosComparados.map((d, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px' }}>{d.planta}</td>
                      <td style={{ padding: '10px' }}>{d.producto}</td>
                      <td style={{ padding: '10px', fontWeight: 'bold', textAlign: 'right', color: d.diff === 'NUEVO' ? '#3b82f6' : d.diff > 0 ? '#ef4444' : d.diff < 0 ? '#10b981' : '#6b7280' }}>
                        {d.diff === 'NUEVO' ? 'NUEVO' : d.diff !== 0 ? `${d.diff > 0 ? '+' : ''}${d.diff.toFixed(4)}` : '0.0000'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </main>
      </div>
    )
  }

  // VISTA VISUALIZAR (CON BUSCADOR)
  const archivosFiltrados = archivos.filter(f => f.nombre_archivo.toLowerCase().includes(busqueda.toLowerCase()))

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
      {renderHeader()}
      <main style={{ padding: '40px 20px', maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* BARRA DE BÚSQUEDA */}
        <div style={{ marginBottom: '20px' }}>
          <input 
            type="text" 
            placeholder="🔍 Buscar archivo por nombre o fecha..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ width: '100%', padding: '12px 20px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
          />
        </div>

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead style={{ backgroundColor: 'var(--primary-blue)', color: 'white' }}>
              <tr>
                <th style={{ padding: '15px', textAlign: 'left' }}>FECHA</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>NOMBRE</th>
                <th style={{ padding: '15px', textAlign: 'center' }}>ESTADO</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan="3" style={{ padding: '20px' }}><Skeleton height="100px" /></td></tr>
              ) : archivosFiltrados.length === 0 ? (
                <tr><td colSpan="3" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-light)' }}>No se encontraron archivos que coincidan con la búsqueda.</td></tr>
              ) : archivosFiltrados.map(file => (
                <tr key={file.id} style={{ borderBottom: '1px solid #eee', backgroundColor: file.es_vigente ? '#f0fdf4' : 'white' }}>
                  <td style={{ padding: '15px', color: 'var(--text-light)' }}>{new Date(file.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '15px', fontWeight: 'bold' }}>📄 {file.nombre_archivo}</td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>{file.es_vigente ? '🟢 VIGENTE' : 'HISTÓRICO'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </main>
    </div>
  )
}