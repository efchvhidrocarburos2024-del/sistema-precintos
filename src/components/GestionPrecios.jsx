import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'
import { Card, Boton } from './ui'

const cardStyle = {
  backgroundColor: 'white', borderRadius: '12px', padding: '30px 20px', textAlign: 'center',
  boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '2px solid transparent', cursor: 'pointer',
  transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
}
const btnHeaderStyle = { background: '#f3f4f6', border: '1px solid #d1d5db', color: '#374151', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }

export default function GestionPrecios({ setPantalla, rol }) {
  const [vista, setVista] = useState('menu') // 'menu', 'cargar', 'visualizar'
  const [archivos, setArchivos] = useState([])
  const [cargando, setCargando] = useState(false)
  
  // Estados de carga
  const [archivoExcel, setArchivoExcel] = useState(null)
  const [subiendo, setSubiendo] = useState(false)

  // Roles permitidos para subir
  const rolesCarga = ['admin_sistema', 'analista_comercial', 'jefe_pricing']
  const puedeCargar = rolesCarga.includes(rol)

  // Cargar archivos cuando entra a visualizar
  useEffect(() => {
    if (vista === 'visualizar') {
      fetchArchivos()
    }
  }, [vista])

  async function fetchArchivos() {
    setCargando(true)
    const { data, error } = await supabase
      .from('precios_archivos')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Error al cargar los archivos')
      console.error(error)
    } else {
      setArchivos(data || [])
    }
    setCargando(false)
  }

  async function handleSubirArchivo(e) {
    e.preventDefault()
    if (!archivoExcel) return toast.error('Por favor, selecciona un archivo Excel')
    
    setSubiendo(true)
    try {
      // 1. Subir archivo a Supabase Storage (Bucket 'documentos_sigmo')
      const nombreLimpio = archivoExcel.name.replace(/\s+/g, '_')
      const fileName = `listas_precios/${Date.now()}_${nombreLimpio}` // Se guarda en la carpeta listas_precios
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documentos_sigmo')
        .upload(fileName, archivoExcel)

      if (uploadError) throw uploadError

      // 2. Obtener la URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('documentos_sigmo')
        .getPublicUrl(fileName)

      // 3. Guardar registro en la base de datos
      const { data: { user } } = await supabase.auth.getUser()

      const { error: dbError } = await supabase
        .from('precios_archivos')
        .insert({
          nombre_archivo: archivoExcel.name,
          url_archivo: publicUrl,
          subido_por: user.email // Guardamos el correo para saber quién lo subió
        })

      if (dbError) throw dbError

      toast.success('Lista de precios cargada exitosamente')
      setArchivoExcel(null)
      setVista('menu')
    } catch (error) {
      console.error(error)
      toast.error('Error al subir: ' + error.message)
    } finally {
      setSubiendo(false)
    }
  }

  const renderHeader = () => (
    <header style={{ padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        {vista === 'menu' ? (
          <button onClick={() => setPantalla('')} style={btnHeaderStyle}>← SIGMO</button>
        ) : (
          <button onClick={() => setVista('menu')} style={btnHeaderStyle}>← Volver al Menú</button>
        )}
        <h1 style={{ margin: 0, color: 'var(--primary-blue)', fontSize: '28px', fontWeight: '900' }}>
          Módulo de Lista de Precios
        </h1>
      </div>
    </header>
  )

  // --- VISTA 1: MENÚ DEL MÓDULO ---
  if (vista === 'menu') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)', display: 'flex', flexDirection: 'column' }}>
        {renderHeader()}
        <main style={{ flex: 1, padding: '40px 20px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ color: 'var(--text-dark)', fontSize: '24px', marginBottom: '10px' }}>Repositorio de Listas</h2>
            <p style={{ color: 'var(--text-light)' }}>Selecciona una acción</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <div onClick={() => setVista('visualizar')} style={cardStyle} onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary-blue)'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}>
              <div style={{ fontSize: '50px', marginBottom: '15px' }}>👁️</div>
              <h3 style={{ color: 'var(--primary-blue)', marginBottom: '10px', fontSize: '18px' }}>Visualizar Lista</h3>
              <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Ver y descargar archivos Excel.</p>
            </div>

            {puedeCargar && (
              <div onClick={() => setVista('cargar')} style={cardStyle} onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary-blue)'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}>
                <div style={{ fontSize: '50px', marginBottom: '15px' }}>📤</div>
                <h3 style={{ color: 'var(--primary-blue)', marginBottom: '10px', fontSize: '18px' }}>Cargar Nueva Lista</h3>
                <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Sube archivos Excel al sistema.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    )
  }

  // --- VISTA 2: CARGAR ARCHIVO ---
  if (vista === 'cargar') {
    if (!puedeCargar) {
      return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
          {renderHeader()}
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <h2 style={{ color: 'var(--danger-red)' }}>No tienes permisos para cargar archivos.</h2>
          </div>
        </div>
      )
    }

    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)', display: 'flex', flexDirection: 'column' }}>
        {renderHeader()}
        <main style={{ flex: 1, padding: '40px 20px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
          <Card style={{ padding: '40px' }}>
            <h2 style={{ margin: '0 0 10px 0', color: 'var(--text-dark)', fontSize: '22px' }}>Cargar Nueva Lista</h2>
            <p style={{ color: 'var(--text-light)', marginBottom: '30px', fontSize: '14px' }}>Sube un archivo en formato Excel (.xlsx, .xls) para actualizar el repositorio.</p>
            
            <form onSubmit={handleSubirArchivo} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ border: '2px dashed #d1d5db', borderRadius: '8px', padding: '30px', textAlign: 'center', backgroundColor: '#f9fafb' }}>
                <input 
                  type="file" 
                  accept=".xlsx, .xls, .csv" 
                  onChange={(e) => setArchivoExcel(e.target.files[0])}
                  style={{ display: 'block', margin: '0 auto', fontSize: '14px' }}
                />
                {archivoExcel && <p style={{ marginTop: '15px', color: 'var(--primary-blue)', fontWeight: 'bold' }}>Archivo seleccionado: {archivoExcel.name}</p>}
              </div>
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <Boton variante="outline" onClick={() => setVista('menu')} style={{ flex: 1 }} disabled={subiendo}>Cancelar</Boton>
                <Boton tipo="submit" variante="primary" style={{ flex: 2 }} disabled={subiendo || !archivoExcel}>
                  {subiendo ? 'Subiendo archivo...' : 'Subir Archivo Excel'}
                </Boton>
              </div>
            </form>
          </Card>
        </main>
      </div>
    )
  }

  // --- VISTA 3: VISUALIZAR ARCHIVOS ---
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)', display: 'flex', flexDirection: 'column' }}>
      {renderHeader()}
      <main style={{ flex: 1, padding: '40px 20px', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: 'var(--text-dark)', fontSize: '22px', margin: 0 }}>Listas de Precios Disponibles</h2>
          <Boton variante="outline" onClick={fetchArchivos}>🔄 Refrescar</Boton>
        </div>

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {cargando ? (
            <p style={{ padding: '30px', textAlign: 'center' }}>Cargando archivos...</p>
          ) : archivos.length === 0 ? (
            <p style={{ padding: '30px', textAlign: 'center', color: 'var(--text-light)' }}>No hay listas de precios cargadas aún.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead style={{ backgroundColor: 'var(--primary-blue)', color: 'white' }}>
                  <tr style={{ textAlign: 'left' }}>
                    <th style={{ padding: '15px' }}>FECHA</th>
                    <th style={{ padding: '15px' }}>NOMBRE DEL ARCHIVO</th>
                    <th style={{ padding: '15px' }}>SUBIDO POR</th>
                    <th style={{ padding: '15px', textAlign: 'center' }}>ACCIÓN</th>
                  </tr>
                </thead>
                <tbody>
                  {archivos.map((file) => (
                    <tr key={file.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '15px', color: 'var(--text-light)' }}>
                        {new Date(file.created_at).toLocaleDateString()} {new Date(file.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '15px', fontWeight: 'bold', color: 'var(--text-dark)' }}>
                        📄 {file.nombre_archivo}
                      </td>
                      <td style={{ padding: '15px', fontSize: '12px', color: 'var(--text-light)' }}>
                        {file.subido_por || 'SISTEMA'}
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        <a href={file.url_archivo} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                          <Boton variante="success" tamano="sm">⬇️ Descargar</Boton>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>
    </div>
  )
}