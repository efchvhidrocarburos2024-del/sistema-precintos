// src/components/LobbyModulos.jsx (Idea para el futuro)
import { PageHeader, Card, Boton } from './ui'

export default function LobbyModulos({ setPantalla }) {
  return (
    <div className="page-container" style={{ maxWidth: '900px', marginTop: '50px' }}>
      <PageHeader 
        titulo="Bienvenido a SIGMO" 
        subtitulo="Selecciona el módulo que deseas gestionar" 
      />

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '20px',
        marginTop: '30px'
      }}>
        {/* TARJETA DEL MÓDULO DE PRECINTOS (Activo) */}
        <Card style={{ textAlign: 'center', padding: '30px 20px' }}>
          <div style={{ fontSize: '40px', marginBottom: '15px' }}>📦</div>
          <h3 style={{ margin: '0 0 10px 0', color: 'var(--primary-blue)' }}>Gestión de Precintos</h3>
          <p style={{ color: 'var(--text-light)', fontSize: '14px', marginBottom: '20px' }}>
            Control de viajes, SCOP, inventario de plantas y reportes.
          </p>
          <Boton variante="primary" onClick={() => setPantalla('precintos_dashboard')} style={{ width: '100%' }}>
            Entrar al Módulo
          </Boton>
        </Card>

        {/* TARJETA DE FUTURO MÓDULO (Bloqueado) */}
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

        {/* TARJETA DE FUTURO MÓDULO (Bloqueado) */}
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
      </div>
    </div>
  )
}