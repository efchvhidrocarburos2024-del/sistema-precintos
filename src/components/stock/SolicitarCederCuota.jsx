import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import toast from 'react-hot-toast'
import { Card, Boton } from '../ui'

export default function SolicitarCederCuota({ onVolver, rol, sesion }) {
  const [tipoOperacion, setTipoOperacion] = useState('solicitar') // 'solicitar' | 'ceder'
  const [cuotasAsesor, setCuotasAsesor] = useState([])
  const [asesores, setAsesores] = useState([])
  const [cuotaSeleccionada, setCuotaSeleccionada] = useState(null)
  const [asesorDestino, setAsesorDestino] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    const cargarDatos = async () => {
      // Cargar cuotas del asesor logueado (tipo_registro = 'asesor')
      const { data: cuotas, error: errCuotas } = await supabase
        .from('cuotas')
        .select(`
          *,
          plantas:planta_id (nombre, codigo),
          productos:producto_id (nombre, codigo),
          grupos_productos:grupo_producto_id (nombre, codigo)
        `)
        .eq('tipo_registro', 'asesor')
        .eq('asesor_id', sesion?.user?.id)
        .eq('estado', 'activa')
        .order('fecha_inicio', { ascending: false })

      if (errCuotas) {
        toast.error('Error al cargar cuotas')
        return
      }

      setCuotasAsesor(cuotas || [])

      // Cargar lista de asesores para destino
      const { data: usuarios, error: errUsers } = await supabase
        .from('usuarios')
        .select('id, nombre_completo, email')
        .eq('rol_id', 'asesor_comercial')
        .eq('activo', true)
        .order('nombre_completo')

      if (!errUsers) {
        setAsesores(usuarios || [])
      }
    }

    cargarDatos()
  }, [sesion])

  const handleCuotaChange = (e) => {
    const cuota = cuotasAsesor.find(c => c.id === e.target.value)
    setCuotaSeleccionada(cuota)
  }

  const guardar = async () => {
    if (!cuotaSeleccionada) return toast.error('Selecciona una cuota')
    if (!cantidad || Number(cantidad) <= 0) return toast.error('Ingresa una cantidad válida')
    if (!motivo.trim()) return toast.error('Ingresa el motivo')
    
    if (tipoOperacion === 'ceder' && !asesorDestino) {
      return toast.error('Selecciona el asesor destino')
    }

    // Validar que la cantidad no exceda el disponible
    const disponible = cuotaSeleccionada.cantidad - (cuotaSeleccionada.cantidad_reasignada || 0)
    if (Number(cantidad) > disponible) {
      return toast.error(`La cantidad excede el disponible (${disponible} GLS)`)
    }

    setGuardando(true)
    try {
      const { error } = await supabase.from('cuotas_solicitudes').insert({
        cuota_origen_id: cuotaSeleccionada.id,
        cuota_destino_id: tipoOperacion === 'ceder' ? asesorDestino : null,
        tipo: tipoOperacion,
        cantidad: Number(cantidad),
        motivo: motivo.trim(),
        estado: 'pendiente',
        solicitante_id: sesion?.user?.id,
        creado_por: sesion?.user?.id
      })

      if (error) throw error

      toast.success(tipoOperacion === 'solicitar' 
        ? 'Solicitud enviada. Esperando aprobación.' 
        : 'Cesión enviada. Esperando aprobación del asesor destino.')
      
      // Resetear formulario
      setCuotaSeleccionada(null)
      setCantidad('')
      setMotivo('')
      setAsesorDestino('')
    } catch (error) {
      console.error(error)
      toast.error('Error al guardar: ' + error.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Card style={{ padding: '30px', maxWidth: '900px', margin: '0 auto' }}>
      <h2 style={{ color: '#0033A0', marginBottom: '20px' }}>Solicitar / Ceder Cuota</h2>
      
      {/* Selector de tipo de operación */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <Boton 
          variante={tipoOperacion === 'solicitar' ? 'primary' : 'outline'} 
          onClick={() => setTipoOperacion('solicitar')}
        >
          📥 Solicitar más cuota
        </Boton>
        <Boton 
          variante={tipoOperacion === 'ceder' ? 'primary' : 'outline'} 
          onClick={() => setTipoOperacion('ceder')}
        >
          📤 Ceder parte de mi cuota
        </Boton>
      </div>

      {/* Información del asesor logueado */}
      <div style={{ background: '#f0f9ff', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#0033A0', fontWeight: 'bold' }}>
          👤 Asesor: {sesion?.user?.email || 'Cargando...'}
        </p>
      </div>

      {/* Selección de cuota */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
          Selecciona tu cuota asignada
        </label>
        <select 
          value={cuotaSeleccionada?.id || ''} 
          onChange={handleCuotaChange}
          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}
        >
          <option value="">-- Seleccionar --</option>
          {cuotasAsesor.map(c => (
            <option key={c.id} value={c.id}>
              {c.plantas?.nombre || 'Planta'} - {c.productos?.nombre || 'Producto'} ({c.fecha_inicio} a {c.fecha_fin}) - Disponible: {c.cantidad - (c.cantidad_reasignada || 0)} GLS
            </option>
          ))}
        </select>
      </div>

      {/* Panel informativo de la cuota seleccionada */}
      {cuotaSeleccionada && (
        <div style={{ background: '#f9fafb', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e5e7eb' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#0033A0' }}>📊 Detalles de la cuota</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
            <p style={{ margin: 0 }}><strong>Planta:</strong> {cuotaSeleccionada.plantas?.nombre}</p>
            <p style={{ margin: 0 }}><strong>Producto:</strong> {cuotaSeleccionada.productos?.nombre}</p>
            <p style={{ margin: 0 }}><strong>Período:</strong> {cuotaSeleccionada.fecha_inicio} - {cuotaSeleccionada.fecha_fin}</p>
            <p style={{ margin: 0 }}><strong>Tipo:</strong> {cuotaSeleccionada.tipo_cuota}</p>
            <p style={{ margin: 0, color: '#059669' }}><strong>Cantidad asignada:</strong> {cuotaSeleccionada.cantidad} GLS</p>
            <p style={{ margin: 0, color: '#dc2626' }}><strong>Ya reasignada:</strong> {cuotaSeleccionada.cantidad_reasignada || 0} GLS</p>
            <p style={{ margin: 0, gridColumn: '1 / -1', fontWeight: 'bold', color: '#0033A0' }}>
              💰 Disponible: {cuotaSeleccionada.cantidad - (cuotaSeleccionada.cantidad_reasignada || 0)} GLS
            </p>
          </div>
        </div>
      )}

      {/* Campo: Asesor destino (solo para ceder) */}
      {tipoOperacion === 'ceder' && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
            Asesor destino (quien recibirá la cuota)
          </label>
          <select 
            value={asesorDestino} 
            onChange={(e) => setAsesorDestino(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}
          >
            <option value="">-- Seleccionar asesor --</option>
            {asesores.map(a => (
              <option key={a.id} value={a.id}>
                {a.nombre_completo} ({a.email})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Campo: Cantidad */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
          Cantidad (GLS)
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
          Motivo de la solicitud/cesión
        </label>
        <textarea 
          value={motivo} 
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej: Aumento de demanda en mi zona, exceso de cuota asignada, etc."
          rows={3}
          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', resize: 'vertical' }}
        />
      </div>

      {/* Botones de acción */}
      <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
        <Boton variante="outline" onClick={onVolver}>Cancelar</Boton>
        <Boton 
          variante="primary" 
          onClick={guardar} 
          disabled={guardando}
          style={{ marginLeft: 'auto' }}
        >
          {guardando ? 'Enviando...' : (tipoOperacion === 'solicitar' ? '📥 Enviar Solicitud' : '📤 Enviar Cesión')}
        </Boton>
      </div>
    </Card>
  )
}