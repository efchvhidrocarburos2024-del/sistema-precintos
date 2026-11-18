import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'
import { PageHeader, Card, Input, Select, Boton } from './ui'

export default function RepositorioDocumental({ setPantalla }) {
  const [vista, setVista] = useState('menu') // 'menu', 'subir', 'visualizar'
  
  // Estados para Subir
  const [archivo, setArchivo] = useState(null)
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState('General')
  const [descripcion, setDescripcion] = useState('')
  const [subiendo, setSubiendo] = useState(false)

  // Estados para Visualizar
  const [documentos, setDocumentos] = useState([])
  const [cargandoDocs, setCargandoDocs] = useState(false)

  // Cargar documentos cuando se selecciona "Visualizar"
  useEffect(() => {
    if (vista === 'visualizar') {
      cargarDocumentos()
    }
  }, [vista])

  async function cargarDocumentos() {
    setCargandoDocs(true)
    const { data, error } = await supabase
      .from('documentos')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) toast.error('Error al cargar documentos')
    else setDocumentos(data || [])
    setCargandoDocs(false)
  }

  async function handleSubir(e) {
    e.preventDefault()
    if (!archivo) return toast.error('Selecciona un archivo')
    
    setSubiendo(true)
    
    // 1. Subir archivo a Storage
    const fileExt = archivo.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `${categoria}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('documentos_sigmo')
      .upload(filePath, archivo)

    if (uploadError) {
      toast.error('Error al subir: ' + uploadError.message)
      setSubiendo(false)
      return
    }

    // 2. Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('documentos_sigmo')
      .getPublicUrl(filePath)

    // 3. Guardar en la base de datos
    const { error: dbError } = await supabase
      .from('documentos')
      .insert({
        nombre: nombre || archivo.name,
        categoria,
        descripcion,
        url: publicUrl,
        subido_por: (await supabase.auth.getUser()).data.user.id
      })

    if (dbError) {
      toast.error('Error al guardar en base de datos')
    } else {
      toast.success('Documento subido exitosamente')
      setArchivo(null)
      setNombre('')
      setDescripcion('')
      setVista('visualizar') // Lo enviamos a ver los documentos
    }
    setSubiendo(false)
  }

  // --- RENDERIZADO DEL MENÚ PRINCIPAL ---
  if (vista === 'menu') {
    return (
      <div className="page-container" style={{ maxWidth: '900px', marginTop: '50px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <PageHeader titulo="Repositorio Documental" />
          <Boton variante="outline" onClick={() => setPantalla('')}>← Volver a SIGMO</Boton>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px', marginTop: '40px' }}>
          
          {/* Opción 1: Visualizar */}
          <Card style={{ textAlign: 'center', padding: '40px 20px', cursor: 'pointer', border: '2px solid transparent' }} onClick={() => setVista('visualizar')}>
            <div style={{ fontSize: '60px', marginBottom: '15px' }}>📂</div>
            <h3 style={{ color: 'var(--primary-blue)', marginBottom: '10px' }}>Visualizar Documentos</h3>
            <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>Explora, busca y descarga los archivos existentes.</p>
          </Card>

          {/* Opción 2: Subir */}
          <Card style={{ textAlign: 'center', padding: '40px 20px', cursor: 'pointer', border: '2px solid transparent' }} onClick={() => setVista('subir')}>
            <div style={{ fontSize: '60px', marginBottom: '15px' }}>📤</div>
            <h3 style={{ color: 'var(--primary-blue)', marginBottom: '10px' }}>Subir Documento</h3>
            <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>Añade nuevos archivos al repositorio de SIGMO.</p>
          </Card>
        </div>
      </div>
    )
  }

  // --- VISTA: SUBIR DOCUMENTO ---
  if (vista === 'subir') {
    return (
      <div className="page-container" style={{ maxWidth: '600px', marginTop: '50px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '15px' }}>
          <Boton variante="outline" onClick={() => setVista('menu')}>← Volver</Boton>
          <PageHeader titulo="Subir Nuevo Documento" />
        </div>

        <Card>
          <form onSubmit={handleSubir} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ padding: '20px', border: '2px dashed #ccc', borderRadius: '8px', textAlign: 'center', backgroundColor: '#f9fafb' }}>
              <input 
                type="file" 
                onChange={(e) => setArchivo(e.target.files[0])} 
                style={{ display: 'none' }} 
                id="file-upload"
              />
              <label htmlFor="file-upload" style={{ cursor: 'pointer', color: 'var(--primary-blue)', fontWeight: 'bold' }}>
                {archivo ? `📄 ${archivo.name}` : 'Haz clic aquí para seleccionar un archivo'}
              </label>
            </div>

            <Input label="Nombre del documento (Opcional)" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Contrato 2024" />
            
            <Select 
              label="Categoría" 
              value={categoria} 
              onChange={(e) => setCategoria(e.target.value)}
              options={[
                { value: 'General', label: 'General' },
                { value: 'Contratos', label: 'Contratos' },
                { value: 'Planos', label: 'Planos' },
                { value: 'Reportes', label: 'Reportes' },
                { value: 'Facturas', label: 'Facturas' }
              ]}
            />

            <Input label="Descripción (Opcional)" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Breve descripción del archivo" />

            <Boton tipo="submit" variante="primary" disabled={subiendo} style={{ marginTop: '10px' }}>
              {subiendo ? 'Subiendo...' : 'Subir Documento'}
            </Boton>
          </form>
        </Card>
      </div>
    )
  }

  // --- VISTA: VISUALIZAR DOCUMENTOS ---
  if (vista === 'visualizar') {
    return (
      <div className="page-container" style={{ maxWidth: '1000px', marginTop: '50px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '15px' }}>
          <Boton variante="outline" onClick={() => setVista('menu')}>← Volver</Boton>
          <PageHeader titulo="Documentos Disponibles" />
        </div>

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {cargandoDocs ? (
            <p style={{ padding: '30px', textAlign: 'center' }}>Cargando documentos...</p>
          ) : documentos.length === 0 ? (
            <p style={{ padding: '30px', textAlign: 'center', color: 'var(--text-light)' }}>No hay documentos en el repositorio aún.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead style={{ backgroundColor: 'var(--primary-blue)', color: 'white' }}>
                <tr style={{ textAlign: 'left' }}>
                  <th style={{ padding: '15px' }}>NOMBRE</th>
                  <th style={{ padding: '15px' }}>CATEGORÍA</th>
                  <th style={{ padding: '15px' }}>FECHA</th>
                  <th style={{ padding: '15px', textAlign: 'center' }}>ACCIÓN</th>
                </tr>
              </thead>
              <tbody>
                {documentos.map((doc) => (
                  <tr key={doc.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '15px', fontWeight: 'bold' }}>{doc.nombre}</td>
                    <td style={{ padding: '15px' }}>
                      <span style={{ padding: '4px 8px', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                        {doc.categoria}
                      </span>
                    </td>
                    <td style={{ padding: '15px', color: 'var(--text-light)' }}>
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                        <Boton variante="outline" tamano="sm">📥 Descargar</Boton>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    )
  }
}