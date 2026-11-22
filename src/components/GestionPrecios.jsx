import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'
import { Card, Boton } from './ui'

// ===== CONSTANTES DE NEGOCIO =====
const TASA_IGV = 0.18
const TASA_PERCEPCION = 0.01   // Percepción 1% (activable por checkbox)
const HOJA_PRECIO_COTIZACION = 'Precios Planta Con IGV'  // Fija, no editable

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

// Estilos del Cotizador
const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', boxSizing: 'border-box' }
const selectStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', backgroundColor: '#1e293b', color: '#fff', fontWeight: 'bold', boxSizing: 'border-box' }
const readOnlyFieldStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', backgroundColor: '#f3f4f6', color: '#374151', fontWeight: 'bold', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '42px' }

const COLORS = ['#0B5FA5', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f43f5e', '#84cc16', '#f97316', '#6366f1']

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const sortedPayload = [...payload].sort((a, b) => b.value - a.value);
    return (
      <div style={{ backgroundColor: '#1e293b', color: 'white', padding: '12px 16px', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', maxHeight: '350px', overflowY: 'auto', border: '1px solid #334155' }}>
        <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#cbd5e1', fontWeight: 'bold', borderBottom: '1px solid #334155', paddingBottom: '5px' }}>{label}</p>
        {sortedPayload.map((entry, index) => (
          <div key={index} style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', fontSize: '12px', marginBottom: '6px' }}>
            <span style={{ color: entry.color, display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: entry.color }}></span>
              {entry.name}:
            </span>
            <span style={{ fontWeight: 'bold' }}>S/ {Number(entry.value).toFixed(4)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function GestionPrecios({ setPantalla, rol }) {
  const [vista, setVista] = useState('menu')
  const [subVista, setSubVista] = useState('precios')
  
  const [archivos, setArchivos] = useState([])
  const [archivoExcel, setArchivoExcel] = useState(null)
  const [subiendo, setSubiendo] = useState(false)

  const [archivosTopes, setArchivosTopes] = useState([])
  const [archivoExcelTope, setArchivoExcelTope] = useState(null)
  const [subiendoTope, setSubiendoTope] = useState(false)
  const [previewDataTope, setPreviewDataTope] = useState([])
  const [previewHeadersTope, setPreviewHeadersTope] = useState([])

  // Previsualización multi-hoja
  const [hojasPreview, setHojasPreview] = useState([])
  const [hojaActiva, setHojaActiva] = useState(0)

  const [tipoComparacion, setTipoComparacion] = useState('precios')
  const [idBase, setIdBase] = useState('')
  const [idNuevo, setIdNuevo] = useState('')
  const [hojaComparar, setHojaComparar] = useState('Precio Base')
  const [datosComparados, setDatosComparados] = useState(null)
  const [cargandoComparacion, setCargandoComparacion] = useState(false)
  
  const [idBaseTope, setIdBaseTope] = useState('')
  const [idNuevoTope, setIdNuevoTope] = useState('')
  const [datosComparadosTope, setDatosComparadosTope] = useState(null)
  const [cargandoComparacionTope, setCargandoComparacionTope] = useState(false)

  const [auditoria, setAuditoria] = useState([])

  // ESTADOS DE TENDENCIAS
  const [plantaSeleccionada, setPlantaSeleccionada] = useState('')
  const [productoSeleccionado, setProductoSeleccionado] = useState('')
  const [hojaTendencia, setHojaTendencia] = useState('Precio Base')
  const [datosTendencia, setDatosTendencia] = useState([])
  const [lineasDinamicas, setLineasDinamicas] = useState([])
  const [metricas, setMetricas] = useState(null)
  const [cargandoTendencia, setCargandoTendencia] = useState(false)
  const [errorTendencia, setErrorTendencia] = useState('')
  const [opcionesPlantas, setOpcionesPlantas] = useState([])
  const [opcionesProductos, setOpcionesProductos] = useState([])

  // ESTADOS DE COTIZADOR
  const [cotCliente, setCotCliente] = useState('')
  const [cotDatos, setCotDatos] = useState(null)
  const [cotCargandoDatos, setCotCargandoDatos] = useState(false)
  const [cotErrorDatos, setCotErrorDatos] = useState('')
  const [cotHoja] = useState(HOJA_PRECIO_COTIZACION)  // Fijo, no editable
  const [cotPlanta, setCotPlanta] = useState('')
  const [cotProducto, setCotProducto] = useState('')
  const [cotAlmacen, setCotAlmacen] = useState('')
  const [cotColTope, setCotColTope] = useState('TOPE S/IGV')  // Se setea automáticamente
  const [cotFactor, setCotFactor] = useState('')
  const [cotCantidad, setCotCantidad] = useState('')
  const [cotAplicarPercepcion, setCotAplicarPercepcion] = useState(true)
  const [cotResultado, setCotResultado] = useState(null)
  const [cotKey, setCotKey] = useState(0)

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

  const esPlantaValida = (nombre) => {
    const n = normalizarTexto(nombre);
    if (!n || n.length < 3 || n.includes('*') || !isNaN(Number(n))) return false;
    if (n.match(/\d{4}-\d{2}-\d{2}/) || n.match(/\d{2}\/\d{2}\/\d{4}/)) return false; 
    if (n.includes('TOTAL') || n.includes('IGV') || n.includes('ISC') || n.includes('RODAJE') || n.includes('INCREMENTO') || n.includes('INCLUSION') || n.includes('DISMINUCION') || n.includes('SISE') || n.includes('INGRESO')) return false;
    return true;
  };

  // Genera N° de cotización formato COT-YYYYMMDD-XXX
  const generarNumeroCotizacion = () => {
    const hoy = new Date()
    const yyyy = hoy.getFullYear()
    const mm = String(hoy.getMonth() + 1).padStart(2, '0')
    const dd = String(hoy.getDate()).padStart(2, '0')
    const random = String(Math.floor(Math.random() * 900) + 100)
    return `COT-${yyyy}${mm}${dd}-${random}`
  }

  useEffect(() => {
    if (vista === 'visualizar' && subVista === 'precios') fetchArchivos()
    if (vista === 'visualizar' && subVista === 'topes') fetchArchivosTopes()
    if (vista === 'comparar') { fetchArchivos(); fetchArchivosTopes(); }
    if (vista === 'auditoria') fetchAuditoria()
    if (vista === 'tendencias' || vista === 'cotizar') fetchArchivos()
  }, [vista, subVista])

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
    setAuditoria(combinada)
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

      let hayTabla = false;

      wb.SheetNames.forEach((sheetName) => {
        const ws = wb.Sheets[sheetName];
        const filas = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        const headerIndex = filas.findIndex(row =>
          row.some(cell => normalizarTexto(cell).includes('PLANTA'))
        );
        if (headerIndex === -1) return;

        const headerRow = filas[headerIndex];
        const idxPlanta = headerRow.findIndex(c => normalizarTexto(c).includes('PLANTA'));
        const idxCodigo = headerRow.findIndex(c => normalizarTexto(c).includes('CODIGO'));

        const colInicio = Math.max(0, idxCodigo !== -1 ? idxCodigo : idxPlanta);
        let colFin = -1;
        headerRow.forEach((c, i) => { if (String(c).trim() !== '') colFin = i; });
        if (colFin < colInicio) return;

        const cuerpo = filas
          .slice(headerIndex + 1)
          .filter(row => esPlantaValida(row[idxPlanta]))
          .map(row => row.slice(colInicio, colFin + 1));

        if (cuerpo.length === 0) return;

        const encabezado = headerRow.slice(colInicio, colFin + 1).map(c => String(c).trim());

        const formatear = (v) => {
          if (typeof v === 'number') {
            if (Number.isInteger(v)) return String(v);
            return String(Number(v.toFixed(4)));
          }
          return String(v).trim();
        };

        if (hayTabla) doc.addPage();
        hayTabla = true;

        doc.setFontSize(14); doc.setTextColor(11, 95, 165);
        doc.text(`Archivo: ${file.nombre_archivo}`, 14, 15);
        doc.setFontSize(10); doc.setTextColor(100, 100, 100);
        doc.text(`Hoja: ${sheetName}`, 14, 22);

        autoTable(doc, {
          head: [encabezado],
          body: cuerpo.map(row => row.map(formatear)),
          startY: 28,
          styles: { fontSize: 7 },
          headStyles: { fillColor: [11, 95, 165] }
        });
      });

      if (!hayTabla) {
        toast.error('No se encontró ninguna tabla en el archivo', { id: toastId });
        return;
      }

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
      const hojas = wb.SheetNames.map(sheetName => {
        const ws = wb.Sheets[sheetName]
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

        const headerIndex = data.findIndex(row => row.some(cell => normalizarTexto(cell).includes('PLANTA')))
        if (headerIndex === -1) return null

        const headers = data[headerIndex]
        const idxPlanta = headers.findIndex(c => normalizarTexto(c).includes('PLANTA'))
        const idxCodigo = headers.findIndex(c => normalizarTexto(c).includes('CODIGO'))

        const colInicio = Math.max(0, idxCodigo !== -1 ? idxCodigo : idxPlanta)
        let colFin = -1
        headers.forEach((c, i) => { if (String(c).trim() !== '') colFin = i })
        if (colFin < colInicio) return null

        const rows = data.slice(headerIndex + 1)
          .filter(row => esPlantaValida(row[idxPlanta]))
          .map(row => row.slice(colInicio, colFin + 1))

        return {
          nombre: sheetName,
          headers: headers.slice(colInicio, colFin + 1),
          rows: rows
        }
      }).filter(h => h && h.rows.length > 0)

      setHojasPreview(hojas)
      setHojaActiva(0)
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
      toast.success('Lista subida'); setArchivoExcel(null); setHojasPreview([]); setHojaActiva(0); setVista('menu')
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
      toast.success('Topes subidos'); setArchivoExcelTope(null); setPreviewDataTope([]); setPreviewHeadersTope([]); setVista('menu')
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
    const esTope = archivoAEliminar.tipo === 'topes'; 
    const tabla = esTope ? 'topes_archivos' : 'precios_archivos'
    setEliminando(true)
    try {
      await supabase.storage.from('documentos_sigmo').remove([archivoAEliminar.url_archivo.split('/documentos_sigmo/')[1]])
      await supabase.from(tabla).delete().eq('id', archivoAEliminar.id)
      await registrarAuditoria(archivoAEliminar.id, archivoAEliminar.nombre_archivo, 'ELIMINACION', esTope ? 'topes' : 'precios')
      toast.success('Archivo eliminado correctamente');
      if (esTope) fetchArchivosTopes(); else fetchArchivos();
    } catch (error) {
      toast.error('Error al eliminar: ' + error.message)
    } finally {
      setModalEliminarAbierto(false)
      setEliminando(false)
      setArchivoAEliminar(null)
    }
  }

  const parseExcelFile = async (url, targetSheetName) => {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    const searchTerm = targetSheetName.toLowerCase().replace('precios planta ', '').replace('precio ', '');
    let sheetName = wb.SheetNames.find(name => name.toLowerCase().includes(searchTerm)) || wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    let headerIndex = data.findIndex(row => row.some(cell => normalizarTexto(cell).includes('PLANTAS')));
    if (headerIndex === -1) headerIndex = 0;
    return { headers: data[headerIndex], rows: data.slice(headerIndex + 1).filter(row => row.some(cell => cell !== '')) };
  };

  const generarComparacion = async () => {
    if (!idBase || !idNuevo) return toast.error('Faltan listas para comparar.');
    if (idBase === idNuevo) return toast.error('Las listas deben ser diferentes');
    setCargandoComparacion(true);
    setDatosComparados(null);

    try {
      const fileBase = archivos.find(a => a.id === idBase);
      const fileNuevo = archivos.find(a => a.id === idNuevo);
      const dataBase = await parseExcelFile(fileBase.url_archivo, hojaComparar);
      const dataNuevo = await parseExcelFile(fileNuevo.url_archivo, hojaComparar);

      const idxPlantaNew = dataNuevo.headers.findIndex(h => normalizarTexto(h).includes('PLANTAS'));
      const idxCodigoNew = dataNuevo.headers.findIndex(h => normalizarTexto(h).includes('CODIGO'));
      const idxPlantaBase = dataBase.headers.findIndex(h => normalizarTexto(h).includes('PLANTAS'));

      const baseMap = {};
      dataBase.rows.forEach(row => {
        const plantaRaw = row[idxPlantaBase];
        if (esPlantaValida(plantaRaw)) {
          baseMap[normalizarTexto(plantaRaw)] = row;
        }
      });

      const columnasComparar = [];
      dataNuevo.headers.forEach((h, i) => {
        const hNorm = normalizarTexto(h);
        if (!hNorm || hNorm.includes('PLANTAS') || hNorm.includes('CODIGO') || hNorm.includes('USO INTERNO')) return;
        const baseColIndex = dataBase.headers.findIndex(baseH => normalizarTexto(baseH) === hNorm);
        if (baseColIndex !== -1) columnasComparar.push({ titulo: h, indexNuevo: i, indexBase: baseColIndex });
      });

      const comparacion = [];
      dataNuevo.rows.forEach(nuevaRow => {
        const plantaRaw = nuevaRow[idxPlantaNew];
        if (!esPlantaValida(plantaRaw)) return; 
        const planta = normalizarTexto(plantaRaw);
        const baseRow = baseMap[planta];
        const variaciones = {};
        if (baseRow) {
          columnasComparar.forEach(col => {
            const valNuevo = parseFloat(String(nuevaRow[col.indexNuevo]).replace(',', '.'));
            const valBase = parseFloat(String(baseRow[col.indexBase]).replace(',', '.'));
            if (!isNaN(valNuevo) && !isNaN(valBase) && valNuevo > 0 && valBase > 0) {
              variaciones[col.titulo] = { diff: valNuevo - valBase };
            } else if (!isNaN(valNuevo) && valNuevo > 0 && (isNaN(valBase) || valBase === 0)) {
              variaciones[col.titulo] = 'NUEVO';
            } else {
              variaciones[col.titulo] = null;
            }
          });
        }
        comparacion.push({ codigo: idxCodigoNew !== -1 ? nuevaRow[idxCodigoNew] : '', planta: plantaRaw, variaciones });
      });

      setDatosComparados({ columnas: columnasComparar.map(c => c.titulo), rows: comparacion });
    } catch (error) {
      toast.error('Error al comparar: ' + error.message);
    } finally {
      setCargandoComparacion(false);
    }
  };

  const generarComparacionTopes = async () => {
    if (!idBaseTope || !idNuevoTope) return toast.error('Faltan archivos de topes para comparar.');
    if (idBaseTope === idNuevoTope) return toast.error('Los archivos deben ser diferentes');
    setCargandoComparacionTope(true);
    setDatosComparadosTope(null);

    try {
      const fileBase = archivosTopes.find(a => a.id === idBaseTope);
      const fileNuevo = archivosTopes.find(a => a.id === idNuevoTope);

      const parseTope = async (url) => {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const wb = XLSX.read(arrayBuffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        return XLSX.utils.sheet_to_json(ws, { defval: '' });
      };

      const dataBase = await parseTope(fileBase.url_archivo);
      const dataNuevo = await parseTope(fileNuevo.url_archivo);

      const baseMap = {};
      dataBase.forEach(row => {
        const planta = normalizarTexto(row['PLANTA'] || row['Planta']);
        const almacen = normalizarTexto(row['ALMACEN'] || row['Almacen']);
        const articulo = normalizarTexto(row['ARTICULO'] || row['Articulo']);
        const llave = `${planta}|${almacen}|${articulo}`;
        const valor = parseFloat(String(row['TOPE S/IGV'] || row['Tope'] || row['TOPE']).replace(',', '.'));
        if (!isNaN(valor)) baseMap[llave] = valor;
      });

      const comparacion = [];
      dataNuevo.forEach(row => {
        const planta = String(row['PLANTA'] || row['Planta']).trim();
        const almacen = String(row['ALMACEN'] || row['Almacen']).trim();
        const articulo = String(row['ARTICULO'] || row['Articulo']).trim();
        const valorNuevo = parseFloat(String(row['TOPE S/IGV'] || row['Tope'] || row['TOPE']).replace(',', '.'));

        if (!esPlantaValida(planta) || !articulo || isNaN(valorNuevo)) return;

        const llave = `${normalizarTexto(planta)}|${normalizarTexto(almacen)}|${normalizarTexto(articulo)}`;
        const valorBase = baseMap[llave];

        let variacion = null;
        if (valorBase !== undefined) {
          variacion = { diff: valorNuevo - valorBase };
        } else {
          variacion = 'NUEVO';
        }

        comparacion.push({ planta, almacen, articulo, variacion });
      });

      setDatosComparadosTope(comparacion);
    } catch (error) {
      toast.error('Error al comparar Topes: ' + error.message);
    } finally {
      setCargandoComparacionTope(false);
    }
  };

  // ===== TENDENCIAS =====
  const cargarTendencias = async () => {
    if (!plantaSeleccionada || !productoSeleccionado) return toast.error('Selecciona una planta y un producto');
    setCargandoTendencia(true);
    setDatosTendencia([]);
    setMetricas(null);
    setErrorTendencia('');

    try {
      const archivosProcesar = archivos.slice(0, 15).reverse(); 
      if (archivosProcesar.length < 2) throw new Error("Se necesitan al menos 2 listas para calcular una tendencia.");

      const tendenciaAgrupada = {}; 
      let nombresLineas = new Set();

      for (const file of archivosProcesar) {
        const data = await parseExcelFile(file.url_archivo, hojaTendencia);
        const idxPlanta = data.headers.findIndex(h => normalizarTexto(h).includes('PLANTAS'));
        const fecha = extraerFecha(file.nombre_archivo);
        
        if (!tendenciaAgrupada[fecha]) tendenciaAgrupada[fecha] = { fecha };

        if (plantaSeleccionada === 'TODOS' && productoSeleccionado !== 'TODOS') {
          const idxProducto = data.headers.findIndex(h => normalizarTexto(h) === normalizarTexto(productoSeleccionado));
          if (idxProducto !== -1) {
            data.rows.forEach(fila => {
              const nombrePlanta = String(fila[idxPlanta]).trim();
              if (esPlantaValida(nombrePlanta)) {
                const valor = parseFloat(String(fila[idxProducto]).replace(',', '.'));
                if (!isNaN(valor) && valor > 0 && isFinite(valor)) {
                  tendenciaAgrupada[fecha][nombrePlanta] = valor;
                  nombresLineas.add(nombrePlanta);
                }
              }
            });
          }
        } else if (plantaSeleccionada !== 'TODOS' && productoSeleccionado === 'TODOS') {
          const fila = data.rows.find(r => normalizarTexto(r[idxPlanta]) === normalizarTexto(plantaSeleccionada));
          if (fila) {
            data.headers.forEach((h, i) => {
              const hNorm = normalizarTexto(h);
              if (hNorm.includes('PLANTAS') || hNorm.includes('CODIGO') || hNorm.includes('USO INTERNO') || !hNorm) return;
              const nombreProducto = String(h).trim();
              const valor = parseFloat(String(fila[i]).replace(',', '.'));
              if (!isNaN(valor) && valor > 0 && isFinite(valor)) {
                tendenciaAgrupada[fecha][nombreProducto] = valor;
                nombresLineas.add(nombreProducto);
              }
            });
          }
        } else if (plantaSeleccionada === 'TODOS' && productoSeleccionado === 'TODOS') {
          data.rows.forEach(fila => {
            const nombrePlanta = String(fila[idxPlanta]).trim();
            if (esPlantaValida(nombrePlanta)) {
              let suma = 0, count = 0;
              data.headers.forEach((h, i) => {
                const hNorm = normalizarTexto(h);
                if (hNorm.includes('PLANTAS') || hNorm.includes('CODIGO') || hNorm.includes('USO INTERNO') || !hNorm) return;
                const valor = parseFloat(String(fila[i]).replace(',', '.'));
                if (!isNaN(valor) && valor > 0 && isFinite(valor)) { suma += valor; count++; }
              });
              if (count > 0) {
                tendenciaAgrupada[fecha][nombrePlanta] = suma / count;
                nombresLineas.add(nombrePlanta);
              }
            }
          });
        } else {
          const idxProducto = data.headers.findIndex(h => normalizarTexto(h) === normalizarTexto(productoSeleccionado));
          const fila = data.rows.find(r => normalizarTexto(r[idxPlanta]) === normalizarTexto(plantaSeleccionada));
          if (fila && idxProducto !== -1) {
            const valor = parseFloat(String(fila[idxProducto]).replace(',', '.'));
            const nombreLinea = `${plantaSeleccionada} - ${productoSeleccionado}`;
            if (!isNaN(valor) && valor > 0 && isFinite(valor)) {
              tendenciaAgrupada[fecha][nombreLinea] = valor;
              nombresLineas.add(nombreLinea);
            }
          }
        }
      }

      const datosArray = Object.values(tendenciaAgrupada).sort((a, b) => a.fecha.localeCompare(b.fecha));
      if (datosArray.length < 2) throw new Error("No hay suficientes datos históricos válidos.");

      setDatosTendencia(datosArray);
      const lineasArray = Array.from(nombresLineas);
      setLineasDinamicas(lineasArray);

      if (lineasArray.length > 0) {
        let actual = 0, min = Infinity, max = -Infinity, variacion = 0;
        let labelReferencia = '';
        if (plantaSeleccionada === 'TODOS' && productoSeleccionado === 'TODOS') {
          labelReferencia = 'Promedio Global (Plantas)';
          const promediosPorFecha = datosArray.map(d => {
            const vals = Object.entries(d).filter(([k, v]) => k !== 'fecha' && v !== undefined).map(([_, v]) => v);
            return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : undefined;
          }).filter(v => v !== undefined);
          if (promediosPorFecha.length > 0) {
            actual = promediosPorFecha[promediosPorFecha.length - 1];
            variacion = promediosPorFecha.length > 1 ? actual - promediosPorFecha[promediosPorFecha.length - 2] : 0;
            const allVals = datosArray.flatMap(d => Object.entries(d).filter(([k, v]) => k !== 'fecha' && v !== undefined).map(([_, v]) => v));
            min = Math.min(...allVals); max = Math.max(...allVals);
          }
        } else {
          const primeraLinea = lineasArray[0];
          labelReferencia = primeraLinea;
          const precios = datosArray.map(d => d[primeraLinea]).filter(v => v !== undefined);
          if (precios.length > 0) {
            actual = precios[precios.length - 1];
            variacion = precios.length > 1 ? actual - precios[precios.length - 2] : 0;
            min = Math.min(...precios); max = Math.max(...precios);
          }
        }
        setMetricas({ actual, min, max, variacion, lineaReferencia: labelReferencia });
      } else { setMetricas(null); }
    } catch (error) { setErrorTendencia(error.message); } finally { setCargandoTendencia(false); }
  };

  useEffect(() => {
    if ((vista === 'tendencias' || vista === 'cotizar') && archivos.length > 0 && opcionesPlantas.length === 0) {
      parseExcelFile(archivos[0].url_archivo, 'Precio Base').then(data => {
        const idxP = data.headers.findIndex(h => normalizarTexto(h).includes('PLANTAS'));
        const plnts = data.rows.map(r => String(r[idxP]).trim()).filter(p => esPlantaValida(p));
        setOpcionesPlantas(['TODOS', ...new Set(plnts)].sort((a,b) => a === 'TODOS' ? -1 : b === 'TODOS' ? 1 : a.localeCompare(b)));
        const prods = data.headers.map(h => String(h).trim()).filter(h => h && !normalizarTexto(h).includes('PLANTAS') && !normalizarTexto(h).includes('CODIGO') && !normalizarTexto(h).includes('USO INTERNO'));
        setOpcionesProductos(['TODOS', ...new Set(prods)].filter(p => p.length >= 3).sort((a,b) => a === 'TODOS' ? -1 : b === 'TODOS' ? 1 : a.localeCompare(b)));
      });
    }
  }, [vista, archivos, opcionesPlantas.length]);

  const exportarTendenciaExcel = () => {
    if (!datosTendencia || datosTendencia.length === 0) return toast.error('No hay datos para exportar');
    const ws = XLSX.utils.json_to_sheet(datosTendencia);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tendencia');
    XLSX.writeFile(wb, `Tendencia_${hojaTendencia}.xlsx`);
    toast.success('Datos exportados a Excel');
  };

  // ===== COTIZADOR =====
  const cargarDatosCotizador = async () => {
    setCotCargandoDatos(true)
    setCotErrorDatos('')
    setCotResultado(null)
    try {
      const { data: precioVigente } = await supabase.from('precios_archivos').select('*').eq('es_vigente', true).maybeSingle()
      const { data: topeVigente } = await supabase.from('topes_archivos').select('*').eq('es_vigente', true).maybeSingle()
      if (!precioVigente) throw new Error('No hay lista de Precios VIGENTE. Sube y marca una lista como vigente.')
      if (!topeVigente) throw new Error('No hay archivo de Topes VIGENTE. Sube y marca un archivo de topes como vigente.')

      const resP = await fetch(precioVigente.url_archivo)
      const wbP = XLSX.read(await resP.arrayBuffer(), { type: 'array' })
      const sheetP = wbP.SheetNames.find(n => n.toLowerCase() === HOJA_PRECIO_COTIZACION.toLowerCase())
      if (!sheetP) throw new Error(`No se encontró la hoja "${HOJA_PRECIO_COTIZACION}" en el archivo de precios.`)
      const wsP = wbP.Sheets[sheetP]
      const gridP = XLSX.utils.sheet_to_json(wsP, { header: 1, defval: '' })
      const hIdx = gridP.findIndex(r => r.some(c => normalizarTexto(c).includes('PLANTA')))
      if (hIdx === -1) throw new Error(`No se encontró la tabla de precios en la hoja "${sheetP}".`)
      const headers = gridP[hIdx].map(h => String(h).trim())
      const idxPlanta = headers.findIndex(h => normalizarTexto(h).includes('PLANTA'))
      const filas = gridP.slice(hIdx + 1).filter(r => esPlantaValida(r[idxPlanta]))

      const plantas = [...new Set(filas.map(r => String(r[idxPlanta]).trim()))].sort()
      const productos = headers.filter(h => h && !normalizarTexto(h).includes('PLANTA') && !normalizarTexto(h).includes('CODIGO') && !normalizarTexto(h).includes('USO INTERNO'))

      const resT = await fetch(topeVigente.url_archivo)
      const wbT = XLSX.read(await resT.arrayBuffer(), { type: 'array' })
      const sheetT = wbT.SheetNames.find(n => n.toLowerCase().includes('tope')) || wbT.SheetNames[0]
      const topeRows = XLSX.utils.sheet_to_json(wbT.Sheets[sheetT], { defval: '' })
      const cols = topeRows.length ? Object.keys(topeRows[0]) : []
      const colPlanta = cols.find(c => normalizarTexto(c) === 'PLANTA') || cols.find(c => normalizarTexto(c).includes('PLANTA'))
      const colAlmacen = cols.find(c => normalizarTexto(c).includes('ALMACEN'))
      const colArticulo = cols.find(c => normalizarTexto(c).includes('ARTICULO'))
      const colTopes = cols.filter(c => normalizarTexto(c).includes('TOPE'))
      if (!colPlanta || !colAlmacen || !colArticulo) throw new Error('El archivo de Topes no tiene columnas PLANTA / ALMACEN / ARTICULO.')

      // Columna Tope automática: primera columna que contenga "TOPE"
      const colTopeAuto = colTopes[0] || 'TOPE S/IGV'
      setCotColTope(colTopeAuto)
      setCotDatos({
        precioNombre: precioVigente.nombre_archivo,
        topeNombre: topeVigente.nombre_archivo,
        hojaUsada: sheetP, headers, idxPlanta, filas, plantas, productos,
        topeRows, colPlanta, colAlmacen, colArticulo, colTopes, colTopeAuto
      })
    } catch (e) {
      setCotErrorDatos(e.message)
      setCotDatos(null)
    } finally {
      setCotCargandoDatos(false)
    }
  }

  const ejecutarCotizacion = () => {
    setCotResultado(null)
    if (!cotDatos) return
    if (!cotPlanta || !cotProducto || !cotAlmacen || !cotColTope) return

    const d = cotDatos
    const factor = parseFloat(String(cotFactor).replace(',', '.')) || 0

    const fila = d.filas.find(r => normalizarTexto(r[d.idxPlanta]) === normalizarTexto(cotPlanta))
    const idxProd = d.headers.findIndex(h => normalizarTexto(h) === normalizarTexto(cotProducto))
    if (!fila || idxProd === -1) { toast.error(`No se encontró precio para ${cotProducto} en planta ${cotPlanta}`); return }
    const precioBase = parseFloat(String(fila[idxProd]).replace(',', '.'))
    if (isNaN(precioBase)) { toast.error('Precio base no válido'); return }

    const t = d.topeRows.find(r =>
      normalizarTexto(r[d.colPlanta]) === normalizarTexto(cotPlanta) &&
      normalizarTexto(r[d.colArticulo]) === normalizarTexto(cotProducto) &&
      normalizarTexto(r[d.colAlmacen]) === normalizarTexto(cotAlmacen)
    )
    if (!t) { toast.error(`No existe tope para ${cotProducto} / ${cotPlanta} / ${cotAlmacen}`); return }
    const tope = parseFloat(String(t[cotColTope]).replace(',', '.'))
    if (isNaN(tope)) { toast.error('El valor de tope no es numérico'); return }

    const topeAjustado = tope - factor
    const finalSinPercepcion = precioBase - topeAjustado * (1 + TASA_IGV)
    const finalConPercepcion = finalSinPercepcion * (1 + TASA_PERCEPCION)
    const cantidad = parseFloat(String(cotCantidad).replace(',', '.')) || 0
    const total = finalConPercepcion * cantidad

    setCotResultado({
      precioBase, tope, factor, topeAjustado, colTope: cotColTope,
      finalSinPercepcion, finalConPercepcion, cantidad, total,
      aplicarPercepcion: cotAplicarPercepcion
    })
  }

  useEffect(() => {
    if (vista === 'cotizar') {
      cargarDatosCotizador()
    }
  }, [vista, cotKey])

  useEffect(() => {
    if (vista !== 'cotizar' || !cotDatos) return
    if (!cotPlanta || !cotProducto || !cotAlmacen || !cotColTope) {
      setCotResultado(null)
      return
    }
    ejecutarCotizacion()
  }, [cotPlanta, cotProducto, cotAlmacen, cotColTope, cotFactor, cotAplicarPercepcion, vista, cotDatos])

  const generarPDFCotizacion = () => {
    if (!cotResultado) return toast.error('Selecciona los criterios para cotizar')
    const r = cotResultado
    const doc = new jsPDF()
    const nro = generarNumeroCotizacion()

    // Encabezado corporativo
    doc.setFillColor(11, 95, 165); doc.rect(0, 0, 210, 30, 'F')
    doc.setTextColor(255, 255, 255); doc.setFontSize(18); doc.setFont('helvetica', 'bold')
    doc.text('COTIZACIÓN DE COMBUSTIBLES', 14, 13)
    doc.setFontSize(11); doc.setFont('helvetica', 'normal')
    doc.text('HIDROMUNDO S.A.C.', 14, 21)

    // Datos del documento
    doc.setTextColor(60, 60, 60); doc.setFontSize(10)
    doc.text(`N°: ${nro}`, 14, 40)
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-PE')}`, 14, 46)
    doc.text(`Cliente: ${cotCliente || 'Cliente general'}`, 14, 52)
    doc.text(`Planta: ${cotPlanta}`, 130, 40)
    doc.text(`Almacén: ${cotAlmacen}`, 130, 46)

    // Determinar columnas según percepción
    const aplicaPercepcion = r.aplicarPercepcion
    const precioFinal = aplicaPercepcion ? r.finalConPercepcion : r.finalSinPercepcion
    const totalCalculado = r.cantidad > 0 ? precioFinal * r.cantidad : 0

    const head = aplicaPercepcion 
      ? [['PRODUCTO', 'P. BASE C/IGV', 'TOPE − FACTOR', 'FINAL C/IGV + PERC.', 'CANT. (GAL)', 'TOTAL (S/)']]
      : [['PRODUCTO', 'P. BASE C/IGV', 'TOPE − FACTOR', 'FINAL C/IGV', 'CANT. (GAL)', 'TOTAL (S/)']]

    const body = [[
      cotProducto,
      r.precioBase.toFixed(4),
      `${r.tope.toFixed(4)} − ${r.factor.toFixed(4)} = ${r.topeAjustado.toFixed(4)}`,
      precioFinal.toFixed(4),
      r.cantidad > 0 ? r.cantidad.toLocaleString('es-PE', { minimumFractionDigits: 2 }) : '—',
      r.cantidad > 0 ? totalCalculado.toFixed(2) : '—'
    ]]

    autoTable(doc, {
      startY: 60,
      head,
      body,
      theme: 'grid',
      headStyles: { fillColor: [11, 95, 165], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9, cellPadding: 4 },
      columnStyles: { 
        0: { halign: 'left' },
        1: { halign: 'right' }, 
        2: { halign: 'right' }, 
        3: { halign: 'right', fontStyle: 'bold' },
        4: { halign: 'center' },
        5: { halign: 'right', fontStyle: 'bold' }
      }
    })

    // Pie: solo validez
    let y = doc.lastAutoTable.finalY + 15
    doc.setFontSize(9); doc.setTextColor(80, 80, 80); doc.setFont('helvetica', 'italic')
    doc.text('Cotización válida por 3 días calendario.', 14, y)

    doc.save(`${nro}.pdf`)
    toast.success(`Cotización ${nro} generada`)
  }

  const renderHeader = () => (
    <header style={{ padding: '20px 40px', display: 'flex', alignItems: 'center', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
      <button onClick={() => vista === 'menu' ? setPantalla('') : setVista('menu')} style={btnHeaderStyle}>← {vista === 'menu' ? 'SIGMO' : 'Volver al Menú'}</button>
      <h1 style={{ margin: '0 0 0 15px', color: 'var(--primary-blue)', fontSize: '28px', fontWeight: '900' }}>
        {vista === 'menu' ? 'Precios, Topes & Cotización' : 'Gestión de Archivos'}
      </h1>
    </header>
  )

  // ===== MENÚ =====
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
            <div onClick={() => setVista('cotizar')} style={cardStyle}>
              <div style={{ fontSize: '50px', marginBottom: '15px' }}>🧾</div>
              <h3 style={{ color: 'var(--primary-blue)', marginBottom: '10px', fontSize: '18px' }}>Cotizar</h3>
              <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Genera cotizaciones con precios y topes vigentes.</p>
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

  // ===== VISUALIZAR =====
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

        {modalEliminarAbierto && (
          <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '450px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
              <h3 style={{ color: 'var(--danger-red)', marginTop: 0 }}>⚠️ Confirmar Eliminación</h3>
              <p>¿Eliminar permanentemente el archivo <strong>{archivoAEliminar?.nombre_archivo}</strong>?</p>
              <p style={{ fontSize: '13px', color: 'var(--text-light)' }}>Esta acción también borrará el archivo físico del servidor y no se puede deshacer.</p>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <Boton variante="outline" onClick={() => setModalEliminarAbierto(false)} style={{ flex: 1 }} disabled={eliminando}>Cancelar</Boton>
                <Boton variante="danger" onClick={confirmarEliminar} style={{ flex: 1 }} disabled={eliminando}>{eliminando ? 'Eliminando...' : 'Sí, Eliminar'}</Boton>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ===== CARGAR =====
  if (vista === 'cargar') {
    if (!puedeCargar) return <div style={{ padding: '50px', textAlign: 'center' }}><h2>No tienes permisos.</h2></div>
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
        {renderHeader()}
        <main style={{ padding: '40px 20px', maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button style={btnTabStyle(subVista === 'precios')} onClick={() => { setSubVista('precios'); setHojasPreview([]); setHojaActiva(0); setArchivoExcel(null); }}>📄 Cargar Precios</button>
            <button style={btnTabStyle(subVista === 'topes')} onClick={() => { setSubVista('topes'); setPreviewDataTope([]); setPreviewHeadersTope([]); setArchivoExcelTope(null); }}>📊 Cargar Topes</button>
          </div>
          <Card style={{ padding: '30px' }}>
            {subVista === 'precios' ? (
              <>
                <h2>Subir Lista de Precios</h2>
                <input type="file" accept=".xlsx" onChange={handleFileChange} style={{ marginTop: '15px' }} />
                {hojasPreview.length > 0 && (
                  <div style={{ marginTop: '30px' }}>
                    <h3 style={{ color: 'var(--primary-blue)', marginBottom: '15px', fontSize: '18px' }}>📋 Vista Previa: {archivoExcel.name}</h3>
                    {hojasPreview.length > 1 && (
                      <div style={{ display: 'flex', gap: '5px', marginBottom: '15px', flexWrap: 'wrap' }}>
                        {hojasPreview.map((hoja, i) => (
                          <button key={i} onClick={() => setHojaActiva(i)} style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', backgroundColor: hojaActiva === i ? 'var(--primary-blue)' : '#f3f4f6', color: hojaActiva === i ? 'white' : '#4b5563' }}>
                            {hoja.nombre}
                          </button>
                        ))}
                      </div>
                    )}
                    {hojasPreview[hojaActiva].rows.length > 0 ? (
                      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '20px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', tableLayout: 'fixed' }}>
                          <thead style={{ backgroundColor: 'var(--primary-blue)', color: 'white' }}>
                            <tr>
                              {hojasPreview[hojaActiva].headers.map((h, i) => {
                                const hn = normalizarTexto(h)
                                const esCodigo = hn.includes('CODIGO')
                                const esPlanta = hn.includes('PLANTA')
                                return (
                                  <th key={i} style={{ padding: '6px 3px', textAlign: esCodigo || esPlanta ? 'left' : 'center', whiteSpace: 'normal', wordBreak: 'break-word', fontSize: '9px', lineHeight: '1.2', borderBottom: '2px solid #1e293b', width: esCodigo ? '4.5%' : esPlanta ? '9%' : undefined }}>
                                    {String(h).trim()}
                                  </th>
                                )
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {hojasPreview[hojaActiva].rows.map((row, rI) => (
                              <tr key={rI} style={{ backgroundColor: rI % 2 === 0 ? 'white' : '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                {row.map((cell, cI) => (
                                  <td key={cI} style={{ padding: '5px 3px', color: '#374151', textAlign: cI <= 1 ? 'left' : 'center', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                    {typeof cell === 'number' ? (Number.isInteger(cell) ? cell : cell.toFixed(4)) : String(cell).trim()}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280', backgroundColor: '#f9fafb', borderRadius: '8px', marginBottom: '20px' }}>No hay datos de plantas válidos en esta hoja.</div>
                    )}
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <Boton variante="success" onClick={handleSubirArchivo} disabled={subiendo}>{subiendo ? '⏳ Subiendo...' : '✅ Confirmar y Subir'}</Boton>
                      <Boton variante="outline" onClick={() => { setArchivoExcel(null); setHojasPreview([]); setHojaActiva(0); }}>❌ Cancelar</Boton>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <h2>Subir Archivo de Topes</h2>
                <input type="file" accept=".xlsx" onChange={handleFileChangeTope} style={{ marginTop: '15px' }} />
                {previewDataTope.length > 0 && (
                  <div style={{ marginTop: '30px' }}>
                    <h3 style={{ color: '#059669', marginBottom: '15px', fontSize: '18px' }}>📋 Vista Previa: {archivoExcelTope.name}</h3>
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '20px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead style={{ backgroundColor: '#059669', color: 'white' }}>
                          <tr>{previewHeadersTope.map((h, i) => <th key={i} style={{ padding: '10px 8px', textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '2px solid #059669' }}>{String(h).trim()}</th>)}</tr>
                        </thead>
                        <tbody>
                          {previewDataTope.slice(0, 20).map((row, rI) => (
                            <tr key={rI} style={{ backgroundColor: rI % 2 === 0 ? 'white' : '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                              {row.map((cell, cI) => <td key={cI} style={{ padding: '8px', color: '#374151' }}>{typeof cell === 'number' ? (Number.isInteger(cell) ? cell : cell.toFixed(4)) : String(cell).trim()}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {previewDataTope.length > 20 && <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '15px' }}>Mostrando las primeras 20 filas de {previewDataTope.length} totales.</p>}
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <Boton variante="success" onClick={handleSubirTope} disabled={subiendoTope}>{subiendoTope ? '⏳ Subiendo...' : '✅ Confirmar y Subir'}</Boton>
                      <Boton variante="outline" onClick={() => { setArchivoExcelTope(null); setPreviewDataTope([]); setPreviewHeadersTope([]); }}>❌ Cancelar</Boton>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </main>
      </div>
    )
  }

  // ===== COMPARAR =====
  if (vista === 'comparar') {
    const filePrevio = archivos.find(a => a.id === idBase);
    const fileActual = archivos.find(a => a.id === idNuevo);
    const filePrevioTope = archivosTopes.find(a => a.id === idBaseTope);
    const fileActualTope = archivosTopes.find(a => a.id === idNuevoTope);

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
              <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Lista Previa</label>
                  <div style={{ padding: '10px', backgroundColor: '#f3f4f6', borderRadius: '8px', border: '1px solid #d1d5db', fontWeight: 'bold' }}>{filePrevio ? filePrevio.nombre_archivo : 'Cargando...'}</div>
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Lista Actual</label>
                  <div style={{ padding: '10px', backgroundColor: '#f3f4f6', borderRadius: '8px', border: '1px solid #d1d5db', fontWeight: 'bold' }}>{fileActual ? fileActual.nombre_archivo : 'Cargando...'}</div>
                </div>
                <div style={{ width: '200px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Hoja</label>
                  <select value={hojaComparar} onChange={(e) => setHojaComparar(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#1e293b', color: 'white', fontWeight: 'bold' }}>
                    <option value="Precio Base">Precio Base</option>
                    <option value="Precios Planta Sin IGV">Precios Planta Sin IGV</option>
                    <option value="Precios Planta Con IGV">Precios Planta Con IGV</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <Boton variante="primary" onClick={generarComparacion} style={{ height: '42px' }} disabled={cargandoComparacion}>{cargandoComparacion ? 'Comparando...' : '⚖️ Comparar Ahora'}</Boton>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Topes Previos</label>
                  <div style={{ padding: '10px', backgroundColor: '#f3f4f6', borderRadius: '8px', border: '1px solid #d1d5db', fontWeight: 'bold' }}>{filePrevioTope ? filePrevioTope.nombre_archivo : 'Cargando...'}</div>
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Topes Actuales</label>
                  <div style={{ padding: '10px', backgroundColor: '#f3f4f6', borderRadius: '8px', border: '1px solid #d1d5db', fontWeight: 'bold' }}>{fileActualTope ? fileActualTope.nombre_archivo : 'Cargando...'}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <Boton variante="success" onClick={generarComparacionTopes} style={{ height: '42px' }} disabled={cargandoComparacionTope}>{cargandoComparacionTope ? 'Comparando...' : '⚖️ Comparar Ahora'}</Boton>
                </div>
              </div>
            )}
          </Card>

          {tipoComparacion === 'precios' && datosComparados && (
            <Card style={{ padding: '20px' }}>
              <h2 style={{ margin: '0 0 15px 0', fontSize: '20px', color: 'var(--primary-blue)', textAlign: 'center' }}>Variación - {hojaComparar}</h2>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'center', tableLayout: 'fixed' }}>
                  <thead style={{ backgroundColor: '#1e293b', color: 'white' }}>
                    <tr>
                      <th style={{ padding: '10px 4px', width: '60px' }}>CÓD</th>
                      <th style={{ padding: '10px 4px', width: '90px' }}>PLANTAS</th>
                      {datosComparados.columnas.map((col, i) => <th key={i} style={{ padding: '10px 4px', wordBreak: 'break-word' }}>{col}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {datosComparados.rows.map((fila, rI) => (
                      <tr key={rI} style={{ borderBottom: '1px solid #eee', backgroundColor: rI % 2 === 0 ? 'white' : '#f9fafb' }}>
                        <td style={{ padding: '8px 4px', color: 'var(--text-light)' }}>{fila.codigo}</td>
                        <td style={{ padding: '8px 4px', fontWeight: 'bold' }}>{fila.planta}</td>
                        {datosComparados.columnas.map((col, cI) => {
                          const item = fila.variaciones[col];
                          if (item === 'NUEVO') return <td key={cI} style={{ color: '#3b82f6', fontWeight: 'bold' }}>NUEVO</td>;
                          if (!item) return <td key={cI} style={{ color: '#9ca3af' }}>-</td>;
                          if (Math.abs(item.diff) > 0.00001) return <td key={cI} style={{ color: item.diff > 0 ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>{item.diff > 0 ? '+' : ''}{item.diff.toFixed(4)}</td>;
                          return <td key={cI} style={{ color: '#6b7280' }}>0.0000</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {tipoComparacion === 'topes' && datosComparadosTope && (
            <Card style={{ padding: '20px' }}>
              <h2 style={{ margin: '0 0 15px 0', fontSize: '20px', color: '#059669', textAlign: 'center' }}>Variación de Topes</h2>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'center' }}>
                  <thead style={{ backgroundColor: '#059669', color: 'white' }}>
                    <tr><th style={{ padding: '10px' }}>PLANTA</th><th style={{ padding: '10px' }}>ALMACÉN</th><th style={{ padding: '10px' }}>ARTÍCULO</th><th style={{ padding: '10px' }}>VARIACIÓN (S/)</th></tr>
                  </thead>
                  <tbody>
                    {datosComparadosTope.map((fila, rI) => (
                      <tr key={rI} style={{ borderBottom: '1px solid #eee', backgroundColor: rI % 2 === 0 ? 'white' : '#f9fafb' }}>
                        <td style={{ padding: '8px', fontWeight: 'bold' }}>{fila.planta}</td>
                        <td style={{ padding: '8px' }}>{fila.almacen}</td>
                        <td style={{ padding: '8px' }}>{fila.articulo}</td>
                        <td style={{ padding: '8px' }}>
                          {fila.variacion === 'NUEVO' ? <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>NUEVO</span>
                          : fila.variacion && Math.abs(fila.variacion.diff) > 0.00001 ? <span style={{ color: fila.variacion.diff > 0 ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>{fila.variacion.diff > 0 ? '+' : ''}{fila.variacion.diff.toFixed(2)}</span>
                          : <span style={{ color: '#9ca3af' }}>0.00</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </main>
      </div>
    )
  }

  // ===== TENDENCIAS =====
  if (vista === 'tendencias') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
        {renderHeader()}
        <main style={{ padding: '40px 20px', maxWidth: '1100px', margin: '0 auto' }}>
          <Card style={{ padding: '30px', marginBottom: '20px' }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '22px', color: 'var(--text-dark)' }}>Análisis de Tendencias</h2>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>Hoja de Precio</label>
                <select value={hojaTendencia} onChange={(e) => setHojaTendencia(e.target.value)} style={selectStyle}>
                  <option value="Precio Base">Precio Base</option>
                  <option value="Precios Planta Sin IGV">Precios Planta Sin IGV</option>
                  <option value="Precios Planta Con IGV">Precios Planta Con IGV</option>
                </select>
              </div>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>Planta</label>
                <select value={plantaSeleccionada} onChange={(e) => setPlantaSeleccionada(e.target.value)} style={selectStyle}>
                  <option value="">Seleccione...</option>
                  {opcionesPlantas.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>Producto</label>
                <select value={productoSeleccionado} onChange={(e) => setProductoSeleccionado(e.target.value)} style={selectStyle}>
                  <option value="">Seleccione...</option>
                  {opcionesProductos.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <Boton variante="primary" onClick={cargarTendencias} disabled={cargandoTendencia || !plantaSeleccionada || !productoSeleccionado} style={{ height: '42px' }}>{cargandoTendencia ? 'Generando...' : '📈 Generar Gráfico'}</Boton>
            </div>
          </Card>

          {errorTendencia && (
            <Card style={{ padding: '20px', backgroundColor: '#fef2f2', border: '1px solid #f87171', marginBottom: '20px' }}>
              <p style={{ margin: 0, color: '#991b1b', fontWeight: 'bold' }}>⚠️ {errorTendencia}</p>
            </Card>
          )}

          {metricas && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
              <Card style={{ padding: '20px', textAlign: 'center', borderTop: '4px solid var(--primary-blue)' }}>
                <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: 'var(--text-light)', fontWeight: 'bold', textTransform: 'uppercase' }}>Precio Actual ({metricas.lineaReferencia})</p>
                <h3 style={{ margin: 0, fontSize: '24px', color: 'var(--primary-blue)' }}>S/ {metricas.actual.toFixed(4)}</h3>
              </Card>
              <Card style={{ padding: '20px', textAlign: 'center', borderTop: `4px solid ${metricas.variacion > 0 ? '#ef4444' : metricas.variacion < 0 ? '#10b981' : '#6b7280'}` }}>
                <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: 'var(--text-light)', fontWeight: 'bold', textTransform: 'uppercase' }}>Variación Reciente</p>
                <h3 style={{ margin: 0, fontSize: '24px', color: metricas.variacion > 0 ? '#ef4444' : metricas.variacion < 0 ? '#10b981' : '#6b7280' }}>{metricas.variacion > 0 ? '+' : ''}{metricas.variacion.toFixed(4)}</h3>
              </Card>
              <Card style={{ padding: '20px', textAlign: 'center', borderTop: '4px solid #10b981' }}>
                <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: 'var(--text-light)', fontWeight: 'bold', textTransform: 'uppercase' }}>Precio Mínimo</p>
                <h3 style={{ margin: 0, fontSize: '24px', color: '#166534' }}>S/ {metricas.min.toFixed(4)}</h3>
              </Card>
              <Card style={{ padding: '20px', textAlign: 'center', borderTop: '4px solid #ef4444' }}>
                <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: 'var(--text-light)', fontWeight: 'bold', textTransform: 'uppercase' }}>Precio Máximo</p>
                <h3 style={{ margin: 0, fontSize: '24px', color: '#991b1b' }}>S/ {metricas.max.toFixed(4)}</h3>
              </Card>
            </div>
          )}

          <Card style={{ padding: '20px', height: '500px', display: 'flex', flexDirection: 'column' }}>
            {cargandoTendencia ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>⏳</div>
                <p style={{ color: 'var(--primary-blue)', fontWeight: 'bold' }}>Analizando historial...</p>
              </div>
            ) : datosTendencia.length > 0 ? (
              <>
                <h3 style={{ textAlign: 'center', color: 'var(--primary-blue)', margin: '0 0 15px 0', fontSize: '18px', fontWeight: 'bold' }}>
                  Tendencia Histórica: {hojaTendencia} ({plantaSeleccionada !== 'TODOS' ? plantaSeleccionada : 'Todas las Plantas'} - {productoSeleccionado !== 'TODOS' ? productoSeleccionado : 'Todos los Productos'})
                </h3>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                  <button onClick={exportarTendenciaExcel} style={{ padding: '6px 12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>⬇️ Exportar Excel</button>
                </div>
                <div style={{ width: '100%', height: '100%', minHeight: '350px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={datosTendencia} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="fecha" tick={{ fontSize: 12, fill: '#64748b' }} tickMargin={10} />
                      <YAxis domain={['auto', 'auto']} tickFormatter={(val) => val.toFixed(2)} tick={{ fontSize: 12, fill: '#64748b' }} width={60} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '15px' }} />
                      {lineasDinamicas.map((linea, index) => (
                        <Line key={linea} type="monotone" dataKey={linea} name={linea} stroke={COLORS[index % COLORS.length]} strokeWidth={3} dot={{ r: 3, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} connectNulls />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-light)' }}>
                <div style={{ fontSize: '50px', marginBottom: '15px' }}>📉</div>
                <h3 style={{ margin: 0 }}>Sin datos para mostrar</h3>
                <p>Selecciona una planta y un producto para generar el gráfico.</p>
              </div>
            )}
          </Card>
        </main>
      </div>
    )
  }

  // ===== COTIZAR =====
  if (vista === 'cotizar') {
    const d = cotDatos
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
        {renderHeader()}
        <main style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>

          {/* Fuentes vigentes */}
          <Card style={{ padding: '15px 20px', marginBottom: '15px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', textAlign: 'left' }}>
            {cotCargandoDatos ? (
              <p style={{ margin: 0, color: '#1e40af', fontWeight: 'bold' }}>⏳ Cargando archivos vigentes...</p>
            ) : cotErrorDatos ? (
              <div>
                <p style={{ margin: '0 0 10px 0', color: '#991b1b', fontWeight: 'bold' }}>⚠️ {cotErrorDatos}</p>
                <Boton variante="outline" tamano="sm" onClick={() => setCotKey(k => k + 1)}>🔄 Reintentar</Boton>
              </div>
            ) : d ? (
              <p style={{ margin: 0, fontSize: '13px', color: '#1e40af' }}>
                📌 <strong>Fuentes:</strong> {d.precioNombre} <em>(hoja {d.hojaUsada})</em> &nbsp;|&nbsp; {d.topeNombre}
              </p>
            ) : null}
          </Card>

          {/* Criterios */}
          <Card style={{ padding: '30px', marginBottom: '20px' }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '22px', color: 'var(--text-dark)', textAlign: 'center' }}>🧾 Cotizar Combustibles</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px' }}>
              {/* Hoja de Precio FIJA - mismo estilo que selects */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px' }}>Hoja de Precio</label>
                <div style={readOnlyFieldStyle}>
                  {HOJA_PRECIO_COTIZACION}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px' }}>Planta</label>
                <select value={cotPlanta} onChange={(e) => setCotPlanta(e.target.value)} style={selectStyle} disabled={!d}>
                  <option value="">Seleccione...</option>
                  {d?.plantas?.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px' }}>Producto</label>
                <select value={cotProducto} onChange={(e) => setCotProducto(e.target.value)} style={selectStyle} disabled={!d}>
                  <option value="">Seleccione...</option>
                  {d?.productos?.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px' }}>Almacén</label>
                <select value={cotAlmacen} onChange={(e) => setCotAlmacen(e.target.value)} style={selectStyle} disabled={!d}>
                  <option value="">Seleccione...</option>
                  {d?.topeRows ? [...new Set(d.topeRows.map(r => String(r[d?.colAlmacen] || '').trim()).filter(Boolean))].sort().map(a => <option key={a} value={a}>{a}</option>) : null}
                </select>
              </div>
              {/* Columna Tope FIJA - mismo estilo que Hoja de Precio */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px' }}>Columna Tope</label>
                <div style={readOnlyFieldStyle}>
                  {cotColTope}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px' }}>FACTOR (numérico)</label>
                <input type="number" min="0" step="0.0001" value={cotFactor} onChange={(e) => setCotFactor(e.target.value)} placeholder="0.00" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px', whiteSpace: 'nowrap' }}>Cantidad (Galones) — opcional</label>
                <input type="number" min="0" step="0.01" value={cotCantidad} onChange={(e) => setCotCantidad(e.target.value)} placeholder="0.00" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px' }}>Cliente — opcional</label>
                <input type="text" value={cotCliente} onChange={(e) => setCotCliente(e.target.value)} placeholder="Nombre del cliente" style={inputStyle} />
              </div>
            </div>

            {/* Checkbox percepción */}
            <div style={{ marginTop: '20px', padding: '12px 16px', backgroundColor: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input type="checkbox" id="aplicarPercepcion" checked={cotAplicarPercepcion} onChange={(e) => setCotAplicarPercepcion(e.target.checked)} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
              <label htmlFor="aplicarPercepcion" style={{ cursor: 'pointer', fontWeight: 'bold', color: '#92400e', fontSize: '14px' }}>
                Aplicar Percepción ({(TASA_PERCEPCION * 100).toFixed(0)}%) — multiplicar precio final × {(1 + TASA_PERCEPCION).toFixed(2)}
              </label>
            </div>
          </Card>

          {/* Desglose */}
          {cotResultado && (
            <Card style={{ padding: '30px' }}>
              <h3 style={{ marginTop: 0, color: 'var(--primary-blue)', textAlign: 'center' }}>📊 Desglose de la Cotización</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div style={{ backgroundColor: '#f9fafb', borderLeft: '4px solid var(--primary-blue)', padding: '12px 16px', borderRadius: '6px' }}>
                  <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>PASO 1 — Precio Base C/IGV ({cotProducto} en {cotPlanta})</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: 'bold', color: 'var(--primary-blue)' }}>S/ {cotResultado.precioBase.toFixed(4)}</p>
                </div>
                <div style={{ backgroundColor: '#f9fafb', borderLeft: '4px solid #f59e0b', padding: '12px 16px', borderRadius: '6px' }}>
                  <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>PASO 2 — {cotResultado.colTope} ({cotAlmacen}) − FACTOR ({cotResultado.factor.toFixed(4)})</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: 'bold', color: '#b45309' }}>S/ {cotResultado.tope.toFixed(4)} − {cotResultado.factor.toFixed(4)} = {cotResultado.topeAjustado.toFixed(4)}</p>
                </div>
                <div style={{ backgroundColor: '#f9fafb', borderLeft: '4px solid #10b981', padding: '12px 16px', borderRadius: '6px' }}>
                  <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>PASO 3 — Precio Final C/IGV = {cotResultado.precioBase.toFixed(4)} − ({cotResultado.topeAjustado.toFixed(4)} × {1 + TASA_IGV})</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: 'bold', color: '#047857' }}>S/ {cotResultado.finalSinPercepcion.toFixed(4)}</p>
                </div>
                {cotAplicarPercepcion && (
                  <div style={{ backgroundColor: '#eff6ff', border: '2px solid var(--primary-blue)', padding: '12px 16px', borderRadius: '6px' }}>
                    <p style={{ margin: 0, fontSize: '12px', color: '#1e40af', fontWeight: 'bold' }}>PRECIO FINAL C/IGV + PERCEPCIÓN ({(TASA_PERCEPCION * 100).toFixed(0)}%) = {cotResultado.finalSinPercepcion.toFixed(4)} × {(1 + TASA_PERCEPCION).toFixed(2)}</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '900', color: 'var(--primary-blue)' }}>S/ {cotResultado.finalConPercepcion.toFixed(4)}</p>
                  </div>
                )}
                {cotResultado.cantidad > 0 && (
                  <div style={{ backgroundColor: '#0f172a', padding: '12px 16px', borderRadius: '6px', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', fontWeight: 'bold' }}>
                      TOTAL: {cotResultado.cantidad.toLocaleString('es-PE')} gal × S/ {(cotAplicarPercepcion ? cotResultado.finalConPercepcion : cotResultado.finalSinPercepcion).toFixed(4)}
                    </p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '900', color: '#10b981' }}>
                      S/ {(cotAplicarPercepcion ? cotResultado.total : cotResultado.finalSinPercepcion * cotResultado.cantidad).toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <Boton variante="primary" onClick={generarPDFCotizacion}>📄 Generar PDF de Cotización</Boton>
                <Boton variante="outline" onClick={() => { setCotPlanta(''); setCotProducto(''); setCotAlmacen(''); setCotFactor(''); setCotCantidad(''); setCotResultado(null); }}>🔄 Nueva Cotización</Boton>
              </div>
            </Card>
          )}
        </main>
      </div>
    )
  }

  // ===== AUDITORÍA =====
  if (vista === 'auditoria') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
        {renderHeader()}
        <main style={{ padding: '40px 20px', maxWidth: '1000px', margin: '0 auto' }}>
          <Card>
            <h2>Auditoría General</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead style={{ backgroundColor: 'var(--primary-blue)', color: 'white' }}>
                <tr><th style={{ padding: '12px' }}>FECHA</th><th style={{ padding: '12px' }}>MÓDULO</th><th style={{ padding: '12px' }}>ACCIÓN</th><th style={{ padding: '12px' }}>ARCHIVO</th></tr>
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
}