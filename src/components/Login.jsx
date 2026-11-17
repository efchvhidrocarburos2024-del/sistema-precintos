import { useState } from 'react'
import { supabase } from '../supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const iniciarSesion = async (e) => {
    e.preventDefault()
    setCargando(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    if (error) {
      setError('❌ Correo o contraseña incorrectos.')
    }
    setCargando(false)
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f3f4f6', fontFamily: 'Arial' }}>
      <div style={{ width: '350px', padding: '40px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
        <h2 style={{ textAlign: 'center', color: '#0B5FA5', marginBottom: '10px' }}>Sistema de Precintos</h2>
        <p style={{ textAlign: 'center', color: '#666', fontSize: '14px', marginBottom: '30px' }}>Ingresa tus credenciales</p>

        <form onSubmit={iniciarSesion} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input 
            type="email" 
            placeholder="Correo electrónico" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            style={{ padding: '12px', borderRadius: '4px', border: '1px solid #ccc' }} 
          />
          <input 
            type="password" 
            placeholder="Contraseña" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            style={{ padding: '12px', borderRadius: '4px', border: '1px solid #ccc' }} 
          />
          <button 
            type="submit" 
            disabled={cargando} 
            style={{ padding: '12px', background: '#0B5FA5', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            {cargando ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>
        {error && <p style={{ color: 'red', textAlign: 'center', marginTop: '15px', fontSize: '13px' }}>{error}</p>}
      </div>
    </div>
  )
}