import { useState } from 'react'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'

export default function Login({ setPantalla, setUser }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const handleLogin = async (e) => {
    e.preventDefault()
    
    // Validaciones
    if (!emailRegex.test(email)) return toast.error('Ingresa un email válido')
    if (password.length < 6) return toast.error('La contraseña debe tener al menos 6 caracteres')

    setCargando(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      })

      if (error) {
        const mensajes = {
          'Invalid login credentials': '❌ Credenciales incorrectas',
          'Email not confirmed': '📧 Debes confirmar tu email primero',
          'Too many requests': '⏳ Demasiados intentos. Intenta en 5 minutos',
          'Invalid refresh token': 'Sesión expirada. Inicia sesión nuevamente'
        }
        throw new Error(mensajes[error.message] || error.message)
      }

      if (data?.user) {
        setUser(data.user)
        toast.success(`¡Bienvenido ${data.user.email}!`)
        setPantalla('lobby')
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f7fa' }}>
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ color: 'var(--primary-blue)', fontSize: '36px', fontWeight: '900', margin: 0 }}>SIGMO</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '5px' }}>Sistema de Gestión Modular</p>
          <p style={{ color: '#9ca3af', fontSize: '13px' }}>Ingresa tus credenciales para acceder</p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
              Correo electrónico <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              required
              disabled={cargando}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
              Contraseña <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contraseña"
              required
              disabled={cargando}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            style={{
              width: '100%', padding: '14px', backgroundColor: cargando ? '#9ca3af' : 'var(--primary-blue)',
              color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold',
              cursor: cargando ? 'not-allowed' : 'pointer', transition: 'all 0.2s'
            }}
          >
            {cargando ? '⏳ Iniciando sesión...' : 'Iniciar Sesión en SIGMO'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            onClick={() => setPantalla('forgot')}
            style={{ background: 'none', border: '1px solid var(--primary-blue)', color: 'var(--primary-blue)', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>
      </div>
    </div>
  )
}