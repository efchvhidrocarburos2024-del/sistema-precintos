import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'

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
    // CAMBIO RESPONSIVO AQUÍ: width: '90%' y boxSizing: 'border-box'
    <div style={{ width: '90%', maxWidth: '400px', margin: '20px auto', fontFamily: 'Arial', padding: '20px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', backgroundColor: 'white' }}>
      <h2 style={{ textAlign: 'center', color: '#0B5FA5', marginBottom: '5px' }}>Registro de Lotes</h2>
      <p style={{ color: '#666', fontSize: '14px', textAlign: 'center', marginBottom: '20px' }}>
        Analista de Operaciones
      </p>

      <form onSubmit={registrarLote} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        <label style={{ fontWeight: 'bold' }}>Planta destino:</label>
        <select value={idPlanta} onChange={(e) => setIdPlanta(e.target.value)} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white', color: 'black' }}>
          {plantas.map((p) => (
            <option key={p.id_planta} value={p.id_planta}>{p.nombre} ({p.codigo})</option>
          ))}
        </select>

        <label style={{ fontWeight: 'bold' }}>Correlativo Inicio (DEL):</label>
        <input type="number" value={inicio} onChange={(e) => setInicio(e.target.value)} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white', color: 'black' }} />

        <label style={{ fontWeight: 'bold' }}>Correlativo Fin (AL):</label>
        <input type="number" value={fin} onChange={(e) => setFin(e.target.value)} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white', color: 'black' }} />

        <label style={{ fontWeight: 'bold' }}>Valor sin IGV (S/):</label>
        <input type="number" step="0.01" min="0" value={valorSinIgv} onChange={(e) => setValorSinIgv(e.target.value)} required placeholder="Ej. 1.50" style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white', color: 'black' }} />

        <label style={{ fontWeight: 'bold' }}>Color:</label>
        <input type="text" value={color} onChange={(e) => setColor(e.target.value)} required placeholder="Ej. Rojo" style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white', color: 'black' }} />

        <button type="submit" disabled={cargando} style={{ padding: '12px', background: '#0B5FA5', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' }}>
          {cargando ? 'Guardando...' : 'Guardar en Sistema'}
        </button>
      </form>
    </div>
  )
}