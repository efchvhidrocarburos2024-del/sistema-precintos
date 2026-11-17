import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function GestionUsuarios() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState('admin_planta')
  const [idPlanta, setIdPlanta] = useState('')
  const [plantas, setPlantas] = useState([])
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    async function cargarPlantas() {
      const { data } = await supabase.from('plantas').select('*').order('nombre')
      if (data) {
        setPlantas(data)
        setIdPlanta(data[0]?.id_planta || '')
      }
    }
    cargarPlantas()
  }, [])

  const crearUsuario = async (e) => {
    e.preventDefault()
    setCargando(true)
    setMensaje('')

    const { data, error } = await supabase.functions.invoke('crear-usuario', {
      body: {
        email: email,
        password: password,
        rol: rol,
        id_planta: rol === 'admin_planta' ? idPlanta : null
      }
    })

    if (error || (data && data.error)) {
      setMensaje('❌ Error: ' + (data?.error || error.message))
    } else {
      setMensaje(`✅ Usuario ${email} creado con éxito.`)
      setEmail('')
      setPassword('')
    }
    setCargando(false)
  }

  return (
    <div style={{ maxWidth: '450px', margin: '50px auto', fontFamily: 'Arial', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', backgroundColor: 'white' }}>
      <h2 style={{ textAlign: 'center', color: '#0B5FA5', marginBottom: '20px' }}>Crear Nuevo Usuario</h2>

      <form onSubmit={crearUsuario} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        <label style={{ fontWeight: 'bold' }}>Correo electrónico:</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />

        <label style={{ fontWeight: 'bold' }}>Contraseña provisional:</label>
        <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} required minLength="6" style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />

        <label style={{ fontWeight: 'bold' }}>Rol del usuario:</label>
        <select value={rol} onChange={(e) => setRol(e.target.value)} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
          <option value="admin_planta">Administrador de Planta</option>
          <option value="analista_operaciones">Analista de Operaciones</option>
          <option value="jefe_operaciones">Jefe de Operaciones</option>
          <option value="jefe_proyecto">Jefe de Proyecto</option>
          <option value="auditor">Auditor</option>
        </select>

        {rol === 'admin_planta' && (
          <>
            <label style={{ fontWeight: 'bold' }}>Asignar a la Planta:</label>
            <select value={idPlanta} onChange={(e) => setIdPlanta(e.target.value)} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
              {plantas.map(p => (
                <option key={p.id_planta} value={p.id_planta}>{p.nombre}</option>
              ))}
            </select>
          </>
        )}

        <button type="submit" disabled={cargando} style={{ padding: '12px', background: '#16A34A', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' }}>
          {cargando ? 'Creando...' : 'Crear Usuario'}
        </button>
      </form>
      {mensaje && <p style={{ marginTop: '20px', fontWeight: 'bold', textAlign: 'center', color: mensaje.includes('❌') ? 'red' : 'green' }}>{mensaje}</p>}
    </div>
  )
}