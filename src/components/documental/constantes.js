// ============================================================================
//  SIGMO · Repositorio Documental · Paleta Petro América + utilidades puras
//  Identidad visual adaptada al branding corporativo oficial.
// ============================================================================

export const PALETA = {
  // ─── Identidad Petro América ─────────────────────────────────────────────
  azulProfundo: '#0033A0',   // Primario — headers, botones, títulos
  cyanVibrante: '#00AEEF',   // Secundario — acentos, hovers, indicadores
  blanco:      '#FFFFFF',    // Fondos limpios
  grisClaro:   '#F5F5F5',    // Fondos secundarios
  grisMedio:   '#CCCCCC',    // Bordes
  grisOscuro:  '#666666',    // Texto secundario
  
  // ─── Semánticos (conservados para estados) ──────────────────────────────
  exito:       '#28A745',    // Verde bootstrap — vigente, ok
  alerta:      '#FFC107',    // Amarillo bootstrap — advertencias
  peligro:     '#DC3545',    // Rojo bootstrap — obsoleto, error
  info:        '#17A2B8',    // Cyan bootstrap — información
  
  // ─── Alias de compatibilidad (para no romper código existente) ──────────
  tinta:      '#0033A0',     // alias → azulProfundo
  profundo:   '#002880',     // versión más oscura del primario
  primario:   '#0033A0',     // alias → azulProfundo
  cyan:       '#00AEEF',     // alias → cyanVibrante
  teal:       '#0088CC',     // versión saturada del cyan
  ambar:      '#FFC107',     // alias → alerta
  lima:       '#28A745',     // alias → exito
  magenta:    '#E83E8C',     // acento decorativo
  violeta:    '#6F42C1',     // acento decorativo
  rojo:       '#DC3545',     // alias → peligro
  
  calido:     '#FAFAFA',     // fondo cálido
  frio:       '#F8FAFC',     // fondo frío
  superficie: '#FFFFFF',     // alias → blanco
  borde:      '#CCCCCC',     // alias → grisMedio
  texto:      '#0033A0',     // alias → azulProfundo (títulos)
  suave:      '#666666',     // alias → grisOscuro
}

export const COLORES_SERIE = [
  PALETA.azulProfundo, PALETA.cyanVibrante, PALETA.teal,
  PALETA.lima, PALETA.magenta, PALETA.violeta, PALETA.rojo, PALETA.ambar,
]

// ============================================================================
//  Tipos de documento por categoría (Opción B)
//  campos con clave planta/proveedor/producto se enlazan a esas columnas;
//  cualquier otra clave se guarda en documentos.metadata (jsonb).
// ============================================================================
export const TIPOS_DOCUMENTO = {
  tecnicos: [
    {
      id: 'certificado_calidad', nombre: 'Certificado de calidad', icono: '🏅',
      descripcion: 'Certificado que acredita las especificaciones del producto despachado.',
      campos: [
        { clave: 'producto', etiqueta: 'Producto', tipo: 'select-producto' },
        { clave: 'numero_lote', etiqueta: 'N° de lote', tipo: 'texto' },
        { clave: 'fecha_emision', etiqueta: 'Fecha de emisión', tipo: 'fecha' },
        { clave: 'emisor', etiqueta: 'Laboratorio / emisor', tipo: 'texto' },
      ],
    },
    {
      id: 'ficha_msds', nombre: 'Ficha de datos de seguridad (MSDS)', icono: '🧪',
      descripcion: 'Hoja de seguridad: riesgos, manipuleo y primeros auxilios del producto.',
      campos: [
        { clave: 'producto', etiqueta: 'Producto', tipo: 'select-producto' },
        { clave: 'fecha_revision', etiqueta: 'Fecha de revisión', tipo: 'fecha' },
      ],
    },
    {
      id: 'ficha_especificacion_tecnica', nombre: 'Ficha de especificación técnica', icono: '📐',
      descripcion: 'Parámetros técnicos y límites de aceptación del producto o equipo.',
      campos: [
        { clave: 'producto', etiqueta: 'Producto', tipo: 'select-producto' },
        { clave: 'norma_referencia', etiqueta: 'Norma de referencia', tipo: 'texto' },
      ],
    },
  ],
  operativos: [
    {
      id: 'induccion_conductores', nombre: 'Inducción de conductores', icono: '🎓',
      descripcion: 'Material obligatorio para la inducción de conductores antes del ingreso a planta.',
      campos: [
        { clave: 'planta', etiqueta: 'Planta / terminal', tipo: 'select-planta' },
        { clave: 'vigencia_desde', etiqueta: 'Vigente desde', tipo: 'fecha' },
      ],
    },
    {
      id: 'registro_unidades', nombre: 'Registro de unidades', icono: '🚛',
      descripcion: 'Formato oficial para el registro de unidades de transporte habilitadas.',
      campos: [
        { clave: 'planta', etiqueta: 'Planta / terminal', tipo: 'select-planta' },
      ],
    },
    {
      id: 'registro_unidades_conductores_proveedor',
      nombre: 'Registro de unidades y conductores por proveedor', icono: '',
      descripcion: 'Relación de unidades y conductores autorizados por proveedor o transportista.',
      campos: [
        { clave: 'proveedor', etiqueta: 'Proveedor / transportista', tipo: 'select-proveedor' },
        { clave: 'planta', etiqueta: 'Planta / terminal', tipo: 'select-planta' },
      ],
    },
    {
      id: 'criterios_carga_terminal', nombre: 'Criterios de carga por terminal', icono: '⚖️',
      descripcion: 'Reglas y restricciones de carga aplicables a cada terminal de despacho.',
      campos: [
        { clave: 'planta', etiqueta: 'Planta / terminal', tipo: 'select-planta' },
      ],
    },
  ],
}

export const tiposDeCategoria = (slug) => TIPOS_DOCUMENTO[slug] || []
export const buscarTipo = (slugCat, idTipo) =>
  (TIPOS_DOCUMENTO[slugCat] || []).find(t => t.id === idTipo) || null

// ============================================================================
//  Permisos del módulo. Para un rol nuevo: crear su codigo en la tabla
//  `roles` y agregar aquí una fila. Sin fila = solo lectura.
// ============================================================================
export const PERMISOS_DOCUMENTAL = {
  admin_sistema:      { cargar: true,  gestionar: true,  eliminar: true  },
  jefe_pricing:       { cargar: true,  gestionar: true,  eliminar: false },
  analista_comercial: { cargar: true,  gestionar: false, eliminar: false },
  gestor_documental:  { cargar: true,  gestionar: false, eliminar: false },
  visor_documental:   { cargar: false, gestionar: false, eliminar: false },
}
export const permisosDocumental = (rol) =>
  PERMISOS_DOCUMENTAL[rol] || { cargar: false, gestionar: false, eliminar: false }

// ============================================================================
//  Utilidades puras
// ============================================================================
export const TIPOS = {
  pdf:  { etiqueta: 'PDF',     color: '#DC3545', icono: '📕', ext: ['pdf'] },
  xlsx: { etiqueta: 'Excel',   color: '#28A745', icono: '📗', ext: ['xlsx', 'xls', 'csv'] },
  docx: { etiqueta: 'Word',    color: '#007BFF', icono: '📘', ext: ['docx', 'doc'] },
  pptx: { etiqueta: 'Slides',  color: '#FFC107', icono: '📙', ext: ['pptx', 'ppt'] },
  svg:  { etiqueta: 'Plano',   color: '#00AEEF', icono: '', ext: ['svg', 'dwg', 'dxf'] },
  zip:  { etiqueta: 'Paquete', color: '#6F42C1', icono: '🗜️', ext: ['zip', 'rar', '7z'] },
  otro: { etiqueta: 'Archivo', color: '#666666', icono: '📄', ext: [] },
}

export const PLANTAS_RESPALDO = [
  'CALLAO', 'CONCHAN', 'PAMPILLA', 'SUPE', 'TALARA', 'PIURA', 'ETEN',
  'SALAVERRY', 'CHIMBOTE', 'PISCO', 'ILO', 'MOLLENDO', 'JULIACA',
  'CUSCO', 'MONTE AZUL', 'PAITA', 'VALERO', 'PLUSPETROL',
]

export const ICONOS_DISPONIBLES = [
  '📄','⚙️','🛢️','📘','⚖️','🦺','💰','🔧','','🧪','🚛','️','🔥','','📐','🧭','🛰️','🏭','💧','',
]

export const LIMITE_BYTES = 25 * 1024 * 1024
export const CAPACIDAD_BYTES = 512 * 1024 * 1024
export const RETENCION_PAPELERA_DIAS = 30

export const ACCIONES = {
  'SUBIDA':        PALETA.exito,
  'ACTUALIZACIÓN': PALETA.azulProfundo,
  'VIGENCIA':      PALETA.ambar,
  'DESCARGA':      PALETA.cyanVibrante,
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
  if (Number.isNaN(n)) return `rgba(102,102,102,${alfa})`
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alfa})`
}