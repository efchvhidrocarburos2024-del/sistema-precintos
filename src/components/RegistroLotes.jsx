import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'
import { PageHeader, Card, Input, Select, Boton } from './ui'

export default function RegistroLotes() {
  const [plantas, setPlantas] = useState([])
  const [idPlanta, setIdPlanta] = useState('')
  const [inicio, setInicio] = useState('')
  const [fin, setFin] = useState('')
  const [valorSinIgv, setValorSinIgv] = useState('')
  const [color, setColor] = useState('')
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    async function cargarPlantas() {
      const { data } = await supabase.from('plantas').select('*').order('nombre')
      if (data) {
        setPlantas(data)
        setIdPlanta(data[0]?.id_planta || '')
      }
    }
    cargarPlantas()
  }, [])

  const registrarLote = async (e) => {
    e.preventDefault()

    // --- NUEVAS VALIDACIONES DE SEGURIDAD ---
    if (!idPlanta) {
      return toast.error('Debe seleccionar una planta destino.')
    }

    const inicioNum = parseInt(inicio, 10)
    const finNum = parseInt(fin, 10)
    const valorNum = parseFloat(valorSinIgv)

    if (isNaN(inicioNum) || isNaN(finNum) || inicioNum <= 0 || finNum <= 0) {
      return toast.error('Los correlativos deben ser números enteros positivos.')
    }

    if (finNum < inicioNum) {
      return toast.error('El correlativo "AL" (Fin) no puede ser menor que el "DEL" (Inicio).')
    }

    if (isNaN(valorNum) || valorNum < 0) {
      return toast.error('El valor sin IGV debe ser un número válido.')
    }

    if (!color.trim()) {
      return toast.error('El color es obligatorio.')
    }
    // ---------------------------------------

    setCargando(true)

    // Enviamos los datos ya validados y limpios
    const { data, error } = await supabase.rpc('fn_registrar_lote_precintos', {
      p_id_planta: idPlanta,
      p_correlativo_inicio: inicioNum,
      p_correlativo_fin: finNum,
      p_valor_sin_igv: valorNum,
      p_color: color.trim()
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success(`¡Éxito! Se registraron ${data} precintos.`)
      setInicio('')
      setFin('')
      setValorSinIgv('')
      setColor('')
    }
    setCargando(false)
  }

  return (
    <div className="page-container" style={{ maxWidth: '500px' }}>
      <PageHeader titulo="Registro de Lotes" />

      <p style={{
        color: 'var(--text-light)',
        fontSize: '14px',
        textAlign: 'center',
        marginBottom: '20px'
      }}>
        Analista de Operaciones
      </p>

      <Card>
        <form onSubmit={registrarLote}>
          <Select
            label="Planta destino"
            value={idPlanta}
            onChange={(e) => setIdPlanta(e.target.value)}
            placeholder={null}
            options={plantas.map(p => ({
              value: p.id_planta,
              label: `${p.nombre} (${p.codigo})`
            }))}
          />

          <Input
            label="Correlativo Inicio (DEL)"
            type="number"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            required
          />

          <Input
            label="Correlativo Fin (AL)"
            type="number"
            value={fin}
            onChange={(e) => setFin(e.target.value)}
            required
          />

          <Input
            label="Valor sin IGV (S/)"
            type="number"
            step="0.01"
            min="0"
            value={valorSinIgv}
            onChange={(e) => setValorSinIgv(e.target.value)}
            placeholder="Ej. 1.50"
            required
          />

          <Input
            label="Color"
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="Ej. Rojo"
            required
          />

          <div className="form-actions">
            <Boton
              tipo="submit"
              variante="primary"
              disabled={cargando}
              style={{ width: '100%' }}
            >
              {cargando ? 'Guardando...' : 'Guardar en Sistema'}
            </Boton>
          </div>
        </form>
      </Card>
    </div>
  )
}