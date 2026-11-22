import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'
import { Card } from './ui'

// Importar módulos refactorizados
import {
  VisualizadorPrecios,
  CargadorPrecios,
  ComparadorPrecios,
  TendenciasPrecios,
  CotizadorPrecios,
  HistorialCotizaciones
} from './precios'

export default function GestionPrecios({ setPantalla, rol }) {
  const [vista, setVista] = useState('menu')
  
  // Estados globales compartidos
  const [archivos, setArchivos] = useState([])
  const [archivosTopes, setArchivosTopes] = useState([])
  const [opcionesPlantas, setOpcionesPlantas] = useState([])
  const [opcionesProductos, setOpcionesProductos] = useState([])
  const [auditoria, setAuditoria] = useState([])

  const puedeCargar = ['admin_sistema', 'analista_comercial', 'jefe_pricing'].includes(rol)
  const puedeGestionar = ['admin_sistema', 'jefe_pricing'].includes(rol)

  // Cargas iniciales
  useEffect(() => {
    if (vista === 'menu') return
    if (vista === 'visualizar' || vista === 'comparar' || vista === 'tendencias' || vista === 'cotizar') {
      fetchArchivos()
      fetchArchivosTopes()
    }
    if (vista === 'auditoria') fetchAuditoria()
  }, [vista])

  // Cargar opciones para tendencias/cotizador
  useEffect(() => {
    if ((vista === 'tendencias' || vista === 'cotizar') && archivos.length > 0 && opcionesPlantas.length === 0) {
      cargarOpciones()
    }
  }, [vista, archivos, opcionesPlantas.length])

  const fetchArchivos = async () => {
    const { data } = await supabase.from('precios_archivos').select('*')
    if (data) setArchivos(data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
  }

  const fetchArchivosTopes = async () => {
    const { data } = await supabase.from('topes_archivos').select('*').order('created_at', { ascending: false })
    if (data) setArchivosTopes(data)
  }

  const fetchAuditoria = async () => {
    const { data: pAud } = await supabase.from('precios_auditoria').select('*').order('created_at', { ascending: false })
    const { data: tAud } = await supabase.from('topes_auditoria').select('*').order('created_at', { ascending: false })
    setAuditoria([...(pAud || []).map(x => ({...x, origen: 'PRECIOS'})), ...(tAud || []).map(x => ({...x, origen: 'TOPES'}))].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
  }

  const cargarOpciones = async () => {
    // Lógica simplificada para extraer opciones del primer archivo vigente o el más reciente
    // En una app real, esto podría venir de una tabla de catálogos
    const { data } = await supabase.from('precios_archivos').select('*').order('created_at', { ascending: false }).limit(1)
    if (data && data[0]) {
      // Simulación: en producción usa la función parseExcelFile real
      setOpcionesPlantas(['TODOS', 'PAMPILLA', 'CONCHAN', 'SULLANA']) 
      setOpcionesProductos(['TODOS', 'GASOLINA 95', 'GASOLINA 97', 'DIESEL B5 S-50'])
    }
  }

  const marcarComoVigente = async (id, nombre, tipo) => {
    const tabla = tipo === 'precios' ? 'precios_archivos' : 'topes_archivos'
    await supabase.from(tabla).update({ es_vigente: false }).eq('es_vigente', true)
    await supabase.from(tabla).update({ es_vigente: true }).eq('id', id)
    toast.success('Vigente actualizado')
    if (tipo === 'precios') fetchArchivos(); else fetchArchivosTopes()
  }

  const eliminarArchivo = async (archivo, onSuccess) => {
    const tabla = archivo.tipo === 'topes' ? 'topes_archivos' : 'precios_archivos'
    try {
      await supabase.storage.from('documentos_sigmo').remove([archivo.url_archivo.split('/documentos_sigmo/')[1]])
      await supabase.from(tabla).delete().eq('id', archivo.id)
      toast.success('Archivo eliminado correctamente')
      onSuccess()
      if (archivo.tipo === 'precios') fetchArchivos(); else fetchArchivosTopes()
    } catch (error) {
      toast.error('Error al eliminar: ' + error.message)
    }
  }

  const cardStyle = {
    backgroundColor: 'white', borderRadius: '12px', padding: '30px 20px', textAlign: 'center',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '2px solid transparent', cursor: 'pointer',
    transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
  }

  // Renderizado condicional del módulo
  if (vista === 'menu') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
        <header style={{ padding: '20px 40px', display: 'flex', alignItems: 'center', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <button onClick={() => setPantalla('')} style={{ background: '#f3f4f6', border: '1px solid #d1d5db', color: '#374151', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>← SIGMO</button>
          <h1 style={{ margin: '0 0 0 15px', color: 'var(--primary-blue)', fontSize: '28px', fontWeight: '900' }}>Precios, Topes & Cotización</h1>
        </header>
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
              <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Evolución histórica.</p>
            </div>
            <div onClick={() => setVista('cotizar')} style={cardStyle}>
              <div style={{ fontSize: '50px', marginBottom: '15px' }}>🧾</div>
              <h3 style={{ color: 'var(--primary-blue)', marginBottom: '10px', fontSize: '18px' }}>Cotizar</h3>
              <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Genera cotizaciones con precios y topes vigentes.</p>
            </div>
            <div onClick={() => setVista('historial')} style={cardStyle}>
              <div style={{ fontSize: '50px', marginBottom: '15px' }}>📚</div>
              <h3 style={{ color: 'var(--primary-blue)', marginBottom: '10px', fontSize: '18px' }}>Historial de Cotizaciones</h3>
              <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Consulta y reenvía cotizaciones guardadas.</p>
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

  // Delegación a sub-componentes
  if (vista === 'visualizar') {
    return <VisualizadorPrecios archivos={archivos} archivosTopes={archivosTopes} puedeGestionar={puedeGestionar} onMarcarVigente={marcarComoVigente} onEliminar={eliminarArchivo} onIrComparar={(tipo) => setVista('comparar')} onVolver={() => setVista('menu')} />
  }
  if (vista === 'cargar') {
    return <CargadorPrecios puedeCargar={puedeCargar} onVolver={() => setVista('menu')} onSubirExitoso={async (file, esTope) => {
      // Lógica de subida simplificada para el ejemplo
      toast.success('Archivo subido correctamente (simulado)')
      esTope ? fetchArchivosTopes() : fetchArchivos()
    }} />
  }
  if (vista === 'comparar') {
    return <ComparadorPrecios archivos={archivos} archivosTopes={archivosTopes} onVolver={() => setVista('visualizar')} />
  }
  if (vista === 'tendencias') {
    return <TendenciasPrecios archivos={archivos} opcionesPlantas={opcionesPlantas} opcionesProductos={opcionesProductos} onVolver={() => setVista('menu')} />
  }
  if (vista === 'cotizar') {
    return <CotizadorPrecios archivos={archivos} archivosTopes={archivosTopes} onVolver={() => setVista('menu')} onCotizacionGuardada={() => {}} />
  }
  if (vista === 'historial') {
    return <HistorialCotizaciones onVolver={() => setVista('menu')} />
  }
  if (vista === 'auditoria') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
        <header style={{ padding: '20px 40px', display: 'flex', alignItems: 'center', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <button onClick={() => setVista('menu')} style={{ background: '#f3f4f6', border: '1px solid #d1d5db', color: '#374151', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>← Volver al Menú</button>
          <h1 style={{ margin: '0 0 0 15px', color: 'var(--primary-blue)', fontSize: '28px', fontWeight: '900' }}>Auditoría General</h1>
        </header>
        <main style={{ padding: '40px 20px', maxWidth: '1000px', margin: '0 auto' }}>
          <Card>
            <h2>Auditoría General</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead style={{ backgroundColor: 'var(--primary-blue)', color: 'white' }}>
                <tr><th style={{ padding: '12px' }}>FECHA</th><th style={{ padding: '12px' }}>MÓDULO</th><th style={{ padding: '12px' }}>ACCIÓN</th><th style={{ padding: '12px' }}>ARCHIVO</th></tr>
              </thead>
              <tbody>
                {auditoria.map(log => (
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