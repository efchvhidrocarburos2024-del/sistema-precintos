import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function ProyeccionDemanda() {
  const [plantas, setPlantas] = useState([])
  const [plantaSeleccionada, setPlantaSeleccionada] = useState('')
  
  // Variables de entrada
  const [leadTime, setLeadTime] = useState(15) 
  const [diasHistorial, setDiasHistorial] = useState(90) 
  
  // Resultados
  const [stockActual, setStockActual] = useState(0)
  const [consumoTotal, setConsumoTotal] = useState(0)
  const [promedioDiario, setPromedioDiario] = useState(0)
  const [puntoReposicion, setPuntoReposicion] = useState(0)
  const [sugerenciaPedido, setSugerenciaPedido] = useState(0)
  
  // Datos para la tabla y gráfico
  const [transacciones, setTransacciones] = useState([])
  const [datosGrafico, setDatosGrafico] = useState([])

  const [cargando, setCargando] = useState(false)
  const [calculado, setCalculado] = useState(false)

  useEffect(() => {
    const fetchPlantas = async () => {
      const { data } = await supabase.from('plantas').select('id_planta, nombre')
      if (data) setPlantas(data)
    }
    fetchPlantas()
  }, [])

  const calcularProyeccion = async () => {
    if (!plantaSeleccionada) {
      toast.error('Selecciona una planta primero.')
      return
    }

    setCargando(true)
    setCalculado(false)

    try {
      // 1. Obtener Stock Actual (Solo los DISPONIBLES)
      const { count: countStock, error: errStock } = await supabase
        .from('precintos')
        .select('*', { count: 'exact', head: true })
        .eq('id_planta', plantaSeleccionada) 
        .eq('estado', 'DISPONIBLE')

      if (errStock) throw errStock

      // 2. Calcular Consumo Histórico
      const fechaInicio = new Date()
      fechaInicio.setDate(fechaInicio.getDate() - diasHistorial)
      const fechaInicioStr = fechaInicio.toISOString()

      // Traemos las transacciones para calcular y mostrar
      const { data: txData, error: errConsumo } = await supabase
        .from('transacciones')
        .select('id_transaccion, fecha_creacion, cantidad_precintos, scop')
        .eq('id_planta', plantaSeleccionada)
        .gte('fecha_creacion', fechaInicioStr)
        .order('fecha_creacion', { ascending: false })

      if (errConsumo) throw errConsumo

      // Sumamos el total usado
      let totalUsado = 0
      if (txData && txData.length > 0) {
        totalUsado = txData.reduce((suma, t) => suma + (t.cantidad_precintos || 0), 0)
      }

      // 3. Matemática de Proyección
      const stock = countStock || 0
      // Evitamos división por cero si el usuario pone 0 días
      const diasEvaluar = diasHistorial > 0 ? diasHistorial : 1; 
      const promedio = totalUsado / diasEvaluar
      const puntoRepo = Math.ceil(promedio * leadTime) 
      const cantidadSugerida = Math.max(0, Math.ceil(promedio * (leadTime + 15)) - stock)

      // 4. Preparar datos para el gráfico (agrupados por los últimos 6 viajes, para que no se vea amontonado)
      const graficoData = (txData || []).slice(0, 6).reverse().map(t => ({
        name: new Date(t.fecha_creacion).toLocaleDateString('es-PE'),
        cantidad: t.cantidad_precintos
      }))

      setStockActual(stock)
      setConsumoTotal(totalUsado)
      setPromedioDiario(promedio.toFixed(2))
      setPuntoReposicion(puntoRepo)
      setSugerenciaPedido(cantidadSugerida)
      setTransacciones(txData || [])
      setDatosGrafico(graficoData)
      setCalculado(true)

    } catch (error) {
      console.error(error)
      toast.error('Error al calcular: ' + error.message)
    } finally {
      setCargando(false)
    }
  }

  const getEstadoAlerta = () => {
    if (stockActual <= puntoReposicion) {
      return { color: '#DC2626', bg: '#FEE2E2', texto: '🔴 ALERTA: Stock Crítico - Emitir orden de compra YA' }
    } else if (stockActual <= puntoReposicion * 1.5) {
      return { color: '#D97706', bg: '#FEF3C7', texto: '🟡 PRECAUCIÓN: Cerca al punto de reposición' }
    } else {
      return { color: '#16A34A', bg: '#DCFCE7', texto: '🟢 ÓPTIMO: Stock suficiente para operar' }
    }
  }

  // Calcular el porcentaje de la barra visual
  const porcentajeStock = puntoReposicion > 0 
    ? Math.min(100, (stockActual / (puntoReposicion * 2)) * 100) 
    : 100;

  return (
    <div style={{ width: '95%', maxWidth: '900px', margin: '20px auto', fontFamily: 'Arial', padding: '10px', boxSizing: 'border-box' }}>
      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        
        <h2 style={{ color: '#0B5FA5', borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>Proyección de Demanda y Reposición</h2>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
          Calcula cuándo y cuánto pedir al proveedor basándose en el consumo histórico de la planta.
        </p>

        {/* FORMULARIO */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Planta:</label>
            <select 
              value={plantaSeleccionada} 
              onChange={(e) => setPlantaSeleccionada(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white', color: 'black' }}
            >
              <option value="">Seleccione una planta...</option>
              {plantas.map(p => (
                <option key={p.id_planta} value={p.id_planta}>{p.nombre}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Lead Time Proveedor (Días):</label>
              <input 
                type="number" 
                value={leadTime} 
                onChange={(e) => setLeadTime(Number(e.target.value))}
                min="1"
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white', color: 'black', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Días de Historial a Evaluar:</label>
              <input 
                type="number" 
                value={diasHistorial} 
                onChange={(e) => setDiasHistorial(Number(e.target.value))}
                min="1"
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white', color: 'black', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <button 
            onClick={calcularProyeccion}
            disabled={cargando || !plantaSeleccionada}
            style={{ padding: '12px', background: '#0B5FA5', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' }}
          >
            {cargando ? 'Analizando datos...' : 'Calcular Proyección'}
          </button>
        </div>

        {/* RESULTADOS */}
        {calculado && (
          <div style={{ marginTop: '30px', border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden' }}>
            
            {/* SEMÁFORO DE ESTADO */}
            <div style={{ backgroundColor: getEstadoAlerta().bg, padding: '15px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
              <h3 style={{ margin: 0, color: getEstadoAlerta().color }}>{getEstadoAlerta().texto}</h3>
            </div>

            <div style={{ padding: '20px' }}>
              
              {/* BARRA VISUAL DE STOCK */}
              <div style={{ marginBottom: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>
                  <span>Stock Actual: {stockActual}</span>
                  <span>Punto de Reposición: {puntoReposicion}</span>
                </div>
                <div style={{ width: '100%', backgroundColor: '#e5e7eb', borderRadius: '10px', height: '20px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${porcentajeStock}%`, 
                    backgroundColor: getEstadoAlerta().color, 
                    height: '100%', 
                    transition: 'width 1s ease-in-out'
                  }}></div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                
                {/* DATOS HISTÓRICOS */}
                <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px', border: '1px solid #eee' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#333', borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>Análisis Histórico</h4>
                  <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>Consumo en {diasHistorial} días:</strong> {consumoTotal} un.</p>
                  <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>Consumo Promedio:</strong> {promedioDiario} un/día</p>
                  
                  {datosGrafico.length > 0 && (
                    <div style={{ height: '120px', marginTop: '15px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={datosGrafico}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" tick={{fontSize: 10}} />
                          <YAxis hide />
                          <Tooltip />
                          <Bar dataKey="cantidad" fill="#0B5FA5" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* RECOMENDACIÓN */}
                <div style={{ backgroundColor: '#eef6ff', padding: '15px', borderRadius: '8px', border: '1px solid #cce5ff' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#0B5FA5', borderBottom: '1px solid #b3d7ff', paddingBottom: '5px' }}>Recomendación de Compra</h4>
                  <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>Punto de Reposición:</strong> {puntoReposicion} un.</p>
                  <p style={{ margin: '5px 0', fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                    (Cuando baje a este número, emite la orden de compra)
                  </p>
                  <div style={{ marginTop: '15px', padding: '10px', backgroundColor: sugerenciaPedido > 0 ? '#0B5FA5' : '#16A34A', color: 'white', borderRadius: '4px', textAlign: 'center' }}>
                    <p style={{ margin: '0 0 5px 0', fontSize: '12px' }}>Sugerencia de Pedido:</p>
                    <h2 style={{ margin: 0 }}>{sugerenciaPedido} <span style={{ fontSize: '14px', fontWeight: 'normal' }}>un.</span></h2>
                  </div>
                </div>

              </div>

              {/* TABLA DE TRANSACCIONES (Auditoría) */}
              {transacciones.length > 0 && (
                <div style={{ marginTop: '30px' }}>
                  <h4 style={{ color: '#333', borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>Últimos Movimientos (Base del cálculo)</h4>
                  <div style={{ overflowX: 'auto', maxHeight: '200px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f3f4f6', textAlign: 'left' }}>
                          <th style={{ padding: '8px' }}>Fecha</th>
                          <th style={{ padding: '8px' }}>SCOP</th>
                          <th style={{ padding: '8px', textAlign: 'center' }}>Cantidad</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transacciones.slice(0, 10).map(t => (
                          <tr key={t.id_transaccion} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '8px', color: '#666' }}>{new Date(t.fecha_creacion).toLocaleDateString('es-PE')}</td>
                            <td style={{ padding: '8px', fontWeight: 'bold' }}>{t.scop || '-'}</td>
                            <td style={{ padding: '8px', textAlign: 'center', color: '#DC2626', fontWeight: 'bold' }}>-{t.cantidad_precintos}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  )
}