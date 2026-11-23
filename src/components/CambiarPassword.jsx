// src/components/CambiarPassword.jsx
import { useState } from 'react'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'
import { Card, Input, Boton, PageHeader } from './ui'

// ✅ MISMA política que ResetPassword (ideal: moverla a src/utils/validaciones.js
// y compartirla entre ambos componentes)
const validarPassword = (pwd) => {
  if (pwd.length < 8) return 'La nueva contraseña debe tener al menos 8 caracteres.'
  if (!/[A-Z]/.test(pwd)) return 'Debe contener al menos una letra mayúscula.'
  if (!/[a-z]/.test(pwd)) return 'Debe contener al menos una letra minúscula.'
  if (!/[0-9]/.test(pwd)) return 'Debe contener al menos un número.'
  return null
}

export default function CambiarPassword() {
  const [passwordActual, setPasswordActual] = useState('')
  const [passwordNueva, setPasswordNueva] = useState('')
  const [passwordConfirmar, setPasswordConfirmar] = useState('')
  const [cargando, setCargando] = useState(false)
  const [exito, setExito] = useState(false)

  const limpiar = () => {
    setPasswordActual('')
    setPasswordNueva('')
    setPasswordConfirmar('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setExito(false)

    // Validaciones de política (idénticas al flujo de recuperación)
    if (!passwordActual) return toast.error('Ingresa tu contraseña actual.')
    const errorValidacion = validarPassword(passwordNueva)
    if (errorValidacion) return toast.error(errorValidacion)
    if (passwordNueva !== passwordConfirmar) return toast.error('Las contraseñas nuevas no coinciden.')
    if (passwordActual === passwordNueva) return toast.error('La nueva contraseña debe ser diferente a la actual.')

    setCargando(true)
    try {
      // 0. ✅ Guard de sesión: evita el crash de `user.email` si expiró
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Tu sesión expiró. Vuelve a iniciar sesión.')
        return
      }

      // 1. Verificar contraseña actual (re-autenticando)
      const { error: errorAuth } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordActual,
      })
      if (errorAuth) {
        toast.error('La contraseña actual es incorrecta.')
        return
      }

      // 2. Cambiar contraseña
      const { error } = await supabase.auth.updateUser({ password: passwordNueva })
      if (error) {
        const msg = /same password|should be different/i.test(error.message)
          ? 'La nueva contraseña debe ser diferente a la actual.'
          : /rate limit|too many/i.test(error.message)
            ? 'Demasiados intentos. Espera unos minutos y vuelve a intentar.'
            : 'Error al cambiar la contraseña. Intenta nuevamente.'
        toast.error(msg)
        return
      }

      toast.success('✅ Contraseña actualizada correctamente')
      setExito(true)
      limpiar()
    } catch {
      toast.error('No se pudo conectar con el servidor. Intenta nuevamente.')
    } finally {
      // ✅ SIEMPRE se libera el botón, incluso si algo explota arriba
      setCargando(false)
    }
  }

  return (
    <div className="page-container" style={{ maxWidth: '600px' }}>
      {/* ✅ SIN <Toaster> local: App.jsx ya monta el global en vistas con sesión.
          Un segundo Toaster duplicaría todos los mensajes. */}

      <PageHeader titulo="Cambiar Contraseña" />

      <Card titulo="Datos de acceso">
        {exito && (
          <div
            role="status"
            style={{ marginBottom: '16px', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', fontSize: '13px', fontWeight: 'bold' }}
          >
            ✅ Tu contraseña fue actualizada. Tu sesión actual sigue activa; la próxima vez que inicies sesión, usa la nueva clave.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Input
            label="Contraseña actual"
            type="password"
            value={passwordActual}
            onChange={(e) => setPasswordActual(e.target.value)}
            placeholder="Ingrese su contraseña actual"
            autoComplete="current-password"
            required
          />

          <Input
            label="Nueva contraseña"
            type="password"
            value={passwordNueva}
            onChange={(e) => setPasswordNueva(e.target.value)}
            placeholder="Mínimo 8 caracteres, 1 mayúscula y 1 número"
            autoComplete="new-password"
            required
          />

          <Input
            label="Confirmar nueva contraseña"
            type="password"
            value={passwordConfirmar}
            onChange={(e) => setPasswordConfirmar(e.target.value)}
            placeholder="Repita la nueva contraseña"
            autoComplete="new-password"
            required
          />

          <div style={{ margin: '4px 0 14px', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', fontSize: '12px', color: '#1e40af' }}>
            <strong>Requisitos:</strong> mínimo 8 caracteres, una mayúscula, una minúscula y un número.
          </div>

          <div className="form-actions">
            <Boton variante="secondary" onClick={limpiar} disabled={cargando}>
              Limpiar
            </Boton>
            <Boton tipo="submit" variante="primary" disabled={cargando}>
              {cargando ? 'Guardando...' : 'Cambiar Contraseña'}
            </Boton>
          </div>
        </form>
      </Card>
    </div>
  )
}