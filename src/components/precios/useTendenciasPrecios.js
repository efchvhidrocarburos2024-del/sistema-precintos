// src/components/precios/useTendenciasPrecios.js
import { useState, useEffect, useCallback, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../../supabase'

// ============================================================
// UTILIDADES
// ============================================================
const norm = (v) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').replace(/N°/gi, 'N').trim().toUpperCase()

const num = (v) => {
  const n = parseFloat(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

const mesClave = (v) => {
  const m = String(v ?? '').match(/^(\d{4})-(\d{2})/)
  return m ? `${m[1]}-${m[2]}` : null
}

// Fecha en el nombre del archivo: YYYY-MM-DD / DD-MM-YYYY (con - _ .)
const extraerFecha = (nombre) => {
  if (!nombre) return null
  const m = String(nombre).match(/(\d{4})[-_.](\d{2})[-_.](\d{2})|(\d{2})[-_.](\d{2})[-_.](\d{4})/)
  if (!m) return null
  const y = m[1] || m[6]
  const mo = m[2] || m[5]
  const d = m[3] || m[4]
  if (+mo < 1 || +mo > 12 || +d < 1 || +d > 31 || +y < 1900 || +y > 2099) return null
  return `${y}-${mo}-${d}`
}

const esPlantaValida = (nombre) => {
  const n = norm(nombre)
  if (!n || n.length < 3 || n.includes('*') || !isNaN(Number(n))) return false
  if (n.match(/\d{4}-\d{2}-\d{2}/) || n.match(/\d{2}\/\d{2}\/\d{4}/)) return false
  if (n.includes('TOTAL') || n.includes('IGV') || n.includes('ISC') || n.includes('RODAJE') || n.includes('INCREMENTO') || n.includes('INCLUSION') || n.includes('DISMINUCION') || n.includes('SISE') || n.includes('INGRESO')) return false
  return true
}

export const formatCurrency = (v) => `S/ ${Number(v ?? 0).toFixed(4)}`
export const formatPercentage = (v) => {
  const n = Number(v ?? 0)
  return `${n > 0 ? '+' : ''}${n.toFixed(2)}%`
}
export const getTrendColor = (v) => {
  const n = Number(v ?? 0)
  if (n > 0) return '#DC3545'
  if (n < 0) return '#28A745'
  return '#6B7280'
}

// ============================================================
// HOOK
// ============================================================
export function useTendenciasPrecios({ fechaDesde, fechaHasta, productos = [], planta = null, hoja = 'Precio Base' } = {}) {
  const [datos, setDatos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)

  const recargar = useCallback(() => setTick((t) => t + 1), [])
  const productosKey = (productos || []).join('|')

  useEffect(() => {
    let cancelado = false

    // ---------- Fuente 1: vista materializada (si tiene datos) ----------
    async function desdeVista() {
      try {
        const { data, error: err } = await supabase.from('mv_tendencias_mensuales').select('*')
        if (err || !data || data.length === 0) return []
        const desde = mesClave(fechaDesde) || '0000-01'
        const hasta = mesClave(fechaHasta) || '9999-12'
        const prods = (productos || []).map(norm).filter(Boolean)
        const plantaNorm = planta ? norm(planta) : null
        return data
          .map((r) => ({ ...r, mesNorm: mesClave(r.mes) }))
          .filter((r) => r.mesNorm)
          .filter((r) => r.mesNorm >= desde && r.mesNorm <= hasta)
          .filter((r) => !plantaNorm || norm(r.planta) === plantaNorm)
          .filter((r) => prods.length === 0 || prods.includes(norm(r.producto)))
          .map((r) => ({
            mes: r.mesNorm,
            producto: r.producto,
            planta: r.planta,
            promedio: num(r.promedio) ?? 0,
            minimo: num(r.minimo) ?? 0,
            maximo: num(r.maximo) ?? 0,
            variacion: num(r.variacion) ?? 0,
            registros: num(r.registros) ?? 0,
          }))
          .sort((a, b) => a.mes.localeCompare(b.mes) || String(a.producto).localeCompare(String(b.producto)))
      } catch {
        return []
      }
    }

    // ---------- Fuente 2: parsear las listas Excel subidas ----------
    async function parseHoja(url) {
      const res = await fetch(url)
      if (!res.ok) throw new Error('descarga fallida')
      const wb = XLSX.read(await res.arrayBuffer(), { type: 'array' })
      const term = hoja.toLowerCase().replace('precios planta ', '').replace('precio ', '')
      const sheetName = wb.SheetNames.find((n) => n.toLowerCase().includes(term)) || wb.SheetNames[0]
      const grid = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' })
      let hIdx = grid.findIndex((r) => r.some((c) => norm(c).includes('PLANTA')))
      if (hIdx === -1) hIdx = 0
      return { headers: grid[hIdx], rows: grid.slice(hIdx + 1) }
    }

    async function desdeArchivos() {
      const { data: archivos, error: err } = await supabase.from('precios_archivos').select('*')
      if (err) throw err

      const conFecha = (archivos || [])
        .map((a) => ({ ...a, fecha: extraerFecha(a.nombre_archivo) || (a.created_at ? String(a.created_at).slice(0, 10) : null) }))
        .filter((a) => a.fecha)
        .filter((a) => a.fecha >= (fechaDesde || '0000-01-01') && a.fecha <= (fechaHasta || '9999-12-31'))
        .sort((a, b) => a.fecha.localeCompare(b.fecha))

      const recientes = conFecha.slice(-24) // límite razonable de listas a procesar
      if (recientes.length === 0) return []

      const resultados = await Promise.all(
        recientes.map(async (a) => {
          try {
            const grid = await parseHoja(a.url_archivo)
            return { fecha: a.fecha, grid }
          } catch {
            return null
          }
        })
      )
      const grids = resultados.filter(Boolean)
      if (grids.length === 0) throw new Error('No se pudieron leer los archivos de precios del historial. Verifica que sigan disponibles en el repositorio.')

      // Universo de productos = unión de columnas de producto de todas las listas
      const tituloPorNorm = new Map()
      grids.forEach(({ grid }) => {
        grid.headers.forEach((h) => {
          const n = norm(h)
          if (!n || n.includes('PLANTA') || n.includes('CODIGO') || n.includes('USO INTERNO')) return
          if (!tituloPorNorm.has(n)) tituloPorNorm.set(n, String(h).trim())
        })
      })
      let universo = [...tituloPorNorm.keys()]
      const prods = (productos || []).map(norm).filter(Boolean)
      if (prods.length > 0) {
        const coincidentes = universo.filter((u) => prods.includes(u))
        // Si el filtro no coincide con ninguna columna real, usamos todas para no quedar vacíos
        universo = coincidentes.length > 0 ? coincidentes : universo
      }

      const plantaNorm = planta ? norm(planta) : null
      const seriePorProducto = new Map() // norm -> [{fecha, promedio, minimo, maximo, registros}]

      grids.forEach(({ fecha, grid }) => {
        const idxPlanta = grid.headers.findIndex((h) => norm(h).includes('PLANTA'))
        if (idxPlanta === -1) return
        const filasValidas = grid.rows.filter((r) => esPlantaValida(r[idxPlanta]))

        universo.forEach((prodNorm) => {
          const idx = grid.headers.findIndex((h) => norm(h) === prodNorm)
          if (idx === -1) return
          let valores = []
          if (plantaNorm) {
            const fila = filasValidas.find((r) => norm(r[idxPlanta]) === plantaNorm)
            if (fila) {
              const v = num(fila[idx])
              if (v !== null && v > 0) valores = [v]
            }
          } else {
            valores = filasValidas.map((r) => num(r[idx])).filter((v) => v !== null && v > 0)
          }
          if (valores.length === 0) return
          const promedio = valores.reduce((a, b) => a + b, 0) / valores.length
          if (!seriePorProducto.has(prodNorm)) seriePorProducto.set(prodNorm, [])
          seriePorProducto.get(prodNorm).push({
            fecha,
            promedio,
            minimo: Math.min(...valores),
            maximo: Math.max(...valores),
            registros: valores.length,
          })
        })
      })

      const filas = []
      seriePorProducto.forEach((puntos, prodNorm) => {
        puntos.sort((a, b) => a.fecha.localeCompare(b.fecha))
        let anterior = null
        puntos.forEach((p) => {
          const variacion = anterior !== null && anterior > 0 ? ((p.promedio - anterior) / anterior) * 100 : 0
          filas.push({
            mes: p.fecha,
            producto: tituloPorNorm.get(prodNorm) || prodNorm,
            planta: planta || 'TODAS',
            promedio: p.promedio,
            minimo: p.minimo,
            maximo: p.maximo,
            variacion,
            registros: p.registros,
          })
          anterior = p.promedio
        })
      })

      return filas.sort((a, b) => a.mes.localeCompare(b.mes) || String(a.producto).localeCompare(String(b.producto)))
    }

    async function cargar() {
      setCargando(true)
      setError('')
      try {
        let filas = await desdeVista()
        if (filas.length === 0) filas = await desdeArchivos()
        if (!cancelado) setDatos(filas)
      } catch (e) {
        if (!cancelado) {
          setDatos([])
          setError(e?.message || 'Error al construir el historial de tendencias.')
        }
      } finally {
        if (!cancelado) setCargando(false)
      }
    }

    cargar()
    return () => { cancelado = true }
  }, [fechaDesde, fechaHasta, planta, productosKey, hoja, tick])

  // ----------------------------------------------------------
  // ESTADÍSTICAS
  // ----------------------------------------------------------
  const estadisticas = useMemo(() => {
    if (!datos.length) return null
    const totalRegistros = datos.reduce((s, r) => s + (r.registros || 0), 0) || datos.length
    const porProducto = new Map()
    datos.forEach((r) => {
      const k = norm(r.producto)
      if (!porProducto.has(k)) porProducto.set(k, [])
      porProducto.get(k).push(r)
    })
    const productosAnalizados = porProducto.size
    const variaciones = datos.map((r) => r.variacion).filter((v) => Number.isFinite(v) && v !== 0)
    const tendenciaGeneral = variaciones.length ? variaciones.reduce((a, b) => a + b, 0) / variaciones.length : 0
    const cvs = []
    porProducto.forEach((rows) => {
      const vals = rows.map((r) => r.promedio).filter((v) => v > 0)
      if (vals.length < 2) return
      const media = vals.reduce((a, b) => a + b, 0) / vals.length
      if (media <= 0) return
      const varianza = vals.reduce((s, v) => s + (v - media) ** 2, 0) / vals.length
      cvs.push((Math.sqrt(varianza) / media) * 100)
    })
    const volatilidadPromedio = cvs.length ? cvs.reduce((a, b) => a + b, 0) / cvs.length : 0
    return { totalRegistros, productosAnalizados, tendenciaGeneral, volatilidadPromedio }
  }, [datos])

  return { datos, cargando, error, estadisticas, recargar }
}

export default useTendenciasPrecios