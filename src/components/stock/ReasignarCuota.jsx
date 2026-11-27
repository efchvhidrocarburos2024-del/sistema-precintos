import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import toast from 'react-hot-toast'
import { Card, Boton } from '../ui'

export default function ReasignarCuota({ onVolver, rol }) {
  const [plantas, setPlantas] = useState([])
  const [productos, setProductos] = useState([])
  const [plantaSeleccionada, setPlantaSeleccionada] = useState('')
  const [productoSeleccionado, setProductoSeleccionado] = useState('')
  const [cuotasOrigen, setCuotasOrigen] = useState([])
  const [cuotasDestino, setCuotasDestino] = useState([])
  const [cuotaOrigen, setCuotaOrigen] = useState(null)
  const [cuotaDestino, setCuotaDestino] = useState(null)
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    const cargarCatalogos = async () => {
      const [p, prod] = await Promise.all([
        supabase.from('plantas').select('id, nombre, codigo').eq('activo', true).order('nombre'),
        supabase.from('productos').select('id, nombre, codigo').eq('activo', true).order('nombre')
      ])
      setPlantas(p.data || [])
      setProductos(prod.data || [])
    }
    cargarCatalogos()
  }, [])

  // Cargar cuotas cuando cambia planta o producto
  useEffect(() => {
    if (!plantaSeleccionada || !productoSeleccionado) {
      setCuotasOrigen([])
      setCuotasDestino([])
      return
    }

    const cargarCuotas = async () => {
      const { data, error } = await supabase
        .from('cuotas')
        .select(`
          *,
          usuarios:asesor_id (nombre_completo, email)
        `)
        .eq('planta_id', plantaSeleccionada)
        .eq('producto_id', productoSeleccionado)
        .eq('tipo_registro', 'asesor')
        .eq('estado', 'activa')
        .order('fecha_inicio', { ascending: false })

      if (error) {
        toast.error('Error al cargar cuotas')
        return
      }

      setCuotasOrigen(data || [])
      setCuotasDestino(data || [])
    }

    cargarCuotas()
  }, [plantaSeleccionada, productoSeleccionado])

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

      // 1. Actualizar cuota origen (restar cantidad)
      const { error: errOrigen } = await supabase
        .from('cuotas')
        .update({ cantidad_reasignada: (cuotaOrigen.cantidad_reasignada || 0) - Number(cantidad) })
        .eq('id', cuotaOrigen.id)

      if (errOrigen) throw errOrigen

      // 2. Actualizar cuota destino (sumar cantidad)
      const { error: errDestino } = await supabase
        .from('cuotas')
        .update({ cantidad_reasignada: (cuotaDestino.cantidad_reasignada || 0) + Number(cantidad) })
        .eq('id', cuotaDestino.id)

      if (errDestino) throw errDestino

      // 3. Registrar en tabla de reasignaciones
      const { error: errReasig } = await supabase.from('cuotas_reasignaciones').insert({
        cuota_origen_id: cuotaOrigen.id,
        cuota_destino_id: cuotaDestino.id,
        cantidad: Number(cantidad),
        motivo: motivo.trim(),
        usuario_admin_id: user?.id
      })

      if (errReasig) throw errReasig

      // 4. Registrar en historial
      await supabase.from('cuotas_historial').insert([
        {
          cuota_id: cuotaOrigen.id,
          accion: 'REASIGNACION',
          detalle: `Reasignación de ${cantidad} GLS a ${cuotaDestino.usuarios?.nombre_completo}. Motivo: ${motivo}`,
          usuario_id: user?.id
        },
        {
          cuota_id: cuotaDestino.id,
          accion: 'REASIGNACION',
          detalle: `Recibió ${cantidad} GLS de ${cuotaOrigen.usuarios?.nombre_completo}. Motivo: ${motivo}`,
          usuario_id: user?.id
        }
      ])

      toast.success('Reasignación ejecutada exitosamente')
      
      // Resetear formulario
      setCuotaOrigen(null)
      setCuotaDestino(null)
      setCantidad('')
      setMotivo('')
    } catch (error) {
      console.error(error)
      toast.error('Error al reasignar: ' + error.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Card style={{ padding: '30px', maxWidth: '1000px', margin: '0 auto' }}>
      <h2 style={{ color: '#0033A0', marginBottom: '20px' }}>Reasignar Cuota entre Asesores</h2>
      
      {/* Filtros: Planta y Producto */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>Planta</label>
          <select 
            value={plantaSeleccionada} 
            onChange={(e) => setPlantaSeleccionada(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}
          >
            <option value="">-- Seleccionar planta --</option>
            {plantas.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>Producto</label>
          <select 
            value={productoSeleccionado} 
            onChange={(e) => setProductoSeleccionado(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}
          >
            <option value="">-- Seleccionar producto --</option>
            {productos.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Cuotas disponibles */}
      {plantaSeleccionada && productoSeleccionado && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          {/* Cuota Origen */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px', color: '#dc2626' }}>
              📤 Cuota Origen (de donde se resta)
            </label>
            <select 
              value={cuotaOrigen?.id || ''} 
              onChange={(e) => setCuotaOrigen(cuotasOrigen.find(c => c.id === e.target.value))}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}
            >
              <option value="">-- Seleccionar --</option>
              {cuotasOrigen.map(c => (
                <option key={c.id} value={c.id}>
                  {c.usuarios?.nombre_completo} - {c.fecha_inicio} ({c.cantidad - (c.cantidad_reasignada || 0)} GLS disp.)
                </option>
              ))}
            </select>
          </div>

          {/* Cuota Destino */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px', color: '#059669' }}>
              📥 Cuota Destino (a donde se suma)
            </label>
            <select 
              value={cuotaDestino?.id || ''} 
              onChange={(e) => setCuotaDestino(cuotasDestino.find(c => c.id === e.target.value))}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}
            >
              <option value="">-- Seleccionar --</option>
              {cuotasDestino.map(c => (
                <option key={c.id} value={c.id}>
                  {c.usuarios?.nombre_completo} - {c.fecha_inicio} ({c.cantidad - (c.cantidad_reasignada || 0)} GLS disp.)
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

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
          Cantidad a reasignar (GLS)
        </label>
        <input 
          type="number" 
          step="0.01"
          value={cantidad} 
          onChange={(e) => setCantidad(e.target.value)}
          placeholder="0.00"
          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}
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
          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', resize: 'vertical' }}
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
    </Card>
  )
}