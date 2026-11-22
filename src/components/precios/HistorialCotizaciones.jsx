import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { Card, Boton } from '../ui'
import toast from 'react-hot-toast'

const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', boxSizing: 'border-box' }

export default function HistorialCotizaciones({ onVolver }) {
  const [historial, setHistorial] = useState([])
  const [cargando, setCargando] = useState(false)
  const [filtroBusqueda, setFiltroBusqueda] = useState('')
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')
  const [filtrado, setFiltrado] = useState([])

  const cargarHistorial = async () => {
    setCargando(true)
    const { data, error } = await supabase.from('cotizaciones').select('*').order('creado_en', { ascending: false })
    if (error) toast.error('Error al cargar historial: ' + error.message)
    else setHistorial(data || [])
    setCargando(false)
  }

  useEffect(() => { cargarHistorial() }, [])

  useEffect(() => {
    let res = [...historial]
    if (filtroDesde) res = res.filter(c => c.fecha_cotizacion >= filtroDesde)
    if (filtroHasta) res = res.filter(c => c.fecha_cotizacion <= filtroHasta)
    if (filtroBusqueda.trim()) {
      const q = filtroBusqueda.toLowerCase()
      res = res.filter(c => 
        c.numero_cotizacion.toLowerCase().includes(q) ||
        (c.cliente || '').toLowerCase().includes(q) ||
        c.planta.toLowerCase().includes(q) ||
        c.producto.toLowerCase().includes(q) ||
        c.almacen.toLowerCase().includes(q)
      )
    }
    setFiltrado(res)
  }, [historial, filtroBusqueda, filtroDesde, filtroHasta])

  const eliminarCotizacion = async (id, numero) => {
    if (!confirm(`¿Eliminar la cotización ${numero}?`)) return
    const { error } = await supabase.from('cotizaciones').delete().eq('id', id)
    if (error) toast.error('Error al eliminar: ' + error.message)
    else {
      toast.success('Cotización eliminada')
      setHistorial(prev => prev.filter(c => c.id !== id))
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
      <header style={{ padding: '20px 40px', display: 'flex', alignItems: 'center', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <button onClick={onVolver} style={{ background: '#f3f4f6', border: '1px solid #d1d5db', color: '#374151', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>← Volver al Menú</button>
        <h1 style={{ margin: '0 0 0 15px', color: 'var(--primary-blue)', fontSize: '28px', fontWeight: '900' }}>Historial de Cotizaciones</h1>
      </header>
      <main style={{ padding: '40px 20px', maxWidth: '1400px', margin: '0 auto' }}>
        <Card style={{ padding: '20px', marginBottom: '20px' }}>
          <h2 style={{ margin: '0 0 15px 0', fontSize: '22px', color: 'var(--text-dark)' }}>📚 Consulta de Cotizaciones</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
            <div><label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '12px' }}>🔍 Buscar (N°, cliente, planta, producto)</label><input type="text" value={filtroBusqueda} onChange={(e) => setFiltroBusqueda(e.target.value)} placeholder="Ej: COT-2026, CALLAO..." style={inputStyle} /></div>
            <div><label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '12px' }}>📅 Desde</label><input type="date" value={filtroDesde} onChange={(e) => setFiltroDesde(e.target.value)} style={inputStyle} /></div>
            <div><label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '12px' }}>📅 Hasta</label><input type="date" value={filtroHasta} onChange={(e) => setFiltroHasta(e.target.value)} style={inputStyle} /></div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}><Boton variante="outline" onClick={() => { setFiltroBusqueda(''); setFiltroDesde(''); setFiltroHasta('') }}>🔄 Limpiar filtros</Boton></div>
          </div>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '8px', fontSize: '13px' }}>
            <span><strong>Total:</strong> {filtrado.length} cotización(es)</span>
            <span><strong>Monto total filtrado:</strong> S/ {filtrado.reduce((s, c) => s + (c.total || 0), 0).toFixed(2)}</span>
          </div>
        </Card>

        {cargando ? (
          <Card style={{ padding: '40px', textAlign: 'center' }}><div style={{ fontSize: '40px', marginBottom: '10px' }}>⏳</div><p>Cargando historial...</p></Card>
        ) : filtrado.length === 0 ? (
          <Card style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '50px', marginBottom: '10px' }}>📭</div>
            <h3 style={{ margin: '0 0 10px 0', color: 'var(--text-dark)' }}>{historial.length === 0 ? 'No hay cotizaciones guardadas' : 'Sin resultados para los filtros aplicados'}</h3>
          </Card>
        ) : (
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead style={{ backgroundColor: 'var(--primary-blue)', color: 'white' }}>
                  <tr>
                    <th style={{ padding: '12px 8px', textAlign: 'left' }}>N°</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left' }}>FECHA</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left' }}>CLIENTE</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left' }}>PLANTA</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left' }}>ALMACÉN</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left' }}>PRODUCTO</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right' }}>P. FINAL</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center' }}>CANT.</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right' }}>TOTAL</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrado.map((c, i) => (
                    <tr key={c.id} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#f9fafb', borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 'bold', color: 'var(--primary-blue)' }}>{c.numero_cotizacion}</td>
                      <td style={{ padding: '10px 8px' }}>{new Date(c.fecha_cotizacion).toLocaleDateString('es-PE')}</td>
                      <td style={{ padding: '10px 8px' }}>{c.cliente || '—'}</td>
                      <td style={{ padding: '10px 8px' }}>{c.planta}</td>
                      <td style={{ padding: '10px 8px' }}>{c.almacen}</td>
                      <td style={{ padding: '10px 8px' }}>{c.producto}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 'bold' }}>
                        S/ {(c.aplica_percepcion ? c.precio_final_con_percepcion : c.precio_final_sin_percepcion)?.toFixed(4)}
                        {c.aplica_percepcion && <span style={{ fontSize: '9px', color: '#059669', marginLeft: '4px' }}>(+perc)</span>}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>{c.cantidad > 0 ? Number(c.cantidad).toLocaleString('es-PE') : '—'}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 'bold', color: c.total > 0 ? '#059669' : '#6b7280' }}>{c.total > 0 ? `S/ ${Number(c.total).toFixed(2)}` : '—'}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}><Boton variante="danger" tamano="sm" onClick={() => eliminarCotizacion(c.id, c.numero_cotizacion)} title="Eliminar">🗑️</Boton></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </main>
    </div>
  )
}