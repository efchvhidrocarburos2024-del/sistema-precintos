// src/components/precios/GestionPrecios.jsx
// ─────────────────────────────────────────────────────────────────────────────
// MENÚ PRECIOS, TOPES & COTIZACIÓN · lenguaje visual corporativo Petroamérica
// Banner en los colores del logo (AZUL #0033A0 · CYAN #00AEEF) y tarjetas con
// borde azul resaltado al pasar el mouse / enfocar con teclado.
// Contrato público intacto: <GestionPrecios setPantalla={…} rol={…} />
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../../supabase'
import toast from 'react-hot-toast'
import VisualizadorPrecios from './VisualizadorPrecios'
import CargadorPrecios from './CargadorPrecios'
import TendenciasPrecios from './TendenciasPrecios'
import CotizadorPrecios from './CotizadorPrecios'
import HistorialCotizaciones from './HistorialCotizaciones'

const AZUL = '#0033A0'
const AZUL_PROFUNDO = '#001B5E'
const AZUL_MEDIO = '#0057D8'
const CYAN = '#00AEEF'
const CYAN_CLARO = '#7FD8FF'
const VERDE = '#16A34A'
const AMBAR = '#F59E0B'
const ROJO = '#DC2626'
const TINTA = '#0B1B3A'
const PAPEL = '#F4F7FC'
const SUPERFICIE = '#FFFFFF'
const LINEA = '#DCE6F5'

const fechaDe = (r) =>
  r?.fecha_subida || r?.created_at || r?.subido_en || r?.fecha_cotizacion || r?.fecha || null

const fmtFecha = (v) => {
  if (!v) return '—'
  const d = new Date(v)
  return Number.isNaN(d.getTime())
    ? String(v)
    : d.toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ============================================================
// BANNER CORPORATIVO (colores del logo)
// ============================================================
function BannerPrecios({ onVolver, vigentePrecio, vigenteTopes, cargando }) {
  return (
    <header className="gp-banner" role="banner">
      <div className="gp-orbe" aria-hidden="true" />
      <div className="gp-banner-izq">
        <button type="button" className="gp-volver" onClick={onVolver} aria-label="Volver a SIGMO">
          ← SIGMO
        </button>
        <div className="gp-logo" aria-hidden="true">
          <svg viewBox="0 0 48 48" width="30" height="30">
            <path d="M14 40V10h14a10 10 0 0 1 0 20h-8v10z" fill="#fff" />
            <path d="M20 34c6-2 10-6 12-12 1 8-3 14-12 16z" fill={CYAN_CLARO} />
          </svg>
        </div>
        <div className="gp-titulos">
          <p className="gp-eyebrow">MÓDULO 3 · COMERCIAL</p>
          <h1 className="gp-titulo">Precios, Topes &amp; Cotización</h1>
        </div>
      </div>

      <div className="gp-banner-der">
        <span className={`gp-chip${vigentePrecio ? '' : ' warn'}`} title={vigentePrecio?.nombre_archivo || 'Sin lista de precios vigente'}>
          <span className="gp-punto" aria-hidden="true" />
          <span className="gp-chip-txt">{cargando ? 'Cargando…' : vigentePrecio ? 'Precios vigentes' : 'Sin precios vigentes'}</span>
        </span>
        <span className={`gp-chip${vigenteTopes ? '' : ' warn'}`} title={vigenteTopes?.nombre_archivo || 'Sin lista de topes vigente'}>
          <span className="gp-punto" aria-hidden="true" />
          <span className="gp-chip-txt">{cargando ? 'Cargando…' : vigenteTopes ? 'Topes vigentes' : 'Sin topes vigentes'}</span>
        </span>
      </div>
    </header>
  )
}

// ============================================================
// AUDITORÍA GENERAL (datos reales de Supabase)
// ============================================================
function AuditoriaGeneral({ archivos, archivosTopes, cotizaciones, onVolver, recargar }) {
  const [busqueda, setBusqueda] = useState('')
  const [tipo, setTipo] = useState('todos')

  const eventos = useMemo(() => {
    const ev = []
    archivos.forEach((a) => {
      ev.push({
        fecha: fechaDe(a),
        tipo: 'Precios',
        accion: a.es_vigente ? 'Lista vigente' : 'Lista cargada',
        detalle: a.nombre_archivo || a.nombre || 'Archivo de precios',
        actor: a.subido_por || a.creado_por || '—',
      })
    })
    archivosTopes.forEach((t) => {
      ev.push({
        fecha: fechaDe(t),
        tipo: 'Topes',
        accion: t.es_vigente ? 'Topes vigentes' : 'Topes cargados',
        detalle: t.nombre_archivo || t.nombre || 'Archivo de topes',
        actor: t.subido_por || t.creado_por || '—',
      })
    })
    cotizaciones.forEach((c) => {
      ev.push({
        fecha: c.fecha_cotizacion || fechaDe(c),
        tipo: 'Cotización',
        accion: 'Cotización guardada',
        detalle: `${c.numero_cotizacion || 's/n'} · ${c.cliente || 'sin cliente'}`,
        actor: c.creado_por || '—',
      })
    })
    return ev.sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0))
  }, [archivos, archivosTopes, cotizaciones])

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return eventos.filter((e) => {
      if (tipo !== 'todos' && e.tipo !== tipo) return false
      if (!q) return true
      return `${e.tipo} ${e.accion} ${e.detalle} ${e.actor}`.toLowerCase().includes(q)
    })
  }, [eventos, busqueda, tipo])

  const colorTipo = { Precios: AZUL, Topes: CYAN, Cotización: VERDE }

  return (
    <section className="gp-audit">
      <div className="gp-audit-cab">
        <div>
          <p className="gp-eyebrow oscuro">TRAZABILIDAD</p>
          <h2 className="gp-h2">Auditoría General</h2>
          <p className="gp-sub">{filtrados.length} de {eventos.length} eventos · historial de cambios del módulo</p>
        </div>
        <div className="gp-audit-acc">
          <button type="button" className="gp-btn fantasma" onClick={recargar}>⟳ Actualizar</button>
          <button type="button" className="gp-btn primario" onClick={onVolver}>← Volver al menú</button>
        </div>
      </div>

      <div className="gp-audit-filtros">
        <input
          className="gp-input"
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por archivo, cliente, actor o acción…"
          aria-label="Buscar en auditoría"
        />
        <select className="gp-select" value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Filtrar por tipo">
          <option value="todos">Todos los tipos</option>
          <option value="Precios">Precios</option>
          <option value="Topes">Topes</option>
          <option value="Cotización">Cotizaciones</option>
        </select>
      </div>

      <div className="gp-tabla-wrap">
        <table className="gp-tabla">
          <thead>
            <tr>
              <th>Fecha</th><th>Tipo</th><th>Acción</th><th>Detalle</th><th>Actor</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan={5} className="gp-vacio">Sin eventos que coincidan con el filtro.</td></tr>
            ) : filtrados.map((e, i) => (
              <tr key={`${e.tipo}-${e.detalle}-${i}`}>
                <td className="gp-fecha">{fmtFecha(e.fecha)}</td>
                <td><span className="gp-tag" style={{ '--tag': colorTipo[e.tipo] || AZUL }}>{e.tipo}</span></td>
                <td>{e.accion}</td>
                <td className="gp-detalle">{e.detalle}</td>
                <td className="gp-actor">{e.actor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function GestionPrecios({ setPantalla, rol }) {
  const [vista, setVista] = useState('menu')
  const [archivos, setArchivos] = useState([])
  const [archivosTopes, setArchivosTopes] = useState([])
  const [cotizaciones, setCotizaciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargarArchivos = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const [p, t] = await Promise.all([
        supabase.from('precios_archivos').select('*'),
        supabase.from('topes_archivos').select('*'),
      ])
      if (p.error) throw p.error
      if (t.error) throw t.error
      setArchivos(p.data || [])
      setArchivosTopes(t.data || [])
    } catch (e) {
      setError(e?.message || 'No se pudieron cargar las listas vigentes.')
    } finally {
      setCargando(false)
    }
  }, [])

  const cargarCotizaciones = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from('cotizaciones')
        .select('*')
        .order('fecha_cotizacion', { ascending: false })
        .limit(200)
      if (!err) setCotizaciones(data || [])
    } catch { /* la auditoría sigue funcionando con precios y topes */ }
  }, [])

  useEffect(() => {
    cargarArchivos()
    cargarCotizaciones()
  }, [cargarArchivos, cargarCotizaciones])

  const vigentePrecio = useMemo(() => archivos.find((a) => a.es_vigente) || null, [archivos])
  const vigenteTopes = useMemo(() => archivosTopes.find((t) => t.es_vigente) || null, [archivosTopes])

  const volverAlMenu = useCallback(() => setVista('menu'), [])
  const salirASigmo = useCallback(() => setPantalla(''), [setPantalla])

  const recargarTodo = useCallback(() => {
    cargarArchivos()
    cargarCotizaciones()
  }, [cargarArchivos, cargarCotizaciones])

  const opciones = [
    { id: 'visualizar', icono: '👁️', titulo: 'Visualizar Listas & Topes', desc: 'Ver, comparar y descargar archivos Excel.' },
    { id: 'cargar', icono: '📤', titulo: 'Cargar Nueva Lista & Topes', desc: 'Sube y previsualiza archivos Excel.' },
    { id: 'tendencias', icono: '📈', titulo: 'Gráfico de Tendencias', desc: 'Evolución histórica desde la base de datos.' },
    { id: 'cotizar', icono: '🧾', titulo: 'Cotizar', desc: 'Genera cotizaciones con precios y topes vigentes.' },
    { id: 'historial', icono: '📚', titulo: 'Historial de Cotizaciones', desc: 'Consulta y elimina cotizaciones guardadas.' },
    { id: 'auditoria', icono: '📋', titulo: 'Auditoría General', desc: 'Historial de cambios.' },
  ]

  // Props defensivos: cubren las distintas firmas de los subcomponentes
  const propsComunes = {
    archivos,
    archivosTopes,
    topes: archivosTopes,
    listas: archivos,
    onVolver: volverAlMenu,
    volver: volverAlMenu,
    setPantalla,
    rol,
    recargar: recargarTodo,
    onActualizado: recargarTodo,
    onCotizacionGuardada: recargarTodo,
  }

  return (
    <div className="gp-page">
      <style>{`
        .gp-page {
          min-height: 100vh;
          background:
            radial-gradient(900px 420px at 100% 0%, rgba(0,174,239,.10), transparent 60%),
            radial-gradient(700px 380px at 0% 100%, rgba(0,51,160,.08), transparent 60%),
            ${PAPEL};
          color: ${TINTA};
          font-family: inherit;
          scrollbar-color: ${CYAN} ${LINEA};
          scrollbar-width: thin;
        }
        .gp-page ::-webkit-scrollbar { width: 10px; height: 10px; }
        .gp-page ::-webkit-scrollbar-track { background: ${LINEA}; border-radius: 999px; }
        .gp-page ::-webkit-scrollbar-thumb { background: linear-gradient(180deg, ${CYAN}, ${AZUL}); border-radius: 999px; border: 2px solid ${LINEA}; }
        .gp-page ::-webkit-scrollbar-thumb:hover { background: ${AZUL}; }

        /* ── BANNER corporativo ── */
        .gp-banner {
          position: relative; overflow: hidden; isolation: isolate;
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 14px 22px;
          padding: 20px 30px 22px;
          color: #fff;
          background:
            radial-gradient(1000px 320px at 90% -60%, rgba(0,174,239,.55), transparent 62%),
            radial-gradient(720px 300px at 10% 130%, rgba(0,27,94,.9), transparent 60%),
            linear-gradient(118deg, ${AZUL_PROFUNDO} 0%, ${AZUL} 42%, ${AZUL_MEDIO} 72%, ${CYAN} 100%);
          border-bottom: 3px solid ${CYAN};
          box-shadow: 0 10px 30px rgba(0,27,94,.28);
        }
        .gp-banner::before {
          content: ''; position: absolute; inset: 0; z-index: -1;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E");
          opacity: .13; mix-blend-mode: overlay; pointer-events: none;
        }
        .gp-banner::after {
          content: ''; position: absolute; inset: 0; z-index: -1;
          background: linear-gradient(105deg, transparent 38%, rgba(255,255,255,.15) 50%, transparent 62%);
          background-size: 260% 100%;
          animation: gpSheen 9s ease-in-out infinite; pointer-events: none;
        }
        @keyframes gpSheen { 0%,100% { background-position: 120% 0; } 50% { background-position: -40% 0; } }
        @keyframes gpFlotar { 0%,100% { transform: translate3d(0,0,0); } 50% { transform: translate3d(-24px,12px,0); } }
        @keyframes gpPulso { 0%,100% { box-shadow: 0 0 0 0 rgba(127,216,255,.6); } 70% { box-shadow: 0 0 0 7px rgba(127,216,255,0); } }
        @keyframes gpEntrar { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes gpGirar { to { transform: rotate(360deg); } }

        .gp-orbe {
          position: absolute; z-index: -1; pointer-events: none;
          width: 320px; height: 320px; border-radius: 50%;
          right: -80px; top: -150px;
          background: radial-gradient(circle at 35% 35%, rgba(127,216,255,.5), rgba(0,174,239,.12) 60%, transparent 72%);
          filter: blur(6px); animation: gpFlotar 12s ease-in-out infinite;
        }
        .gp-banner-izq { display: flex; align-items: center; gap: 16px; min-width: 0; }
        .gp-volver {
          flex: none; padding: 9px 16px; border-radius: 10px;
          border: 1px solid rgba(255,255,255,.55);
          background: rgba(255,255,255,.12); color: #fff;
          font-size: 13px; font-weight: 700; cursor: pointer;
          backdrop-filter: blur(4px);
          transition: background .18s ease, transform .18s ease, border-color .18s ease;
        }
        .gp-volver:hover { background: rgba(255,255,255,.24); transform: translateY(-1px); border-color: #fff; }
        .gp-volver:active { transform: translateY(0) scale(.98); }
        .gp-logo {
          flex: none; width: 52px; height: 52px; display: grid; place-items: center;
          border-radius: 14px;
          background: linear-gradient(145deg, ${CYAN}, ${AZUL_MEDIO});
          border: 1px solid rgba(255,255,255,.4);
          box-shadow: 0 8px 20px rgba(0,27,94,.45), inset 0 1px 0 rgba(255,255,255,.45);
        }
        .gp-eyebrow { margin: 0 0 3px; font-size: 11px; font-weight: 800; letter-spacing: .18em; color: ${CYAN_CLARO}; text-transform: uppercase; }
        .gp-eyebrow.oscuro { color: ${AZUL_MEDIO}; }
        .gp-titulo { margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -.4px; line-height: 1.1; text-shadow: 0 2px 10px rgba(0,27,94,.5); }
        .gp-banner-der { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .gp-chip {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 8px 14px; border-radius: 999px;
          background: rgba(255,255,255,.16); border: 1px solid rgba(255,255,255,.35);
          font-size: 12px; font-weight: 800; backdrop-filter: blur(4px);
          max-width: 240px;
        }
        .gp-chip.warn { background: rgba(245,158,11,.25); border-color: rgba(245,158,11,.6); }
        .gp-chip-txt { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .gp-punto { width: 8px; height: 8px; border-radius: 50%; background: ${CYAN_CLARO}; animation: gpPulso 2s infinite; }
        .gp-chip.warn .gp-punto { background: ${AMBAR}; animation: none; }

        /* ── MENÚ / TARJETAS con borde azul al hover ── */
        .gp-menu { max-width: 1240px; margin: 0 auto; padding: 34px 26px 60px; }
        .gp-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 22px; }
        .gp-card {
          position: relative; overflow: hidden;
          display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px;
          padding: 30px 24px 26px;
          background: ${SUPERFICIE};
          border: 2px solid transparent;              /* borde base invisible */
          border-radius: 16px;
          box-shadow: 0 4px 14px rgba(0,51,160,.08);
          cursor: pointer; font: inherit; color: inherit;
          transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease;
          animation: gpEntrar .5s cubic-bezier(.22,1,.36,1) backwards;
        }
        .gp-card::before {
          content: ''; position: absolute; left: 0; right: 0; top: 0; height: 3px;
          background: linear-gradient(90deg, ${AZUL}, ${CYAN});
          transform: scaleX(0); transform-origin: left;
          transition: transform .25s ease;
        }
        /* ✅ EFECTO PEDIDO: borde azul resaltado al pasar el mouse / foco */
        .gp-card:hover, .gp-card:focus-visible {
          border-color: ${CYAN};
          box-shadow: 0 0 0 4px rgba(0,174,239,.16), 0 16px 34px rgba(0,51,160,.20);
          transform: translateY(-4px);
        }
        .gp-card:hover::before, .gp-card:focus-visible::before { transform: scaleX(1); }
        .gp-card:active { transform: translateY(-1px) scale(.99); }
        .gp-card:focus-visible { outline: 2px solid ${AZUL}; outline-offset: 3px; }
        .gp-icono {
          width: 64px; height: 64px; display: grid; place-items: center;
          font-size: 32px; border-radius: 16px;
          background: linear-gradient(145deg, rgba(0,174,239,.14), rgba(0,51,160,.10));
          border: 1px solid ${LINEA};
          transition: transform .2s ease, box-shadow .2s ease;
        }
        .gp-card:hover .gp-icono, .gp-card:focus-visible .gp-icono {
          transform: scale(1.08) rotate(-3deg);
          box-shadow: 0 8px 18px rgba(0,174,239,.28);
        }
        .gp-card-titulo { margin: 4px 0 0; font-size: 19px; font-weight: 800; color: ${AZUL}; }
        .gp-card-desc { margin: 0; font-size: 13.5px; color: #5B6B85; line-height: 1.5; flex: 1; }
        .gp-card-cta {
          margin-top: 6px; font-size: 12px; font-weight: 800; letter-spacing: .08em;
          color: ${CYAN}; text-transform: uppercase;
          opacity: 0; transform: translateY(4px);
          transition: opacity .2s ease, transform .2s ease;
        }
        .gp-card:hover .gp-card-cta, .gp-card:focus-visible .gp-card-cta { opacity: 1; transform: translateY(0); }

        .gp-estado {
          display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
          margin: 0 0 22px; padding: 12px 16px;
          background: ${SUPERFICIE}; border: 1px solid ${LINEA}; border-radius: 12px;
          font-size: 13px; color: #5B6B85;
        }
        .gp-estado.error { border-color: rgba(220,38,38,.4); background: #FEF2F2; color: ${ROJO}; font-weight: 700; }
        .gp-skel { height: 190px; border-radius: 16px; background: linear-gradient(100deg, #E8EEF7 40%, #F6F9FD 50%, #E8EEF7 60%); background-size: 200% 100%; animation: gpSkel 1.2s linear infinite; }
        @keyframes gpSkel { to { background-position: -200% 0; } }

        /* ── AUDITORÍA ── */
        .gp-audit { max-width: 1240px; margin: 0 auto; padding: 30px 26px 60px; }
        .gp-audit-cab { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; margin-bottom: 18px; }
        .gp-h2 { margin: 0; font-size: 26px; font-weight: 900; color: ${AZUL}; }
        .gp-sub { margin: 4px 0 0; font-size: 13px; color: #5B6B85; }
        .gp-audit-acc { display: flex; gap: 10px; flex-wrap: wrap; }
        .gp-btn { padding: 10px 16px; border-radius: 10px; font-size: 13px; font-weight: 800; cursor: pointer; transition: transform .16s ease, box-shadow .16s ease, filter .16s ease; }
        .gp-btn.primario { border: none; background: linear-gradient(145deg, ${AZUL_MEDIO}, ${AZUL}); color: #fff; box-shadow: 0 4px 14px rgba(0,51,160,.3); }
        .gp-btn.fantasma { border: 1px solid ${LINEA}; background: ${SUPERFICIE}; color: ${AZUL}; }
        .gp-btn:hover { transform: translateY(-1px); filter: brightness(1.06); }
        .gp-btn:active { transform: translateY(0) scale(.98); }
        .gp-audit-filtros { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
        .gp-input, .gp-select {
          padding: 11px 14px; border-radius: 10px; border: 1px solid ${LINEA};
          background: ${SUPERFICIE}; color: ${TINTA}; font-size: 14px; font: inherit;
        }
        .gp-input { flex: 1 1 260px; }
        .gp-input:focus, .gp-select:focus { outline: none; border-color: ${CYAN}; box-shadow: 0 0 0 3px rgba(0,174,239,.18); }
        .gp-tabla-wrap { overflow: auto; background: ${SUPERFICIE}; border: 1px solid ${LINEA}; border-radius: 14px; max-height: 62vh; }
        .gp-tabla { width: 100%; border-collapse: collapse; font-size: 13px; }
        .gp-tabla thead th {
          position: sticky; top: 0; z-index: 1;
          background: linear-gradient(145deg, ${AZUL}, ${AZUL_MEDIO});
          color: #fff; text-align: left; padding: 12px 14px; font-size: 12px; letter-spacing: .06em; text-transform: uppercase;
        }
        .gp-tabla tbody td { padding: 11px 14px; border-top: 1px solid ${LINEA}; vertical-align: top; }
        .gp-tabla tbody tr:nth-child(even) { background: #F7FAFE; }
        .gp-tabla tbody tr:hover { background: rgba(0,174,239,.08); }
        .gp-fecha { white-space: nowrap; color: #5B6B85; font-variant-numeric: tabular-nums; }
        .gp-detalle { max-width: 380px; overflow: hidden; text-overflow: ellipsis; }
        .gp-actor { color: #5B6B85; }
        .gp-vacio { text-align: center; padding: 34px 14px !important; color: #5B6B85; }
        .gp-tag {
          display: inline-block; padding: 3px 10px; border-radius: 999px;
          font-size: 11px; font-weight: 800;
          color: var(--tag); background: color-mix(in srgb, var(--tag) 12%, white);
          border: 1px solid color-mix(in srgb, var(--tag) 35%, white);
        }

        .gp-subvista { padding: 22px 26px 60px; max-width: 1400px; margin: 0 auto; }

        @media (max-width: 720px) {
          .gp-banner { padding: 16px 18px 18px; }
          .gp-titulo { font-size: 21px; }
          .gp-menu, .gp-audit, .gp-subvista { padding-left: 16px; padding-right: 16px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .gp-banner::after, .gp-orbe, .gp-punto, .gp-skel { animation: none !important; }
          .gp-card, .gp-icono, .gp-card-cta { transition: none !important; }
        }
      `}</style>

      <BannerPrecios
        onVolver={vista === 'menu' ? salirASigmo : volverAlMenu}
        vigentePrecio={vigentePrecio}
        vigenteTopes={vigenteTopes}
        cargando={cargando}
      />

      {vista === 'menu' && (
        <main className="gp-menu">
          {error ? (
            <div className="gp-estado error" role="alert">
              <span>⚠️ {error}</span>
              <button type="button" className="gp-btn fantasma" onClick={cargarArchivos}>⟳ Reintentar</button>
            </div>
          ) : (
            <div className="gp-estado">
              <span>📌 <strong>Fuentes vigentes:</strong></span>
              <span>{cargando ? 'cargando…' : vigentePrecio?.nombre_archivo || 'sin lista de precios'}</span>
              <span aria-hidden="true">·</span>
              <span>{cargando ? 'cargando…' : vigenteTopes?.nombre_archivo || 'sin lista de topes'}</span>
            </div>
          )}

          <div className="gp-grid">
            {cargando
              ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="gp-skel" aria-hidden="true" />)
              : opciones.map((o, i) => (
                  <button
                    key={o.id}
                    type="button"
                    className="gp-card"
                    style={{ animationDelay: `${i * 70}ms` }}
                    onClick={() => {
                      if (o.id === 'auditoria') cargarCotizaciones()
                      setVista(o.id)
                    }}
                  >
                    <span className="gp-icono" aria-hidden="true">{o.icono}</span>
                    <h3 className="gp-card-titulo">{o.titulo}</h3>
                    <p className="gp-card-desc">{o.desc}</p>
                    <span className="gp-card-cta">Abrir →</span>
                  </button>
                ))}
          </div>
        </main>
      )}

      {vista === 'visualizar' && <div className="gp-subvista"><VisualizadorPrecios {...propsComunes} /></div>}
      {vista === 'cargar' && <div className="gp-subvista"><CargadorPrecios {...propsComunes} /></div>}
      {vista === 'tendencias' && <div className="gp-subvista"><TendenciasPrecios {...propsComunes} /></div>}
      {vista === 'cotizar' && <div className="gp-subvista"><CotizadorPrecios {...propsComunes} /></div>}
      {vista === 'historial' && <div className="gp-subvista"><HistorialCotizaciones {...propsComunes} /></div>}
      {vista === 'auditoria' && (
        <AuditoriaGeneral
          archivos={archivos}
          archivosTopes={archivosTopes}
          cotizaciones={cotizaciones}
          onVolver={volverAlMenu}
          recargar={recargarTodo}
        />
      )}
    </div>
  )
}