import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'
import { PageHeader, Card, Input, Boton } from './ui'

export default function RepositorioDocumental({ setPantalla }) {
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

  // --- VALIDACIÓN DE ARCHIVOS ---
  const manejarSeleccionArchivo = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validar tamaño (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo supera el límite de 10MB')
      e.target.value = '' // Limpiar input
      return
    }

    // Validar formato (opcional, según tu necesidad)
    const extensionesPermitidas = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg']
    const extension = file.name.split('.').pop().toLowerCase()
    if (!extensionesPermitidas.includes(extension)) {
      toast.error('Formato no permitido. Usa PDF, Word, Excel o Imágenes.')
      e.target.value = ''
      return
    }

    setArchivo(file)
  }

  // --- SUBIR DOCUMENTO ---
  async function handleSubir(e) {
    e.preventDefault()
    if (!archivo) return toast.error('Selecciona un archivo')
    if (!categoria) return toast.error('Selecciona una categoría')
    
    setSubiendo(true)
    
    try {
      const fileExt = archivo.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}` // Nombre único
      const filePath = `${categoria}/${fileName}`

      // 1. Subir a Storage
      const { error: uploadError } = await supabase.storage
        .from('documentos_sigmo')
        .upload(filePath, archivo, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // 2. Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('documentos_sigmo')
        .getPublicUrl(filePath)

      // 3. Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser()

      // 4. Guardar en DB
      const { error: dbError } = await supabase
        .from('documentos')
        .insert({
          nombre: nombre.trim() || archivo.name,
          categoria,
          descripcion: descripcion.trim(),
          url: publicUrl,
          subido_por: user.id
        })

      if (dbError) throw dbError

      // Éxito
      toast.success('Documento subido correctamente')
      setArchivo(null)
      setNombre('')
      setDescripcion('')
      setCategoria('')
      setVista('visualizar') // Ir a ver los archivos

    } catch (error) {
      console.error(error)
      toast.error('Error al subir: ' + (error.message || 'Inténtalo de nuevo'))
    } finally {
      setSubiendo(false)
    }
  }

  const iniciarSubida = (cat) => {
    setCategoria(cat)
    setVista('form_subir')
  }

  // Helper para formatear el peso del archivo
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
  }

  // --- 1. MENÚ PRINCIPAL ---
  if (vista === 'menu') {
    return (
      <div className="page-container" style={{ maxWidth: '900px', marginTop: '50px' }}>
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

  // --- 2. SUBMENÚ: CATEGORÍAS ---
  if (vista === 'menu_subir') {
    return (
      <div className="page-container" style={{ maxWidth: '1000px', marginTop: '50px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
          <PageHeader titulo="¿Qué documento vas a subir?" subtitulo="Selecciona la categoría correspondiente" />
          <Boton variante="outline" onClick={() => setVista('menu')}>← Volver al menú</Boton>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          <Card style={{ textAlign: 'center', padding: '30px 15px', cursor: 'pointer' }} onClick={() => iniciarSubida('Operativos')}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>📋</div>
            <h4 style={{ color: 'var(--text-dark)', marginBottom: '5px' }}>Operativos</h4>
            <p style={{ color: 'var(--text-light)', fontSize: '13px', margin: 0 }}>Partes diarios, inventarios.</p>
          </Card>

          <Card style={{ textAlign: 'center', padding: '30px 15px', cursor: 'pointer' }} onClick={() => iniciarSubida('Técnicos')}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>⚙️</div>
            <h4 style={{ color: 'var(--text-dark)', marginBottom: '5px' }}>Técnicos</h4>
            <p style={{ color: 'var(--text-light)', fontSize: '13px', margin: 0 }}>Planos, manuales, certificados.</p>
          </Card>

          <Card style={{ textAlign: 'center', padding: '30px 15px', cursor: 'pointer' }} onClick={() => iniciarSubida('Guías')}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>🚚</div>
            <h4 style={{ color: 'var(--text-dark)', marginBottom: '5px' }}>Guías</h4>
            <p style={{ color: 'var(--text-light)', fontSize: '13px', margin: 0 }}>Guías de remisión y transporte.</p>
          </Card>

          <Card style={{ textAlign: 'center', padding: '30px 15px', cursor: 'pointer' }} onClick={() => iniciarSubida('Otros')}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>📁</div>
            <h4 style={{ color: 'var(--text-dark)', marginBottom: '5px' }}>Otros</h4>
            <p style={{ color: 'var(--text-light)', fontSize: '13px', margin: 0 }}>Contratos, facturas, varios.</p>
          </Card>
        </div>
      </div>
    )
  }

  // --- 3. FORMULARIO DE SUBIDA ---
  if (vista === 'form_subir') {
    return (
      <div className="page-container" style={{ maxWidth: '600px', marginTop: '50px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
          <PageHeader titulo={`Subir ${categoria}`} subtitulo="Completa los datos del archivo" />
          <Boton variante="outline" onClick={() => setVista('menu_subir')}>← Volver</Boton>
        </div>

        <Card>
          <form onSubmit={handleSubir} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* ZONA DE CARGA DE ARCHIVO */}
            <div 
              style={{ 
                padding: '30px 20px', 
                border: archivo ? '2px solid var(--primary-green)' : '2px dashed #cbd5e1', 
                borderRadius: '8px', 
                textAlign: 'center', 
                backgroundColor: archivo ? '#f0fdf4' : '#f8fafc', 
                cursor: subiendo ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }} 
              onClick={() => !subiendo && document.getElementById('file-upload').click()}
            >
              <div style={{ fontSize: '35px', marginBottom: '10px' }}>
                {archivo ? '✅' : '☁️'}
              </div>
              <input 
                type="file" 
                onChange={manejarSeleccionArchivo} 
                style={{ display: 'none' }} 
                id="file-upload"
                disabled={subiendo}
              />
              
              {archivo ? (
                <div>
                  <p style={{ color: 'var(--success-green)', fontWeight: 'bold', fontSize: '15px', margin: '0 0 5px 0' }}>
                    {archivo.name}
                  </p>
                  <p style={{ color: 'var(--text-light)', fontSize: '13px', margin: 0 }}>
                    Peso: {formatBytes(archivo.size)}
                  </p>
                </div>
              ) : (
                <div>
                  <span style={{ color: 'var(--primary-blue)', fontWeight: 'bold', fontSize: '15px' }}>
                    Haz clic aquí para buscar tu archivo
                  </span>
                  <p style={{ color: 'var(--text-light)', fontSize: '12px', marginTop: '5px', margin: 0 }}>
                    PDF, Word, Excel, Imágenes (Máx. 10MB)
                  </p>
                </div>
              )}
            </div>

            <Input 
              label="Nombre del documento (Opcional)" 
              value={nombre} 
              onChange={(e) => setNombre(e.target.value)} 
              placeholder="Si lo dejas vacío, usaremos el nombre del archivo" 
              disabled={subiendo}
            />

            <Input 
              label="Descripción (Opcional)" 
              value={descripcion} 
              onChange={(e) => setDescripcion(e.target.value)} 
              placeholder="Breve descripción del contenido" 
              disabled={subiendo}
            />

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <Boton variante="outline" onClick={() => setVista('menu_subir')} style={{ flex: 1 }} disabled={subiendo}>
                Cancelar
              </Boton>
              <Boton tipo="submit" variante="primary" disabled={subiendo || !archivo} style={{ flex: 2 }}>
                {subiendo ? '⏳ Subiendo archivo...' : 'Confirmar Subida'}
              </Boton>
            </div>
          </form>
        </Card>
      </div>
    )
  }

  // --- 4. VISUALIZAR DOCUMENTOS ---
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