import { useState } from 'react'
import { supabase } from '../supabase'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { Card, Input, Boton, PageHeader } from './ui'

export default function CambiarPassword() {
  const [passwordActual, setPasswordActual] = useState('')
  const [passwordNueva, setPasswordNueva] = useState('')
  const [passwordConfirmar, setPasswordConfirmar] = useState('')
  const [cargando, setCargando] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (passwordNueva.length < 8) {
      toast.error('La nueva contraseña debe tener al menos 8 caracteres')
      return
    }

    if (passwordNueva !== passwordConfirmar) {
      toast.error('Las contraseñas nuevas no coinciden')
      return
    }

    if (passwordActual === passwordNueva) {
      toast.error('La nueva contraseña debe ser diferente a la actual')
      return
    }

    setCargando(true)

    // 1. Verificar contraseña actual (re-autenticando)
    const { data: { user } } = await supabase.auth.getUser()

    const { error: errorAuth } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: passwordActual
    })

    if (errorAuth) {
      toast.error('La contraseña actual es incorrecta')
      setCargando(false)
      return
    }

    // 2. Cambiar contraseña
    const { error } = await supabase.auth.updateUser({ 
      password: passwordNueva 
    })

    if (error) {
      toast.error('Error al cambiar contraseña: ' + error.message)
    } else {
      toast.success('✅ Contraseña actualizada correctamente')
      setPasswordActual('')
      setPasswordNueva('')
      setPasswordConfirmar('')
    }

    setCargando(false)
  }

  return (
    <div className="page-container" style={{ maxWidth: '600px' }}>
      <Toaster position="top-right" toastOptions={{ duration: 4000, style: { fontWeight: 'bold' } }} />

      <PageHeader titulo="Cambiar Contraseña" />

      <Card titulo="Datos de acceso">
        <form onSubmit={handleSubmit}>
          <Input
            label="Contraseña actual"
            type="password"
            value={passwordActual}
            onChange={(e) => setPasswordActual(e.target.value)}
            placeholder="Ingrese su contraseña actual"
            required
          />

          <Input
            label="Nueva contraseña"
            type="password"
            value={passwordNueva}
            onChange={(e) => setPasswordNueva(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            required
          />

          <Input
            label="Confirmar nueva contraseña"
            type="password"
            value={passwordConfirmar}
            onChange={(e) => setPasswordConfirmar(e.target.value)}
            placeholder="Repita la nueva contraseña"
            required
          />

          <div className="form-actions">
            <Boton 
              variante="secondary" 
              onClick={() => {
                setPasswordActual('')
                setPasswordNueva('')
                setPasswordConfirmar('')
              }}
              disabled={cargando}
            >
              Limpiar
            </Boton>
            <Boton 
              tipo="submit" 
              variante="primary" 
              disabled={cargando}
            >
              {cargando ? 'Guardando...' : 'Cambiar Contraseña'}
            </Boton>
          </div>
        </form>
      </Card>
    </div>
  )
}