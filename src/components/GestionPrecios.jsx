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

const COLORS = ['#0B5FA5', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f43f5e', '#84cc16', '#f97316', '#6366f1']

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    // Ordenar de mayor a menor precio para fácil lectura
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
  const [archivos, setArchivos] = useState([])
  const [cargando, setCargando] = useState(false)
  
  // Estados de carga
  const [archivoExcel, setArchivoExcel] = useState(null)
  const [subiendo, setSubiendo] = useState(false)
  const [previewData, setPreviewData] = useState([])
  const [previewHeaders, setPreviewHeaders] = useState([])
  const [tipoCambio, setTipoCambio] = useState('')
  const [valorFise, setValorFise] = useState('')

  // Estados de comparación
  const [idBase, setIdBase] = useState('')
  const [idNuevo, setIdNuevo] = useState('')
  const [hojaComparar, setHojaComparar] = useState('Precio Base')
  const [datosComparados, setDatosComparados] = useState(null)
  const [cargandoComparacion, setCargandoComparacion] = useState(false)

  // Estados de auditoría
  const [auditoria, setAuditoria] = useState([])

  // Estados para Tendencias
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

  // Modales
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

  useEffect(() => {
    if (vista === 'visualizar' || vista === 'comparar' || vista === 'auditoria' || vista === 'tendencias') {
      fetchArchivos()
    }
    if (vista === 'auditoria') fetchAuditoria()
  }, [vista])

  useEffect(() => {
    if (vista === 'comparar' && archivos.length > 0) {
      const ordenados = [...archivos].sort((a, b) => {
        const fA = extraerFecha(a.nombre_archivo);
        const fB = extraerFecha(b.nombre_archivo);
        return fB.localeCompare(fA); 
      });
      if (ordenados.length >= 1) setIdNuevo(ordenados[0].id);
      if (ordenados.length >= 2) setIdBase(ordenados[1].id);
      else setIdBase('');
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
        const fA = extraerFecha(a.nombre_archivo);
        const fB = extraerFecha(b.nombre_archivo);
        if (fA !== fB) return fB.localeCompare(fA);
        return new Date(b.created_at) - new Date(a.created_at);
      });
      setArchivos(lista);
    }
    setCargando(false)
  }

  async function fetchAuditoria() {
    const { data, error } = await supabase.from('precios_auditoria').select('*').order('created_at', { ascending: false })
    if (error) console.error(error)
    else setAuditoria(data || [])
  }

  async function registrarAuditoria(id_archivo, nombre_archivo, accion) {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('precios_auditoria').insert({ id_archivo, nombre_archivo, accion, usuario: user.email })
  }

  // --- LÓGICA DE EXCEL ---
  const normalizarTexto = (txt) => {
    if (!txt) return '';
    return String(txt).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ').replace(/N°/gi, 'N').trim().toUpperCase();
  };

  const esMismoProducto = (prod1, prod2) => {
    const p1 = normalizarTexto(prod1);
    const p2 = normalizarTexto(prod2);
    if (p1 === p2) return true;
    if (p1.includes('GASOLINA') && p2.includes('GASOLINA') && p1.includes('PREMIUM') && p2.includes('PREMIUM')) return true;
    if (p1.includes('GASOLINA') && p2.includes('GASOLINA') && p1.includes('REGULAR') && p2.includes('REGULAR')) return true;
    if (p1.includes('GASOHOL') && p2.includes('GASOHOL') && p1.includes('PREMIUM') && p2.includes('PREMIUM')) return true;
    if (p1.includes('GASOHOL') && p2.includes('GASOHOL') && p1.includes('REGULAR') && p2.includes('REGULAR')) return true;
    if (p1.includes('PETROLEO') && p2.includes('PETROLEO') && p1.includes('6') && p2.includes('6')) return true;
    if (p1.includes('PETROLEO') && p2.includes('PETROLEO') && p1.includes('500') && p2.includes('500')) return true;
    if (p1.includes('DIESEL') && p2.includes('DIESEL') && p1.includes('2 S-50') && p2.includes('2 S-50')) {
      if (p1.includes('UV') && p2.includes('UV')) return true;
      if (!p1.includes('UV') && !p2.includes('UV')) return true;
    }
    if (p1.includes('DIESEL') && p2.includes('DIESEL') && p1.includes('B5 S-50') && p2.includes('B5 S-50')) {
      if (p1.includes('UV') && p2.includes('UV')) return true;
      if (!p1.includes('UV') && !p2.includes('UV')) return true;
    }
    return false;
  };

  const esPlantaValida = (nombre) => {
    const n = normalizarTexto(nombre);
    if (n.length < 3 || n.includes('*') || !isNaN(Number(n))) return false;
    if (n.match(/\d{4}-\d{2}-\d{2}/) || n.match(/\d{2}\/\d{2}\/\d{4}/)) return false; 
    if (n.includes('TOTAL') || n.includes('IGV') || n.includes('ISC') || n.includes('RODAJE') || n.includes('INCREMENTO') || n.includes('INCLUSION') || n.includes('DISMINUCION')) return false;
    return true;
  };

  const parseExcelFile = async (url, targetSheetName) => {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    
    const searchTerm = targetSheetName.toLowerCase().replace('precios planta ', '').replace('precio ', '');
    let sheetName = wb.SheetNames.find(name => name.toLowerCase().includes(searchTerm));
    if (!sheetName) sheetName = wb.SheetNames[0];

    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    let headerIndex = data.findIndex(row => row.some(cell => normalizarTexto(cell).includes('PLANTAS')));
    if (headerIndex === -1) headerIndex = 0;

    return {
      headers: data[headerIndex],
      rows: data.slice(headerIndex + 1).filter(row => row.some(cell => cell !== ''))
    };
  };

  // --- COMPARACIÓN ---
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
        if (esPlantaValida(planta)) baseMap[planta] = row;
      });

      const columnasComparar = [];
      dataNuevo.headers.forEach((h, i) => {
        const hNorm = normalizarTexto(h);
        if (!hNorm || hNorm.includes('PLANTAS') || hNorm.includes('CODIGO') || hNorm.includes('USO INTERNO') || hNorm.includes('SOLES/GALON') || hNorm.includes('VIGENTE') || hNorm.includes('T.C') || hNorm.includes('IGV') || hNorm.includes('ISC') || hNorm.includes('RODAJE') || hNorm.includes('FISE') || hNorm === 'SI' || hNorm === '-') return;
        const baseColIndex = dataBase.headers.findIndex(baseH => esMismoProducto(baseH, h));
        if (baseColIndex !== -1) columnasComparar.push({ titulo: h, indexNuevo: i, indexBase: baseColIndex });
      });

      const comparacion = [];
      dataNuevo.rows.forEach(nuevaRow => {
        const planta = normalizarTexto(nuevaRow[idxPlantaNew]);
        if (!esPlantaValida(planta)) return;
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

  // --- LÓGICA DE TENDENCIAS (MEJORADA) ---
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
          const idxProducto = data.headers.findIndex(h => esMismoProducto(h, productoSeleccionado));
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
          // Si ambos son TODOS, graficamos el promedio de cada planta
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
          const idxProducto = data.headers.findIndex(h => esMismoProducto(h, productoSeleccionado));
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

      // --- CÁLCULO DE MÉTRICAS INTELIGENTE ---
      if (lineasArray.length > 0) {
        let actual = 0, min = Infinity, max = -Infinity, variacion = 0;
        let labelReferencia = '';

        if (plantaSeleccionada === 'TODOS' && productoSeleccionado === 'TODOS') {
          labelReferencia = 'Promedio Global (Plantas)';
          // Calcular el promedio de todos los valores en cada fecha
          const promediosPorFecha = datosArray.map(d => {
            const vals = Object.entries(d).filter(([k, v]) => k !== 'fecha' && v !== undefined).map(([_, v]) => v);
            return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : undefined;
          }).filter(v => v !== undefined);

          if (promediosPorFecha.length > 0) {
            actual = promediosPorFecha[promediosPorFecha.length - 1];
            variacion = promediosPorFecha.length > 1 ? actual - promediosPorFecha[promediosPorFecha.length - 2] : 0;
            // El min y max se calculan sobre todos los valores individuales
            const allVals = datosArray.flatMap(d => Object.entries(d).filter(([k, v]) => k !== 'fecha' && v !== undefined).map(([_, v]) => v));
            min = Math.min(...allVals);
            max = Math.max(...allVals);
          }
        } else {
          // Si hay un filtro específico (o es de 1 sola línea), calculamos sobre esa línea
          const primeraLinea = lineasArray[0];
          labelReferencia = primeraLinea;
          const precios = datosArray.map(d => d[primeraLinea]).filter(v => v !== undefined);
          
          if (precios.length > 0) {
            actual = precios[precios.length - 1];
            variacion = precios.length > 1 ? actual - precios[precios.length - 2] : 0;
            min = Math.min(...precios);
            max = Math.max(...precios);
          }
        }
        
        setMetricas({ actual, min, max, variacion, lineaReferencia: labelReferencia });
      } else {
         setMetricas(null);
      }

    } catch (error) {
      setErrorTendencia(error.message);
    } finally {
      setCargandoTendencia(false);
    }
  };

  useEffect(() => {
    if (vista === 'tendencias' && archivos.length > 0 && opcionesPlantas.length === 0) {
      parseExcelFile(archivos[0].url_archivo, 'Precio Base').then(data => {
        const idxP = data.headers.findIndex(h => normalizarTexto(h).includes('PLANTAS'));
        const plnts = data.rows.map(r => String(r[idxP]).trim()).filter(p => esPlantaValida(p));
        
        setOpcionesPlantas(['TODOS', ...new Set(plnts)].sort((a,b) => a === 'TODOS' ? -1 : b === 'TODOS' ? 1 : a.localeCompare(b)));
        
        const prods = data.headers.map(h => String(h).trim()).filter(h => h && !normalizarTexto(h).includes('PLANTAS') && !normalizarTexto(h).includes('CODIGO') && !normalizarTexto(h).includes('USO INTERNO'));
        setOpcionesProductos(['TODOS', ...new Set(prods)].filter(p => p.length >= 3).sort((a,b) => a === 'TODOS' ? -1 : b === 'TODOS' ? 1 : a.localeCompare(b)));
      });
    }
  }, [vista, archivos, opcionesPlantas.length]);

  // Exportar datos del gráfico
  const exportarTendenciaExcel = () => {
    if (!datosTendencia || datosTendencia.length === 0) return toast.error('No hay datos para exportar');
    
    const ws = XLSX.utils.json_to_sheet(datosTendencia);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tendencia');
    XLSX.writeFile(wb, `Tendencia_${hojaTendencia}.xlsx`);
    toast.success('Datos exportados a Excel');
  };

  // --- GESTIÓN DE ARCHIVOS ---
  const marcarComoVigente = async (id, nombre) => {
    try {
      await supabase.from('precios_archivos').update({ es_vigente: false }).eq('es_vigente', true)
      const { error } = await supabase.from('precios_archivos').update({ es_vigente: true }).eq('id', id)
      if (error) throw error
      await registrarAuditoria(id, nombre, 'VIGENTE')
      toast.success('Lista marcada como VIGENTE')
      fetchArchivos()
    } catch (error) {
      toast.error('Error: ' + error.message)
    }
  }

  const confirmarEliminar = async () => {
    if (!archivoAEliminar) return
    setEliminando(true)
    try {
      const urlParts = archivoAEliminar.url_archivo.split('/documentos_sigmo/')
      const filePath = urlParts[1]
      if (filePath) await supabase.storage.from('documentos_sigmo').remove([filePath])
      const { error: dbError } = await supabase.from('precios_archivos').delete().eq('id', archivoAEliminar.id)
      if (dbError) throw dbError
      await registrarAuditoria(archivoAEliminar.id, archivoAEliminar.nombre_archivo, 'ELIMINACION')
      toast.success('Lista eliminada')
      setModalEliminarAbierto(false)
      setArchivoAEliminar(null)
      fetchArchivos()
    } catch (error) {
      toast.error('Error: ' + error.message)
    } finally {
      setEliminando(false)
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
              if (cellValue === 'T.C' || cellValue === 'T/C') {
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

        const ws = wb.Sheets[wb.SheetNames[0]]
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
      // --- VALIDACIÓN DE DUPLICADOS ---
      const nombreNormalizado = archivoExcel.name.trim();
      const fechaNueva = extraerFecha(archivoExcel.name);

      const { data: existeNombre } = await supabase.from('precios_archivos').select('id').eq('nombre_archivo', nombreNormalizado).limit(1);
      if (existeNombre && existeNombre.length > 0) {
        throw new Error(`El archivo "${nombreNormalizado}" ya fue subido anteriormente.`);
      }

      if (fechaNueva !== '1900-01-01') {
        const { data: existeFecha } = await supabase.from('precios_archivos').select('nombre_archivo').like('nombre_archivo', `%${fechaNueva}%`);
        if (existeFecha && existeFecha.length > 0) {
          throw new Error(`Ya existe una lista registrada para la fecha ${fechaNueva} ("${existeFecha[0].nombre_archivo}"). Elimine la anterior si desea reemplazarla.`);
        }
      }
      // --- FIN VALIDACIÓN ---

      const { data: archivosDb } = await supabase.from('precios_archivos').select('*').eq('es_vigente', true)
      let debeSerVigente = false;
      const vigenteActual = archivosDb && archivosDb.length > 0 ? archivosDb[0] : null;

      if (!vigenteActual) {
        debeSerVigente = true; 
      } else {
        const fechaVigente = extraerFecha(vigenteActual.nombre_archivo);
        if (fechaNueva !== '1900-01-01' && fechaVigente !== '1900-01-01' && fechaNueva > fechaVigente) {
          debeSerVigente = true;
        }
      }

      const nombreLimpio = archivoExcel.name.replace(/\s+/g, '_')
      const fileName = `listas_precios/${Date.now()}_${nombreLimpio}`
      
      const { error: uploadError } = await supabase.storage.from('documentos_sigmo').upload(fileName, archivoExcel)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('documentos_sigmo').getPublicUrl(fileName)
      const { data: { user } } = await supabase.auth.getUser()

      if (debeSerVigente) {
        await supabase.from('precios_archivos').update({ es_vigente: false }).eq('es_vigente', true)
      }

      const { data: insertedData, error: dbError } = await supabase.from('precios_archivos').insert({
        nombre_archivo: archivoExcel.name,
        url_archivo: publicUrl,
        subido_por: user.email,
        es_vigente: debeSerVigente
      }).select()

      if (dbError) throw dbError
      
      if (insertedData && insertedData.length > 0) {
        await registrarAuditoria(insertedData[0].id, archivoExcel.name, 'SUBIDA')
      }

      toast.success(debeSerVigente ? 'Lista subida como VIGENTE' : 'Lista subida como HISTÓRICO')
      limpiarPrevisualizacion()
      setVista('menu')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSubiendo(false)
    }
  }

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
    XLSX.writeFile(wb, `Variacion_${hojaComparar}.xlsx`);
    toast.success('Excel descargado');
  };

  const exportarComparacionPDF = () => {
    if (!datosComparados) return;
    const doc = new jsPDF('landscape');
    doc.text(`Variación - ${hojaComparar}`, 14, 22);
    const head = [['CÓDIGO', 'PLANTAS', ...datosComparados.columnas]];
    const body = datosComparados.rows.map(fila => {
      const row = [fila.codigo, fila.planta];
      datosComparados.columnas.forEach(col => {
        const item = fila.variaciones[col];
        if (item === 'NUEVO') row.push('NUEVO');
        else if (item && Math.abs(item.diff) > 0.00001) row.push(`${item.diff > 0 ? '+' : ''}${item.diff.toFixed(4)}`);
        else if (item) row.push('0.0000');
        else row.push('-');
      });
      return row;
    });
    autoTable(doc, { head, body, startY: 30, styles: { fontSize: 8 }, didParseCell: (data) => {
      if (data.section === 'body' && data.column.index > 1) {
        const t = data.cell.text[0];
        if (t.startsWith('+')) { data.cell.styles.textColor = [239, 68, 68]; data.cell.styles.fontStyle = 'bold'; }
        else if (t.startsWith('-')) { data.cell.styles.textColor = [16, 185, 129]; data.cell.styles.fontWeight = 'bold'; }
        else if (t === 'NUEVO') { data.cell.styles.textColor = [59, 130, 246]; }
      }
    }});
    doc.save(`Variacion_${hojaComparar}.pdf`);
    toast.success('PDF descargado');
  };

  const renderHeader = () => (
    <header style={{ padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <button onClick={() => vista === 'menu' ? setPantalla('') : setVista('menu')} style={btnHeaderStyle}>
          ← {vista === 'menu' ? 'SIGMO' : 'Volver al Menú'}
        </button>
        <h1 style={{ margin: 0, color: 'var(--primary-blue)', fontSize: '28px', fontWeight: '900' }}>
          {vista === 'comparar' ? 'Comparativa de Listas' : vista === 'tendencias' ? 'Tendencias de Precios' : vista === 'auditoria' ? 'Auditoría de Precios' : 'Módulo de Lista de Precios'}
        </h1>
      </div>
    </header>
  )

  if (vista === 'menu') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)', display: 'flex', flexDirection: 'column' }}>
        {renderHeader()}
        <main style={{ flex: 1, padding: '40px 20px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ color: 'var(--text-dark)', fontSize: '24px', marginBottom: '10px' }}>Repositorio de Listas</h2>
            <p style={{ color: 'var(--text-light)' }}>Selecciona una acción</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <div onClick={() => setVista('visualizar')} style={cardStyle} onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary-blue)'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}>
              <div style={{ fontSize: '50px', marginBottom: '15px' }}>👁️</div>
              <h3 style={{ color: 'var(--primary-blue)', marginBottom: '10px', fontSize: '18px' }}>Visualizar Listas</h3>
              <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Ver, buscar y descargar archivos Excel.</p>
            </div>

            {puedeCargar && (
              <div onClick={() => setVista('cargar')} style={cardStyle} onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary-blue)'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}>
                <div style={{ fontSize: '50px', marginBottom: '15px' }}>📤</div>
                <h3 style={{ color: 'var(--primary-blue)', marginBottom: '10px', fontSize: '18px' }}>Cargar Nueva Lista</h3>
                <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Sube y previsualiza archivos Excel.</p>
              </div>
            )}

            <div onClick={() => setVista('tendencias')} style={cardStyle} onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary-blue)'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}>
              <div style={{ fontSize: '50px', marginBottom: '15px' }}>📈</div>
              <h3 style={{ color: 'var(--primary-blue)', marginBottom: '10px', fontSize: '18px' }}>Gráfico de Tendencias</h3>
              <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Evolución histórica de precios por planta.</p>
            </div>

            <div onClick={() => setVista('auditoria')} style={cardStyle} onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary-blue)'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}>
              <div style={{ fontSize: '50px', marginBottom: '15px' }}>📋</div>
              <h3 style={{ color: 'var(--primary-blue)', marginBottom: '10px', fontSize: '18px' }}>Auditoría</h3>
              <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Historial de cambios y accesos.</p>
            </div>
          </div>
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
          <Card style={{ padding: '30px', marginBottom: '20px' }}>
            <h2 style={{ margin: '0 0 15px 0', fontSize: '22px' }}>Paso 1: Seleccionar Archivo</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px', border: '2px dashed #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
              <input type="file" id="file-upload-precios" accept=".xlsx, .xls" onChange={handleFileChange} />
              {archivoExcel && <span style={{ color: 'var(--primary-blue)', fontWeight: 'bold' }}>✅ {archivoExcel.name}</span>}
            </div>
          </Card>

          {previewData.length > 0 && (
            <Card style={{ padding: '30px' }}>
              <h2 style={{ margin: '0 0 20px 0', fontSize: '22px' }}>Paso 2: Previsualización</h2>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '20px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'center', tableLayout: 'fixed' }}>
                  <thead style={{ backgroundColor: 'var(--primary-blue)', color: 'white' }}>
                    <tr>{previewHeaders.map((h, i) => <th key={i} style={{ padding: '8px 4px', wordBreak: 'break-word' }}>{h || '-'}</th>)}</tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, rowIndex) => (
                      <tr key={rowIndex} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        {row.map((cell, cellIndex) => {
                          let val = cell;
                          if (cellIndex > 1) {
                            const num = parseFloat(String(cell).replace(',', '.'));
                            if (!isNaN(num)) val = num === 0 ? '-' : num.toFixed(4);
                          }
                          return <td key={cellIndex} style={{ padding: '6px 4px', fontWeight: cellIndex === 1 ? 'bold' : 'normal', wordBreak: 'break-word' }}>{val}</td>
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button onClick={limpiarPrevisualizacion} style={{ padding: '10px 25px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>LIMPIAR</button>
                <button onClick={handleSubirArchivo} disabled={subiendo} style={{ padding: '10px 25px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>{subiendo ? 'SUBIENDO...' : 'CONFIRMAR Y SUBIR'}</button>
              </div>
            </Card>
          )}
        </main>
      </div>
    )
  }

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
                <select value={hojaTendencia} onChange={(e) => setHojaTendencia(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', backgroundColor: '#1e293b', color: '#fff', fontWeight: 'bold' }}>
                  <option value="Precio Base">Precio Base</option>
                  <option value="Precios Planta Sin IGV">Precios Planta Sin IGV</option>
                  <option value="Precios Planta Con IGV">Precios Planta Con IGV</option>
                </select>
              </div>

              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>Planta</label>
                <select value={plantaSeleccionada} onChange={(e) => setPlantaSeleccionada(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', backgroundColor: '#1e293b', color: '#fff', fontWeight: 'bold' }}>
                  <option value="">Seleccione...</option>
                  {opcionesPlantas.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>Producto</label>
                <select value={productoSeleccionado} onChange={(e) => setProductoSeleccionado(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', backgroundColor: '#1e293b', color: '#fff', fontWeight: 'bold' }}>
                  <option value="">Seleccione...</option>
                  {opcionesProductos.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              
              <Boton variante="primary" onClick={cargarTendencias} disabled={cargandoTendencia || !plantaSeleccionada || !productoSeleccionado} style={{ height: '42px' }}>
                {cargandoTendencia ? 'Generando...' : '📈 Generar Gráfico'}
              </Boton>
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
                <h3 style={{ margin: 0, fontSize: '24px', color: metricas.variacion > 0 ? '#ef4444' : metricas.variacion < 0 ? '#10b981' : '#6b7280' }}>
                  {metricas.variacion > 0 ? '+' : ''}{metricas.variacion.toFixed(4)}
                </h3>
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
                <p style={{ color: 'var(--primary-blue)', fontWeight: 'bold' }}>Analizando historial de archivos...</p>
              </div>
            ) : datosTendencia.length > 0 ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                  <button onClick={exportarTendenciaExcel} style={{ padding: '6px 12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    ⬇️ Exportar Datos (Excel)
                  </button>
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
                        <Line 
                          key={linea}
                          type="monotone" 
                          dataKey={linea} 
                          name={linea} 
                          stroke={COLORS[index % COLORS.length]} 
                          strokeWidth={3} 
                          dot={{ r: 3, strokeWidth: 2, stroke: '#fff' }} 
                          activeDot={{ r: 6 }} 
                          connectNulls
                        />
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

  if (vista === 'auditoria') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
        {renderHeader()}
        <main style={{ padding: '40px 20px', maxWidth: '1000px', margin: '0 auto' }}>
          <Card style={{ padding: '30px' }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '22px' }}>Registro de Auditoría</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead style={{ backgroundColor: 'var(--primary-blue)', color: 'white' }}>
                  <tr>
                    <th style={{ padding: '12px', textAlign: 'left' }}>FECHA / HORA</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>USUARIO</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>ACCIÓN</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>ARCHIVO</th>
                  </tr>
                </thead>
                <tbody>
                  {auditoria.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px', color: 'var(--text-light)' }}>{new Date(log.created_at).toLocaleString()}</td>
                      <td style={{ padding: '12px' }}>{log.usuario}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ 
                          padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                          backgroundColor: log.accion === 'SUBIDA' ? '#DCFCE7' : log.accion === 'VIGENTE' ? '#DBEAFE' : '#FEE2E2',
                          color: log.accion === 'SUBIDA' ? '#166534' : log.accion === 'VIGENTE' ? '#1E40AF' : '#991B1B'
                        }}>
                          {log.accion}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{log.nombre_archivo}</td>
                    </tr>
                  ))}
                  {auditoria.length === 0 && (
                    <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center' }}>No hay registros de auditoría.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </main>
      </div>
    )
  }

  if (vista === 'comparar') {
    const filePrevio = archivos.find(a => a.id === idBase);
    const fileActual = archivos.find(a => a.id === idNuevo);
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
        {renderHeader()}
        <main style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
          
          <Card style={{ padding: '30px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
              
              <div style={{ display: 'flex', gap: '20px', flex: 1 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px', color: 'var(--text-light)' }}>Lista Previa</label>
                  <div style={{ padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#f9fafb', fontSize: '13px' }}>{filePrevio ? filePrevio.nombre_archivo : '-'}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px', color: 'var(--text-light)' }}>Lista Actual</label>
                  <div style={{ padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#f9fafb', fontSize: '13px' }}>{fileActual ? fileActual.nombre_archivo : '-'}</div>
                </div>
                <div style={{ width: '200px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px', color: 'var(--text-light)' }}>Hoja a Comparar</label>
                  <select value={hojaComparar} onChange={(e) => setHojaComparar(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#1e293b', color: '#fff', fontWeight: 'bold', fontSize: '13px' }}>
                    <option value="Precio Base">Precio Base</option>
                    <option value="Precios Planta Sin IGV">Precios Planta Sin IGV</option>
                    <option value="Precios Planta Con IGV">Precios Planta Con IGV</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                <Boton variante="primary" onClick={generarComparacion} style={{ height: '40px' }}>⚖️ Comparar Ahora</Boton>
                {datosComparados && (
                  <>
                    <Boton variante="danger" onClick={exportarComparacionPDF} style={{ height: '40px' }}>📄 PDF</Boton>
                    <Boton variante="success" onClick={exportarComparacionExcel} style={{ height: '40px' }}>⬇️ Excel</Boton>
                  </>
                )}
              </div>

            </div>
          </Card>

          {datosComparados && (
            <Card style={{ padding: '20px' }}>
              <h2 style={{ margin: '0 0 15px 0', fontSize: '20px' }}>Variación - {hojaComparar}</h2>
              
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'center', tableLayout: 'fixed' }}>
                  <thead style={{ backgroundColor: '#1e293b', color: 'white' }}>
                    <tr>
                      <th style={{ padding: '10px 4px', width: '60px', wordBreak: 'break-word' }}>CÓD</th>
                      <th style={{ padding: '10px 4px', width: '90px', wordBreak: 'break-word' }}>PLANTAS</th>
                      {datosComparados.columnas.map((col, i) => (
                        <th key={i} style={{ padding: '10px 4px', wordBreak: 'break-word' }}>{col}</th>
                      ))}
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
        </main>
      </div>
    )
  }

  // Vista por defecto (Visualizar Listas)
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
      {renderHeader()}
      <main style={{ padding: '40px 20px', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '22px', margin: 0 }}>Listas de Precios Disponibles</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Boton variante="outline" onClick={() => setVista('comparar')} style={{ color: 'var(--primary-blue)' }}>⚖️ Comparar</Boton>
            <Boton variante="outline" onClick={fetchArchivos}>🔄 Refrescar</Boton>
          </div>
        </div>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead style={{ backgroundColor: 'var(--primary-blue)', color: 'white', textAlign: 'left' }}>
              <tr>
                <th style={{ padding: '15px' }}>FECHA</th>
                <th style={{ padding: '15px' }}>NOMBRE</th>
                <th style={{ padding: '15px' }}>SUBIDO POR</th>
                <th style={{ padding: '15px', textAlign: 'center' }}>ESTADO</th>
                <th style={{ padding: '15px', textAlign: 'center' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {archivos.map(file => (
                <tr key={file.id} style={{ borderBottom: '1px solid #eee', backgroundColor: file.es_vigente ? '#f0fdf4' : 'white' }}>
                  <td style={{ padding: '15px', color: 'var(--text-light)' }}>{new Date(file.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '15px', fontWeight: 'bold' }}>📄 {file.nombre_archivo}</td>
                  <td style={{ padding: '15px', fontSize: '12px', color: 'var(--text-light)' }}>{file.subido_por}</td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    {file.es_vigente ? <span style={{ padding: '4px 10px', backgroundColor: '#DCFCE7', color: '#166534', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>🟢 VIGENTE</span> : <span style={{ padding: '4px 10px', backgroundColor: '#F3F4F6', color: '#6B7280', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>HISTÓRICO</span>}
                  </td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <a href={file.url_archivo} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}><Boton variante="outline" tamano="sm">⬇️</Boton></a>
                      {puedeGestionar && !file.es_vigente && <Boton variante="success" tamano="sm" onClick={() => marcarComoVigente(file.id, file.nombre_archivo)}>✅</Boton>}
                      {puedeGestionar && <Boton variante="danger" tamano="sm" onClick={() => { setArchivoAEliminar(file); setModalEliminarAbierto(true); }}>🗑️</Boton>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </main>
      {modalEliminarAbierto && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '450px' }}>
            <h3 style={{ color: 'var(--danger-red)', marginTop: 0 }}>⚠️ Confirmar Eliminación</h3>
            <p>¿Eliminar permanentemente <strong>{archivoAEliminar?.nombre_archivo}</strong>?</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <Boton variante="outline" onClick={() => setModalEliminarAbierto(false)} style={{ flex: 1 }}>Cancelar</Boton>
              <Boton variante="danger" onClick={confirmarEliminar} style={{ flex: 1 }} disabled={eliminando}>{eliminando ? 'Eliminando...' : 'Sí, Eliminar'}</Boton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}