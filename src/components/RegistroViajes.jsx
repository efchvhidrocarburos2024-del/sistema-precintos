import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'
import { PageHeader, Card, Input, Select, Boton, Spinner } from './ui'

export default function RegistroViajes() {
  const [scop, setScop] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [cargando, setCargando] = useState(false)

  // Estados para manejar plantas y roles
  const [idPlanta, setIdPlanta] = useState('')
  const [nombrePlanta, setNombrePlanta] = useState('')
  const [rol, setRol] = useState('')
  const [plantas, setPlantas] = useState([])
  const [cargandoPerfil, setCargandoPerfil] = useState(true)

  // Roles que tienen acceso total a cualquier planta
  const rolesGlobales = ['admin_sistema', 'analista_operaciones', 'jefe_operaciones', 'jefe_proyecto']

  useEffect(() => {
    async function obtenerPerfilUsuario() {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: usuarioData } = await supabase
          .from('usuarios')
          .select(`
            id_planta,
            roles ( codigo ),
            plantas ( nombre )
          `)
          .eq('id_usuario', user.id)
          .single()

        if (usuarioData) {
          const rolUsuario = usuarioData.roles?.codigo?.toLowerCase() || ''
          setRol(rolUsuario)

          if (rolesGlobales.includes(rolUsuario)) {
            const { data: todasPlantas } = await supabase.from('plantas').select('id_planta, nombre').order('nombre')
            if (todasPlantas) {
              setPlantas(todasPlantas)
              setIdPlanta(usuarioData.id_planta || todasPlantas[0]?.id_planta || '')
              setNombrePlanta(usuarioData.plantas?.nombre || todasPlantas[0]?.nombre || '')
            }
          } else {
            if (usuarioData.id_planta) {
              setIdPlanta(usuarioData.id_planta)
              setNombrePlanta(usuarioData.plantas?.nombre || 'Planta Asignada')
            } else {
              const prefijoCorreo = user.email.split('@')[0].replace('planta.', '').toLowerCase()
              const { data: matchPlanta } = await supabase
                .from('plantas')
                .select('id_planta, nombre')
                .ilike('nombre', `%${prefijoCorreo}%`)
                .limit(1)

              if (matchPlanta && matchPlanta.length > 0) {
                setIdPlanta(matchPlanta[0].id_planta)
                setNombrePlanta(matchPlanta[0].nombre)
              }
            }
          }
        }
      }
      setCargandoPerfil(false)
    }
    obtenerPerfilUsuario()
  }, [])

  const handlePlantaChange = (e) => {
    const nuevaId = e.target.value
    setIdPlanta(nuevaId)
    const plantaSeleccionada = plantas.find(p => p.id_planta === nuevaId)
    if (plantaSeleccionada) setNombrePlanta(plantaSeleccionada.nombre)
  }

  const registrarViaje = async (e) => {
    e.preventDefault()

    if (scop.length !== 11) {
      toast.error('El SCOP debe tener exactamente 11 dígitos.')
      return
    }

    if (!idPlanta) {
      toast.error('No se ha seleccionado una planta válida.')
      return
    }

    setCargando(true)

    const { data, error } = await supabase.rpc('fn_registrar_viaje_scop', {
      p_id_planta: idPlanta,
      p_scop: scop,
      p_cantidad: parseInt(cantidad)
    })

    if (error) {
      toast.error('Error: ' + error.message)
    } else {
      toast.success(data)
      setScop('')
      setCantidad('')
    }
    setCargando(false)
  }

  if (cargandoPerfil) {
    return <Spinner />
  }

  // Si después de todo no se encontró planta y no es un rol global
  if (!idPlanta && !rolesGlobales.includes(rol)) {
    return (
      <div className="page-container" style={{ maxWidth: '500px' }}>
        <Card>
          <div className="alert alert-warning" style={{ marginBottom: '15px' }}>
            <strong>⚠️ Sin Planta Asignada</strong>
          </div>
          <p style={{ color: 'var(--text-light)', fontSize: '14px', lineHeight: '1.6' }}>
            Tu usuario no tiene una planta vinculada. Contacta al Administrador del Sistema
            para que asigne tu planta en el panel de usuarios.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="page-container" style={{ maxWidth: '500px' }}>
      <PageHeader titulo="Registro de Viaje" />

      <Card>
        <form onSubmit={registrarViaje}>
          {/* LÓGICA DE SELECCIÓN DE PLANTA */}
          {rolesGlobales.includes(rol) ? (
            <Select
              label="Seleccionar Planta"
              value={idPlanta}
              onChange={handlePlantaChange}
              required
              placeholder={null}
              options={plantas.map(p => ({
                value: p.id_planta,
                label: p.nombre
              }))}
            />
          ) : (
            <div style={{
              color: 'var(--primary-blue)',
              fontSize: '15px',
              textAlign: 'center',
              fontWeight: 'bold',
              padding: '12px',
              backgroundColor: '#eef6ff',
              borderRadius: '6px',
              marginBottom: '16px'
            }}>
              Planta: {nombrePlanta}
            </div>
          )}

          <Input
            label="Código SCOP (11 dígitos)"
            type="text"
            maxLength="11"
            value={scop}
            onChange={(e) => setScop(e.target.value.replace(/\D/g, ''))}
            required
            placeholder="Ej. 12571802685"
          />

          <Input
            label="Cantidad de precintos"
            type="number"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            required
            min="1"
          />

          <div className="form-actions">
            <Boton
              tipo="submit"
              variante="success"
              disabled={cargando}
              style={{ width: '100%' }}
            >
              {cargando ? 'Procesando...' : 'Registrar Viaje (PEPS)'}
            </Boton>
          </div>
        </form>
      </Card>
    </div>
  )
}