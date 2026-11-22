import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { PALETA, ACCIONES, normalizar, formatearFechaHora, haceCuanto, iniciales, mezclarHex } from './constantes'
import { Boton, Insignia, Vacio } from './base'
import { exportarAuditoriaCSV } from './descargas'

export default function AuditoriaDocumental({ repo, onAbrir }) {
  const { auditoria, documentos } = repo
  const [q, setQ] = useState('')
  const [accion, setAccion] = useState('todas')
  const [limite, setLimite] = useState(40)

  const acciones = useMemo(() => [...new Set(auditoria.map(a => a.accion))].sort(), [auditoria])
  const conteo = useMemo(() => { const m = {}; auditoria.forEach(a => { m[a.accion] = (m[a.accion] || 0) + 1 }); return m }, [auditoria])

  const filtrada = useMemo(() => {
    const term = normalizar(q)
    return auditoria.filter(a => {
      if (accion !== 'todas' && a.accion !== accion) return false
      return !term || normalizar(`${a.titulo} ${a.usuario} ${a.detalle}`).includes(term)
    })
  }, [auditoria, q, accion])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="rd-panel rd-panel-c">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <h2 className="rd-tit">🧭 Bitácora del repositorio</h2>
            <p className="rd-sub">Registro de publicaciones, cambios de vigencia, descargas y depuraciones, con usuario responsable y marca de tiempo.</p>
          </div>
          {filtrada.length > 0 && <Boton variante="gh" tamano="sm" icono="🧾" onClick={() => toast.success(exportarAuditoriaCSV(filtrada))}>Exportar CSV</Boton>}
        </div>
        <div className="rd-barra" style={{ marginTop: 14 }}>
          <div className="rd-campo" style={{ flex: '2 1 260px' }}>
            <label className="rd-lab">Buscar</label>
            <input className="rd-in" value={q} onChange={e => setQ(e.target.value)} placeholder="Documento, usuario o detalle…" />
          </div>
          <div className="rd-campo" style={{ flex: '1 1 180px' }}>
            <label className="rd-lab">Tipo de acción</label>
            <select className="rd-sel" value={accion} onChange={e => setAccion(e.target.value)}>
              <option value="todas">Todas ({auditoria.length})</option>
              {acciones.map(a => <option key={a} value={a}>{a} ({conteo[a]})</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 12 }}>
          {Object.entries(conteo).sort((a, b) => b[1] - a[1]).map(([a, n]) => (
            <button key={a} className="rd-chip" onClick={() => setAccion(accion === a ? 'todas' : a)}
              style={accion === a ? { background: ACCIONES[a] || PALETA.tinta, color: '#fff', borderColor: ACCIONES[a] || PALETA.tinta }
                : { color: ACCIONES[a] || PALETA.suave, borderColor: mezclarHex(ACCIONES[a] || PALETA.suave, .35) }}>
              {a} <span style={{ opacity: .75 }}>{n}</span>
            </button>
          ))}
        </div>
      </div>

      {filtrada.length === 0 ? (
        <div className="rd-panel"><Vacio icono="🧭" titulo="Sin movimientos registrados"
          texto="La bitácora se alimenta automáticamente con cada publicación, descarga o cambio de vigencia que ocurra en el repositorio." /></div>
      ) : (
        <div className="rd-panel" style={{ overflow: 'hidden' }}>
          <div style={{ maxHeight: 620, overflowY: 'auto' }}>
            <table className="rd-tabla">
              <thead><tr>
                <th style={{ width: 152 }}>Fecha y hora</th><th style={{ width: 128 }}>Acción</th>
                <th>Documento</th><th>Detalle</th><th style={{ width: 200 }}>Responsable</th>
              </tr></thead>
              <tbody>
                {filtrada.slice(0, limite).map(a => {
                  const vivo = documentos.some(d => d.id === a.documento_id && !d.eliminado)
                  return (
                    <tr key={a.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: PALETA.tinta, fontSize: 12 }}>{formatearFechaHora(a.created_at)}</div>
                        <div style={{ fontSize: 10.5, color: PALETA.suave }}>{haceCuanto(a.created_at)}</div>
                      </td>
                      <td><Insignia color={ACCIONES[a.accion] || PALETA.suave} solido>{a.accion}</Insignia></td>
                      <td>{vivo
                        ? <button onClick={() => onAbrir(a.documento_id)} style={{ background: 'none', border: 'none', padding: 0, color: PALETA.primario, fontWeight: 800, cursor: 'pointer', fontSize: 12.5, textAlign: 'left', textDecoration: 'underline' }}>{a.titulo}</button>
                        : <span style={{ fontWeight: 700, color: PALETA.suave }}>{a.titulo}</span>}</td>
                      <td style={{ color: PALETA.suave, fontSize: 12 }}>{a.detalle || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 26, height: 26, borderRadius: 8, display: 'grid', placeItems: 'center', fontSize: 10.5, fontWeight: 900, color: '#fff', background: `linear-gradient(135deg,${PALETA.primario},${PALETA.teal})`, flex: 'none' }}>{iniciales(a.usuario)}</span>
                          <span style={{ fontSize: 11.5, color: PALETA.texto, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.usuario || '—'}</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {filtrada.length > limite && (
            <div style={{ padding: 12, textAlign: 'center', borderTop: `1px solid ${PALETA.borde}` }}>
              <Boton variante="gh" tamano="sm" onClick={() => setLimite(l => l + 40)}>Ver más · quedan {filtrada.length - limite}</Boton>
            </div>
          )}
        </div>
      )}
    </div>
  )
}