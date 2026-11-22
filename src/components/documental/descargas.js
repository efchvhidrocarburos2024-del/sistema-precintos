// ============================================================================
//  SIGMO · Repositorio Documental · Descargas y exportaciones reales
//  Cada función produce un archivo auténtico. Ninguna ruta queda vacía.
// ============================================================================
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import {
  infoTipo, formatearBytes, formatearFecha, formatearFechaHora, normalizar,
} from './constantes'
import { PLANO_PID_SVG } from './datos'

const RGB = {
  tinta: [6, 42, 61], profundo: [10, 58, 82], primario: [11, 95, 165],
  teal: [14, 116, 144], cyan: [6, 182, 212], ambar: [245, 158, 11],
  lima: [132, 204, 22], magenta: [219, 39, 119], exito: [16, 185, 129],
  rojo: [239, 68, 68], texto: [15, 34, 51], suave: [90, 113, 132],
  linea: [216, 227, 236], blanco: [255, 255, 255],
}

const hexARgb = (hex) => {
  const h = String(hex || '').replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const n = parseInt(full, 16)
  return Number.isNaN(n) ? RGB.primario : [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const guardarBlob = (blob, nombre) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export const nombreSalida = (doc, ext) => {
  const base = normalizar(doc?.titulo || 'documento')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 70) || 'documento'
  const v = String(doc?.version || '1.0').replace(/[^a-zA-Z0-9.]/g, '')
  return `${base}_v${v}.${ext}`
}

const filasAtributos = (doc, categoria) => [
  ['Categoría', categoria ? `${categoria.nombre}` : 'Sin categoría'],
  ['Tipo de archivo', infoTipo(doc.tipo).etiqueta],
  ['Nombre de archivo', doc.nombre_archivo],
  ['Versión vigente', `v${doc.version}`],
  ['Estado', doc.vigente ? 'VIGENTE' : 'OBSOLETO'],
  ['Ámbito / Planta', doc.planta || 'Todas las plantas'],
  ['Proveedor', doc.proveedor || '—'],
  ['Producto', doc.producto || '—'],
  ['Etiquetas', (doc.etiquetas || []).join(', ') || '—'],
  ['Tamaño', formatearBytes(doc.tamano_bytes)],
  ['Publicado', formatearFechaHora(doc.created_at)],
  ['Última actualización', formatearFechaHora(doc.actualizado_en)],
  ['Responsable', doc.subido_por_nombre || doc.subido_por || '—'],
  ['Descargas registradas', String(doc.descargas || 0)],
]

/** Ficha documental controlada en PDF, con banda de categoría e historial. */
export function exportarFichaPDF(doc, categoria, versiones = []) {
  const pdf = new jsPDF()
  const colorCat = hexARgb(categoria?.color)

  pdf.setFillColor(...RGB.tinta); pdf.rect(0, 0, 210, 32, 'F')
  pdf.setFillColor(...colorCat); pdf.rect(0, 32, 210, 2.6, 'F')
  pdf.setTextColor(...RGB.blanco); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(17)
  pdf.text('FICHA DOCUMENTAL CONTROLADA', 14, 15)
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9.5)
  pdf.setTextColor(191, 226, 240)
  pdf.text('SIGMO · Repositorio Documental · HIDROMUNDO S.A.C.', 14, 24)

  pdf.setTextColor(...RGB.tinta); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14)
  pdf.text(pdf.splitTextToSize(doc.titulo, 182), 14, 47)

  const estadoY = 47 + Math.ceil(pdf.splitTextToSize(doc.titulo, 182).length) * 6
  pdf.setFontSize(9); pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(...(doc.vigente ? RGB.exito : RGB.suave))
  pdf.text(doc.vigente ? '● VIGENTE' : '● OBSOLETO', 14, estadoY)
  pdf.setTextColor(...RGB.suave); pdf.setFont('helvetica', 'normal')
  pdf.text(`v${doc.version}`, 46, estadoY)

  autoTable(pdf, {
    startY: estadoY + 6,
    theme: 'grid',
    head: [['ATRIBUTO', 'VALOR']],
    body: filasAtributos(doc, categoria),
    headStyles: { fillColor: colorCat, fontSize: 9, textColor: RGB.blanco },
    bodyStyles: { fontSize: 9.5, cellPadding: 3.4, textColor: RGB.texto },
    alternateRowStyles: { fillColor: [246, 250, 252] },
    columnStyles: { 0: { cellWidth: 52, fontStyle: 'bold', textColor: RGB.suave } },
  })

  let y = pdf.lastAutoTable.finalY + 12
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.setTextColor(...RGB.primario)
  pdf.text('ALCANCE DEL DOCUMENTO', 14, y); y += 6
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9.5); pdf.setTextColor(60, 78, 92)
  const alcance = pdf.splitTextToSize(doc.descripcion || 'Sin descripción registrada.', 182)
  pdf.text(alcance, 14, y)
  y += alcance.length * 4.8 + 12

  const vs = versiones.filter(v => v.documento_id === doc.id)
  if (vs.length) {
    if (y > 232) { pdf.addPage(); y = 22 }
    autoTable(pdf, {
      startY: y, theme: 'striped',
      head: [['VERSIÓN', 'FECHA', 'NOTA DE CAMBIO', 'RESPONSABLE']],
      body: vs.map(v => [
        `v${v.version}`, formatearFecha(v.created_at), v.nota || '—', v.subido_por || '—',
      ]),
      headStyles: { fillColor: RGB.teal, fontSize: 8.5, textColor: RGB.blanco },
      bodyStyles: { fontSize: 8.5, cellPadding: 3 },
      columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 28 }, 3: { cellWidth: 46 } },
    })
    y = pdf.lastAutoTable.finalY + 10
  }

  const pieY = Math.min(280, Math.max(y + 8, 268))
  pdf.setDrawColor(...RGB.linea); pdf.setLineWidth(.4); pdf.line(14, pieY, 196, pieY)
  pdf.setFontSize(7.8); pdf.setTextColor(...RGB.suave); pdf.setFont('helvetica', 'italic')
  pdf.text('Documento controlado. La copia impresa se considera no vigente salvo sello de emisión.', 14, pieY + 6)
  pdf.text(`Emitido por SIGMO el ${formatearFechaHora(new Date().toISOString())}`, 14, pieY + 11)

  pdf.save(nombreSalida(doc, 'pdf'))
  return 'Ficha documental PDF generada'
}

/** Ficha en Excel con dos hojas: atributos e historial de versiones. */
export function exportarFichaExcel(doc, categoria, versiones = []) {
  const wb = XLSX.utils.book_new()

  const wsAtr = XLSX.utils.aoa_to_sheet([
    ['FICHA DOCUMENTAL CONTROLADA'],
    ['SIGMO · Repositorio Documental · HIDROMUNDO S.A.C.'],
    [],
    ['TÍTULO', doc.titulo],
    ...filasAtributos(doc, categoria).map(([k, v]) => [k.toUpperCase(), v]),
    [],
    ['ALCANCE', doc.descripcion || 'Sin descripción registrada.'],
  ])
  wsAtr['!cols'] = [{ wch: 26 }, { wch: 82 }]
  wsAtr['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }]
  XLSX.utils.book_append_sheet(wb, wsAtr, 'Ficha')

  const vs = versiones.filter(v => v.documento_id === doc.id)
  const wsVer = XLSX.utils.aoa_to_sheet([
    ['VERSIÓN', 'FECHA', 'NOTA DE CAMBIO', 'ARCHIVO', 'TAMAÑO', 'RESPONSABLE'],
    ...(vs.length
      ? vs.map(v => [`v${v.version}`, formatearFecha(v.created_at), v.nota || '', v.nombre_archivo || '', formatearBytes(v.tamano_bytes), v.subido_por || ''])
      : [['—', '—', 'Sin versiones registradas', '—', '—', '—']]),
  ])
  wsVer['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 60 }, { wch: 38 }, { wch: 12 }, { wch: 36 }]
  XLSX.utils.book_append_sheet(wb, wsVer, 'Versiones')

  XLSX.writeFile(wb, nombreSalida(doc, 'xlsx'))
  return 'Ficha Excel generada con historial de versiones'
}

/**
 * Descarga el documento. Si hay archivo real en Storage lo entrega íntegro;
 * si no, emite la ficha controlada en el formato que corresponda.
 * @returns {string} mensaje para el toast
 */
export async function descargarDocumento(doc, categoria, versiones = []) {
  if (!doc) throw new Error('Documento no disponible')

  if (doc.tipo === 'svg') {
    guardarBlob(new Blob([PLANO_PID_SVG], { type: 'image/svg+xml;charset=utf-8' }), nombreSalida(doc, 'svg'))
    return 'Plano P&ID exportado en SVG'
  }

  if (doc.url_archivo) {
    const a = document.createElement('a')
    a.href = doc.url_archivo
    a.download = doc.nombre_archivo || nombreSalida(doc, 'pdf')
    a.target = '_blank'
    a.rel = 'noopener'
    document.body.appendChild(a); a.click(); a.remove()
    return 'Archivo original descargado'
  }

  if (doc.tipo === 'xlsx') return exportarFichaExcel(doc, categoria, versiones)
  return exportarFichaPDF(doc, categoria, versiones)
}

const CAB_INVENTARIO = [
  'Título', 'Categoría', 'Tipo', 'Versión', 'Estado', 'Planta', 'Proveedor',
  'Producto', 'Etiquetas', 'Tamaño (bytes)', 'Descargas', 'Publicado',
  'Responsable', 'Archivo',
]

const filaInventario = (d, mapa) => [
  d.titulo,
  mapa[d.categoria_id]?.nombre || 'Sin categoría',
  infoTipo(d.tipo).etiqueta,
  d.version,
  d.vigente ? 'VIGENTE' : 'OBSOLETO',
  d.planta || 'Todas',
  d.proveedor || '—',
  d.producto || '—',
  (d.etiquetas || []).join(' | '),
  d.tamano_bytes || 0,
  d.descargas || 0,
  formatearFecha(d.created_at),
  d.subido_por_nombre || d.subido_por || '',
  d.nombre_archivo,
]

export function exportarInventarioCSV(documentos, categorias) {
  const mapa = Object.fromEntries(categorias.map(c => [c.id, c]))
  const csv = [CAB_INVENTARIO, ...documentos.map(d => filaInventario(d, mapa))]
    .map(f => f.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';'))
    .join('\r\n')
  guardarBlob(
    new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }),
    `Inventario_Documental_${new Date().toISOString().slice(0, 10)}.csv`,
  )
  return `${documentos.length} documentos exportados a CSV`
}

export function exportarExcel(documentos, categorias) {
  const mapa = Object.fromEntries(categorias.map(c => [c.id, c]))
  const datos = documentos.map(d => {
    const f = filaInventario(d, mapa)
    return Object.fromEntries(CAB_INVENTARIO.map((k, i) => [k, f[i]]))
  })
  const ws = XLSX.utils.json_to_sheet(datos, { header: CAB_INVENTARIO })
  ws['!cols'] = [
    { wch: 48 }, { wch: 18 }, { wch: 10 }, { wch: 11 }, { wch: 12 }, { wch: 14 },
    { wch: 18 }, { wch: 22 }, { wch: 34 }, { wch: 14 }, { wch: 11 }, { wch: 16 },
    { wch: 36 }, { wch: 38 },
  ]
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: datos.length, c: CAB_INVENTARIO.length - 1 } }) }

  const resumen = categorias.map(c => ({
    'Categoría': c.nombre,
    'Documentos': documentos.filter(d => d.categoria_id === c.id).length,
    'Vigentes': documentos.filter(d => d.categoria_id === c.id && d.vigente).length,
    'Obsoletos': documentos.filter(d => d.categoria_id === c.id && !d.vigente).length,
    'Descargas': documentos.filter(d => d.categoria_id === c.id).reduce((s, d) => s + (d.descargas || 0), 0),
    'Tamaño': formatearBytes(documentos.filter(d => d.categoria_id === c.id).reduce((s, d) => s + (d.tamano_bytes || 0), 0)),
  }))
  const wsRes = XLSX.utils.json_to_sheet(resumen)
  wsRes['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 11 }, { wch: 11 }, { wch: 12 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Inventario')
  XLSX.utils.book_append_sheet(wb, wsRes, 'Resumen')
  XLSX.writeFile(wb, `Inventario_Documental_${new Date().toISOString().slice(0, 10)}.xlsx`)
  return `${documentos.length} documentos exportados a Excel`
}

export function exportarRespaldoJSON({ documentos, categorias, versiones, auditoria }) {
  const paquete = {
    sistema: 'SIGMO',
    modulo: 'Repositorio Documental',
    formato: '1.0',
    generado: new Date().toISOString(),
    totales: {
      documentos: documentos.length,
      activos: documentos.filter(d => !d.eliminado).length,
      papelera: documentos.filter(d => d.eliminado).length,
      categorias: categorias.length,
      versiones: versiones.length,
      auditoria: auditoria.length,
    },
    categorias, documentos, versiones, auditoria,
  }
  guardarBlob(
    new Blob([JSON.stringify(paquete, null, 2)], { type: 'application/json;charset=utf-8' }),
    `Respaldo_Repositorio_${new Date().toISOString().slice(0, 10)}.json`,
  )
  return 'Respaldo completo descargado en JSON'
}

export function exportarAuditoriaCSV(auditoria) {
  const cab = ['Fecha', 'Acción', 'Documento', 'Detalle', 'Usuario']
  const csv = [cab, ...auditoria.map(a => [
    formatearFechaHora(a.created_at), a.accion, a.titulo, a.detalle || '', a.usuario || '',
  ])]
    .map(f => f.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';'))
    .join('\r\n')
  guardarBlob(
    new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }),
    `Auditoria_Documental_${new Date().toISOString().slice(0, 10)}.csv`,
  )
  return `${auditoria.length} movimientos exportados`
}