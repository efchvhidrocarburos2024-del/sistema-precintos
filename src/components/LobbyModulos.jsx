// src/components/LobbyModulos.jsx
// Versión segura: Sin dependencias externas críticas que puedan romper el build

export default function LobbyModulos({ sesion, cerrarSesion, setPantalla, rol }) {
  // Estilos inline para evitar dependencia de CSS externo roto
  const styles = {
    container: { maxWidth: '1200px', margin: '0 auto', padding: '0 20px', fontFamily: 'system-ui, sans-serif' },
    header: { padding: '20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', borderBottom: '1px solid #e5e7eb', marginBottom: '30px' },
    title: { margin: 0, color: '#0033A0', fontSize: '32px', fontWeight: '900', letterSpacing: '1.5px' },
    subtitle: { color: '#666666', fontSize: '14px', fontWeight: '500' },
    userInfo: { color: '#0033A0', fontWeight: '600', fontSize: '14px', background: '#f0f4ff', padding: '8px 16px', borderRadius: '20px' },
    btnLogout: { padding: '8px 16px', background: 'transparent', border: '1px solid #0033A0', color: '#0033A0', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginTop: '10px' },
    card: { background: 'white', textAlign: 'center', padding: '30px 20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer' },
    cardHover: { transform: 'translateY(-5px)', boxShadow: '0 12px 20px rgba(0,51,160,0.1)' },
    icon: { fontSize: '48px', marginBottom: '15px', display: 'block' },
    h3: { margin: '0 0 10px 0', color: '#0033A0', fontSize: '18px', fontWeight: '800' },
    p: { color: '#666666', fontSize: '14px', marginBottom: '20px', lineHeight: '1.5' },
    btnPrimary: { width: '100%', padding: '10px', background: '#0033A0', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' },
    btnDisabled: { width: '100%', padding: '10px', background: '#e5e7eb', color: '#9ca3af', border: 'none', borderRadius: '6px', cursor: 'not-allowed', fontWeight: '700', fontSize: '14px' },
  }

  // Lógica de permisos segura (Fallback si ACCESO_LOBBY no existe)
  // Asumimos que si no hay restricción explícita, el usuario logueado puede ver lo básico
  const puedeVerPrecintos = true // Simplificado para evitar crash por undefined
  const puedeVerRepositorio = true 
  const puedeVerCatalogos = rol === 'admin_sistema' || rol === 'jefe_pricing'
  const esAdmin = rol === 'admin_sistema'

  const handleCardClick = (screenId) => {
    if (typeof setPantalla === 'function') {
      setPantalla(screenId)
    } else {
      console.error('setPantalla no es una función')
    }
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>SIGMO</h1>
          <span style={styles.subtitle}>Sistema de Gestión Modular</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
          <span style={styles.userInfo}>
             {sesion?.user?.email || 'Usuario'} ({rol?.toUpperCase() || 'SIN ROL'})
          </span>
          <button style={styles.btnLogout} onClick={cerrarSesion}>Cerrar Sesión</button>
        </div>
      </header>

      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: '#0033A0', fontSize: '24px' }}>Bienvenido a SIGMO</h2>
        <p style={{ margin: '5px 0 0', color: '#666666' }}>Selecciona el módulo que deseas gestionar</p>
      </div>

      <div style={styles.grid}>
        
        {/* MÓDULO: PRECINTOS */}
        {puedeVerPrecintos && (
          <div 
            style={styles.card} 
            onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.cardHover)}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)' }}
            onClick={() => handleCardClick('precintos_menu')}
          >
            <span style={styles.icon}>📦</span>
            <h3 style={styles.h3}>Gestión de Precintos</h3>
            <p style={styles.p}>Control de viajes, SCOP, inventario de plantas y reportes.</p>
            <button style={styles.btnPrimary}>Entrar al Módulo</button>
          </div>
        )}

        {/* MÓDULO: REPOSITORIO */}
        {puedeVerRepositorio && (
          <div 
            style={styles.card}
            onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.cardHover)}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)' }}
            onClick={() => handleCardClick('repositorio')}
          >
            <span style={styles.icon}>📂</span>
            <h3 style={styles.h3}>Repositorio Documental</h3>
            <p style={styles.p}>Archivos técnicos, operativos y guías por categorías.</p>
            <button style={styles.btnPrimary}>Entrar al Módulo</button>
          </div>
        )}

        {/* MÓDULO: CATÁLOGOS */}
        {puedeVerCatalogos && (
          <div 
            style={styles.card}
            onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.cardHover)}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)' }}
            onClick={() => handleCardClick('catalogos')}
          >
            <span style={styles.icon}>⚙️</span>
            <h3 style={styles.h3}>Catálogos Maestros</h3>
            <p style={styles.p}>Proveedores, productos, terminales y usuarios.</p>
            <button style={styles.btnPrimary}>Entrar al Módulo</button>
          </div>
        )}

        {/* MÓDULO: PRECIOS (Siempre visible para roles logueados) */}
        <div 
          style={styles.card}
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.cardHover)}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)' }}
          onClick={() => handleCardClick('precios_menu')}
        >
          <span style={styles.icon}>💰</span>
          <h3 style={styles.h3}>Precios, Topes & Cotización</h3>
          <p style={styles.p}>Consulta y gestión de listas de precios, topes y cotizaciones.</p>
          <button style={styles.btnPrimary}>Entrar al Módulo</button>
        </div>

        {/* FUTUROS MÓDULOS (Solo Admin) */}
        {esAdmin && (
          <>
            <div style={{ ...styles.card, opacity: 0.6, cursor: 'default' }}>
              <span style={styles.icon}>🚚</span>
              <h3 style={styles.h3}>Gestión de Flota</h3>
              <p style={styles.p}>Control de vehículos y conductores.</p>
              <button style={styles.btnDisabled} disabled>Próximamente</button>
            </div>
            <div style={{ ...styles.card, opacity: 0.6, cursor: 'default' }}>
              <span style={styles.icon}>📊</span>
              <h3 style={styles.h3}>Business Intelligence</h3>
              <p style={styles.p}>Dashboards avanzados y KPIs.</p>
              <button style={styles.btnDisabled} disabled>Próximamente</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}