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
    id_grupo: '',
    fecha_inicio: '',
    fecha_fin: '',
    dias_calendario: '',
    dias_operativos: '',
    bdc: '',
    bdo: ''
  }])
  const [guardando, setGuardando] = useState(false)

  // Estilos para inputs de fecha con ícono de calendario visible
  const dateInputStyle = {
    width: '100%',
    padding: '10px',
    paddingRight: '35px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '13px',
    backgroundColor: 'white',
    color: 'black',
    boxSizing: 'border-box'
  }

  const calendarIconStyle = {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
    fontSize: '16px',
    color: '#6b7280'
  }

  useEffect(() => {
    const cargarDatos = async () => {
      console.log('🔄 Cargando catálogos para BDC...')
      
      const [p, prov, g] = await Promise.all([
        supabase.from('plantas').select('id_planta, nombre, codigo').eq('activo', true).order('nombre'),
        supabase.from('proveedores').select('id, nombre, codigo').eq('activo', true).order('nombre'),
        supabase.from('grupos_productos').select('id, nombre, codigo').eq('activo', true).order('codigo')
      ])

      console.log('📦 Plantas:', p.data)
      console.log('🏢 Proveedores:', prov.data)
      console.log('📊 Grupos:', g.data)

      setPlantas(p.data || [])
      setProveedores(prov.data || [])
      setGrupos(g.data || [])
    }
    cargarDatos()
  }, [])

  // Validar si los campos obligatorios están completos
  const camposObligatoriosCompletos = idPlanta && idProveedor

  const handlePlantaChange = (e) => {
    const valor = e.target.value
    console.log('🏭 Planta seleccionada:', valor)
    setIdPlanta(valor)
  }

  const handleProveedorChange = (e) => {
    const valor = e.target.value
    console.log('🏢 Proveedor seleccionado:', valor)
    setIdProveedor(valor)
  }

  const agregarGrupo = () => {
    setGruposForm([...gruposForm, {
      id_grupo: '',
      fecha_inicio: '',
      fecha_fin: '',
      dias_calendario: '',
      dias_operativos: '',
      bdc: '',
      bdo: ''
    }])
  }

  const actualizarGrupo = (index, campo, valor) => {
    const nuevos = [...gruposForm]
    nuevos[index][campo] = valor
    
    // Calcular BDO automáticamente cuando cambien días o BDC
    if (campo === 'dias_calendario' || campo === 'dias_operativos' || campo === 'bdc') {
      const dc = Number(nuevos[index].dias_calendario)
      const do_ = Number(nuevos[index].dias_operativos)
      const bdc = Number(nuevos[index].bdc)
      
      if (dc > 0 && do_ > 0 && bdc >= 0) {
        nuevos[index].bdo = (bdc * (dc / do_)).toFixed(2)
        console.log(`🧮 BDO calculado: ${bdc} × (${dc} / ${do_}) = ${nuevos[index].bdo}`)
      } else {
        nuevos[index].bdo = ''
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
    if (!idPlanta || !idProveedor) {
      return toast.error('Selecciona Planta y Proveedor')
    }
    
    for (const g of gruposForm) {
      if (!g.id_grupo || !g.fecha_inicio || !g.fecha_fin || !g.dias_calendario || !g.dias_operativos || !g.bdc) {
        return toast.error('Completa todos los campos del grupo')
      }
      if (Number(g.dias_operativos) > Number(g.dias_calendario)) {
        return toast.error('Días operativos no puede ser mayor a días calendario')
      }
      if (Number(g.bdc) < 0) {
        return toast.error('BDC no puede ser negativo')
      }
    }

    setGuardando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      for (const g of gruposForm) {
        const registro = {
          id_planta: idPlanta,
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
        }

        console.log('💾 Guardando BDC:', registro)

        const { data, error } = await supabase.from('bdc').insert(registro).select()

        if (error) {
          console.error('❌ Error al guardar BDC:', error)
          throw error
        }

        console.log('✅ BDC guardado:', data)
      }

      toast.success('BDC registrado exitosamente')
      onVolver()
    } catch (error) {
      console.error('❌ Error:', error)
      toast.error('Error al guardar: ' + error.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Card style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ color: '#0033A0', marginBottom: '20px', textAlign: 'center' }}>Registrar BDC</h2>
      
      {/* Campos obligatorios */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Planta */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
            Planta *
          </label>
          <select 
            value={idPlanta} 
            onChange={handlePlantaChange}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', backgroundColor: 'white', color: 'black' }}
          >
            <option value="">Seleccionar Planta</option>
            {plantas.map(p => (
              <option key={p.id_planta} value={p.id_planta}>{p.nombre}</option>
            ))}
          </select>
          {idPlanta && (
            <small style={{ color: '#0033A0', fontWeight: 'bold', marginTop: '5px', display: 'block' }}>
              ID: {plantas.find(p => p.id_planta === idPlanta)?.codigo}
            </small>
          )}
        </div>

        {/* Proveedor */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
            Proveedor *
          </label>
          <select 
            value={idProveedor} 
            onChange={handleProveedorChange}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', backgroundColor: 'white', color: 'black' }}
          >
            <option value="">Seleccionar Proveedor</option>
            {proveedores.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
          {idProveedor && (
            <small style={{ color: '#0033A0', fontWeight: 'bold', marginTop: '5px', display: 'block' }}>
              ID: {proveedores.find(p => p.id === idProveedor)?.codigo}
            </small>
          )}
        </div>
      </div>

      {/* Grupos (solo si campos obligatorios están completos) */}
      {camposObligatoriosCompletos && (
        <>
          <hr style={{ margin: '30px 0', border: 'none', borderTop: '2px solid #e5e7eb' }} />
          
          <h3 style={{ color: '#0033A0', marginBottom: '20px', textAlign: 'center' }}>
            Grupo N°{gruposForm.length}
          </h3>

          {gruposForm.map((grupo, index) => (
            <div key={index} style={{ background: '#f9fafb', padding: '20px', borderRadius: '8px', marginBottom: '15px', position: 'relative', border: '1px solid #e5e7eb' }}>
              {/* Título del grupo */}
              <h4 style={{ color: '#0033A0', marginBottom: '15px', fontSize: '16px', fontWeight: 'bold', marginTop: 0 }}>
                Grupo N°{index + 1}
              </h4>
              
              {gruposForm.length > 1 && (
                <button 
                  onClick={() => eliminarGrupo(index)} 
                  style={{ 
                    position: 'absolute', 
                    top: '10px', 
                    right: '10px', 
                    background: '#fee2e2', 
                    color: '#991b1b', 
                    border: 'none', 
                    borderRadius: '50%', 
                    width: '28px', 
                    height: '28px', 
                    cursor: 'pointer', 
                    fontWeight: 'bold',
                    fontSize: '16px'
                  }}
                >
                  ×
                </button>
              )}
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px' }}>
                {/* Grupo Producto */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Grupo Producto *</label>
                  <select 
                    value={grupo.id_grupo} 
                    onChange={(e) => actualizarGrupo(index, 'id_grupo', e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', backgroundColor: 'white', color: 'black' }}
                  >
                    <option value="">Seleccionar</option>
                    {grupos.map(g => (
                      <option key={g.id} value={g.id}>{g.nombre} ({g.codigo})</option>
                    ))}
                  </select>
                </div>

                {/* Fecha Inicio */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Fecha Inicio *</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="date" 
                      value={grupo.fecha_inicio} 
                      onChange={(e) => actualizarGrupo(index, 'fecha_inicio', e.target.value)}
                      style={dateInputStyle}
                    />
                    <span style={calendarIconStyle}>📅</span>
                  </div>
                </div>

                {/* Fecha Fin */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Fecha Fin *</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="date" 
                      value={grupo.fecha_fin} 
                      onChange={(e) => actualizarGrupo(index, 'fecha_fin', e.target.value)}
                      style={dateInputStyle}
                    />
                    <span style={calendarIconStyle}>📅</span>
                  </div>
                </div>

                {/* Días Calendario */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Días Calendario *</label>
                  <input 
                    type="number" 
                    value={grupo.dias_calendario} 
                    onChange={(e) => actualizarGrupo(index, 'dias_calendario', e.target.value)}
                    placeholder="30"
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', backgroundColor: 'white', color: 'black', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Días Operativos */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Días Operativos *</label>
                  <input 
                    type="number" 
                    value={grupo.dias_operativos} 
                    onChange={(e) => actualizarGrupo(index, 'dias_operativos', e.target.value)}
                    placeholder="25"
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', backgroundColor: 'white', color: 'black', boxSizing: 'border-box' }}
                  />
                </div>

                {/* BDC */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>BDC *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={grupo.bdc} 
                    onChange={(e) => actualizarGrupo(index, 'bdc', e.target.value)}
                    placeholder="125"
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', backgroundColor: 'white', color: 'black', boxSizing: 'border-box' }}
                  />
                </div>

                {/* BDO (calculado automáticamente) */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>BDO (calculado)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={grupo.bdo || ''} 
                    readOnly
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', backgroundColor: '#f3f4f6', color: '#6b7280', boxSizing: 'border-box' }}
                  />
                  <small style={{ color: '#6b7280', fontSize: '11px', marginTop: '3px', display: 'block' }}>
                    BDO = BDC × (Días Cal / Días Op)
                  </small>
                </div>
              </div>
            </div>
          ))}

          {/* Botones de acción */}
          <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
            <Boton variante="outline" onClick={agregarGrupo}>+ Agregar Grupo</Boton>
            <Boton 
              variante="primary" 
              onClick={guardar} 
              disabled={guardando}
              style={{ marginLeft: 'auto' }}
            >
              {guardando ? 'Guardando...' : '💾 Guardar BDC'}
            </Boton>
          </div>
        </>
      )}

      {/* Mensaje si no se han completado los campos obligatorios */}
      {!camposObligatoriosCompletos && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <p style={{ fontSize: '16px', marginBottom: '10px' }}>⚠️ Completa los campos obligatorios para continuar</p>
          <p style={{ fontSize: '14px' }}>Selecciona Planta y Proveedor</p>
        </div>
      )}
    </Card>
  )
}