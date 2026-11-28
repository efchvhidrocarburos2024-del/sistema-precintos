import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import toast from 'react-hot-toast'
import { Card, Boton } from '../ui'

export default function ReasignarCuota({ onVolver, rol }) {
  const [plantas, setPlantas] = useState([])
  const [productos, setProductos] = useState([])
  const [plantaSeleccionada, setPlantaSeleccionada] = useState('')
  const [productoSeleccionado, setProductoSeleccionado] = useState('')
  const [cuotasAsesores, setCuotasAsesores] = useState([])
  const [cuotaOrigen, setCuotaOrigen] = useState(null)
  const [cuotaDestino, setCuotaDestino] = useState(null)
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    const cargarCatalogos = async () => {
      console.log('🔄 Cargando catálogos para reasignación...')
      
      const [p, prod] = await Promise.all([
        supabase.from('plantas').select('id_planta, nombre, codigo').eq('activo', true).order('nombre'),
        supabase.from('productos').select('id, nombre, codigo').eq('activo', true).order('nombre')
      ])
      
      console.log('📦 Plantas:', p.data)
      console.log('🛢️ Productos:', prod.data)
      
      setPlantas(p.data || [])
      setProductos(prod.data || [])
    }
    cargarCatalogos()
  }, [])

  // Cargar cuotas cuando cambia planta o producto
  useEffect(() => {
    if (!plantaSeleccionada || !productoSeleccionado) {
      setCuotasAsesores([])
      return
    }

    const cargarCuotas = async () => {
      console.log(`🔍 Buscando cuotas para Planta: ${plantaSeleccionada}, Producto: ${productoSeleccionado}`)
      
      const { data, error } = await supabase
        .from('cuotas')
        .select(`
          *,
          usuarios:usuarios(id_usuario, nombre_completo, email)
        `)
        .eq('id_planta', plantaSeleccionada)
        .eq('id_producto', productoSeleccionado)
        .eq('tipo_registro', 'asesor')
        .eq('estado', 'activa')
        .order('fecha_inicio', { ascending: false })

      if (error) {
        console.error('❌ Error al cargar cuotas:', error)
        toast.error('Error al cargar cuotas')
        return
      }

      console.log('✅ Cuotas encontradas:', data)
      setCuotasAsesores(data || [])
    }

    cargarCuotas()
  }, [plantaSeleccionada, productoSeleccionado])

  const handlePlantaChange = (e) => {
    const valor = e.target.value
    console.log('🏭 Planta seleccionada:', valor)
    setPlantaSeleccionada(valor)
    setCuotaOrigen(null)
    setCuotaDestino(null)
  }

  const handleProductoChange = (e) => {
    const valor = e.target.value
    console.log('🛢️ Producto seleccionado:', valor)
    setProductoSeleccionado(valor)
    setCuotaOrigen(null)
    setCuotaDestino(null)
  }

  const handleReasignar = async () => {
    if (!cuotaOrigen || !cuotaDestino) {
      return toast.error('Selecciona cuota origen y destino')
    }
    if (cuotaOrigen.id === cuotaDestino.id) {
      return toast.error('La cuota origen y destino deben ser diferentes')
    }
    if (!cantidad || Number(cantidad) <= 0) {
      return toast.error('Ingresa una cantidad válida')
    }
    if (!motivo.trim()) {
      return toast.error('Ingresa el motivo de la reasignación')
    }

    // Validar que la cantidad no exceda el disponible en origen
    const disponibleOrigen = cuotaOrigen.cantidad - (cuotaOrigen.cantidad_reasignada || 0)
    if (Number(cantidad) > disponibleOrigen) {
      return toast.error(`La cantidad excede el disponible en origen (${disponibleOrigen} GLS)`)
    }

    setGuardando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      console.log('💾 Iniciando reasignación...')
      console.log('Origen:', cuotaOrigen)
      console.log('Destino:', cuotaDestino)
      console.log('Cantidad:', cantidad)

      // 1. Actualizar cuota origen (restar cantidad)
      const { error: errOrigen } = await supabase
        .from('cuotas')
        .update({ cantidad_reasignada: (cuotaOrigen.cantidad_reasignada || 0) - Number(cantidad) })
        .eq('id', cuotaOrigen.id)

      if (errOrigen) {
        console.error('❌ Error al actualizar origen:', errOrigen)
        throw errOrigen
      }

      // 2. Actualizar cuota destino (sumar cantidad)
      const { error: errDestino } = await supabase
        .from('cuotas')
        .update({ cantidad_reasignada: (cuotaDestino.cantidad_reasignada || 0) + Number(cantidad) })
        .eq('id', cuotaDestino.id)

      if (errDestino) {
        console.error('❌ Error al actualizar destino:', errDestino)
        throw errDestino
      }

      // 3. Registrar en tabla de reasignaciones
      const { error: errReasig } = await supabase.from('cuotas_reasignaciones').insert({
        id_cuota_origen: cuotaOrigen.id,
        id_cuota_destino: cuotaDestino.id,
        id_asesor_origen: cuotaOrigen.id_asesor,
        id_asesor_destino: cuotaDestino.id_asesor,
        cantidad_reasignada: Number(cantidad),
        motivo: motivo.trim(),
        usuario_admin: user?.id
      })

      if (errReasig) {
        console.error('❌ Error al registrar reasignación:', errReasig)
        throw errReasig
      }

      // 4. Registrar en historial
      const { error: errHist1 } = await supabase.from('cuotas_historial').insert({
        id_cuota: cuotaOrigen.id,
        accion: 'REASIGNACION',
        detalle: `Reasignación de ${cantidad} GLS a ${cuotaDestino.usuarios?.nombre_completo}. Motivo: ${motivo}`,
        usuario_id: user?.id
      })

      const { error: errHist2 } = await supabase.from('cuotas_historial').insert({
        id_cuota: cuotaDestino.id,
        accion: 'REASIGNACION',
        detalle: `Recibió ${cantidad} GLS de ${cuotaOrigen.usuarios?.nombre_completo}. Motivo: ${motivo}`,
        usuario_id: user?.id
      })

      if (errHist1 || errHist2) {
        console.error('❌ Error al registrar historial:', errHist1 || errHist2)
      }

      console.log('✅ Reasignación completada exitosamente')
      toast.success('Reasignación ejecutada exitosamente')
      
      // Resetear formulario
      setCuotaOrigen(null)
      setCuotaDestino(null)
      setCantidad('')
      setMotivo('')
    } catch (error) {
      console.error('❌ Error:', error)
      toast.error('Error al reasignar: ' + error.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Card style={{ padding: '30px', maxWidth: '1000px', margin: '0 auto' }}>
      <h2 style={{ color: '#0033A0', marginBottom: '20px', textAlign: 'center' }}>Reasignar Cuota entre Asesores</h2>
      
      {/* Filtros: Planta y Producto */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>Planta *</label>
          <select 
            value={plantaSeleccionada} 
            onChange={handlePlantaChange}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', backgroundColor: 'white', color: 'black' }}
          >
            <option value="">-- Seleccionar planta --</option>
            {plantas.map(p => (
              <option key={p.id_planta} value={p.id_planta}>{p.nombre}</option>
            ))}
          </select>
          {plantaSeleccionada && (
            <small style={{ color: '#0033A0', fontWeight: 'bold', marginTop: '5px', display: 'block' }}>
              ID: {plantas.find(p => p.id_planta === plantaSeleccionada)?.codigo}
            </small>
          )}
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>Producto *</label>
          <select 
            value={productoSeleccionado} 
            onChange={handleProductoChange}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', backgroundColor: 'white', color: 'black' }}
          >
            <option value="">-- Seleccionar producto --</option>
            {productos.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
          {productoSeleccionado && (
            <small style={{ color: '#0033A0', fontWeight: 'bold', marginTop: '5px', display: 'block' }}>
              ID: {productos.find(p => p.id === productoSeleccionado)?.codigo}
            </small>
          )}
        </div>
      </div>

      {/* Cuotas disponibles */}
      {plantaSeleccionada && productoSeleccionado && (
        <>
          <hr style={{ margin: '30px 0', border: 'none', borderTop: '2px solid #e5e7eb' }} />
          
          {cuotasAsesores.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <p style={{ fontSize: '16px' }}>⚠️ No hay cuotas de asesores para esta planta y producto</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                {/* Cuota Origen */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px', color: '#dc2626' }}>
                    📤 Cuota Origen (de donde se resta) *
                  </label>
                  <select 
                    value={cuotaOrigen?.id || ''} 
                    onChange={(e) => setCuotaOrigen(cuotasAsesores.find(c => c.id === e.target.value))}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', backgroundColor: 'white', color: 'black' }}
                  >
                    <option value="">-- Seleccionar --</option>
                    {cuotasAsesores.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.usuarios?.nombre_completo} - {c.fecha_inicio} ({c.cantidad - (c.cantidad_reasignada || 0)} GLS disp.)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cuota Destino */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px', color: '#059669' }}>
                    📥 Cuota Destino (a donde se suma) *
                  </label>
                  <select 
                    value={cuotaDestino?.id || ''} 
                    onChange={(e) => setCuotaDestino(cuotasAsesores.find(c => c.id === e.target.value))}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', backgroundColor: 'white', color: 'black' }}
                  >
                    <option value="">-- Seleccionar --</option>
                    {cuotasAsesores.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.usuarios?.nombre_completo} - {c.fecha_inicio} ({c.cantidad - (c.cantidad_reasignada || 0)} GLS disp.)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Resumen de la operación */}
              {cuotaOrigen && cuotaDestino && cuotaOrigen.id !== cuotaDestino.id && (
                <div style={{ background: '#f0f9ff', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #bae6fd' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#0033A0' }}>📋 Resumen de la reasignación</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
                    <p style={{ margin: 0 }}><strong>De:</strong> {cuotaOrigen.usuarios?.nombre_completo}</p>
                    <p style={{ margin: 0 }}><strong>Para:</strong> {cuotaDestino.usuarios?.nombre_completo}</p>
                    <p style={{ margin: 0, color: '#dc2626' }}><strong>Disponible origen:</strong> {cuotaOrigen.cantidad - (cuotaOrigen.cantidad_reasignada || 0)} GLS</p>
                    <p style={{ margin: 0, color: '#059669' }}><strong>Disponible destino:</strong> {cuotaDestino.cantidad - (cuotaDestino.cantidad_reasignada || 0)} GLS</p>
                  </div>
                </div>
              )}

              {/* Campo: Cantidad */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                  Cantidad a reasignar (GLS) *
                </label>
                <input 
                  type="number" 
                  step="0.01"
                  value={cantidad} 
                  onChange={(e) => setCantidad(e.target.value)}
                  placeholder="0.00"
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', backgroundColor: 'white', color: 'black', boxSizing: 'border-box' }}
                />
              </div>

              {/* Campo: Motivo */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                  Motivo de la reasignación *
                </label>
                <textarea 
                  value={motivo} 
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ej: Ajuste por demanda, redistribución de zona, etc."
                  rows={3}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', backgroundColor: 'white', color: 'black', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              {/* Botones de acción */}
              <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
                <Boton variante="outline" onClick={onVolver}>Cancelar</Boton>
                <Boton 
                  variante="danger" 
                  onClick={handleReasignar} 
                  disabled={guardando}
                  style={{ marginLeft: 'auto' }}
                >
                  {guardando ? 'Procesando...' : '🔄 Ejecutar Reasignación'}
                </Boton>
              </div>
            </>
          )}
        </>
      )}

      {/* Mensaje si no se han completado los campos obligatorios */}
      {!plantaSeleccionada && !productoSeleccionado && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <p style={{ fontSize: '16px', marginBottom: '10px' }}>⚠️ Completa los campos obligatorios para continuar</p>
          <p style={{ fontSize: '14px' }}>Selecciona Planta y Producto</p>
        </div>
      )}
    </Card>
  )
}