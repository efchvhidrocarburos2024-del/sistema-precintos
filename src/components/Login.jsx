// src/components/Login.jsx
import { useState } from 'react'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'

const AZUL = '#0033A0'
const CYAN = '#00AEEF'

export default function Login({ setPantalla }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const validarEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

  const manejarLogin = async (e) => {
    e.preventDefault()
    setError('')
    
    const emailLimpio = email.trim()
    if (!validarEmail(emailLimpio)) { 
      setError('Ingresa un correo electrónico válido.')
      return 
    }
    if (!password) { 
      setError('Ingresa tu contraseña.')
      return 
    }
    
    setCargando(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ 
        email: emailLimpio, 
        password 
      })
      
      if (error) {
        let msg = error.message
        
        // Traducción de errores comunes de Supabase para mejor UX
        if (/invalid login credentials/i.test(error.message)) {
          msg = 'Credenciales incorrectas. Verifica tu correo y contraseña.'
        } else if (/email not confirmed/i.test(error.message)) {
          msg = 'Tu correo aún no ha sido confirmado. Revisa tu bandeja de entrada o spam.'
        } else if (/rate limit|security purposes|too many/i.test(error.message)) {
          msg = 'Demasiados intentos fallidos. Espera unos minutos e intenta nuevamente.'
        }
        
        setError(msg)
        toast.error(msg)
      } else {
        toast.success('Bienvenido a SIGMO')
        // No necesitamos llamar a setPantalla aquí, App.jsx lo maneja automáticamente 
        // al detectar el cambio en onAuthStateChange.
      }
    } catch {
      const msg = 'No se pudo conectar con el servidor. Intenta nuevamente.'
      setError(msg)
      toast.error(msg)
    } finally {
      setCargando(false)
    }
  }

  // ESTILOS ACTUALIZADOS - Fondo blanco, texto negro
  const inputStyle = { 
    width: '100%', 
    padding: '12px 14px', 
    borderRadius: '8px', 
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#111827',
    fontSize: '14px', 
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s'
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--gray-bg, #eef1f5)', padding: '20px' }}>
      <style>{`
        .login-input::placeholder { color: #9ca3af; }
        .login-input:focus { 
          outline: none; 
          border-color: ${CYAN} !important; 
          box-shadow: 0 0 0 3px rgba(0,174,239,0.18); 
        }
      `}</style>

      <div className="login-card" style={{ width: '100%', maxWidth: '420px', backgroundColor: '#fbfcfe', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,51,160,0.10)', padding: '40px 36px', textAlign: 'center' }}>
        {/* LOGO CORPORATIVO */}
        <img
          src="/logo-p.png"
          alt="Logo Petro América"
          onError={(e) => { e.currentTarget.style.display = 'none' }}
          style={{ height: '84px', width: 'auto', margin: '0 auto 6px', display: 'block' }}
        />

        <h1 style={{ margin: '0 0 4px', fontSize: '40px', fontWeight: 900, color: AZUL, letterSpacing: '-1px' }}>SIGMO</h1>
        <p style={{ margin: '0 0 2px', fontSize: '15px', color: '#6b7280' }}>Sistema de Gestión Modular</p>
        <p style={{ margin: '0 0 26px', fontSize: '13px', color: '#9ca3af' }}>Ingresa tus credenciales para acceder</p>

        {/* Banner de error con role="alert" para lectores de pantalla */}
        {error && (
          <div 
            role="alert"
            style={{ marginBottom: '16px', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '13px', fontWeight: 'bold', textAlign: 'left' }}
          >
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={manejarLogin} style={{ textAlign: 'left' }}>
          <label 
            htmlFor="email-input" 
            style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px', color: '#111827', textAlign: 'center' }}
          >
            Correo electrónico <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            id="email-input"
            className="login-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            style={{ ...inputStyle, marginBottom: '18px' }}
          />

          <label 
            htmlFor="password-input" 
            style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px', color: '#111827', textAlign: 'center' }}
          >
            Contraseña <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <div style={{ position: 'relative', marginBottom: '22px' }}>
            <input
              id="password-input"
              className="login-input"
              type={verPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contraseña"
              autoComplete="current-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              style={{ ...inputStyle, paddingRight: '44px' }}
            />
            <button
              type="button"
              onClick={() => setVerPassword(v => !v)}
              aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              title={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#6b7280', padding: '4px' }}
            >
              {verPassword ? '🙈' : '👁️'}
            </button>
          </div>

          <button
            type="submit"
            disabled={cargando}
            style={{ width: '100%', padding: '14px', borderRadius: '8px', border: 'none', backgroundColor: AZUL, color: '#fff', fontSize: '16px', fontWeight: 'bold', cursor: cargando ? 'not-allowed' : 'pointer', opacity: cargando ? 0.7 : 1, transition: 'all 0.2s' }}
          >
            {cargando ? '⏳ Ingresando...' : 'Iniciar Sesión en SIGMO'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setPantalla('forgot')}
          style={{ marginTop: '16px', padding: '10px 18px', borderRadius: '8px', border: `1px solid ${AZUL}`, backgroundColor: 'transparent', color: AZUL, fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.2s' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 51, 160, 0.05)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          ¿Olvidaste tu contraseña?
        </button>
      </div>
    </div>
  )
}