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
  const [subVista, setSubVista] = useState('precios') // 'precios' | 'topes'
  
  // --- ESTADOS PARA PRECIOS ---
  const [archivos, setArchivos] = useState([])
  const [cargando, setCargando] = useState(false)
  const [archivoExcel, setArchivoExcel] = useState(null)
  const [subiendo, setSubiendo] = useState(false)
  const [previewData, setPreviewData] = useState([])
  const [previewHeaders, setPreviewHeaders] = useState([])

  // --- ESTADOS PARA TOPES ---
  const [archivosTopes, setArchivosTopes] = useState([])
  const [cargandoTopes, setCargandoTopes] = useState(false)
  const [archivoExcelTope, setArchivoExcelTope] = useState(null)
  const [subiendoTope, setSubiendoTope] = useState(false)
  const [previewDataTope, setPreviewDataTope] = useState([])
  const [previewHeadersTope, setPreviewHeadersTope] = useState([])

  // --- ESTADOS DE COMPARACIÓN ---
  const [tipoComparacion, setTipoComparacion] = useState('precios') // 'precios' | 'topes'
  
  // Comparación Precios
  const [idBase, setIdBase] = useState('')
  const [idNuevo, setIdNuevo] = useState('')
  const [hojaComparar, setHojaComparar] = useState('Precio Base')
  const [datosComparados, setDatosComparados] = useState(null)
  const [cargandoComparacion, setCargandoComparacion] = useState(false)

  // Comparación Topes
  const [idBaseTope, setIdBaseTope] = useState('')
  const [idNuevoTope, setIdNuevoTope] = useState('')
  const [datosComparadosTope, setDatosComparadosTope] = useState(null)
  const [cargandoComparacionTope, setCargandoComparacionTope] = useState(false)

  // --- ESTADOS DE AUDITORÍA ---
  const [auditoria, setAuditoria] = useState([])

  // --- ESTADOS PARA TENDENCIAS ---
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

  // --- MODALES ---
  const [modalEliminarAbierto, setModalEliminarAbierto] = useState(false)
  const [archivoAEliminar, setArchivoAEliminar] = useState(null)
  const [eliminando, setEliminando] = useState(false)

  const rolesCarga = ['admin_sistema', 'analista_comercial', 'jefe_pricing']
  const puedeCargar = rolesCarga.includes(rol)
  const puedeGestionar = ['admin_sistema', 'jefe_pricing'].includes(rol)

  // --- LÓGICA DE ARCHIVOS ---
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
    if (vista === 'comparar' || vista === 'tendencias') fetchArchivos()
    if (vista === 'auditoria') fetchAuditoria()
  }, [vista, subVista])

  useEffect(() => {
    if (vista === 'comparar' && archivos.length > 0) {
      const ordenados = [...archivos].sort((a, b) => extraerFecha(b.nombre_archivo).localeCompare(extraerFecha(a.nombre_archivo)));
      if (ordenados.length >= 1) setIdNuevo(ordenados[0].id);
      if (ordenados.length >= 2) setIdBase(ordenados[1].id);
      else setIdBase('');
    }
    if (vista === 'comparar' && archivosTopes.length > 0) {
      const ordenadosT = [...archivosTopes].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      if (ordenadosT.length >= 1) setIdNuevoTope(ordenadosT[0].id);
      if (ordenadosT.length >= 2) setIdBaseTope(ordenadosT[1].id);
      else setIdBaseTope('');
    }
  }, [vista, archivos, archivosTopes]);

  async function fetchArchivos() {
    setCargando(true)
    const { data, error } = await supabase.from('precios_archivos').select('*')
    if (!error) {
      let lista = data || []
      lista.sort((a, b) => {
        if (a.es_vigente && !b.es_vigente) return -1;
        if (!a.es_vigente && b.es_vigente) return 1;
        const fA = extraerFecha(a.nombre_archivo);
        const fB = extraerFecha(b.nombre_archivo);
        if (fA !== fB) return fB.localeCompare(fA);
        return new Date(b.created_at) - new Date(a.created_at);
      });
      setArchivos(lista);
    }
    setCargando(false)
  }

  async function fetchArchivosTopes() {
    setCargandoTopes(true)
    const { data, error } = await supabase.from('topes_archivos').select('*').order('created_at', { ascending: false })
    if (!error) setArchivosTopes(data || [])
    setCargandoTopes(false)
  }

  async function fetchAuditoria() {
    const { data: pAud } = await supabase.from('precios_auditoria').select('*').order('created_at', { ascending: false })
    const { data: tAud } = await supabase.from('topes_auditoria').select('*').order('created_at', { ascending: false })
    
    let combinada = [
      ...(pAud || []).map(x => ({...x, origen: 'PRECIOS'})), 
      ...(tAud || []).map(x => ({...x, origen: 'TOPES'}))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    setAuditoria(combinada)
  }

  async function registrarAuditoria(id_archivo, nombre_archivo, accion, tipo = 'precios') {
    const { data: { user } } = await supabase.auth.getUser()
    const tabla = tipo === 'precios' ? 'precios_auditoria' : 'topes_auditoria'
    await supabase.from(tabla).insert({ id_archivo, nombre_archivo, accion, usuario: user.email })
  }

  // --- CARGA DE PRECIOS ---
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setArchivoExcel(file)
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
        let headerIndex = data.findIndex(row => row.includes('PLANTAS'))
        if (headerIndex === -1) headerIndex = 0
        setPreviewHeaders(data[headerIndex])
        setPreviewData(data.slice(headerIndex + 1).filter(row => row.some(cell => cell !== '')))
      } catch (error) {
        toast.error('Error al leer el archivo Excel')
        setArchivoExcel(null)
      }
    }
    reader.readAsBinaryString(file)
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
      const { data: insertedData, error: dbError } = await supabase.from('precios_archivos').insert({
        nombre_archivo: archivoExcel.name, url_archivo: publicUrl, subido_por: user.email, es_vigente: true
      }).select()

      if (dbError) throw dbError
      if (!insertedData) throw new Error('Bloqueado por RLS')
      
      await registrarAuditoria(insertedData[0].id, archivoExcel.name, 'SUBIDA', 'precios')
      toast.success('Lista de Precios subida exitosamente')
      setArchivoExcel(null)
      setPreviewData([])
      setVista('menu')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSubiendo(false)
    }
  }

  // --- CARGA DE TOPES ---
  const handleFileChangeTope = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setArchivoExcelTope(file)

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
        
        let headerIndex = data.findIndex(row => row.some(cell => normalizarTexto(cell).includes('PLANTA')))
        if (headerIndex === -1) headerIndex = 0

        setPreviewHeadersTope(data[headerIndex])
        setPreviewDataTope(data.slice(headerIndex + 1).filter(row => row.some(cell => cell !== '')))
      } catch (error) {
        toast.error('Error al leer el archivo Excel de Topes')
        setArchivoExcelTope(null)
      }
    }
    reader.readAsBinaryString(file)
  }

  async function handleSubirTope() {
    if (!archivoExcelTope) return toast.error('No hay archivo de topes seleccionado')
    setSubiendoTope(true)
    try {
      const nombreLimpio = archivoExcelTope.name.replace(/\s+/g, '_')
      const fileName = `topes/${Date.now()}_${nombreLimpio}`
      
      const { error: uploadError } = await supabase.storage.from('documentos_sigmo').upload(fileName, archivoExcelTope)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('documentos_sigmo').getPublicUrl(fileName)
      const { data: { user } } = await supabase.auth.getUser()

      await supabase.from('topes_archivos').update({ es_vigente: false }).eq('es_vigente', true)

      const { data: insertedData, error: dbError } = await supabase.from('topes_archivos').insert({
        nombre_archivo: archivoExcelTope.name,
        url_archivo: publicUrl,
        subido_por: user.email,
        es_vigente: true
      }).select()

      if (dbError) throw dbError
      if (!insertedData) throw new Error('No se pudo registrar (RLS).')
      
      await registrarAuditoria(insertedData[0].id, archivoExcelTope.name, 'SUBIDA', 'topes')
      toast.success('Archivo de Topes subido como VIGENTE')
      setArchivoExcelTope(null)
      setPreviewDataTope([])
      setVista('menu')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSubiendoTope(false)
    }
  }

  // --- COMPARACIÓN DE PRECIOS ---
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
        const planta = normalizarTexto(row[idxPlantaBase]);
        if (planta && !planta.includes('TOTAL')) baseMap[planta] = row;
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
        const planta = normalizarTexto(nuevaRow[idxPlantaNew]);
        if (!planta || planta.includes('TOTAL')) return;
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
        comparacion.push({ codigo: idxCodigoNew !== -1 ? nuevaRow[idxCodigoNew] : '', planta: nuevaRow[idxPlantaNew], variaciones });
      });

      setDatosComparados({ columnas: columnasComparar.map(c => c.titulo), rows: comparacion });
    } catch (error) {
      toast.error('Error al comparar: ' + error.message);
    } finally {
      setCargandoComparacion(false);
    }
  };

  // --- COMPARACIÓN DE TOPES ---
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

        if (!planta || !articulo || isNaN(valorNuevo)) return;

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

  // --- EXPORTACIONES ---
  const exportarComparacionExcel = () => {
    if (!datosComparados) return;
    const headerRow = ['CÓDIGO', 'PLANTAS', ...datosComparados.columnas];
    const excelData = [headerRow];
    datosComparados.rows.forEach(fila => {
      const row = [fila.codigo, fila.planta];
      datosComparados.columnas.forEach(col => {
        const item = fila.variaciones[col];
        if (item === 'NUEVO') row.push('NUEVO');
        else if (item && Math.abs(item.diff) > 0.00001) row.push(`${item.diff > 0 ? '+' : ''}${item.diff.toFixed(4)}`);
        else if (item) row.push('0.0000');
        else row.push('-');
      });
      excelData.push(row);
    });
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Variación');
    XLSX.writeFile(wb, `Variacion_Precios_${hojaComparar}.xlsx`);
    toast.success('Excel descargado');
  };

  const exportarComparacionTopesExcel = () => {
    if (!datosComparadosTope) return;
    const excelData = [['PLANTA', 'ALMACÉN', 'ARTÍCULO', 'VARIACIÓN (S/)']];
    datosComparadosTope.forEach(fila => {
      let valStr = '-';
      if (fila.variacion === 'NUEVO') valStr = 'NUEVO';
      else if (fila.variacion && Math.abs(fila.variacion.diff) > 0.00001) valStr = `${fila.variacion.diff > 0 ? '+' : ''}${fila.variacion.diff.toFixed(2)}`;
      else if (fila.variacion) valStr = '0.00';
      excelData.push([fila.planta, fila.almacen, fila.articulo, valStr]);
    });
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Variación Topes');
    XLSX.writeFile(wb, `Variacion_Topes.xlsx`);
    toast.success('Excel de Topes descargado');
  };

  // --- GESTIÓN DE ARCHIVOS (ELIMINAR / VIGENTE) ---
  const marcarComoVigente = async (id, nombre, tipo = 'precios') => {
    const tabla = tipo === 'precios' ? 'precios_archivos' : 'topes_archivos'
    try {
      await supabase.from(tabla).update({ es_vigente: false }).eq('es_vigente', true)
      const { data, error } = await supabase.from(tabla).update({ es_vigente: true }).eq('id', id).select()
      if (error) throw error
      if (!data || data.length === 0) throw new Error('No se pudo marcar como vigente (RLS).')
      await registrarAuditoria(id, nombre, 'VIGENTE', tipo)
      toast.success('Marcado como VIGENTE')
      if (tipo === 'precios') fetchArchivos(); else fetchArchivosTopes();
    } catch (error) {
      toast.error('Error: ' + error.message)
    }
  }

  const confirmarEliminar = async () => {
    if (!archivoAEliminar) return
    setEliminando(true)
    const esTope = archivoAEliminar.tipo === 'topes';
    const tabla = esTope ? 'topes_archivos' : 'precios_archivos';
    try {
      const urlParts = archivoAEliminar.url_archivo.split('/documentos_sigmo/')
      const filePath = urlParts[1]
      if (filePath) await supabase.storage.from('documentos_sigmo').remove([filePath])
      
      const { data, error: dbError } = await supabase.from(tabla).delete().eq('id', archivoAEliminar.id).select()
      if (dbError) throw dbError
      if (!data || data.length === 0) throw new Error('No se pudo eliminar (RLS).')

      await registrarAuditoria(archivoAEliminar.id, archivoAEliminar.nombre_archivo, 'ELIMINACION', esTope ? 'topes' : 'precios')
      toast.success('Archivo eliminado')
      setModalEliminarAbierto(false)
      setArchivoAEliminar(null)
      if (esTope) fetchArchivosTopes(); else fetchArchivos();
    } catch (error) {
      toast.error('Error: ' + error.message)
    } finally {
      setEliminando(false)
    }
  }

  const renderHeader = () => (
    <header style={{ padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <button onClick={() => vista === 'menu' ? setPantalla('') : setVista('menu')} style={btnHeaderStyle}>
          ← {vista === 'menu' ? 'SIGMO' : 'Volver al Menú'}
        </button>
        <h1 style={{ margin: 0, color: 'var(--primary-blue)', fontSize: '28px', fontWeight: '900' }}>
          {vista === 'menu' ? 'Precios, Topes & Cotización' : 'Gestión de Archivos'}
        </h1>
      </div>
    </header>
  )

  // --- VISTA 1: MENÚ PRINCIPAL ---
  if (vista === 'menu') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)', display: 'flex', flexDirection: 'column' }}>
        {renderHeader()}
        <main style={{ flex: 1, padding: '40px 20px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ color: 'var(--text-dark)', fontSize: '24px', marginBottom: '10px' }}>Precios, Topes & Cotización</h2>
            <p style={{ color: 'var(--text-light)' }}>Selecciona una acción para continuar</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <div onClick={() => { setVista('visualizar'); setSubVista('precios'); }} style={cardStyle} onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary-blue)'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}>
              <div style={{ fontSize: '50px', marginBottom: '15px' }}>👁️</div>
              <h3 style={{ color: 'var(--primary-blue)', marginBottom: '10px', fontSize: '18px' }}>Visualizar Listas & Topes</h3>
              <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Ver, buscar y descargar archivos Excel.</p>
            </div>

            {puedeCargar && (
              <div onClick={() => { setVista('cargar'); setSubVista('precios'); }} style={cardStyle} onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary-blue)'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}>
                <div style={{ fontSize: '50px', marginBottom: '15px' }}>📤</div>
                <h3 style={{ color: 'var(--primary-blue)', marginBottom: '10px', fontSize: '18px' }}>Cargar Nueva Lista & Topes</h3>
                <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Sube y previsualiza archivos Excel.</p>
              </div>
            )}

            <div onClick={() => { setVista('comparar'); setTipoComparacion('precios'); }} style={cardStyle} onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary-blue)'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}>
              <div style={{ fontSize: '50px', marginBottom: '15px' }}>⚖️</div>
              <h3 style={{ color: 'var(--primary-blue)', marginBottom: '10px', fontSize: '18px' }}>Comparar Archivos</h3>
              <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Contrasta variaciones de precios o topes.</p>
            </div>

            <div onClick={() => setVista('tendencias')} style={cardStyle} onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary-blue)'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}>
              <div style={{ fontSize: '50px', marginBottom: '15px' }}>📈</div>
              <h3 style={{ color: 'var(--primary-blue)', marginBottom: '10px', fontSize: '18px' }}>Gráfico de Tendencias</h3>
              <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Evolución histórica de precios.</p>
            </div>

            <div onClick={() => setVista('auditoria')} style={cardStyle} onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary-blue)'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}>
              <div style={{ fontSize: '50px', marginBottom: '15px' }}>📋</div>
              <h3 style={{ color: 'var(--primary-blue)', marginBottom: '10px', fontSize: '18px' }}>Auditoría General</h3>
              <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Historial de cambios en precios y topes.</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // --- VISTA 2: VISUALIZAR ---
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
            <Boton variante="outline" onClick={() => { 
              if(subVista === 'precios') setTipoComparacion('precios'); else setTipoComparacion('topes');
              setVista('comparar'); 
            }} style={{ color: 'var(--primary-blue)' }}>
              ⚖️ Comparar {subVista === 'precios' ? 'Precios' : 'Topes'}
            </Boton>
          </div>

          {subVista === 'precios' ? (
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead style={{ backgroundColor: 'var(--primary-blue)', color: 'white', textAlign: 'left' }}>
                  <tr>
                    <th style={{ padding: '15px' }}>FECHA</th>
                    <th style={{ padding: '15px' }}>NOMBRE</th>
                    <th style={{ padding: '15px', textAlign: 'center' }}>ESTADO</th>
                    <th style={{ padding: '15px', textAlign: 'center' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {archivos.map(file => (
                    <tr key={file.id} style={{ borderBottom: '1px solid #eee', backgroundColor: file.es_vigente ? '#f0fdf4' : 'white' }}>
                      <td style={{ padding: '15px' }}>{new Date(file.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '15px', fontWeight: 'bold' }}>📄 {file.nombre_archivo}</td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        {file.es_vigente ? <span style={{ backgroundColor: '#DCFCE7', color: '#166534', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>VIGENTE</span> : 'HISTÓRICO'}
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        {puedeGestionar && !file.es_vigente && (
                          <Boton variante="success" tamano="sm" onClick={() => marcarComoVigente(file.id, file.nombre_archivo, 'precios')}>✅</Boton>
                        )}
                        {puedeGestionar && (
                          <Boton variante="danger" tamano="sm" onClick={() => { setArchivoAEliminar({...file, tipo: 'precios'}); setModalEliminarAbierto(true); }}>🗑️</Boton>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ) : (
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead style={{ backgroundColor: '#059669', color: 'white', textAlign: 'left' }}>
                  <tr>
                    <th style={{ padding: '15px' }}>FECHA</th>
                    <th style={{ padding: '15px' }}>NOMBRE DEL TOPE</th>
                    <th style={{ padding: '15px', textAlign: 'center' }}>ESTADO</th>
                    <th style={{ padding: '15px', textAlign: 'center' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {archivosTopes.map(file => (
                    <tr key={file.id} style={{ borderBottom: '1px solid #eee', backgroundColor: file.es_vigente ? '#f0fdf4' : 'white' }}>
                      <td style={{ padding: '15px' }}>{new Date(file.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '15px', fontWeight: 'bold' }}>📊 {file.nombre_archivo}</td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        {file.es_vigente ? <span style={{ backgroundColor: '#DCFCE7', color: '#166534', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>VIGENTE</span> : 'HISTÓRICO'}
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        {puedeGestionar && !file.es_vigente && (
                          <Boton variante="success" tamano="sm" onClick={() => marcarComoVigente(file.id, file.nombre_archivo, 'topes')}>✅</Boton>
                        )}
                        {puedeGestionar && (
                          <Boton variante="danger" tamano="sm" onClick={() => { setArchivoAEliminar({...file, tipo: 'topes'}); setModalEliminarAbierto(true); }}>🗑️</Boton>
                        )}
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

  // --- VISTA 3: CARGAR ---
  if (vista === 'cargar') {
    if (!puedeCargar) return <div style={{ padding: '50px', textAlign: 'center' }}><h2>No tienes permisos.</h2></div>
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
        {renderHeader()}
        <main style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button style={btnTabStyle(subVista === 'precios')} onClick={() => setSubVista('precios')}>📄 Cargar Lista de Precios</button>
            <button style={btnTabStyle(subVista === 'topes')} onClick={() => setSubVista('topes')}>📊 Cargar Archivo de Topes</button>
          </div>

          {subVista === 'precios' ? (
            <>
              <Card style={{ padding: '30px', marginBottom: '20px' }}>
                <h2 style={{ margin: '0 0 15px 0', fontSize: '22px' }}>Subir Lista de Precios</h2>
                <input type="file" accept=".xlsx, .xls" onChange={handleFileChange} />
                {archivoExcel && <span style={{ marginLeft: '15px', color: 'var(--primary-blue)', fontWeight: 'bold' }}>✅ {archivoExcel.name}</span>}
              </Card>
              {previewData.length > 0 && (
                <Card style={{ padding: '30px' }}>
                  <h3>Previsualización de Precios</h3>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <Boton variante="success" onClick={handleSubirArchivo} disabled={subiendo}>{subiendo ? 'Subiendo...' : 'Confirmar y Subir Precios'}</Boton>
                  </div>
                </Card>
              )}
            </>
          ) : (
            <>
              <Card style={{ padding: '30px', marginBottom: '20px' }}>
                <h2 style={{ margin: '0 0 15px 0', fontSize: '22px' }}>Subir Archivo de Topes</h2>
                <p style={{ color: 'var(--text-light)', fontSize: '14px', marginBottom: '15px' }}>Asegúrate de que el archivo contenga las columnas PLANTA, ALMACEN, ARTICULO y TOPE S/IGV.</p>
                <input type="file" accept=".xlsx, .xls" onChange={handleFileChangeTope} />
                {archivoExcelTope && <span style={{ marginLeft: '15px', color: '#059669', fontWeight: 'bold' }}>✅ {archivoExcelTope.name}</span>}
              </Card>
              {previewDataTope.length > 0 && (
                <Card style={{ padding: '30px' }}>
                  <h3>Previsualización de Topes</h3>
                  <div style={{ overflowX: 'auto', marginTop: '15px', border: '1px solid #e5e7eb' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                      <thead style={{ backgroundColor: '#059669', color: 'white' }}>
                        <tr>{previewHeadersTope.map((h, i) => <th key={i} style={{ padding: '10px' }}>{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {previewDataTope.map((row, rI) => (
                          <tr key={rI} style={{ borderBottom: '1px solid #eee' }}>
                            {row.map((cell, cI) => <td key={cI} style={{ padding: '8px' }}>{cell}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                    <Boton variante="success" onClick={handleSubirTope} disabled={subiendoTope}>{subiendoTope ? 'Subiendo...' : 'Confirmar y Subir Topes'}</Boton>
                  </div>
                </Card>
              )}
            </>
          )}
        </main>
      </div>
    )
  }

  // --- VISTA 4: COMPARAR ---
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
            <button style={btnTabStyle(tipoComparacion === 'precios')} onClick={() => setTipoComparacion('precios')}>📄 Comparar Precios</button>
            <button style={btnTabStyle(tipoComparacion === 'topes')} onClick={() => setTipoComparacion('topes')}>📊 Comparar Topes</button>
          </div>

          <Card style={{ padding: '30px', marginBottom: '20px' }}>
            {tipoComparacion === 'precios' ? (
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Lista Previa</label>
                  <select value={idBase} onChange={(e) => setIdBase(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                    {archivos.map(a => <option key={a.id} value={a.id}>{a.nombre_archivo}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Lista Actual</label>
                  <select value={idNuevo} onChange={(e) => setIdNuevo(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                    {archivos.map(a => <option key={a.id} value={a.id}>{a.nombre_archivo}</option>)}
                  </select>
                </div>
                <div style={{ width: '200px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Hoja</label>
                  <select value={hojaComparar} onChange={(e) => setHojaComparar(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: '#1e293b', color: 'white' }}>
                    <option value="Precio Base">Precio Base</option>
                    <option value="Precios Planta Sin IGV">Precios Planta Sin IGV</option>
                    <option value="Precios Planta Con IGV">Precios Planta Con IGV</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
                  <Boton variante="primary" onClick={generarComparacion} style={{ height: '40px' }}>⚖️ Comparar</Boton>
                  {datosComparados && (
                    <Boton variante="success" onClick={exportarComparacionExcel} style={{ height: '40px' }}>⬇️ Excel</Boton>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Topes Previos</label>
                  <select value={idBaseTope} onChange={(e) => setIdBaseTope(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                    {archivosTopes.map(a => <option key={a.id} value={a.id}>{a.nombre_archivo}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Topes Actuales</label>
                  <select value={idNuevoTope} onChange={(e) => setIdNuevoTope(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                    {archivosTopes.map(a => <option key={a.id} value={a.id}>{a.nombre_archivo}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
                  <Boton variante="success" onClick={generarComparacionTopes} style={{ height: '40px' }}>⚖️ Comparar Topes</Boton>
                  {datosComparadosTope && (
                    <Boton variante="success" onClick={exportarComparacionTopesExcel} style={{ height: '40px' }}>⬇️ Excel</Boton>
                  )}
                </div>
              </div>
            )}
          </Card>

          {tipoComparacion === 'precios' && datosComparados && (
            <Card style={{ padding: '20px' }}>
              <h2 style={{ margin: '0 0 15px 0', fontSize: '20px', color: 'var(--primary-blue)', textAlign: 'center' }}>Variación de Precios - {hojaComparar}</h2>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'center', tableLayout: 'fixed' }}>
                  <thead style={{ backgroundColor: '#1e293b', color: 'white' }}>
                    <tr>
                      <th style={{ padding: '10px 4px', width: '60px' }}>CÓD</th>
                      <th style={{ padding: '10px 4px', width: '90px' }}>PLANTAS</th>
                      {datosComparados.columnas.map((col, i) => <th key={i} style={{ padding: '10px 4px' }}>{col}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {datosComparados.rows.map((fila, rI) => (
                      <tr key={rI} style={{ borderBottom: '1px solid #eee', backgroundColor: rI % 2 === 0 ? 'white' : '#f9fafb' }}>
                        <td style={{ padding: '8px 4px', color: 'var(--text-light)' }}>{fila.codigo}</td>
                        <td style={{ padding: '8px 4px', fontWeight: 'bold', color: 'var(--text-dark)' }}>{fila.planta}</td>
                        {datosComparados.columnas.map((col, cI) => {
                          const item = fila.variaciones[col];
                          if (item === 'NUEVO') return <td key={cI} style={{ color: '#3b82f6', fontWeight: 'bold' }}>NUEVO</td>;
                          if (!item) return <td key={cI} style={{ color: '#9ca3af' }}>-</td>;
                          if (Math.abs(item.diff) > 0.00001) {
                            return <td key={cI} style={{ color: item.diff > 0 ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>{item.diff > 0 ? '+' : ''}{item.diff.toFixed(4)}</td>;
                          }
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
                    <tr>
                      <th style={{ padding: '10px' }}>PLANTA</th>
                      <th style={{ padding: '10px' }}>ALMACÉN</th>
                      <th style={{ padding: '10px' }}>ARTÍCULO</th>
                      <th style={{ padding: '10px' }}>VARIACIÓN (S/)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datosComparadosTope.map((fila, rI) => (
                      <tr key={rI} style={{ borderBottom: '1px solid #eee', backgroundColor: rI % 2 === 0 ? 'white' : '#f9fafb' }}>
                        <td style={{ padding: '8px', fontWeight: 'bold' }}>{fila.planta}</td>
                        <td style={{ padding: '8px' }}>{fila.almacen}</td>
                        <td style={{ padding: '8px' }}>{fila.articulo}</td>
                        <td style={{ padding: '8px' }}>
                          {fila.variacion === 'NUEVO' ? (
                            <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>NUEVO</span>
                          ) : fila.variacion && Math.abs(fila.variacion.diff) > 0.00001 ? (
                            <span style={{ color: fila.variacion.diff > 0 ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>
                              {fila.variacion.diff > 0 ? '+' : ''}{fila.variacion.diff.toFixed(2)}
                            </span>
                          ) : (
                            <span style={{ color: '#9ca3af' }}>0.00</span>
                          )}
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

  // --- VISTA 5: AUDITORÍA ---
  if (vista === 'auditoria') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
        {renderHeader()}
        <main style={{ padding: '40px 20px', maxWidth: '1000px', margin: '0 auto' }}>
          <Card style={{ padding: '30px' }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '22px' }}>Auditoría General (Precios & Topes)</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead style={{ backgroundColor: 'var(--primary-blue)', color: 'white' }}>
                <tr>
                  <th style={{ padding: '12px', textAlign: 'left' }}>FECHA</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>MÓDULO</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>ACCIÓN</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>ARCHIVO</th>
                </tr>
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

  // --- VISTA 6: TENDENCIAS ---
  if (vista === 'tendencias') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
        {renderHeader()}
        <main style={{ padding: '40px 20px', maxWidth: '1100px', margin: '0 auto' }}>
          <Card style={{ padding: '40px', textAlign: 'center' }}>
             <div style={{ fontSize: '50px', marginBottom: '20px' }}>📈</div>
             <h2 style={{ color: 'var(--primary-blue)' }}>Módulo de Tendencias</h2>
             <p style={{ color: 'var(--text-light)' }}>El gráfico histórico se mantiene operando con los archivos de Precios. En la próxima actualización se integrarán los Topes.</p>
             <Boton variante="outline" onClick={() => setVista('menu')} style={{ marginTop: '20px' }}>Volver al Menú</Boton>
          </Card>
        </main>
      </div>
    )
  }
}