// src/components/MenuPrecintos.jsx
import { Boton, Card, PageHeader } from './ui'
import { PERMISOS_PRECINTOS, tienePermiso } from '../utils/permisos'

// ══ PALETA CORPORATIVA PETROAMÉRICA — BANNER ═
const AZUL_PROFUNDO = '#001B5E'
const AZUL_CORPORATIVO = '#0033A0'   // ← color principal del logo
const AZUL_MEDIO = '#0057D8'
const CYAN = '#00AEEF'               // ← acento / línea inferior
const BLANCO = '#FFFFFF'

export default function MenuPrecintos({ setPantalla, rol, permisos }) {
  const opciones = [
    { id: 'lotes',        titulo: 'Registro de Lotes',       icono: '📝', desc: 'Ingreso de nuevos lotes de precintos.',   roles: PERMISOS_PRECINTOS.LOTES,        permiso: 'lotes' },
    { id: 'admin',        titulo: 'Registrar Viajes (SCOP)', icono: '🚚', desc: 'Asignación de precintos a viajes.',       roles: PERMISOS_PRECINTOS.VIAJES,       permiso: 'viajes' },
    { id: 'excepciones',  titulo: 'Excepciones',             icono: '⚠️', desc: 'Gestión de casos especiales.',            roles: PERMISOS_PRECINTOS.EXCEPCIONES,  permiso: 'viajes' },
    { id: 'precintos',    titulo: 'Listado de Precintos',    icono: '🔖', desc: 'Inventario y estado de precintos.',       roles: PERMISOS_PRECINTOS.PRECINTOS,    permiso: 'precintos' },
    { id: 'dashboard',    titulo: 'Dashboard',               icono: '📊', desc: 'Métricas y panel de control.',            roles: PERMISOS_PRECINTOS.DASHBOARD,    permiso: 'dashboard' },
    { id: 'reportes',     titulo: 'Reportes',                icono: '', desc: 'Exportación de datos a Excel y PDF.',     roles: PERMISOS_PRECINTOS.REPORTES,     permiso: 'dashboard' },
    { id: 'conciliacion', titulo: 'Conciliación',            icono: '🤝', desc: 'Cruce de información de viajes.',         roles: PERMISOS_PRECINTOS.CONCILIACION, permiso: 'conciliacion' },
    { id: 'proyeccion',   titulo: 'Proyección Demanda',      icono: '🔮', desc: 'Estimación de uso futuro.',               roles: PERMISOS_PRECINTOS.PROYECCION,   permiso: 'proyeccion' },
    { id: 'bitacora',     titulo: 'Bitácora',                icono: '', desc: 'Historial de acciones del sistema.',      roles: PERMISOS_PRECINTOS.BITACORA,     permiso: 'bitacora' },
    { id: 'plantas',      titulo: 'Config. Plantas',         icono: '🏭', desc: 'Administración de terminales.',           roles: PERMISOS_PRECINTOS.PLANTAS,      permiso: 'plantas' },
    { id: 'respaldos',    titulo: 'Respaldos',               icono: '💾', desc: 'Gestión de copias de seguridad.',         roles: PERMISOS_PRECINTOS.RESPALDOS,    permiso: 'respaldos' },
  ]

  return (
    <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
      {/* ✅ BANNER CORPORATIVO CON DEGRADADO PETROAMÉRICA */}
      <header
        style={{
          padding: '20px 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '15px',
          background: `linear-gradient(118deg, ${AZUL_PROFUNDO} 0%, ${AZUL_CORPORATIVO} 45%, ${AZUL_MEDIO} 78%, ${CYAN} 100%)`,
          borderBottom: `3px solid ${CYAN}`,
          boxShadow: '0 6px 18px rgba(0,27,94,0.25)',
          marginBottom: '30px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <Boton 
            variante="outline" 
            onClick={() => setPantalla('')}
            style={{
              background: 'rgba(255,255,255,0.14)',
              border: '1px solid rgba(255,255,255,0.6)',
              color: BLANCO,
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 'bold',
            }}
          >
            ← SIGMO
          </Boton>
          <h1 style={{ margin: 0, color: BLANCO, fontSize: '28px', fontWeight: '900' }}>
            Módulo de Precintos
          </h1>
        </div>
        <Boton 
          variante="outline" 
          onClick={() => setPantalla('cambiar-password')}
          style={{
            background: 'rgba(255,255,255,0.14)',
            border: '1px solid rgba(255,255,255,0.6)',
            color: BLANCO,
            padding: '6px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 'bold',
          }}
        >
           Cambiar Contraseña
        </Boton>
      </header>

      <PageHeader
        titulo="¿Qué deseas hacer hoy?"
        subtitulo="Selecciona una opción para comenzar"
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          marginTop: '30px',
        }}
      >
        {opciones.map(
          (opc) =>
            tienePermiso(rol, permisos, opc.roles, opc.permiso) && (
              <Card
                key={opc.id}
                onClick={() => setPantalla(opc.id)}
                style={{
                  textAlign: 'center',
                  padding: '25px 20px',
                  cursor: 'pointer',
                  border: '2px solid transparent',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = AZUL_CORPORATIVO
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,51,160,0.15), 0 10px 24px rgba(0,51,160,0.18)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'transparent'
                  e.currentTarget.style.boxShadow = ''
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <div style={{ fontSize: '40px', marginBottom: '15px' }}>{opc.icono}</div>
                <h3 style={{ color: AZUL_CORPORATIVO, marginBottom: '10px', fontSize: '18px' }}>{opc.titulo}</h3>
                <p style={{ color: 'var(--text-light)', fontSize: '13px', margin: 0, lineHeight: '1.4' }}>{opc.desc}</p>
              </Card>
            )
        )}
      </div>
    </div>
  )
}