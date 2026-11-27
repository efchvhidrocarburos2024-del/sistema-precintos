import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import toast from 'react-hot-toast'
import { Card, Boton } from '../ui'

export default function RegistrarCuota({ onVolver, rol }) {
  const [tipoRegistro, setTipoRegistro] = useState('planta') // 'planta' | 'asesor'
  const [plantas, setPlantas] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [grupos, setGrupos] = useState([])
  const [productos, setProductos] = useState([])
  const [asesores, setAsesores] = useState([])
  
  const [idPlanta, setIdPlanta] = useState('')
  const [idProveedor, setIdProveedor] = useState('')
  const [productosForm, setProductosForm] = useState([{
    id_grupo: '', id_producto: '', cantidad: '', tipo_cuota: 'Bolsa',
    fecha_inicio: '', fecha_fin: '', observaciones: '1',
    compensacion: false, id_planta_alterna: '', cantidad_compensada: '',
    cantidad_adicional: '0', cantidad_adelanto: '0'
  }])
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    const cargarDatos = async () => {
      const [p, prov, g, prod, ases] = await Promise.all([
        supabase.from('plantas').select('id_planta, nombre, codigo').eq('activo', true),
        supabase.from('proveedores').select('id, nombre, codigo').eq('activo', true),
        supabase.from('grupos_productos').select('id, nombre, codigo').eq('activo', true),
        supabase.from('productos').select('id, nombre, codigo, id_grupo_producto').eq('activo', true),
        supabase.from('usuarios').select('id_usuario, nombre_completo, email').eq('activo', true)
      ])
      setPlantas(p.data || [])
      setProveedores(prov.data || [])
      setGrupos(g.data || [])
      setProductos(prod.data || [])
      setAsesores(ases.data || [])
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

  const agregarProducto = () => {
    setProductosForm([...productosForm, {
      id_grupo: '', id_producto: '', cantidad: '', tipo_cuota: 'Bolsa',
      fecha_inicio: '', fecha_fin: '', observaciones: '1',
      compensacion: false, id_planta_alterna: '', cantidad_compensada: '',
      cantidad_adicional: '0', cantidad_adelanto: '0'
    }])
  }

  const actualizarProducto = (index, campo, valor) => {
    const nuevos = [...productosForm]
    nuevos[index][campo] = valor
    if (campo === 'id_grupo') nuevos[index].id_producto = ''
    setProductosForm(nuevos)
  }

  const eliminarProducto = (index) => {
    if (productosForm.length > 1) {
      setProductosForm(productosForm.filter((_, i) => i !== index))
    }
  }

  const guardar = async () => {
    if (!idPlanta || !idProveedor) return toast.error('Selecciona Planta y Proveedor')
    
    for (const p of productosForm) {
      if (!p.id_producto || !p.cantidad || !p.fecha_inicio || !p.fecha_fin) {
        return toast.error('Completa todos los campos de los productos')
      }
      if (Number(p.cantidad) < 0) return toast.error('La cantidad no puede ser negativa')
      if (tipoRegistro === 'asesor' && !p.id_asesor) return toast.error('Selecciona un asesor')
    }

    setGuardando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      for (const p of productosForm) {
        const { data, error } = await supabase.from('cuotas').insert({
          tipo_registro: tipoRegistro,
          id_planta: plantas.find(pl => pl.codigo === idPlanta)?.id_planta,
          id_proveedor: idProveedor,
          id_asesor: tipoRegistro === 'asesor' ? p.id_asesor : null,
          id_producto: p.id_producto,
          id_grupo_producto: p.id_grupo,
          fecha_inicio: p.fecha_inicio,
          fecha_fin: p.fecha_fin,
          tipo_cuota: p.tipo_cuota,
          cantidad: Number(p.cantidad),
          observaciones: parseInt(p.observaciones),
          compensacion: p.compensacion || false,
          id_planta_alterna: p.id_planta_alterna || null,
          cantidad_compensada: Number(p.cantidad_compensada || 0),
          cantidad_adicional: Number(p.cantidad_adicional || 0),
          cantidad_adelanto: Number(p.cantidad_adelanto || 0),
          estado: 'activa',
          creado_por: user?.id
        }).select()

        if (error) throw error
      }

      toast.success('Cuota registrada exitosamente')
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
      <h2 style={{ color: '#0033A0', marginBottom: '20px' }}>Registrar Nueva Cuota</h2>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <Boton variante={tipoRegistro === 'planta' ? 'primary' : 'outline'} onClick={() => setTipoRegistro('planta')}>
          Por Planta
        </Boton>
        <Boton variante={tipoRegistro === 'asesor' ? 'primary' : 'outline'} onClick={() => setTipoRegistro('asesor')}>
          Por Asesor
        </Boton>
      </div>

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

      {productosForm.map((prod, index) => (
        <div key={index} style={{ background: '#f9fafb', padding: '20px', borderRadius: '8px', marginBottom: '15px', position: 'relative' }}>
          {productosForm.length > 1 && (
            <button onClick={() => eliminarProducto(index)} style={{ position: 'absolute', top: '10px', right: '10px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Grupo Producto</label>
              <select value={prod.id_grupo} onChange={(e) => actualizarProducto(index, 'id_grupo', e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                <option value="">Seleccionar</option>
                {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Producto</label>
              <select value={prod.id_producto} onChange={(e) => actualizarProducto(index, 'id_producto', e.target.value)} disabled={!prod.id_grupo} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                <option value="">Seleccionar</option>
                {productos.filter(p => p.id_grupo_producto === prod.id_grupo).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Cantidad</label>
              <input type="number" step="0.01" value={prod.cantidad} onChange={(e) => actualizarProducto(index, 'cantidad', e.target.value)} placeholder="0.00" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Tipo Cuota</label>
              <select value={prod.tipo_cuota} onChange={(e) => actualizarProducto(index, 'tipo_cuota', e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                <option value="Bolsa">Bolsa</option>
                <option value="Diaria">Diaria</option>
                <option value="Paquete">Paquete</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Fecha Inicio</label>
              <input type="date" value={prod.fecha_inicio} onChange={(e) => actualizarProducto(index, 'fecha_inicio', e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Fecha Fin</label>
              <input type="date" value={prod.fecha_fin} onChange={(e) => actualizarProducto(index, 'fecha_fin', e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Observaciones</label>
              <input type="text" value={prod.observaciones} onChange={(e) => actualizarProducto(index, 'observaciones', e.target.value)} placeholder="Ej: 0, 1, 2, 3 o texto libre" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
            </div>
            {tipoRegistro === 'asesor' && (
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Asesor</label>
                <select value={prod.id_asesor || ''} onChange={(e) => actualizarProducto(index, 'id_asesor', e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                  <option value="">Seleccionar Asesor</option>
                  {asesores.map(a => <option key={a.id_usuario} value={a.id_usuario}>{a.nombre_completo}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Sección de compensación */}
          <div style={{ marginTop: '15px', padding: '15px', background: 'white', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input type="checkbox" checked={prod.compensacion} onChange={(e) => actualizarProducto(index, 'compensacion', e.target.checked)} />
              <span style={{ fontWeight: 'bold', fontSize: '13px' }}>¿Aplica compensación?</span>
            </label>
            {prod.compensacion && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '10px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Planta Alterna</label>
                  <select value={prod.id_planta_alterna} onChange={(e) => actualizarProducto(index, 'id_planta_alterna', e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                    <option value="">Seleccionar</option>
                    {plantas.map(p => <option key={p.id_planta} value={p.id_planta}>{p.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Cantidad Compensada</label>
                  <input type="number" step="0.01" value={prod.cantidad_compensada} onChange={(e) => actualizarProducto(index, 'cantidad_compensada', e.target.value)} placeholder="0.00" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                </div>
              </div>
            )}
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
        <Boton variante="outline" onClick={agregarProducto}>+ Agregar Producto</Boton>
        <Boton variante="primary" onClick={guardar} disabled={guardando} style={{ marginLeft: 'auto' }}>
          {guardando ? 'Guardando...' : '💾 Guardar Cuota'}
        </Boton>
      </div>
    </Card>
  )
}