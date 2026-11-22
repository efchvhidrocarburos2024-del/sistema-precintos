import { useState, useMemo, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { PALETA, mezclarHex, normalizar, infoTipo, formatearBytes, haceCuanto, formatearFecha } from './constantes'
import { Boton, Insignia, IconoTipo, Casilla, Vacio, Esqueleto, Interruptor, Segmentado } from './base'
import { exportarInventarioCSV, exportarExcel, descargarDocumento } from './descargas'

const CLAVE_VISTAS = 'sigmo_repo_vistas'
const ORDENES = [
  { v: 'recientes', t: 'Más recientes' }, { v: 'antiguos', t: 'Más antiguos' },
  { v: 'titulo', t: 'Título A–Z' }, { v: 'descargas', t: 'Más descargados' },
  { v: 'tamano', t: 'Mayor tamaño' }, { v: 'version', t: 'Versión más alta' },
]
const leerVistas = () => { try { return JSON.parse(localStorage.getItem(CLAVE_VISTAS)) || [] } catch { return [] } }

export default function BibliotecaDocumental({ repo, onAbrir, onIrCarga, puedeCargar, categoriaInicial }) {
  const { documentos, categorias, versiones, catalogos, cargando } = repo
  const [q, setQ] = useState('')
  const [cat, setCat] = useState(categoriaInicial || 'todas')
  const [tipo, setTipo] = useState('todos')
  const [estado, setEstado] = useState('todos')
  const [planta, setPlanta] = useState('todas')
  const [proveedor, setProveedor] = useState('todos')
  const [orden, setOrden] = useState('recientes')
  const [soloDestacados, setSoloDestacados] = useState(false)
  const [vista, setVista] = useState('tarjetas')
  const [densidad, setDensidad] = useState(280)
  const [sel, setSel] = useState([])
  const [visibles, setVisibles] = useState(24)
  const [vistas, setVistas] = useState(leerVistas)
  const [nombreVista, setNombreVista] = useState('')
  const [guardando, setGuardando] = useState(false)

  const mapaCat = useMemo(() => Object.fromEntries(categorias.map(c => [c.id, c])), [categorias])
  const activos = useMemo(() => documentos.filter(d => !d.eliminado), [documentos])
  const conteo = useMemo(() => { const m = {}; activos.forEach(d => { m[d.categoria_id] = (m[d.categoria_id] || 0) + 1 }); return m }, [activos])
  const plantasDisp = useMemo(() => [...new Set(activos.map(d => d.planta).filter(Boolean))].sort(), [activos])
  const provDisp = useMemo(() => [...new Set(activos.map(d => d.proveedor).filter(Boolean))].sort(), [activos])

  const filtrados = useMemo(() => {
    const term = normalizar(q)
    const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0 }
    return activos.filter(d => {
      if (cat !== 'todas' && d.categoria_id !== cat) return false
      if (tipo !== 'todos' && d.tipo !== tipo) return false
      if (estado === 'vigentes' && !d.vigente) return false
      if (estado === 'obsoletos' && d.vigente) return false
      if (planta !== 'todas' && (d.planta || '') !== planta) return false
      if (proveedor !== 'todos' && (d.proveedor || '') !== proveedor) return false
      if (soloDestacados && !d.destacado) return false
      if (!term) return true
      return normalizar([d.titulo, d.descripcion, d.nombre_archivo, (d.etiquetas || []).join(' '),
        mapaCat[d.categoria_id]?.nombre, d.proveedor, d.producto].join(' ')).includes(term)
    }).sort((a, b) => {
      switch (orden) {
        case 'antiguos': return new Date(a.created_at) - new Date(b.created_at)
        case 'titulo': return a.titulo.localeCompare(b.titulo, 'es')
        case 'descargas': return (b.descargas || 0) - (a.descargas || 0)
        case 'tamano': return (b.tamano_bytes || 0) - (a.tamano_bytes || 0)
        case 'version': return num(b.version) - num(a.version)
        default: return new Date(b.created_at) - new Date(a.created_at)
      }
    })
  }, [activos, q, cat, tipo, estado, planta, proveedor, soloDestacados, orden, mapaCat])

  useEffect(() => { setVisibles(24) }, [q, cat, tipo, estado, planta, proveedor, orden, soloDestacados])
  useEffect(() => { setSel(s => s.filter(id => filtrados.some(d => d.id === id))) }, [filtrados])

  const limpiar = useCallback(() => {
    setQ(''); setCat('todas'); setTipo('todos'); setEstado('todos')
    setPlanta('todas'); setProveedor('todos'); setSoloDestacados(false); setOrden('recientes')
  }, [])
  const hayFiltros = q || cat !== 'todas' || tipo !== 'todos' || estado !== 'todos' ||
    planta !== 'todas' || proveedor !== 'todos' || soloDestacados || orden !== 'recientes'

  const guardarVista = () => {
    const n = nombreVista.trim()
    if (!n) return toast.error('Asigna un nombre a la vista')
    const lista = [...vistas, { id: Date.now(), nombre: n, f: { q, cat, tipo, estado, planta, proveedor, orden, soloDestacados } }].slice(-8)
    setVistas(lista); try { localStorage.setItem(CLAVE_VISTAS, JSON.stringify(lista)) } catch {}
    setNombreVista(''); setGuardando(false); toast.success(`Vista "${n}" guardada`)
  }
  const aplicarVista = (v) => {
    setQ(v.f.q || ''); setCat(v.f.cat || 'todas'); setTipo(v.f.tipo || 'todos'); setEstado(v.f.estado || 'todos')
    setPlanta(v.f.planta || 'todas'); setProveedor(v.f.proveedor || 'todos')
    setOrden(v.f.orden || 'recientes'); setSoloDestacados(!!v.f.soloDestacados)
    toast.success(`Vista "${v.nombre}" aplicada`)
  }
  const borrarVista = (id) => {
    const lista = vistas.filter(v => v.id !== id); setVistas(lista)
    try { localStorage.setItem(CLAVE_VISTAS, JSON.stringify(lista)) } catch {}
  }

  const alternar = id => setSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  const todos = filtrados.length > 0 && filtrados.slice(0, visibles).every(d => sel.includes(d.id))
  const alternarTodos = () => setSel(todos ? [] : filtrados.slice(0, visibles).map(d => d.id))

  const descargar = async (doc) => {
    try {
      const msg = await descargarDocumento(doc, mapaCat[doc.categoria_id], versiones)
      repo.registrarDescarga(doc.id); toast.success(msg)
    } catch (e) { toast.error('No se pudo descargar: ' + e.message) }
  }

  const totalBytes = filtrados.reduce((s, d) => s + (d.tamano_bytes || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="rd-panel rd-panel-c" style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
          <div>
            <h2 className="rd-tit">🗂️ Biblioteca documental</h2>
            <p className="rd-sub">{filtrados.length} de {activos.length} documentos · {formatearBytes(totalBytes)} en la selección actual</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Boton variante="gh" tamano="sm" icono="📗" onClick={() => toast.success(exportarExcel(filtrados, categorias))}>Excel</Boton>
            <Boton variante="gh" tamano="sm" icono="🧾" onClick={() => toast.success(exportarInventarioCSV(filtrados, categorias))}>CSV</Boton>
            {puedeCargar && <Boton tamano="sm" icono="📤" onClick={onIrCarga}>Subir documentos</Boton>}
          </div>
        </div>

        <div className="rd-barra">
          <div className="rd-campo" style={{ flex: '2 1 250px' }}>
            <label className="rd-lab">Buscar</label>
            <input className="rd-in" value={q} onChange={e => setQ(e.target.value)} placeholder="Título, etiqueta, planta, proveedor o archivo…" />
          </div>
          <div className="rd-campo" style={{ flex: '1 1 140px' }}>
            <label className="rd-lab">Categoría</label>
            <select className="rd-sel" value={cat} onChange={e => setCat(e.target.value)}>
              <option value="todas">Todas ({activos.length})</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.icono} {c.nombre} ({conteo[c.id] || 0})</option>)}
            </select>
          </div>
          <div className="rd-campo" style={{ flex: '1 1 112px' }}>
            <label className="rd-lab">Tipo</label>
            <select className="rd-sel" value={tipo} onChange={e => setTipo(e.target.value)}>
              <option value="todos">Todos</option>
              {['pdf', 'xlsx', 'docx', 'pptx', 'svg', 'zip', 'otro'].map(t => <option key={t} value={t}>{infoTipo(t).etiqueta}</option>)}
            </select>
          </div>
          <div className="rd-campo" style={{ flex: '1 1 120px' }}>
            <label className="rd-lab">Estado</label>
            <select className="rd-sel" value={estado} onChange={e => setEstado(e.target.value)}>
              <option value="todos">Todos</option><option value="vigentes">Vigentes</option><option value="obsoletos">Obsoletos</option>
            </select>
          </div>
          <div className="rd-campo" style={{ flex: '1 1 124px' }}>
            <label className="rd-lab">Planta</label>
            <select className="rd-sel" value={planta} onChange={e => setPlanta(e.target.value)}>
              <option value="todas">Todas</option>
              {(plantasDisp.length ? plantasDisp : catalogos.plantas).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          {provDisp.length > 0 && (
            <div className="rd-campo" style={{ flex: '1 1 130px' }}>
              <label className="rd-lab">Proveedor</label>
              <select className="rd-sel" value={proveedor} onChange={e => setProveedor(e.target.value)}>
                <option value="todos">Todos</option>
                {provDisp.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          )}
          <div className="rd-campo" style={{ flex: '1 1 140px' }}>
            <label className="rd-lab">Ordenar por</label>
            <select className="rd-sel" value={orden} onChange={e => setOrden(e.target.value)}>
              {ORDENES.map(o => <option key={o.v} value={o.v}>{o.t}</option>)}
            </select>
          </div>
          <div className="rd-campo" style={{ flex: '0 0 128px' }}>
            <label className="rd-lab">Tarjeta · {densidad}px</label>
            <input className="rd-rango" type="range" min="220" max="420" step="10" value={densidad} onChange={e => setDensidad(+e.target.value)} />
          </div>
          <div className="rd-campo" style={{ flex: '0 0 auto' }}>
            <label className="rd-lab">Destacados</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, height: 36 }}>
              <Interruptor activo={soloDestacados} onChange={setSoloDestacados} etiqueta="Solo destacados" />
              <span style={{ fontSize: 12, fontWeight: 700, color: soloDestacados ? PALETA.ambar : PALETA.suave }}>⭐</span>
            </div>
          </div>
          <div className="rd-campo" style={{ flex: '0 0 auto' }}>
            <label className="rd-lab">Vista</label>
            <Segmentado ariaLabel="Modo de vista" valor={vista} onChange={setVista}
              opciones={[{ v: 'tarjetas', t: '▦' }, { v: 'lista', t: '☰' }]} />
          </div>
          <div className="rd-campo" style={{ flex: '0 0 auto' }}>
            <label className="rd-lab">&nbsp;</label>
            <div style={{ display: 'flex', gap: 5 }}>
              <Boton tamano="sm" variante="gh" onClick={limpiar} disabled={!hayFiltros}>↺ Limpiar</Boton>
              <Boton tamano="sm" variante="gh" onClick={() => setGuardando(v => !v)} title="Guardar vista">💾</Boton>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 12 }}>
          <button className="rd-chip" onClick={() => setCat('todas')}
            style={cat === 'todas' ? { background: PALETA.tinta, color: '#fff', borderColor: PALETA.tinta } : undefined}>Todas</button>
          {categorias.map(c => {
            const on = cat === c.id
            return (
              <button key={c.id} className="rd-chip" onClick={() => setCat(on ? 'todas' : c.id)}
                style={on ? { background: c.color, color: '#fff', borderColor: c.color } : { borderColor: mezclarHex(c.color, .35), color: c.color }}>
                <span>{c.icono}</span>{c.nombre}<span style={{ opacity: .75 }}>{conteo[c.id] || 0}</span>
              </button>
            )
          })}
        </div>

        {(vistas.length > 0 || guardando) && (
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center', marginTop: 11, paddingTop: 11, borderTop: `1px dashed ${PALETA.borde}` }}>
            <span className="rd-lab">Vistas guardadas</span>
            {vistas.map(v => (
              <span key={v.id} className="rd-chip" style={{ borderColor: mezclarHex(PALETA.violeta, .35), color: PALETA.violeta }}>
                <button onClick={() => aplicarVista(v)} style={{ background: 'none', border: 'none', color: 'inherit', font: 'inherit', cursor: 'pointer', padding: 0 }}>🔖 {v.nombre}</button>
                <button onClick={() => borrarVista(v.id)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, opacity: .6 }}>✕</button>
              </span>
            ))}
            {guardando && (
              <>
                <input className="rd-in" style={{ width: 180, padding: '5px 9px', fontSize: 12 }} autoFocus value={nombreVista}
                  onChange={e => setNombreVista(e.target.value)} placeholder="Nombre de la vista…"
                  onKeyDown={e => { if (e.key === 'Enter') guardarVista(); if (e.key === 'Escape') setGuardando(false) }} />
                <Boton tamano="sm" variante="ok" onClick={guardarVista}>Guardar</Boton>
              </>
            )}
          </div>
        )}
      </div>

      {sel.length > 0 && (
        <div className="rd-lote">
          <Casilla marcada={todos} onChange={alternarTodos} titulo="Seleccionar todo" />
          <strong style={{ fontSize: 13 }}>{sel.length} seleccionado{sel.length > 1 ? 's' : ''}</strong>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginLeft: 'auto' }}>
            <Boton tamano="sm" variante="ok" onClick={() => { repo.marcarVigenteLote(sel, true); setSel([]) }}>✓ Vigentes</Boton>
            <Boton tamano="sm" variante="warn" onClick={() => { repo.marcarVigenteLote(sel, false); setSel([]) }}>⊘ Obsoletos</Boton>
            <select className="rd-sel" style={{ width: 168, padding: '6px 9px', fontSize: 12 }} value=""
              onChange={e => { if (e.target.value) { repo.reasignarCategoria(sel, e.target.value); setSel([]) } }}>
              <option value="">Reclasificar en…</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>)}
            </select>
            <Boton tamano="sm" variante="bad" onClick={() => { repo.archivar(sel); setSel([]) }}>🗑 Archivar</Boton>
            <Boton tamano="sm" variante="gh" onClick={() => setSel([])}>Cancelar</Boton>
          </div>
        </div>
      )}

      {cargando ? <Esqueleto filas={8} /> : filtrados.length === 0 ? (
        <div className="rd-panel">
          <Vacio icono={activos.length ? '🔍' : '📭'}
            titulo={activos.length ? 'Ningún documento coincide con los filtros' : 'El repositorio está vacío'}
            texto={activos.length
              ? 'Prueba con otro término, amplía la categoría o restablece los filtros para ver todo el inventario.'
              : 'Publica el primer procedimiento, ficha técnica o normativa para que las plantas puedan consultarlo desde aquí.'}
            accion={activos.length
              ? <Boton variante="gh" icono="↺" onClick={limpiar}>Restablecer filtros</Boton>
              : puedeCargar ? <Boton icono="📤" onClick={onIrCarga}>Subir el primer documento</Boton> : null} />
        </div>
      ) : vista === 'tarjetas' ? (
        <>
          <div className="rd-grid" style={{ gridTemplateColumns: `repeat(auto-fill,minmax(${densidad}px,1fr))` }}>
            {filtrados.slice(0, visibles).map((d, i) => {
              const c = mapaCat[d.categoria_id], color = c?.color || PALETA.suave, s = sel.includes(d.id)
              return (
                <div key={d.id} className={`rd-card ${s ? 'sel' : ''}`} style={{ '--cc': color, animationDelay: `${Math.min(i, 14) * .028}s` }}
                  onClick={() => onAbrir(d.id)} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') onAbrir(d.id) }}>
                  {d.destacado && <span className="rd-estrella">⭐</span>}
                  <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start', marginBottom: 10 }}>
                    <Casilla marcada={s} onChange={() => alternar(d.id)} titulo="Seleccionar" />
                    <IconoTipo tipo={d.tipo} />
                    <div style={{ minWidth: 0, flex: 1, paddingRight: d.destacado ? 18 : 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 800, lineHeight: 1.32, color: PALETA.tinta, marginBottom: 4 }}>{d.titulo}</div>
                      <span style={{ fontSize: 10.8, color: PALETA.suave, fontWeight: 600 }}>
                        {infoTipo(d.tipo).etiqueta} · {formatearBytes(d.tamano_bytes)} · {haceCuanto(d.created_at)}
                      </span>
                    </div>
                  </div>
                  <p style={{ margin: '0 0 10px', fontSize: 11.8, color: PALETA.suave, lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {d.descripcion || 'Sin descripción registrada.'}
                  </p>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
                    <Insignia color={color}>{c?.icono} {c?.nombre || 'Sin categoría'}</Insignia>
                    <Insignia color={d.vigente ? PALETA.exito : PALETA.suave}>v{d.version} · {d.vigente ? 'VIGENTE' : 'OBSOLETO'}</Insignia>
                    {d.planta && <Insignia color={PALETA.teal}>📍 {d.planta}</Insignia>}
                    {d.proveedor && <Insignia color={PALETA.magenta}>{d.proveedor}</Insignia>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 9, borderTop: `1px dashed ${PALETA.borde}` }}>
                    <span style={{ fontSize: 11, color: PALETA.suave, fontWeight: 700 }}>⬇ {d.descargas || 0}</span>
                    <span style={{ fontSize: 11, color: PALETA.suave }}>· {formatearFecha(d.created_at)}</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }} onClick={e => e.stopPropagation()}>
                      <Boton tamano="ico" variante="gh" title="Descargar" onClick={() => descargar(d)}>⬇</Boton>
                      <Boton tamano="ico" variante="gh" title={d.destacado ? 'Quitar destacado' : 'Destacar'} onClick={() => repo.alternarDestacado(d.id)}>{d.destacado ? '★' : '☆'}</Boton>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {filtrados.length > visibles && (
            <div style={{ textAlign: 'center' }}>
              <Boton variante="gh" onClick={() => setVisibles(v => v + 24)}>Cargar más · quedan {filtrados.length - visibles}</Boton>
            </div>
          )}
        </>
      ) : (
        <div className="rd-panel" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 14px', background: mezclarHex(PALETA.frio, .9), borderBottom: `1px solid ${PALETA.borde}` }}>
            <Casilla marcada={todos} onChange={alternarTodos} titulo="Seleccionar todo" />
            <span className="rd-lab">Seleccionar los {Math.min(visibles, filtrados.length)} visibles</span>
          </div>
          <div style={{ maxHeight: 640, overflowY: 'auto' }}>
            {filtrados.slice(0, visibles).map(d => {
              const c = mapaCat[d.categoria_id], s = sel.includes(d.id)
              return (
                <div key={d.id} className={`rd-fila ${s ? 'sel' : ''}`}
                  style={{ '--cc': c?.color || PALETA.suave, gridTemplateColumns: '20px 34px 1fr 132px 96px 88px 92px' }}
                  onClick={() => onAbrir(d.id)} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') onAbrir(d.id) }}>
                  <Casilla marcada={s} onChange={() => alternar(d.id)} titulo="Seleccionar" />
                  <IconoTipo tipo={d.tipo} tam={32} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: PALETA.tinta, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.destacado && '⭐ '}{d.titulo}
                    </div>
                    <div style={{ fontSize: 11, color: PALETA.suave, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.nombre_archivo}</div>
                  </div>
                  <Insignia color={c?.color || PALETA.suave}>{c?.icono} {c?.nombre || '—'}</Insignia>
                  <Insignia color={d.vigente ? PALETA.exito : PALETA.suave}>v{d.version}</Insignia>
                  <span style={{ fontSize: 11.5, color: PALETA.suave, fontWeight: 600 }}>{formatearBytes(d.tamano_bytes)}</span>
                  <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                    <Boton tamano="ico" variante="gh" title="Descargar" onClick={() => descargar(d)}>⬇</Boton>
                    <Boton tamano="ico" variante="gh" title="Abrir detalle" onClick={() => onAbrir(d.id)}>›</Boton>
                  </div>
                </div>
              )
            })}
          </div>
          {filtrados.length > visibles && (
            <div style={{ padding: 12, textAlign: 'center', borderTop: `1px solid ${PALETA.borde}` }}>
              <Boton variante="gh" tamano="sm" onClick={() => setVisibles(v => v + 24)}>Cargar más · quedan {filtrados.length - visibles}</Boton>
            </div>
          )}
        </div>
      )}
    </div>
  )
}