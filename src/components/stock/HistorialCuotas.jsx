import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import toast from 'react-hot-toast'
import { Card, Boton } from '../ui'

export default function HistorialCuotas({ onVolver }) {
  const [historial, setHistorial] = useState([])
  const [filtros, setFiltros] = useState({
    fechaDesde: '',
    fechaHasta: '',
    planta_id: '',
    asesor_id: '',
    accion: ''
  })
  const [cargando, setCargando] = useState(false)
  const [plantas, setPlantas] = useState([])
  const [asesores, setAsesores] = useState([])

  useEffect(() => {
    const cargarCatalogos = async () => {
      const [p, a] = await Promise.all([
        supabase.from('plantas').select('id, nombre').eq('activo', true).order('nombre'),
        supabase.from('usuarios').select('id, nombre_completo').eq('rol_id', 'asesor_comercial').eq('activo', true).order('nombre_completo')
      ])
      setPlantas(p.data || [])
      setAsesores(a.data || [])
    }
    cargarCatalogos()
    buscarHistorial()
  }, [])

  const buscarHistorial = async () => {
    setCargando(true)
    try {
      let query = supabase
        .from('cuotas_historial')
        .select(`
          *,
          cuotas:cuota_id (
            planta_id,
            producto_id,
            tipo_registro,
            fecha_inicio,
            fecha_fin,
            plantas:planta_id (nombre),
            productos:producto_id (nombre)
          ),
          usuarios:usuario_id (nombre_completo)
        `)
        .order('creado_en', { ascending: false })

      if (filtros.fechaDesde) {
        query = query.gte('creado_en', filtros.fechaDesde)
      }
      if (filtros.fechaHasta) {
        query = query.lte('creado_en', filtros.fechaHasta + 'T23:59:59')
      }
      if (filtros.accion) {
        query = query.eq('accion', filtros.accion)
      }

      const { data, error } = await query

      if (error) throw error

      // Filtrar por planta y asesor en el cliente (porque están anidados)
      let resultados = data || []
      
      if (filtros.planta_id) {
        resultados = resultados.filter(h => h.cuotas?.planta_id === filtros.planta_id)
      }
      if (filtros.asesor_id) {
        resultados = resultados.filter(h => h.cuotas?.asesor_id === filtros.asesor_id)
      }

      setHistorial(resultados)
    } catch (error) {
      console.error(error)
      toast.error('Error al cargar historial')
    } finally {
      setCargando(false)
    }
  }

  const exportarCSV = () => {
    if (historial.length === 0) {
      return toast.error('No hay datos para exportar')
    }

    const headers = ['Fecha', 'Acción', 'Planta', 'Producto', 'Tipo', 'Período', 'Detalle', 'Usuario']
    const rows = historial.map(h => [
      new Date(h.creado_en).toLocaleString(),
      h.accion,
      h.cuotas?.plantas?.nombre || '-',
      h.cuotas?.productos?.nombre || '-',
      h.cuotas?.tipo_registro || '-',
      `${h.cuotas?.fecha_inicio} - ${h.cuotas?.fecha_fin}`,
      h.detalle,
      h.usuarios?.nombre_completo || '-'
    ])

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `historial_cuotas_${new Date().toISOString().split('T')[0]}.csv`
    link.click()

    toast.success('Archivo CSV descargado')
  }

  const getAccionColor = (accion) => {
    const colores = {
      'REGISTRO': '#059669',
      'ACTUALIZACION': '#0284c7',
      'SOLICITUD': '#7c3aed',
      'CESION_APROBADA': '#059669',
      'CESION_RECHAZADA': '#dc2626',
      'REASIGNACION': '#ea580c',
      'COMPENSACION': '#0891b2',
      'CANCELACION': '#dc2626'
    }
    return colores[accion] || '#6b7280'
  }

  return (
    <Card style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ color: '#0033A0', marginBottom: '20px' }}>📚 Historial de Cuotas</h2>

      {/* Filtros */}
      <div style={{ background: '#f9fafb', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 15px 0', color: '#374151' }}>🔍 Filtros de búsqueda</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold' }}>Desde</label>
            <input 
              type="date" 
              value={filtros.fechaDesde}
              onChange={(e) => setFiltros({...filtros, fechaDesde: e.target.value})}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold' }}>Hasta</label>
            <input 
              type="date" 
              value={filtros.fechaHasta}
              onChange={(e) => setFiltros({...filtros, fechaHasta: e.target.value})}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold' }}>Planta</label>
            <select 
              value={filtros.planta_id}
              onChange={(e) => setFiltros({...filtros, planta_id: e.target.value})}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
            >
              <option value="">Todas</option>
              {plantas.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold' }}>Asesor</label>
            <select 
              value={filtros.asesor_id}
              onChange={(e) => setFiltros({...filtros, asesor_id: e.target.value})}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
            >
              <option value="">Todos</option>
              {asesores.map(a => (
                <option key={a.id} value={a.id}>{a.nombre_completo}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold' }}>Tipo de acción</label>
            <select 
              value={filtros.accion}
              onChange={(e) => setFiltros({...filtros, accion: e.target.value})}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
            >
              <option value="">Todas</option>
              <option value="REGISTRO">Registro</option>
              <option value="ACTUALIZACION">Actualización</option>
              <option value="SOLICITUD">Solicitud</option>
              <option value="CESION_APROBADA">Cesión aprobada</option>
              <option value="CESION_RECHAZADA">Cesión rechazada</option>
              <option value="REASIGNACION">Reasignación</option>
              <option value="COMPENSACION">Compensación</option>
              <option value="CANCELACION">Cancelación</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
          <Boton variante="primary" onClick={buscarHistorial} disabled={cargando}>
            {cargando ? 'Buscando...' : '🔍 Buscar'}
          </Boton>
          <Boton variante="outline" onClick={exportarCSV}>
            📥 Exportar CSV
          </Boton>
        </div>
      </div>

      {/* Tabla de resultados */}
      {cargando ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: '#6b7280' }}>Cargando historial...</p>
        </div>
      ) : historial.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: '#6b7280' }}>No se encontraron registros</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#0033A0', color: 'white' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Fecha</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Acción</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Planta</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Producto</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Período</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Detalle</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Usuario</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((h, idx) => (
                <tr key={h.id} style={{ background: idx % 2 === 0 ? '#f9fafb' : 'white', borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px' }}>{new Date(h.creado_en).toLocaleString()}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '12px', 
                      fontSize: '11px', 
                      fontWeight: 'bold',
                      background: getAccionColor(h.accion) + '20',
                      color: getAccionColor(h.accion)
                    }}>
                      {h.accion.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>{h.cuotas?.plantas?.nombre || '-'}</td>
                  <td style={{ padding: '12px' }}>{h.cuotas?.productos?.nombre || '-'}</td>
                  <td style={{ padding: '12px' }}>{h.cuotas?.fecha_inicio} - {h.cuotas?.fecha_fin}</td>
                  <td style={{ padding: '12px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={h.detalle}>
                    {h.detalle}
                  </td>
                  <td style={{ padding: '12px' }}>{h.usuarios?.nombre_completo || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Botón volver */}
      <div style={{ marginTop: '20px', textAlign: 'right' }}>
        <Boton variante="outline" onClick={onVolver}>← Volver al menú</Boton>
      </div>
    </Card>
  )
}