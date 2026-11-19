import { Boton } from './ui'

export default function NavbarPrecintos({ sesion, cerrarSesion, setPantalla }) {
  return (
    <nav
      style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '15px 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '15px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <Boton variante="outline" onClick={() => setPantalla('precintos_menu')}>
          ← Volver al Menú
        </Boton>
        <span style={{ fontSize: '20px', fontWeight: '900', color: 'var(--primary-blue)' }}>
          Precintos
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', color: '#4b5563', fontWeight: '500' }}>
          👤 {sesion.user.email}
        </span>
        <Boton variante="outline" onClick={() => setPantalla('cambiar-password')}>
          Mi Perfil
        </Boton>
        <Boton variante="outline" onClick={cerrarSesion}>
          Salir
        </Boton>
      </div>
    </nav>
  )
}