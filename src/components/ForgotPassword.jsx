// src/components/ForgotPassword.jsx
import { useState } from 'react'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'

const AZUL = '#0033A0'
const CYAN = '#00AEEF'

export default function ForgotPassword({ setPantalla }) {
  const [email, setEmail] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [enviado, setEnviado] = useState(false)

  const validarEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

  const enviarEnlace = async (e) => {
    e.preventDefault()
    setError('')
    if (!validarEmail(email)) { setError('Ingresa un correo electrónico válido.'); return }
    setCargando(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      setEnviado(true)
      toast.success('Enlace de recuperación enviado')
    } catch (err) {
      let msg = err?.message || 'No se pudo enviar el enlace.'
      if (/rate limit/i.test(msg)) {
        msg = 'Demasiados intentos seguidos (límite del servicio de correo). Espera unos minutos y vuelve a intentar.'
      } else if (/redirect/i.test(msg)) {
        msg = `Dominio no autorizado. Agrega ${window.location.origin} en Supabase → Authentication → URL Configuration → Redirect URLs.`
      } else if (/unable to validate email|format/i.test(msg)) {
        msg = 'El formato del correo no es válido.'
      }
      setError(msg)
      toast.error(msg)
    } finally {
      setCargando(false)
    }
  }

  const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#334155', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }

  if (enviado) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--gray-bg, #eef1f5)', padding: '20px' }}>
        <div style={{ width: '100%', maxWidth: '440px', backgroundColor: '#fbfcfe', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,51,160,0.10)', padding: '40px 36px', textAlign: 'center' }}>
          <div style={{ fontSize: '52px', marginBottom: '10px' }}>📬</div>
          <h1 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 900, color: AZUL }}>Revisa tu bandeja</h1>
          <p style={{ margin: '0 0 6px', fontSize: '14px', color: '#6b7280' }}>
            Si <strong>{email}</strong> está registrado, recibirás un enlace de recuperación en unos minutos.
          </p>
          <p style={{ margin: '0 0 24px', fontSize: '13px', color: '#9ca3af' }}>
            ⚠️ Revisa también la carpeta de <strong>spam / correo no deseado</strong>. El enlace expira en 1 hora.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button onClick={() => { setEnviado(false); setError('') }} style={{ padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: AZUL, color: '#fff', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
              📨 Reenviar enlace
            </button>
            <button onClick={() => setPantalla('')} style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${AZUL}`, backgroundColor: 'transparent', color: AZUL, fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
              ← Volver al Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--gray-bg, #eef1f5)', padding: '20px' }}>
      <style>{`
        .fp-input::placeholder { color: #9aa3af; }
        .fp-input:focus { outline: none; border-color: ${CYAN} !important; box-shadow: 0 0 0 3px rgba(0,174,239,0.18); }
      `}</style>
      <div style={{ width: '100%', maxWidth: '440px', backgroundColor: '#fbfcfe', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,51,160,0.10)', padding: '40px 36px', textAlign: 'center' }}>
        <div style={{ fontSize: '52px', marginBottom: '6px' }}>🔐</div>
        <h1 style={{ margin: '0 0 6px', fontSize: '26px', fontWeight: 900, color: AZUL }}>Recuperar Contraseña</h1>
        <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#6b7280' }}>Ingresa tu email y te enviaremos un enlace</p>

        {error && (
          <div style={{ marginBottom: '16px', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '13px', fontWeight: 'bold', textAlign: 'left' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={enviarEnlace} style={{ textAlign: 'left' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px', color: '#111827', textAlign: 'center' }}>
            Correo electrónico <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            className="fp-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            autoComplete="email"
            style={{ ...inputStyle, marginBottom: '20px' }}
          />
          <button
            type="submit"
            disabled={cargando}
            style={{ width: '100%', padding: '14px', borderRadius: '8px', border: 'none', backgroundColor: AZUL, color: '#fff', fontSize: '15px', fontWeight: 'bold', cursor: cargando ? 'not-allowed' : 'pointer', opacity: cargando ? 0.7 : 1 }}
          >
            {cargando ? '⏳ Enviando...' : '📨 Enviar Enlace de Recuperación'}
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