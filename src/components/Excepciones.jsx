import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { PageHeader, Card, Input, Select, Boton, Tabla } from './ui'

export default function Excepciones() {
  // --- ESTADOS VENTA CAÍDA ---
  const [scopAnular, setScopAnular] = useState('')
  const [motivo, setMotivo] = useState('')
  const [mensajeVenta, setMensajeVenta] = useState('')
  const [cargandoVenta, setCargandoVenta] = useState(false)

  // --- ESTADOS ROTURA ---
  const [correlativoRoto, setCorrelativoRoto] = useState('')
  const [causa, setCausa] = useState('Falla de fábrica')
  const [fotoRotura, setFotoRotura] = useState(null)
  const [mensajeRotura, setMensajeRotura] = useState('')
  const [cargandoRotura, setCargandoRotura] = useState(false)

  // --- ESTADOS DEVOLUCIONES ---
  const [devueltos, setDevueltos] = useState([])
  const [mensajeVerificacion, setMensajeVerificacion] = useState('')

  // Cargar precintos en estado DEVUELTO
  const cargarDevueltos = async () => {
    const { data } = await supabase
      .from('precintos')
      .select('id_precinto, correlativo, plantas(nombre)')
      .eq('estado', 'DEVUELTO')
    if (data) setDevueltos(data)
  }

  useEffect(() => {
    cargarDevueltos()
  }, [])

  // --- ANULAR VENTA ---
  const anularVenta = async (e) => {
    e.preventDefault()
    setCargandoVenta(true)
    setMensajeVenta('')

    const { data: transaccion, error: errorBusqueda } = await supabase
      .from('transacciones').select('id_transaccion, estado').eq('scop', scopAnular).single()

    if (errorBusqueda || !transaccion) {
      setMensajeVenta('❌ No se encontró ningún viaje con ese SCOP.')
      setCargandoVenta(false)
      return
    }
    if (transaccion.estado === 'ANULADA') {
      setMensajeVenta('⚠️ Este viaje ya fue anulado anteriormente.')
      setCargandoVenta(false)
      return
    }

    const { data, error } = await supabase.rpc('fn_anular_venta_caida', {
      p_id_transaccion: transaccion.id_transaccion, p_motivo: motivo
    })

    if (error) {
      setMensajeVenta('❌ Error: ' + error.message)
    } else {
      setMensajeVenta(`✅ ${data}`)
      setScopAnular('')
      setMotivo('')
      cargarDevueltos()
    }
    setCargandoVenta(false)
  }

  // --- REPORTAR ROTURA (con foto) ---
  const reportarRotura = async (e) => {
    e.preventDefault()
    setCargandoRotura(true)
    setMensajeRotura('')

    if (!fotoRotura) {
      setMensajeRotura('❌ La foto de evidencia es OBLIGATORIA.')
      setCargandoRotura(false)
      return
    }

    const { data: precinto, error: errorBusqueda } = await supabase
      .from('precintos').select('id_precinto, estado').eq('correlativo', correlativoRoto).limit(1).single()

    if (errorBusqueda || !precinto) {
      setMensajeRotura('❌ No se encontró el precinto.')
      setCargandoRotura(false)
      return
    }
    if (precinto.estado !== 'ASIGNADO') {
      setMensajeRotura(`❌ El precinto está ${precinto.estado}. Solo se rompen los ASIGNADOS.`)
      setCargandoRotura(false)
      return
    }

    try {
      const fileExt = fotoRotura.name.split('.').pop()
      const fileName = `${correlativoRoto}_${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('evidencias')
        .upload(fileName, fotoRotura)

      if (uploadError) throw new Error('Error al subir la foto: ' + uploadError.message)

      const { data: urlData } = supabase.storage
        .from('evidencias')
        .getPublicUrl(fileName)

      const fotoUrl = urlData.publicUrl

      const { data, error } = await supabase.rpc('fn_reportar_rotura', {
        p_id_precinto: precinto.id_precinto,
        p_causa: causa,
        p_observacion: `Foto: ${fotoUrl}`
      })

      if (error) throw new Error(error.message)

      if (causa === 'Falla de fábrica') {
        const { error: ncError } = await supabase
          .from('no_conformidades')
          .insert([{
            precinto_id: correlativoRoto,
            motivo: 'Falla de fábrica detectada en uso',
            descripcion: 'Reportado automáticamente desde el módulo de excepciones.',
            foto_url: fotoUrl
          }])

        if (ncError) console.error('Error al crear no conformidad:', ncError)
      }

      setMensajeRotura(`✅ ${data}`)
      setCorrelativoRoto('')
      setFotoRotura(null)
      // Resetear el input file
      const fileInput = document.getElementById('input-foto-rotura')
      if (fileInput) fileInput.value = ''

    } catch (error) {
      setMensajeRotura('❌ Error: ' + error.message)
    } finally {
      setCargandoRotura(false)
    }
  }

  const verificarIntegridad = async (id_precinto, estado_fisico) => {
    setMensajeVerificacion('')
    const { data, error } = await supabase.rpc('fn_verificar_devolucion', {
      p_id_precinto: id_precinto, p_estado_fisico: estado_fisico
    })

    if (error) {
      setMensajeVerificacion('❌ Error: ' + error.message)
    } else {
      setMensajeVerificacion(`✅ ${data}`)
      cargarDevueltos()
    }
  }

  // Helpers para clases de alertas
  const claseMensaje = (msg) => {
    if (!msg) return ''
    return msg.includes('❌') || msg.includes('⚠️')
      ? 'alert alert-error'
      : 'alert alert-success'
  }

  return (
    <div className="page-container" style={{ maxWidth: '1000px' }}>
      <PageHeader titulo="Gestión de Excepciones" />

      {/* --- DOS TARJETAS LADO A LADO --- */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>

        {/* TARJETA 1: VENTA CAÍDA */}
        <div style={{ flex: '1 1 350px', minWidth: '300px' }}>
          <Card titulo="Anular Venta Caída">
            <form onSubmit={anularVenta}>
              <Input
                label="SCOP del viaje"
                value={scopAnular}
                onChange={(e) => setScopAnular(e.target.value)}
                placeholder="Ej. SCOP-12345"
                required
              />
              <Input
                label="Motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Motivo de la anulación"
                required
              />
              <div className="form-actions">
                <Boton
                  tipo="submit"
                  variante="warning"
                  disabled={cargandoVenta}
                >
                  {cargandoVenta ? 'Anulando...' : 'Anular Viaje'}
                </Boton>
              </div>
            </form>
            {mensajeVenta && (
              <div className={claseMensaje(mensajeVenta)} style={{ marginTop: '15px', marginBottom: 0 }}>
                {mensajeVenta}
              </div>
            )}
          </Card>
        </div>

        {/* TARJETA 2: ROTURA */}
        <div style={{ flex: '1 1 350px', minWidth: '300px' }}>
          <Card titulo="Reportar Rotura">
            <form onSubmit={reportarRotura}>
              <Input
                label="Número de precinto"
                value={correlativoRoto}
                onChange={(e) => setCorrelativoRoto(e.target.value)}
                placeholder="Ej. PA-000123"
                required
              />

              <Select
                label="Causa"
                value={causa}
                onChange={(e) => setCausa(e.target.value)}
                placeholder={null}
                options={[
                  { value: 'Falla de fábrica', label: 'Falla de fábrica' },
                  { value: 'Mal manipuleo', label: 'Mal manipuleo' }
                ]}
              />

              {/* Input de archivo — se mantiene como input nativo */}
              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--danger-red)' }}>
                  📷 Foto de Evidencia <span className="required">*</span>
                </label>
                <div style={{
                  backgroundColor: '#f8f9fa',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px dashed var(--danger-red)'
                }}>
                  <input
                    id="input-foto-rotura"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => setFotoRotura(e.target.files[0])}
                    style={{ fontSize: '12px', width: '100%' }}
                  />
                </div>
              </div>

              <div className="form-actions">
                <Boton
                  tipo="submit"
                  variante="danger"
                  disabled={cargandoRotura}
                >
                  {cargandoRotura ? 'Subiendo...' : 'Reportar'}
                </Boton>
              </div>
            </form>
            {mensajeRotura && (
              <div className={claseMensaje(mensajeRotura)} style={{ marginTop: '15px', marginBottom: 0 }}>
                {mensajeRotura}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* --- SECCIÓN 3: DEVOLUCIONES --- */}
      <Card titulo="Verificación de Precintos Devueltos">
        <p style={{ fontSize: '13px', color: 'var(--text-light)', marginBottom: '15px' }}>
          Aquí aparecen los precintos de ventas caídas. Revisa su estado físico para reincorporarlos.
        </p>

        {mensajeVerificacion && (
          <div className={claseMensaje(mensajeVerificacion)}>
            {mensajeVerificacion}
          </div>
        )}

        <Tabla
          columnas={['Planta', 'Correlativo', 'Acción']}
          hayDatos={devueltos.length > 0}
          vacio="No hay precintos pendientes de verificación."
        >
          {devueltos.map((p) => (
            <tr key={p.id_precinto}>
              <td>{p.plantas?.nombre}</td>
              <td style={{ fontWeight: 'bold' }}>{p.correlativo}</td>
              <td>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <Boton
                    variante="success"
                    tamano="sm"
                    onClick={() => verificarIntegridad(p.id_precinto, 'INTACTO')}
                  >
                    ✅ Intacto
                  </Boton>
                  <Boton
                    variante="danger"
                    tamano="sm"
                    onClick={() => verificarIntegridad(p.id_precinto, 'DAÑADO')}
                  >
                    ❌ Dañado
                  </Boton>
                </div>
              </td>
            </tr>
          ))}
        </Tabla>
      </Card>
    </div>
  )
}