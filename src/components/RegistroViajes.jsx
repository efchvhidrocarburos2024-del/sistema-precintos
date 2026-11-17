import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function RegistroViajes() {
  const [scop, setScop] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(false)
  
  // Nuevos estados para manejar la planta automática
  const [idPlanta, setIdPlanta] = useState('')
  const [nombrePlanta, setNombrePlanta] = useState('')

  useEffect(() => {
    async function obtenerPlantaUsuario() {
      const { data: { session } } = await supabase.auth.getSession()
      const plantaId = session.user.user_metadata?.id_planta

      if (plantaId) {
        setIdPlanta(plantaId)
        // Buscamos el nombre de la planta para mostrarlo en pantalla
        const { data } = await supabase.from('plantas').select('nombre').eq('id_planta', plantaId).single()
        if (data) setNombrePlanta(data.nombre)
      }
    }
    obtenerPlantaUsuario()
  }, [])

  const registrarViaje = async (e) => {
    e.preventDefault()
    
    if (scop.length !== 11) {
      setMensaje('❌ El SCOP debe tener exactamente 11 dígitos.')
      return
    }

    setCargando(true)
    setMensaje('')

    const { data, error } = await supabase.rpc('fn_registrar_viaje_scop', {
      p_id_planta: idPlanta, // Usamos la planta del usuario automáticamente
      p_scop: scop,
      p_cantidad: parseInt(cantidad)
    })

    if (error) {
      setMensaje('❌ Error: ' + error.message)
    } else {
      setMensaje(`✅ ${data}`)
      setScop('')
      setCantidad('')
    }
    setCargando(false)
  }

  if (!idPlanta) return <p style={{ textAlign: 'center', marginTop: '50px' }}>Cargando perfil de usuario...</p>

  return (
    <div style={{ maxWidth: '400px', margin: '20px auto', fontFamily: 'Arial', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', backgroundColor: 'white' }}>
      <h2 style={{ textAlign: 'center', color: '#16A34A', marginBottom: '5px' }}>Registro de Viaje</h2>
      <p style={{ color: '#666', fontSize: '14px', textAlign: 'center', marginBottom: '20px', fontWeight: 'bold' }}>
        Planta: {nombrePlanta}
      </p>

      <form onSubmit={registrarViaje} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        <label style={{ fontWeight: 'bold' }}>Código SCOP (11 dígitos):</label>
        <input type="text" maxLength="11" value={scop} onChange={(e) => setScop(e.target.value.replace(/\D/g, ''))} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} placeholder="Ej. 12571802685" />

        <label style={{ fontWeight: 'bold' }}>Cantidad de precintos:</label>
        <input type="number" value={cantidad} onChange={(e) => setCantidad(e.target.value)} required min="1" style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />

        <button type="submit" disabled={cargando} style={{ padding: '12px', background: '#16A34A', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' }}>
          {cargando ? 'Procesando...' : 'Registrar Viaje (PEPS)'}
        </button>
      </form>

      {mensaje && <p style={{ marginTop: '20px', fontWeight: 'bold', textAlign: 'center', color: mensaje.includes('❌') ? 'red' : 'green' }}>{mensaje}</p>}
    </div>
  )
}