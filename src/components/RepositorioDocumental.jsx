import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'
import { PageHeader, Card, Input, Select, Boton } from './ui'

export default function RepositorioDocumental({ setPantalla }) {
  // Vistas: 'menu', 'menu_subir', 'form_subir', 'visualizar'
  const [vista, setVista] = useState('menu') 
  
  // Estados para Subir
  const [archivo, setArchivo] = useState(null)
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState('')
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
    if (!categoria) return toast.error('Selecciona una categoría')
    
    setSubiendo(true)
    
    const fileExt = archivo.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `${categoria}/${fileName}`

    // 1. Subir a Storage
    const { error: uploadError } = await supabase.storage
      .from('documentos_sigmo')
      .upload(filePath, archivo)

    if (uploadError) {
      toast.error('Error al subir: ' + uploadError.message)
      setSubiendo(false)
      return
    }

    // 2. Obtener URL
    const { data: { publicUrl } } = supabase.storage
      .from('documentos_sigmo')
      .getPublicUrl(filePath)

    // 3. Guardar en DB
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
      setCategoria('')
      setVista('visualizar')
    }
    setSubiendo(false)
  }

  // Función para iniciar la subida con una categoría específica
  const iniciarSubida = (cat) => {
    setCategoria(cat)
    setVista('form_subir')
  }

  // --- 1. MENÚ PRINCIPAL ---
  if (vista === 'menu') {
    return (
      <div className="page-container" style={{ maxWidth: '900px', marginTop: '50px' }}>
        {/* Cabecera corregida para evitar solapamiento */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
          <PageHeader titulo="Repositorio Documental" subtitulo="Gestiona los archivos de la plataforma" />
          <Boton variante="outline" onClick={() => setPantalla('')}>← Volver a SIGMO</Boton>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px', marginTop: '20px' }}>
          
          <Card 
            style={{ textAlign: 'center', padding: '40px 20px', cursor: 'pointer', border: '2px solid transparent', transition: 'all 0.2s' }} 
            onClick={() => setVista('visualizar')}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary-blue)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
          >
            <div style={{ fontSize: '60px', marginBottom: '15px' }}>📂</div>
            <h3 style={{ color: 'var(--primary-blue)', marginBottom: '10px', fontSize: '22px' }}>Visualizar Documentos</h3>
            <p style={{ color: 'var(--text-light)', fontSize: '15px' }}>Explora, busca y descarga los archivos existentes.</p>
          </Card>

          <Card 
            style={{ textAlign: 'center', padding: '40px 20px', cursor: 'pointer', border: '2px solid transparent', transition: 'all 0.2s' }} 
            onClick={() => setVista('menu_subir')}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary-blue)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
          >
            <div style={{ fontSize: '60px', marginBottom: '15px' }}>📤</div>
            <h3 style={{ color: 'var(--primary-blue)', marginBottom: '10px', fontSize: '22px' }}>Subir Documento</h3>
            <p style={{ color: 'var(--text-light)', fontSize: '15px' }}>Añade nuevos archivos al repositorio de SIGMO.</p>
          </Card>
        </div>
      </div>
    )
  }

  // --- 2. SUBMENÚ: ¿QUÉ TIPO DE DOCUMENTO VAS A SUBIR? ---
  if (vista === 'menu_subir') {
    return (
      <div className="page-container" style={{ maxWidth: '1000px', marginTop: '50px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
          <PageHeader titulo="¿Qué documento vas a subir?" subtitulo="Selecciona la categoría correspondiente" />
          <Boton variante="outline" onClick={() => setVista('menu')}>← Volver al menú</Boton>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          
          {/* Operativos */}
          <Card style={{ textAlign: 'center', padding: '30px 15px', cursor: 'pointer' }} onClick={() => iniciarSubida('Operativos')}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>📋</div>
            <h4 style={{ color: 'var(--text-dark)', marginBottom: '5px' }}>Documentos Operativos</h4>
            <p style={{ color: 'var(--text-light)', fontSize: '13px', margin: 0 }}>Partes diarios, SCOP, inventarios.</p>
          </Card>

          {/* Técnicos */}
          <Card style={{ textAlign: 'center', padding: '30px 15px', cursor: 'pointer' }} onClick={() => iniciarSubida('Técnicos')}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>⚙️</div>
            <h4 style={{ color: 'var(--text-dark)', marginBottom: '5px' }}>Documentos Técnicos</h4>
            <p style={{ color: 'var(--text-light)', fontSize: '13px', margin: 0 }}>Planos, manuales, certificados.</p>
          </Card>

          {/* Guías */}
          <Card style={{ textAlign: 'center', padding: '30px 15px', cursor: 'pointer' }} onClick={() => iniciarSubida('Guías')}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>🚚</div>
            <h4 style={{ color: 'var(--text-dark)', marginBottom: '5px' }}>Registro de Guías</h4>
            <p style={{ color: 'var(--text-light)', fontSize: '13px', margin: 0 }}>Guías de remisión y transporte.</p>
          </Card>

          {/* Otros */}
          <Card style={{ textAlign: 'center', padding: '30px 15px', cursor: 'pointer' }} onClick={() => iniciarSubida('Otros')}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>📁</div>
            <h4 style={{ color: 'var(--text-dark)', marginBottom: '5px' }}>Registro de Otros</h4>
            <p style={{ color: 'var(--text-light)', fontSize: '13px', margin: 0 }}>Contratos, facturas, documentos varios.</p>
          </Card>

        </div>
      </div>
    )
  }

  // --- 3. FORMULARIO DE SUBIDA (Recibe la categoría elegida) ---
  if (vista === 'form_subir') {
    return (
      <div className="page-container" style={{ maxWidth: '600px', marginTop: '50px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
          <PageHeader titulo={`Subir ${categoria}`} subtitulo="Completa los datos del archivo" />
          <Boton variante="outline" onClick={() => setVista('menu_subir')}>← Volver</Boton>
        </div>

        <Card>
          <form onSubmit={handleSubir} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ padding: '30px 20px', border: '2px dashed #cbd5e1', borderRadius: '8px', textAlign: 'center', backgroundColor: '#f8fafc', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => document.getElementById('file-upload').click()}>
              <div style={{ fontSize: '30px', marginBottom: '10px' }}>☁️</div>
              <input 
                type="file" 
                onChange={(e) => setArchivo(e.target.files[0])} 
                style={{ display: 'none' }} 
                id="file-upload"
              />
              <span style={{ color: 'var(--primary-blue)', fontWeight: 'bold', fontSize: '15px' }}>
                {archivo ? `✅ Archivo seleccionado: ${archivo.name}` : 'Haz clic aquí para buscar tu archivo'}
              </span>
              <p style={{ color: 'var(--text-light)', fontSize: '12px', marginTop: '5px', margin: 0 }}>PDF, Word, Excel, Imágenes (Max 10MB)</p>
            </div>

            <Input 
              label="Nombre del documento (Opcional)" 
              value={nombre} 
              onChange={(e) => setNombre(e.target.value)} 
              placeholder="Si lo dejas vacío, usaremos el nombre del archivo" 
            />

            <Input 
              label="Descripción (Opcional)" 
              value={descripcion} 
              onChange={(e) => setDescripcion(e.target.value)} 
              placeholder="Breve descripción del contenido" 
            />

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <Boton variante="outline" onClick={() => setVista('menu_subir')} style={{ flex: 1 }}>
                Cancelar
              </Boton>
              <Boton tipo="submit" variante="primary" disabled={subiendo} style={{ flex: 2 }}>
                {subiendo ? 'Subiendo...' : 'Confirmar Subida'}
              </Boton>
            </div>
          </form>
        </Card>
      </div>
    )
  }

  // --- 4. VISUALIZAR DOCUMENTOS (Tabla) ---
  if (vista === 'visualizar') {
    return (
      <div className="page-container" style={{ maxWidth: '1000px', marginTop: '50px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
          <PageHeader titulo="Documentos Disponibles" subtitulo="Historial de archivos en SIGMO" />
          <Boton variante="outline" onClick={() => setVista('menu')}>← Volver al menú</Boton>
        </div>

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {cargandoDocs ? (
            <p style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)' }}>Cargando documentos...</p>
          ) : documentos.length === 0 ? (
            <p style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)' }}>No hay documentos en el repositorio aún.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', minWidth: '800px' }}>
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
                      <td style={{ padding: '15px' }}>
                        <div style={{ fontWeight: 'bold', color: 'var(--text-dark)' }}>{doc.nombre}</div>
                        {doc.descripcion && <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>{doc.descripcion}</div>}
                      </td>
                      <td style={{ padding: '15px' }}>
                        <span style={{ padding: '4px 10px', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
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
            </div>
          )}
        </Card>
      </div>
    )
  }
}