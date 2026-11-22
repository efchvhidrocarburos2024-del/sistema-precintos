import { useMemo } from 'react'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend, LabelList } from 'recharts'
import { PALETA, COLORES_SERIE, CAPACIDAD_BYTES, mezclarHex, infoTipo, formatearBytes, haceCuanto } from './constantes'
import { Boton, Insignia, Vacio, Barra } from './base'
import { exportarRespaldoJSON, exportarExcel } from './descargas'

export default function PanelEstadisticas({ repo, onAbrir }) {
  const { documentos, categorias, versiones, auditoria } = repo
  const activos = useMemo(() => documentos.filter(d => !d.eliminado), [documentos])

  const kpis = useMemo(() => ({
    total: activos.length,
    vigentes: activos.filter(d => d.vigente).length,
    obsoletos: activos.filter(d => !d.vigente).length,
    bytes: activos.reduce((s, d) => s + (d.tamano_bytes || 0), 0),
    descargas: activos.reduce((s, d) => s + (d.descargas || 0), 0),
    destacados: activos.filter(d => d.destacado).length,
    versiones: versiones.length,
  }), [activos, versiones])

  const porCategoria = useMemo(() => categorias.map((c, i) => ({
    nombre: c.nombre,
    cantidad: activos.filter(d => d.categoria_id === c.id).length,
    bytes: activos.filter(d => d.categoria_id === c.id).reduce((s, d) => s + (d.tamano_bytes || 0), 0),
    color: c.color || COLORES_SERIE[i % COLORES_SERIE.length],
  })).filter(x => x.cantidad > 0).sort((a, b) => b.cantidad - a.cantidad), [categorias, activos])

  const porTipo = useMemo(() => {
    const m = {}
    activos.forEach(d => { m[d.tipo] = (m[d.tipo] || 0) + 1 })
    return Object.entries(m).map(([tipo, cantidad]) => ({ nombre: infoTipo(tipo).etiqueta, cantidad, color: infoTipo(tipo).color }))
      .sort((a, b) => b.cantidad - a.cantidad)
  }, [activos])

  const serie = useMemo(() => {
    const meses = []
    for (let i = 5; i >= 0; i--) {
      const f = new Date(); f.setDate(1); f.setMonth(f.getMonth() - i)
      meses.push({ clave: `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`, etiqueta: f.toLocaleDateString('es-PE', { month: 'short' }), publicaciones: 0, descargas: 0 })
    }
    const idx = Object.fromEntries(meses.map((m, i) => [m.clave, i]))
    activos.forEach(d => {
      const f = new Date(d.created_at)
      const k = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`
      if (k in idx) { meses[idx[k]].publicaciones++; meses[idx[k]].descargas += d.descargas || 0 }
    })
    return meses
  }, [activos])

  const top = useMemo(() => [...activos].sort((a, b) => (b.descargas || 0) - (a.descargas || 0)).slice(0, 6), [activos])
  const recientes = useMemo(() => [...activos].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5), [activos])
  const mapaCat = useMemo(() => Object.fromEntries(categorias.map(c => [c.id, c])), [categorias])
  const usoPct = Math.min(100, (kpis.bytes / CAPACIDAD_BYTES) * 100)

  if (!activos.length) {
    return <div className="rd-panel"><Vacio icono="📊" titulo="Sin datos para analizar"
      texto="Las métricas del repositorio se construyen a partir de los documentos publicados. Publica el primer documento para activar los indicadores." /></div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="rd-panel rd-panel-c">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <h2 className="rd-tit">📊 Inteligencia del repositorio</h2>
            <p className="rd-sub">Distribución del acervo, consumo por categoría y ritmo de publicación de los últimos seis meses.</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Boton variante="gh" tamano="sm" icono="📗" onClick={() => toast.success(exportarExcel(activos, categorias))}>Inventario Excel</Boton>
            <Boton variante="gh" tamano="sm" icono="🗄️" onClick={() => toast.success(exportarRespaldoJSON({ documentos, categorias, versiones, auditoria }))}>Respaldo completo</Boton>
          </div>
        </div>
      </div>

      <div className="rd-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(196px,1fr))' }}>
        <Kpi t="Documentos activos" v={kpis.total} s={`${kpis.destacados} destacados`} g={[PALETA.primario, PALETA.teal]} i="🗂️" d={0} />
        <Kpi t="Vigentes" v={kpis.vigentes} s={`${kpis.obsoletos} obsoletos`} g={['#059669', PALETA.lima]} i="✅" d={.05} />
        <Kpi t="Almacenamiento" v={formatearBytes(kpis.bytes)} s={`${usoPct.toFixed(1)}% de 512 MB`} g={[PALETA.ambar, '#D97706']} i="💾" d={.1} />
        <Kpi t="Descargas" v={kpis.descargas} s={`${kpis.versiones} versiones publicadas`} g={[PALETA.magenta, PALETA.violeta]} i="⬇️" d={.15} />
      </div>

      <div className="rd-panel rd-panel-c">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9, flexWrap: 'wrap', gap: 8 }}>
          <span className="rd-lab">Ocupación del repositorio</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: PALETA.tinta }}>{formatearBytes(kpis.bytes)} / 512 MB</span>
        </div>
        <div style={{ height: 12, borderRadius: 99, background: PALETA.frio, overflow: 'hidden', border: `1px solid ${PALETA.borde}`, display: 'flex' }}>
          {porCategoria.map(c => (
            <div key={c.nombre} title={`${c.nombre}: ${formatearBytes(c.bytes)}`} style={{ width: `${(c.bytes / CAPACIDAD_BYTES) * 100}%`, background: c.color, transition: 'width .6s' }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', marginTop: 10 }}>
          {porCategoria.map(c => (
            <span key={c.nombre} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: PALETA.suave, fontWeight: 700 }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: c.color }} />{c.nombre} · {formatearBytes(c.bytes)}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 14 }}>
        <div className="rd-panel rd-panel-c">
          <h3 className="rd-tit" style={{ fontSize: 15, marginBottom: 14 }}>Documentos por categoría</h3>
          <div style={{ height: 292 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porCategoria} layout="vertical" margin={{ left: 6, right: 34, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 4" horizontal={false} stroke={PALETA.borde} />
                <XAxis type="number" tick={{ fontSize: 11, fill: PALETA.suave }} allowDecimals={false} />
                <YAxis type="category" dataKey="nombre" width={104} tick={{ fontSize: 11, fill: PALETA.texto, fontWeight: 700 }} />
                <Tooltip cursor={{ fill: mezclarHex(PALETA.cyan, .08) }} contentStyle={{ borderRadius: 11, border: `1px solid ${PALETA.borde}`, fontSize: 12 }}
                  formatter={(v, n, p) => [`${v} documentos · ${formatearBytes(p.payload.bytes)}`, p.payload.nombre]} />
                <Bar dataKey="cantidad" radius={[0, 7, 7, 0]} barSize={19}>
                  {porCategoria.map((c, i) => <Cell key={i} fill={c.color} />)}
                  <LabelList dataKey="cantidad" position="right" style={{ fontSize: 11, fontWeight: 800, fill: PALETA.tinta }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rd-panel rd-panel-c">
          <h3 className="rd-tit" style={{ fontSize: 15, marginBottom: 14 }}>Composición por formato</h3>
          <div style={{ height: 292 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={porTipo} dataKey="cantidad" nameKey="nombre" cx="50%" cy="46%" innerRadius={58} outerRadius={94} paddingAngle={3} stroke="#fff" strokeWidth={2}>
                  {porTipo.map((t, i) => <Cell key={i} fill={t.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 11, border: `1px solid ${PALETA.borde}`, fontSize: 12 }} formatter={(v, n) => [`${v} archivos`, n]} />
                <Legend verticalAlign="bottom" height={40} wrapperStyle={{ fontSize: 11.5, fontWeight: 700 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rd-panel rd-panel-c">
        <h3 className="rd-tit" style={{ fontSize: 15, marginBottom: 14 }}>Ritmo de publicación y consumo · últimos 6 meses</h3>
        <div style={{ height: 268 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={serie} margin={{ left: 0, right: 12, top: 6, bottom: 4 }}>
              <defs>
                <linearGradient id="rdPub" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={PALETA.cyan} stopOpacity={.65} /><stop offset="100%" stopColor={PALETA.cyan} stopOpacity={.05} /></linearGradient>
                <linearGradient id="rdDes" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={PALETA.ambar} stopOpacity={.6} /><stop offset="100%" stopColor={PALETA.ambar} stopOpacity={.05} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 4" stroke={PALETA.borde} vertical={false} />
              <XAxis dataKey="etiqueta" tick={{ fontSize: 11, fill: PALETA.suave }} />
              <YAxis tick={{ fontSize: 11, fill: PALETA.suave }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 11, border: `1px solid ${PALETA.borde}`, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11.5, fontWeight: 700 }} />
              <Area type="monotone" dataKey="publicaciones" name="Publicaciones" stroke={PALETA.teal} strokeWidth={2.5} fill="url(#rdPub)" />
              <Area type="monotone" dataKey="descargas" name="Descargas" stroke={PALETA.ambar} strokeWidth={2.5} fill="url(#rdDes)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 14 }}>
        <div className="rd-panel rd-panel-c">
          <h3 className="rd-tit" style={{ fontSize: 15, marginBottom: 12 }}>🔥 Más consultados</h3>
          {top.map((d, i) => (
            <button key={d.id} onClick={() => onAbrir(d.id)} style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '9px 8px', borderRadius: 10, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: i < top.length - 1 ? `1px dashed ${PALETA.borde}` : 'none' }}>
              <span style={{ width: 24, height: 24, borderRadius: 7, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 900, color: '#fff', background: COLORES_SERIE[i % COLORES_SERIE.length], flex: 'none' }}>{i + 1}</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 700, color: PALETA.tinta, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.titulo}</span>
              <Insignia color={PALETA.magenta}>⬇ {d.descargas || 0}</Insignia>
            </button>
          ))}
        </div>
        <div className="rd-panel rd-panel-c">
          <h3 className="rd-tit" style={{ fontSize: 15, marginBottom: 12 }}>🆕 Publicaciones recientes</h3>
          {recientes.map((d, i) => {
            const c = mapaCat[d.categoria_id]
            return (
              <button key={d.id} onClick={() => onAbrir(d.id)} style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '9px 8px', borderRadius: 10, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: i < recientes.length - 1 ? `1px dashed ${PALETA.borde}` : 'none' }}>
                <span style={{ fontSize: 18, flex: 'none' }}>{infoTipo(d.tipo).icono}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: PALETA.tinta, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.titulo}</span>
                  <span style={{ fontSize: 11, color: PALETA.suave }}>{c?.nombre || 'Sin categoría'} · {haceCuanto(d.created_at)}</span>
                </span>
                <Insignia color={c?.color || PALETA.suave}>v{d.version}</Insignia>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Kpi({ t, v, s, g, i, d }) {
  return (
    <div className="rd-kpi" style={{ background: `linear-gradient(135deg,${g[0]},${g[1]})`, animationDelay: `${d}s`, boxShadow: `0 18px 36px -24px ${g[0]}` }}>
      <div style={{ position: 'absolute', right: 14, top: 12, fontSize: 22, opacity: .55 }}>{i}</div>
      <div className="rd-kpi-l">{t}</div>
      <div className="rd-kpi-v">{v}</div>
      <div className="rd-kpi-s">{s}</div>
    </div>
  )
}