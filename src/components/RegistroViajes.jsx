import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'

export default function RegistroViajes() {
  const [scop, setScop] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [cargando, setCargando] = useState(false)
  
  // Estados para manejar la planta automática
  const [idPlanta, setIdPlanta] = useState(null)
  const [nombrePlanta, setNombrePlanta] = useState('')
  const [cargandoPerfil, setCargandoPerfil] = useState(true)

  useEffect(() => {
    async function obtenerPlantaUsuario() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Buscamos directamente en la tabla 'usuarios' en lugar de los metadatos
        const { data, error } = await supabase
          .from('usuarios')
          .select(`
            id_planta,
            plantas ( nombre )
          `)
          .eq('id_usuario', user.id)
          .single()

        if (data && data.id_planta) {
          setIdPlanta(data.id_planta)
          setNombrePlanta(data.plantas?.nombre || 'Planta Desconocida')
        } else {
          // Si no tiene planta asignada (como el Admin Sistema)
          setIdPlanta('') 
        }
      }
      setCargandoPerfil(false)
    }
    obtenerPlantaUsuario()
  }, [])

  const registrarViaje = async (e) => {
    e.preventDefault()
    
    if (scop.length !== 11) {
      toast.error('El SCOP debe tener exactamente 11 dígitos.')
      return
    }

    setCargando(true)

    const { data, error } = await supabase.rpc('fn_registrar_viaje_scop', {
      p_id_planta: idPlanta, // Usamos la planta del usuario automáticamente
      p_scop: scop,
      p_cantidad: parseInt(cantidad)
    })

    if (error) {
      toast.error('Error: ' + error.message)
    } else {
      toast.success(data)
      setScop('')
      setCantidad('')
    }
    setCargando(false)
  }

  // Mientras carga el perfil desde la BD
  if (cargandoPerfil) {
    return <p style={{ textAlign: 'center', marginTop: '50px', color: '#666' }}>Verificando perfil de usuario...</p>
  }

  // Si el usuario es ADMIN_SISTEMA u otro rol que no tiene planta asignada
  if (!idPlanta) {
    return (
      <div style={{ maxWidth: '400px', margin: '20px auto', padding: '20px', textAlign: 'center', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
        <h3 style={{ color: '#DC2626' }}>⚠️ Sin Planta Asignada</h3>
        <p style={{ color: '#666' }}>Tu usuario no tiene una planta asignada en el sistema, por lo que no puedes registrar viajes. Contacta al Administrador.</p>
      </div>
    )
  }

  return (
    <div style={{ width: '90%', maxWidth: '400px', margin: '20px auto', fontFamily: 'Arial', padding: '20px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', backgroundColor: 'white' }}>
      <h2 style={{ textAlign: 'center', color: '#16A34A', marginBottom: '5px' }}>Registro de Viaje</h2>
      <p style={{ color: '#666', fontSize: '14px', textAlign: 'center', marginBottom: '20px', fontWeight: 'bold' }}>
        Planta: {nombrePlanta}
      </p>

      <form onSubmit={registrarViaje} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        <label style={{ fontWeight: 'bold' }}>Código SCOP (11 dígitos):</label>
        <input type="text" maxLength="11" value={scop} onChange={(e) => setScop(e.target.value.replace(/\D/g, ''))} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white', color: 'black' }} placeholder="Ej. 12571802685" />

        <label style={{ fontWeight: 'bold' }}>Cantidad de precintos:</label>
        <input type="number" value={cantidad} onChange={(e) => setCantidad(e.target.value)} required min="1" style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white', color: 'black' }} />

        <button type="submit" disabled={cargando} style={{ padding: '12px', background: '#16A34A', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' }}>
          {cargando ? 'Procesando...' : 'Registrar Viaje (PEPS)'}
        </button>
      </form>
    </div>
  )
}