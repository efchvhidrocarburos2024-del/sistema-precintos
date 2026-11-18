import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { PageHeader, Card, Select, Tabla, Spinner } from './ui'

export default function Dashboard() {
  const [conteos, setConteos] = useState({
    DISPONIBLE: 0, ASIGNADO: 0, DEVUELTO: 0, EN_MAL_ESTADO: 0, ROTO_EN_USO: 0, BAJA: 0
  })
  const [datosPlantas, setDatosPlantas] = useState([])
  const [historial, setHistorial] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtroFecha, setFiltroFecha] = useState('todo')

  // FUNCIÓN PARA CALCULAR RANGO DE FECHAS (intacta)
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

      // 1. Precintos con nombre de planta
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

      // 2. Últimos 15 eventos
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
  }, [filtroFecha])

  const colores = {
    DISPONIBLE: '#16A34A', ASIGNADO: '#2563EB', DEVUELTO: '#D97706',
    EN_MAL_ESTADO: '#B45309', ROTO_EN_USO: '#DC2626', BAJA: '#6B7280'
  }

  const datosTorta = Object.entries(conteos)
    .map(([name, value]) => ({ name, value }))
    .filter(item => item.value > 0)

  // Estilos reutilizables internos (solo para lo dinámico)
  const gridTarjetas = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: '15px',
    marginBottom: '30px'
  }

  const gridGraficos = {
    display: 'flex',
    gap: '20px',
    marginBottom: '30px',
    flexWrap: 'wrap'
  }

  const cardGrafico = {
    flex: '1 1 400px',
    backgroundColor: 'var(--white)',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  }

  return (
    <div className="page-container" style={{ maxWidth: '1100px' }}>
      <PageHeader titulo="Panel de Control y Auditoría">
        <Select
          value={filtroFecha}
          onChange={(e) => setFiltroFecha(e.target.value)}
          options={[
            { value: 'todo', label: 'Todo el tiempo (Histórico)' },
            { value: 'este_mes', label: 'Este Mes' },
            { value: 'mes_pasado', label: 'Mes Pasado' },
            { value: 'ultimos_30_dias', label: 'Últimos 30 días' },
            { value: 'este_ano', label: 'Este Año' }
          ]}
          placeholder={null}
        />
      </PageHeader>

      {cargando ? (
        <Spinner />
      ) : (
        <>
          {/* TARJETAS DE ESTADOS */}
          <div style={gridTarjetas}>
            {Object.entries(conteos).map(([estado, cantidad]) => (
              <div
                key={estado}
                style={{
                  backgroundColor: 'var(--white)',
                  padding: '15px',
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  borderTop: `4px solid ${colores[estado]}`,
                  textAlign: 'center'
                }}
              >
                <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', color: 'var(--text-light)' }}>
                  {estado.replace(/_/g, ' ')}
                </h4>
                <span style={{ fontSize: '24px', fontWeight: 'bold', color: colores[estado] }}>
                  {cantidad}
                </span>
              </div>
            ))}
          </div>

          {/* GRÁFICOS */}
          <div style={gridGraficos}>
            <div style={cardGrafico}>
              <h3 style={{ marginTop: 0, textAlign: 'center', fontSize: '16px', color: 'var(--text-dark)' }}>
                Distribución por Estado
              </h3>
              {datosTorta.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-light)' }}>
                  No hay datos en este periodo
                </p>
              ) : (
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={datosTorta}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {datosTorta.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={colores[entry.name]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div style={cardGrafico}>
              <h3 style={{ marginTop: 0, textAlign: 'center', fontSize: '16px', color: 'var(--text-dark)' }}>
                Precintos por Planta
              </h3>
              {datosPlantas.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-light)' }}>
                  No hay datos en este periodo
                </p>
              ) : (
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={datosPlantas} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip cursor={{ fill: '#f3f4f6' }} />
                      <Bar dataKey="cantidad" fill="#0B5FA5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* TABLA DE HISTORIAL */}
          <Card titulo="Últimos Movimientos (Bitácora Inmutable)">
            <Tabla
              columnas={['Fecha / Hora', 'Precinto', 'Cambio de Estado', 'Acción']}
              hayDatos={historial.length > 0}
              vacio="No hay movimientos en este periodo."
            >
              {historial.map((h) => (
                <tr key={h.id_historial}>
                  <td style={{ color: 'var(--text-light)' }}>
                    {new Date(h.fecha).toLocaleString()}
                  </td>
                  <td style={{ fontWeight: 'bold' }}>
                    {h.precintos?.correlativo}
                  </td>
                  <td>
                    <span style={{ color: 'var(--text-light)' }}>
                      {h.estado_anterior || 'NUEVO'}
                    </span>
                    <span style={{ margin: '0 5px' }}>➔</span>
                    <span style={{ fontWeight: 'bold', color: colores[h.estado_nuevo] }}>
                      {h.estado_nuevo}
                    </span>
                  </td>
                  <td>{h.accion_realizada}</td>
                </tr>
              ))}
            </Tabla>
          </Card>
        </>
      )}
    </div>
  )
}