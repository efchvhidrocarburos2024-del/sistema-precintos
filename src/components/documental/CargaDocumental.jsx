import { useState, useRef, useCallback, useMemo } from 'react'
import toast from 'react-hot-toast'
import { PALETA, mezclarHex, LIMITE_BYTES, tipoDesdeNombre, infoTipo, formatearBytes, uid, tiposDeCategoria, buscarTipo } from './constantes'
import { Boton, Insignia, IconoTipo, Vacio, Barra } from './base'

const nuevaFila = (archivo) => ({
  clave: uid(), archivo,
  titulo: archivo.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim(),
  descripcion: '', version: '1.0', etiquetas: [],
  error: archivo.size > LIMITE_BYTES ? 'Supera el límite de 25 MB' : '',
})

const CLAVES_COLUMNA = ['planta', 'proveedor', 'producto']

export default function CargaDocumental({ repo, onPublicado, puedeCargar }) {
  const { categorias, catalogos, crearDocumentos, progreso } = repo
  const [filas, setFilas] = useState([])
  const [arrastrando, setArrastrando] = useState(false)
  const [categoria, setCategoria] = useState(categorias[0]?.id || '')
  const [tipoCont, setTipoCont] = useState('')
  const [meta, setMeta] = useState({})
  const [planta, setPlanta] = useState('')
  const [proveedor, setProveedor] = useState('')
  const [producto, setProducto] = useState('')
  const [vigente, setVigente] = useState(true)
  const [tagTmp, setTagTmp] = useState('')
  const inputRef = useRef(null)

  const tipos = useMemo(() => tiposDeCategoria(categoria), [categoria])
  const tipoActivo = useMemo(() => buscarTipo(categoria, tipoCont), [categoria, tipoCont])
  const cubierto = useCallback(
    clave => !!tipoActivo?.campos?.some(c => c.clave === clave),
    [tipoActivo],
  )

  const cambiarCategoria = (v) => { setCategoria(v); setTipoCont(''); setMeta({}) }
  const cambiarTipo = (v) => { setTipoCont(v); setMeta({}) }

  const agregar = useCallback((lista) => {
    const validos = Array.from(lista || [])
    if (!validos.length) return
    const nuevos = validos.map(nuevaFila)
    setFilas(p => [...p, ...nuevos])
    const malos = nuevos.filter(f => f.error).length
    if (malos) toast.error(`${malos} archivo(s) superan 25 MB`)
    toast.success(`${validos.length} archivo${validos.length > 1 ? 's' : ''} en cola`)
  }, [])

  const patch = (clave, cambios) => setFilas(p => p.map(f => f.clave === clave ? { ...f, ...cambios } : f))
  const quitar = clave => setFilas(p => p.filter(f => f.clave !== clave))

  const addTag = (clave, fila) => {
    const t = tagTmp.trim().toLowerCase()
    if (!t) return
    if (!fila.etiquetas.includes(t)) patch(clave, { etiquetas: [...fila.etiquetas, t].slice(0, 8) })
    setTagTmp('')
  }

  const publicar = async () => {
    const validas = filas.filter(f => !f.error && f.titulo.trim())
    if (!validas.length) return toast.error('Agrega al menos un archivo con título válido')
    if (!categoria) return toast.error('Selecciona la categoría del lote')
    if (tipos.length && !tipoCont) return toast.error('Selecciona el tipo de documento')

    await crearDocumentos(validas.map(f => ({
      archivo: f.archivo, titulo: f.titulo, descripcion: f.descripcion, version: f.version,
      etiquetas: f.etiquetas, categoria_id: categoria,
      tipo_contenido: tipoCont || null,
      metadata: { ...meta },
      planta: planta || null, proveedor: proveedor || null, producto: producto || null, vigente,
    })))
    setFilas([]); setMeta({})
    onPublicado?.()
  }

  const renderCampo = (campo) => {
    const dis = !!progreso
    switch (campo.tipo) {
      case 'select-planta':
        return (
          <select className="rd-sel" value={planta} onChange={e => setPlanta(e.target.value)} disabled={dis}>
            <option value="">Selecciona…</option>
            {catalogos.plantas.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        )
      case 'select-proveedor':
        return (
          <select className="rd-sel" value={proveedor} onChange={e => setProveedor(e.target.value)} disabled={dis}>
            <option value="">Selecciona…</option>
            {catalogos.proveedores.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        )
      case 'select-producto':
        return (
          <select className="rd-sel" value={producto} onChange={e => setProducto(e.target.value)} disabled={dis}>
            <option value="">Selecciona…</option>
            {catalogos.productos.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        )
      case 'fecha':
        return (
          <input type="date" className="rd-in" value={meta[campo.clave] || ''} disabled={dis}
            onChange={e => setMeta(m => ({ ...m, [campo.clave]: e.target.value }))} />
        )
      default:
        return (
          <input className="rd-in" value={meta[campo.clave] || ''} placeholder={campo.etiqueta} disabled={dis}
            onChange={e => setMeta(m => ({ ...m, [campo.clave]: e.target.value }))} />
        )
    }
  }

  if (!puedeCargar) {
    return <div className="rd-panel"><Vacio icono="🔒" titulo="Publicación restringida"
      texto="Tu rol permite consultar y descargar documentos, pero no publicar nuevas versiones." /></div>
  }

  const totalBytes = filas.reduce((s, f) => s + (f.archivo?.size || 0), 0)
  const validas = filas.filter(f => !f.error).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="rd-panel rd-panel-c">
        <h2 className="rd-tit">📤 Publicar documentos</h2>
        <p className="rd-sub">Selecciona categoría y tipo de documento: el formulario habilita los campos que ese tipo exige. PDF, Excel, Word, planos y paquetes de hasta 25 MB por archivo.</p>

        <div className="rd-barra" style={{ marginTop: 15 }}>
          <div className="rd-campo" style={{ flex: '1 1 200px' }}>
            <label className="rd-lab">Categoría del lote *</label>
            <select className="rd-sel" value={categoria} onChange={e => cambiarCategoria(e.target.value)}>
              <option value="">Selecciona…</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>)}
            </select>
          </div>

          {tipos.length > 0 && (
            <div className="rd-campo" style={{ flex: '1 1 240px' }}>
              <label className="rd-lab">Tipo de documento *</label>
              <select className="rd-sel" value={tipoCont} onChange={e => cambiarTipo(e.target.value)}>
                <option value="">Selecciona…</option>
                {tipos.map(t => <option key={t.id} value={t.id}>{t.icono} {t.nombre}</option>)}
              </select>
            </div>
          )}

          {!cubierto('planta') && (
            <div className="rd-campo" style={{ flex: '1 1 160px' }}>
              <label className="rd-lab">Planta / Terminal</label>
              <select className="rd-sel" value={planta} onChange={e => setPlanta(e.target.value)}>
                <option value="">Todas las plantas</option>
                {catalogos.plantas.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          )}
          {!cubierto('proveedor') && (
            <div className="rd-campo" style={{ flex: '1 1 160px' }}>
              <label className="rd-lab">Proveedor</label>
              <select className="rd-sel" value={proveedor} onChange={e => setProveedor(e.target.value)}>
                <option value="">No aplica</option>
                {catalogos.proveedores.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          )}
          {!cubierto('producto') && (
            <div className="rd-campo" style={{ flex: '1 1 170px' }}>
              <label className="rd-lab">Producto</label>
              <select className="rd-sel" value={producto} onChange={e => setProducto(e.target.value)}>
                <option value="">No aplica</option>
                {catalogos.productos.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          )}

          <div className="rd-campo" style={{ flex: '0 0 auto' }}>
            <label className="rd-lab">Estado inicial</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <Boton tamano="sm" variante={vigente ? 'ok' : 'gh'} onClick={() => setVigente(true)}>✓ Vigente</Boton>
              <Boton tamano="sm" variante={!vigente ? 'warn' : 'gh'} onClick={() => setVigente(false)}>⊘ Obsoleto</Boton>
            </div>
          </div>
        </div>

        {tipoActivo && (
          <div style={{ marginTop: 14, padding: 14, borderRadius: 13, background: mezclarHex(PALETA.cyan, .07), border: `1px solid ${mezclarHex(PALETA.cyan, .3)}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
              <span style={{ fontSize: 20 }}>{tipoActivo.icono}</span>
              <strong style={{ fontSize: 13.5, color: PALETA.tinta }}>{tipoActivo.nombre}</strong>
              <Insignia color={PALETA.cyan}>campos obligatorios del tipo</Insignia>
            </div>
            <p style={{ margin: '0 0 12px', fontSize: 12, color: PALETA.suave, lineHeight: 1.55 }}>{tipoActivo.descripcion}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 11 }}>
              {tipoActivo.campos.map(campo => (
                <div className="rd-campo" key={campo.clave}>
                  <label className="rd-lab">{campo.etiqueta} <span style={{ color: PALETA.rojo }}>*</span></label>
                  {renderCampo(campo)}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={`rd-drop ${arrastrando ? 'on' : ''}`} style={{ marginTop: 15 }}
          onDragOver={e => { e.preventDefault(); setArrastrando(true) }} onDragLeave={() => setArrastrando(false)}
          onDrop={e => { e.preventDefault(); setArrastrando(false); agregar(e.dataTransfer.files) }}
          onClick={() => inputRef.current?.click()} role="button" tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter') inputRef.current?.click() }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>{arrastrando ? '📥' : '🗃️'}</div>
          <div style={{ fontSize: 15.5, fontWeight: 900, color: PALETA.tinta, marginBottom: 5 }}>
            {arrastrando ? 'Suelta los archivos para añadirlos a la cola' : 'Arrastra aquí los documentos'}
          </div>
          <div style={{ fontSize: 12.5, color: PALETA.suave }}>
            o <span style={{ color: PALETA.primario, fontWeight: 800, textDecoration: 'underline' }}>selecciónalos desde tu equipo</span> · PDF · XLSX · DOCX · SVG · ZIP
          </div>
          <input ref={inputRef} type="file" multiple hidden
            accept=".pdf,.xlsx,.xls,.csv,.docx,.doc,.pptx,.ppt,.svg,.dwg,.dxf,.zip,.rar,.7z,.txt"
            onChange={e => { agregar(e.target.files); e.target.value = '' }} />
        </div>
      </div>

      {progreso && (
        <div className="rd-panel rd-panel-c" style={{ background: `linear-gradient(100deg,${mezclarHex(PALETA.cyan, .1)},${mezclarHex(PALETA.lima, .1)})` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 9 }}>
            <span className="rd-spin" style={{ borderColor: mezclarHex(PALETA.primario, .3), borderTopColor: PALETA.primario }} />
            <strong style={{ fontSize: 13.5, color: PALETA.tinta }}>Publicando {progreso.actual} de {progreso.total} · {progreso.nombre}</strong>
          </div>
          <Barra valor={progreso.actual} max={progreso.total} color={PALETA.primario} />
        </div>
      )}

      {filas.length > 0 && (
        <>
          <div className="rd-lote">
            <strong style={{ fontSize: 13 }}>🧾 {filas.length} en cola · {validas} listo{validas !== 1 ? 's' : ''} · {formatearBytes(totalBytes)}</strong>
            {tipoActivo && <Insignia color={PALETA.cyan} solido>{tipoActivo.icono} {tipoActivo.nombre}</Insignia>}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <Boton tamano="sm" variante="gh" onClick={() => setFilas([])} disabled={!!progreso}>Vaciar cola</Boton>
              <Boton tamano="sm" variante="ok" icono="🚀" onClick={publicar} disabled={!!progreso || !validas}>
                {progreso ? 'Publicando…' : `Publicar ${validas}`}
              </Boton>
            </div>
          </div>

          {filas.map((f, i) => {
            const t = tipoDesdeNombre(f.archivo.name)
            return (
              <div key={f.clave} className="rd-panel rd-panel-c" style={{ animationDelay: `${i * .04}s`, borderColor: f.error ? mezclarHex(PALETA.rojo, .5) : PALETA.borde }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 13 }}>
                  <IconoTipo tipo={t} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: PALETA.tinta, wordBreak: 'break-all' }}>{f.archivo.name}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 5 }}>
                      <Insignia color={infoTipo(t).color}>{infoTipo(t).etiqueta}</Insignia>
                      <Insignia color={PALETA.teal}>{formatearBytes(f.archivo.size)}</Insignia>
                      {f.error && <Insignia color={PALETA.rojo} solido>⚠ {f.error}</Insignia>}
                    </div>
                  </div>
                  <Boton tamano="ico" variante="gh" title="Quitar" onClick={() => quitar(f.clave)} disabled={!!progreso}>✕</Boton>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 11 }}>
                  <div className="rd-campo" style={{ gridColumn: '1 / -1' }}>
                    <label className="rd-lab">Título del documento *</label>
                    <input className="rd-in" value={f.titulo} onChange={e => patch(f.clave, { titulo: e.target.value })} disabled={!!progreso} />
                  </div>
                  <div className="rd-campo" style={{ gridColumn: '1 / -1' }}>
                    <label className="rd-lab">Descripción / alcance</label>
                    <textarea className="rd-in" rows={2} value={f.descripcion} onChange={e => patch(f.clave, { descripcion: e.target.value })}
                      placeholder="Qué contiene, a qué unidades aplica y cuándo consultarse." style={{ resize: 'vertical' }} disabled={!!progreso} />
                  </div>
                  <div className="rd-campo">
                    <label className="rd-lab">Versión</label>
                    <input className="rd-in" value={f.version} onChange={e => patch(f.clave, { version: e.target.value })} disabled={!!progreso} />
                  </div>
                  <div className="rd-campo" style={{ gridColumn: 'span 2' }}>
                    <label className="rd-lab">Etiquetas (Enter para añadir)</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input className="rd-in" value={tagTmp} onChange={e => setTagTmp(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(f.clave, f) } }}
                        placeholder="scop, precintos, callao…" disabled={!!progreso} />
                      <Boton tamano="sm" variante="gh" onClick={() => addTag(f.clave, f)} disabled={!!progreso}>+</Boton>
                    </div>
                    {f.etiquetas.length > 0 && (
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                        {f.etiquetas.map(tag => (
                          <span key={tag} className="rd-tag">#{tag}
                            <button onClick={() => patch(f.clave, { etiquetas: f.etiquetas.filter(x => x !== tag) })}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, opacity: .65 }}>✕</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </>
      )}

      {filas.length === 0 && !progreso && (
        <div className="rd-panel"><Vacio icono="📋" titulo="Cola de publicación vacía"
          texto="Los archivos que arrastres aparecerán aquí con su ficha editable. El tipo de documento elegido define los campos obligatorios de cada ficha." /></div>
      )}
    </div>
  )
}