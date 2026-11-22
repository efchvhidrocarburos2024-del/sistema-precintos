import { useState, useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import { PALETA, mezclarHex, infoTipo, formatearBytes, formatearFecha, formatearFechaHora, haceCuanto } from './constantes'
import { PLANO_PID_SVG } from './datos'
import { Boton, Insignia, MetaLinea } from './base'
import { descargarDocumento } from './descargas'

const sugerir = (v) => {
  const p = String(v || '1.0').split('.')
  const n = parseInt(p[p.length - 1], 10)
  if (!Number.isFinite(n)) return `${v}.1`
  p[p.length - 1] = String(n + 1); return p.join('.')
}

export default function DetalleDocumento({ doc, repo, onCerrar, onConfirmar, puedeGestionar }) {
  const { categorias, versiones, catalogos, actualizarDocumento, agregarVersion, alternarVigente, alternarDestacado, archivar, registrarDescarga } = repo
  const [tab, setTab] = useState('ficha')
  const [editando, setEditando] = useState(false)
  const [b, setB] = useState(null)
  const [tagTmp, setTagTmp] = useState('')
  const [nv, setNv] = useState({ version: '', nota: '', archivo: null })

  useEffect(() => {
    if (!doc) return
    setTab('ficha'); setEditando(false); setB(null)
    setNv({ version: sugerir(doc.version), nota: '', archivo: null })
  }, [doc?.id])

  useEffect(() => {
    const esc = e => { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onCerrar])

  const historial = useMemo(() => versiones.filter(v => v.documento_id === doc?.id)
    .sort((a, c) => new Date(c.created_at) - new Date(a.created_at)), [versiones, doc?.id])

  if (!doc) return null
  const cat = categorias.find(c => c.id === doc.categoria_id)
  const color = cat?.color || PALETA.suave
  const t = infoTipo(doc.tipo)

  const iniciar = () => {
    setB({ titulo: doc.titulo, descripcion: doc.descripcion || '', categoria_id: doc.categoria_id || '',
      planta: doc.planta || '', proveedor: doc.proveedor || '', producto: doc.producto || '', etiquetas: [...(doc.etiquetas || [])] })
    setEditando(true)
  }
  const guardar = () => {
    if (!b.titulo.trim()) return toast.error('El título no puede quedar vacío')
    actualizarDocumento(doc.id, {
      titulo: b.titulo.trim(), descripcion: b.descripcion.trim(), categoria_id: b.categoria_id || null,
      planta: b.planta || null, proveedor: b.proveedor || null, producto: b.producto || null, etiquetas: b.etiquetas,
    })
    setEditando(false)
  }
  const descargar = async () => {
    try { const m = await descargarDocumento(doc, cat, versiones); registrarDescarga(doc.id); toast.success(m) }
    catch (e) { toast.error('No se pudo descargar: ' + e.message) }
  }
  const publicarVersion = async () => {
    if (!nv.version.trim()) return toast.error('Indica el número de versión')
    await agregarVersion(doc.id, nv)
    setNv({ version: sugerir(nv.version), nota: '', archivo: null })
    setTab('versiones')
  }

  return (
    <>
      <div className="rd-scrim" onClick={onCerrar} />
      <aside className="rd-drawer" role="dialog" aria-modal="true" aria-label="Detalle del documento">
        <div className="rd-drawer-top">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ width: 46, height: 46, borderRadius: 13, display: 'grid', placeItems: 'center', fontSize: 22, background: 'rgba(255,255,255,.16)', border: '1px solid rgba(255,255,255,.24)', flex: 'none' }}>{t.icono}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10.5, letterSpacing: 1, textTransform: 'uppercase', opacity: .78, fontWeight: 800, marginBottom: 3 }}>
                {cat?.icono} {cat?.nombre || 'Sin categoría'}
              </div>
              <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 900, lineHeight: 1.3 }}>{doc.titulo}</h3>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                <Insignia color={doc.vigente ? PALETA.lima : '#94A3B8'} solido>v{doc.version} · {doc.vigente ? 'VIGENTE' : 'OBSOLETO'}</Insignia>
                {doc.destacado && <Insignia color={PALETA.ambar} solido>⭐ Destacado</Insignia>}
                {doc.planta && <Insignia color="#fff" style={{ background: 'rgba(255,255,255,.18)', color: '#fff', borderColor: 'rgba(255,255,255,.3)' }}>📍 {doc.planta}</Insignia>}
              </div>
            </div>
            <button onClick={onCerrar} aria-label="Cerrar" style={{ background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.25)', color: '#fff', borderRadius: 9, width: 32, height: 32, cursor: 'pointer', fontSize: 15, flex: 'none' }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: 5, marginTop: 14 }}>
            {[['ficha', '📋 Ficha'], ['vista', '👁 Vista previa'], ['versiones', `🕘 Versiones (${historial.length})`]].map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} style={{ padding: '7px 12px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 800,
                background: tab === k ? '#fff' : 'rgba(255,255,255,.14)', color: tab === k ? PALETA.primario : '#E6F1F8' }}>{l}</button>
            ))}
          </div>
        </div>

        <div className="rd-drawer-body">
          {tab === 'ficha' && (editando ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="rd-campo"><label className="rd-lab">Título</label>
                <input className="rd-in" value={b.titulo} onChange={e => setB({ ...b, titulo: e.target.value })} /></div>
              <div className="rd-campo"><label className="rd-lab">Descripción</label>
                <textarea className="rd-in" rows={4} value={b.descripcion} onChange={e => setB({ ...b, descripcion: e.target.value })} style={{ resize: 'vertical' }} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
                <div className="rd-campo"><label className="rd-lab">Categoría</label>
                  <select className="rd-sel" value={b.categoria_id} onChange={e => setB({ ...b, categoria_id: e.target.value })}>
                    <option value="">Sin categoría</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>)}
                  </select></div>
                <div className="rd-campo"><label className="rd-lab">Planta</label>
                  <select className="rd-sel" value={b.planta} onChange={e => setB({ ...b, planta: e.target.value })}>
                    <option value="">Todas</option>
                    {catalogos.plantas.map(p => <option key={p} value={p}>{p}</option>)}
                  </select></div>
                <div className="rd-campo"><label className="rd-lab">Proveedor</label>
                  <select className="rd-sel" value={b.proveedor} onChange={e => setB({ ...b, proveedor: e.target.value })}>
                    <option value="">No aplica</option>
                    {catalogos.proveedores.map(p => <option key={p} value={p}>{p}</option>)}
                  </select></div>
                <div className="rd-campo"><label className="rd-lab">Producto</label>
                  <select className="rd-sel" value={b.producto} onChange={e => setB({ ...b, producto: e.target.value })}>
                    <option value="">No aplica</option>
                    {catalogos.productos.map(p => <option key={p} value={p}>{p}</option>)}
                  </select></div>
              </div>
              <div className="rd-campo"><label className="rd-lab">Etiquetas</label>
                <input className="rd-in" value={tagTmp} onChange={e => setTagTmp(e.target.value)} placeholder="Añadir y pulsar Enter"
                  onKeyDown={e => {
                    if (e.key !== 'Enter') return
                    e.preventDefault()
                    const v = tagTmp.trim().toLowerCase()
                    if (v && !b.etiquetas.includes(v)) setB({ ...b, etiquetas: [...b.etiquetas, v].slice(0, 8) })
                    setTagTmp('')
                  }} />
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 7 }}>
                  {b.etiquetas.map(tag => (
                    <span key={tag} className="rd-tag">#{tag}
                      <button onClick={() => setB({ ...b, etiquetas: b.etiquetas.filter(x => x !== tag) })}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, opacity: .65 }}>✕</button>
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 9, justifyContent: 'flex-end' }}>
                <Boton variante="gh" onClick={() => setEditando(false)}>Cancelar</Boton>
                <Boton variante="ok" icono="💾" onClick={guardar}>Guardar cambios</Boton>
              </div>
            </div>
          ) : (
            <>
              <div style={{ padding: 14, borderRadius: 13, background: mezclarHex(color, .07), border: `1px solid ${mezclarHex(color, .25)}`, marginBottom: 15 }}>
                <div className="rd-lab" style={{ marginBottom: 6 }}>Alcance del documento</div>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: PALETA.texto }}>
                  {doc.descripcion || 'Este documento aún no tiene descripción registrada. Edítalo para indicar a qué unidades aplica y cuándo consultarse.'}
                </p>
              </div>
              <div style={{ marginBottom: 15 }}>
                <MetaLinea etiqueta="Archivo" valor={doc.nombre_archivo} />
                <MetaLinea etiqueta="Tipo" valor={`${t.icono} ${t.etiqueta}`} />
                <MetaLinea etiqueta="Tamaño" valor={formatearBytes(doc.tamano_bytes)} />
                <MetaLinea etiqueta="Versión vigente" valor={`v${doc.version}`} />
                <MetaLinea etiqueta="Planta / Terminal" valor={doc.planta || 'Todas'} />
                <MetaLinea etiqueta="Proveedor" valor={doc.proveedor || '—'} />
                <MetaLinea etiqueta="Producto" valor={doc.producto || '—'} />
                <MetaLinea etiqueta="Publicado" valor={`${formatearFecha(doc.created_at)} · ${haceCuanto(doc.created_at)}`} />
                <MetaLinea etiqueta="Actualizado" valor={formatearFechaHora(doc.actualizado_en)} />
                <MetaLinea etiqueta="Responsable" valor={doc.subido_por_nombre || doc.subido_por || '—'} />
                <MetaLinea etiqueta="Descargas" valor={`${doc.descargas || 0} registradas`} />
                <MetaLinea etiqueta="Origen" valor={doc.url_archivo ? 'Supabase Storage' : 'Ficha controlada'} />
              </div>
              {(doc.etiquetas || []).length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div className="rd-lab" style={{ marginBottom: 7 }}>Etiquetas</div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>{doc.etiquetas.map(t => <span key={t} className="rd-tag">#{t}</span>)}</div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Boton icono="⬇" onClick={descargar}>Descargar</Boton>
                {puedeGestionar && <Boton variante="gh" icono="✎" onClick={iniciar}>Editar ficha</Boton>}
                {puedeGestionar && <Boton variante={doc.vigente ? 'warn' : 'ok'} icono={doc.vigente ? '⊘' : '✓'} onClick={() => alternarVigente(doc.id)}>
                  {doc.vigente ? 'Marcar obsoleto' : 'Marcar vigente'}</Boton>}
                <Boton variante="gh" icono={doc.destacado ? '★' : '☆'} onClick={() => alternarDestacado(doc.id)}>
                  {doc.destacado ? 'Quitar destacado' : 'Destacar'}</Boton>
                {puedeGestionar && <Boton variante="bad" icono="🗑" onClick={() => onConfirmar({
                  titulo: 'Enviar a la papelera', icono: '🗑️',
                  mensaje: `"${doc.titulo}" se moverá a la papelera. Podrás restaurarlo o deshacer desde la notificación.`,
                  textoConfirmar: 'Enviar a la papelera', onConfirmar: () => { archivar(doc.id); onCerrar() },
                })}>Archivar</Boton>}
              </div>
            </>
          ))}

          {tab === 'vista' && (
            <div className="rd-prev">
              {doc.tipo === 'svg' ? (
                <div style={{ padding: 10, background: PALETA.tinta }}
                  dangerouslySetInnerHTML={{ __html: PLANO_PID_SVG.replace('<svg', '<svg style="width:100%;height:auto;display:block"') }} />
              ) : doc.url_archivo && doc.tipo === 'pdf' ? (
                <object data={doc.url_archivo} type="application/pdf" style={{ width: '100%', height: 520 }}>
                  <div style={{ padding: 26, textAlign: 'center' }}>
                    <p style={{ fontSize: 13, color: PALETA.suave, marginBottom: 12 }}>Tu navegador no puede incrustar el PDF.</p>
                    <Boton icono="⬇" onClick={descargar}>Descargar para abrirlo</Boton>
                  </div>
                </object>
              ) : (
                <div style={{ padding: 22 }}>
                  <div style={{ background: '#fff', borderRadius: 10, border: `1px solid ${PALETA.borde}`, overflow: 'hidden', boxShadow: '0 14px 30px -24px rgba(6,42,61,.8)' }}>
                    <div style={{ background: `linear-gradient(100deg,${PALETA.tinta},${PALETA.profundo})`, color: '#fff', padding: '14px 16px' }}>
                      <div style={{ fontSize: 9.5, letterSpacing: 1.2, textTransform: 'uppercase', opacity: .8, fontWeight: 800 }}>Documento controlado</div>
                      <div style={{ fontSize: 15, fontWeight: 900, marginTop: 4 }}>{doc.titulo}</div>
                    </div>
                    <div style={{ padding: 16 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                        {[['Categoría', cat?.nombre || '—'], ['Versión', `v${doc.version}`], ['Estado', doc.vigente ? 'VIGENTE' : 'OBSOLETO'], ['Ámbito', doc.planta || 'Todas las plantas']]
                          .map(([k, v]) => (
                            <div key={k} style={{ padding: '8px 10px', borderRadius: 8, background: PALETA.frio }}>
                              <div style={{ fontSize: 9.5, letterSpacing: .8, textTransform: 'uppercase', color: PALETA.suave, fontWeight: 800 }}>{k}</div>
                              <div style={{ fontSize: 12.5, fontWeight: 800, color: PALETA.tinta, marginTop: 2 }}>{v}</div>
                            </div>
                          ))}
                      </div>
                      <div className="rd-lab" style={{ marginBottom: 5 }}>Contenido declarado</div>
                      <p style={{ margin: '0 0 14px', fontSize: 12.5, lineHeight: 1.7, color: PALETA.texto }}>{doc.descripcion || 'Sin descripción registrada.'}</p>
                      <div style={{ borderTop: `1px dashed ${PALETA.borde}`, paddingTop: 11, fontSize: 11, color: PALETA.suave, lineHeight: 1.6 }}>
                        La vista previa reproduce la ficha controlada del repositorio. El archivo original ({doc.nombre_archivo}, {formatearBytes(doc.tamano_bytes)}) se entrega íntegro al descargarlo.
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 14, textAlign: 'center' }}><Boton icono="⬇" onClick={descargar}>Descargar documento completo</Boton></div>
                </div>
              )}
            </div>
          )}

          {tab === 'versiones' && (
            <>
              {puedeGestionar && (
                <div style={{ padding: 14, borderRadius: 13, background: mezclarHex(PALETA.lima, .09), border: `1px solid ${mezclarHex(PALETA.lima, .3)}`, marginBottom: 17 }}>
                  <div className="rd-lab" style={{ marginBottom: 9 }}>Publicar nueva versión</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 9, marginBottom: 9 }}>
                    <input className="rd-in" value={nv.version} onChange={e => setNv({ ...nv, version: e.target.value })} placeholder="3.3" />
                    <input className="rd-in" value={nv.nota} onChange={e => setNv({ ...nv, nota: e.target.value })} placeholder="Nota de cambio: qué se modificó y por qué" />
                  </div>
                  <div style={{ display: 'flex', gap: 9, alignItems: 'center', flexWrap: 'wrap' }}>
                    <label style={{ flex: 1, minWidth: 180 }}>
                      <input type="file" hidden onChange={e => setNv({ ...nv, archivo: e.target.files?.[0] || null })} />
                      <span className="rd-btn rd-b-gh rd-b-sm" style={{ display: 'inline-flex', cursor: 'pointer' }}>
                        📎 {nv.archivo ? nv.archivo.name : 'Adjuntar archivo (opcional)'}
                      </span>
                    </label>
                    <Boton tamano="sm" variante="ok" icono="🚀" onClick={publicarVersion}>Publicar versión</Boton>
                  </div>
                </div>
              )}
              {historial.length === 0 ? (
                <p style={{ fontSize: 13, color: PALETA.suave, textAlign: 'center', padding: '24px 0' }}>Aún no hay versiones registradas para este documento.</p>
              ) : (
                <div className="rd-linea-tiempo">
                  {historial.map((v, i) => (
                    <div key={v.id} style={{ position: 'relative', paddingBottom: 17 }}>
                      <span className={`rd-punto ${i === 0 ? 'first' : ''}`} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 4 }}>
                        <Insignia color={i === 0 ? PALETA.exito : PALETA.teal} solido={i === 0}>v{v.version}</Insignia>
                        {i === 0 && <Insignia color={PALETA.lima}>ACTUAL</Insignia>}
                        <span style={{ fontSize: 11, color: PALETA.suave, fontWeight: 600 }}>{formatearFechaHora(v.created_at)}</span>
                      </div>
                      <p style={{ margin: '0 0 4px', fontSize: 12.5, color: PALETA.texto, lineHeight: 1.55 }}>{v.nota || 'Sin nota de cambio.'}</p>
                      <div style={{ fontSize: 11, color: PALETA.suave }}>{v.subido_por || '—'} · {formatearBytes(v.tamano_bytes)} · {v.nombre_archivo}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  )
}