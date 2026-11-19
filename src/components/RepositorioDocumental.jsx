import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'
import { PageHeader, Card, Input, Select, Boton } from './ui'

export default function RepositorioDocumental({ setPantalla }) {
  const [vista, setVista] = useState('menu') 
  
  // Estados del Formulario
  const [categoria, setCategoria] = useState('')
  const [archivo, setArchivo] = useState(null)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  // Campos específicos
  const [tipoDoc, setTipoDoc] = useState('')
  const [terminal, setTerminal] = useState('')
  const [proveedor, setProveedor] = useState('')
  const [producto, setProducto] = useState('')
  const [version, setVersion] = useState('')
  const [buscandoVersion, setBuscandoVersion] = useState(false) // Nuevo estado
  const [subiendo, setSubiendo] = useState(false)

  // Estados para Catálogos (Datos maestros)
  const [listaPlantas, setListaPlantas] = useState([])
  const [listaProveedores, setListaProveedores] = useState([])
  const [listaProductos, setListaProductos] = useState([])

  // Estados para Visualizar
  const [documentos, setDocumentos] = useState([])
  const [docSeleccionado, setDocSeleccionado] = useState(null)
  const [cargandoDocs, setCargandoDocs] = useState(false)
  const [filtroTexto, setFiltroTexto] = useState('')

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
      // Buscar la última versión de este tipo de guía
      const { data, error } = await supabase
        .from('documentos')
        .select('version')
        .eq('categoria', 'Guías')
        .eq('tipo_documento', nuevoTipo)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0 && data[0].version) {
        // Extraer el número de la versión (ej. "V1.2" -> 1.2)
        const versionStr = data[0].version.replace(/[^0-9.]/g, '');
        const partes = versionStr.split('.');
        
        let major = parseInt(partes[0]) || 1;
        let minor = parseInt(partes[1]) || 0;

        // Incrementar versión (V1.0 -> V1.1)
        minor += 1;
        if (minor >= 10) {
          major += 1;
          minor = 0;
        }

        setVersion(`V${major}.${minor}`);
      } else {
        // Si es la primera vez que se sube esta guía
        setVersion('V1.0');
      }
    } catch (error) {
      console.error("Error al calcular versión:", error);
      setVersion('V1.0'); // Fallback
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

  // --- RENDERIZADO: MENÚ PRINCIPAL ---
  if (vista === 'menu') {
    return (
      <div className="page-container" style={{ maxWidth: '900px', marginTop: '50px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <PageHeader titulo="Repositorio Documental" subtitulo="Gestiona los archivos de SIGMO" />
          <Boton variante="outline" onClick={() => setPantalla('')}>← Volver a SIGMO</Boton>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' }}>
          <Card style={{ textAlign: 'center', padding: '40px', cursor: 'pointer', border: '2px solid var(--primary-blue)' }} onClick={() => setVista('visualizar')}>
            <div style={{ fontSize: '60px', marginBottom: '15px' }}>📂</div>
            <h3 style={{ color: 'var(--primary-blue)', marginBottom: '10px' }}>Visualizar Documentos</h3>
            <p style={{ color: 'var(--text-light)' }}>Explora el repositorio con visor integrado.</p>
          </Card>
          <Card style={{ textAlign: 'center', padding: '40px', cursor: 'pointer', border: '2px solid var(--primary-blue)' }} onClick={() => setVista('menu_subir')}>
            <div style={{ fontSize: '60px', marginBottom: '15px' }}>📤</div>
            <h3 style={{ color: 'var(--primary-blue)', marginBottom: '10px' }}>Subir Documento</h3>
            <p style={{ color: 'var(--text-light)' }}>Añade archivos técnicos, operativos o guías.</p>
          </Card>
        </div>
      </div>
    )
  }

  // --- RENDERIZADO: SUBMENÚ CATEGORÍAS ---
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

  // --- RENDERIZADO: FORMULARIO DINÁMICO CON CATÁLOGOS ---
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

            {/* ACTUALIZADO: AUTO-VERSIONADO DE GUÍAS */}
            {categoria === 'Guías' && (
              <>
                <Select 
                  label="Tipo de Guía" 
                  value={tipoDoc} 
                  onChange={handleTipoGuiaChange} 
                  required 
                  options={[
                    { value: '', label: 'Seleccione...' },
                    { value: 'Guía para la Solicitud de Códigos', label: 'Guía para la Solicitud de Códigos' },
                    { value: 'Guía de Anulación de Facturas', label: 'Guía de Anulación de Facturas' },
                    { value: 'Guía de Reclamos', label: 'Guía de Reclamos' },
                    { value: 'Otra Guía', label: 'Otra Guía' }
                  ]} 
                />
                
                {/* Bloqueamos el input para que el usuario no altere la versión calculada, o lo dejamos readonly */}
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

  // --- RENDERIZADO: VISOR DE DOCUMENTOS ---
  if (vista === 'visualizar') {
    const docsFiltrados = documentos.filter(d => 
      d.nombre.toLowerCase().includes(filtroTexto.toLowerCase()) || 
      (d.tipo_documento && d.tipo_documento.toLowerCase().includes(filtroTexto.toLowerCase()))
    )

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 40px)', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <PageHeader titulo="Visualizador de Documentos" subtitulo="Explora y previsualiza archivos" />
          <Boton variante="outline" onClick={() => setVista('menu')}>← Volver al menú</Boton>
        </div>

        <div style={{ display: 'flex', gap: '20px', flex: 1, overflow: 'hidden' }}>
          
          <div style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <Input placeholder="🔍 Buscar por nombre o tipo..." value={filtroTexto} onChange={(e) => setFiltroTexto(e.target.value)} label={null} />
            
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '5px' }}>
              {cargandoDocs ? (
                <p style={{ textAlign: 'center', color: 'var(--text-light)' }}>Cargando...</p>
              ) : docsFiltrados.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-light)' }}>No hay documentos.</p>
              ) : (
                docsFiltrados.map(doc => (
                  <Card 
                    key={doc.id} 
                    style={{ padding: '15px', cursor: 'pointer', border: docSeleccionado?.id === doc.id ? '2px solid var(--primary-blue)' : '1px solid #eee', backgroundColor: docSeleccionado?.id === doc.id ? '#eff6ff' : 'white' }}
                    onClick={() => setDocSeleccionado(doc)}
                  >
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div style={{ fontSize: '24px' }}>📄</div>
                      <div>
                        <h4 style={{ margin: '0 0 5px 0', color: 'var(--text-dark)', fontSize: '14px' }}>{doc.nombre}</h4>
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--primary-blue)', fontWeight: 'bold' }}>{doc.tipo_documento} {doc.version ? `(${doc.version})` : ''}</p>
                        <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: 'var(--text-light)' }}>
                          {doc.terminal ? `${doc.terminal} | ` : ''} {doc.proveedor ? `${doc.proveedor} | ` : ''} {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          <div style={{ flex: 1, backgroundColor: '#525659', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {docSeleccionado ? (
              <>
                <div style={{ padding: '10px 20px', backgroundColor: '#323639', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{docSeleccionado.nombre} {docSeleccionado.version ? `- ${docSeleccionado.version}` : ''}</span>
                  <a href={docSeleccionado.url} target="_blank" rel="noopener noreferrer" style={{ color: 'white', textDecoration: 'underline', fontSize: '13px' }}>Abrir en nueva pestaña ↗</a>
                </div>
                <iframe src={`${docSeleccionado.url}#toolbar=1&navpanes=0`} style={{ flex: 1, width: '100%', border: 'none' }} title="Visor PDF" />
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', flexDirection: 'column' }}>
                <div style={{ fontSize: '50px', marginBottom: '10px' }}>👁️</div>
                <p>Selecciona un documento de la izquierda para visualizarlo</p>
              </div>
            )}
          </div>

        </div>
      </div>
    )
  }
}