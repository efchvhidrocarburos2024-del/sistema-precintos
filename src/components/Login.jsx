import { useState } from 'react'
import { supabase } from '../supabase'
import { Card, Input, Boton } from './ui'

export default function Login({ setPantalla }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const iniciarSesion = async (e) => {
    e.preventDefault()
    setCargando(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    if (error) {
      setError('❌ ' + error.message)
    }
    setCargando(false)
  }

  return (
    <div className="auth-wrapper">
      <div style={{ width: '100%', maxWidth: '400px' }}>
        
        {/* NUEVA CABECERA SIGMO */}
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <h1 style={{
            color: 'var(--primary-blue)',
            margin: '0 0 5px 0',
            fontSize: '36px',
            fontWeight: '900',
            letterSpacing: '1.5px'
          }}>
            SIGMO
          </h1>
          <p style={{
            color: 'var(--text-dark)',
            fontSize: '16px',
            fontWeight: '600',
            margin: '0 0 5px 0'
          }}>
            Sistema de Gestión Modular
          </p>
          <p style={{
            color: 'var(--text-light)',
            fontSize: '14px',
            margin: 0
          }}>
            Ingresa tus credenciales para acceder
          </p>
        </div>

        <Card>
          <form onSubmit={iniciarSesion}>
            <Input
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              required
            />

            <Input
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contraseña"
              required
            />

            <Boton
              tipo="submit"
              variante="primary"
              disabled={cargando}
              style={{ width: '100%', marginTop: '8px' }}
            >
              {cargando ? 'Ingresando...' : 'Iniciar Sesión en SIGMO'}
            </Boton>
          </form>

          {error && (
            <div className="alert alert-error" style={{ marginTop: '15px', marginBottom: 0 }}>
              {error}
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <Boton
              variante="outline"
              tamano="sm"
              onClick={() => setPantalla('forgot')}
            >
              ¿Olvidaste tu contraseña?
            </Boton>
          </div>
        </Card>
      </div>
    </div>
  )
}