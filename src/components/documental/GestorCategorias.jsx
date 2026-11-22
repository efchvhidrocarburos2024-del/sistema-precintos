import { useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { PALETA, COLORES_SERIE, ICONOS_DISPONIBLES, mezclarHex } from './constantes'
import { Boton, Insignia, Modal, Vacio } from './base'

const VACIO = { nombre: '', color: COLORES_SERIE[0], icono: '📄', descripcion: '' }

export default function GestorCategorias({ repo, onVerCategoria, puedeGestionar }) {
  const { categorias, documentos, crearCategoria, actualizarCategoria, eliminarCategoria, reordenarCategorias } = repo
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(VACIO)
  const [drag, setDrag] = useState(null)
  const [sobre, setSobre] = useState(null)
  const [borrando, setBorrando] = useState(null)
  const [destino, setDestino] = useState('')

  const conteo = useMemo(() => {
    const m = {}
    documentos.filter(d => !d.eliminado).forEach(d => { m[d.categoria_id] = (m[d.categoria_id] || 0) + 1 })
    return m
  }, [documentos])

  const abrirNueva = () => { setForm({ ...VACIO, color: COLORES_SERIE[categorias.length % COLORES_SERIE.length] }); setEditando('nueva') }
  const abrirEdicion = c => { setForm({ nombre: c.nombre, color: c.color, icono: c.icono, descripcion: c.descripcion || '' }); setEditando(c.id) }

  const guardar = async () => {
    if (!form.nombre.trim()) return toast.error('La categoría necesita un nombre')
    if (editando === 'nueva') await crearCategoria(form)
    else await actualizarCategoria(editando, form)
    setEditando(null)
  }

  const confirmarBorrado = async () => {
    const n = conteo[borrando.id] || 0
    if (n && !destino) return toast.error('Selecciona la categoría que heredará los documentos')
    await eliminarCategoria(borrando.id, destino || null)
    setBorrando(null); setDestino('')
  }

  const soltar = i => {
    if (drag === null || drag === i) { setDrag(null); setSobre(null); return }
    reordenarCategorias(drag, i); setDrag(null); setSobre(null)
    toast.success('Orden de categorías actualizado')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="rd-panel rd-panel-c">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <h2 className="rd-tit">🏷️ Categorías del repositorio</h2>
            <p className="rd-sub">La taxonomía define cómo navegan las plantas. Arrastra las tarjetas para reordenar la prioridad de consulta. Cada categoría conserva su color e ícono en tarjetas, filtros y reportes.</p>
          </div>
          {puedeGestionar && <Boton icono="＋" onClick={abrirNueva}>Nueva categoría</Boton>}
        </div>
      </div>

      {categorias.length === 0 ? (
        <div className="rd-panel"><Vacio icono="🏷️" titulo="Todavía no hay categorías"
          texto="Crea la primera categoría para organizar los documentos por naturaleza: técnicos, operativos, normativa o seguridad."
          accion={puedeGestionar ? <Boton icono="＋" onClick={abrirNueva}>Crear categoría</Boton> : null} /></div>
      ) : (
        <div className="rd-grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(276px,1fr))' }}>
          {categorias.map((c, i) => {
            const n = conteo[c.id] || 0
            return (
              <div key={c.id} className={`rd-cat-card ${drag === i ? 'drag' : ''} ${sobre === i ? 'over' : ''}`}
                style={{ animationDelay: `${i * .035}s`, borderColor: mezclarHex(c.color, .35) }}
                draggable={puedeGestionar} onDragStart={() => setDrag(i)}
                onDragOver={e => { e.preventDefault(); setSobre(i) }}
                onDragLeave={() => setSobre(s => s === i ? null : s)}
                onDrop={() => soltar(i)} onDragEnd={() => { setDrag(null); setSobre(null) }}>
                <div style={{ position: 'absolute', inset: '0 auto 0 0', width: 5, background: c.color, borderRadius: '16px 0 0 16px' }} />
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ width: 46, height: 46, borderRadius: 13, display: 'grid', placeItems: 'center', fontSize: 22, flex: 'none', background: mezclarHex(c.color, .14), border: `1.5px solid ${mezclarHex(c.color, .3)}` }}>{c.icono}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 900, color: PALETA.tinta }}>{c.nombre}</div>
                    <div style={{ display: 'flex', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
                      <Insignia color={c.color}>{n} documento{n !== 1 ? 's' : ''}</Insignia>
                      <Insignia color={PALETA.suave}>#{c.orden}</Insignia>
                    </div>
                  </div>
                  {puedeGestionar && <span style={{ cursor: 'grab', color: PALETA.suave, fontSize: 16 }} title="Arrastra para reordenar">⠿</span>}
                </div>
                <p style={{ margin: '0 0 12px', fontSize: 12, color: PALETA.suave, lineHeight: 1.6, minHeight: 38 }}>{c.descripcion || 'Sin descripción registrada.'}</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 10, borderTop: `1px dashed ${PALETA.borde}` }}>
                  <Boton tamano="sm" variante="gh" onClick={() => onVerCategoria(c.id)}>Ver documentos</Boton>
                  {puedeGestionar && <Boton tamano="sm" variante="gh" icono="✎" onClick={() => abrirEdicion(c)}>Editar</Boton>}
                  {puedeGestionar && <Boton tamano="sm" variante="gh" icono="🗑" onClick={() => { setBorrando(c); setDestino('') }}
                    style={{ color: PALETA.rojo, borderColor: mezclarHex(PALETA.rojo, .3) }}>Eliminar</Boton>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal abierto={!!editando} onCerrar={() => setEditando(null)} titulo={editando === 'nueva' ? 'Nueva categoría' : 'Editar categoría'} icono="🏷️" ancho={520}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 13, borderRadius: 12, background: mezclarHex(form.color, .09), border: `1px solid ${mezclarHex(form.color, .3)}` }}>
            <div style={{ width: 48, height: 48, borderRadius: 13, display: 'grid', placeItems: 'center', fontSize: 24, background: '#fff', border: `2px solid ${form.color}` }}>{form.icono}</div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 900, color: PALETA.tinta }}>{form.nombre || 'Nombre de la categoría'}</div>
              <div style={{ fontSize: 11.5, color: PALETA.suave }}>Vista previa en la biblioteca</div>
            </div>
          </div>
          <div className="rd-campo"><label className="rd-lab">Nombre *</label>
            <input className="rd-in" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Metrología" autoFocus /></div>
          <div className="rd-campo"><label className="rd-lab">Descripción</label>
            <textarea className="rd-in" rows={2} value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Qué tipo de documentos agrupa." style={{ resize: 'vertical' }} /></div>
          <div className="rd-campo"><label className="rd-lab">Color identificador</label>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {COLORES_SERIE.map(col => (
                <button key={col} onClick={() => setForm({ ...form, color: col })} title={col}
                  style={{ width: 32, height: 32, borderRadius: 9, background: col, cursor: 'pointer',
                    border: form.color === col ? `3px solid ${PALETA.tinta}` : '2px solid #fff',
                    boxShadow: form.color === col ? `0 0 0 2px ${col}` : '0 2px 6px rgba(6,42,61,.2)' }} />
              ))}
              <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} title="Color personalizado"
                style={{ width: 32, height: 32, borderRadius: 9, border: `2px solid ${PALETA.borde}`, cursor: 'pointer', padding: 0, background: '#fff' }} />
            </div></div>
          <div className="rd-campo"><label className="rd-lab">Ícono</label>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {ICONOS_DISPONIBLES.map(ic => (
                <button key={ic} onClick={() => setForm({ ...form, icono: ic })}
                  style={{ width: 34, height: 34, borderRadius: 9, fontSize: 17, cursor: 'pointer',
                    background: form.icono === ic ? mezclarHex(form.color, .18) : '#fff',
                    border: form.icono === ic ? `2px solid ${form.color}` : `1.5px solid ${PALETA.borde}` }}>{ic}</button>
              ))}
            </div></div>
          <div style={{ display: 'flex', gap: 9, justifyContent: 'flex-end' }}>
            <Boton variante="gh" onClick={() => setEditando(null)}>Cancelar</Boton>
            <Boton variante="ok" icono="💾" onClick={guardar}>{editando === 'nueva' ? 'Crear categoría' : 'Guardar cambios'}</Boton>
          </div>
        </div>
      </Modal>

      <Modal abierto={!!borrando} onCerrar={() => setBorrando(null)} titulo="Eliminar categoría" icono="🗑️">
        {borrando && (
          <>
            <p style={{ margin: '0 0 14px', fontSize: 13.5, color: PALETA.suave, lineHeight: 1.65 }}>
              Vas a eliminar <strong style={{ color: PALETA.tinta }}>{borrando.icono} {borrando.nombre}</strong>.
              {conteo[borrando.id] ? ` Contiene ${conteo[borrando.id]} documento(s) activos que deben reasignarse antes de continuar.` : ' No contiene documentos activos, puede eliminarse directamente.'}
            </p>
            {!!conteo[borrando.id] && (
              <div className="rd-campo" style={{ marginBottom: 16 }}>
                <label className="rd-lab">Reasignar los documentos a</label>
                <select className="rd-sel" value={destino} onChange={e => setDestino(e.target.value)}>
                  <option value="">Selecciona la categoría destino…</option>
                  {categorias.filter(c => c.id !== borrando.id).map(c => <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>)}
                </select>
              </div>
            )}
            <div style={{ display: 'flex', gap: 9, justifyContent: 'flex-end' }}>
              <Boton variante="gh" onClick={() => setBorrando(null)}>Cancelar</Boton>
              <Boton variante="bad" onClick={confirmarBorrado}>Eliminar categoría</Boton>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}