// src/components/precios/TendenciasPrecios.jsx
import { useState, useMemo } from 'react'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useTendenciasPrecios, formatCurrency, formatPercentage, getTrendColor } from './useTendenciasPrecios'

const PALETA = {
  azulProfundo: '#0033A0',
  cyanVibrante: '#00AEEF',
  exito: '#28A745',
  alerta: '#FFC107',
  peligro: '#DC3545',
  grisClaro: '#F5F5F5',
  grisMedio: '#CCCCCC',
  blanco: '#FFFFFF',
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: PALETA.blanco,
        border: `1px solid ${PALETA.grisMedio}`,
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 4px 12px rgba(0,51,160,0.1)',
        minWidth: '180px',
      }}>
        <p style={{ margin: '0 0 8px', fontWeight: 700, color: PALETA.azulProfundo, fontSize: '13px' }}>
          {label}
        </p>
        {payload && payload.map((entry, index) => (
          <p key={index} style={{ margin: '4px 0', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: entry.color, fontWeight: 600 }}>{entry.name}:</span>
            <span style={{ color: PALETA.azulProfundo, fontWeight: 700 }}>
              {entry.name.includes('%') ? entry.value : formatCurrency(entry.value)}
            </span>
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function TendenciasPrecios({ filtros }) {
  const { fechaDesde, fechaHasta, productos, planta, tipoGrafico = 'linea' } = filtros
  const { datos, cargando, error, estadisticas, recargar } = useTendenciasPrecios({
    fechaDesde, fechaHasta, productos, planta,
    usarVistaMaterializada: true,
  })

  const [vistaActiva, setVistaActiva] = useState('tendencia')
  const [productoSeleccionado, setProductoSeleccionado] = useState('todos')

  // VALIDACIÓN: Asegurar que datos sea un array
  const datosSeguros = useMemo(() => {
    if (!datos || !Array.isArray(datos)) return []
    return datos
  }, [datos])

  const datosFiltrados = useMemo(() => {
    if (productoSeleccionado === 'todos') return datosSeguros
    return datosSeguros.filter(d => d.producto === productoSeleccionado)
  }, [datosSeguros, productoSeleccionado])

  // VALIDACIÓN: Evitar crash si datosSeguros está vacío
  const productosUnicos = useMemo(() => {
    if (!datosSeguros || datosSeguros.length === 0) return []
    return [...new Set(datosSeguros.map(d => d.producto))]
  }, [datosSeguros])

  const coloresPorProducto = useMemo(() => {
    const colores = [PALETA.azulProfundo, PALETA.cyanVibrante, PALETA.exito, PALETA.peligro, PALETA.alerta]
    return Object.fromEntries(
      productosUnicos.map((prod, i) => [prod, colores[i % colores.length]])
    )
  }, [productosUnicos])

  if (cargando) {
    return (
      <div style={{ 
        padding: '60px 20px', 
        textAlign: 'center',
        background: `linear-gradient(135deg, ${PALETA.grisClaro} 0%, ${PALETA.blanco} 100%)`,
        borderRadius: '16px',
        border: `1px solid ${PALETA.grisMedio}`,
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          border: `4px solid ${PALETA.grisClaro}`,
          borderTopColor: PALETA.azulProfundo,
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px',
        }} />
        <p style={{ color: PALETA.azulProfundo, fontWeight: 600, margin: 0 }}>
          Analizando tendencias de precios...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        padding: '32px',
        background: `${PALETA.peligro}10`,
        border: `1px solid ${PALETA.peligro}`,
        borderRadius: '12px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
        <h3 style={{ margin: '0 0 8px', color: PALETA.peligro, fontSize: '16px' }}>
          Error al cargar tendencias
        </h3>
        <p style={{ margin: 0, color: PALETA.grisMedio, fontSize: '13px' }}>{error}</p>
        <button
          onClick={recargar}
          style={{
            marginTop: '16px',
            padding: '8px 20px',
            background: PALETA.azulProfundo,
            color: PALETA.blanco,
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (!datosSeguros.length) {
    return (
      <div style={{
        padding: '60px 20px',
        textAlign: 'center',
        background: PALETA.grisClaro,
        borderRadius: '16px',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📉</div>
        <h3 style={{ margin: '0 0 8px', color: PALETA.azulProfundo }}>Sin datos disponibles</h3>
        <p style={{ margin: 0, color: PALETA.grisMedio, fontSize: '13px' }}>
          No hay registros de precios en el rango seleccionado
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Estadísticas Rápidas */}
      {estadisticas && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}>
          <KpiCard 
            titulo="Total Registros" 
            valor={estadisticas.totalRegistros.toLocaleString()} 
            icono="📊"
            color={PALETA.azulProfundo}
          />
          <KpiCard 
            titulo="Productos Analizados" 
            valor={estadisticas.productosAnalizados} 
            icono="🏭"
            color={PALETA.cyanVibrante}
          />
          <KpiCard 
            titulo="Tendencia General" 
            valor={formatPercentage(estadisticas.tendenciaGeneral)}
            subtitulo={estadisticas.tendenciaGeneral > 0 ? 'Al alza' : 'A la baja'}
            icono={estadisticas.tendenciaGeneral > 0 ? '📈' : '📉'}
            color={getTrendColor(estadisticas.tendenciaGeneral)}
          />
          <KpiCard 
            titulo="Volatilidad Promedio" 
            valor={`${estadisticas.volatilidadPromedio.toFixed(2)}%`}
            subtitulo={estadisticas.volatilidadPromedio > 5 ? 'Alta' : 'Estable'}
            icono="〰️"
            color={estadisticas.volatilidadPromedio > 5 ? PALETA.alerta : PALETA.exito}
          />
        </div>
      )}

      {/* Controles de Visualización */}
      <div style={{
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        alignItems: 'center',
        padding: '16px',
        background: PALETA.blanco,
        borderRadius: '12px',
        border: `1px solid ${PALETA.grisMedio}`,
      }}>
        <select
          value={productoSeleccionado}
          onChange={(e) => setProductoSeleccionado(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: `1px solid ${PALETA.grisMedio}`,
            background: PALETA.blanco,
            color: PALETA.azulProfundo,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <option value="todos">Todos los productos</option>
          {productosUnicos.map(prod => (
            <option key={prod} value={prod}>{prod}</option>
          ))}
        </select>

        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'tendencia', label: '📈 Tendencia', icon: 'linea' },
            { id: 'comparativa', label: '📊 Comparativa', icon: 'barra' },
            { id: 'area', label: '🔷 Área', icon: 'area' },
          ].map(vista => (
            <button
              key={vista.id}
              onClick={() => setVistaActiva(vista.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: vistaActiva === vista.id ? PALETA.azulProfundo : PALETA.grisClaro,
                color: vistaActiva === vista.id ? PALETA.blanco : PALETA.azulProfundo,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {vista.label}
            </button>
          ))}
        </div>
      </div>

      {/* Gráfico Principal */}
      <div style={{
        background: PALETA.blanco,
        borderRadius: '16px',
        padding: '24px',
        border: `1px solid ${PALETA.grisMedio}`,
        boxShadow: '0 4px 20px rgba(0,51,160,0.08)',
      }}>
        <ResponsiveContainer width="100%" height={400}>
          {vistaActiva === 'tendencia' && (
            <LineChart data={datosFiltrados}>
              <CartesianGrid strokeDasharray="3 3" stroke={PALETA.grisMedio} opacity={0.3} />
              <XAxis 
                dataKey="mes" 
                stroke={PALETA.grisMedio}
                tick={{ fill: PALETA.azulProfundo, fontSize: 12 }}
              />
              <YAxis 
                stroke={PALETA.grisMedio}
                tickFormatter={(value) => `S/ ${value}`}
                tick={{ fill: PALETA.azulProfundo, fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {productoSeleccionado === 'todos' 
                ? productosUnicos.map((prod, i) => (
                    <Line
                      key={prod}
                      type="monotone"
                      dataKey="promedio"
                      name={prod}
                      stroke={coloresPorProducto[prod]}
                      strokeWidth={3}
                      dot={{ fill: coloresPorProducto[prod], strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: coloresPorProducto[prod] }}
                      data={datosFiltrados.filter(d => d.producto === prod)}
                    />
                  ))
                : (
                    <Line
                      type="monotone"
                      dataKey="promedio"
                      name="Precio Promedio"
                      stroke={PALETA.azulProfundo}
                      strokeWidth={3}
                      dot={{ fill: PALETA.azulProfundo, strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  )
              }
            </LineChart>
          )}

          {vistaActiva === 'comparativa' && (
            <BarChart data={datosFiltrados}>
              <CartesianGrid strokeDasharray="3 3" stroke={PALETA.grisMedio} opacity={0.3} />
              <XAxis 
                dataKey="mes" 
                stroke={PALETA.grisMedio}
                tick={{ fill: PALETA.azulProfundo, fontSize: 12 }}
              />
              <YAxis 
                stroke={PALETA.grisMedio}
                tickFormatter={(value) => `S/ ${value}`}
                tick={{ fill: PALETA.azulProfundo, fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="minimo" name="Mínimo" fill={PALETA.exito} radius={[4, 4, 0, 0]} />
              <Bar dataKey="promedio" name="Promedio" fill={PALETA.azulProfundo} radius={[4, 4, 0, 0]} />
              <Bar dataKey="maximo" name="Máximo" fill={PALETA.peligro} radius={[4, 4, 0, 0]} />
            </BarChart>
          )}

          {vistaActiva === 'area' && (
            <AreaChart data={datosFiltrados}>
              <defs>
                <linearGradient id="colorPrecio" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={PALETA.azulProfundo} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={PALETA.azulProfundo} stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={PALETA.grisMedio} opacity={0.3} />
              <XAxis 
                dataKey="mes" 
                stroke={PALETA.grisMedio}
                tick={{ fill: PALETA.azulProfundo, fontSize: 12 }}
              />
              <YAxis 
                stroke={PALETA.grisMedio}
                tickFormatter={(value) => `S/ ${value}`}
                tick={{ fill: PALETA.azulProfundo, fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="promedio" 
                name="Precio Promedio"
                stroke={PALETA.azulProfundo} 
                fill="url(#colorPrecio)" 
                strokeWidth={3}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Tabla de Datos Detallados */}
      <div style={{
        background: PALETA.blanco,
        borderRadius: '16px',
        overflow: 'hidden',
        border: `1px solid ${PALETA.grisMedio}`,
      }}>
        <div style={{
          padding: '16px 24px',
          background: PALETA.azulProfundo,
          color: PALETA.blanco,
          fontWeight: 700,
          fontSize: '14px',
        }}>
           Datos Detallados por Mes
        </div>
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, background: PALETA.grisClaro, zIndex: 1 }}>
              <tr>
                {['Mes', 'Producto', 'Planta', 'Promedio', 'Mínimo', 'Máximo', 'Variación', 'Registros'].map(h => (
                  <th key={h} style={{
                    padding: '12px',
                    textAlign: 'left',
                    borderBottom: `2px solid ${PALETA.grisMedio}`,
                    color: PALETA.azulProfundo,
                    fontWeight: 700,
                    fontSize: '12px',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {datosFiltrados && datosFiltrados.map((row, i) => (
                <tr key={i} style={{
                  background: i % 2 === 0 ? PALETA.blanco : PALETA.grisClaro,
                }}>
                  <td style={{ padding: '12px', fontWeight: 600, color: PALETA.azulProfundo }}>{row.mes}</td>
                  <td style={{ padding: '12px', color: PALETA.azulProfundo }}>{row.producto}</td>
                  <td style={{ padding: '12px', color: PALETA.grisMedio }}>{row.planta}</td>
                  <td style={{ padding: '12px', fontWeight: 700, color: PALETA.azulProfundo }}>{formatCurrency(row.promedio)}</td>
                  <td style={{ padding: '12px', color: PALETA.exito }}>{formatCurrency(row.minimo)}</td>
                  <td style={{ padding: '12px', color: PALETA.peligro }}>{formatCurrency(row.maximo)}</td>
                  <td style={{ 
                    padding: '12px', 
                    fontWeight: 700, 
                    color: getTrendColor(row.variacion),
                    fontSize: '13px',
                  }}>
                    {formatPercentage(row.variacion)}
                  </td>
                  <td style={{ padding: '12px', color: PALETA.grisMedio }}>{row.registros}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Componente KPI Card reutilizable
function KpiCard({ titulo, valor, subtitulo, icono, color }) {
  return (
    <div style={{
      padding: '20px',
      background: PALETA.blanco,
      borderRadius: '12px',
      border: `1px solid ${PALETA.grisMedio}`,
      boxShadow: '0 2px 8px rgba(0,51,160,0.06)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <p style={{ margin: 0, fontSize: '12px', color: PALETA.grisMedio, fontWeight: 600, textTransform: 'uppercase' }}>
            {titulo}
          </p>
          <h3 style={{ margin: '8px 0 0', fontSize: '24px', fontWeight: 900, color, lineHeight: 1.2 }}>
            {valor}
          </h3>
          {subtitulo && (
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: PALETA.grisMedio }}>
              {subtitulo}
            </p>
          )}
        </div>
        <div style={{ fontSize: '28px', opacity: 0.8 }}>{icono}</div>
      </div>
    </div>
  )
}