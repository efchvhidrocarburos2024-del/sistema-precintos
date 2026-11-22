import { useMemo, useState } from 'react'
import { PALETA, mezclarHex, normalizar, formatearBytes, haceCuanto, RETENCION_PAPELERA_DIAS } from './constantes'
import { Boton, Insignia, IconoTipo, Casilla, Vacio } from './base'

export default function PapeleraDocumental({ repo, onConfirmar, puedeEliminar }) {
  const { documentos, categorias, restaurar, eliminarDefinitivo } = repo
  const [q, setQ] = useState('')
  const [sel, setSel] = useState([])
  const mapaCat = useMemo(() => Object.fromEntries(categorias.map(c => [c.id, c])), [categorias])

  const papelera = useMemo(() => {
    const term = normalizar(q)
    return documentos.filter(d => d.eliminado)
      .filter(d => !term || normalizar(`${d.titulo} ${d.nombre_archivo}`).includes(term))
      .sort((a, b) => new Date(b.eliminado_en || 0) - new Date(a.eliminado_en || 0))
  }, [documentos, q])

  const dias = d => d.eliminado_en
    ? Math.max(0, RETENCION_PAPELERA_DIAS - Math.floor((Date.now() - new Date(d.eliminado_en).getTime()) / 86400000))
    : RETENCION_PAPELERA_DIAS

  const alternar = id => setSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  const todos = papelera.length > 0 && papelera.every(d => sel.includes(d.id))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="rd-panel rd-panel-c">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <h2 className="rd-tit">🗑️ Papelera de reciclaje</h2>
            <p className="rd-sub">Los documentos archivados se conservan {RETENCION_PAPELERA_DIAS} días antes de su depuración definitiva. Restaurar devuelve el documento a la biblioteca con su historial de versiones intacto.</p>
          </div>
          {papelera.length > 0 && puedeEliminar && (
            <Boton variante="bad" icono="🔥" onClick={() => onConfirmar({
              titulo: 'Vaciar la papelera', icono: '🔥',
              mensaje: `Se eliminarán definitivamente ${papelera.length} documento(s) y todas sus versiones. Esta acción no puede deshacerse.`,
              textoConfirmar: 'Eliminar todo definitivamente',
              onConfirmar: () => { eliminarDefinitivo(papelera.map(d => d.id)); setSel([]) },
            })}>Vaciar papelera</Boton>
          )}
        </div>
        <div className="rd-barra" style={{ marginTop: 14 }}>
          <div className="rd-campo" style={{ flex: '1 1 300px' }}>
            <label className="rd-lab">Buscar en la papelera</label>
            <input className="rd-in" value={q} onChange={e => setQ(e.target.value)} placeholder="Título o nombre de archivo…" />
          </div>
        </div>
      </div>

      {sel.length > 0 && (
        <div className="rd-lote">
          <Casilla marcada={todos} onChange={() => setSel(todos ? [] : papelera.map(d => d.id))} titulo="Seleccionar todo" />
          <strong style={{ fontSize: 13 }}>{sel.length} seleccionado{sel.length > 1 ? 's' : ''}</strong>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <Boton tamano="sm" variante="ok" icono="↩" onClick={() => { restaurar(sel); setSel([]) }}>Restaurar</Boton>
            {puedeEliminar && <Boton tamano="sm" variante="bad" onClick={() => onConfirmar({
              titulo: 'Eliminar definitivamente', icono: '⚠️',
              mensaje: `${sel.length} documento(s) y sus versiones se borrarán de forma irreversible.`,
              textoConfirmar: 'Eliminar definitivamente', onConfirmar: () => { eliminarDefinitivo(sel); setSel([]) },
            })}>Eliminar para siempre</Boton>}
            <Boton tamano="sm" variante="gh" onClick={() => setSel([])}>Cancelar</Boton>
          </div>
        </div>
      )}

      {papelera.length === 0 ? (
        <div className="rd-panel"><Vacio icono="♻️" titulo="La papelera está vacía"
          texto="Ningún documento ha sido archivado. Cuando envíes documentos a la papelera aparecerán aquí con su cuenta regresiva de retención." /></div>
      ) : (
        <div className="rd-panel" style={{ overflow: 'hidden' }}>
          {papelera.map(d => {
            const c = mapaCat[d.categoria_id], dr = dias(d), urgente = dr <= 7
            return (
              <div key={d.id} className={`rd-fila ${sel.includes(d.id) ? 'sel' : ''}`}
                style={{ '--cc': c?.color || PALETA.suave, gridTemplateColumns: '20px 34px 1fr 140px 132px 190px', cursor: 'default' }}>
                <Casilla marcada={sel.includes(d.id)} onChange={() => alternar(d.id)} titulo="Seleccionar" />
                <IconoTipo tipo={d.tipo} tam={32} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: PALETA.tinta, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.titulo}</div>
                  <div style={{ fontSize: 11, color: PALETA.suave }}>{d.nombre_archivo} · {formatearBytes(d.tamano_bytes)} · archivado {haceCuanto(d.eliminado_en)}</div>
                </div>
                <Insignia color={c?.color || PALETA.suave}>{c?.icono} {c?.nombre || 'Sin categoría'}</Insignia>
                <Insignia color={urgente ? PALETA.rojo : PALETA.ambar}>{dr === 0 ? 'Depuración inminente' : `${dr} día${dr !== 1 ? 's' : ''} restantes`}</Insignia>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <Boton tamano="sm" variante="ok" icono="↩" onClick={() => restaurar(d.id)}>Restaurar</Boton>
                  {puedeEliminar && <Boton tamano="ico" variante="gh" title="Eliminar definitivamente"
                    style={{ color: PALETA.rojo, borderColor: mezclarHex(PALETA.rojo, .3) }}
                    onClick={() => onConfirmar({
                      titulo: 'Eliminar definitivamente', icono: '⚠️',
                      mensaje: `"${d.titulo}" y todas sus versiones se borrarán de forma irreversible.`,
                      textoConfirmar: 'Eliminar definitivamente', onConfirmar: () => eliminarDefinitivo(d.id),
                    })}>🗑</Boton>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}