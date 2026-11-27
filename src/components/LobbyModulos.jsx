import { ACCESO_LOBBY } from '../utils/permisos'

const AZUL_CORPORATIVO = '#0033A0'
const GRIS_INACTIVO = '#9CA3AF'

const cardStyle = (activo) => ({
  backgroundColor: 'white',
  borderRadius: '12px',
  padding: '30px 20px',
  textAlign: 'center',
  boxShadow: activo ? '0 4px 6px rgba(0,0,0,0.08)' : 'none',
  border: activo ? '2px solid transparent' : '2px solid #e5e7eb',
  cursor: activo ? 'pointer' : 'default',
  transition: 'all 0.2s',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'space-between',
  minHeight: '220px',
  opacity: activo ? 1 : 0.6,
})

const btnStyle = (activo) => ({
  width: '100%',
  padding: '12px',
  borderRadius: '8px',
  border: 'none',
  cursor: activo ? 'pointer' : 'not-allowed',
  fontWeight: 'bold',
  fontSize: '14px',
  backgroundColor: activo ? AZUL_CORPORATIVO : '#E5E7EB',
  color: activo ? 'white' : GRIS_INACTIVO,
  transition: 'all 0.2s',
})

export default function LobbyModulos({ sesion, cerrarSesion, setPantalla, rol }) {
  const modulos = [
    {
      id: 'precintos_menu',
      icono: '📦',
      titulo: 'Gestión de Precintos',
      desc: 'Control de viajes, SCOP, inventario de plantas y reportes.',
      visible: ACCESO_LOBBY.PRECINTOS.includes(rol),
    },
    {
      id: 'repositorio',
      icono: '📁',
      titulo: 'Repositorio Documental',
      desc: 'Archivos técnicos, operativos y guías por categorías.',
      visible: ACCESO_LOBBY.REPOSITORIO.includes(rol),
    },
    {
      id: 'catalogos',
      icono: '⚙️',
      titulo: 'Catálogos Maestros',
      desc: 'Proveedores, productos, terminales y usuarios.',
      visible: ACCESO_LOBBY.CATALOGOS.includes(rol),
    },
    {
      id: 'precios_menu',
      icono: '💰',
      titulo: 'Precios, Topes & Cotización',
      desc: 'Consulta y gestión de listas de precios, topes y cotizaciones.',
      visible: ACCESO_LOBBY.PRECIOS.includes(rol),
    },
    {
      id: 'stock_menu',
      icono: '📊',
      titulo: 'Control de Stock',
      desc: 'Registra, reasigna y gestiona cuotas de galonaje.',
      visible: ACCESO_LOBBY.STOCK.includes(rol),
    },
    {
      id: 'flota',
      icono: '🚛',
      titulo: 'Gestión de Flota',
      desc: 'Control de vehículos y conductores.',
      visible: false,
    },
    {
      id: 'bi',
      icono: '📊',
      titulo: 'Business Intelligence',
      desc: 'Dashboards avanzados y KPIs.',
      visible: false,
    },
  ]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F3F4F6' }}>
      {/* Header superior */}
      <header style={{
        backgroundColor: 'white',
        padding: '15px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        borderBottom: '1px solid #E5E7EB',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {/* Logo original restaurado */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #0033A0 0%, #00AEEF 100%)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: '900',
              color: 'white',
            }}>
              P
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '22px', color: AZUL_CORPORATIVO, fontWeight: '900' }}>SIGMO</h1>
              <p style={{ margin: 0, fontSize: '12px', color: '#6B7280' }}>Sistema de Gestión Modular</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{
            backgroundColor: '#EFF6FF',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '13px',
            color: AZUL_CORPORATIVO,
            fontWeight: 'bold',
          }}>
            {sesion?.user?.email} ({rol?.toUpperCase() || 'SIN ROL'})
          </div>
          <button
            onClick={() => setPantalla('cambiar-password')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #D1D5DB',
              backgroundColor: 'white',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 'bold',
              color: '#374151',
            }}
          >
            🔒 Cambiar Contraseña
          </button>
          <button
            onClick={cerrarSesion}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid ' + AZUL_CORPORATIVO,
              backgroundColor: 'white',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 'bold',
              color: AZUL_CORPORATIVO,
            }}
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* Contenido principal */}
      <main style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ color: AZUL_CORPORATIVO, fontSize: '28px', marginBottom: '10px', fontWeight: '900' }}>
            Bienvenido a SIGMO
          </h2>
          <p style={{ color: '#6B7280', fontSize: '15px' }}>
            Selecciona el módulo que deseas
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px' }}>
          {modulos.map((modulo) => {
            const esActivo = modulo.visible
            return (
              <div
                key={modulo.id}
                style={cardStyle(esActivo)}
                onMouseEnter={(e) => {
                  if (esActivo) {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = '0 10px 24px rgba(0,51,160,0.18)'
                    e.currentTarget.style.borderColor = AZUL_CORPORATIVO
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = esActivo ? '0 4px 6px rgba(0,0,0,0.08)' : 'none'
                  e.currentTarget.style.borderColor = esActivo ? 'transparent' : '#e5e7eb'
                }}
                onClick={() => esActivo && setPantalla(modulo.id)}
              >
                <div style={{ fontSize: '50px', marginBottom: '15px' }}>{modulo.icono}</div>
                <h3 style={{ color: esActivo ? AZUL_CORPORATIVO : GRIS_INACTIVO, marginBottom: '10px', fontSize: '18px', fontWeight: 'bold' }}>
                  {modulo.titulo}
                </h3>
                <p style={{ color: '#6B7280', fontSize: '13px', marginBottom: '20px', lineHeight: '1.4' }}>
                  {modulo.desc}
                </p>
                <button style={btnStyle(esActivo)}>
                  {esActivo ? 'Entrar al Módulo' : 'Próximamente'}
                </button>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}