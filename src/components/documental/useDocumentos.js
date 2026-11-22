// ============================================================================
//  SIGMO · Repositorio Documental · Fuente única de estado
//  Supabase cuando el esquema existe · acervo local con semilla si no.
//  Toda traducción de columnas pasa por esquema.js.
// ============================================================================
import { useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../../supabase'
import { uid, slugify, tipoDesdeNombre, LIMITE_BYTES, PLANTAS_RESPALDO } from './constantes'
import { desdeBD, haciaBD, categoriaUI, categoriaBD } from './esquema'
import { construirSemilla } from './datos'

const CLAVE_LOCAL = 'sigmo_repositorio_v2'
const BUCKET = 'documentos_sigmo'
const CARPETA = 'repositorio'

const leerLocal = () => {
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE_LOCAL))
    return d?.documentos?.length ? d : null
  } catch { return null }
}
const escribirLocal = (d) => {
  try { localStorage.setItem(CLAVE_LOCAL, JSON.stringify(d)) } catch { /* cuota */ }
}

export default function useDocumentos({ usuario = 'sistema@sigmo.pe' } = {}) {
  const [categorias, setCategorias] = useState([])
  const [documentos, setDocumentos] = useState([])
  const [versiones, setVersiones] = useState([])
  const [auditoria, setAuditoria] = useState([])
  const [catalogos, setCatalogos] = useState({ plantas: PLANTAS_RESPALDO, productos: [], proveedores: [] })
  const [cargando, setCargando] = useState(true)
  const [modo, setModo] = useState('supabase')
  const [progreso, setProgreso] = useState(null)

  const modoRef = useRef('supabase')
  const usuariosRef = useRef(new Map())
  const usuarioIdRef = useRef(null)
  const estadoRef = useRef({ categorias: [], documentos: [], versiones: [], auditoria: [] })
  const deshacerRef = useRef(null)

  useEffect(() => {
    estadoRef.current = { categorias, documentos, versiones, auditoria }
    if (modoRef.current === 'local') escribirLocal(estadoRef.current)
  }, [categorias, documentos, versiones, auditoria])

  // ------------------------------------------------------------- auditoría --
  const auditar = useCallback(async (accion, doc, detalle = '') => {
    const reg = {
      id: uid(), documento_id: doc?.id ?? null, titulo: doc?.titulo ?? '—',
      accion, detalle, usuario, created_at: new Date().toISOString(),
    }
    setAuditoria(p => [reg, ...p].slice(0, 500))
    if (modoRef.current === 'supabase') {
      try {
        await supabase.from('documento_auditoria').insert({
          documento_id: reg.documento_id, titulo: reg.titulo, accion, detalle, usuario,
        })
      } catch { /* la bitácora nunca bloquea la operación */ }
    }
  }, [usuario])

  // ----------------------------------------------------------------- carga --
  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const { data: cats, error } = await supabase
        .from('documento_categorias').select('*').order('orden', { ascending: true })
      if (error) throw error

      // Usuarios: mapa uuid → email/nombre, y uuid del usuario autenticado.
      const { data: usrs } = await supabase
        .from('usuarios').select('id_usuario, email, nombre_completo')
      const mapa = new Map((usrs || []).map(u => [u.id_usuario, { email: u.email, nombre_completo: u.nombre_completo }]))
      usuariosRef.current = mapa
      usuarioIdRef.current = (usrs || []).find(u => u.email?.toLowerCase() === usuario.toLowerCase())?.id_usuario || null

      const [rD, rV, rA] = await Promise.all([
        supabase.from('documentos').select('*').order('created_at', { ascending: false }),
        supabase.from('documento_versiones').select('*').order('created_at', { ascending: false }),
        supabase.from('documento_auditoria').select('*').order('created_at', { ascending: false }).limit(300),
      ])
      if (rD.error) throw rD.error

      // Catálogos maestros reales
      const [rPl, rPr, rPv] = await Promise.all([
        supabase.from('plantas').select('codigo, nombre, activo').eq('activo', true).order('nombre'),
        supabase.from('productos').select('nombre, codigo, activo').eq('activo', true).order('nombre'),
        supabase.from('proveedores').select('nombre, codigo, activo').eq('activo', true).order('nombre'),
      ])

      modoRef.current = 'supabase'
      setModo('supabase')
      setCategorias((cats || []).map(categoriaUI))
      setDocumentos((rD.data || []).map(r => desdeBD(r, mapa)))
      setVersiones(rV.data || [])
      setAuditoria(rA.data || [])
      setCatalogos({
        plantas: rPl.data?.length ? rPl.data.map(p => p.nombre || p.codigo) : PLANTAS_RESPALDO,
        productos: rPr.data?.map(p => p.nombre) || [],
        proveedores: rPv.data?.map(p => p.nombre) || [],
      })
    } catch {
      const local = leerLocal() || construirSemilla()
      modoRef.current = 'local'
      setModo('local')
      setCategorias(local.categorias)
      setDocumentos(local.documentos)
      setVersiones(local.versiones)
      setAuditoria(local.auditoria)
      setCatalogos({ plantas: PLANTAS_RESPALDO, productos: [], proveedores: [] })
    } finally {
      setCargando(false)
    }
  }, [usuario])

  useEffect(() => { cargar() }, [cargar])

  // ------------------------------------------------------------ utilidades --
  const toastDeshacer = useCallback((mensaje, revertir) => {
    deshacerRef.current = revertir
    toast.custom((t) => (
      <div className={`rd-toast ${t.visible ? 'rd-toast-in' : 'rd-toast-out'}`}>
        <span>↩️</span>
        <span className="rd-toast-txt">{mensaje}</span>
        <button className="rd-toast-btn" onClick={() => { deshacerRef.current?.(); deshacerRef.current = null; toast.dismiss(t.id) }}>
          Deshacer
        </button>
        <button className="rd-toast-x" onClick={() => toast.dismiss(t.id)} aria-label="Cerrar">✕</button>
      </div>
    ), { duration: 7000 })
  }, [])

  const subirArchivo = useCallback(async (archivo) => {
    if (archivo.size > LIMITE_BYTES) throw new Error(`"${archivo.name}" supera el límite de 25 MB.`)
    const ruta = `${CARPETA}/${Date.now()}_${archivo.name.replace(/\s+/g, '_')}`
    const { error } = await supabase.storage.from(BUCKET).upload(ruta, archivo, { upsert: false })
    if (error) throw error
    return supabase.storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl
  }, [])

  const ctx = () => ({ usuarioId: usuarioIdRef.current })

  // ------------------------------------------------------------ documentos --
  const crearDocumentos = useCallback(async (lote) => {
    const creados = []
    for (let i = 0; i < lote.length; i++) {
      const item = lote[i]
      setProgreso({ actual: i + 1, total: lote.length, nombre: item.archivo?.name || item.titulo })

      let url = null
      if (item.archivo && modoRef.current === 'supabase') {
        try { url = await subirArchivo(item.archivo) }
        catch (e) { toast.error(`${item.archivo.name}: ${e.message}`); continue }
      } else if (item.archivo) {
        await new Promise(r => setTimeout(r, 240))
      }

      const ui = {
        titulo: item.titulo.trim(),
        descripcion: item.descripcion?.trim() || '',
        categoria_id: item.categoria_id || null,
        tipo: item.archivo ? tipoDesdeNombre(item.archivo.name) : (item.tipo || 'pdf'),
        nombre_archivo: item.archivo?.name || `${slugify(item.titulo)}.pdf`,
        url_archivo: url,
        tamano_bytes: item.archivo?.size || 0,
        version: item.version?.trim() || '1.0',
        etiquetas: item.etiquetas || [],
        planta: item.planta || null,
        proveedor: item.proveedor || null,
        producto: item.producto || null,
        vigente: item.vigente !== false,
        destacado: false, descargas: 0,
        eliminado: false, eliminado_en: null,
      }

      let id = uid()
      if (modoRef.current === 'supabase') {
        const { data, error } = await supabase.from('documentos').insert(haciaBD(ui, ctx())).select().single()
        if (error) { toast.error(`No se pudo registrar "${ui.titulo}": ${error.message}`); continue }
        id = data.id
        await supabase.from('documento_versiones').insert({
          documento_id: id, version: ui.version, nota: 'Versión inicial publicada.',
          nombre_archivo: ui.nombre_archivo, url_archivo: url, tamano_bytes: ui.tamano_bytes, subido_por: usuario,
        })
      }

      const nuevo = {
        ...ui, id,
        subido_por: usuario, subido_por_nombre: null, subido_por_id: usuarioIdRef.current,
        created_at: new Date().toISOString(), actualizado_en: new Date().toISOString(),
      }
      setDocumentos(p => [nuevo, ...p])
      setVersiones(p => [{
        id: uid(), documento_id: id, version: ui.version, nota: 'Versión inicial publicada.',
        nombre_archivo: ui.nombre_archivo, url_archivo: url, tamano_bytes: ui.tamano_bytes,
        subido_por: usuario, created_at: nuevo.created_at,
      }, ...p])
      auditar('SUBIDA', nuevo, `Versión ${ui.version} · ${ui.categoria_id || 'sin categoría'}`)
      creados.push(nuevo)
    }
    setProgreso(null)
    if (creados.length) toast.success(`${creados.length} documento${creados.length > 1 ? 's' : ''} publicado${creados.length > 1 ? 's' : ''}`)
    return creados
  }, [subirArchivo, usuario, auditar])

  const actualizarDocumento = useCallback(async (id, cambios) => {
    const previo = estadoRef.current.documentos.find(d => d.id === id)
    if (!previo) return
    setDocumentos(p => p.map(d => d.id === id ? { ...d, ...cambios, actualizado_en: new Date().toISOString() } : d))
    if (modoRef.current === 'supabase') {
      const { error } = await supabase.from('documentos').update(haciaBD(cambios, ctx())).eq('id', id)
      if (error) {
        setDocumentos(p => p.map(d => d.id === id ? previo : d))
        return toast.error('No se pudo guardar: ' + error.message)
      }
    }
    auditar('ACTUALIZACIÓN', { ...previo, ...cambios }, Object.keys(cambios).join(', '))
    toast.success('Documento actualizado')
  }, [auditar])

  const alternarVigente = useCallback(async (id) => {
    const doc = estadoRef.current.documentos.find(d => d.id === id)
    if (!doc) return
    const vigente = !doc.vigente
    setDocumentos(p => p.map(d => d.id === id ? { ...d, vigente } : d))
    if (modoRef.current === 'supabase') await supabase.from('documentos').update({ vigente }).eq('id', id)
    auditar('VIGENCIA', doc, vigente ? 'Marcado como vigente' : 'Marcado como obsoleto')
    toast.success(vigente ? 'Documento vigente' : 'Documento obsoleto')
  }, [auditar])

  const alternarDestacado = useCallback(async (id) => {
    const doc = estadoRef.current.documentos.find(d => d.id === id)
    if (!doc) return
    const destacado = !doc.destacado
    setDocumentos(p => p.map(d => d.id === id ? { ...d, destacado } : d))
    if (modoRef.current === 'supabase') await supabase.from('documentos').update({ destacado }).eq('id', id)
    auditar('DESTACADO', doc, destacado ? 'Añadido a destacados' : 'Retirado de destacados')
  }, [auditar])

  const archivar = useCallback(async (ids) => {
    const lista = Array.isArray(ids) ? ids : [ids]
    const afectados = estadoRef.current.documentos.filter(d => lista.includes(d.id))
    if (!afectados.length) return
    const marca = new Date().toISOString()
    setDocumentos(p => p.map(d => lista.includes(d.id) ? { ...d, eliminado: true, eliminado_en: marca } : d))
    if (modoRef.current === 'supabase') await supabase.from('documentos').update({ eliminado: true, eliminado_en: marca }).in('id', lista)
    afectados.forEach(d => auditar('ARCHIVADO', d, 'Enviado a la papelera'))
    toastDeshacer(`${afectados.length} documento${afectados.length > 1 ? 's' : ''} en la papelera`, () => {
      setDocumentos(p => p.map(d => lista.includes(d.id) ? { ...d, eliminado: false, eliminado_en: null } : d))
      if (modoRef.current === 'supabase') supabase.from('documentos').update({ eliminado: false, eliminado_en: null }).in('id', lista)
      toast.success('Restaurado')
    })
  }, [auditar, toastDeshacer])

  const restaurar = useCallback(async (ids) => {
    const lista = Array.isArray(ids) ? ids : [ids]
    setDocumentos(p => p.map(d => lista.includes(d.id) ? { ...d, eliminado: false, eliminado_en: null } : d))
    if (modoRef.current === 'supabase') await supabase.from('documentos').update({ eliminado: false, eliminado_en: null }).in('id', lista)
    estadoRef.current.documentos.filter(d => lista.includes(d.id)).forEach(d => auditar('RESTAURADO', d, 'Recuperado de la papelera'))
    toast.success(`${lista.length} documento${lista.length > 1 ? 's' : ''} restaurado${lista.length > 1 ? 's' : ''}`)
  }, [auditar])

  const eliminarDefinitivo = useCallback(async (ids) => {
    const lista = Array.isArray(ids) ? ids : [ids]
    const afectados = estadoRef.current.documentos.filter(d => lista.includes(d.id))
    setDocumentos(p => p.filter(d => !lista.includes(d.id)))
    setVersiones(p => p.filter(v => !lista.includes(v.documento_id)))
    if (modoRef.current === 'supabase') {
      const rutas = afectados.map(d => d.url_archivo).filter(Boolean).map(u => u.split(`/${BUCKET}/`)[1]).filter(Boolean)
      if (rutas.length) await supabase.storage.from(BUCKET).remove(rutas)
      await supabase.from('documentos').delete().in('id', lista)
    }
    afectados.forEach(d => auditar('ELIMINACIÓN', d, 'Borrado definitivo'))
    toast.success('Eliminado definitivamente')
  }, [auditar])

  const reasignarCategoria = useCallback(async (ids, slug) => {
    const lista = Array.isArray(ids) ? ids : [ids]
    setDocumentos(p => p.map(d => lista.includes(d.id) ? { ...d, categoria_id: slug } : d))
    if (modoRef.current === 'supabase') await supabase.from('documentos').update({ categoria: slug }).in('id', lista)
    toast.success(`${lista.length} documento${lista.length > 1 ? 's' : ''} reclasificado${lista.length > 1 ? 's' : ''}`)
  }, [])

  const marcarVigenteLote = useCallback(async (ids, vigente) => {
    const lista = Array.isArray(ids) ? ids : [ids]
    setDocumentos(p => p.map(d => lista.includes(d.id) ? { ...d, vigente } : d))
    if (modoRef.current === 'supabase') await supabase.from('documentos').update({ vigente }).in('id', lista)
    toast.success(`${lista.length} documento${lista.length > 1 ? 's' : ''} actualizado${lista.length > 1 ? 's' : ''}`)
  }, [])

  const registrarDescarga = useCallback(async (id) => {
    const doc = estadoRef.current.documentos.find(d => d.id === id)
    if (!doc) return
    const descargas = (doc.descargas || 0) + 1
    setDocumentos(p => p.map(d => d.id === id ? { ...d, descargas } : d))
    if (modoRef.current === 'supabase') await supabase.from('documentos').update({ descargas }).eq('id', id)
    auditar('DESCARGA', doc, 'Descarga desde la biblioteca')
  }, [auditar])

  const agregarVersion = useCallback(async (documentoId, { version, nota, archivo }) => {
    const doc = estadoRef.current.documentos.find(d => d.id === documentoId)
    if (!doc) return
    let url = doc.url_archivo, bytes = doc.tamano_bytes, nombre = doc.nombre_archivo
    if (archivo && modoRef.current === 'supabase') {
      try { url = await subirArchivo(archivo); bytes = archivo.size; nombre = archivo.name }
      catch (e) { return toast.error(e.message) }
    } else if (archivo) { bytes = archivo.size; nombre = archivo.name }

    const reg = {
      id: uid(), documento_id: documentoId, version: version.trim(),
      nota: nota?.trim() || 'Nueva versión publicada.', nombre_archivo: nombre,
      url_archivo: url, tamano_bytes: bytes, subido_por: usuario, created_at: new Date().toISOString(),
    }
    setVersiones(p => [reg, ...p])
    setDocumentos(p => p.map(d => d.id === documentoId
      ? { ...d, version: reg.version, url_archivo: url, tamano_bytes: bytes, nombre_archivo: nombre, actualizado_en: reg.created_at } : d))
    if (modoRef.current === 'supabase') {
      const { id, ...payload } = reg
      await supabase.from('documento_versiones').insert(payload)
      await supabase.from('documentos').update({ version: reg.version, url, tamano_bytes: bytes, nombre_archivo: nombre }).eq('id', documentoId)
    }
    auditar('VERSIÓN', doc, `Publicada la versión ${reg.version}`)
    toast.success(`Versión ${reg.version} publicada`)
  }, [subirArchivo, usuario, auditar])

  // ------------------------------------------------------------ categorías --
  const crearCategoria = useCallback(async ({ nombre, color, icono, descripcion }) => {
    const nueva = {
      id: slugify(nombre), uuid: uid(), nombre: nombre.trim(), slug: slugify(nombre),
      color, icono, descripcion: descripcion?.trim() || '',
      orden: estadoRef.current.categorias.length + 1, created_at: new Date().toISOString(),
    }
    setCategorias(p => [...p, nueva])
    if (modoRef.current === 'supabase') {
      const { data, error } = await supabase.from('documento_categorias')
        .insert(categoriaBD(nueva)).select().single()
      if (error) { setCategorias(p => p.filter(c => c.id !== nueva.id)); return toast.error(error.message) }
      setCategorias(p => p.map(c => c.id === nueva.id ? categoriaUI(data) : c))
    }
    toast.success(`Categoría "${nueva.nombre}" creada`)
  }, [])

  const actualizarCategoria = useCallback(async (slug, cambios) => {
    const cat = estadoRef.current.categorias.find(c => c.id === slug)
    if (!cat) return
    setCategorias(p => p.map(c => c.id === slug ? { ...c, ...cambios } : c))
    if (modoRef.current === 'supabase') await supabase.from('documento_categorias').update(categoriaBD(cambios)).eq('id', cat.uuid)
    toast.success('Categoría actualizada')
  }, [])

  const eliminarCategoria = useCallback(async (slug, reasignarA) => {
    const cat = estadoRef.current.categorias.find(c => c.id === slug)
    const afectados = estadoRef.current.documentos.filter(d => d.categoria_id === slug && !d.eliminado)
    if (afectados.length && !reasignarA) return { bloqueado: true, cantidad: afectados.length }
    if (afectados.length) {
      setDocumentos(p => p.map(d => d.categoria_id === slug ? { ...d, categoria_id: reasignarA } : d))
      if (modoRef.current === 'supabase') await supabase.from('documentos').update({ categoria: reasignarA }).eq('categoria', slug)
    }
    setCategorias(p => p.filter(c => c.id !== slug))
    if (modoRef.current === 'supabase' && cat) await supabase.from('documento_categorias').delete().eq('id', cat.uuid)
    toast.success('Categoría eliminada')
    return { bloqueado: false }
  }, [])

  const reordenarCategorias = useCallback(async (origen, destino) => {
    setCategorias(p => {
      const lista = [...p]
      const [m] = lista.splice(origen, 1)
      lista.splice(destino, 0, m)
      const num = lista.map((c, i) => ({ ...c, orden: i + 1 }))
      if (modoRef.current === 'supabase') num.forEach(c => supabase.from('documento_categorias').update({ orden: c.orden }).eq('id', c.uuid))
      return num
    })
  }, [])

  const reiniciarDemo = useCallback(() => {
    const s = construirSemilla()
    setCategorias(s.categorias); setDocumentos(s.documentos)
    setVersiones(s.versiones); setAuditoria(s.auditoria)
    escribirLocal(s)
    toast.success('Acervo de demostración restaurado')
  }, [])

  return {
    categorias, documentos, versiones, auditoria, catalogos, cargando, modo, progreso,
    recargar: cargar, reiniciarDemo,
    crearDocumentos, actualizarDocumento, alternarVigente, alternarDestacado,
    archivar, restaurar, eliminarDefinitivo, reasignarCategoria, marcarVigenteLote,
    registrarDescarga, agregarVersion,
    crearCategoria, actualizarCategoria, eliminarCategoria, reordenarCategorias,
  }
}