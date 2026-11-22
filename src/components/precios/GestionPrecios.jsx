// src/components/precios/GestionPrecios.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import toast from 'react-hot-toast'
import { Card } from '../ui'

// Import directo (export default) — NO usar el barrel ./index.js
import VisualizadorPrecios from './VisualizadorPrecios'
import CargadorPrecios from './CargadorPrecios'
import ComparadorPrecios from './ComparadorPrecios'
import CotizadorPrecios from './CotizadorPrecios'
import HistorialCotizaciones from './HistorialCotizaciones'
import TendenciasPrecios from './TendenciasPrecios'

const cardStyle = {
  backgroundColor: 'white', borderRadius: '12px', padding: '30px 20px', textAlign: 'center',
  boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '2px solid transparent', cursor: 'pointer',
  transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
}
const btnHeaderStyle = { background: '#f3f4f6', border: '1px solid #d1d5db', color: '#374151', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }
const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', boxSizing: 'border-box' }

// Extrae la fecha del nombre del archivo (YYYY-MM-DD o DD-MM-YYYY, con - o _)
const extraerFecha = (nombre) => {
  if (!nombre) return '1900-01-01'
  const match = String(nombre).match(/(\d{4}[-_]\d{2}[-_]\d{2})|(\d{2}[-_]\d{2}[-_]\d{4})/)
  if (!match) return '1900-01-01'
  let fechaStr = match[0].replace(/_/g, '-')
  if (fechaStr.indexOf('-') === 2) {
    const [d, m, a] = fechaStr.split('-')
    fechaStr = `${a}-${m}-${d}`
  }
  return fechaStr
}

export default function GestionPrecios({ setPantalla, rol }) {
  const [vista, setVista] = useState('menu')

  // Datos compartidos con los sub-componentes
  const [archivos, setArchivos] = useState([])
  const [archivosTopes, setArchivosTopes] = useState([])
  const [auditoria, setAuditoria] = useState([])

  // Filtros del módulo Tendencias (versión nueva basada en BD)
  const hoy = new Date().toISOString().split('T')[0]
  const inicioAnio = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
  const [catalogos, setCatalogos] = useState({ plantas: [], productos: [] })
  const [cargandoCatalogos, setCargandoCatalogos] = useState(false)
  const [filtrosTendencias, setFiltrosTendencias] = useState({
    fechaDesde: inicioAnio, fechaHasta: hoy, productosSeleccionados: [], plantaSeleccionada: ''
  })

  // Permisos (códigos de rol históricos del módulo; agrega los que necesites)
  const puedeCargar = ['admin_sistema', 'analista_comercial', 'jefe_pricing'].includes(rol)
  const puedeGestionar = ['admin_sistema', 'jefe_pricing'].includes(rol)

  // ----------------------------------------------------------
  // Cargas según la vista
  // ----------------------------------------------------------
  useEffect(() => {
    if (vista === 'visualizar' || vista === 'comparar') { fetchArchivos(); fetchArchivosTopes() }
    if (vista === 'auditoria') fetchAuditoria()
    if (vista === 'tendencias') cargarCatalogos()
  }, [vista])

  async function fetchArchivos() {
    const { data, error } = await supabase.from('precios_archivos').select('*')
    if (error) { toast.error('Error al cargar listas: ' + error.message); return }
    setArchivos((data || []).sort((a, b) => extraerFecha(b.nombre_archivo).localeCompare(extraerFecha(a.nombre_archivo))))
  }

  async function fetchArchivosTopes() {
    const { data, error } = await supabase.from('topes_archivos').select('*').order('created_at', { ascending: false })
    if (error) { toast.error('Error al cargar topes: ' + error.message); return }
    setArchivosTopes(data || [])
  }

  async function fetchAuditoria() {
    const { data: pAud } = await supabase.from('precios_auditoria').select('*').order('created_at', { ascending: false })
    const { data: tAud } = await supabase.from('topes_auditoria').select('*').order('created_at', { ascending: false })
    const combinada = [
      ...(pAud || []).map(x => ({ ...x, origen: 'PRECIOS' })),
      ...(tAud || []).map(x => ({ ...x, origen: 'TOPES' }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    setAuditoria(combinada)
  }

  async function cargarCatalogos() {
    setCargandoCatalogos(true)
    try {
      const [resPlantas, resProductos] = await Promise.all([
        supabase.from('plantas').select('nombre, activo').eq('activo', true).order('nombre'),
        supabase.from('productos').select('nombre, activo').eq('activo', true).order('nombre'),
      ])
      if (resPlantas.error) throw resPlantas.error
      if (resProductos.error) throw resProductos.error
      setCatalogos({
        plantas: (resPlantas.data || []).map(p => p.nombre),
        productos: (resProductos.data || []).map(p => p.nombre),
      })
    } catch (err) {
      console.error('Error cargando catálogos:', err)
      toast.error('No se pudieron cargar los catálogos de plantas/productos.')
      setCatalogos({ plantas: [], productos: [] })
    } finally {
      setCargandoCatalogos(false)
    }
  }

  async function registrarAuditoria(id_archivo, nombre_archivo, accion, tipo = 'precios') {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const tabla = tipo === 'precios' ? 'precios_auditoria' : 'topes_auditoria'
      await supabase.from(tabla).insert({ id_archivo, nombre_archivo, accion, usuario: user?.email || null })
    } catch (e) { console.error('Error registrando auditoría:', e) }
  }

  // ----------------------------------------------------------
  // Subida real de archivos (la usa CargadorPrecios)
  // ----------------------------------------------------------
  async function subirArchivo(file, esTope) {
    const tabla = esTope ? 'topes_archivos' : 'precios_archivos'
    const carpeta = esTope ? 'topes' : 'listas_precios'
    try {
      // Validación de duplicados por nombre
      const { data: existentes } = await supabase.from(tabla).select('id').eq('nombre_archivo', file.name).limit(1)
      if (existentes && existentes.length > 0) {
        throw new Error(`Ya existe un archivo llamado "${file.name}". Elimínalo o renómbralo antes de subirlo.`)
      }

      const ruta = `${carpeta}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`
      const { error: errUp } = await supabase.storage.from('documentos_sigmo').upload(ruta, file)
      if (errUp) throw errUp

      const { data: { publicUrl } } = supabase.storage.from('documentos_sigmo').getPublicUrl(ruta)
      const { data: { user } } = await supabase.auth.getUser()

      // El nuevo archivo pasa a ser el vigente
      await supabase.from(tabla).update({ es_vigente: false }).eq('es_vigente', true)
      const { data, error: errIns } = await supabase.from(tabla)
        .insert({ nombre_archivo: file.name, url_archivo: publicUrl, subido_por: user?.email || null, es_vigente: true })
        .select()
      if (errIns) throw errIns
      if (!data || data.length === 0) throw new Error('Insert bloqueado por RLS (revisa las políticas de la tabla)')

      await registrarAuditoria(data[0].id, file.name, 'SUBIDA', esTope ? 'topes' : 'precios')
      toast.success(esTope ? 'Topes subidos y marcados como vigentes' : 'Lista subida y marcada como vigente')
      if (esTope) fetchArchivosTopes(); else fetchArchivos()
    } catch (error) {
      toast.error('Error al subir: ' + error.message)
      throw error // el Cargador conserva la vista previa para reintentar
    }
  }

  async function marcarComoVigente(id, nombre, tipo) {
    const tabla = tipo === 'precios' ? 'precios_archivos' : 'topes_archivos'
    await supabase.from(tabla).update({ es_vigente: false }).eq('es_vigente', true)
    await supabase.from(tabla).update({ es_vigente: true }).eq('id', id)
    await registrarAuditoria(id, nombre, 'VIGENTE', tipo)
    toast.success('Vigente actualizado')
    if (tipo === 'precios') fetchArchivos(); else fetchArchivosTopes()
  }

  async function eliminarArchivo(archivo, onSuccess) {
    const esTope = archivo.tipo === 'topes'
    const tabla = esTope ? 'topes_archivos' : 'precios_archivos'
    try {
      await supabase.storage.from('documentos_sigmo').remove([archivo.url_archivo.split('/documentos_sigmo/')[1]])
      await supabase.from(tabla).delete().eq('id', archivo.id)
      await registrarAuditoria(archivo.id, archivo.nombre_archivo, 'ELIMINACION', esTope ? 'topes' : 'precios')
      toast.success('Archivo eliminado correctamente')
      if (onSuccess) onSuccess()
      if (esTope) fetchArchivosTopes(); else fetchArchivos()
    } catch (error) {
      toast.error('Error al eliminar: ' + error.message)
    }
  }

  const actualizarFiltros = (cambios) => setFiltrosTendencias(prev => ({ ...prev, ...cambios }))

  const Header = ({ titulo, onVolver, textoVolver = '← Volver al Menú' }) => (
    <header style={{ padding: '20px 40px', display: 'flex', alignItems: 'center', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
      <button onClick={onVolver} style={btnHeaderStyle}>{textoVolver}</button>
      <h1 style={{ margin: '0 0 0 15px', color: 'var(--primary-blue)', fontSize: '28px', fontWeight: '900' }}>{titulo}</h1>
    </header>
  )

  // ----------------------------------------------------------
  // MENÚ PRINCIPAL
  // ----------------------------------------------------------
  if (vista === 'menu') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
        <Header titulo="Precios, Topes & Cotización" onVolver={() => setPantalla('')} textoVolver="← SIGMO" />
        <main style={{ padding: '40px 20px', maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <div onClick={() => setVista('visualizar')} style={cardStyle}>
              <div style={{ fontSize: '50px', marginBottom: '15px' }}>👁️</div>
              <h3 style={{ color: 'var(--primary-blue)', marginBottom: '10px', fontSize: '18px' }}>Visualizar Listas & Topes</h3>
              <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Ver, comparar y descargar archivos Excel.</p>
            </div>
            {puedeCargar && (
              <div onClick={() => setVista('cargar')} style={cardStyle}>
                <div style={{ fontSize: '50px', marginBottom: '15px' }}>📤</div>
                <h3 style={{ color: 'var(--primary-blue)', marginBottom: '10px', fontSize: '18px' }}>Cargar Nueva Lista & Topes</h3>
                <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Sube y previsualiza archivos Excel.</p>
              </div>
            )}
            <div onClick={() => setVista('tendencias')} style={cardStyle}>
              <div style={{ fontSize: '50px', marginBottom: '15px' }}>📈</div>
              <h3 style={{ color: 'var(--primary-blue)', marginBottom: '10px', fontSize: '18px' }}>Gráfico de Tendencias</h3>
              <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Evolución histórica desde la base de datos.</p>
            </div>
            <div onClick={() => setVista('cotizar')} style={cardStyle}>
              <div style={{ fontSize: '50px', marginBottom: '15px' }}>🧾</div>
              <h3 style={{ color: 'var(--primary-blue)', marginBottom: '10px', fontSize: '18px' }}>Cotizar</h3>
              <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Genera cotizaciones con precios y topes vigentes.</p>
            </div>
            <div onClick={() => setVista('historial')} style={cardStyle}>
              <div style={{ fontSize: '50px', marginBottom: '15px' }}>📚</div>
              <h3 style={{ color: 'var(--primary-blue)', marginBottom: '10px', fontSize: '18px' }}>Historial de Cotizaciones</h3>
              <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Consulta y elimina cotizaciones guardadas.</p>
            </div>
            <div onClick={() => setVista('auditoria')} style={cardStyle}>
              <div style={{ fontSize: '50px', marginBottom: '15px' }}>📋</div>
              <h3 style={{ color: 'var(--primary-blue)', marginBottom: '10px', fontSize: '18px' }}>Auditoría General</h3>
              <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Historial de cambios.</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // ----------------------------------------------------------
  // DELEGACIÓN A SUB-COMPONENTES (con los props que esperan)
  // ----------------------------------------------------------
  if (vista === 'visualizar') {
    return (
      <VisualizadorPrecios
        archivos={archivos}
        archivosTopes={archivosTopes}
        puedeGestionar={puedeGestionar}
        onMarcarVigente={marcarComoVigente}
        onEliminar={eliminarArchivo}
        onIrComparar={() => setVista('comparar')}
        onVolver={() => setVista('menu')}
      />
    )
  }
  if (vista === 'cargar') {
    return <CargadorPrecios puedeCargar={puedeCargar} onVolver={() => setVista('menu')} onSubirExitoso={subirArchivo} />
  }
  if (vista === 'comparar') {
    return <ComparadorPrecios archivos={archivos} archivosTopes={archivosTopes} onVolver={() => setVista('visualizar')} />
  }
  if (vista === 'cotizar') {
    return <CotizadorPrecios archivos={archivos} archivosTopes={archivosTopes} onVolver={() => setVista('menu')} onCotizacionGuardada={() => {}} />
  }
  if (vista === 'historial') {
    return <HistorialCotizaciones onVolver={() => setVista('menu')} />
  }

  // ----------------------------------------------------------
  // TENDENCIAS (módulo nuevo con hook de BD + filtros propios)
  // ----------------------------------------------------------
  if (vista === 'tendencias') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
        <Header titulo="Tendencias de Precios" onVolver={() => setVista('menu')} />
        <main style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
          <Card style={{ padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '12px' }}>📅 Desde</label>
                <input type="date" value={filtrosTendencias.fechaDesde} onChange={e => actualizarFiltros({ fechaDesde: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '12px' }}>📅 Hasta</label>
                <input type="date" value={filtrosTendencias.fechaHasta} onChange={e => actualizarFiltros({ fechaHasta: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '12px' }}>🏭 Planta</label>
                <select value={filtrosTendencias.plantaSeleccionada} onChange={e => actualizarFiltros({ plantaSeleccionada: e.target.value })} style={inputStyle}>
                  <option value="">Todas las plantas</option>
                  {catalogos.plantas.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '12px' }}>🛢️ Productos (Ctrl+Click para varios)</label>
                <select multiple value={filtrosTendencias.productosSeleccionados} onChange={e => actualizarFiltros({ productosSeleccionados: Array.from(e.target.selectedOptions, o => o.value) })} style={{ ...inputStyle, minHeight: '60px' }}>
                  {catalogos.productos.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </Card>
          {cargandoCatalogos ? (
            <Card style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>⏳</div>
              <p style={{ color: 'var(--primary-blue)', fontWeight: 'bold' }}>Cargando catálogos...</p>
            </Card>
          ) : (
            <TendenciasPrecios
              filtros={{
                fechaDesde: filtrosTendencias.fechaDesde,
                fechaHasta: filtrosTendencias.fechaHasta,
                productos: filtrosTendencias.productosSeleccionados.length > 0
                  ? filtrosTendencias.productosSeleccionados
                  : catalogos.productos,
                planta: filtrosTendencias.plantaSeleccionada || null,
              }}
            />
          )}
        </main>
      </div>
    )
  }

  // ----------------------------------------------------------
  // AUDITORÍA
  // ----------------------------------------------------------
  if (vista === 'auditoria') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
        <Header titulo="Auditoría General" onVolver={() => setVista('menu')} />
        <main style={{ padding: '40px 20px', maxWidth: '1000px', margin: '0 auto' }}>
          <Card>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead style={{ backgroundColor: 'var(--primary-blue)', color: 'white' }}>
                <tr><th style={{ padding: '12px' }}>FECHA</th><th style={{ padding: '12px' }}>MÓDULO</th><th style={{ padding: '12px' }}>ACCIÓN</th><th style={{ padding: '12px' }}>ARCHIVO</th></tr>
              </thead>
              <tbody>
                {(auditoria || []).map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px' }}>{new Date(log.created_at).toLocaleString()}</td>
                    <td style={{ padding: '12px', fontWeight: 'bold', color: log.origen === 'TOPES' ? '#059669' : 'var(--primary-blue)' }}>{log.origen}</td>
                    <td style={{ padding: '12px' }}>{log.accion}</td>
                    <td style={{ padding: '12px' }}>{log.nombre_archivo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </main>
      </div>
    )
  }

  return null
}