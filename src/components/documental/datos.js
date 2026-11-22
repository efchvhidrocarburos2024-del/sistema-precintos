// ============================================================================
//  SIGMO · Repositorio Documental · Acervo de respaldo
//  Solo se usa si la lectura de Supabase falla. Los objetos ya están en modelo
//  de UI (mismas claves que produce esquema.desdeBD) y las categorías usan
//  slug como id, igual que esquema.categoriaUI.
// ============================================================================
import { CATEGORIAS_BASE, uid } from './constantes'

const dias = (n) => new Date(Date.now() - n * 86400000).toISOString()

// Plano real dibujado, no un marcador de posición. Se previsualiza en el
// drawer y se exporta como SVG desde descargas.js.
export const PLANO_PID_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 620" width="1000" height="620" role="img" aria-label="Diagrama P y ID del rack de carga, planta Callao">
<defs>
<linearGradient id="fondo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0A3A52"/><stop offset="1" stop-color="#062A3D"/></linearGradient>
<linearGradient id="tanque" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0E7490" stop-opacity=".55"/><stop offset="1" stop-color="#06B6D4" stop-opacity=".2"/></linearGradient>
<linearGradient id="producto" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F59E0B" stop-opacity=".75"/><stop offset="1" stop-color="#D97706" stop-opacity=".45"/></linearGradient>
</defs>
<rect width="1000" height="620" fill="url(#fondo)"/>
<g stroke="#0E7490" stroke-width="1" opacity=".28">
${Array.from({ length: 25 }, (_, i) => `<line x1="${i * 40}" y1="0" x2="${i * 40}" y2="620"/>`).join('')}
${Array.from({ length: 16 }, (_, i) => `<line x1="0" y1="${i * 40}" x2="1000" y2="${i * 40}"/>`).join('')}
</g>
<rect x="0" y="0" width="1000" height="86" fill="#062A3D" opacity=".72"/>
<line x1="0" y1="86" x2="1000" y2="86" stroke="#06B6D4" stroke-width="2"/>
<text x="32" y="42" fill="#06B6D4" font-family="ui-monospace,monospace" font-size="21" font-weight="bold">P&amp;ID · RACK DE CARGA · PLANTA CALLAO</text>
<text x="32" y="66" fill="#7FA8BE" font-family="ui-monospace,monospace" font-size="13">REV 4.1 · UNIDAD DE DESPACHO B5 S-50 / B5 S-50 UV · LAZO SCOP</text>
<text x="968" y="42" fill="#84CC16" font-family="ui-monospace,monospace" font-size="13" text-anchor="end">VIGENTE</text>
<text x="968" y="66" fill="#7FA8BE" font-family="ui-monospace,monospace" font-size="12" text-anchor="end">HIDROMUNDO S.A.C.</text>

<!-- Tanque T-201 -->
<rect x="62" y="168" width="140" height="212" rx="10" fill="url(#tanque)" stroke="#06B6D4" stroke-width="3"/>
<rect x="62" y="286" width="140" height="94" rx="0" fill="url(#producto)"/>
<path d="M62 200 h140 M62 348 h140" stroke="#06B6D4" stroke-width="2" opacity=".7"/>
<text x="132" y="238" fill="#FAF7F2" font-family="ui-monospace,monospace" font-size="16" font-weight="bold" text-anchor="middle">T-201</text>
<text x="132" y="260" fill="#BFE2F0" font-family="ui-monospace,monospace" font-size="11" text-anchor="middle">5.000 gal</text>
<text x="132" y="330" fill="#062A3D" font-family="ui-monospace,monospace" font-size="12" font-weight="bold" text-anchor="middle">B5 S-50</text>
<g stroke="#84CC16" stroke-width="2" fill="none"><path d="M202 210 h34 v-40"/></g>
<circle cx="236" cy="160" r="15" fill="#062A3D" stroke="#84CC16" stroke-width="2"/>
<text x="236" y="165" fill="#84CC16" font-family="ui-monospace,monospace" font-size="10" text-anchor="middle">LT</text>
<text x="262" y="164" fill="#84CC16" font-family="ui-monospace,monospace" font-size="11">101</text>

<!-- Bomba B-04 -->
<path d="M202 320 H262" stroke="#06B6D4" stroke-width="3"/>
<circle cx="308" cy="320" r="46" fill="#0A3A52" stroke="#06B6D4" stroke-width="3"/>
<path d="M282 320 a26 26 0 1 1 26 26" stroke="#06B6D4" stroke-width="2.5" fill="none"/>
<path d="M308 274 v-22 h44" stroke="#06B6D4" stroke-width="2.5" fill="none"/>
<rect x="352" y="238" width="34" height="28" rx="4" fill="#0A3A52" stroke="#F59E0B" stroke-width="2"/>
<text x="369" y="257" fill="#F59E0B" font-family="ui-monospace,monospace" font-size="13" text-anchor="middle">M</text>
<text x="308" y="326" fill="#FAF7F2" font-family="ui-monospace,monospace" font-size="14" font-weight="bold" text-anchor="middle">B-04</text>
<text x="308" y="392" fill="#7FA8BE" font-family="ui-monospace,monospace" font-size="11" text-anchor="middle">45 kW · 60 m³/h</text>

<!-- Caudalímetro FT-101 -->
<path d="M354 320 H452" stroke="#06B6D4" stroke-width="3"/>
<circle cx="452" cy="320" r="8" fill="#F59E0B"/>
<rect x="428" y="248" width="48" height="34" rx="6" fill="#062A3D" stroke="#84CC16" stroke-width="2"/>
<text x="452" y="270" fill="#84CC16" font-family="ui-monospace,monospace" font-size="12" text-anchor="middle">FT</text>
<path d="M452 282 v30" stroke="#84CC16" stroke-width="2" stroke-dasharray="5 4"/>
<text x="452" y="238" fill="#84CC16" font-family="ui-monospace,monospace" font-size="11" text-anchor="middle">101</text>

<!-- Distribución a brazos -->
<path d="M452 320 V212 H556 M452 320 V430 H556" stroke="#06B6D4" stroke-width="3" fill="none"/>
<g stroke="#DB2777" stroke-width="2.5" fill="none">
<path d="M498 212 l14 -12 v24 z M526 212 l-14 -12 v24 z"/>
<path d="M498 430 l14 -12 v24 z M526 430 l-14 -12 v24 z"/>
</g>
<text x="512" y="188" fill="#DB2777" font-family="ui-monospace,monospace" font-size="11" text-anchor="middle">XV-201</text>
<text x="512" y="466" fill="#DB2777" font-family="ui-monospace,monospace" font-size="11" text-anchor="middle">XV-202</text>

<!-- Brazos de carga -->
<rect x="556" y="182" width="132" height="60" rx="8" fill="#0A3A52" stroke="#06B6D4" stroke-width="3"/>
<text x="622" y="208" fill="#FAF7F2" font-family="ui-monospace,monospace" font-size="13" font-weight="bold" text-anchor="middle">BRAZO A</text>
<text x="622" y="228" fill="#7FA8BE" font-family="ui-monospace,monospace" font-size="11" text-anchor="middle">B5 S-50</text>
<rect x="556" y="400" width="132" height="60" rx="8" fill="#0A3A52" stroke="#06B6D4" stroke-width="3"/>
<text x="622" y="426" fill="#FAF7F2" font-family="ui-monospace,monospace" font-size="13" font-weight="bold" text-anchor="middle">BRAZO B</text>
<text x="622" y="446" fill="#7FA8BE" font-family="ui-monospace,monospace" font-size="11" text-anchor="middle">B5 S-50 UV</text>

<!-- Colector y cisterna -->
<path d="M688 212 H768 M688 430 H768 M768 212 V430 M768 320 H836" stroke="#06B6D4" stroke-width="3" fill="none"/>
<rect x="836" y="266" width="132" height="108" rx="8" fill="#0A3A52" stroke="#F59E0B" stroke-width="3"/>
<path d="M880 266 v108 M924 266 v108" stroke="#F59E0B" stroke-width="2" opacity=".65"/>
<circle cx="862" cy="392" r="16" fill="#062A3D" stroke="#7FA8BE" stroke-width="2.5"/>
<circle cx="942" cy="392" r="16" fill="#062A3D" stroke="#7FA8BE" stroke-width="2.5"/>
<text x="902" y="326" fill="#FAF7F2" font-family="ui-monospace,monospace" font-size="13" font-weight="bold" text-anchor="middle">CISTERNA</text>
<text x="902" y="248" fill="#F59E0B" font-family="ui-monospace,monospace" font-size="11" text-anchor="middle">3 COMPARTIMENTOS</text>

<!-- Lazo de control SCOP -->
<path d="M452 328 V520 H902 V378" stroke="#DB2777" stroke-width="2" stroke-dasharray="7 5" fill="none"/>
<rect x="596" y="496" width="164" height="48" rx="8" fill="#062A3D" stroke="#DB2777" stroke-width="2"/>
<text x="678" y="516" fill="#DB2777" font-family="ui-monospace,monospace" font-size="12" font-weight="bold" text-anchor="middle">SCOP · PLC-01</text>
<text x="678" y="534" fill="#7FA8BE" font-family="ui-monospace,monospace" font-size="10" text-anchor="middle">PRECINTO ELECTRÓNICO</text>

<!-- Puesta a tierra -->
<path d="M836 374 v40 M824 414 h24 M828 422 h16 M832 430 h8" stroke="#84CC16" stroke-width="2.5" fill="none"/>
<text x="806" y="452" fill="#84CC16" font-family="ui-monospace,monospace" font-size="10" text-anchor="middle">PAT</text>

<!-- Leyenda -->
<rect x="32" y="556" width="936" height="1" fill="#0E7490"/>
<g font-family="ui-monospace,monospace" font-size="11">
<circle cx="44" cy="580" r="5" fill="#06B6D4"/><text x="56" y="584" fill="#BFE2F0">LÍNEA DE PROCESO</text>
<circle cx="212" cy="580" r="5" fill="#84CC16"/><text x="224" y="584" fill="#BFE2F0">INSTRUMENTACIÓN</text>
<circle cx="384" cy="580" r="5" fill="#DB2777"/><text x="396" y="584" fill="#BFE2F0">LAZO DE CONTROL / VÁLVULA</text>
<circle cx="620" cy="580" r="5" fill="#F59E0B"/><text x="632" y="584" fill="#BFE2F0">PRODUCTO / CARGA</text>
<text x="968" y="584" fill="#5A7184" text-anchor="end">DOCUMENTO CONTROLADO · COPIA NO VIGENTE SALVO SELLO</text>
</g>
</svg>`

// [titulo, slug, tipo, archivo, bytes, versión, etiquetas, planta, proveedor,
//  producto, antigüedad, vigente, destacado, descargas, descripción]
const DEFINICIONES = [
  ['Manual de Operaciones SCOP', 'operativos', 'pdf', 'Manual_SCOP_v3.2.pdf', 5_033_164, '3.2',
    ['scop', 'despacho', 'control'], 'CALLAO', null, null, 2, true, true, 148,
    'Procedimiento integral del Sistema de Control de Operaciones de Planta: apertura de rack, validación de precintos, registro de volúmenes y cierre de turno.'],
  ['Procedimiento de Precintado de Cisternas', 'operativos', 'pdf', 'PROC-PRE-002_v2.1.pdf', 1_884_160, '2.1',
    ['precintos', 'cisternas', 'despacho'], null, null, null, 5, true, true, 96,
    'Secuencia de colocación, verificación y retiro de precintos de seguridad en compartimentos de cisterna, con registro fotográfico obligatorio.'],
  ['Ficha Técnica Diésel B5 S-50 UV', 'tecnicos', 'pdf', 'FT-DIESEL-B5-S50-UV.pdf', 742_400, '1.4',
    ['diésel', 'b5', 'especificación'], null, 'MARATHON', 'DIESEL B5 S-50 UV', 9, true, false, 61,
    'Especificaciones fisicoquímicas del producto: cetano, azufre, punto de inflamación, contenido de biodiésel y límites de aceptación por lote.'],
  ['Matriz IPERC — Terminal Supe', 'seguridad', 'xlsx', 'IPERC_SUPE_2026.xlsx', 2_411_724, '5.0',
    ['iperc', 'supe', 'hse'], 'SUPE', null, null, 1, true, true, 133,
    'Identificación de peligros, evaluación de riesgos y controles operacionales por actividad del terminal marítimo y patio de tanques.'],
  ['Plan de Contingencia ante Derrames', 'seguridad', 'pdf', 'PLAN-DERRAMES_v2.3.pdf', 3_670_016, '2.3',
    ['derrames', 'contingencia', 'hse'], null, null, null, 12, true, false, 74,
    'Niveles de respuesta, cadena de mando, inventario de kits antiderrame y rutas de notificación a OSINERGMIN y OEFA.'],
  ['Guía de Uso del Sistema SIGMO', 'guias', 'pdf', 'Guia_SIGMO_v1.0.pdf', 6_291_456, '1.0',
    ['sigmo', 'manual', 'capacitación'], null, null, null, 3, true, true, 212,
    'Recorrido por los seis módulos: precintos, repositorio, catálogos, precios y cotización. Incluye casos prácticos y preguntas frecuentes.'],
  ['D.S. 030-98-EM — Transporte de Hidrocarburos', 'normativa', 'pdf', 'DS-030-98-EM.pdf', 1_258_291, '1998',
    ['osinergmin', 'reglamento', 'transporte'], null, null, null, 40, true, false, 88,
    'Reglamento para el transporte de hidrocarburos líquidos por carretera. Requisitos de habilitación vehicular y obligaciones del transportista.'],
  ['Protocolo de Conciliación de Volúmenes', 'operativos', 'docx', 'PROTOCOLO_CONCILIACION.docx', 486_400, '1.2',
    ['conciliación', 'mermas', 'volúmenes'], null, null, null, 7, true, false, 45,
    'Método de conciliación entre volumen despachado a temperatura ambiente y volumen corregido a 60 °F, con tolerancias admisibles.'],
  ['Diagrama P&ID — Rack de Carga Callao', 'tecnicos', 'svg', 'PID_RACK_CALLAO_REV4.1.svg', 38_912, '4.1',
    ['pid', 'callao', 'rack', 'plano'], 'CALLAO', null, null, 4, true, true, 57,
    'Diagrama de tuberías e instrumentación del rack de despacho: tanque T-201, bomba B-04, transmisor FT-101, válvulas XV-201/202 y lazo de control SCOP.'],
  ['Lista de Precios por Planta — Noviembre 2026', 'comercial', 'xlsx', 'Precios_Planta_2026-11.xlsx', 214_016, '2026.11',
    ['precios', 'vigente', 'pricing'], null, null, null, 1, true, true, 189,
    'Lista oficial de precios base, sin IGV y con IGV para las dieciocho plantas. Fuente del módulo de cotización.'],
  ['Topes Regulatorios por Almacén', 'comercial', 'xlsx', 'TOPES_2026-11.xlsx', 178_176, '2026.11',
    ['topes', 'almacén', 'pricing'], null, 'MARATHON', null, 1, true, false, 121,
    'Topes máximos por combinación planta × almacén × producto, utilizados en el cálculo del precio final cotizado.'],
  ['Programa Anual de Mantenimiento de Bombas', 'mantenimiento', 'xlsx', 'PM_BOMBAS_2026.xlsx', 1_048_576, '3.0',
    ['bombas', 'preventivo', 'rutinas'], null, null, null, 18, true, false, 39,
    'Cronograma de mantenimiento preventivo por equipo crítico, intervalos de cambio de sellos y registro de horas de operación.'],
  ['Reporte Mensual de Mermas — Octubre 2026', 'reportes', 'pdf', 'MERMAS_2026-10.pdf', 967_680, '1.0',
    ['mermas', 'octubre', 'informe'], null, null, null, 22, true, false, 52,
    'Consolidado de mermas por planta y producto, análisis de desviaciones respecto al límite normativo y acciones correctivas.'],
  ['Certificado de Calibración Caudalímetro L-04', 'tecnicos', 'pdf', 'CAL-FT101-L04_2026-09.pdf', 421_888, '2026.09',
    ['calibración', 'caudalímetro', 'metrología'], 'CALLAO', null, null, 60, true, false, 27,
    'Certificado emitido por laboratorio acreditado INACAL. Factor de medidor, repetibilidad y trazabilidad de la cadena de calibración.'],
  ['Instructivo de Carga y Descarga en Rack', 'guias', 'pdf', 'INSTRUCTIVO_RACK_v2.0.pdf', 2_306_867, '2.0',
    ['rack', 'carga', 'descarga'], null, null, null, 15, true, false, 84,
    'Paso a paso para conexión de brazos, puesta a tierra, control de flujo y desconexión segura. Incluye señales manuales obligatorias.'],
  ['Acta de Auditoría Interna OSINERGMIN', 'normativa', 'pdf', 'ACTA_AUDITORIA_2026-2.pdf', 1_572_864, '2026.2',
    ['auditoría', 'osinergmin', 'acta'], null, null, null, 30, true, false, 33,
    'Hallazgos, no conformidades y plan de acción comprometido ante la supervisión del organismo regulador.'],
  ['Contrato de Suministro — Marathon', 'comercial', 'docx', 'CONTRATO_MARATHON_2026.docx', 612_352, '2026.1',
    ['contrato', 'marathon', 'suministro'], 'CALLAO', 'MARATHON', 'DIESEL B5 S-50', 90, true, false, 18,
    'Términos comerciales, volúmenes comprometidos, fórmula de reajuste y penalidades por incumplimiento de entrega.'],
  ['Orden de Trabajo OT-2026-0412', 'mantenimiento', 'pdf', 'OT-2026-0412.pdf', 289_792, '1.0',
    ['ot', 'correctivo', 'tanque'], 'SUPE', null, null, 6, false, false, 11,
    'Intervención correctiva sobre válvula de alivio del tanque T-118. Repuestos utilizados y horas hombre empleadas.'],
  ['Manual SCOP — Edición 2024 (obsoleto)', 'operativos', 'pdf', 'Manual_SCOP_v2.8_2024.pdf', 4_718_592, '2.8',
    ['scop', 'histórico'], 'CALLAO', null, null, 320, false, false, 64,
    'Edición anterior del manual de operaciones. Conservada únicamente para trazabilidad de auditorías históricas.'],
  ['Checklist Pre-Uso de Cisterna', 'seguridad', 'xlsx', 'CHECKLIST_CISTERNA.xlsx', 96_256, '1.1',
    ['checklist', 'cisterna', 'pre-uso'], null, null, null, 11, true, false, 71,
    'Verificación de luces, frenos, extintores, puesta a tierra, precintos y documentación del conductor antes de cada despacho.'],
]

const RESPONSABLES = [
  'elmer.chumbimune@petroamerica.com.pe',
  'analista.comercial@petroamerica.com.pe',
  'jefe.pricing@petroamerica.com.pe',
]

export function construirSemilla() {
  // id = slug, exactamente como esquema.categoriaUI
  const categorias = CATEGORIAS_BASE.map((c, i) => ({
    ...c, id: c.slug, uuid: `local-${c.slug}`, created_at: dias(120 - i),
  }))

  const documentos = DEFINICIONES.map((d, i) => {
    const [titulo, slug, tipo, archivo, bytes, version, etiquetas, planta, proveedor,
      producto, antig, vigente, destacado, descargas, descripcion] = d
    return {
      id: `doc-${String(i + 1).padStart(3, '0')}`,
      titulo, descripcion,
      categoria_id: slug,
      tipo, nombre_archivo: archivo,
      url_archivo: null,
      tamano_bytes: bytes,
      version, etiquetas, planta, proveedor, producto,
      vigente, destacado, descargas,
      subido_por: RESPONSABLES[i % RESPONSABLES.length],
      subido_por_nombre: null,
      subido_por_id: null,
      eliminado: false, eliminado_en: null,
      created_at: dias(antig),
      actualizado_en: dias(Math.max(0, antig - 1)),
    }
  })

  const versiones = []
  documentos.forEach(doc => {
    const mayor = parseFloat(doc.version)
    const previas = Number.isFinite(mayor) && mayor > 1 ? Math.min(3, Math.floor(mayor)) : 1
    const antig = (Date.now() - new Date(doc.created_at)) / 86400000
    for (let k = previas; k >= 1; k--) {
      const esActual = k === previas
      const v = esActual
        ? doc.version
        : (Number.isFinite(mayor) ? `${Math.max(1, Math.floor(mayor) - (previas - k))}.0` : doc.version)
      versiones.push({
        id: uid(), documento_id: doc.id, version: v,
        nota: esActual
          ? 'Versión vigente publicada y distribuida a las plantas.'
          : 'Revisión previa conservada para trazabilidad de auditoría.',
        nombre_archivo: doc.nombre_archivo, url_archivo: null,
        tamano_bytes: Math.round(doc.tamano_bytes * (0.82 + k * 0.05)),
        subido_por: doc.subido_por,
        created_at: dias(antig + (previas - k) * 21),
      })
    }
  })

  const acciones = ['SUBIDA', 'ACTUALIZACIÓN', 'VIGENCIA', 'DESCARGA', 'DESTACADO']
  const auditoria = documentos.slice(0, 14).map((doc, i) => {
    const accion = acciones[i % acciones.length]
    return {
      id: uid(), documento_id: doc.id, titulo: doc.titulo, accion,
      detalle: accion === 'VIGENCIA' ? 'Marcado como documento vigente del repositorio.'
        : accion === 'DESCARGA' ? 'Descarga registrada desde la biblioteca documental.'
          : accion === 'DESTACADO' ? 'Añadido a destacados para acceso rápido de las plantas.'
            : 'Registro generado durante la operación normal del módulo.',
      usuario: doc.subido_por,
      created_at: dias(i * 0.6),
    }
  })

  const archivados = [
    {
      id: 'doc-arch-001', titulo: 'Formato de Guía de Remisión (descontinuado)',
      descripcion: 'Formato reemplazado por la guía electrónica SUNAT. Se conserva hasta el cierre del ejercicio fiscal.',
      categoria_id: 'operativos', tipo: 'pdf', nombre_archivo: 'GUIA_REMISION_OLD.pdf',
      url_archivo: null, tamano_bytes: 154_624, version: '1.0',
      etiquetas: ['sunat', 'obsoleto'], planta: null, proveedor: null, producto: null,
      vigente: false, destacado: false, descargas: 4,
      subido_por: RESPONSABLES[0], subido_por_nombre: null, subido_por_id: null,
      eliminado: true, eliminado_en: dias(3), created_at: dias(210), actualizado_en: dias(3),
    },
    {
      id: 'doc-arch-002', titulo: 'Cronograma de Capacitación 2025',
      descripcion: 'Programa de capacitación del ejercicio anterior, archivado al cierre del año.',
      categoria_id: 'guias', tipo: 'xlsx', nombre_archivo: 'CAPACITACION_2025.xlsx',
      url_archivo: null, tamano_bytes: 88_064, version: '2.0',
      etiquetas: ['capacitación', '2025'], planta: null, proveedor: null, producto: null,
      vigente: false, destacado: false, descargas: 9,
      subido_por: RESPONSABLES[2], subido_por_nombre: null, subido_por_id: null,
      eliminado: true, eliminado_en: dias(9), created_at: dias(300), actualizado_en: dias(9),
    },
  ]

  return { categorias, documentos: [...documentos, ...archivados], versiones, auditoria }
}