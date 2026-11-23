// src/components/ResetPassword.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'

const AZUL = '#0033A0'
const CYAN = '#00AEEF'

export default function ResetPassword({ setPantalla }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)
  const [tokenValido, setTokenValido] = useState(false)

  useEffect(() => {
    // Verificar si hay token en la URL (viene del correo)
    const hash = window.location.hash
    if (!hash || !hash.includes('access_token')) {
      setError('Enlace inválido o expirado. Solicita un nuevo enlace de recuperación.')
      return
    }

    // Extraer el access_token del hash
    const params = new URLSearchParams(hash.substring(1))
    const accessToken = params.get('access_token')
    
    if (!accessToken) {
      setError('Enlace inválido. El token no fue encontrado.')
      return
    }

    // Establecer la sesión con el token
    supabase.auth.setSession({ access_token: accessToken, refresh_token: '' })
      .then(({ error }) => {
        if (error) {
          if (/expired|invalid/i.test(error.message)) {
            setError('Este enlace ha expirado. Por favor solicita uno nuevo.')
          } else {
            setError('Error al validar el enlace: ' + error.message)
          }
        } else {
          setTokenValido(true)
        }
      })
  }, [])

  const validarPassword = (pwd) => {
    if (pwd.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
    if (!/[A-Z]/.test(pwd)) return 'Debe contener al menos una letra mayúscula.'
    if (!/[a-z]/.test(pwd)) return 'Debe contener al menos una letra minúscula.'
    if (!/[0-9]/.test(pwd)) return 'Debe contener al menos un número.'
    return null
  }

  const resetearPassword = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!password) { setError('Ingresa tu nueva contraseña.'); return }
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden.'); return }
    
    const errorValidacion = validarPassword(password)
    if (errorValidacion) { setError(errorValidacion); return }
    
    setCargando(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      
      setExito(true)
      toast.success('Contraseña actualizada correctamente')
      
      // Redirigir al login después de 3 segundos
      setTimeout(() => {
        setPantalla('')
      }, 3000)
    } catch (err) {
      setError(err.message || 'No se pudo actualizar la contraseña.')
      toast.error('Error al actualizar la contraseña')
    } finally {
      setCargando(false)
    }
  }

  const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#334155', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }

  if (exito) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--gray-bg, #eef1f5)', padding: '20px' }}>
        <div style={{ width: '100%', maxWidth: '440px', backgroundColor: '#fbfcfe', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,51,160,0.10)', padding: '40px 36px', textAlign: 'center' }}>
          <div style={{ fontSize: '52px', marginBottom: '10px' }}>✅</div>
          <h1 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 900, color: AZUL }}>¡Contraseña actualizada!</h1>
          <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#6b7280' }}>
            Tu contraseña ha sido cambiada exitosamente. Serás redirigido al login en unos segundos...
          </p>
          <button onClick={() => setPantalla('')} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', backgroundColor: AZUL, color: '#fff', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
            Ir al Login
          </button>
        </div>
      </div>
    )
  }

  if (error && !exito && !tokenValido) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--gray-bg, #eef1f5)', padding: '20px' }}>
        <div style={{ width: '100%', maxWidth: '440px', backgroundColor: '#fbfcfe', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,51,160,0.10)', padding: '40px 36px', textAlign: 'center' }}>
          <div style={{ fontSize: '52px', marginBottom: '10px' }}>❌</div>
          <h1 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 900, color: '#dc2626' }}>Enlace inválido</h1>
          <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#6b7280' }}>{error}</p>
          <button onClick={() => setPantalla('forgot')} style={{ padding: '12px 24px', borderRadius: '8px', border: `1px solid ${AZUL}`, backgroundColor: 'transparent', color: AZUL, fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
            Solicitar nuevo enlace
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--gray-bg, #eef1f5)', padding: '20px' }}>
      <style>{`
        .rp-input::placeholder { color: #9aa3af; }
        .rp-input:focus { outline: none; border-color: ${CYAN} !important; box-shadow: 0 0 0 3px rgba(0,174,239,0.18); }
      `}</style>
      <div style={{ width: '100%', maxWidth: '440px', backgroundColor: '#fbfcfe', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,51,160,0.10)', padding: '40px 36px', textAlign: 'center' }}>
        <img
          src="/logo-p.png"
          alt="Logo Petro America"
          onError={(e) => { e.currentTarget.style.display = 'none' }}
          style={{ height: '84px', width: 'auto', margin: '0 auto 6px', display: 'block' }}
        />
        <h1 style={{ margin: '0 0 4px', fontSize: '26px', fontWeight: 900, color: AZUL }}>Nueva Contraseña</h1>
        <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#6b7280' }}>Ingresa tu nueva contraseña para acceder a SIGMO</p>

        {error && (
          <div style={{ marginBottom: '16px', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '13px', fontWeight: 'bold', textAlign: 'left' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={resetearPassword} style={{ textAlign: 'left' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px', color: '#111827', textAlign: 'center' }}>
            Nueva Contraseña <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <div style={{ position: 'relative', marginBottom: '18px' }}>
            <input
              className="rp-input"
              type={verPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              style={{ paddingRight: '44px' }}
            />
            <button
              type="button"
              onClick={() => setVerPassword(v => !v)}
              title={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#9aa3af', padding: '4px' }}
            >
              {verPassword ? '🙈' : '👁️'}
            </button>
          </div>

          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px', color: '#111827', textAlign: 'center' }}>
            Confirmar Contraseña <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            className="rp-input"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repite tu contraseña"
            style={{ marginBottom: '20px' }}
          />

          <div style={{ marginBottom: '20px', padding: '12px', borderRadius: '8px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', fontSize: '12px', color: '#1e40af' }}>
            <strong>Requisitos:</strong>
            <ul style={{ margin: '8px 0 0 20px', paddingLeft: '0' }}>
              <li>Mínimo 8 caracteres</li>
              <li>Al menos una mayúscula</li>
              <li>Al menos una minúscula</li>
              <li>Al menos un número</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={cargando}
            style={{ width: '100%', padding: '14px', borderRadius: '8px', border: 'none', backgroundColor: AZUL, color: '#fff', fontSize: '15px', fontWeight: 'bold', cursor: cargando ? 'not-allowed' : 'pointer', opacity: cargando ? 0.7 : 1 }}
          >
            {cargando ? '⏳ Actualizando...' : ' Actualizar Contraseña'}
          </button>
        </form>

        <button
          onClick={() => setPantalla('')}
          style={{ marginTop: '16px', padding: '10px 18px', borderRadius: '8px', border: `1px solid ${AZUL}`, backgroundColor: 'transparent', color: AZUL, fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          ← Volver al Login
        </button>
      </div>
    </div>
  )
}