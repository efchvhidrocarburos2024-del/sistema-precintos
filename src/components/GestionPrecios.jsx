import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
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
  const [vista, setVista] = useState('menu')
  const [archivos, setArchivos] = useState([])
  const [cargando, setCargando] = useState(false)
  
  // --- ESTADOS PARA SUBIDA Y PREVISUALIZACIÓN ---
  const [archivoExcel, setArchivoExcel] = useState(null)
  const [subiendo, setSubiendo] = useState(false)
  
  // Estados para la tabla de previsualización
  const [previewData, setPreviewData] = useState([])
  const [previewHeaders, setPreviewHeaders] = useState([])
  
  // Estados para T.C y FISE
  const [tipoCambio, setTipoCambio] = useState(null)
  const [valorFise, setValorFise] = useState(null)

  // Roles permitidos para subir
  const rolesCarga = ['admin_sistema', 'analista_comercial', 'jefe_pricing']
  const puedeCargar = rolesCarga.includes(rol)

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
    setTipoCambio(null)
    setValorFise(null)

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

        // 1. BUSCAR T.C Y FISE (en las primeras 15 filas)
        let tcEncontrado = null
        let fiseEncontrado = null

        for (let i = 0; i < Math.min(15, data.length); i++) {
          const row = data[i]
          for (let j = 0; j < row.length; j++) {
            const cellValue = String(row[j]).trim().toUpperCase()
            
            // Buscar T.C o T/C
            if (cellValue === 'T.C' || cellValue === 'T/C' || cellValue.includes('TIPO DE CAMBIO')) {
              // El valor suele estar en la celda de la derecha
              if (row[j + 1] && !isNaN(row[j + 1])) tcEncontrado = parseFloat(row[j + 1])
            }
            // Buscar FISE
            if (cellValue === 'FISE') {
              if (row[j + 1] && !isNaN(row[j + 1])) fiseEncontrado = parseFloat(row[j + 1])
            }
          }
        }

        // Calcular FISE si no viene en el excel y tenemos T.C
        if (tcEncontrado) {
          setTipoCambio(tcEncontrado)
          if (!fiseEncontrado) {
            const fiseCalculado = (1 / 42) * tcEncontrado
            setValorFise(fiseCalculado.toFixed(4))
          } else {
            setValorFise(fiseEncontrado.toFixed(4))
          }
        }

        // 2. BUSCAR LA TABLA DE DATOS
        let headerIndex = data.findIndex(row => row.includes('PLANTAS'))
        if (headerIndex === -1) headerIndex = 0

        const headers = data[headerIndex]
        
        // Filtramos los datos desde la cabecera en adelante
        const rows = data.slice(headerIndex + 1).filter(row => row.some(cell => cell !== ''))

        setPreviewHeaders(headers)
        setPreviewData(rows)
        toast.success('Archivo leído correctamente.')
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
    setTipoCambio(null)
    setValorFise(null)
    const fileInput = document.getElementById('file-upload-precios')
    if (fileInput) fileInput.value = ''
  }

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

          {/* TABLA DE PREVISUALIZACIÓN ADAPTABLE */}
          {previewData.length > 0 && (
            <Card style={{ padding: '30px', overflow: 'hidden' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, color: 'var(--text-dark)', fontSize: '22px' }}>Paso 2: Previsualización</h2>
              </div>

              {/* FRANJA DE T.C Y FISE */}
              {(tipoCambio || valorFise) && (
                <div style={{ display: 'flex', gap: '20px', backgroundColor: '#f3f4f6', padding: '12px 20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e5e7eb' }}>
                  {tipoCambio && (
                    <div style={{ fontSize: '14px', color: 'var(--text-dark)' }}>
                      <strong>T.C:</strong> <span style={{ color: 'var(--primary-blue)', fontWeight: 'bold' }}>{tipoCambio}</span>
                    </div>
                  )}
                  {valorFise && (
                    <div style={{ fontSize: '14px', color: 'var(--text-dark)' }}>
                      <strong>FISE:</strong> <span style={{ color: 'var(--primary-blue)', fontWeight: 'bold' }}>{valorFise}</span>
                    </div>
                  )}
                </div>
              )}

              <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'center' }}>
                  <thead style={{ backgroundColor: 'var(--primary-blue)', color: 'white', position: 'sticky', top: 0 }}>
                    <tr>
                      {previewHeaders.map((h, i) => (
                        <th key={i} style={{ padding: '10px 8px', borderBottom: '2px solid #1e40af', wordBreak: 'break-word' }}>
                          {h || '-'}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, rowIndex) => {
                      if (row.includes('029') && row.includes('027')) return null; 
                      
                      return (
                        <tr key={rowIndex} style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: rowIndex % 2 === 0 ? 'white' : '#f9fafb' }}>
                          {row.map((cell, cellIndex) => {
                            const displayValue = cell === 0 || cell === '0' ? '-' : cell;
                            const isPlanta = cellIndex === 1;

                            return (
                              <td key={cellIndex} style={{ 
                                padding: '8px 6px', 
                                fontWeight: isPlanta ? 'bold' : 'normal',
                                color: isPlanta ? 'var(--text-dark)' : 'var(--text-light)',
                                wordBreak: 'break-word'
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