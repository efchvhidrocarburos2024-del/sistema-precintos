// ============================================================================
//  SIGMO · MÓDULO 2 · REPOSITORIO DOCUMENTAL — Orquestador
//  Misma ruta, mismo export, mismas props que el monolito anterior:
//  App.jsx no necesita ningún cambio.
//
//  Seguridad: si App.jsx no pasa `rol` ni `user`, ambos se resuelven desde la
//  sesión real de Supabase y la tabla usuarios→roles. Nunca desde un valor fijo.
// ============================================================================
import { useState, useMemo, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../supabase'
import { Estilos, Fondo, Boton, Confirmar, Insignia } from './documental/base'
import {
  useDocumentos, BibliotecaDocumental, CargaDocumental, DetalleDocumento,
  GestorCategorias, PanelEstadisticas, PapeleraDocumental, AuditoriaDocumental,
} from './documental'
import { PALETA, CAPACIDAD_BYTES, mezclarHex, formatearBytes, iniciales, permisosDocumental } from './documental/constantes'

const NAV = [
  { id: 'biblioteca', icono: '🗂️', label: 'Biblioteca' },
  { id: 'carga', icono: '📤', label: 'Publicar' },
  { id: 'categorias', icono: '🏷️', label: 'Categorías' },
  { id: 'estadisticas', icono: '📊', label: 'Métricas' },
  { id: 'papelera', icono: '🗑️', label: 'Papelera' },
  { id: 'auditoria', icono: '🧭', label: 'Bitácora' },
]

export default function RepositorioDocumental({ setPantalla, rol, user }) {
  // ---- Identidad y permisos: prop > sesión/BD > lectura -------------------
  const [usuarioSesion, setUsuarioSesion] = useState('')
  const [rolSesion, setRolSesion] = useState('')

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const { data: auth } = await supabase.auth.getUser()
        const email = auth?.user?.email
        if (!vivo || !email) return
        setUsuarioSesion(email)

        const { data } = await supabase
          .from('usuarios')
          .select('id_rol, roles(codigo)')
          .eq('email', email)
          .maybeSingle()
        if (vivo && data?.roles?.codigo) {
          setRolSesion(String(data.roles.codigo).toLowerCase())
        }
      } catch { /* sin sesión o sin join: queda modo lectura */ }
    })()
    return () => { vivo = false }
  }, [])

  const usuario = user?.email || usuarioSesion || 'sistema@sigmo.pe'
  const rolEfectivo = rol || rolSesion || 'consulta'

  const repo = useDocumentos({ usuario })

  const [vista, setVista] = useState('biblioteca')
  const [detalleId, setDetalleId] = useState(null)
  const [confirmacion, setConfirmacion] = useState(null)
  const [catFiltro, setCatFiltro] = useState(null)

const perm = permisosDocumental(rolEfectivo)
const puedeCargar = perm.cargar
const puedeGestionar = perm.gestionar
const puedeEliminar = perm.eliminar

  const activos = useMemo(() => repo.documentos.filter(d => !d.eliminado), [repo.documentos])
  const papelera = useMemo(() => repo.documentos.filter(d => d.eliminado), [repo.documentos])
  const bytes = useMemo(() => activos.reduce((s, d) => s + (d.tamano_bytes || 0), 0), [activos])
  const usoPct = Math.min(100, (bytes / CAPACIDAD_BYTES) * 100)
  const detalle = useMemo(
    () => repo.documentos.find(d => d.id === detalleId) || null,
    [repo.documentos, detalleId],
  )

  const conteos = {
    biblioteca: activos.length, carga: null, categorias: repo.categorias.length,
    estadisticas: null, papelera: papelera.length, auditoria: repo.auditoria.length,
  }

  const volver = useCallback(() => {
    if (typeof setPantalla === 'function') setPantalla('')
    else window.history.back()
  }, [setPantalla])

  const abrir = useCallback(id => setDetalleId(id), [])
  const verCategoria = useCallback(id => {
    setCatFiltro(id); setVista('biblioteca'); toast.success('Categoría aplicada en la biblioteca')
  }, [])

  useEffect(() => {
    if (detalleId && !repo.documentos.some(d => d.id === detalleId)) setDetalleId(null)
  }, [repo.documentos, detalleId])

  return (
    <div className="rd-app">
      <Estilos />
      <Fondo />

      {/* ------------------------------------------------------- cabecera -- */}
      <header className="rd-top">
        <div className="rd-top-in">
          <button className="rd-volver" onClick={volver}>← SIGMO</button>

          <div className="rd-marca">
            <div className="rd-sello">📁</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: '#9FE3F5', fontWeight: 800 }}>
                Módulo 2 · Acervo controlado
              </div>
              <h1 style={{ margin: '1px 0 0', fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: -.4, lineHeight: 1.15 }}>
                Repositorio Documental
              </h1>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginLeft: 'auto' }}>
            <Insignia color={repo.modo === 'supabase' ? PALETA.lima : PALETA.ambar} solido
              style={{ fontSize: 10.5, padding: '5px 11px' }}>
              {repo.modo === 'supabase' ? '● SUPABASE ACTIVO' : '● MODO LOCAL'}
            </Insignia>

            <div className="rd-medidor">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#BFE2F0', fontWeight: 700 }}>
                <span>Almacenamiento</span>
                <span style={{ color: '#fff' }}>{formatearBytes(bytes)} / 512 MB</span>
              </div>
              <div className="rd-medidor-bar">
                <div className="rd-medidor-fill" style={{ width: `${Math.max(2, usoPct)}%` }} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 11px 5px 6px', borderRadius: 99, background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)' }}
              title={`${usuario} · rol ${rolEfectivo}`}>
              <span style={{ width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 900, color: PALETA.tinta, background: `linear-gradient(135deg,${PALETA.lima},${PALETA.cyan})`, flex: 'none' }}>
                {iniciales(usuario)}
              </span>
              <span style={{ fontSize: 11.5, color: '#EAF4FA', fontWeight: 700, maxWidth: 168, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {usuario.split('@')[0]}
              </span>
            </div>

            <Boton tamano="sm" variante="gh" icono="⟳" title="Recargar datos"
              onClick={() => { repo.recargar(); toast.success('Repositorio sincronizado') }}>Sincronizar</Boton>

            {puedeCargar && vista !== 'carga' && (
              <Boton tamano="sm" icono="📤" onClick={() => setVista('carga')}
                style={{ background: `linear-gradient(100deg,${PALETA.ambar},#D97706)`, color: '#fff' }}>Publicar</Boton>
            )}
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------- cuerpo -- */}
      <div className="rd-cuerpo">
        <nav className="rd-rail" aria-label="Secciones del repositorio">
          {NAV.map(n => (
            <button key={n.id} className={`rd-nav ${vista === n.id ? 'on' : ''}`} onClick={() => setVista(n.id)}>
              <span style={{ fontSize: 16 }} aria-hidden>{n.icono}</span>
              <span>{n.label}</span>
              {conteos[n.id] !== null && <span className="n">{conteos[n.id]}</span>}
            </button>
          ))}

          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${PALETA.borde}` }}>
            <div className="rd-lab" style={{ padding: '0 4px 7px' }}>Estado del acervo</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 4px' }}>
              <Linea etiqueta="Vigentes" valor={activos.filter(d => d.vigente).length} color={PALETA.exito} />
              <Linea etiqueta="Obsoletos" valor={activos.filter(d => !d.vigente).length} color={PALETA.suave} />
              <Linea etiqueta="Destacados" valor={activos.filter(d => d.destacado).length} color={PALETA.ambar} />
              <Linea etiqueta="Versiones" valor={repo.versiones.length} color={PALETA.violeta} />
            </div>
          </div>

          {repo.modo === 'local' && (
            <div style={{ marginTop: 10, padding: 11, borderRadius: 12, background: mezclarHex(PALETA.ambar, .12), border: `1px solid ${mezclarHex(PALETA.ambar, .35)}` }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#92400E', marginBottom: 5 }}>⚡ Modo local activo</div>
              <p style={{ margin: '0 0 9px', fontSize: 10.8, color: '#92400E', lineHeight: 1.55 }}>
                Operando con el acervo precargado y persistencia en este navegador. Ejecuta
                <code style={{ background: 'rgba(255,255,255,.6)', padding: '1px 4px', borderRadius: 4, margin: '0 3px' }}>database/02_repositorio_documental.sql</code>
                en Supabase para conectar el almacenamiento real.
              </p>
              <Boton tamano="sm" variante="gh" onClick={repo.reiniciarDemo} style={{ width: '100%' }}>Restaurar acervo</Boton>
            </div>
          )}
        </nav>

        <main style={{ minWidth: 0 }}>
          {vista === 'biblioteca' && (
            <BibliotecaDocumental key={catFiltro || 'todas'} repo={repo} onAbrir={abrir}
              onIrCarga={() => setVista('carga')} puedeCargar={puedeCargar} categoriaInicial={catFiltro} />
          )}
          {vista === 'carga' && (
            <CargaDocumental repo={repo} puedeCargar={puedeCargar}
              onPublicado={() => { setCatFiltro(null); setVista('biblioteca') }} />
          )}
          {vista === 'categorias' && (
            <GestorCategorias repo={repo} puedeGestionar={puedeGestionar} onVerCategoria={verCategoria} />
          )}
          {vista === 'estadisticas' && <PanelEstadisticas repo={repo} onAbrir={abrir} />}
          {vista === 'papelera' && (
            <PapeleraDocumental repo={repo} puedeEliminar={puedeEliminar} onConfirmar={setConfirmacion} />
          )}
          {vista === 'auditoria' && <AuditoriaDocumental repo={repo} onAbrir={abrir} />}
        </main>
      </div>

      {detalle && (
        <DetalleDocumento doc={detalle} repo={repo} puedeGestionar={puedeGestionar}
          onCerrar={() => setDetalleId(null)} onConfirmar={setConfirmacion} />
      )}

      <Confirmar estado={confirmacion} onCerrar={() => setConfirmacion(null)} />
    </div>
  )
}

function Linea({ etiqueta, valor, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5 }}>
      <span style={{ width: 8, height: 8, borderRadius: 3, background: color, flex: 'none' }} />
      <span style={{ color: PALETA.suave, fontWeight: 600, flex: 1 }}>{etiqueta}</span>
      <span style={{ color: PALETA.tinta, fontWeight: 900 }}>{valor}</span>
    </div>
  )
}