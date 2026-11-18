import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function Dashboard() {
  const [conteos, setConteos] = useState({
    DISPONIBLE: 0, ASIGNADO: 0, DEVUELTO: 0, EN_MAL_ESTADO: 0, ROTO_EN_USO: 0, BAJA: 0
  })
  const [datosPlantas, setDatosPlantas] = useState([])
  const [historial, setHistorial] = useState([])
  const [cargando, setCargando] = useState(true)
  
  // NUEVO ESTADO PARA EL FILTRO DE FECHA
  const [filtroFecha, setFiltroFecha] = useState('todo')

  // FUNCIÓN PARA CALCULAR RANGO DE FECHAS
  const obtenerRangoFechas = () => {
    const ahora = new Date()
    let inicio = null
    let fin = new Date().toISOString()

    if (filtroFecha === 'este_mes') {
      inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString()
    } else if (filtroFecha === 'mes_pasado') {
      inicio = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1).toISOString()
      fin = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59).toISOString()
    } else if (filtroFecha === 'este_ano') {
      inicio = new Date(ahora.getFullYear(), 0, 1).toISOString()
    } else if (filtroFecha === 'ultimos_30_dias') {
      const hace30Dias = new Date()
      hace30Dias.setDate(hace30Dias.getDate() - 30)
      inicio = hace30Dias.toISOString()
    }
    
    return { inicio, fin }
  }

  useEffect(() => {
    async function cargarDatos() {
      setCargando(true)
      const { inicio, fin } = obtenerRangoFechas()

      // 1. Traer precintos con el nombre de su planta (aplicando filtro de fecha)
      let queryPrecintos = supabase.from('precintos').select('estado, plantas(nombre)')
      if (inicio) {
        queryPrecintos = queryPrecintos.gte('fecha_recepcion', inicio).lte('fecha_recepcion', fin)
      }
      
      const { data: precintos } = await queryPrecintos
      
      if (precintos) {
        const nuevosConteos = { DISPONIBLE: 0, ASIGNADO: 0, DEVUELTO: 0, EN_MAL_ESTADO: 0, ROTO_EN_USO: 0, BAJA: 0 }
        const conteoPlantas = {}

        precintos.forEach(p => {
          if (nuevosConteos[p.estado] !== undefined) nuevosConteos[p.estado]++
          
          const nombrePlanta = p.plantas?.nombre || 'Sin Planta'
          conteoPlantas[nombrePlanta] = (conteoPlantas[nombrePlanta] || 0) + 1
        })

        setConteos(nuevosConteos)

        const arrayPlantas = Object.keys(conteoPlantas).map(planta => ({
          name: planta,
          cantidad: conteoPlantas[planta]
        })).sort((a, b) => b.cantidad - a.cantidad)
        
        setDatosPlantas(arrayPlantas)
      }

      // 2. Traer los últimos 15 eventos del historial (aplicando filtro de fecha)
      let queryHistorial = supabase
        .from('precintos_historial')
        .select(`
          id_historial, estado_anterior, estado_nuevo, accion_realizada, fecha, precintos (correlativo)
        `)
        .order('fecha', { ascending: false })
        .limit(15)
        
      if (inicio) {
        queryHistorial = queryHistorial.gte('fecha', inicio).lte('fecha', fin)
      }

      const { data: hist } = await queryHistorial
      if (hist) setHistorial(hist)
      
      setCargando(false)
    }
    cargarDatos()
  }, [filtroFecha]) // Se vuelve a cargar cuando cambia el filtro

  const colores = {
    DISPONIBLE: '#16A34A', ASIGNADO: '#2563EB', DEVUELTO: '#D97706',
    EN_MAL_ESTADO: '#B45309', ROTO_EN_USO: '#DC2626', BAJA: '#6B7280'
  }

  const datosTorta = Object.entries(conteos)
    .map(([name, value]) => ({ name, value }))
    .filter(item => item.value > 0)

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', fontFamily: 'Arial', padding: '20px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
        <h2 style={{ color: '#0B5FA5', margin: 0 }}>Panel de Control y Auditoría</h2>
        
        {/* SELECTOR DE FECHA */}
        <select 
          value={filtroFecha} 
          onChange={(e) => setFiltroFecha(e.target.value)}
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white', color: 'black', fontWeight: 'bold' }}
        >
          <option value="todo">Todo el tiempo (Histórico)</option>
          <option value="este_mes">Este Mes</option>
          <option value="mes_pasado">Mes Pasado</option>
          <option value="ultimos_30_dias">Últimos 30 días</option>
          <option value="este_ano">Este Año</option>
        </select>
      </div>
      
      {cargando ? <p style={{ textAlign: 'center', padding: '50px' }}>Cargando datos...</p> : (
        <>
          {/* TARJETAS DE ESTADOS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '15px', marginBottom: '30px' }}>
            {Object.entries(conteos).map(([estado, cantidad]) => (
              <div key={estado} style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderTop: `4px solid ${colores[estado]}`, textAlign: 'center' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#666' }}>{estado.replace(/_/g, ' ')}</h4>
                <span style={{ fontSize: '24px', fontWeight: 'bold', color: colores[estado] }}>{cantidad}</span>
              </div>
            ))}
          </div>

          {/* GRÁFICOS */}
          <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 400px', backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h3 style={{ marginTop: 0, textAlign: 'center', fontSize: '16px', color: '#444' }}>Distribución por Estado</h3>
              {datosTorta.length === 0 ? <p style={{ textAlign: 'center', color: '#999' }}>No hay datos en este periodo</p> : (
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={datosTorta} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                        {datosTorta.map((entry, index) => <Cell key={`cell-${index}`} fill={colores[entry.name]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div style={{ flex: '1 1 400px', backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h3 style={{ marginTop: 0, textAlign: 'center', fontSize: '16px', color: '#444' }}>Precintos por Planta</h3>
              {datosPlantas.length === 0 ? <p style={{ textAlign: 'center', color: '#999' }}>No hay datos en este periodo</p> : (
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={datosPlantas} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{fontSize: 12}} />
                      <YAxis />
                      <Tooltip cursor={{fill: '#f3f4f6'}} />
                      <Bar dataKey="cantidad" fill="#0B5FA5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* TABLA DE HISTORIAL */}
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0, borderBottom: '2px solid #eee', paddingBottom: '10px' }}>Últimos Movimientos (Bitácora Inmutable)</h3>
            
            {historial.length === 0 ? <p style={{ color: '#666' }}>No hay movimientos en este periodo.</p> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd', backgroundColor: '#f9fafb' }}>
                      <th style={{ padding: '10px' }}>Fecha / Hora</th>
                      <th style={{ padding: '10px' }}>Precinto</th>
                      <th style={{ padding: '10px' }}>Cambio de Estado</th>
                      <th style={{ padding: '10px' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map((h) => (
                      <tr key={h.id_historial} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '10px', color: '#666' }}>{new Date(h.fecha).toLocaleString()}</td>
                        <td style={{ padding: '10px', fontWeight: 'bold' }}>{h.precintos?.correlativo}</td>
                        <td style={{ padding: '10px' }}>
                          <span style={{ color: '#999' }}>{h.estado_anterior || 'NUEVO'}</span> 
                          <span style={{ margin: '0 5px' }}>➔</span> 
                          <span style={{ fontWeight: 'bold', color: colores[h.estado_nuevo] }}>{h.estado_nuevo}</span>
                        </td>
                        <td style={{ padding: '10px', color: '#444' }}>{h.accion_realizada}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}