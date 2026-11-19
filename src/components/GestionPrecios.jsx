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
  
  // --- ESTADOS PARA FILTROS ---
  const [filtroTexto, setFiltroTexto] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  // --- ESTADOS PARA SUBIDA Y PREVISUALIZACIÓN ---
  const [archivoExcel, setArchivoExcel] = useState(null)
  const [subiendo, setSubiendo] = useState(false)
  const [previewData, setPreviewData] = useState([])
  const [previewHeaders, setPreviewHeaders] = useState([])
  const [tipoCambio, setTipoCambio] = useState('')
  const [valorFise, setValorFise] = useState('')

  // --- ESTADOS PARA COMPARACIÓN ---
  const [idBase, setIdBase] = useState('')
  const [idNuevo, setIdNuevo] = useState('')
  const [hojaComparar, setHojaComparar] = useState('Precio Base') // 'Precio Base', 'Precios Planta Sin IGV', 'Precios Planta Con IGV'
  const [datosComparados, setDatosComparados] = useState(null)
  const [cargandoComparacion, setCargandoComparacion] = useState(false)

  // Estados para Modal de Eliminación
  const [modalEliminarAbierto, setModalEliminarAbierto] = useState(false)
  const [archivoAEliminar, setArchivoAEliminar] = useState(null)
  const [eliminando, setEliminando] = useState(false)

  // Roles permitidos
  const rolesCarga = ['admin_sistema', 'analista_comercial', 'jefe_pricing']
  const puedeCargar = rolesCarga.includes(rol)
  const puedeGestionar = ['admin_sistema', 'jefe_pricing'].includes(rol)

  useEffect(() => {
    if (vista === 'visualizar' || vista === 'comparar') {
      fetchArchivos()
    }
  }, [vista])

  // Autocompletar selectores de comparación
  useEffect(() => {
    if (vista === 'comparar' && archivos.length > 0) {
      // Ordenamos estrictamente por fecha de subida (created_at) para determinar el Actual y el Previo
      const ordenadosPorFecha = [...archivos].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      if (!idNuevo && ordenadosPorFecha.length > 0) {
        setIdNuevo(ordenadosPorFecha[0].id); // El más reciente
      }
      if (!idBase && ordenadosPorFecha.length > 1) {
        setIdBase(ordenadosPorFecha[1].id); // El penúltimo
      }
    }
  }, [vista, archivos]);

  async function fetchArchivos() {
    setCargando(true)
    const { data, error } = await supabase.from('precios_archivos').select('*')

    if (error) {
      toast.error('Error al cargar los archivos')
    } else {
      let lista = data || []
      lista.sort((a, b) => {
        if (a.es_vigente && !b.es_vigente) return -1;
        if (!a.es_vigente && b.es_vigente) return 1;
        return new Date(b.created_at) - new Date(a.created_at);
      });
      setArchivos(lista);
    }
    setCargando(false)
  }

  // --- LÓGICA DE COMPARACIÓN ---
  const parseExcelFile = async (url, targetSheetName) => {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Buscar la hoja seleccionada (búsqueda flexible)
    const searchTerm = targetSheetName.toLowerCase().replace('precios planta ', '').replace('precio ', '');
    let sheetName = wb.SheetNames.find(name => name.toLowerCase().includes(searchTerm));
    if (!sheetName) sheetName = wb.SheetNames[0]; // Si no la encuentra, toma la primera

    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    // Encontrar la fila de cabecera
    let headerIndex = data.findIndex(row => row.some(cell => String(cell).toUpperCase().includes('PLANTAS')));
    if (headerIndex === -1) headerIndex = 0;

    const headers = data[headerIndex];
    
    // Detectar dinámicamente los índices de columnas clave
    let colPlantaIndex = headers.findIndex(h => String(h).toUpperCase().includes('PLANTAS'));
    if (colPlantaIndex === -1) colPlantaIndex = 1;
    
    let colCodigoIndex = headers.findIndex(h => String(h).toUpperCase().includes('CODIGO'));
    if (colCodigoIndex === -1) colCodigoIndex = 0;

    return {
      headers,
      rows: data.slice(headerIndex + 1).filter(row => row.some(cell => cell !== '')),
      colPlantaIndex,
      colCodigoIndex
    };
  };

  const generarComparacion = async () => {
    if (!idBase || !idNuevo) return toast.error('Selecciona ambas listas para comparar');
    if (idBase === idNuevo) return toast.error('Las listas seleccionadas deben ser diferentes');

    setCargandoComparacion(true);
    setDatosComparados(null);

    try {
      const fileBase = archivos.find(a => a.id === idBase);
      const fileNuevo = archivos.find(a => a.id === idNuevo);

      const dataBase = await parseExcelFile(fileBase.url_archivo, hojaComparar);
      const dataNuevo = await parseExcelFile(fileNuevo.url_archivo, hojaComparar);

      // Crear mapa de la data base usando el nombre de la planta
      const baseMap = {};
      dataBase.rows.forEach(row => {
        const planta = String(row[dataBase.colPlantaIndex]).trim().toUpperCase();
        if (planta && planta !== 'UNDEFINED' && planta !== '') baseMap[planta] = row;
      });

      // Cruzar la data nueva con la base
      const comparacion = dataNuevo.rows.map(nuevaRow => {
        const planta = String(nuevaRow[dataNuevo.colPlantaIndex]).trim().toUpperCase();
        const baseRow = baseMap[planta] || []; 
        
        return {
          planta,
          baseRow,
          nuevaRow
        };
      }).filter(item => item.planta && item.planta !== 'UNDEFINED');

      setDatosComparados({
        headers: dataNuevo.headers,
        rows: comparacion,
        colPlantaIndex: dataNuevo.colPlantaIndex,
        colCodigoIndex: dataNuevo.colCodigoIndex
      });

    } catch (error) {
      console.error(error);
      toast.error('Error al comparar los archivos: ' + error.message);
    } finally {
      setCargandoComparacion(false);
    }
  };

  // --- LÓGICA DE FILTRADO ---
  const archivosFiltrados = archivos.filter(file => {
    const coincideTexto = 
      file.nombre_archivo.toLowerCase().includes(filtroTexto.toLowerCase()) || 
      (file.subido_por && file.subido_por.toLowerCase().includes(filtroTexto.toLowerCase()));

    let coincideDesde = true;
    if (fechaDesde) {
      coincideDesde = new Date(file.created_at).setHours(0,0,0,0) >= new Date(fechaDesde).setHours(0,0,0,0);
    }
    let coincideHasta = true;
    if (fechaHasta) {
      coincideHasta = new Date(file.created_at).setHours(23,59,59,999) <= new Date(fechaHasta).setHours(23,59,59,999);
    }

    return coincideTexto && coincideDesde && coincideHasta;
  });

  const marcarComoVigente = async (id) => {
    try {
      await supabase.from('precios_archivos').update({ es_vigente: false }).eq('es_vigente', true)
      const { error } = await supabase.from('precios_archivos').update({ es_vigente: true }).eq('id', id)
      if (error) throw error
      toast.success('Lista marcada como VIGENTE')
      fetchArchivos()
    } catch (error) {
      toast.error('Error al actualizar: ' + error.message)
    }
  }

  const abrirModalEliminar = (file) => {
    setArchivoAEliminar(file)
    setModalEliminarAbierto(true)
  }

  const confirmarEliminar = async () => {
    if (!archivoAEliminar) return
    setEliminando(true)
    try {
      const urlParts = archivoAEliminar.url_archivo.split('/documentos_sigmo/')
      const filePath = urlParts[1]
      if (filePath) {
        await supabase.storage.from('documentos_sigmo').remove([filePath])
      }
      const { error: dbError } = await supabase.from('precios_archivos').delete().eq('id', archivoAEliminar.id)
      if (dbError) throw dbError
      toast.success('Lista eliminada permanentemente')
      setModalEliminarAbierto(false)
      setArchivoAEliminar(null)
      fetchArchivos()
    } catch (error) {
      toast.error('Error al eliminar: ' + error.message)
    } finally {
      setEliminando(false)
    }
  }

  const handleTCChange = (e) => {
    const val = e.target.value;
    setTipoCambio(val);
    if (!isNaN(parseFloat(val)) && parseFloat(val) > 0) {
      setValorFise(((1 / 42) * parseFloat(val)).toFixed(4));
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
        let tcEncontrado = null, fiseEncontrado = null

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
          if (fiseEncontrado) setValorFise(fiseEncontrado.toFixed(4))
          else setValorFise(((1 / 42) * tcEncontrado).toFixed(4))
        }

        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
        let headerIndex = data.findIndex(row => row.includes('PLANTAS'))
        if (headerIndex === -1) headerIndex = 0

        setPreviewHeaders(data[headerIndex])
        setPreviewData(data.slice(headerIndex + 1).filter(row => row.some(cell => cell !== '')))
      } catch (error) {
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
      
      const { error: uploadError } = await supabase.storage.from('documentos_sigmo').upload(fileName, archivoExcel)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('documentos_sigmo').getPublicUrl(fileName)
      const { data: { user } } = await supabase.auth.getUser()

      await supabase.from('precios_archivos').update({ es_vigente: false }).eq('es_vigente', true)

      const { error: dbError } = await supabase.from('precios_archivos').insert({
        nombre_archivo: archivoExcel.name,
        url_archivo: publicUrl,
        subido_por: user.email,
        es_vigente: true
      })

      if (dbError) throw dbError

      toast.success('Lista de precios subida y marcada como VIGENTE')
      limpiarPrevisualizacion()
      setVista('menu')
    } catch (error) {
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
          {vista === 'comparar' ? 'Comparativa de Listas de Precios' : 'Módulo de Lista de Precios'}
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
              <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Ver, buscar y descargar archivos Excel.</p>
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
              <input type="file" id="file-upload-precios" accept=".xlsx, .xls" onChange={handleFileChange} style={{ fontSize: '14px' }} />
              {archivoExcel && <span style={{ color: 'var(--primary-blue)', fontWeight: 'bold' }}>✅ {archivoExcel.name}</span>}
            </div>
          </Card>

          {previewData.length > 0 && (
            <Card style={{ padding: '30px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, color: 'var(--text-dark)', fontSize: '22px' }}>Paso 2: Previsualización</h2>
              </div>
              <div style={{ display: 'flex', gap: '20px', backgroundColor: '#f3f4f6', padding: '12px 20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e5e7eb', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-dark)' }}>T.C:</label>
                  <input type="number" step="0.001" value={tipoCambio} onChange={handleTCChange} placeholder="Ej. 3.415" style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #d1d5db', width: '100px', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-dark)' }}>FISE:</label>
                  <input type="text" value={valorFise} readOnly placeholder="0.0000" style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #d1d5db', width: '100px', backgroundColor: '#e5e7eb', fontSize: '14px', color: 'var(--primary-blue)', fontWeight: 'bold' }} />
                </div>
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'center' }}>
                  <thead style={{ backgroundColor: 'var(--primary-blue)', color: 'white', position: 'sticky', top: 0 }}>
                    <tr>
                      {previewHeaders.map((h, i) => (
                        <th key={i} style={{ padding: '10px 8px', borderBottom: '2px solid #1e40af', whiteSpace: (i === 0 || i === 1) ? 'nowrap' : 'normal', wordBreak: 'break-word' }}>{h || '-'}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, rowIndex) => {
                      if (row.includes('029') && row.includes('027')) return null; 
                      return (
                        <tr key={rowIndex} style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: rowIndex % 2 === 0 ? 'white' : '#f9fafb' }}>
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} style={{ padding: '8px 6px', fontWeight: cellIndex === 1 ? 'bold' : 'normal', color: cellIndex === 1 ? 'var(--text-dark)' : 'var(--text-light)', whiteSpace: (cellIndex === 0 || cellIndex === 1) ? 'nowrap' : 'normal', wordBreak: 'break-word' }}>
                              {cell === 0 || cell === '0' ? '-' : cell}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '25px' }}>
                <button onClick={limpiarPrevisualizacion} style={{ padding: '10px 25px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>LIMPIAR</button>
                <button onClick={handleSubirArchivo} disabled={subiendo} style={{ padding: '10px 25px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: subiendo ? 'not-allowed' : 'pointer', fontSize: '14px' }}>{subiendo ? 'SUBIENDO...' : 'CONFIRMAR Y SUBIR'}</button>
              </div>
            </Card>
          )}
        </main>
      </div>
    )
  }

  // --- VISTA 4: COMPARATIVA DE PRECIOS ---
  if (vista === 'comparar') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)', display: 'flex', flexDirection: 'column' }}>
        {renderHeader()}
        <main style={{ flex: 1, padding: '40px 20px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          
          <Card style={{ padding: '30px', marginBottom: '20px' }}>
            <h2 style={{ margin: '0 0 20px 0', color: 'var(--text-dark)', fontSize: '22px' }}>Configuración de la Comparación</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '15px', alignItems: 'end' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>Lista de Precios Previa</label>
                <select value={idBase} onChange={(e) => setIdBase(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}>
                  <option value="">Selecciona una lista...</option>
                  {archivos.map(a => <option key={a.id} value={a.id}>{a.nombre_archivo}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>Lista de Precios Actual</label>
                <select value={idNuevo} onChange={(e) => setIdNuevo(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}>
                  <option value="">Selecciona una lista...</option>
                  {archivos.map(a => <option key={a.id} value={a.id}>{a.nombre_archivo}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>Tipo de Precio (Hoja)</label>
                <select value={hojaComparar} onChange={(e) => setHojaComparar(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', backgroundColor: '#eff6ff' }}>
                  <option value="Precio Base">Precio Base</option>
                  <option value="Precios Planta Sin IGV">Precios Planta Sin IGV</option>
                  <option value="Precios Planta Con IGV">Precios Planta Con IGV</option>
                </select>
              </div>

              <Boton variante="primary" onClick={generarComparacion} disabled={cargandoComparacion} style={{ height: '42px' }}>
                {cargandoComparacion ? 'Comparando...' : '⚖️ Comparar Ahora'}
              </Boton>
            </div>
          </Card>

          {datosComparados && (
            <Card style={{ padding: '30px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, color: 'var(--text-dark)', fontSize: '22px' }}>Resultados de la Comparación</h2>
                <div style={{ display: 'flex', gap: '15px', fontSize: '12px' }}>
                  <span style={{ color: '#ef4444', fontWeight: 'bold' }}>🔴 Aumentó</span>
                  <span style={{ color: '#10b981', fontWeight: 'bold' }}>🟢 Bajó</span>
                  <span style={{ color: '#6b7280', fontWeight: 'bold' }}>⚪ Sin cambios</span>
                </div>
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'center' }}>
                  <thead style={{ backgroundColor: '#1e293b', color: 'white', position: 'sticky', top: 0 }}>
                    <tr>
                      {datosComparados.headers.map((h, i) => (
                        <th key={i} style={{ padding: '12px 8px', borderBottom: '2px solid #0f172a', whiteSpace: (i === 0 || i === 1) ? 'nowrap' : 'normal', wordBreak: 'break-word' }}>
                          {h || '-'}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {datosComparados.rows.map((fila, rowIndex) => {
                      if (fila.nuevaRow.includes('029') && fila.nuevaRow.includes('027')) return null;
                      
                      return (
                        <tr key={rowIndex} style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: rowIndex % 2 === 0 ? 'white' : '#f9fafb' }}>
                          {fila.nuevaRow.map((cellNueva, cellIndex) => {
                            const isPlanta = cellIndex === datosComparados.colPlantaIndex;
                            const isCodigo = cellIndex === datosComparados.colCodigoIndex;
                            
                            const valBaseStr = fila.baseRow[cellIndex];
                            const valNuevaStr = cellNueva;

                            let displayValue = valNuevaStr === 0 || valNuevaStr === '0' ? '-' : valNuevaStr;
                            let color = isPlanta ? 'var(--text-dark)' : 'var(--text-light)';

                            if (!isPlanta && !isCodigo) { 
                              const valBase = parseFloat(String(valBaseStr).replace(',', '.'));
                              const valNueva = parseFloat(String(valNuevaStr).replace(',', '.'));

                              if (!isNaN(valBase) && !isNaN(valNueva)) {
                                const diff = valNueva - valBase;
                                
                                if (Math.abs(diff) > 0.0001) { // Usar margen de error para decimales
                                  if (diff > 0) {
                                    color = '#ef4444'; // Rojo
                                    displayValue = `${valNueva.toFixed(3)} (+${diff.toFixed(3)})`;
                                  } else {
                                    color = '#10b981'; // Verde
                                    displayValue = `${valNueva.toFixed(3)} (${diff.toFixed(3)})`;
                                  }
                                } else if (valNueva !== 0) {
                                  color = '#4b5563'; // Gris oscuro (Sin cambios)
                                  displayValue = `${valNueva.toFixed(3)}`;
                                }
                              }
                            }

                            return (
                              <td key={cellIndex} style={{ 
                                padding: '8px 6px', 
                                fontWeight: isPlanta ? 'bold' : 'normal',
                                color: color,
                                whiteSpace: (isPlanta || isCodigo) ? 'nowrap' : 'normal',
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
          <div style={{ display: 'flex', gap: '10px' }}>
            <Boton variante="outline" onClick={() => setVista('comparar')} style={{ color: 'var(--primary-blue)', fontWeight: 'bold' }}>⚖️ Comparar Listas</Boton>
            <Boton variante="outline" onClick={fetchArchivos}>🔄 Refrescar</Boton>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '15px', marginBottom: '20px' }}>
          <input type="text" placeholder="🔍 Buscar por nombre de archivo o correo..." value={filtroTexto} onChange={(e) => setFiltroTexto(e.target.value)} style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }} />
          <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} title="Fecha Desde" style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', color: 'var(--text-light)' }} />
          <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} title="Fecha Hasta" style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', color: 'var(--text-light)' }} />
        </div>

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {cargando ? (
            <p style={{ padding: '30px', textAlign: 'center' }}>Cargando archivos...</p>
          ) : archivosFiltrados.length === 0 ? (
            <p style={{ padding: '30px', textAlign: 'center', color: 'var(--text-light)' }}>
              {archivos.length === 0 ? 'No hay listas de precios cargadas aún.' : 'No se encontraron resultados para tu búsqueda.'}
            </p>
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
                  {archivosFiltrados.map((file) => (
                    <tr key={file.id} style={{ borderBottom: '1px solid #eee', backgroundColor: file.es_vigente ? '#f0fdf4' : 'white' }}>
                      <td style={{ padding: '15px', color: 'var(--text-light)' }}>
                        {new Date(file.created_at).toLocaleDateString()} {new Date(file.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '15px', fontWeight: 'bold', color: 'var(--text-dark)' }}>📄 {file.nombre_archivo}</td>
                      <td style={{ padding: '15px', fontSize: '12px', color: 'var(--text-light)' }}>{file.subido_por || 'SISTEMA'}</td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        {file.es_vigente ? (
                          <span style={{ padding: '4px 10px', backgroundColor: '#DCFCE7', color: '#166534', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>🟢 VIGENTE</span>
                        ) : (
                          <span style={{ padding: '4px 10px', backgroundColor: '#F3F4F6', color: '#6B7280', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>HISTÓRICO</span>
                        )}
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <a href={file.url_archivo} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                            <Boton variante="outline" tamano="sm" style={{ color: 'var(--primary-blue)' }}>⬇️</Boton>
                          </a>
                          {puedeGestionar && !file.es_vigente && (
                            <Boton variante="success" tamano="sm" onClick={() => marcarComoVigente(file.id)} title="Marcar como vigente">✅</Boton>
                          )}
                          {puedeGestionar && (
                            <Boton variante="danger" tamano="sm" onClick={() => abrirModalEliminar(file)} title="Eliminar lista">🗑️</Boton>
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
              <Boton variante="danger" onClick={confirmarEliminar} style={{ flex: 2 }} disabled={eliminando}>{eliminando ? 'Eliminando...' : 'Sí, Eliminar'}</Boton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}