import { useState } from 'react'
import { supabase } from '../supabase'
import { Card, Input, Boton } from './ui'

export default function ForgotPassword({ setPantalla }) {
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [cargando, setCargando] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setCargando(true)

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}`,
    })

    setEnviado(true)
    setCargando(false)
  }

  return (
    <div className="auth-wrapper">
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <h2 style={{
          textAlign: 'center',
          color: 'var(--primary-blue)',
          marginBottom: '20px',
          fontSize: '24px'
        }}>
          Recuperar Contraseña
        </h2>

        <Card>
          {enviado ? (
            <div style={{ textAlign: 'center' }}>
              <div className="alert alert-success" style={{ marginBottom: '15px' }}>
                ✅ Si el correo <strong>{email}</strong> está registrado, recibirás un enlace en los próximos minutos.
              </div>
              <p style={{ color: 'var(--text-light)', fontSize: '12px', marginBottom: '20px' }}>
                Revisa también tu bandeja de Spam.
              </p>
              <Boton
                variante="primary"
                onClick={() => setPantalla('')}
                style={{ width: '100%' }}
              >
                Volver al Login
              </Boton>
            </div>
          ) : (
            <>
              <p style={{
                textAlign: 'center',
                color: 'var(--text-light)',
                fontSize: '14px',
                marginBottom: '20px'
              }}>
                Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña.
              </p>

              <form onSubmit={handleSubmit}>
                <Input
                  label="Correo electrónico"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  required
                />

                <Boton
                  tipo="submit"
                  variante="primary"
                  disabled={cargando}
                  style={{ width: '100%' }}
                >
                  {cargando ? 'Enviando...' : 'Enviar enlace'}
                </Boton>
              </form>

              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <Boton
                  variante="outline"
                  tamano="sm"
                  onClick={() => setPantalla('')}
                >
                  Volver al Login
                </Boton>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}