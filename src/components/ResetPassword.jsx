// src/components/ResetPassword.jsx
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'

const AZUL = '#0033A0'
const CYAN = '#00AEEF'

export default function ResetPassword({ setPantalla, onFinRecuperacion }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)
  const [haySesion, setHaySesion] = useState(false)
  const [esperaAgotada, setEsperaAgotada] = useState(false)
  const saliendoRef = useRef(false)

  // ----------------------------------------------------------
  // Verificar sesión de recuperación (puede tardar unos ms en
  // establecerse tras abrir el enlace del correo)
  // ----------------------------------------------------------
  useEffect(() => {
    let activo = true

    const revisar = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!activo) return
      if (session) {
        setHaySesion(true)
        setError('')
      } else {
        setError('No hay sesión activa. Solicita un nuevo enlace de recuperación.')
      }
    }

    revisar()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!activo) return
      if (session) {
        setHaySesion(true)
        setError('')
      } else {
        setHaySesion(false)
      }
    })

    return () => {
      activo = false
      listener.subscription.unsubscribe()
    }
  }, [])

  // ----------------------------------------------------------
  // ✅ Si en 4 segundos el enlace no logró establecer sesión,
  // ofrecemos pedir uno nuevo en vez de dejar al usuario atrapado.
  // ----------------------------------------------------------
  useEffect(() => {
    if (haySesion) { setEsperaAgotada(false); return }
    const t = setTimeout(() => setEsperaAgotada(true), 4000)
    return () => clearTimeout(t)
  }, [haySesion])

  const validarPassword = (pwd) => {
    if (pwd.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
    if (!/[A-Z]/.test(pwd)) return 'Debe contener al menos una letra mayúscula.'
    if (!/[a-z]/.test(pwd)) return 'Debe contener al menos una letra minúscula.'
    if (!/[0-9]/.test(pwd)) return 'Debe contener al menos un número.'
    return null
  }

  // ----------------------------------------------------------
  // ✅ Salida limpia: cierra la sesión de recuperación, avisa a App
  // para limpiar el hash de la URL y vuelve al Login
  // ----------------------------------------------------------
  const salirAlLogin = async () => {
    if (saliendoRef.current) return
    saliendoRef.current = true
    try { await supabase.auth.signOut() } catch { /* sin sesión, nada que cerrar */ }
    if (onFinRecuperacion) onFinRecuperacion()
    setPantalla('')
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

      // Mostramos la confirmación 3 segundos y luego cerramos la sesión
      // de recuperación para obligar al login con la nueva contraseña
      setTimeout(() => salirAlLogin(), 3000)
    } catch (err) {
      setError(err.message || 'No se pudo actualizar la contraseña.')
      toast.error('Error al actualizar la contraseña')
    } finally {
      setCargando(false)
    }
  }

  // ESTILOS UNIFICADOS con el Login (fondo blanco, texto negro)
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

  // ----------------------------------------------------------
  // PANTALLA DE ÉXITO
  // ----------------------------------------------------------
  if (exito) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--gray-bg, #eef1f5)', padding: '20px' }}>
        <div style={{ width: '100%', maxWidth: '440px', backgroundColor: '#fbfcfe', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,51,160,0.10)', padding: '40px 36px', textAlign: 'center' }}>
          <div style={{ fontSize: '52px', marginBottom: '10px' }}>✅</div>
          <h1 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 900, color: AZUL }}>¡Contraseña actualizada!</h1>
          <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#6b7280' }}>
            Tu contraseña ha sido cambiada exitosamente. Serás redirigido al login en unos segundos...
          </p>
          <button
            onClick={salirAlLogin}
            style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', backgroundColor: AZUL, color: '#fff', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Ir al Login
          </button>
        </div>
      </div>
    )
  }

  // ----------------------------------------------------------
  // FORMULARIO DE NUEVA CONTRASEÑA
  // ----------------------------------------------------------
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--gray-bg, #eef1f5)', padding: '20px' }}>
      <style>{`
        .rp-input::placeholder { color: #9ca3af; }
        .rp-input:focus { outline: none; border-color: ${CYAN} !important; box-shadow: 0 0 0 3px rgba(0,174,239,0.18); }
      `}</style>
      <div style={{ width: '100%', maxWidth: '440px', backgroundColor: '#fbfcfe', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,51,160,0.10)', padding: '40px 36px', textAlign: 'center' }}>
        <img
          src="/logo-p.png"
          alt="Logo Petro América"
          onError={(e) => { e.currentTarget.style.display = 'none' }}
          style={{ height: '84px', width: 'auto', margin: '0 auto 6px', display: 'block' }}
        />
        <h1 style={{ margin: '0 0 4px', fontSize: '26px', fontWeight: 900, color: AZUL }}>Nueva Contraseña</h1>
        <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#6b7280' }}>Ingresa tu nueva contraseña para acceder a SIGMO</p>

        {error && (
          <div
            role="alert"
            style={{ marginBottom: '16px', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '13px', fontWeight: 'bold', textAlign: 'left' }}
          >
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={resetearPassword} style={{ textAlign: 'left' }}>
          <label htmlFor="rp-password" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px', color: '#111827', textAlign: 'center' }}>
            Nueva Contraseña <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <div style={{ position: 'relative', marginBottom: '18px' }}>
            <input
              id="rp-password"
              className="rp-input"
              type={verPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
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

          <label htmlFor="rp-confirm" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px', color: '#111827', textAlign: 'center' }}>
            Confirmar Contraseña <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            id="rp-confirm"
            className="rp-input"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repite tu contraseña"
            autoComplete="new-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            style={{ ...inputStyle, marginBottom: '20px' }}
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
            disabled={cargando || !haySesion}
            style={{ width: '100%', padding: '14px', borderRadius: '8px', border: 'none', backgroundColor: AZUL, color: '#fff', fontSize: '15px', fontWeight: 'bold', cursor: cargando || !haySesion ? 'not-allowed' : 'pointer', opacity: cargando || !haySesion ? 0.7 : 1, transition: 'all 0.2s' }}
          >
            {cargando ? '⏳ Actualizando...' : '🔐 Actualizar Contraseña'}
          </button>
        </form>

        {/* ✅ Botón de rescate: si el enlace no estableció sesión en 4s */}
        {!haySesion && esperaAgotada && (
          <button
            type="button"
            onClick={() => { if (onFinRecuperacion) onFinRecuperacion(); setPantalla('forgot') }}
            style={{ display: 'block', width: '100%', marginTop: '12px', padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#b45309', color: '#fff', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            📨 El enlace no funcionó: solicitar uno nuevo
          </button>
        )}

        <button
          type="button"
          onClick={salirAlLogin}
          style={{ marginTop: '16px', padding: '10px 18px', borderRadius: '8px', border: `1px solid ${AZUL}`, backgroundColor: 'transparent', color: AZUL, fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.2s' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 51, 160, 0.05)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          ← Volver al Login
        </button>
      </div>
    </div>
  )
}