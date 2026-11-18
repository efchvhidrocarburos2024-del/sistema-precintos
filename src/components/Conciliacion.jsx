import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'
import { PageHeader, Card, Select, Boton, Tabla, Badge } from './ui'

export default function Conciliacion() {
  const [plantas, setPlantas] = useState([])
  const [plantaSeleccionada, setPlantaSeleccionada] = useState('')
  const [resultados, setResultados] = useState(null)
  const [justificacion, setJustificacion] = useState('')
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  // 1. Cargar las plantas al iniciar
  useEffect(() => {
    const fetchPlantas = async () => {
      const { data } = await supabase.from('plantas').select('id_planta, nombre')
      if (data) setPlantas(data)
    }
    fetchPlantas()
  }, [])

  // 2. Función que hace la matemática
  const ejecutarConciliacion = async () => {
    if (!plantaSeleccionada) {
      setMensaje('⚠️ Selecciona una planta primero.')
      return
    }

    setCargando(true)
    setMensaje('')
    setResultados(null)

    const { data: precintos, error } = await supabase
      .from('precintos')
      .select('estado')
      .eq('id_planta', plantaSeleccionada)

    if (error) {
      setMensaje('❌ Error al consultar: ' + error.message)
      setCargando(false)
      return
    }

    let disponibles = 0, asignados = 0, devueltos = 0, rotos = 0

    precintos.forEach(p => {
      if (p.estado === 'DISPONIBLE') disponibles++
      if (p.estado === 'ASIGNADO') asignados++
      if (p.estado === 'DEVUELTO') devueltos++
      if (p.estado === 'ROTO' || p.estado === 'DAÑADO') rotos++
    })

    const totalSistema = precintos.length
    const sumaEstados = disponibles + asignados + devueltos + rotos
    const cuadra = (totalSistema === sumaEstados)

    setResultados({
      disponibles, asignados, devueltos, rotos, totalSistema, sumaEstados, cuadra
    })

    if (cuadra) {
      setMensaje('✅ El inventario CUADRA perfectamente.')
    } else {
      setMensaje('❌ DESCUADRE DETECTADO. Debes justificar antes de cerrar.')
    }

    setCargando(false)
  }

  // 3. Guardar el cierre semanal
  const guardarCierre = async () => {
    if (!resultados.cuadra && !justificacion) {
      setMensaje('⚠️ Escribe una justificación para el descuadre.')
      return
    }

    setCargando(true)
    const user = await supabase.auth.getUser()

    const { error } = await supabase.from('conciliaciones').insert([{
      planta_id: plantaSeleccionada,
      total_disponibles: resultados.disponibles,
      total_asignados: resultados.asignados,
      total_devueltos: resultados.devueltos,
      total_rotos: resultados.rotos,
      total_precintos: resultados.totalSistema,
      estado: resultados.cuadra ? 'CUADRADO' : 'DESCUADRADO',
      justificacion: resultados.cuadra ? null : justificacion,
      creado_por: user.data.user?.id
    }])

    if (error) {
      setMensaje('❌ Error al guardar: ' + error.message)
      toast.error('Error al guardar el cierre')
    } else {
      setMensaje('💾 Cierre semanal guardado exitosamente en el historial.')
      toast.success('Cierre guardado con éxito')

      // --- ENVIAR CORREO DE ALERTA ---
      try {
        const nombrePlanta = plantas.find(p => p.id_planta === plantaSeleccionada)?.nombre || 'Desconocida'

        const resumenDetalles =
          `Estado: ${resultados.cuadra ? 'CUADRADO' : 'DESCUADRADO'}. ` +
          `Disponibles: ${resultados.disponibles}, Asignados: ${resultados.asignados}, ` +
          `Devueltos: ${resultados.devueltos}, Rotos: ${resultados.rotos}. ` +
          `Total Registros: ${resultados.totalSistema}.`

        await supabase.functions.invoke('notificar-conciliacion', {
          body: {
            planta_nombre: nombrePlanta,
            fecha_conciliacion: new Date().toLocaleString('es-PE'),
            detalles: resumenDetalles
          }
        })
        toast.success('Correo enviado a los administradores')
      } catch (err) {
        console.error('Error al enviar correo:', err)
        toast.error('Cierre guardado, pero no se pudo enviar el correo.')
      }

      // Limpiar formulario
      setResultados(null)
      setJustificacion('')
      setPlantaSeleccionada('')
    }
    setCargando(false)
  }

  // Clase dinámica para el mensaje
  const claseMensaje = () => {
    if (!mensaje) return ''
    if (mensaje.includes('❌') || mensaje.includes('⚠️')) return 'alert alert-error'
    return 'alert alert-success'
  }

  return (
    <div className="page-container" style={{ maxWidth: '900px' }}>
      <PageHeader titulo="Cierre y Conciliación Semanal" />

      <Card>
        <div className="form-row">
          <Select
            label="Planta a auditar"
            value={plantaSeleccionada}
            onChange={(e) => setPlantaSeleccionada(e.target.value)}
            placeholder="Seleccione una planta para auditar..."
            options={plantas.map(p => ({
              value: p.id_planta,
              label: p.nombre
            }))}
          />
          <div className="form-group" style={{ justifyContent: 'flex-end' }}>
            <Boton
              variante="primary"
              onClick={ejecutarConciliacion}
              disabled={cargando || !plantaSeleccionada}
            >
              {cargando ? 'Calculando...' : 'Ejecutar Conciliación'}
            </Boton>
          </div>
        </div>

        {mensaje && !resultados && (
          <div className={claseMensaje()}>{mensaje}</div>
        )}
      </Card>

      {/* RESULTADOS */}
      {resultados && (
        <Card>
          <div
            style={{
              textAlign: 'center',
              padding: '15px',
              marginBottom: '20px',
              borderRadius: '6px',
              background: resultados.cuadra ? '#dcfce7' : '#fee2e2',
              color: resultados.cuadra ? '#166534' : '#991b1b',
              fontWeight: 'bold',
              fontSize: '18px'
            }}
          >
            {resultados.cuadra ? '✅ INVENTARIO CUADRADO' : '❌ DESCUADRE EN INVENTARIO'}
          </div>

          <Tabla
            columnas={['Estado', 'Cantidad']}
            hayDatos={true}
          >
            <tr>
              <td>Disponibles</td>
              <td><Badge variante="info">{resultados.disponibles}</Badge></td>
            </tr>
            <tr>
              <td>Asignados</td>
              <td><Badge variante="warning">{resultados.asignados}</Badge></td>
            </tr>
            <tr>
              <td>Devueltos</td>
              <td><Badge variante="success">{resultados.devueltos}</Badge></td>
            </tr>
            <tr>
              <td>Rotos / Dañados</td>
              <td><Badge variante="danger">{resultados.rotos}</Badge></td>
            </tr>
            <tr style={{ background: '#f0f4f8', fontWeight: 'bold' }}>
              <td>Suma de Estados (Sistema)</td>
              <td>{resultados.sumaEstados}</td>
            </tr>
            <tr style={{ background: '#f0f4f8', fontWeight: 'bold' }}>
              <td>Total Físico (Registros)</td>
              <td>{resultados.totalSistema}</td>
            </tr>
          </Tabla>

          {!resultados.cuadra && (
            <div className="form-group" style={{ marginTop: '20px' }}>
              <label className="form-label" style={{ color: 'var(--danger-red)' }}>
                Justificación del Descuadre <span className="required">*</span>
              </label>
              <textarea
                value={justificacion}
                onChange={(e) => setJustificacion(e.target.value)}
                placeholder="Ej. Se perdieron 2 precintos en el camión, se reportó a gerencia..."
                className="form-textarea"
                style={{ minHeight: '80px' }}
              />
            </div>
          )}

          <div style={{ marginTop: '20px' }}>
            <Boton
              variante={resultados.cuadra ? 'success' : 'danger'}
              onClick={guardarCierre}
              disabled={cargando}
              style={{ width: '100%' }}
            >
              {cargando
                ? 'Guardando...'
                : `Guardar Cierre Semanal (${resultados.cuadra ? 'Cuadrado' : 'Con Descuadre'})`}
            </Boton>
          </div>

          {mensaje && (
            <div className={claseMensaje()} style={{ marginTop: '20px', marginBottom: 0 }}>
              {mensaje}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}