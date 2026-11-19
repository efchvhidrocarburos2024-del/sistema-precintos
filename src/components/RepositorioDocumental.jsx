import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'
import { PageHeader, Card, Input, Select, Boton } from './ui'

export default function RepositorioDocumental({ setPantalla, rol }) {
  const [vista, setVista] = useState('menu') 
  
  // Variable para saber si el usuario solo puede ver
  const esSoloLectura = rol === 'auditor';

  // --- ESTADOS DEL FORMULARIO ---
  const [categoria, setCategoria] = useState('')
  const [archivo, setArchivo] = useState(null)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [tipoDoc, setTipoDoc] = useState('')
  const [terminal, setTerminal] = useState('')
  const [proveedor, setProveedor] = useState('')
  const [producto, setProducto] = useState('')
  const [version, setVersion] = useState('')
  const [buscandoVersion, setBuscandoVersion] = useState(false)
  const [subiendo, setSubiendo] = useState(false)

  // --- ESTADOS PARA CATÁLOGOS ---
  const [listaPlantas, setListaPlantas] = useState([])
  const [listaProveedores, setListaProveedores] = useState([])
  const [listaProductos, setListaProductos] = useState([])

  // --- ESTADOS PARA VISUALIZAR Y FILTROS ---
  const [documentos, setDocumentos] = useState([])
  const [docSeleccionado, setDocSeleccionado] = useState(null)
  const [cargandoDocs, setCargandoDocs] = useState(false)
  
  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroTipoDoc, setFiltroTipoDoc] = useState('Todos')
  const [filtroTerminal, setFiltroTerminal] = useState('Todas')
  const [filtroProveedor, setFiltroProveedor] = useState('Todos')

  // --- EFECTOS ---
  useEffect(() => {
    async function cargarCatalogos() {
      const [resPlantas, resProv, resProd] = await Promise.all([
        supabase.from('plantas').select('nombre, codigo').eq('activo', true).order('nombre'),
        supabase.from('proveedores').select('codigo, nombre').eq('activo', true).order('nombre'),
        supabase.from('productos').select('codigo, nombre').eq('activo', true).order('codigo')
      ])
      if (resPlantas.data) setListaPlantas(resPlantas.data)
      if (resProv.data) setListaProveedores(resProv.data)
      if (resProd.data) setListaProductos(resProd.data)
    }
    cargarCatalogos()

    if (vista === 'visualizar') {
      cargarDocumentos()
    }
  }, [vista])

  // --- LÓGICA DE AUTO-VERSIONADO ---
  const handleTipoGuiaChange = async (e) => {
    const nuevoTipo = e.target.value;
    setTipoDoc(nuevoTipo);
    
    if (!nuevoTipo) {
      setVersion('');
      return;
    }

    setBuscandoVersion(true);
    try {
      const { data, error } = await supabase
        .from('documentos')
        .select('version')
        .eq('categoria', 'Guías')
        .eq('tipo_documento', nuevoTipo)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0 && data[0].version) {
        const versionStr = data[0].version.replace(/[^0-9.]/g, '');
        const partes = versionStr.split('.');
        
        let major = parseInt(partes[0]) || 1;
        let minor = parseInt(partes[1]) || 0;

        minor += 1;
        if (minor >= 10) {
          major += 1;
          minor = 0;
        }

        setVersion(`V${major}.${minor}`);
      } else {
        setVersion('V1.0');
      }
    } catch (error) {
      console.error("Error al calcular versión:", error);
      setVersion('V1.0');
    } finally {
      setBuscandoVersion(false);
    }
  };

  async function cargarDocumentos() {
    setCargandoDocs(true)
    const { data, error } = await supabase
      .from('documentos')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) toast.error('Error al cargar documentos')
    else {
      setDocumentos(data || [])
      if (data && data.length > 0) setDocSeleccionado(data[0])
    }
    setCargandoDocs(false)
  }

  const manejarSeleccionArchivo = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo supera el límite de 10MB')
      e.target.value = ''
      return
    }
    setArchivo(file)
  }

  async function handleSubir(e) {
    e.preventDefault()
    if (!archivo) return toast.error('Selecciona un archivo')
    if (!tipoDoc) return toast.error('Selecciona el tipo de documento')
    
    setSubiendo(true)
    try {
      const fileExt = archivo.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${categoria}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documentos_sigmo')
        .upload(filePath, archivo)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('documentos_sigmo')
        .getPublicUrl(filePath)

      const { data: { user } } = await supabase.auth.getUser()

      const { error: dbError } = await supabase
        .from('documentos')
        .insert({
          nombre: nombre.trim() || archivo.name,
          categoria,
          tipo_documento: tipoDoc,
          terminal: terminal || null,
          proveedor: proveedor || null,
          producto: producto || null,
          version: version || null,
          descripcion: descripcion.trim(),
          url: publicUrl,
          subido_por: user.id
        })

      if (dbError) throw dbError

      toast.success('Documento subido correctamente')
      // Limpiar formulario
      setArchivo(null); setNombre(''); setDescripcion(''); setTipoDoc(''); setTerminal(''); setProveedor(''); setProducto(''); setVersion('');
      setVista('visualizar')
    } catch (error) {
      toast.error('Error: ' + (error.message || 'Inténtalo de nuevo'))
    } finally {
      setSubiendo(false)
    }
  }

  const iniciarSubida = (cat) => {
    setCategoria(cat)
    setVista('form_subir')
  }

  // --- VISTA 1: MENÚ PRINCIPAL ---
  if (vista === 'menu') {
    return (
      <div className="page-container" style={{ maxWidth: '900px', marginTop: '50px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <PageHeader titulo="Repositorio Documental" subtitulo="Gestiona los archivos de SIGMO" />
          <Boton variante="outline" onClick={() => setPantalla('')}>← Volver a SIGMO</Boton>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' }}>
          
          {/* Visualizar: SIEMPRE VISIBLE */}
          <Card style={{ textAlign: 'center', padding: '40px', cursor: 'pointer', border: '2px solid var(--primary-blue)' }} onClick={() => setVista('visualizar')}>
            <div style={{ fontSize: '60px', marginBottom: '15px' }}>📂</div>
            <h3 style={{ color: 'var(--primary-blue)', marginBottom: '10px' }}>Visualizar Documentos</h3>
            <p style={{ color: 'var(--text-light)' }}>Explora el repositorio con visor integrado.</p>
          </Card>

          {/* Subir: SOLO VISIBLE SI NO ES AUDITOR */}
          {!esSoloLectura && (
            <Card style={{ textAlign: 'center', padding: '40px', cursor: 'pointer', border: '2px solid var(--primary-blue)' }} onClick={() => setVista('menu_subir')}>
              <div style={{ fontSize: '60px', marginBottom: '15px' }}>📤</div>
              <h3 style={{ color: 'var(--primary-blue)', marginBottom: '10px' }}>Subir Documento</h3>
              <p style={{ color: 'var(--text-light)' }}>Añade archivos técnicos, operativos o guías.</p>
            </Card>
          )}

        </div>
      </div>
    )
  }

  // --- VISTA 2: SUBMENÚ CATEGORÍAS ---
  if (vista === 'menu_subir') {
    return (
      <div className="page-container" style={{ maxWidth: '1000px', marginTop: '50px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <PageHeader titulo="¿Qué documento vas a subir?" subtitulo="Selecciona la categoría" />
          <Boton variante="outline" onClick={() => setVista('menu')}>← Volver</Boton>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          <Card style={{ textAlign: 'center', padding: '30px', cursor: 'pointer' }} onClick={() => iniciarSubida('Técnicos')}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>⚙️</div>
            <h4 style={{ color: 'var(--text-dark)' }}>Documentos Técnicos</h4>
            <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Certificados, fichas técnicas.</p>
          </Card>
          <Card style={{ textAlign: 'center', padding: '30px', cursor: 'pointer' }} onClick={() => iniciarSubida('Operativos')}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>📋</div>
            <h4 style={{ color: 'var(--text-dark)' }}>Documentos Operativos</h4>
            <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Inducción, registros, criterios.</p>
          </Card>
          <Card style={{ textAlign: 'center', padding: '30px', cursor: 'pointer' }} onClick={() => iniciarSubida('Guías')}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>🚚</div>
            <h4 style={{ color: 'var(--text-dark)' }}>Guías</h4>
            <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Guías de remisión, manuales.</p>
          </Card>
        </div>
      </div>
    )
  }

  // --- VISTA 3: FORMULARIO DINÁMICO ---
  if (vista === 'form_subir') {
    return (
      <div className="page-container" style={{ maxWidth: '700px', marginTop: '50px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <PageHeader titulo={`Subir ${categoria}`} subtitulo="Completa los metadatos del documento" />
          <Boton variante="outline" onClick={() => setVista('menu_subir')}>← Volver</Boton>
        </div>

        <Card>
          <form onSubmit={handleSubir} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ padding: '20px', border: archivo ? '2px solid var(--success-green)' : '2px dashed #cbd5e1', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', backgroundColor: archivo ? '#f0fdf4' : '#f8fafc' }} onClick={() => document.getElementById('file-upload').click()}>
              <input type="file" onChange={manejarSeleccionArchivo} style={{ display: 'none' }} id="file-upload" />
              <div style={{ fontSize: '30px', marginBottom: '10px' }}>{archivo ? '✅' : '☁️'}</div>
              <span style={{ color: 'var(--primary-blue)', fontWeight: 'bold' }}>{archivo ? archivo.name : 'Haz clic para buscar tu archivo'}</span>
            </div>

            {categoria === 'Técnicos' && (
              <>
                <Select label="Tipo de Documento" value={tipoDoc} onChange={(e) => setTipoDoc(e.target.value)} required options={[
                  { value: '', label: 'Seleccione...' },
                  { value: 'Certificado de calidad', label: 'Certificado de Calidad' },
                  { value: 'Ficha de datos de seguridad', label: 'Ficha de Datos de Seguridad' },
                  { value: 'Ficha de especificación técnica', label: 'Ficha de Especificación Técnica' }
                ]} />
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <Select label="Terminal" value={terminal} onChange={(e) => setTerminal(e.target.value)} options={[
                    { value: '', label: 'Todas' },
                    ...listaPlantas.map(p => ({ value: p.nombre, label: p.nombre }))
                  ]} />
                  
                  <Select label="Proveedor" value={proveedor} onChange={(e) => setProveedor(e.target.value)} options={[
                    { value: '', label: 'Seleccione...' },
                    ...listaProveedores.map(p => ({ value: `${p.codigo} - ${p.nombre}`, label: `${p.codigo} - ${p.nombre}` }))
                  ]} />
                </div>

                <Select label="Producto" value={producto} onChange={(e) => setProducto(e.target.value)} options={[
                  { value: '', label: 'Seleccione...' },
                  ...listaProductos.map(p => ({ value: `${p.codigo} - ${p.nombre}`, label: `${p.codigo} - ${p.nombre}` }))
                ]} />
              </>
            )}

            {categoria === 'Operativos' && (
              <>
                <Select label="Tipo de Documento" value={tipoDoc} onChange={(e) => setTipoDoc(e.target.value)} required options={[
                  { value: '', label: 'Seleccione...' },
                  { value: 'Documentos para inducción de conductores', label: 'Inducción de conductores' },
                  { value: 'Documentos para el registro de unidades', label: 'Registro de unidades' },
                  { value: 'Documentos para el registro de unidades y conductores por proveedor', label: 'Registro de unidades y conductores por proveedor' },
                  { value: 'Criterios de carga por terminal', label: 'Criterios de carga por terminal' }
                ]} />
                <Select label="Terminal" value={terminal} onChange={(e) => setTerminal(e.target.value)} options={[
                  { value: '', label: 'Todas' },
                  ...listaPlantas.map(p => ({ value: p.nombre, label: p.nombre }))
                ]} />
              </>
            )}

            {categoria === 'Guías' && (
              <>
                <Select 
                  label="Tipo de Guía" 
                  value={tipoDoc} 
                  onChange={handleTipoGuiaChange} 
                  required 
                  options={[
                    { value: '', label: 'Seleccione una guía...' },
                    { value: 'Guía para la Solicitud de Códigos de Anulación de Facturas', label: 'Guía para la Solicitud de Códigos de Anulación de Facturas' },
                    { value: 'Guía de uso – Generación de pedidos en el aplicativo', label: 'Guía de uso – Generación de pedidos en el aplicativo' },
                    { value: 'Guía de Procedimiento para la Emisión de la GRE en el Portal SUNAT', label: 'Guía de Procedimiento para la Emisión de la GRE en el Portal SUNAT' },
                    { value: 'Guía para informe de levantamiento de observación - Terminal Pampilla', label: 'Guía para informe de levantamiento de observación - Terminal Pampilla' },
                    { value: 'Guía Básica del SCOP', label: 'Guía Básica del SCOP' },
                    { value: 'Guía de procedimiento para anular un SCOP entre mayoristas en la plataforma virtual de Osinergmin', label: 'Guía de procedimiento para anular un SCOP entre mayoristas en la plataforma virtual de Osinergmin' }
                  ]} 
                />
                
                <Input 
                  label={buscandoVersion ? "Calculando versión..." : "Versión (Autocalculada)"} 
                  value={buscandoVersion ? "..." : version} 
                  readOnly 
                  placeholder="Se calculará automáticamente"
                  style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                />
              </>
            )}

            <Input label="Nombre visible del archivo (Opcional)" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Si se deja vacío, se usará el nombre del archivo" />
            <Input label="Descripción breve (Opcional)" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej. Documento válido para el mes de Octubre" />

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <Boton variante="outline" onClick={() => setVista('menu_subir')} style={{ flex: 1 }} disabled={subiendo}>Cancelar</Boton>
              <Boton tipo="submit" variante="primary" disabled={subiendo || !archivo || buscandoVersion} style={{ flex: 2 }}>
                {subiendo ? 'Subiendo...' : 'Confirmar y Subir'}
              </Boton>
            </div>
          </form>
        </Card>
      </div>
    )
  }

  // --- VISTA 4: VISOR DE DOCUMENTOS Y FILTROS ---
  if (vista === 'visualizar') {
    const docsFiltrados = documentos.filter(d => {
      const coincideTexto = d.nombre.toLowerCase().includes(filtroTexto.toLowerCase()) || 
                            (d.tipo_documento && d.tipo_documento.toLowerCase().includes(filtroTexto.toLowerCase()));
      const coincideTipo = filtroTipoDoc === 'Todos' || d.tipo_documento === filtroTipoDoc;
      const coincideTerminal = filtroTerminal === 'Todas' || d.terminal === filtroTerminal;
      const coincideProveedor = filtroProveedor === 'Todos' || d.proveedor === filtroProveedor;
      
      return coincideTexto && coincideTipo && coincideTerminal && coincideProveedor;
    });

    const tiposUnicos = ['Todos', ...new Set(documentos.map(d => d.tipo_documento).filter(Boolean))];
    const terminalesUnicas = ['Todas', ...new Set(documentos.map(d => d.terminal).filter(Boolean))];
    const proveedoresUnicos = ['Todos', ...new Set(documentos.map(d => d.proveedor).filter(Boolean))];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 40px)', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <PageHeader titulo="Visualizador de Documentos" subtitulo="Explora, filtra y previsualiza archivos" />
          <Boton variante="outline" onClick={() => setVista('menu')}>← Volver al menú</Boton>
        </div>

        <div style={{ display: 'flex', gap: '20px', flex: 1, overflow: 'hidden' }}>
          
          <div style={{ width: '450px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <Input placeholder="🔍 Buscar por nombre o descripción..." value={filtroTexto} onChange={(e) => setFiltroTexto(e.target.value)} label={null} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <Select value={filtroTipoDoc} onChange={(e) => setFiltroTipoDoc(e.target.value)} label={null} options={tiposUnicos.map(t => ({ value: t, label: t }))} />
              <Select value={filtroTerminal} onChange={(e) => setFiltroTerminal(e.target.value)} label={null} options={terminalesUnicas.map(t => ({ value: t, label: t }))} />
            </div>
            <Select value={filtroProveedor} onChange={(e) => setFiltroProveedor(e.target.value)} label={null} options={proveedoresUnicos.map(p => ({ value: p, label: p }))} />
            
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '5px' }}>
              {cargandoDocs ? (
                <p style={{ textAlign: 'center', color: 'var(--text-light)' }}>Cargando...</p>
              ) : docsFiltrados.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-light)' }}>No hay documentos que coincidan con los filtros.</p>
              ) : (
                docsFiltrados.map(doc => (
                  <Card 
                    key={doc.id} 
                    style={{ 
                      padding: '15px', 
                      cursor: 'pointer', 
                      border: docSeleccionado?.id === doc.id ? '2px solid var(--primary-blue)' : '1px solid #eee',
                      backgroundColor: docSeleccionado?.id === doc.id ? '#eff6ff' : 'white',
                      position: 'relative'
                    }}
                    onClick={() => setDocSeleccionado(doc)}
                  >
                    <div style={{ display: 'flex', gap: '15px' }}>
                      <div style={{ fontSize: '30px' }}>📄</div>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 5px 0', color: 'var(--text-dark)', fontSize: '15px' }}>{doc.nombre}</h4>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--primary-blue)', fontWeight: 'bold' }}>
                          {doc.tipo_documento} {doc.version ? `(${doc.version})` : ''}
                        </p>
                        
                        <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-light)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {doc.terminal && <span>🏭 Terminal: {doc.terminal}</span>}
                          {doc.proveedor && <span>🏢 Proveedor: {doc.proveedor}</span>}
                          <span>📅 Emisión: {new Date(doc.created_at).toLocaleDateString()}</span>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-blue)', textDecoration: 'none', fontSize: '16px' }} title="Ver documento">👁️</a>
                          <a href={doc.url} download target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-blue)', textDecoration: 'none', fontSize: '16px' }} title="Descargar">📥</a>
                        </div>
                      </div>
                      <div style={{ position: 'absolute', top: '15px', right: '15px', backgroundColor: '#DCFCE7', color: '#166534', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold' }}>
                        Activo
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          <div style={{ flex: 1, backgroundColor: '#525659', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            {docSeleccionado ? (
              <>
                <div style={{ padding: '10px 20px', backgroundColor: '#323639', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{docSeleccionado.nombre} {docSeleccionado.version ? `- ${docSeleccionado.version}` : ''}</span>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <a href={docSeleccionado.url} download target="_blank" rel="noopener noreferrer" style={{ color: 'white', textDecoration: 'none', fontSize: '13px' }}>📥 Descargar</a>
                    <a href={docSeleccionado.url} target="_blank" rel="noopener noreferrer" style={{ color: 'white', textDecoration: 'underline', fontSize: '13px' }}>Abrir ↗</a>
                  </div>
                </div>
                <iframe src={`${docSeleccionado.url}#toolbar=0&navpanes=0`} style={{ flex: 1, width: '100%', border: 'none' }} title="Visor PDF" />
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', flexDirection: 'column' }}>
                <div style={{ fontSize: '60px', marginBottom: '15px' }}>👁️</div>
                <h3>Ningún documento seleccionado</h3>
                <p style={{ opacity: 0.7 }}>Selecciona un documento de la izquierda para visualizarlo</p>
              </div>
            )}
          </div>

        </div>
      </div>
    )
  }
}