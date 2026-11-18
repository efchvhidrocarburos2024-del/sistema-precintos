import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { PageHeader, Card, Select, Input, Boton, Tabla } from './ui'

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
      // 1. Obtener Stock Actual (Solo DISPONIBLES)
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
      const diasEvaluar = diasHistorial > 0 ? diasHistorial : 1
      const promedio = totalUsado / diasEvaluar
      const puntoRepo = Math.ceil(promedio * leadTime)
      const cantidadSugerida = Math.max(0, Math.ceil(promedio * (leadTime + 15)) - stock)

      // 4. Datos para gráfico (últimos 6 viajes)
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

  const porcentajeStock = puntoReposicion > 0
    ? Math.min(100, (stockActual / (puntoReposicion * 2)) * 100)
    : 100

  return (
    <div className="page-container" style={{ maxWidth: '900px' }}>
      <PageHeader titulo="Proyección de Demanda y Reposición" />

      <Card>
        <p style={{ fontSize: '14px', color: 'var(--text-light)', marginBottom: '20px' }}>
          Calcula cuándo y cuánto pedir al proveedor basándose en el consumo histórico de la planta.
        </p>

        <div className="form-row">
          <Select
            label="Planta"
            value={plantaSeleccionada}
            onChange={(e) => setPlantaSeleccionada(e.target.value)}
            placeholder="Seleccione una planta..."
            options={plantas.map(p => ({
              value: p.id_planta,
              label: p.nombre
            }))}
          />
        </div>

        <div className="form-row">
          <Input
            label="Lead Time Proveedor (Días)"
            type="number"
            value={leadTime}
            onChange={(e) => setLeadTime(Number(e.target.value))}
            min="1"
          />
          <Input
            label="Días de Historial a Evaluar"
            type="number"
            value={diasHistorial}
            onChange={(e) => setDiasHistorial(Number(e.target.value))}
            min="1"
          />
        </div>

        <Boton
          variante="primary"
          onClick={calcularProyeccion}
          disabled={cargando || !plantaSeleccionada}
          style={{ width: '100%', marginTop: '10px' }}
        >
          {cargando ? 'Analizando datos...' : 'Calcular Proyección'}
        </Boton>
      </Card>

      {/* RESULTADOS */}
      {calculado && (
        <Card>
          {/* SEMÁFORO */}
          <div style={{
            backgroundColor: getEstadoAlerta().bg,
            padding: '15px',
            borderRadius: '6px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: 0, color: getEstadoAlerta().color }}>
              {getEstadoAlerta().texto}
            </h3>
          </div>

          {/* BARRA VISUAL DE STOCK */}
          <div style={{ marginBottom: '30px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '5px',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              <span>Stock Actual: {stockActual}</span>
              <span>Punto de Reposición: {puntoReposicion}</span>
            </div>
            <div style={{
              width: '100%',
              backgroundColor: '#e5e7eb',
              borderRadius: '10px',
              height: '20px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${porcentajeStock}%`,
                backgroundColor: getEstadoAlerta().color,
                height: '100%',
                transition: 'width 1s ease-in-out'
              }}></div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px'
          }}>
            {/* DATOS HISTÓRICOS */}
            <div style={{
              backgroundColor: '#f9f9f9',
              padding: '15px',
              borderRadius: '8px',
              border: '1px solid #eee'
            }}>
              <h4 style={{
                margin: '0 0 10px 0',
                color: 'var(--text-dark)',
                borderBottom: '1px solid #ddd',
                paddingBottom: '5px'
              }}>
                Análisis Histórico
              </h4>
              <p style={{ margin: '5px 0', fontSize: '14px' }}>
                <strong>Consumo en {diasHistorial} días:</strong> {consumoTotal} un.
              </p>
              <p style={{ margin: '5px 0', fontSize: '14px' }}>
                <strong>Consumo Promedio:</strong> {promedioDiario} un/día
              </p>

              {datosGrafico.length > 0 && (
                <div style={{ height: '120px', marginTop: '15px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={datosGrafico}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis hide />
                      <Tooltip />
                      <Bar dataKey="cantidad" fill="#0B5FA5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* RECOMENDACIÓN */}
            <div style={{
              backgroundColor: '#eef6ff',
              padding: '15px',
              borderRadius: '8px',
              border: '1px solid #cce5ff'
            }}>
              <h4 style={{
                margin: '0 0 10px 0',
                color: 'var(--primary-blue)',
                borderBottom: '1px solid #b3d7ff',
                paddingBottom: '5px'
              }}>
                Recomendación de Compra
              </h4>
              <p style={{ margin: '5px 0', fontSize: '14px' }}>
                <strong>Punto de Reposición:</strong> {puntoReposicion} un.
              </p>
              <p style={{
                margin: '5px 0',
                fontSize: '12px',
                color: 'var(--text-light)',
                fontStyle: 'italic'
              }}>
                (Cuando baje a este número, emite la orden de compra)
              </p>
              <div style={{
                marginTop: '15px',
                padding: '10px',
                backgroundColor: sugerenciaPedido > 0 ? 'var(--primary-blue)' : 'var(--primary-green)',
                color: 'var(--white)',
                borderRadius: '6px',
                textAlign: 'center'
              }}>
                <p style={{ margin: '0 0 5px 0', fontSize: '12px' }}>Sugerencia de Pedido:</p>
                <h2 style={{ margin: 0 }}>
                  {sugerenciaPedido}{' '}
                  <span style={{ fontSize: '14px', fontWeight: 'normal' }}>un.</span>
                </h2>
              </div>
            </div>
          </div>

          {/* TABLA DE TRANSACCIONES */}
          {transacciones.length > 0 && (
            <div style={{ marginTop: '30px' }}>
              <h4 style={{
                color: 'var(--text-dark)',
                borderBottom: '1px solid #ddd',
                paddingBottom: '5px',
                marginBottom: '10px'
              }}>
                Últimos Movimientos (Base del cálculo)
              </h4>

              <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                <Tabla
                  columnas={['Fecha', 'SCOP', 'Cantidad']}
                  hayDatos={true}
                >
                  {transacciones.slice(0, 10).map(t => (
                    <tr key={t.id_transaccion}>
                      <td style={{ color: 'var(--text-light)' }}>
                        {new Date(t.fecha_creacion).toLocaleDateString('es-PE')}
                      </td>
                      <td style={{ fontWeight: 'bold' }}>{t.scop || '-'}</td>
                      <td style={{
                        textAlign: 'center',
                        color: 'var(--danger-red)',
                        fontWeight: 'bold'
                      }}>
                        -{t.cantidad_precintos}
                      </td>
                    </tr>
                  ))}
                </Tabla>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}