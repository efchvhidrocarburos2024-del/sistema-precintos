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
  const [tipoCambio, setTipoCambio] = useState('')
  const [valorFise, setValorFise] = useState('')

  // Estados para Modal de Eliminación
  const [modalEliminarAbierto, setModalEliminarAbierto] = useState(false)
  const [archivoAEliminar, setArchivoAEliminar] = useState(null)
  const [eliminando, setEliminando] = useState(false)

  // Roles permitidos
  const rolesCarga = ['admin_sistema', 'analista_comercial', 'jefe_pricing']
  const puedeCargar = rolesCarga.includes(rol)
  const puedeGestionar = ['admin_sistema', 'jefe_pricing'].includes(rol) // Roles que pueden borrar o hacer vigente

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

  // --- LÓGICA: MARCAR COMO VIGENTE ---
  const marcarComoVigente = async (id) => {
    try {
      // 1. Quitar el vigente a todos
      await supabase.from('precios_archivos').update({ es_vigente: false }).eq('es_vigente', true)
      // 2. Poner el vigente al seleccionado
      const { error } = await supabase.from('precios_archivos').update({ es_vigente: true }).eq('id', id)
      
      if (error) throw error
      toast.success('Lista marcada como VIGENTE')
      fetchArchivos()
    } catch (error) {
      toast.error('Error al actualizar: ' + error.message)
    }
  }

  // --- LÓGICA: ELIMINAR ARCHIVO ---
  const abrirModalEliminar = (file) => {
    setArchivoAEliminar(file)
    setModalEliminarAbierto(true)
  }

  const confirmarEliminar = async () => {
    if (!archivoAEliminar) return
    setEliminando(true)

    try {
      // 1. Extraer el path del archivo desde la URL pública
      // La URL es algo como: https://.../documentos_sigmo/listas_precios/1712_archivo.xlsx
      const urlParts = archivoAEliminar.url_archivo.split('/documentos_sigmo/')
      const filePath = urlParts[1]

      // 2. Borrar del Storage
      if (filePath) {
        const { error: storageError } = await supabase.storage.from('documentos_sigmo').remove([filePath])
        if (storageError) console.error('Error al borrar de storage:', storageError)
      }

      // 3. Borrar de la Base de Datos
      const { error: dbError } = await supabase.from('precios_archivos').delete().eq('id', archivoAEliminar.id)
      if (dbError) throw dbError

      toast.success('Lista eliminada permanentemente')
      setModalEliminarAbierto(false)
      setArchivoAEliminar(null)
      fetchArchivos()
    } catch (error) {
      console.error(error)
      toast.error('Error al eliminar: ' + error.message)
    } finally {
      setEliminando(false)
    }
  }

  // Calcular FISE dinámicamente
  const handleTCChange = (e) => {
    const val = e.target.value;
    setTipoCambio(val);
    if (!isNaN(parseFloat(val)) && parseFloat(val) > 0) {
      const fiseCalculado = (1 / 42) * parseFloat(val);
      setValorFise(fiseCalculado.toFixed(4));
    } else {
      setValorFise('');
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    setArchivoExcel(file)
    setTipoCambio('')
    setValorFise('')

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        
        // Buscar T.C y FISE
        let tcEncontrado = null
        let fiseEncontrado = null

        wb.SheetNames.forEach(sheetName => {
          const ws = wb.Sheets[sheetName]
          const sheetData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
          
          for (let i = 0; i < Math.min(20, sheetData.length); i++) {
            const row = sheetData[i]
            for (let j = 0; j < row.length; j++) {
              const cellValue = String(row[j]).trim().toUpperCase()
              
              if (cellValue === 'T.C' || cellValue === 'T/C' || cellValue.includes('TIPO DE CAMBIO')) {
                const possibleNum = parseFloat(String(row[j + 1]).replace(',', '.'));
                if (!isNaN(possibleNum)) tcEncontrado = possibleNum;
              }
              if (cellValue === 'FISE') {
                const possibleNum = parseFloat(String(row[j + 1]).replace(',', '.'));
                if (!isNaN(possibleNum)) fiseEncontrado = possibleNum;
              }
            }
          }
        })

        if (tcEncontrado) {
          setTipoCambio(tcEncontrado)
          if (fiseEncontrado) {
            setValorFise(fiseEncontrado.toFixed(4))
          } else {
            const fiseCalculado = (1 / 42) * tcEncontrado
            setValorFise(fiseCalculado.toFixed(4))
          }
        }

        // Buscar Tabla
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

        let headerIndex = data.findIndex(row => row.includes('PLANTAS'))
        if (headerIndex === -1) headerIndex = 0

        const headers = data[headerIndex]
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
    setTipoCambio('')
    setValorFise('')
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

      // Si es la primera lista, se marca como vigente automáticamente
      const esPrimeraLista = archivos.length === 0

      const { error: dbError } = await supabase
        .from('precios_archivos')
        .insert({
          nombre_archivo: archivoExcel.name,
          url_archivo: publicUrl,
          subido_por: user.email,
          es_vigente: esPrimeraLista
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

          {previewData.length > 0 && (
            <Card style={{ padding: '30px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, color: 'var(--text-dark)', fontSize: '22px' }}>Paso 2: Previsualización</h2>
              </div>

              <div style={{ display: 'flex', gap: '20px', backgroundColor: '#f3f4f6', padding: '12px 20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e5e7eb', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-dark)' }}>T.C (Tipo de Cambio):</label>
                  <input 
                    type="number" 
                    step="0.001"
                    value={tipoCambio} 
                    onChange={handleTCChange} 
                    placeholder="Ej. 3.415"
                    style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #d1d5db', width: '100px', fontSize: '14px' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-dark)' }}>FISE (Calculado):</label>
                  <input 
                    type="text" 
                    value={valorFise} 
                    readOnly 
                    placeholder="0.0000"
                    style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #d1d5db', width: '100px', backgroundColor: '#e5e7eb', fontSize: '14px', color: 'var(--primary-blue)', fontWeight: 'bold' }}
                  />
                </div>
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'center' }}>
                  <thead style={{ backgroundColor: 'var(--primary-blue)', color: 'white', position: 'sticky', top: 0 }}>
                    <tr>
                      {previewHeaders.map((h, i) => (
                        <th key={i} style={{ 
                          padding: '10px 8px', 
                          borderBottom: '2px solid #1e40af', 
                          whiteSpace: (i === 0 || i === 1) ? 'nowrap' : 'normal', 
                          wordBreak: 'break-word' 
                        }}>
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
                                whiteSpace: (cellIndex === 0 || cellIndex === 1) ? 'nowrap' : 'normal',
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

  // --- VISTA VISUALIZAR (CON TABLA DE GESTIÓN) ---
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)', display: 'flex', flexDirection: 'column' }}>
      {renderHeader()}
      <main style={{ flex: 1, padding: '40px 20px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
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
                    <th style={{ padding: '15px', textAlign: 'center' }}>ESTADO</th>
                    <th style={{ padding: '15px', textAlign: 'center' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {archivos.map((file) => (
                    <tr key={file.id} style={{ borderBottom: '1px solid #eee', backgroundColor: file.es_vigente ? '#f0fdf4' : 'white' }}>
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
                        {file.es_vigente ? (
                          <span style={{ padding: '4px 10px', backgroundColor: '#DCFCE7', color: '#166534', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                            🟢 VIGENTE
                          </span>
                        ) : (
                          <span style={{ padding: '4px 10px', backgroundColor: '#F3F4F6', color: '#6B7280', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                            HISTÓRICO
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          
                          <a href={file.url_archivo} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                            <Boton variante="outline" tamano="sm" style={{ color: 'var(--primary-blue)' }}>⬇️</Boton>
                          </a>

                          {/* BOTÓN HACER VIGENTE (Solo roles autorizados y si no es vigente ya) */}
                          {puedeGestionar && !file.es_vigente && (
                            <Boton variante="success" tamano="sm" onClick={() => marcarComoVigente(file.id)} title="Marcar como vigente">
                              ✅
                            </Boton>
                          )}

                          {/* BOTÓN ELIMINAR (Solo roles autorizados) */}
                          {puedeGestionar && (
                            <Boton variante="danger" tamano="sm" onClick={() => abrirModalEliminar(file)} title="Eliminar lista">
                              🗑️
                            </Boton>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {modalEliminarAbierto && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '450px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 10px 0', color: 'var(--danger-red)', fontSize: '22px' }}>⚠️ Confirmar Eliminación</h3>
            <p style={{ color: 'var(--text-dark)', marginBottom: '20px', fontSize: '14px', lineHeight: '1.5' }}>
              ¿Estás seguro que deseas eliminar permanentemente la lista <strong>{archivoAEliminar?.nombre_archivo}</strong>?<br/><br/>
              Esta acción borrará el archivo del almacenamiento y no se podrá recuperar.
            </p>
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <Boton variante="outline" onClick={() => setModalEliminarAbierto(false)} style={{ flex: 1 }} disabled={eliminando}>Cancelar</Boton>
              <Boton variante="danger" onClick={confirmarEliminar} style={{ flex: 2 }} disabled={eliminando}>
                {eliminando ? 'Eliminando...' : 'Sí, Eliminar'}
              </Boton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}