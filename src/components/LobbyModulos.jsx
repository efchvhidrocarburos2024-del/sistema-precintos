// src/components/LobbyModulos.jsx
import { ACCESO_LOBBY } from '../utils/permisos'

const AZUL = '#0033A0'

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
      visible: true,
    },
    {
      id: null,
      icono: '🚚',
      titulo: 'Gestión de Flota',
      desc: 'Control de vehículos y conductores.',
      proximo: true,
      visible: true,
    },
    {
      id: null,
      icono: '📊',
      titulo: 'Business Intelligence',
      desc: 'Dashboards avanzados y KPIs.',
      proximo: true,
      visible: true,
    },
  ].filter(m => m.visible)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg, #eef1f5)' }}>
      <style>{`
        .lobby-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .lobby-card:hover { transform: translateY(-4px); box-shadow: 0 12px 28px rgba(0,51,160,0.14); }
        .lobby-btn { transition: filter 0.15s ease, transform 0.15s ease; }
        .lobby-btn:hover:not(:disabled) { filter: brightness(1.12); transform: translateY(-1px); }
      `}</style>

      {/* ============ HEADER CON LOGO ============ */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', backgroundColor: 'white', padding: '14px 28px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img
            src="/logo-p.png"
            alt="Logo Petro America"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
            style={{ height: '46px', width: 'auto', display: 'block' }}
          />
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 900, color: AZUL, letterSpacing: '-0.5px', lineHeight: 1.1 }}>SIGMO</h1>
            <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Sistema de Gestión Modular</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ padding: '9px 18px', borderRadius: '999px', backgroundColor: '#eff6ff', color: '#1e40af', fontWeight: 'bold', fontSize: '14px' }}>
            {sesion?.user?.email} ({String(rol || '').toUpperCase()})
          </span>
          <button
            onClick={cerrarSesion}
            className="lobby-btn"
            style={{ padding: '9px 18px', borderRadius: '8px', border: `1px solid ${AZUL}`, backgroundColor: 'white', color: AZUL, fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* ============ BIENVENIDA ============ */}
      <main style={{ padding: '40px 28px', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h2 style={{ margin: '0 0 8px', fontSize: '30px', fontWeight: 800, color: AZUL }}>Bienvenido a SIGMO</h2>
          <p style={{ margin: 0, fontSize: '16px', color: '#6b7280' }}>Selecciona el módulo que deseas gestionar</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          {modulos.map((m) => (
            <div
              key={m.titulo}
              className="lobby-card"
              style={{ backgroundColor: '#fbfcfe', borderRadius: '14px', boxShadow: '0 4px 14px rgba(0,51,160,0.08)', padding: '30px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '12px' }}
            >
              <div style={{ fontSize: '52px', lineHeight: 1, opacity: m.proximo ? 0.55 : 1 }}>{m.icono}</div>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: m.proximo ? '#7c93c4' : AZUL }}>{m.titulo}</h3>
              <p style={{ margin: 0, fontSize: '14px', color: '#6b7280', flex: 1 }}>{m.desc}</p>
              {m.proximo ? (
                <button disabled style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#e5e7eb', color: '#9ca3af', fontSize: '15px', fontWeight: 'bold', cursor: 'not-allowed' }}>
                  Próximamente
                </button>
              ) : (
                <button
                  onClick={() => setPantalla(m.id)}
                  className="lobby-btn"
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: AZUL, color: '#fff', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Entrar al Módulo
                </button>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}