import { useState } from 'react'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'

export default function ForgotPassword({ setPantalla }) {
  const [email, setEmail] = useState('')
  const [cargando, setCargando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const handleRecuperar = async (e) => {
    e.preventDefault()
    
    if (!emailRegex.test(email)) return toast.error('Ingresa un email válido')

    setCargando(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/?pantalla=reset`
      })

      if (error) throw new Error(error.message)

      setEnviado(true)
      toast.success('📧 Revisa tu correo para restablecer la contraseña')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setCargando(false)
    }
  }

  if (enviado) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f7fa' }}>
        <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', maxWidth: '420px', textAlign: 'center' }}>
          <div style={{ fontSize: '60px', marginBottom: '20px' }}>📧</div>
          <h2 style={{ color: 'var(--primary-blue)', marginBottom: '15px' }}>Correo Enviado</h2>
          <p style={{ color: '#6b7280', marginBottom: '25px' }}>
            Si el email <strong>{email}</strong> está registrado, recibirás un enlace para restablecer tu contraseña.
          </p>
          <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '25px' }}>
            ⚠️ Revisa también la carpeta de Spam/Correo no deseado
          </p>
          <button
            onClick={() => setPantalla('login')}
            style={{ padding: '12px 24px', backgroundColor: 'var(--primary-blue)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ← Volver al Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f7fa' }}>
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ fontSize: '50px', marginBottom: '10px' }}>🔐</div>
          <h1 style={{ color: 'var(--primary-blue)', fontSize: '24px', fontWeight: '900', margin: '0 0 10px 0' }}>Recuperar Contraseña</h1>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>Ingresa tu email y te enviaremos un enlace</p>
        </div>

        <form onSubmit={handleRecuperar}>
          <div style={{ marginBottom: '25px' }}>
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

          <button
            type="submit"
            disabled={cargando}
            style={{
              width: '100%', padding: '14px', backgroundColor: cargando ? '#9ca3af' : 'var(--primary-blue)',
              color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold',
              cursor: cargando ? 'not-allowed' : 'pointer', marginBottom: '15px'
            }}
          >
            {cargando ? '⏳ Enviando...' : '📧 Enviar Enlace de Recuperación'}
          </button>
        </form>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => setPantalla('login')}
            style={{ background: 'none', border: '1px solid var(--primary-blue)', color: 'var(--primary-blue)', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
          >
            ← Volver al Login
          </button>
        </div>
      </div>
    </div>
  )
}