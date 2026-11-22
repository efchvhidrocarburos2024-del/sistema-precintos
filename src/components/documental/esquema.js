// ============================================================================
//  SIGMO · Repositorio Documental · Adaptador de esquema
//  Traduce entre la tabla real `documentos` y el modelo que consumen las vistas.
//  Ninguna vista conoce los nombres de columna de la base.
// ============================================================================
import { tipoDesdeNombre } from './constantes'

// Columnas reales de tu tabla `documentos` (21). Sirve de contrato y de
// lista blanca: haciaBD() jamás deja pasar un campo que no esté aquí.
export const COLUMNAS_BD = [
  'id', 'nombre', 'descripcion', 'categoria', 'url', 'subido_por', 'created_at',
  'tipo_documento', 'terminal', 'proveedor', 'producto', 'version',
  'nombre_archivo', 'tamano_bytes', 'etiquetas', 'vigente', 'destacado',
  'descargas', 'eliminado', 'eliminado_en', 'actualizado_en',
]

// Campos gestionados por la base: nunca se envían en un insert/update.
export const CAMPOS_SOLO_LECTURA = ['id', 'created_at', 'actualizado_en']

const nombreDesdeUrl = (url) =>
  url ? decodeURIComponent(String(url).replace(/[?#].*$/, '').replace(/^.*\//, '')) : null

/**
 * Fila de Supabase → objeto de UI.
 * @param {object} r  fila cruda de `documentos`
 * @param {Map} usuarios  id_usuario → { email, nombre_completo }
 */
export const desdeBD = (r, usuarios = new Map()) => {
  if (!r) return null
  const u = usuarios.get(r.subido_por)
  const archivo = r.nombre_archivo || nombreDesdeUrl(r.url) || 'documento'

  return {
    id:             r.id,
    titulo:         r.nombre ?? '',
    descripcion:    r.descripcion ?? '',
    categoria_id:   r.categoria || null,          // slug
    tipo:           r.tipo_documento || tipoDesdeNombre(archivo),
    nombre_archivo: archivo,
    url_archivo:    r.url ?? null,
    tamano_bytes:   Number(r.tamano_bytes ?? 0),
    version:        r.version || '1.0',
    etiquetas:      Array.isArray(r.etiquetas) ? r.etiquetas : [],
    planta:         r.terminal || null,
    proveedor:      r.proveedor || null,
    producto:       r.producto || null,
    vigente:        r.vigente ?? true,
    destacado:      r.destacado ?? false,
    descargas:      Number(r.descargas ?? 0),
    subido_por:     u?.email || null,
    subido_por_nombre: u?.nombre_completo || null,
    subido_por_id:  r.subido_por || null,
    eliminado:      r.eliminado ?? false,
    eliminado_en:   r.eliminado_en ?? null,
    created_at:     r.created_at,
    actualizado_en: r.actualizado_en ?? r.created_at,
  }
}

/**
 * Objeto de UI → payload para Supabase.
 * Lista blanca: solo escribe columnas existentes. Ignora undefined,
 * pero respeta null (necesario para limpiar terminal/proveedor/producto).
 * @param {object} ui
 * @param {{usuarioId?: string}} ctx  uuid del usuario autenticado en `usuarios`
 */
export const haciaBD = (ui = {}, ctx = {}) => {
  const o = {}
  const set = (columna, valor) => { if (valor !== undefined) o[columna] = valor }

  set('nombre',         ui.titulo)
  set('descripcion',    ui.descripcion)
  set('categoria',      ui.categoria_id)
  set('tipo_documento', ui.tipo)
  set('nombre_archivo', ui.nombre_archivo)
  set('url',            ui.url_archivo)
  set('tamano_bytes',   ui.tamano_bytes)
  set('version',        ui.version)
  set('etiquetas',      ui.etiquetas)
  set('terminal',       ui.planta)
  set('proveedor',      ui.proveedor)
  set('producto',       ui.producto)
  set('vigente',        ui.vigente)
  set('destacado',      ui.destacado)
  set('descargas',      ui.descargas)
  set('eliminado',      ui.eliminado)
  set('eliminado_en',   ui.eliminado_en)

  // FK a usuarios.id_usuario — nunca un email.
  if (ui.subido_por_id !== undefined) o.subido_por = ui.subido_por_id
  else if (ctx.usuarioId) o.subido_por = ctx.usuarioId

  CAMPOS_SOLO_LECTURA.forEach(c => { delete o[c] })
  return o
}

/** Fila de `documento_categorias` → categoría de UI (id = slug, uuid aparte). */
export const categoriaUI = (c) => ({
  id:          c.slug,            // lo que se guarda en documentos.categoria
  uuid:        c.id,              // PK real, para update/delete
  nombre:      c.nombre,
  slug:        c.slug,
  color:       c.color,
  icono:       c.icono,
  descripcion: c.descripcion ?? '',
  orden:       Number(c.orden ?? 0),
  created_at:  c.created_at,
})

/** Categoría de UI → payload de `documento_categorias`. */
export const categoriaBD = (c = {}) => {
  const o = {}
  if (c.nombre      !== undefined) o.nombre      = c.nombre
  if (c.slug        !== undefined) o.slug        = c.slug
  if (c.color       !== undefined) o.color       = c.color
  if (c.icono       !== undefined) o.icono       = c.icono
  if (c.descripcion !== undefined) o.descripcion = c.descripcion
  if (c.orden       !== undefined) o.orden       = c.orden
  delete o.id
  delete o.created_at
  return o
}

/** Fila de `usuarios` → entrada del mapa de responsables. */
export const entradaUsuario = (u) => [
  u.id_usuario,
  { email: u.email, nombre_completo: u.nombre_completo },
]

/** Detecta documentos cuya categoría no existe en el catálogo. */
export const categoriasHuerfanas = (documentos, categorias) => {
  const slugs = new Set(categorias.map(c => c.id))
  const vistas = new Map()
  documentos
    .filter(d => !d.eliminado && d.categoria_id && !slugs.has(d.categoria_id))
    .forEach(d => vistas.set(d.categoria_id, (vistas.get(d.categoria_id) || 0) + 1))
  return [...vistas.entries()].map(([slug, cantidad]) => ({ slug, cantidad }))
}