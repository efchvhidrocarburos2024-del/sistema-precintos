// src/components/precios/GestionPrecios.jsx
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../../supabase'

// Importación de sub-componentes existentes
// Asegúrate de que estos archivos existan en la misma carpeta 'precios'
// Si alguno falta, crea un archivo dummy temporalmente para evitar crash
import CargadorPrecios from './CargadorPrecios' 
import ComparadorPrecios from './ComparadorPrecios'
import CotizadorPrecios from './CotizadorPrecios'
import HistorialCotizaciones from './HistorialCotizaciones'
import VisualizadorPrecios from './VisualizadorPrecios'

// IMPORTACIÓN DEL NUEVO COMPONENTE REFACTORIZADO
import TendenciasPrecios from './TendenciasPrecios' 

const PALETA = {
  azulProfundo: '#0033A0',
  cyanVibrante: '#00AEEF',
  blanco: '#FFFFFF',
  grisClaro: '#F5F5F5',
  grisMedio: '#CCCCCC',
}

const TABS = [
  { id: 'visualizador', label: '📊 Visualizador', icon: '📊' },
  { id: 'tendencias', label: '📈 Tendencias', icon: '📈' }, 
  { id: 'cotizador', label: ' Cotizador', icon: '🧮' },
  { id: 'historial', label: '🕘 Historial', icon: '🕘' },
  { id: 'comparador', label: '⚖️ Comparador', icon: '⚖️' },
  { id: 'cargador', label: '📤 Cargar Listas', icon: '📤' },
]

export default function GestionPrecios({ rol }) {
  const [tabActiva, setTabActiva] = useState('visualizador')
  
  // Estado inicial seguro para filtros
  const hoy = new Date().toISOString().split('T')[0]
  const inicioAnio = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]

  const [filtrosGlobales, setFiltrosGlobales] = useState({
    fechaDesde: inicioAnio,
    fechaHasta: hoy,
    productosSeleccionados: [],
    plantaSeleccionada: '',
  })

  const [catalogos, setCatalogos] = useState({ plantas: [], productos: [] })
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true)

  // Carga inicial de catálogos con manejo de errores
  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        console.log('📡 Cargando catálogos de precios...')
        
        const [resPlantas, resProductos] = await Promise.all([
          supabase.from('plantas').select('nombre, activo').eq('activo', true).order('nombre'),
          supabase.from('productos').select('nombre, activo').eq('activo', true).order('nombre'),
        ])

        if (resPlantas.error) throw resPlantas.error
        if (resProductos.error) throw resProductos.error

        const plantasData = resPlantas.data || []
        const productosData = resProductos.data || []

        setCatalogos({
          plantas: plantasData.map(p => p.nombre),
          productos: productosData.map(p => p.nombre),
        })
        console.log('✅ Catálogos cargados:', plantasData.length, 'plantas,', productosData.length, 'productos')
      } catch (err) {
        console.error('❌ Error cargando catálogos:', err)
        toast.error('No se pudieron cargar los catálogos base. Usando lista vacía.')
        // No lanzar error, dejar arrays vacíos para evitar crash
      } finally {
        setCargandoCatalogos(false)
      }
    }
    cargarCatalogos()
  }, [])

  const actualizarFiltros = (nuevosFiltros) => {
    setFiltrosGlobales(prev => ({ ...prev, ...nuevosFiltros }))
  }

  const renderContenido = () => {
    if (cargandoCatalogos) {
      return (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: PALETA.grisMedio }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <h3 style={{ color: PALETA.azulProfundo }}>Cargando catálogos...</h3>
          <p>Por favor espera mientras obtenemos la información de plantas y productos.</p>
        </div>
      )
    }

    // Validación de seguridad antes de renderizar cualquier cosa
    if (!Array.isArray(catalogos.plantas) || !Array.isArray(catalogos.productos)) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', color: PALETA.peligro }}>
          <h3>⚠️ Error de datos</h3>
          <p>Los catálogos no se han cargado correctamente. Intenta recargar la página.</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: '16px', padding: '8px 16px', background: PALETA.azulProfundo, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            Recargar
          </button>
        </div>
      )
    }

    switch (tabActiva) {
      case 'visualizador':
        return <VisualizadorPrecios filtros={filtrosGlobales} catalogos={catalogos} />
      
      case 'tendencias':
        // INTEGRACIÓN DEL NUEVO MÓDULO CON VALIDACIONES
        return (
          <TendenciasPrecios 
            filtros={{
              fechaDesde: filtrosGlobales.fechaDesde,
              fechaHasta: filtrosGlobales.fechaHasta,
              // Si no hay selección, pasar todos los productos disponibles (o array vacío si no hay)
              productos: filtrosGlobales.productosSeleccionados.length > 0 
                ? filtrosGlobales.productosSeleccionados 
                : catalogos.productos, 
              planta: filtrosGlobales.plantaSeleccionada || null,
            }} 
          />
        )

      case 'cotizador':
        return <CotizadorPrecios catalogos={catalogos} />

      case 'historial':
        return <HistorialCotizaciones filtros={filtrosGlobales} />

      case 'comparador':
        return <ComparadorPrecios filtros={filtrosGlobales} catalogos={catalogos} />

      case 'cargador':
        return <CargadorPrecios onCargaExitosa={() => {
          toast.success('Listas actualizadas')
          // Opcional: recargar catálogos si es necesario
        }} />

      default:
        return (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <h3>⚠️ Módulo no disponible</h3>
            <p>La sección seleccionada está en mantenimiento o no existe.</p>
          </div>
        )
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: PALETA.grisClaro }}>
      {/* Header */}
      <header style={{
        background: PALETA.azulProfundo,
        color: PALETA.blanco,
        padding: '20px 24px',
        boxShadow: '0 4px 12px rgba(0,51,160,0.15)',
      }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 900 }}>Gestión de Precios</h1>
        <p style={{ margin: '4px 0 0', opacity: 0.9, fontSize: '14px' }}>
          Control, análisis y proyección de listas de precios hidrocarburos
        </p>
      </header>

      {/* Tabs */}
      <nav style={{
        background: PALETA.blanco,
        padding: '0 24px',
        borderBottom: `1px solid ${PALETA.grisMedio}`,
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setTabActiva(tab.id)}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: tabActiva === tab.id ? `${PALETA.cyanVibrante}15` : 'transparent',
              color: tabActiva === tab.id ? PALETA.azulProfundo : PALETA.grisMedio,
              fontWeight: tabActiva === tab.id ? 700 : 600,
              borderBottom: tabActiva === tab.id ? `3px solid ${PALETA.cyanVibrante}` : '3px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
              fontSize: '14px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Filtros Globales */}
      <div style={{
        padding: '16px 24px',
        background: PALETA.blanco,
        borderBottom: `1px solid ${PALETA.grisMedio}`,
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap',
        alignItems: 'flex-end',
      }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, color: PALETA.azulProfundo }}>Fecha Desde</label>
          <input type="date" value={filtrosGlobales.fechaDesde} onChange={e => actualizarFiltros({ fechaDesde: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${PALETA.grisMedio}`, fontSize: '13px' }} />
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, color: PALETA.azulProfundo }}>Fecha Hasta</label>
          <input type="date" value={filtrosGlobales.fechaHasta} onChange={e => actualizarFiltros({ fechaHasta: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${PALETA.grisMedio}`, fontSize: '13px' }} />
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, color: PALETA.azulProfundo }}>Planta</label>
          <select value={filtrosGlobales.plantaSeleccionada} onChange={e => actualizarFiltros({ plantaSeleccionada: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${PALETA.grisMedio}`, fontSize: '13px', background: PALETA.blanco }}>
            <option value="">Todas las plantas</option>
            {catalogos.plantas && catalogos.plantas.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div style={{ flex: '2 1 300px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, color: PALETA.azulProfundo }}>Productos</label>
          <select multiple value={filtrosGlobales.productosSeleccionados} onChange={e => { const options = Array.from(e.target.selectedOptions, option => option.value); actualizarFiltros({ productosSeleccionados: options }); }} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${PALETA.grisMedio}`, fontSize: '13px', minHeight: '38px', background: PALETA.blanco }}>
            {catalogos.productos && catalogos.productos.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <span style={{ fontSize: '11px', color: PALETA.grisMedio, marginTop: '4px', display: 'block' }}>Ctrl + Click para varios</span>
        </div>
      </div>

      {/* Contenido Principal */}
      <main style={{ flex: 1, padding: '24px', overflowY: 'auto', background: PALETA.grisClaro }}>
        {renderContenido()}
      </main>
    </div>
  )
}