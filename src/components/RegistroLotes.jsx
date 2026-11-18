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
    setCargando(true)

    const { data, error } = await supabase.rpc('fn_registrar_lote_precintos', {
      p_id_planta: idPlanta,
      p_correlativo_inicio: parseInt(inicio),
      p_correlativo_fin: parseInt(fin),
      p_valor_sin_igv: parseFloat(valorSinIgv),
      p_color: color
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