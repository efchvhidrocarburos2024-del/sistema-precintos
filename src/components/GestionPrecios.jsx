import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'
import { Card, Boton } from './ui'

const cardStyle = {
  backgroundColor: 'white', borderRadius: '12px', padding: '30px 20px', textAlign: 'center',
  boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '2px solid transparent', cursor: 'pointer',
  transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
}
const btnHeaderStyle = { background: '#f3f4f6', border: '1px solid #d1d5db', color: '#374151', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }
const btnTabStyle = (activo) => ({
  padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px',
  backgroundColor: activo ? 'var(--primary-blue)' : '#f3f4f6',
  color: activo ? 'white' : '#4b5563',
  transition: 'all 0.2s'
})

const COLORS = ['#0B5FA5', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f43f5e', '#84cc16', '#f97316', '#6366f1']

export default function GestionPrecios({ setPantalla, rol }) {
  const [vista, setVista] = useState('menu')
  const [subVista, setSubVista] = useState('precios')
  
  const [archivos, setArchivos] = useState([])
  const [archivoExcel, setArchivoExcel] = useState(null)
  const [subiendo, setSubiendo] = useState(false)
  const [previewData, setPreviewData] = useState([])
  const [previewHeaders, setPreviewHeaders] = useState([])

  const [archivosTopes, setArchivosTopes] = useState([])
  const [archivoExcelTope, setArchivoExcelTope] = useState(null)
  const [subiendoTope, setSubiendoTope] = useState(false)
  const [previewDataTope, setPreviewDataTope] = useState([])
  const [previewHeadersTope, setPreviewHeadersTope] = useState([])

  const [tipoComparacion, setTipoComparacion] = useState('precios')
  const [idBase, setIdBase] = useState('')
  const [idNuevo, setIdNuevo] = useState('')
  const [hojaComparar, setHojaComparar] = useState('Precio Base')
  const [datosComparados, setDatosComparados] = useState(null)
  
  const [idBaseTope, setIdBaseTope] = useState('')
  const [idNuevoTope, setIdNuevoTope] = useState('')
  const [datosComparadosTope, setDatosComparadosTope] = useState(null)

  const [auditoria, setAuditoria] = useState([])

  const [modalEliminarAbierto, setModalEliminarAbierto] = useState(false)
  const [archivoAEliminar, setArchivoAEliminar] = useState(null)
  const [eliminando, setEliminando] = useState(false)

  const rolesCarga = ['admin_sistema', 'analista_comercial', 'jefe_pricing']
  const puedeCargar = rolesCarga.includes(rol)
  const puedeGestionar = ['admin_sistema', 'jefe_pricing'].includes(rol)

  const extraerFecha = (nombre) => {
    if (!nombre) return '1900-01-01';
    const regex = /(\d{4}[-_]\d{2}[-_]\d{2})|(\d{2}[-_]\d{2}[-_]\d{4})/;
    const match = nombre.match(regex);
    if (!match) return '1900-01-01';
    let fechaStr = match[0].replace(/_/g, '-');
    if (fechaStr.indexOf('-') === 2) {
      const [d, m, a] = fechaStr.split('-');
      fechaStr = `${a}-${m}-${d}`;
    }
    return fechaStr;
  };

  const normalizarTexto = (txt) => {
    if (!txt) return '';
    return String(txt).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ').replace(/N°/gi, 'N').trim().toUpperCase();
  };

  useEffect(() => {
    if (vista === 'visualizar' && subVista === 'precios') fetchArchivos()
    if (vista === 'visualizar' && subVista === 'topes') fetchArchivosTopes()
    if (vista === 'comparar') { fetchArchivos(); fetchArchivosTopes(); }
    if (vista === 'auditoria') fetchAuditoria()
  }, [vista, subVista])

  // AUTO-SELECCIÓN DE ARCHIVOS PARA COMPARAR
  useEffect(() => {
    if (vista === 'comparar' && archivos.length > 0) {
      const ordenados = [...archivos].sort((a, b) => extraerFecha(b.nombre_archivo).localeCompare(extraerFecha(a.nombre_archivo)));
      if (ordenados.length >= 1) setIdNuevo(ordenados[0].id);
      if (ordenados.length >= 2) setIdBase(ordenados[1].id);
    }
    if (vista === 'comparar' && archivosTopes.length > 0) {
      const ordenadosT = [...archivosTopes].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      if (ordenadosT.length >= 1) setIdNuevoTope(ordenadosT[0].id);
      if (ordenadosT.length >= 2) setIdBaseTope(ordenadosT[1].id);
    }
  }, [vista, archivos, archivosTopes]);

  async function fetchArchivos() {
    const { data } = await supabase.from('precios_archivos').select('*')
    if (data) {
      let lista = data.sort((a, b) => extraerFecha(b.nombre_archivo).localeCompare(extraerFecha(a.nombre_archivo)));
      setArchivos(lista);
    }
  }

  async function fetchArchivosTopes() {
    const { data } = await supabase.from('topes_archivos').select('*').order('created_at', { ascending: false })
    if (data) setArchivosTopes(data || [])
  }

  async function fetchAuditoria() {
    const { data: pAud } = await supabase.from('precios_auditoria').select('*').order('created_at', { ascending: false })
    const { data: tAud } = await supabase.from('topes_auditoria').select('*').order('created_at', { ascending: false })
    let combinada = [...(pAud || []).map(x => ({...x, origen: 'PRECIOS'})), ...(tAud || []).map(x => ({...x, origen: 'TOPES'}))].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    setAuditoria(combINADA) // corregido aquí
  }

  async function registrarAuditoria(id_archivo, nombre_archivo, accion, tipo = 'precios') {
    const { data: { user } } = await supabase.auth.getUser()
    const tabla = tipo === 'precios' ? 'precios_auditoria' : 'topes_auditoria'
    await supabase.from(tabla).insert({ id_archivo, nombre_archivo, accion, usuario: user.email })
  }

  const verComoPDF = async (file) => {
    const toastId = toast.loading('Generando PDF...');
    try {
      const res = await fetch(file.url_archivo);
      const arrayBuffer = await res.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: 'array' });
      const doc = new jsPDF('landscape');
      
      wb.SheetNames.forEach((sheetName, index) => {
        if (index > 0) doc.addPage();
        doc.setFontSize(14); doc.setTextColor(11, 95, 165);
        doc.text(`Archivo: ${file.nombre_archivo}`, 14, 15);
        doc.setFontSize(10); doc.setTextColor(100, 100, 100);
        doc.text(`Hoja: ${sheetName}`, 14, 22);
        
        const ws = wb.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }).filter(row => row.some(c => String(c).trim() !== ''));
        
        if (data.length > 0) {
          autoTable(doc, { head: [data[0].map(c => String(c))], body: data.slice(1).map(row => row.map(c => String(c))), startY: 28, styles: { fontSize: 7 }, headStyles: { fillColor: [11, 95, 165] } });
        }
      });
      window.open(doc.output('bloburl'), '_blank');
      toast.success('PDF generado', { id: toastId });
    } catch (error) {
      toast.error('Error al generar PDF', { id: toastId });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0]; if (!file) return
    setArchivoExcel(file)
    const reader = new FileReader()
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      let headerIndex = data.findIndex(row => row.includes('PLANTAS'))
      if (headerIndex === -1) headerIndex = 0
      setPreviewHeaders(data[headerIndex])
      setPreviewData(data.slice(headerIndex + 1).filter(row => row.some(cell => cell !== '')))
    }
    reader.readAsBinaryString(file)
  }

  const handleFileChangeTope = (e) => {
    const file = e.target.files[0]; if (!file) return
    setArchivoExcelTope(file)
    const reader = new FileReader()
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      let headerIndex = data.findIndex(row => row.some(c => normalizarTexto(c).includes('PLANTA')))
      if (headerIndex === -1) headerIndex = 0
      setPreviewHeadersTope(data[headerIndex])
      setPreviewDataTope(data.slice(headerIndex + 1).filter(row => row.some(cell => cell !== '')))
    }
    reader.readAsBinaryString(file)
  }

  async function handleSubirArchivo() {
    setSubiendo(true)
    try {
      const fileName = `listas_precios/${Date.now()}_${archivoExcel.name.replace(/\s+/g, '_')}`
      await supabase.storage.from('documentos_sigmo').upload(fileName, archivoExcel)
      const { data: { publicUrl } } = supabase.storage.from('documentos_sigmo').getPublicUrl(fileName)
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('precios_archivos').update({ es_vigente: false }).eq('es_vigente', true)
      const { data } = await supabase.from('precios_archivos').insert({ nombre_archivo: archivoExcel.name, url_archivo: publicUrl, subido_por: user.email, es_vigente: true }).select()
      if (!data) throw new Error('Bloqueado por RLS')
      await registrarAuditoria(data[0].id, archivoExcel.name, 'SUBIDA', 'precios')
      toast.success('Lista subida'); setArchivoExcel(null); setPreviewData([]); setVista('menu')
    } catch (error) { toast.error(error.message) } finally { setSubiendo(false) }
  }

  async function handleSubirTope() {
    setSubiendoTope(true)
    try {
      const fileName = `topes/${Date.now()}_${archivoExcelTope.name.replace(/\s+/g, '_')}`
      await supabase.storage.from('documentos_sigmo').upload(fileName, archivoExcelTope)
      const { data: { publicUrl } } = supabase.storage.from('documentos_sigmo').getPublicUrl(fileName)
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('topes_archivos').update({ es_vigente: false }).eq('es_vigente', true)
      const { data } = await supabase.from('topes_archivos').insert({ nombre_archivo: archivoExcelTope.name, url_archivo: publicUrl, subido_por: user.email, es_vigente: true }).select()
      if (!data) throw new Error('Bloqueado por RLS')
      await registrarAuditoria(data[0].id, archivoExcelTope.name, 'SUBIDA', 'topes')
      toast.success('Topes subidos'); setArchivoExcelTope(null); setPreviewDataTope([]); setVista('menu')
    } catch (error) { toast.error(error.message) } finally { setSubiendoTope(false) }
  }

  const marcarComoVigente = async (id, nombre, tipo) => {
    const tabla = tipo === 'precios' ? 'precios_archivos' : 'topes_archivos'
    await supabase.from(tabla).update({ es_vigente: false }).eq('es_vigente', true)
    await supabase.from(tabla).update({ es_vigente: true }).eq('id', id)
    await registrarAuditoria(id, nombre, 'VIGENTE', tipo)
    toast.success('Vigente actualizado'); if (tipo === 'precios') fetchArchivos(); else fetchArchivosTopes();
  }

  const confirmarEliminar = async () => {
    const esTope = archivoAEliminar.tipo === 'topes'; const tabla = esTope ? 'topes_archivos' : 'precios_archivos'
    await supabase.storage.from('documentos_sigmo').remove([archivoAEliminar.url_archivo.split('/documentos_sigmo/')[1]])
    await supabase.from(tabla).delete().eq('id', archivoAEliminar.id)
    await registrarAuditoria(archivoAEliminar.id, archivoAEliminar.nombre_archivo, 'ELIMINACION', esTope ? 'topes' : 'precios')
    setModalEliminarAbierto(false); if (esTope) fetchArchivosTopes(); else fetchArchivos();
    setEliminando(false); toast.success('Eliminado');
  }

  const parseExcelFile = async (url) => {
    const res = await fetch(url); const wb = XLSX.read(await res.arrayBuffer(), { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]]; const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    let headerIndex = data.findIndex(row => row.some(cell => normalizarTexto(cell).includes('PLANTAS')));
    return { headers: data[headerIndex], rows: data.slice(headerIndex + 1).filter(row => row.some(cell => cell !== '')) };
  };

  const generarComparacion = async () => {
    if (!idBase || !idNuevo) return toast.error('Faltan listas');
    const fileBase = archivos.find(a => a.id === idBase); const fileNuevo = archivos.find(a => a.id === idNuevo);
    const dataBase = await parseExcelFile(fileBase.url_archivo); const dataNuevo = await parseExcelFile(fileNuevo.url_archivo);
    const idxPlantaNew = dataNuevo.headers.findIndex(h => normalizarTexto(h).includes('PLANTAS'));
    const idxCodigoNew = dataNuevo.headers.findIndex(h => normalizarTexto(h).includes('CODIGO'));
    const baseMap = {}; dataBase.rows.forEach(row => { const p = normalizarTexto(row[dataBase.headers.findIndex(h => normalizarTexto(h).includes('PLANTAS'))]); if (p) baseMap[p] = row; });
    const columnas = [];
    dataNuevo.headers.forEach((h, i) => {
      const hNorm = normalizarTexto(h); if (!hNorm || hNorm.includes('PLANTAS') || hNorm.includes('CODIGO') || hNorm.includes('USO INTERNO')) return;
      const baseCol = dataBase.headers.findIndex(bh => normalizarTexto(bh) === hNorm);
      if (baseCol !== -1) columnas.push({ titulo: h, idxN: i, idxB: baseCol });
    });
    const comparacion = [];
    dataNuevo.rows.forEach(nRow => {
      const p = normalizarTexto(nRow[idxPlantaNew]); if (!p) return; const bRow = baseMap[p]; const vars = {};
      if (bRow) columnas.forEach(c => {
        const vN = parseFloat(String(nRow[c.idxN]).replace(',', '.')); const vB = parseFloat(String(bRow[c.idxB]).replace(',', '.'));
        if (!isNaN(vN) && !isNaN(vB) && vN > 0 && vB > 0) vars[c.titulo] = { diff: vN - vB };
        else if (!isNaN(vN) && vN > 0) vars[c.titulo] = 'NUEVO'; else vars[c.titulo] = null;
      });
      comparacion.push({ codigo: idxCodigoNew !== -1 ? nRow[idxCodigoNew] : '', planta: nRow[idxPlantaNew], variaciones: vars });
    });
    setDatosComparados({ columnas: columnas.map(c => c.titulo), rows: comparacion });
  };

  const generarComparacionTopes = async () => {
    if (!idBaseTope || !idNuevoTope) return toast.error('Faltan archivos');
    const fBase = archivosTopes.find(a => a.id === idBaseTope); const fNuevo = archivosTopes.find(a => a.id === idNuevoTope);
    const dBase = XLSX.utils.sheet_to_json(XLSX.read(await (await fetch(fBase.url_archivo)).arrayBuffer(), { type: 'array' }).Sheets[XLSX.read(await (await fetch(fBase.url_archivo)).arrayBuffer(), { type: 'array' }).SheetNames[0]]);
    const dNuevo = XLSX.utils.sheet_to_json(XLSX.read(await (await fetch(fNuevo.url_archivo)).arrayBuffer(), { type: 'array' }).Sheets[XLSX.read(await (await fetch(fNuevo.url_archivo)).arrayBuffer(), { type: 'array' }).SheetNames[0]]);
    const map = {}; dBase.forEach(r => { const ll = `${normalizarTexto(r['PLANTA'])}|${normalizarTexto(r['ALMACEN'])}|${normalizarTexto(r['ARTICULO'])}`; map[ll] = parseFloat(String(r['TOPE S/IGV']).replace(',', '.')); });
    const comp = []; dNuevo.forEach(r => {
      const ll = `${normalizarTexto(r['PLANTA'])}|${normalizarTexto(r['ALMACEN'])}|${normalizarTexto(r['ARTICULO'])}`; const vN = parseFloat(String(r['TOPE S/IGV']).replace(',', '.'));
      if (!r['PLANTA'] || isNaN(vN)) return;
      const vB = map[ll]; comp.push({ planta: r['PLANTA'], almacen: r['ALMACEN'], articulo: r['ARTICULO'], variacion: vB !== undefined ? { diff: vN - vB } : 'NUEVO' });
    });
    setDatosComparadosTope(comp);
  };

  const renderHeader = () => (
    <header style={{ padding: '20px 40px', display: 'flex', alignItems: 'center', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
      <button onClick={() => vista === 'menu' ? setPantalla('') : setVista('menu')} style={btnHeaderStyle}>← {vista === 'menu' ? 'SIGMO' : 'Volver al Menú'}</button>
      <h1 style={{ margin: '0 0 0 15px', color: 'var(--primary-blue)', fontSize: '28px', fontWeight: '900' }}>
        {vista === 'menu' ? 'Precios, Topes & Cotización' : 'Gestión de Archivos'}
      </h1>
    </header>
  )

  if (vista === 'menu') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
        {renderHeader()}
        <main style={{ padding: '40px 20px', maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <div onClick={() => { setVista('visualizar'); setSubVista('precios'); }} style={cardStyle}>
              <div style={{ fontSize: '50px', marginBottom: '15px' }}>👁️</div>
              <h3 style={{ color: 'var(--primary-blue)', marginBottom: '10px', fontSize: '18px' }}>Visualizar Listas & Topes</h3>
              <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Ver, comparar y descargar archivos Excel.</p>
            </div>
            {puedeCargar && (
              <div onClick={() => { setVista('cargar'); setSubVista('precios'); }} style={cardStyle}>
                <div style={{ fontSize: '50px', marginBottom: '15px' }}>📤</div>
                <h3 style={{ color: 'var(--primary-blue)', marginBottom: '10px', fontSize: '18px' }}>Cargar Nueva Lista & Topes</h3>
                <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Sube y previsualiza archivos Excel.</p>
              </div>
            )}
            <div onClick={() => setVista('tendencias')} style={cardStyle}>
              <div style={{ fontSize: '50px', marginBottom: '15px' }}>📈</div>
              <h3 style={{ color: 'var(--primary-blue)', marginBottom: '10px', fontSize: '18px' }}>Gráfico de Tendencias</h3>
              <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Evolución histórica.</p>
            </div>
            <div onClick={() => setVista('auditoria')} style={cardStyle}>
              <div style={{ fontSize: '50px', marginBottom: '15px' }}>📋</div>
              <h3 style={{ color: 'var(--primary-blue)', marginBottom: '10px', fontSize: '18px' }}>Auditoría General</h3>
              <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Historial de cambios.</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (vista === 'visualizar') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
        {renderHeader()}
        <main style={{ padding: '40px 20px', maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={btnTabStyle(subVista === 'precios')} onClick={() => setSubVista('precios')}>📄 Listas de Precios</button>
              <button style={btnTabStyle(subVista === 'topes')} onClick={() => setSubVista('topes')}>📊 Topes</button>
            </div>
            <Boton variante="outline" onClick={() => { setTipoComparacion(subVista); setVista('comparar'); }} style={{ color: 'var(--primary-blue)' }}>
              ⚖️ Comparar {subVista === 'precios' ? 'Precios' : 'Topes'}
            </Boton>
          </div>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {subVista === 'precios' ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: 'var(--primary-blue)', color: 'white', textAlign: 'left' }}>
                  <tr><th style={{ padding: '15px' }}>FECHA</th><th style={{ padding: '15px' }}>NOMBRE</th><th style={{ padding: '15px', textAlign: 'center' }}>ESTADO</th><th style={{ padding: '15px', textAlign: 'center' }}>ACCIONES</th></tr>
                </thead>
                <tbody>
                  {archivos.map(f => (
                    <tr key={f.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '15px' }}>{new Date(f.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '15px', fontWeight: 'bold' }}>📄 {f.nombre_archivo}</td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>{f.es_vigente ? <span style={{ color: '#166534', fontWeight: 'bold' }}>VIGENTE</span> : 'HISTÓRICO'}</td>
                      <td style={{ padding: '15px', textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                         <Boton variante="outline" tamano="sm" onClick={() => verComoPDF(f)}>👁️</Boton>
                         {puedeGestionar && !f.es_vigente && <Boton variante="success" tamano="sm" onClick={() => marcarComoVigente(f.id, f.nombre_archivo, 'precios')}>✅</Boton>}
                         {puedeGestionar && <Boton variante="danger" tamano="sm" onClick={() => { setArchivoAEliminar({...f, tipo: 'precios'}); setModalEliminarAbierto(true); }}>🗑️</Boton>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#059669', color: 'white', textAlign: 'left' }}>
                  <tr><th style={{ padding: '15px' }}>FECHA</th><th style={{ padding: '15px' }}>NOMBRE</th><th style={{ padding: '15px', textAlign: 'center' }}>ESTADO</th><th style={{ padding: '15px', textAlign: 'center' }}>ACCIONES</th></tr>
                </thead>
                <tbody>
                  {archivosTopes.map(f => (
                    <tr key={f.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '15px' }}>{new Date(f.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '15px', fontWeight: 'bold' }}>📊 {f.nombre_archivo}</td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>{f.es_vigente ? <span style={{ color: '#166534', fontWeight: 'bold' }}>VIGENTE</span> : 'HISTÓRICO'}</td>
                      <td style={{ padding: '15px', textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                         <Boton variante="outline" tamano="sm" onClick={() => verComoPDF(f)} title="Ver en PDF">👁️</Boton>
                         {puedeGestionar && !f.es_vigente && <Boton variante="success" tamano="sm" onClick={() => marcarComoVigente(f.id, f.nombre_archivo, 'topes')}>✅</Boton>}
                         {puedeGestionar && <Boton variante="danger" tamano="sm" onClick={() => { setArchivoAEliminar({...f, tipo: 'topes'}); setModalEliminarAbierto(true); }}>🗑️</Boton>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </main>
      </div>
    )
  }

  if (vista === 'cargar') {
    if (!puedeCargar) return <div style={{ padding: '50px', textAlign: 'center' }}><h2>No tienes permisos.</h2></div>
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
        {renderHeader()}
        <main style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button style={btnTabStyle(subVista === 'precios')} onClick={() => setSubVista('precios')}>📄 Cargar Precios</button>
            <button style={btnTabStyle(subVista === 'topes')} onClick={() => setSubVista('topes')}>📊 Cargar Topes</button>
          </div>
          <Card style={{ padding: '30px' }}>
            {subVista === 'precios' ? (
              <>
                <h2>Subir Lista de Precios</h2>
                <input type="file" accept=".xlsx" onChange={handleFileChange} style={{ marginTop: '15px' }} />
                {archivoExcel && <div style={{ marginTop: '15px' }}><Boton variante="success" onClick={handleSubirArchivo} disabled={subiendo}>{subiendo ? 'Subiendo...' : 'Confirmar y Subir'}</Boton></div>}
              </>
            ) : (
              <>
                <h2>Subir Archivo de Topes</h2>
                <input type="file" accept=".xlsx" onChange={handleFileChangeTope} style={{ marginTop: '15px' }} />
                {archivoExcelTope && <div style={{ marginTop: '15px' }}><Boton variante="success" onClick={handleSubirTope} disabled={subiendoTope}>{subiendoTope ? 'Subiendo...' : 'Confirmar y Subir'}</Boton></div>}
              </>
            )}
          </Card>
        </main>
      </div>
    )
  }

  if (vista === 'comparar') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
        {renderHeader()}
        <main style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button style={btnTabStyle(tipoComparacion === 'precios')} onClick={() => setTipoComparacion('precios')}>📄 Precios</button>
            <button style={btnTabStyle(tipoComparacion === 'topes')} onClick={() => setTipoComparacion('topes')}>📊 Topes</button>
          </div>

          <Card style={{ padding: '30px', marginBottom: '20px' }}>
            {tipoComparacion === 'precios' ? (
              <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}><label>Lista Previa</label><select value={idBase} onChange={e => setIdBase(e.target.value)} style={{ width: '100%', padding: '10px' }}>{archivos.map(a => <option key={a.id} value={a.id}>{a.nombre_archivo}</option>)}</select></div>
                <div style={{ flex: 1 }}><label>Lista Actual</label><select value={idNuevo} onChange={e => setIdNuevo(e.target.value)} style={{ width: '100%', padding: '10px' }}>{archivos.map(a => <option key={a.id} value={a.id}>{a.nombre_archivo}</option>)}</select></div>
                <Boton variante="primary" onClick={generarComparacion} style={{ height: '42px' }}>⚖️ Comparar</Boton>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}><label>Topes Previos</label><select value={idBaseTope} onChange={e => setIdBaseTope(e.target.value)} style={{ width: '100%', padding: '10px' }}>{archivosTopes.map(a => <option key={a.id} value={a.id}>{a.nombre_archivo}</option>)}</select></div>
                <div style={{ flex: 1 }}><label>Topes Actuales</label><select value={idNuevoTope} onChange={e => setIdNuevoTope(e.target.value)} style={{ width: '100%', padding: '10px' }}>{archivosTopes.map(a => <option key={a.id} value={a.id}>{a.nombre_archivo}</option>)}</select></div>
                <Boton variante="success" onClick={generarComparacionTopes} style={{ height: '42px' }}>⚖️ Comparar</Boton>
              </div>
            )}
          </Card>

          {tipoComparacion === 'precios' && datosComparados && (
            <Card style={{ padding: '20px' }}>
              <h2 style={{ textAlign: 'center', color: 'var(--primary-blue)' }}>Variación de Precios</h2>
              {/* Tabla precios aquí */}
            </Card>
          )}

          {tipoComparacion === 'topes' && datosComparadosTope && (
            <Card style={{ padding: '20px' }}>
              <h2 style={{ textAlign: 'center', color: '#059669' }}>Variación de Topes</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'center' }}>
                <thead style={{ backgroundColor: '#059669', color: 'white' }}>
                  <tr><th>PLANTA</th><th>ALMACÉN</th><th>ARTÍCULO</th><th>VARIACIÓN</th></tr>
                </thead>
                <tbody>
                  {datosComparadosTope.map((fila, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold' }}>{fila.planta}</td>
                      <td style={{ padding: '8px' }}>{fila.almacen}</td>
                      <td style={{ padding: '8px' }}>{fila.articulo}</td>
                      <td style={{ padding: '8px' }}>
                        {fila.variacion === 'NUEVO' ? <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>NUEVO</span> : fila.variacion && Math.abs(fila.variacion.diff) > 0.00001 ? <span style={{ color: fila.variacion.diff > 0 ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>{fila.variacion.diff > 0 ? '+' : ''}{fila.variacion.diff.toFixed(2)}</span> : <span style={{ color: '#9ca3af' }}>0.00</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </main>
      </div>
    )
  }

  if (vista === 'auditoria') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
        {renderHeader()}
        <main style={{ padding: '40px 20px', maxWidth: '1000px', margin: '0 auto' }}>
          <Card>
            <h2>Auditoría General</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead style={{ backgroundColor: 'var(--primary-blue)', color: 'white' }}>
                <tr><th>FECHA</th><th>MÓDULO</th><th>ACCIÓN</th><th>ARCHIVO</th></tr>
              </thead>
              <tbody>
                {auditoria.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px' }}>{new Date(log.created_at).toLocaleString()}</td>
                    <td style={{ padding: '12px', fontWeight: 'bold', color: log.origen === 'TOPES' ? '#059669' : 'var(--primary-blue)' }}>{log.origen}</td>
                    <td style={{ padding: '12px' }}>{log.accion}</td>
                    <td style={{ padding: '12px' }}>{log.nombre_archivo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </main>
      </div>
    )
  }

  if (vista === 'tendencias') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
        {renderHeader()}
        <main style={{ padding: '40px 20px', maxWidth: '1100px', margin: '0 auto' }}>
          <Card style={{ padding: '40px', textAlign: 'center' }}>
             <div style={{ fontSize: '50px', marginBottom: '20px' }}>📈</div>
             <h2 style={{ color: 'var(--primary-blue)' }}>Módulo de Tendencias</h2>
             <p style={{ color: 'var(--text-light)' }}>El gráfico histórico se mantiene operando con los archivos de Precios.</p>
             <Boton variante="outline" onClick={() => setVista('menu')} style={{ marginTop: '20px' }}>Volver al Menú</Boton>
          </Card>
        </main>
      </div>
    )
  }
}