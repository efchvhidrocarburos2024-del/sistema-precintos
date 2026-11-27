import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import toast from 'react-hot-toast'
import { Card, Boton } from '../ui'

export default function RegistrarBDC({ onVolver, rol }) {
  const [plantas, setPlantas] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [grupos, setGrupos] = useState([])
  
  const [idPlanta, setIdPlanta] = useState('')
  const [idProveedor, setIdProveedor] = useState('')
  const [gruposForm, setGruposForm] = useState([{
    id_grupo: '', fecha_inicio: '', fecha_fin: '',
    dias_calendario: '', dias_operativos: '', bdc: ''
  }])
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    const cargarDatos = async () => {
      const [p, prov, g] = await Promise.all([
        supabase.from('plantas').select('id_planta, nombre, codigo').eq('activo', true),
        supabase.from('proveedores').select('id, nombre, codigo').eq('activo', true),
        supabase.from('grupos_productos').select('id, nombre, codigo').eq('activo', true)
      ])
      setPlantas(p.data || [])
      setProveedores(prov.data || [])
      setGrupos(g.data || [])
    }
    cargarDatos()
  }, [])

  const handlePlantaChange = (e) => {
    const selected = plantas.find(p => p.id_planta === e.target.value)
    setIdPlanta(selected ? selected.codigo : '')
  }

  const handleProveedorChange = (e) => {
    const selected = proveedores.find(p => p.id === e.target.value)
    setIdProveedor(selected ? selected.codigo : '')
  }

  const agregarGrupo = () => {
    setGruposForm([...gruposForm, {
      id_grupo: '', fecha_inicio: '', fecha_fin: '',
      dias_calendario: '', dias_operativos: '', bdc: ''
    }])
  }

  const actualizarGrupo = (index, campo, valor) => {
    const nuevos = [...gruposForm]
    nuevos[index][campo] = valor
    
    // Calcular BDO automáticamente
    if (campo === 'dias_calendario' || campo === 'dias_operativos' || campo === 'bdc') {
      const dc = Number(nuevos[index].dias_calendario)
      const do_ = Number(nuevos[index].dias_operativos)
      const bdc = Number(nuevos[index].bdc)
      if (dc > 0 && do_ > 0 && bdc >= 0) {
        nuevos[index].bdo = (bdc * (dc / do_)).toFixed(2)
      }
    }
    
    setGruposForm(nuevos)
  }

  const eliminarGrupo = (index) => {
    if (gruposForm.length > 1) {
      setGruposForm(gruposForm.filter((_, i) => i !== index))
    }
  }

  const guardar = async () => {
    if (!idPlanta || !idProveedor) return toast.error('Selecciona Planta y Proveedor')
    
    for (const g of gruposForm) {
      if (!g.id_grupo || !g.fecha_inicio || !g.fecha_fin || !g.dias_calendario || !g.dias_operativos || !g.bdc) {
        return toast.error('Completa todos los campos')
      }
      if (Number(g.dias_operativos) > Number(g.dias_calendario)) {
        return toast.error('Días operativos no puede ser mayor a días calendario')
      }
    }

    setGuardando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      for (const g of gruposForm) {
        const { data, error } = await supabase.from('bdc').insert({
          id_planta: plantas.find(p => p.codigo === idPlanta)?.id_planta,
          id_proveedor: idProveedor,
          id_grupo_producto: g.id_grupo,
          fecha_inicio: g.fecha_inicio,
          fecha_fin: g.fecha_fin,
          dias_calendario: Number(g.dias_calendario),
          dias_operativos: Number(g.dias_operativos),
          bdc: Number(g.bdc),
          bdo: Number(g.bdo || 0),
          estado: 'activo',
          creado_por: user?.id
        }).select()

        if (error) throw error
      }

      toast.success('BDC registrado exitosamente')
      onVolver()
    } catch (error) {
      console.error(error)
      toast.error('Error al guardar: ' + error.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Card style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ color: '#0033A0', marginBottom: '20px' }}>Registrar BDC</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Planta</label>
          <select value={plantas.find(p => p.codigo === idPlanta)?.id_planta || ''} onChange={handlePlantaChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
            <option value="">Seleccionar Planta</option>
            {plantas.map(p => <option key={p.id_planta} value={p.id_planta}>{p.nombre}</option>)}
          </select>
          {idPlanta && <small style={{ color: '#0033A0', fontWeight: 'bold' }}>ID: {idPlanta}</small>}
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Proveedor</label>
          <select value={idProveedor} onChange={handleProveedorChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
            <option value="">Seleccionar Proveedor</option>
            {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          {idProveedor && <small style={{ color: '#0033A0', fontWeight: 'bold' }}>ID: {idProveedor}</small>}
        </div>
      </div>

      <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />

      {gruposForm.map((grupo, index) => (
        <div key={index} style={{ background: '#f9fafb', padding: '20px', borderRadius: '8px', marginBottom: '15px', position: 'relative' }}>
          {gruposForm.length > 1 && (
            <button onClick={() => eliminarGrupo(index)} style={{ position: 'absolute', top: '10px', right: '10px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Grupo Producto</label>
              <select value={grupo.id_grupo} onChange={(e) => actualizarGrupo(index, 'id_grupo', e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                <option value="">Seleccionar</option>
                {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Fecha Inicio</label>
              <input type="date" value={grupo.fecha_inicio} onChange={(e) => actualizarGrupo(index, 'fecha_inicio', e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Fecha Fin</label>
              <input type="date" value={grupo.fecha_fin} onChange={(e) => actualizarGrupo(index, 'fecha_fin', e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Días Calendario</label>
              <input type="number" value={grupo.dias_calendario} onChange={(e) => actualizarGrupo(index, 'dias_calendario', e.target.value)} placeholder="30" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Días Operativos</label>
              <input type="number" value={grupo.dias_operativos} onChange={(e) => actualizarGrupo(index, 'dias_operativos', e.target.value)} placeholder="25" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>BDC</label>
              <input type="number" step="0.01" value={grupo.bdc} onChange={(e) => actualizarGrupo(index, 'bdc', e.target.value)} placeholder="125" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>BDO (calculado)</label>
              <input type="number" step="0.01" value={grupo.bdo || ''} readOnly style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#f3f4f6' }} />
            </div>
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
        <Boton variante="outline" onClick={agregarGrupo}>+ Agregar Grupo</Boton>
        <Boton variante="primary" onClick={guardar} disabled={guardando} style={{ marginLeft: 'auto' }}>
          {guardando ? 'Guardando...' : '💾 Guardar BDC'}
        </Boton>
      </div>
    </Card>
  )
}