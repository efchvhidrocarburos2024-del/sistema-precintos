import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function Excepciones() {
  // --- ESTADOS VENTA CAÍDA ---
  const [scopAnular, setScopAnular] = useState('')
  const [motivo, setMotivo] = useState('')
  const [mensajeVenta, setMensajeVenta] = useState('')
  const [cargandoVenta, setCargandoVenta] = useState(false)

  // --- ESTADOS ROTURA ---
  const [correlativoRoto, setCorrelativoRoto] = useState('')
  const [causa, setCausa] = useState('Falla de fábrica')
  const [fotoRotura, setFotoRotura] = useState(null) // NUEVO ESTADO
  const [mensajeRotura, setMensajeRotura] = useState('')
  const [cargandoRotura, setCargandoRotura] = useState(false)

  // --- ESTADOS DEVOLUCIONES ---
  const [devueltos, setDevueltos] = useState([])
  const [mensajeVerificacion, setMensajeVerificacion] = useState('')

  // Cargar precintos que están en estado DEVUELTO
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

  // --- FUNCIONES ---
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
      setScopAnular(''); setMotivo(''); cargarDevueltos(); // Recargamos la lista de devueltos
    }
    setCargandoVenta(false)
  }

  // --- LÓGICA DE ROTURA ACTUALIZADA CON FOTO Y NO CONFORMIDAD ---
  const reportarRotura = async (e) => {
    e.preventDefault()
    setCargandoRotura(true)
    setMensajeRotura('')

    // 1. Validar que se haya subido una foto
    if (!fotoRotura) {
      setMensajeRotura('❌ La foto de evidencia es OBLIGATORIA.')
      setCargandoRotura(false)
      return
    }

    // 2. Buscar el precinto
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
      // 3. Subir la foto al Storage
      const fileExt = fotoRotura.name.split('.').pop()
      const fileName = `${correlativoRoto}_${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('evidencias')
        .upload(fileName, fotoRotura)

      if (uploadError) throw new Error("Error al subir la foto: " + uploadError.message)

      // 4. Obtener la URL pública de la foto
      const { data: urlData } = supabase.storage
        .from('evidencias')
        .getPublicUrl(fileName)
      
      const fotoUrl = urlData.publicUrl

      // 5. Ejecutar tu RPC para cambiar el estado del precinto
      const { data, error } = await supabase.rpc('fn_reportar_rotura', {
        p_id_precinto: precinto.id_precinto, 
        p_causa: causa, 
        p_observacion: `Foto: ${fotoUrl}` // Pasamos la URL como observación
      })

      if (error) throw new Error(error.message)

      // 6. Si es falla de fábrica, crear la No Conformidad automáticamente
      if (causa === 'Falla de fábrica') {
        const { error: ncError } = await supabase
          .from('no_conformidades')
          .insert([{
            precinto_id: correlativoRoto,
            motivo: "Falla de fábrica detectada en uso",
            descripcion: "Reportado automáticamente desde el módulo de excepciones.",
            foto_url: fotoUrl
          }])
        
        if (ncError) console.error("Error al crear no conformidad:", ncError)
      }

      setMensajeRotura(`✅ ${data}`)
      setCorrelativoRoto('')
      setFotoRotura(null) // Limpiar el input de archivo

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
      cargarDevueltos() // Recargamos la lista
    }
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', fontFamily: 'Arial', padding: '20px' }}>
      
      <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '30px' }}>
        {/* TARJETA 1: VENTA CAÍDA */}
        <div style={{ width: '350px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: 'white', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
          <h3 style={{ textAlign: 'center', color: '#D97706' }}>Anular Venta Caída</h3>
          <form onSubmit={anularVenta} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input type="text" placeholder="SCOP del viaje" value={scopAnular} onChange={(e) => setScopAnular(e.target.value)} required style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
            <input type="text" placeholder="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} required style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
            <button type="submit" disabled={cargandoVenta} style={{ padding: '10px', background: '#D97706', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Anular Viaje</button>
          </form>
          {mensajeVenta && <p style={{ marginTop: '15px', fontSize: '13px', fontWeight: 'bold', color: mensajeVenta.includes('❌') ? 'red' : 'green' }}>{mensajeVenta}</p>}
        </div>

        {/* TARJETA 2: ROTURA EN USO (ACTUALIZADA) */}
        <div style={{ width: '350px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: 'white', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
          <h3 style={{ textAlign: 'center', color: '#DC2626' }}>Reportar Rotura</h3>
          <form onSubmit={reportarRotura} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input type="text" placeholder="Número de precinto" value={correlativoRoto} onChange={(e) => setCorrelativoRoto(e.target.value)} required style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
            
            <select value={causa} onChange={(e) => setCausa(e.target.value)} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
              <option value="Falla de fábrica">Falla de fábrica</option>
              <option value="Mal manipuleo">Mal manipuleo</option>
            </select>

            {/* NUEVO INPUT DE FOTO */}
            <div style={{ backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '4px', border: '1px dashed #DC2626' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold', color: '#DC2626' }}>
                📷 Foto de Evidencia (Obligatoria)
              </label>
              <input 
                type="file" 
                accept="image/*" 
                capture="environment" // Abre la cámara directo en celulares
                onChange={(e) => setFotoRotura(e.target.files[0])}
                style={{ fontSize: '12px', width: '100%' }}
              />
            </div>

            <button type="submit" disabled={cargandoRotura} style={{ padding: '10px', background: '#DC2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              {cargandoRotura ? 'Subiendo...' : 'Reportar'}
            </button>
          </form>
          {mensajeRotura && <p style={{ marginTop: '15px', fontSize: '13px', fontWeight: 'bold', color: mensajeRotura.includes('❌') ? 'red' : 'green' }}>{mensajeRotura}</p>}
        </div>
      </div>

      {/* SECCIÓN 3: VERIFICACIÓN DE DEVOLUCIONES */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
        <h3 style={{ color: '#0B5FA5', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>Verificación de Precintos Devueltos</h3>
        <p style={{ fontSize: '13px', color: '#666' }}>Aquí aparecen los precintos de ventas caídas. Revisa su estado físico para reincorporarlos.</p>
        
        {mensajeVerificacion && <p style={{ fontWeight: 'bold', color: mensajeVerificacion.includes('❌') ? 'red' : 'green' }}>{mensajeVerificacion}</p>}

        {devueltos.length === 0 ? (
          <p style={{ color: '#999', fontStyle: 'italic' }}>No hay precintos pendientes de verificación.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', fontSize: '13px' }}>
            <thead>
              <tr style={{ textAlign: 'left', backgroundColor: '#f9f9f9' }}>
                <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Planta</th>
                <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Correlativo</th>
                <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {devueltos.map((p) => (
                <tr key={p.id_precinto}>
                  <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{p.plantas?.nombre}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>{p.correlativo}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #eee', display: 'flex', gap: '10px' }}>
                    <button onClick={() => verificarIntegridad(p.id_precinto, 'INTACTO')} style={{ padding: '5px 10px', background: '#16A34A', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✅ Intacto</button>
                    <button onClick={() => verificarIntegridad(p.id_precinto, 'DAÑADO')} style={{ padding: '5px 10px', background: '#DC2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>❌ Dañado</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}