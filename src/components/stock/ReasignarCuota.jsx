import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import toast from 'react-hot-toast'
import { Card, Boton } from '../ui'

export default function RegistrarCuota({ onVolver, rol }) {
  const [tipoRegistro, setTipoRegistro] = useState('planta')
  const [plantas, setPlantas] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [grupos, setGrupos] = useState([])
  const [productos, setProductos] = useState([])
  const [asesores, setAsesores] = useState([])
  
  const [idPlanta, setIdPlanta] = useState('')
  const [idProveedor, setIdProveedor] = useState('')
  const [idAsesor, setIdAsesor] = useState('')
  
  const [productosForm, setProductosForm] = useState([{
    id_grupo: '',
    id_producto: '',
    cantidad: '',
    tipo_cuota: 'Bolsa',
    fecha_inicio: '',
    fecha_fin: '',
    observaciones: '1',
    compensacion: false,
    id_planta_alterna: '',
    cantidad_compensada: ''
  }])
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    const cargarDatos = async () => {
      console.log('🔄 Cargando catálogos...')
      
      const [p, prov, g, prod, ases] = await Promise.all([
        supabase.from('plantas').select('id_planta, nombre, codigo').eq('activo', true).order('nombre'),
        supabase.from('proveedores').select('id, nombre, codigo').eq('activo', true).order('nombre'),
        supabase.from('grupos_productos').select('id, nombre, codigo').eq('activo', true).order('codigo'),
        supabase.from('productos').select('id, nombre, codigo, id_grupo_producto').eq('activo', true).order('nombre'),
        supabase.from('usuarios').select('id_usuario, nombre_completo, email').eq('activo', true).order('nombre_completo')
      ])

      console.log('📦 Plantas:', p.data)
      console.log('🏢 Proveedores:', prov.data)
      console.log('📊 Grupos:', g.data)
      console.log('🛢️ Productos:', prod.data)
      console.log('👥 Asesores:', ases.data)

      setPlantas(p.data || [])
      setProveedores(prov.data || [])
      setGrupos(g.data || [])
      setProductos(prod.data || [])
      setAsesores(ases.data || [])
    }
    cargarDatos()
  }, [])

  // Validar si los campos obligatorios están completos
  const camposObligatoriosCompletos = idPlanta && idProveedor && (tipoRegistro === 'planta' || idAsesor)

  const handlePlantaChange = (e) => {
    const valor = e.target.value
    console.log('🏭 Planta seleccionada:', valor)
    setIdPlanta(valor)
  }

  const handleProveedorChange = (e) => {
    const valor = e.target.value
    console.log('🏢 Proveedor seleccionado:', valor)
    console.log('🔍 Buscando proveedor con id:', valor)
    const proveedorEncontrado = proveedores.find(p => p.id === valor)
    console.log('✅ Proveedor encontrado:', proveedorEncontrado)
    setIdProveedor(valor)
  }

  const handleAsesorChange = (e) => {
    const valor = e.target.value
    console.log('👤 Asesor seleccionado:', valor)
    setIdAsesor(valor)
  }

  const agregarProducto = () => {
    setProductosForm([...productosForm, {
      id_grupo: '',
      id_producto: '',
      cantidad: '',
      tipo_cuota: 'Bolsa',
      fecha_inicio: '',
      fecha_fin: '',
      observaciones: '1',
      compensacion: false,
      id_planta_alterna: '',
      cantidad_compensada: ''
    }])
  }

  const actualizarProducto = (index, campo, valor) => {
    const nuevos = [...productosForm]
    nuevos[index][campo] = valor
    
    // Si cambia el grupo, resetear producto
    if (campo === 'id_grupo') {
      nuevos[index].id_producto = ''
    }
    
    // Lógica de fechas según tipo de cuota
    if (campo === 'tipo_cuota') {
      const fechaInicio = nuevos[index].fecha_inicio
      if (valor === 'Diaria' && fechaInicio) {
        nuevos[index].fecha_fin = fechaInicio
      } else if (valor === 'Paquete' && fechaInicio) {
        const fecha = new Date(fechaInicio)
        const primerDia = new Date(fecha.getFullYear(), fecha.getMonth(), 1)
        const ultimoDia = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0)
        nuevos[index].fecha_inicio = primerDia.toISOString().split('T')[0]
        nuevos[index].fecha_fin = ultimoDia.toISOString().split('T')[0]
      }
    }
    
    // Si cambia fecha_inicio y es Diaria, actualizar fecha_fin
    if (campo === 'fecha_inicio' && nuevos[index].tipo_cuota === 'Diaria') {
      nuevos[index].fecha_fin = valor
    }
    
    // Si cambia fecha_inicio y es Paquete, calcular último día del mes
    if (campo === 'fecha_inicio' && nuevos[index].tipo_cuota === 'Paquete') {
      const fecha = new Date(valor)
      const primerDia = new Date(fecha.getFullYear(), fecha.getMonth(), 1)
      const ultimoDia = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0)
      nuevos[index].fecha_inicio = primerDia.toISOString().split('T')[0]
      nuevos[index].fecha_fin = ultimoDia.toISOString().split('T')[0]
    }
    
    setProductosForm(nuevos)
  }

  const eliminarProducto = (index) => {
    if (productosForm.length > 1) {
      setProductosForm(productosForm.filter((_, i) => i !== index))
    }
  }

  const guardar = async () => {
    if (!idPlanta || !idProveedor) {
      return toast.error('Selecciona Planta y Proveedor')
    }
    if (tipoRegistro === 'asesor' && !idAsesor) {
      return toast.error('Selecciona un Asesor')
    }
    
    for (const p of productosForm) {
      if (!p.id_producto || !p.cantidad || !p.fecha_inicio || !p.fecha_fin) {
        return toast.error('Completa todos los campos de los productos')
      }
      if (Number(p.cantidad) < 0) {
        return toast.error('La cantidad no puede ser negativa')
      }
    }

    setGuardando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      for (const p of productosForm) {
        const registro = {
          tipo_registro: tipoRegistro,
          id_planta: idPlanta,
          id_proveedor: idProveedor,
          id_asesor: tipoRegistro === 'asesor' ? idAsesor : null,
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
          estado: 'activa',
          creado_por: user?.id
        }

        console.log('💾 Guardando registro:', registro)

        const { data, error } = await supabase.from('cuotas').insert(registro).select()

        if (error) {
          console.error('❌ Error al guardar:', error)
          throw error
        }

        console.log('✅ Registro guardado:', data)
      }

      toast.success('Cuota registrada exitosamente')
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
      <h2 style={{ color: '#0033A0', marginBottom: '20px', textAlign: 'center' }}>Registrar Nueva Cuota</h2>
      
      {/* Selector de tipo de registro */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', justifyContent: 'center' }}>
        <Boton 
          variante={tipoRegistro === 'planta' ? 'primary' : 'outline'} 
          onClick={() => { setTipoRegistro('planta'); setIdAsesor('') }}
        >
          Por Planta
        </Boton>
        <Boton 
          variante={tipoRegistro === 'asesor' ? 'primary' : 'outline'} 
          onClick={() => setTipoRegistro('asesor')}
        >
          Por Asesor
        </Boton>
      </div>

      {/* Campos obligatorios */}
      <div style={{ display: 'grid', gridTemplateColumns: tipoRegistro === 'asesor' ? '1fr 1fr 1fr' : '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        
        {/* Asesor (solo para tipo asesor, aparece primero) */}
        {tipoRegistro === 'asesor' && (
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
              Asesor *
            </label>
            <select 
              value={idAsesor} 
              onChange={handleAsesorChange}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', backgroundColor: 'white', color: 'black' }}
            >
              <option value="">Seleccionar Asesor</option>
              {asesores.map(a => (
                <option key={a.id_usuario} value={a.id_usuario}>{a.nombre_completo}</option>
              ))}
            </select>
          </div>
        )}

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

      {/* Botón Agregar Producto (solo si campos obligatorios están completos) */}
      {camposObligatoriosCompletos && (
        <>
          <hr style={{ margin: '30px 0', border: 'none', borderTop: '2px solid #e5e7eb' }} />
          
          <h3 style={{ color: '#0033A0', marginBottom: '20px', textAlign: 'center' }}>
            Productos ({productosForm.length})
          </h3>

          {productosForm.map((prod, index) => (
            <div key={index} style={{ background: '#f9fafb', padding: '20px', borderRadius: '8px', marginBottom: '15px', position: 'relative', border: '1px solid #e5e7eb' }}>
              {productosForm.length > 1 && (
                <button 
                  onClick={() => eliminarProducto(index)} 
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
                    value={prod.id_grupo} 
                    onChange={(e) => actualizarProducto(index, 'id_grupo', e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', backgroundColor: 'white', color: 'black' }}
                  >
                    <option value="">Seleccionar</option>
                    {grupos.map(g => (
                      <option key={g.id} value={g.id}>{g.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Producto */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Producto *</label>
                  <select 
                    value={prod.id_producto} 
                    onChange={(e) => actualizarProducto(index, 'id_producto', e.target.value)}
                    disabled={!prod.id_grupo}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', backgroundColor: !prod.id_grupo ? '#f3f4f6' : 'white', color: 'black' }}
                  >
                    <option value="">Seleccionar</option>
                    {productos.filter(p => p.id_grupo_producto === prod.id_grupo).map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Cantidad */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Cantidad *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={prod.cantidad} 
                    onChange={(e) => actualizarProducto(index, 'cantidad', e.target.value)}
                    placeholder="0.00"
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', backgroundColor: 'white', color: 'black' }}
                  />
                </div>

                {/* Tipo de Cuota */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Tipo de Cuota *</label>
                  <select 
                    value={prod.tipo_cuota} 
                    onChange={(e) => actualizarProducto(index, 'tipo_cuota', e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', backgroundColor: 'white', color: 'black' }}
                  >
                    <option value="Bolsa">Bolsa</option>
                    <option value="Diaria">Diaria</option>
                    <option value="Paquete">Paquete</option>
                  </select>
                </div>

                {/* Fecha Inicio */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Fecha Inicio *</label>
                  <input 
                    type="date" 
                    value={prod.fecha_inicio} 
                    onChange={(e) => actualizarProducto(index, 'fecha_inicio', e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', backgroundColor: 'white', color: 'black' }}
                  />
                </div>

                {/* Fecha Fin */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Fecha Fin *</label>
                  <input 
                    type="date" 
                    value={prod.fecha_fin} 
                    onChange={(e) => actualizarProducto(index, 'fecha_fin', e.target.value)}
                    readOnly={prod.tipo_cuota === 'Diaria'}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', backgroundColor: prod.tipo_cuota === 'Diaria' ? '#f3f4f6' : 'white', color: 'black' }}
                  />
                </div>

                {/* Observaciones */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Observaciones *</label>
                  <select 
                    value={prod.observaciones} 
                    onChange={(e) => actualizarProducto(index, 'observaciones', e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', backgroundColor: 'white', color: 'black' }}
                  >
                    <option value="0">0 - Sin stock</option>
                    <option value="1">1 - Libre hasta agotar</option>
                    <option value="2">2 - Cuota asignada por asesor</option>
                    <option value="3">3 - Libre</option>
                  </select>
                </div>
              </div>

              {/* Compensación (solo para tipo planta) */}
              {tipoRegistro === 'planta' && (
                <div style={{ marginTop: '15px', padding: '15px', background: 'white', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={prod.compensacion || false} 
                      onChange={(e) => actualizarProducto(index, 'compensacion', e.target.checked)}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span style={{ fontWeight: 'bold', fontSize: '13px' }}>¿Compensación?</span>
                  </label>
                  {prod.compensacion && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '10px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Planta Alterna</label>
                        <select 
                          value={prod.id_planta_alterna || ''} 
                          onChange={(e) => actualizarProducto(index, 'id_planta_alterna', e.target.value)}
                          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', backgroundColor: 'white', color: 'black' }}
                        >
                          <option value="">Seleccionar</option>
                          {plantas.filter(p => p.id_planta !== idPlanta).map(p => (
                            <option key={p.id_planta} value={p.id_planta}>{p.nombre}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px' }}>Cantidad Compensada</label>
                        <input 
                          type="number" 
                          step="0.01"
                          value={prod.cantidad_compensada || ''} 
                          onChange={(e) => actualizarProducto(index, 'cantidad_compensada', e.target.value)}
                          placeholder="0.00"
                          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', backgroundColor: 'white', color: 'black' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Botones de acción */}
          <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
            <Boton variante="outline" onClick={agregarProducto}>+ Agregar Producto</Boton>
            <Boton 
              variante="primary" 
              onClick={guardar} 
              disabled={guardando}
              style={{ marginLeft: 'auto' }}
            >
              {guardando ? 'Guardando...' : '💾 Guardar Cuota'}
            </Boton>
          </div>
        </>
      )}

      {/* Mensaje si no se han completado los campos obligatorios */}
      {!camposObligatoriosCompletos && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <p style={{ fontSize: '16px', marginBottom: '10px' }}>⚠️ Completa los campos obligatorios para continuar</p>
          <p style={{ fontSize: '14px' }}>
            {tipoRegistro === 'asesor' 
              ? 'Selecciona Asesor, Planta y Proveedor' 
              : 'Selecciona Planta y Proveedor'}
          </p>
        </div>
      )}
    </Card>
  )
}