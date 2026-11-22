// ============================================================================
//  SIGMO · Repositorio Documental · Paleta, tipos y utilidades puras
// ============================================================================

export const PALETA = {
  tinta:      '#062A3D',
  profundo:   '#0A3A52',
  primario:   '#0B5FA5',
  cyan:       '#06B6D4',
  teal:       '#0E7490',
  ambar:      '#F59E0B',
  lima:       '#84CC16',
  magenta:    '#DB2777',
  violeta:    '#7C3AED',
  rojo:       '#EF4444',
  exito:      '#10B981',
  alerta:     '#F59E0B',
  peligro:    '#EF4444',
  info:       '#3B82F6',
  calido:     '#FAF7F2',
  frio:       '#EEF3F8',
  superficie: '#FFFFFF',
  borde:      '#D8E3EC',
  texto:      '#0F2233',
  suave:      '#5A7184',
}

export const COLORES_SERIE = [
  PALETA.primario, PALETA.cyan, PALETA.ambar, PALETA.lima,
  PALETA.magenta, PALETA.violeta, PALETA.teal, PALETA.rojo,
]

// Espejo del seed de documento_categorias. Solo se usa si la lectura falla.
export const CATEGORIAS_BASE = [
  { nombre: 'Técnicos',      slug: 'tecnicos',      color: '#06B6D4', icono: '⚙️', descripcion: 'Fichas técnicas, planos, P&ID y certificados de calibración.', orden: 1 },
  { nombre: 'Operativos',    slug: 'operativos',    color: '#0B5FA5', icono: '🛢️', descripcion: 'Procedimientos de planta, SCOP, precintado y conciliación.',   orden: 2 },
  { nombre: 'Guías',         slug: 'guias',         color: '#84CC16', icono: '📘', descripcion: 'Manuales de usuario e instructivos paso a paso.',              orden: 3 },
  { nombre: 'Normativa',     slug: 'normativa',     color: '#F59E0B', icono: '⚖️', descripcion: 'Decretos supremos, reglamentos y resoluciones vigentes.',      orden: 4 },
  { nombre: 'Seguridad',     slug: 'seguridad',     color: '#EF4444', icono: '🦺', descripcion: 'IPERC, planes de contingencia y protocolos HSE.',              orden: 5 },
  { nombre: 'Comercial',     slug: 'comercial',     color: '#DB2777', icono: '💰', descripcion: 'Listas de precios, topes y contratos de suministro.',          orden: 6 },
  { nombre: 'Mantenimiento', slug: 'mantenimiento', color: '#7C3AED', icono: '🔧', descripcion: 'Programas, rutinas y órdenes de trabajo.',                     orden: 7 },
  { nombre: 'Reportes',      slug: 'reportes',      color: '#0E7490', icono: '📊', descripcion: 'Informes periódicos, mermas y auditorías internas.',           orden: 8 },
]

export const TIPOS = {
  pdf:  { etiqueta: 'PDF',     color: '#EF4444', icono: '📕', ext: ['pdf'] },
  xlsx: { etiqueta: 'Excel',   color: '#10B981', icono: '📗', ext: ['xlsx', 'xls', 'csv'] },
  docx: { etiqueta: 'Word',    color: '#3B82F6', icono: '📘', ext: ['docx', 'doc'] },
  pptx: { etiqueta: 'Slides',  color: '#F59E0B', icono: '📙', ext: ['pptx', 'ppt'] },
  svg:  { etiqueta: 'Plano',   color: '#06B6D4', icono: '📐', ext: ['svg', 'dwg', 'dxf'] },
  zip:  { etiqueta: 'Paquete', color: '#7C3AED', icono: '🗜️', ext: ['zip', 'rar', '7z'] },
  otro: { etiqueta: 'Archivo', color: '#5A7184', icono: '📄', ext: [] },
}

// RESPALDO. La fuente real es la tabla `plantas` (codigo, nombre, activo).
// El hook la carga en el Paso 6; esta lista solo cubre una lectura fallida.
export const PLANTAS_RESPALDO = [
  'CALLAO', 'CONCHAN', 'PAMPILLA', 'SUPE', 'TALARA', 'PIURA', 'ETEN',
  'SALAVERRY', 'CHIMBOTE', 'PISCO', 'ILO', 'MOLLENDO', 'JULIACA',
  'CUSCO', 'MONTE AZUL', 'PAITA', 'VALERO', 'PLUSPETROL',
]

export const ICONOS_DISPONIBLES = [
  '📄','⚙️','🛢️','📘','⚖️','🦺','💰','🔧','📊','🧪','🚛','🗺️','🔥','🧯','📐','🧭','🛰️','🏭','💧','⚡',
]

export const LIMITE_BYTES = 25 * 1024 * 1024
export const CAPACIDAD_BYTES = 512 * 1024 * 1024
export const RETENCION_PAPELERA_DIAS = 30

export const ACCIONES = {
  'SUBIDA':        PALETA.exito,
  'ACTUALIZACIÓN': PALETA.primario,
  'VIGENCIA':      PALETA.ambar,
  'DESCARGA':      PALETA.cyan,
  'DESTACADO':     PALETA.violeta,
  'ARCHIVADO':     PALETA.suave,
  'RESTAURADO':    PALETA.teal,
  'ELIMINACIÓN':   PALETA.rojo,
  'VERSIÓN':       PALETA.magenta,
}

export const uid = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

export const slugify = (txt = '') =>
  String(txt).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'categoria'

export const tipoDesdeNombre = (nombre = '') => {
  const ext = String(nombre).split('.').pop().toLowerCase()
  const entrada = Object.entries(TIPOS).find(([, v]) => v.ext.includes(ext))
  return entrada ? entrada[0] : 'otro'
}

export const infoTipo = (tipo) => TIPOS[tipo] || TIPOS.otro

export const formatearBytes = (bytes = 0) => {
  const n = Number(bytes)
  if (!n) return '0 KB'
  const u = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), u.length - 1)
  const v = n / Math.pow(1024, i)
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${u[i]}`
}

export const formatearFecha = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—'
    : d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const formatearFechaHora = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—'
    : d.toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export const haceCuanto = (iso) => {
  if (!iso) return '—'
  const seg = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seg < 60) return 'hace instantes'
  if (seg < 3600) return `hace ${Math.floor(seg / 60)} min`
  if (seg < 86400) return `hace ${Math.floor(seg / 3600)} h`
  if (seg < 2592000) return `hace ${Math.floor(seg / 86400)} d`
  return formatearFecha(iso)
}

export const normalizar = (txt = '') =>
  String(txt).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

export const iniciales = (correo = '') => {
  const base = String(correo).split('@')[0].replace(/[._-]+/g, ' ')
  const partes = base.split(' ').filter(Boolean)
  return ((partes[0]?.[0] || 'S') + (partes[1]?.[0] || 'G')).toUpperCase()
}

export const mezclarHex = (hex, alfa) => {
  const h = String(hex).replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const n = parseInt(full, 16)
  if (Number.isNaN(n)) return `rgba(90,113,132,${alfa})`
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alfa})`
}