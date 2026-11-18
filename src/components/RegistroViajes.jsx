import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'

export default function RegistroViajes() {
  const [scop, setScop] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [cargando, setCargando] = useState(false)
  
  // Estados para manejar plantas y roles
  const [idPlanta, setIdPlanta] = useState('')
  const [rol, setRol] = useState('')
  const [plantas, setPlantas] = useState([])
  const [cargandoPerfil, setCargandoPerfil] = useState(true)

  // Roles que tienen acceso total a cualquier planta
  const rolesGlobales = ['admin_sistema', 'analista_operaciones', 'jefe_operaciones', 'jefe_proyecto']

  useEffect(() => {
    async function obtenerPerfilUsuario() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // 1. Obtener rol y planta del usuario desde la tabla pública
        const { data: usuarioData } = await supabase
          .from('usuarios')
          .select(`
            id_planta,
            roles ( codigo )
          `)
          .eq('id_usuario', user.id)
          .single()

        if (usuarioData) {
          const rolUsuario = usuarioData.roles?.codigo?.toLowerCase() || ''
          setRol(rolUsuario)

          // 2. Si es un rol global, traemos todas las plantas para el selector
          if (rolesGlobales.includes(rolUsuario)) {
            const { data: todasPlantas } = await supabase.from('plantas').select('id_planta, nombre').order('nombre')
            if (todasPlantas) {
              setPlantas(todasPlantas)
              // Por defecto seleccionamos la planta que tenga asignada, o la primera de la lista
              setIdPlanta(usuarioData.id_planta || todasPlantas[0]?.id_planta || '')
            }
          } else {
            // 3. Si es admin_planta u otro rol, usamos su planta asignada
            setIdPlanta(usuarioData.id_planta || '')
            // Si no tiene planta en la BD, intentamos adivinarla por el correo (Fallback)
            if (!usuarioData.id_planta) {
              const prefijoCorreo = user.email.split('@')[0].replace('planta.', '').toLowerCase()
              const { data: matchPlanta } = await supabase
                .from('plantas')
                .select('id_planta, nombre')
                .ilike('nombre', `%${prefijoCorreo}%`)
                .limit(1)
              
              if (matchPlanta && matchPlanta.length > 0) {
                setIdPlanta(matchPlanta[0].id_planta)
              }
            }
          }
        }
      }
      setCargandoPerfil(false)
    }
    obtenerPerfilUsuario()
  }, [])

  const registrarViaje = async (e) => {
    e.preventDefault()
    
    if (scop.length !== 11) {
      toast.error('El SCOP debe tener exactamente 11 dígitos.')
      return
    }

    if (!idPlanta) {
      toast.error('No se ha seleccionado una planta válida.')
      return
    }

    setCargando(true)

    const { data, error } = await supabase.rpc('fn_registrar_viaje_scop', {
      p_id_planta: idPlanta,
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

  if (cargandoPerfil) {
    return <p style={{ textAlign: 'center', marginTop: '50px', color: '#666' }}>Verificando perfil de usuario...</p>
  }

  // Si después de todo no se encontró planta y no es un rol global
  if (!idPlanta && !rolesGlobales.includes(rol)) {
    return (
      <div style={{ maxWidth: '400px', margin: '20px auto', padding: '20px', textAlign: 'center', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
        <h3 style={{ color: '#DC2626' }}>⚠️ Sin Planta Asignada</h3>
        <p style={{ color: '#666' }}>Tu usuario no tiene una planta vinculada. Contacta al Administrador del Sistema para que asigne tu planta.</p>
      </div>
    )
  }

  return (
    <div style={{ width: '90%', maxWidth: '400px', margin: '20px auto', fontFamily: 'Arial', padding: '20px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', backgroundColor: 'white' }}>
      <h2 style={{ textAlign: 'center', color: '#16A34A', marginBottom: '20px' }}>Registro de Viaje</h2>

      <form onSubmit={registrarViaje} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        {/* LÓGICA DE SELECCIÓN DE PLANTA */}
        {rolesGlobales.includes(rol) ? (
          <>
            <label style={{ fontWeight: 'bold' }}>Seleccionar Planta:</label>
            <select 
              value={idPlanta} 
              onChange={(e) => setIdPlanta(e.target.value)} 
              required 
              style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white', color: 'black' }}
            >
              {plantas.map(p => (
                <option key={p.id_planta} value={p.id_planta}>{p.nombre}</option>
              ))}
            </select>
          </>
        ) : (
          <p style={{ color: '#0B5FA5', fontSize: '14px', textAlign: 'center', fontWeight: 'bold', margin: '0 0 10px 0' }}>
            Planta: {plantas.find(p => p.id_planta === idPlanta)?.nombre || 'Cargando...'}
          </p>
        )}

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