import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'

export default function ResetPassword({ setPantalla }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [tokenValido, setTokenValido] = useState(false)

  useEffect(() => {
    // Extraer token del hash de la URL
    const hash = window.location.hash
    const params = new URLSearchParams(hash.substring(1))
    const accessToken = params.get('access_token')
    const type = params.get('type')

    if (accessToken && type === 'recovery') {
      setTokenValido(true)
    } else {
      toast.error('Enlace de recuperación inválido o expirado')
    }
  }, [])

  const handleReset = async (e) => {
    e.preventDefault()
    
    if (password.length < 6) return toast.error('La contraseña debe tener al menos 6 caracteres')
    if (password !== confirmPassword) return toast.error('Las contraseñas no coinciden')

    setCargando(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })

      if (error) throw new Error(error.message)

      toast.success('✅ Contraseña actualizada correctamente')
      await supabase.auth.signOut()
      setPantalla('login')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setCargando(false)
    }
  }

  if (!tokenValido) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f7fa' }}>
        <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', textAlign: 'center', maxWidth: '420px' }}>
          <div style={{ fontSize: '60px', marginBottom: '20px' }}>⚠️</div>
          <h2 style={{ color: '#ef4444' }}>Enlace Inválido</h2>
          <p style={{ color: '#6b7280', marginBottom: '25px' }}>Este enlace de recuperación no es válido o ha expirado.</p>
          <button onClick={() => setPantalla('forgot')} style={{ padding: '12px 24px', backgroundColor: 'var(--primary-blue)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            Solicitar nuevo enlace
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f7fa' }}>
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ fontSize: '50px', marginBottom: '10px' }}>🔑</div>
          <h1 style={{ color: 'var(--primary-blue)', fontSize: '24px', fontWeight: '900', margin: '0 0 10px 0' }}>Nueva Contraseña</h1>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>Ingresa tu nueva contraseña</p>
        </div>

        <form onSubmit={handleReset}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>Nueva contraseña <span style={{ color: '#ef4444' }}>*</span></label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required disabled={cargando} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>Confirmar contraseña <span style={{ color: '#ef4444' }}>*</span></label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repite la contraseña" required disabled={cargando} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>

          <button type="submit" disabled={cargando} style={{ width: '100%', padding: '14px', backgroundColor: cargando ? '#9ca3af' : 'var(--primary-blue)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: cargando ? 'not-allowed' : 'pointer' }}>
            {cargando ? '⏳ Actualizando...' : '✅ Actualizar Contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}