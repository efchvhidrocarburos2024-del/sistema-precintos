import { Boton, Card, PageHeader } from './ui'
import { ACCESO_LOBBY } from '../utils/permisos'

export default function LobbyModulos({ sesion, cerrarSesion, setPantalla, rol }) {
  const puedeVerPrecintos = ACCESO_LOBBY.PRECINTOS.includes(rol)
  const puedeVerRepositorio = ACCESO_LOBBY.REPOSITORIO.includes(rol)
  const puedeVerCatalogos = ACCESO_LOBBY.CATALOGOS.includes(rol)
  const esAdmin = rol === 'admin_sistema'

  return (
    <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
      {/* Header con logo + cierre de sesión */}
      <header
        style={{
          padding: '20px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '15px',
          borderBottom: '1px solid #e5e7eb',
          marginBottom: '20px',
        }}
      >
        <div>
          <h1 style={{ margin: 0, color: 'var(--primary-blue)', fontSize: '32px', fontWeight: '900', letterSpacing: '1.5px' }}>
            SIGMO
          </h1>
          <span style={{ color: 'var(--text-light)', fontSize: '14px', fontWeight: '500' }}>
            Sistema de Gestión Modular
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--text-dark)', fontWeight: '600', fontSize: '14px' }}>
            👤 {sesion.user.email} ({rol?.toUpperCase() || 'SIN ROL'})
          </span>
          <Boton variante="outline" onClick={cerrarSesion}>
            Cerrar Sesión
          </Boton>
        </div>
      </header>

      <PageHeader
        titulo="Bienvenido a SIGMO"
        subtitulo="Selecciona el módulo que deseas gestionar"
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '20px',
          marginTop: '30px',
        }}
      >
        {/* MÓDULO: PRECINTOS */}
        {puedeVerPrecintos && (
          <Card style={{ textAlign: 'center', padding: '30px 20px' }}>
            <div style={{ fontSize: '40px', marginBottom: '15px' }}>📦</div>
            <h3 style={{ margin: '0 0 10px 0', color: 'var(--primary-blue)' }}>Gestión de Precintos</h3>
            <p style={{ color: 'var(--text-light)', fontSize: '14px', marginBottom: '20px' }}>
              Control de viajes, SCOP, inventario de plantas y reportes.
            </p>
            <Boton variante="primary" onClick={() => setPantalla('precintos_menu')} style={{ width: '100%' }}>
              Entrar al Módulo
            </Boton>
          </Card>
        )}

        {/* MÓDULO: REPOSITORIO */}
        {puedeVerRepositorio && (
          <Card style={{ textAlign: 'center', padding: '30px 20px' }}>
            <div style={{ fontSize: '40px', marginBottom: '15px' }}>📂</div>
            <h3 style={{ margin: '0 0 10px 0', color: 'var(--primary-blue)' }}>Repositorio Documental</h3>
            <p style={{ color: 'var(--text-light)', fontSize: '14px', marginBottom: '20px' }}>
              Archivos técnicos, operativos y guías por categorías.
            </p>
            <Boton variante="primary" onClick={() => setPantalla('repositorio')} style={{ width: '100%' }}>
              Entrar al Módulo
            </Boton>
          </Card>
        )}

        {/* MÓDULO: CATÁLOGOS */}
        {puedeVerCatalogos && (
          <Card style={{ textAlign: 'center', padding: '30px 20px' }}>
            <div style={{ fontSize: '40px', marginBottom: '15px' }}>⚙️</div>
            <h3 style={{ margin: '0 0 10px 0', color: 'var(--primary-blue)' }}>Catálogos Maestros</h3>
            <p style={{ color: 'var(--text-light)', fontSize: '14px', marginBottom: '20px' }}>
              Proveedores, productos, terminales y usuarios.
            </p>
            <Boton variante="primary" onClick={() => setPantalla('catalogos')} style={{ width: '100%' }}>
              Entrar al Módulo
            </Boton>
          </Card>
        )}

        {/* MÓDULO: PRECIOS */}
        <Card style={{ textAlign: 'center', padding: '30px 20px' }}>
          <div style={{ fontSize: '40px', marginBottom: '15px' }}>💰</div>
          <h3 style={{ margin: '0 0 10px 0', color: 'var(--primary-blue)' }}>Lista de Precios</h3>
          <p style={{ color: 'var(--text-light)', fontSize: '14px', marginBottom: '20px' }}>
            Consulta y gestión de listas en formato Excel.
          </p>
          <Boton variante="primary" onClick={() => setPantalla('precios_menu')} style={{ width: '100%' }}>
            Entrar al Módulo
          </Boton>
        </Card>

        {/* FUTUROS MÓDULOS (solo admin los ve) */}
        {esAdmin && (
          <>
            <Card style={{ textAlign: 'center', padding: '30px 20px', opacity: 0.6 }}>
              <div style={{ fontSize: '40px', marginBottom: '15px' }}>🚚</div>
              <h3 style={{ margin: '0 0 10px 0', color: 'var(--text-dark)' }}>Gestión de Flota</h3>
              <p style={{ color: 'var(--text-light)', fontSize: '14px', marginBottom: '20px' }}>
                Control de vehículos y conductores.
              </p>
              <Boton variante="outline" disabled style={{ width: '100%' }}>
                Próximamente
              </Boton>
            </Card>

            <Card style={{ textAlign: 'center', padding: '30px 20px', opacity: 0.6 }}>
              <div style={{ fontSize: '40px', marginBottom: '15px' }}>📊</div>
              <h3 style={{ margin: '0 0 10px 0', color: 'var(--text-dark)' }}>Business Intelligence</h3>
              <p style={{ color: 'var(--text-light)', fontSize: '14px', marginBottom: '20px' }}>
                Dashboards avanzados y KPIs.
              </p>
              <Boton variante="outline" disabled style={{ width: '100%' }}>
                Próximamente
              </Boton>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}