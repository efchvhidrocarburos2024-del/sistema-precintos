// ============================================================
// Centralización de Roles, Permisos y Configuración de Pantallas
// ============================================================

export const ROLES = {
  ADMIN_SISTEMA: 'admin_sistema',
  ADMIN_PLANTA: 'admin_planta',
  JEFE_OPERACIONES: 'jefe_operaciones',
  ANALISTA_OPERACIONES: 'analista_operaciones',
  ASESOR_COMERCIAL: 'asesor_comercial',
  ANALISTA_COMERCIAL: 'analista_comercial',
  AUDITOR: 'auditor',
  JEFE_PROYECTO: 'jefe_proyecto',
  JEFE_PRICING: 'jefe_pricing',
};

// Acceso a los módulos del Lobby principal
export const ACCESO_LOBBY = {
  PRECINTOS: [
    ROLES.ADMIN_SISTEMA, ROLES.ADMIN_PLANTA, ROLES.JEFE_OPERACIONES,
    ROLES.ANALISTA_OPERACIONES, ROLES.AUDITOR,
  ],
  REPOSITORIO: [
    ROLES.ADMIN_SISTEMA, ROLES.ADMIN_PLANTA, ROLES.JEFE_OPERACIONES,
    ROLES.ANALISTA_OPERACIONES, ROLES.ASESOR_COMERCIAL, ROLES.AUDITOR,
  ],
  CATALOGOS: [ROLES.ADMIN_SISTEMA],
  PRECIOS: [
    ROLES.ADMIN_SISTEMA, ROLES.ADMIN_PLANTA, ROLES.JEFE_OPERACIONES,
    ROLES.ANALISTA_OPERACIONES, ROLES.ANALISTA_COMERCIAL, ROLES.JEFE_PRICING,
    ROLES.ASESOR_COMERCIAL, ROLES.AUDITOR,
  ],
  STOCK: [
    ROLES.ADMIN_SISTEMA, ROLES.ADMIN_PLANTA, ROLES.JEFE_OPERACIONES,
    ROLES.ANALISTA_OPERACIONES, ROLES.ASESOR_COMERCIAL, ROLES.ANALISTA_COMERCIAL,
    ROLES.JEFE_PRICING, ROLES.AUDITOR,
  ],
};

// Acceso interno al módulo de precintos
export const PERMISOS_PRECINTOS = {
  LOTES: [ROLES.ADMIN_SISTEMA, ROLES.ANALISTA_OPERACIONES, ROLES.JEFE_OPERACIONES, ROLES.JEFE_PROYECTO],
  VIAJES: [ROLES.ADMIN_SISTEMA, ROLES.ADMIN_PLANTA],
  EXCEPCIONES: [ROLES.ADMIN_SISTEMA, ROLES.ADMIN_PLANTA],
  PRECINTOS: [ROLES.ADMIN_SISTEMA, ROLES.ADMIN_PLANTA, ROLES.ANALISTA_OPERACIONES, ROLES.JEFE_OPERACIONES, ROLES.AUDITOR, ROLES.JEFE_PROYECTO],
  DASHBOARD: [ROLES.ADMIN_SISTEMA, ROLES.AUDITOR, ROLES.ANALISTA_OPERACIONES, ROLES.JEFE_OPERACIONES, ROLES.JEFE_PROYECTO, ROLES.ADMIN_PLANTA],
  REPORTES: [ROLES.ADMIN_SISTEMA, ROLES.AUDITOR, ROLES.ANALISTA_OPERACIONES, ROLES.JEFE_OPERACIONES, ROLES.JEFE_PROYECTO, ROLES.ADMIN_PLANTA],
  CONCILIACION: [ROLES.ADMIN_SISTEMA, ROLES.JEFE_PROYECTO, ROLES.ANALISTA_OPERACIONES, ROLES.JEFE_OPERACIONES],
  PROYECCION: [ROLES.ADMIN_SISTEMA, ROLES.JEFE_PROYECTO, ROLES.JEFE_OPERACIONES, ROLES.ANALISTA_OPERACIONES],
  BITACORA: [ROLES.ADMIN_SISTEMA, ROLES.AUDITOR, ROLES.JEFE_OPERACIONES, ROLES.JEFE_PROYECTO],
  PLANTAS: [ROLES.ADMIN_SISTEMA],
  RESPALDOS: [ROLES.ADMIN_SISTEMA],
};

// Mapa de pantalla → roles/permiso que la pueden ver
const PANTALLAS_ACCESO = {
  precintos_menu:     { roles: ACCESO_LOBBY.PRECINTOS },
  repositorio:        { roles: ACCESO_LOBBY.REPOSITORIO },
  catalogos:          { roles: ACCESO_LOBBY.CATALOGOS },
  usuarios:           { roles: ACCESO_LOBBY.CATALOGOS },
  precios_menu:       { roles: ACCESO_LOBBY.PRECIOS },
  stock_menu:         { roles: ACCESO_LOBBY.STOCK },
  'cambiar-password': { roles: [] },
  lotes:              { roles: PERMISOS_PRECINTOS.LOTES,        permiso: 'lotes' },
  admin:              { roles: PERMISOS_PRECINTOS.VIAJES,       permiso: 'viajes' },
  excepciones:        { roles: PERMISOS_PRECINTOS.EXCEPCIONES,  permiso: 'viajes' },
  precintos:          { roles: PERMISOS_PRECINTOS.PRECINTOS,    permiso: 'precintos' },
  dashboard:          { roles: PERMISOS_PRECINTOS.DASHBOARD,    permiso: 'dashboard' },
  reportes:           { roles: PERMISOS_PRECINTOS.REPORTES,     permiso: 'dashboard' },
  conciliacion:       { roles: PERMISOS_PRECINTOS.CONCILIACION, permiso: 'conciliacion' },
  proyeccion:         { roles: PERMISOS_PRECINTOS.PROYECCION,   permiso: 'proyeccion' },
  bitacora:           { roles: PERMISOS_PRECINTOS.BITACORA,     permiso: 'bitacora' },
  plantas:            { roles: PERMISOS_PRECINTOS.PLANTAS,      permiso: 'plantas' },
  respaldos:          { roles: PERMISOS_PRECINTOS.RESPALDOS,    permiso: 'respaldos' },
};

// Pantallas que muestran la barra de navegación interna del módulo Precintos
export const PANTALLAS_CON_NAVBAR = [
  'lotes', 'admin', 'excepciones', 'precintos', 'dashboard',
  'reportes', 'bitacora', 'conciliacion', 'proyeccion',
  'cambiar-password', 'plantas', 'respaldos',
];

/** Verifica si un rol+permisos puede acceder a una pantalla concreta */
export const puedeAccederPantalla = (pantalla, rol, permisos = []) => {
  if (!pantalla) return true;
  const config = PANTALLAS_ACCESO[pantalla];
  if (!config) return false;
  if (config.roles.length === 0) return true;
  if (config.roles.includes(rol)) return true;
  if (config.permiso && permisos.includes(config.permiso)) return true;
  return false;
};

/** Verifica permiso por rol O por permiso extra */
export const tienePermiso = (rol, permisos, rolesPermitidos, permisoExtra = '') => {
  if (rolesPermitidos.includes(rol)) return true;
  if (permisoExtra && permisos.includes(permisoExtra)) return true;
  return false;
};