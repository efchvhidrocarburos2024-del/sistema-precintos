import { useState } from 'react'
import { Card, Boton } from '../ui'

import RegistrarCuota from './RegistrarCuota'
import RegistrarBDC from './RegistrarBDC'
import SolicitarCederCuota from './SolicitarCederCuota'
import ReasignarCuota from './ReasignarCuota'
import HistorialCuotas from './HistorialCuotas'

const AZUL_PROFUNDO = '#001B5E'
const AZUL_CORPORATIVO = '#0033A0'
const AZUL_MEDIO = '#0057D8'
const CYAN = '#00AEEF'
const BLANCO = '#FFFFFF'

const cardStyle = {
  backgroundColor: 'white', borderRadius: '12px', padding: '30px 20px', textAlign: 'center',
  boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '2px solid transparent', cursor: 'pointer',
  transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
}

const btnHeaderStyle = { 
  background: 'rgba(255,255,255,0.14)', 
  border: '1px solid rgba(255,255,255,0.6)', 
  color: BLANCO, 
  padding: '6px 12px', 
  borderRadius: '6px', 
  cursor: 'pointer', 
  fontSize: '13px', 
  fontWeight: 'bold' 
}

export default function GestionStock({ setPantalla, rol, permisos = [] }) {
  const [vista, setVista] = useState('menu')
  const [hoverCard, setHoverCard] = useState(null)
  
  const propsTarjeta = (id) => ({
    onMouseEnter: () => setHoverCard(id),
    onMouseLeave: () => setHoverCard(null),
    style: {
      ...cardStyle,
      borderColor: hoverCard === id ? AZUL_CORPORATIVO : 'transparent',
      boxShadow: hoverCard === id ? '0 0 0 3px rgba(0,51,160,0.15), 0 10px 24px rgba(0,51,160,0.18)' : cardStyle.boxShadow,
      transform: hoverCard === id ? 'translateY(-4px)' : 'translateY(0)',
    },
  })

  // ✅ Permisos evaluados igual que en GestionPrecios
  const puedeRegistrar = permisos.includes('registrar_stock') || rol === 'admin_sistema' || rol === 'admin_planta' || rol === 'jefe_operaciones' || rol === 'analista_operaciones'
  const puedeSolicitar = permisos.includes('solicitar_stock') || rol === 'asesor_comercial' || rol === 'analista_comercial'
  const puedeReasignar = permisos.includes('reasignar_stock') || rol === 'admin_sistema' || rol === 'jefe_operaciones' || rol === 'jefe_pricing'

  const Header = ({ titulo, onVolver, textoVolver = '← Volver al Menú' }) => (
    <header style={{ 
      width: '100%', padding: '20px 40px', display: 'flex', alignItems: 'center', gap: '15px',
      background: `linear-gradient(118deg, ${AZUL_PROFUNDO} 0%, ${AZUL_CORPORATIVO} 45%, ${AZUL_MEDIO} 78%, ${CYAN} 100%)`,
      borderBottom: `3px solid ${CYAN}`, boxShadow: '0 6px 18px rgba(0,27,94,0.25)'
    }}>
      <button onClick={onVolver} style={btnHeaderStyle}>{textoVolver}</button>
      <div style={{ 
        width: '52px', height: '52px', display: 'grid', placeItems: 'center', fontSize: '26px',
        borderRadius: '14px', background: `linear-gradient(145deg, ${CYAN}, ${AZUL_MEDIO})`,
        border: '1px solid rgba(255,255,255,0.4)',
        boxShadow: '0 8px 20px rgba(0,27,94,0.45), inset 0 1px 0 rgba(255,255,255,0.45)'
      }}>📦</div>
      <h1 style={{ margin: 0, color: BLANCO, fontSize: '28px', fontWeight: '900' }}>{titulo}</h1>
    </header>
  )

  // === MENÚ PRINCIPAL ===
  if (vista === 'menu') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
        <Header titulo="Control de Stock" onVolver={() => setPantalla('')} textoVolver="← SIGMO" />
        <main style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            
            {puedeRegistrar && (
              <div onClick={() => setVista('registrar_cuota')} {...propsTarjeta('registrar_cuota')}>
                <div style={{ fontSize: '50px', marginBottom: '15px' }}>📝</div>
                <h3 style={{ color: AZUL_CORPORATIVO, marginBottom: '10px', fontSize: '18px' }}>Registrar Cuota</h3>
                <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Asigna cuotas por planta y asesor.</p>
              </div>
            )}
            
            {puedeRegistrar && (
              <div onClick={() => setVista('registrar_bdc')} {...propsTarjeta('registrar_bdc')}>
                <div style={{ fontSize: '50px', marginBottom: '15px' }}>📊</div>
                <h3 style={{ color: AZUL_CORPORATIVO, marginBottom: '10px', fontSize: '18px' }}>Registrar BDC</h3>
                <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Registra Barriles por Día Calendario.</p>
              </div>
            )}
            
            {puedeSolicitar && (
              <div onClick={() => setVista('solicitar_ceder')} {...propsTarjeta('solicitar_ceder')}>
                <div style={{ fontSize: '50px', marginBottom: '15px' }}>🤝</div>
                <h3 style={{ color: AZUL_CORPORATIVO, marginBottom: '10px', fontSize: '18px' }}>Solicitar / Ceder</h3>
                <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Gestiona solicitudes y cesiones de cuota.</p>
              </div>
            )}
            
            {puedeReasignar && (
              <div onClick={() => setVista('reasignar')} {...propsTarjeta('reasignar')}>
                <div style={{ fontSize: '50px', marginBottom: '15px' }}>🔁</div>
                <h3 style={{ color: AZUL_CORPORATIVO, marginBottom: '10px', fontSize: '18px' }}>Reasignar Cuota</h3>
                <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Reasigna galones entre cuotas existentes.</p>
              </div>
            )}
            
            <div onClick={() => setVista('historial')} {...propsTarjeta('historial')}>
              <div style={{ fontSize: '50px', marginBottom: '15px' }}>📚</div>
              <h3 style={{ color: AZUL_CORPORATIVO, marginBottom: '10px', fontSize: '18px' }}>Historial</h3>
              <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>Consulta el historial de movimientos.</p>
            </div>
            
          </div>
        </main>
      </div>
    )
  }

  // === SUB-VISTAS ===
  if (vista === 'registrar_cuota') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
        <Header titulo="Registrar Cuota" onVolver={() => setVista('menu')} />
        <div style={{ padding: '30px 40px' }}>
          <RegistrarCuota onVolver={() => setVista('menu')} rol={rol} />
        </div>
      </div>
    )
  }

  if (vista === 'registrar_bdc') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
        <Header titulo="Registrar BDC" onVolver={() => setVista('menu')} />
        <div style={{ padding: '30px 40px' }}>
          <RegistrarBDC onVolver={() => setVista('menu')} rol={rol} />
        </div>
      </div>
    )
  }

  if (vista === 'solicitar_ceder') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
        <Header titulo="Solicitar / Ceder Cuota" onVolver={() => setVista('menu')} />
        <div style={{ padding: '30px 40px' }}>
          <SolicitarCederCuota onVolver={() => setVista('menu')} rol={rol} />
        </div>
      </div>
    )
  }

  if (vista === 'reasignar') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
        <Header titulo="Reasignar Cuota" onVolver={() => setVista('menu')} />
        <div style={{ padding: '30px 40px' }}>
          <ReasignarCuota onVolver={() => setVista('menu')} rol={rol} />
        </div>
      </div>
    )
  }

  if (vista === 'historial') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
        <Header titulo="Historial de Cuotas" onVolver={() => setVista('menu')} />
        <div style={{ padding: '30px 40px' }}>
          <HistorialCuotas onVolver={() => setVista('menu')} />
        </div>
      </div>
    )
  }

  return null
}