import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function ProyeccionDemanda() {
  const [plantas, setPlantas] = useState([])
  const [plantaSeleccionada, setPlantaSeleccionada] = useState('')
  
  // Variables de entrada
  const [leadTime, setLeadTime] = useState(15) // Días que tarda el proveedor
  const [diasHistorial, setDiasHistorial] = useState(90) // Días hacia atrás para calcular
  
  // Resultados
  const [stockActual, setStockActual] = useState(0)
  const [consumoTotal, setConsumoTotal] = useState(0)
  const [promedioDiario, setPromedioDiario] = useState(0)
  const [puntoReposicion, setPuntoReposicion] = useState(0)
  const [sugerenciaPedido, setSugerenciaPedido] = useState(0)
  
  const [cargando, setCargando] = useState(false)
  const [calculado, setCalculado] = useState(false)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    const fetchPlantas = async () => {
      const { data } = await supabase.from('plantas').select('id_planta, nombre')
      if (data) setPlantas(data)
    }
    fetchPlantas()
  }, [])

  const calcularProyeccion = async () => {
    if (!plantaSeleccionada) {
      setMensaje('⚠️ Selecciona una planta.')
      return
    }

    setCargando(true)
    setMensaje('')
    setCalculado(false)

    try {
      // 1. Obtener Stock Actual (Solo los DISPONIBLES en esa planta)
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

      // Traemos todas las transacciones del periodo para sumar la cantidad_precintos
      const { data: transacciones, error: errConsumo } = await supabase
        .from('transacciones')
        .select('cantidad_precintos')
        .eq('id_planta', plantaSeleccionada)
        .gte('fecha_creacion', fechaInicioStr)

      if (errConsumo) throw errConsumo

      // Sumamos la columna cantidad_precintos de todas las transacciones
      let totalUsado = 0
      if (transacciones && transacciones.length > 0) {
        totalUsado = transacciones.reduce((suma, t) => suma + (t.cantidad_precintos || 0), 0)
      }

      // 3. Matemática de Proyección
      const stock = countStock || 0
      const promedio = totalUsado / diasHistorial
      const puntoRepo = Math.ceil(promedio * leadTime) 
      
      // Sugerencia: Cubrir el Lead Time + un colchón de 15 días extra
      const cantidadSugerida = Math.max(0, Math.ceil(promedio * (leadTime + 15)) - stock)

      setStockActual(stock)
      setConsumoTotal(totalUsado)
      setPromedioDiario(promedio.toFixed(2))
      setPuntoReposicion(puntoRepo)
      setSugerenciaPedido(cantidadSugerida)
      setCalculado(true)

    } catch (error) {
      console.error(error)
      setMensaje('❌ Error al calcular: ' + error.message)
    } finally {
      setCargando(false)
    }
  }

  const getEstadoAlerta = () => {
    if (stockActual <= puntoReposicion) {
      return { color: '#DC2626', bg: '#FEE2E2', texto: '🔴 ALERTA: Stock Crítico' }
    } else if (stockActual <= puntoReposicion * 1.5) {
      return { color: '#D97706', bg: '#FEF3C7', texto: '🟡 PRECAUCIÓN: Cerca al punto de reposición' }
    } else {
      return { color: '#16A34A', bg: '#DCFCE7', texto: '🟢 ÓPTIMO: Stock suficiente' }
    }
  }

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', fontFamily: 'Arial', padding: '20px' }}>
      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#0B5FA5', borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>Proyección de Demanda y Reposición</h2>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
          Calcula cuándo y cuánto pedir al proveedor basándose en el consumo histórico de la planta.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Planta:</label>
            <select 
              value={plantaSeleccionada} 
              onChange={(e) => setPlantaSeleccionada(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="">Seleccione una planta...</option>
              {plantas.map(p => (
                <option key={p.id_planta} value={p.id_planta}>{p.nombre}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Lead Time Proveedor (Días):</label>
              <input 
                type="number" 
                value={leadTime} 
                onChange={(e) => setLeadTime(Number(e.target.value))}
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Días de Historial a Evaluar:</label>
              <input 
                type="number" 
                value={diasHistorial} 
                onChange={(e) => setDiasHistorial(Number(e.target.value))}
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
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

        {mensaje && <p style={{ textAlign: 'center', color: 'red', fontWeight: 'bold' }}>{mensaje}</p>}

        {calculado && (
          <div style={{ marginTop: '30px', border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden' }}>
            
            {/* SEMÁFORO DE ESTADO */}
            <div style={{ backgroundColor: getEstadoAlerta().bg, padding: '15px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
              <h3 style={{ margin: 0, color: getEstadoAlerta().color }}>{getEstadoAlerta().texto}</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', padding: '20px' }}>
              
              {/* DATOS HISTÓRICOS */}
              <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#333', borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>Análisis Histórico</h4>
                <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>Stock Actual (Disponible):</strong> {stockActual} unidades</p>
                <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>Consumo en {diasHistorial} días:</strong> {consumoTotal} unidades</p>
                <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>Consumo Promedio Diario:</strong> {promedioDiario} unidades/día</p>
              </div>

              {/* RECOMENDACIÓN */}
              <div style={{ backgroundColor: '#eef6ff', padding: '15px', borderRadius: '8px', border: '1px solid #cce5ff' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#0B5FA5', borderBottom: '1px solid #b3d7ff', paddingBottom: '5px' }}>Recomendación de Compra</h4>
                <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>Punto de Reposición:</strong> {puntoReposicion} unidades</p>
                <p style={{ margin: '5px 0', fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                  (Cuando tu stock baje a este número, debes emitir la orden de compra)
                </p>
                <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#0B5FA5', color: 'white', borderRadius: '4px', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 5px 0', fontSize: '12px' }}>Sugerencia de Pedido (Cubrir Lead Time + 15 días):</p>
                  <h2 style={{ margin: 0 }}>{sugerenciaPedido} <span style={{ fontSize: '14px', fontWeight: 'normal' }}>precintos</span></h2>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  )
}