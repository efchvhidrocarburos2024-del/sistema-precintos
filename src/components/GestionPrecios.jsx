import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx' // <-- NUEVA LIBRERÍA PARA LEER EXCEL
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
  
  // --- ESTADOS PARA SUBIDA Y PREVISUALIZACIÓN ---
  const [archivoExcel, setArchivoExcel] = useState(null)
  const [subiendo, setSubiendo] = useState(false)
  
  // Estados para la tabla de previsualización
  const [previewData, setPreviewData] = useState([])
  const [previewHeaders, setPreviewHeaders] = useState([])
  const [previewCodes, setPreviewCodes] = useState([]) // Para la fila de códigos (029, 027...)

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

  // --- LÓGICA DE PREVISUALIZACIÓN DE EXCEL ---
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    setArchivoExcel(file)

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        
        // Tomamos la primera hoja (Precio Base)
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        
        // Convertimos a matriz (array de arrays)
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

        // Buscamos la fila que contiene "PLANTAS" para usarla como cabecera
        let headerIndex = data.findIndex(row => row.includes('PLANTAS'))
        if (headerIndex === -1) headerIndex = 0 // Si no lo encuentra, asume la primera fila

        const headers = data[headerIndex]
        const codes = data[headerIndex + 1] || [] // La siguiente fila suele tener los códigos
        
        // Extraemos los datos, omitiendo filas vacías
        const rows = data.slice(headerIndex + 1).filter(row => row.some(cell => cell !== ''))

        setPreviewHeaders(headers)
        setPreviewCodes(codes)
        setPreviewData(rows)
        toast.success('Archivo leído. Revisa la previsualización.')
      } catch (error) {
        console.error(error)
        toast.error('Error al leer el archivo Excel')
        limpiarPrevisualizacion()
      }
    }
    reader.readAsBinaryString(file)
  }

  const limpiarPrevisualizacion = () => {
    setArchivoExcel(null)
    setPreviewData([])
    setPreviewHeaders([])
    setPreviewCodes([])
    // Limpiamos el input file visualmente
    const fileInput = document.getElementById('file-upload-precios')
    if (fileInput) fileInput.value = ''
  }

  // --- LÓGICA DE SUBIDA REAL A SUPABASE ---
  async function handleSubirArchivo() {
    if (!archivoExcel) return toast.error('No hay archivo seleccionado')
    
    setSubiendo(true)
    try {
      const nombreLimpio = archivoExcel.name.replace(/\s+/g, '_')
      const fileName = `listas_precios/${Date.now()}_${nombreLimpio}`
      
      const { error: uploadError } = await supabase.storage
        .from('documentos_sigmo')
        .upload(fileName, archivoExcel)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('documentos_sigmo')
        .getPublicUrl(fileName)

      const { data: { user } } = await supabase.auth.getUser()

      const { error: dbError } = await supabase
        .from('precios_archivos')
        .insert({
          nombre_archivo: archivoExcel.name,
          url_archivo: publicUrl,
          subido_por: user.email
        })

      if (dbError) throw dbError

      toast.success('Lista de precios subida exitosamente')
      limpiarPrevisualizacion()
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
                <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Sube y previsualiza archivos Excel.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    )
  }

  // --- VISTA 2: CARGAR ARCHIVO CON PREVISUALIZACIÓN ---
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
        <main style={{ flex: 1, padding: '40px 20px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          
          <Card style={{ padding: '30px', marginBottom: '20px' }}>
            <h2 style={{ margin: '0 0 15px 0', color: 'var(--text-dark)', fontSize: '22px' }}>Paso 1: Seleccionar Archivo</h2>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px', border: '2px dashed #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
              <input 
                type="file" 
                id="file-upload-precios"
                accept=".xlsx, .xls" 
                onChange={handleFileChange}
                style={{ fontSize: '14px' }}
              />
              {archivoExcel && (
                <span style={{ color: 'var(--primary-blue)', fontWeight: 'bold' }}>
                  ✅ {archivoExcel.name}
                </span>
              )}
            </div>
          </Card>

          {/* TABLA DE PREVISUALIZACIÓN */}
          {previewData.length > 0 && (
            <Card style={{ padding: '30px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, color: 'var(--text-dark)', fontSize: '22px' }}>Paso 2: Previsualización (Precio Base)</h2>
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', maxHeight: '500px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left', minWidth: '1000px' }}>
                  <thead style={{ backgroundColor: 'var(--primary-blue)', color: 'white', position: 'sticky', top: 0 }}>
                    <tr>
                      {previewHeaders.map((h, i) => (
                        <th key={i} style={{ padding: '12px', borderBottom: '2px solid #1e40af', whiteSpace: 'nowrap' }}>
                          {h || '-'}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, rowIndex) => {
                      // Omitimos la fila de códigos si se coló en los datos
                      if (row.includes('029') && row.includes('027')) return null; 
                      
                      return (
                        <tr key={rowIndex} style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: rowIndex % 2 === 0 ? 'white' : '#f9fafb' }}>
                          {row.map((cell, cellIndex) => {
                            // Formatear celdas: si es 0, mostrar un guion
                            const displayValue = cell === 0 || cell === '0' ? '-' : cell;
                            
                            // Resaltar la columna de PLANTAS (índice 1)
                            const isPlanta = cellIndex === 1;

                            return (
                              <td key={cellIndex} style={{ 
                                padding: '10px 12px', 
                                fontWeight: isPlanta ? 'bold' : 'normal',
                                color: isPlanta ? 'var(--text-dark)' : 'var(--text-light)',
                                whiteSpace: 'nowrap'
                              }}>
                                {displayValue}
                              </td>
                            );
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* BOTONES DE ACCIÓN (LIMPIAR / CALCULAR/SUBIR) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '25px' }}>
                <button 
                  onClick={limpiarPrevisualizacion}
                  style={{ padding: '10px 25px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}
                >
                  LIMPIAR
                </button>
                <button 
                  onClick={handleSubirArchivo}
                  disabled={subiendo}
                  style={{ padding: '10px 25px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: subiendo ? 'not-allowed' : 'pointer', fontSize: '14px' }}
                >
                  {subiendo ? 'SUBIENDO...' : 'CONFIRMAR Y SUBIR'}
                </button>
              </div>
            </Card>
          )}

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