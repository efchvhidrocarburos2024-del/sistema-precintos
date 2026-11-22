// src/components/precios/useTendenciasPrecios.js
import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../../supabase'

// ============================================================
// UTILIDADES
// ============================================================
const norm = (v) => String(v ?? '').trim().toUpperCase()

// Normaliza cualquier representación de mes a 'YYYY-MM'
const mesClave = (v) => {
  const m = String(v ?? '').match(/^(\d{4})-(\d{2})/)
  return m ? `${m[1]}-${m[2]}` : null
}

const num = (v) => {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : null
}

export const formatCurrency = (v) => `S/ ${Number(v ?? 0).toFixed(4)}`

export const formatPercentage = (v) => {
  const n = Number(v ?? 0)
  return `${n > 0 ? '+' : ''}${n.toFixed(2)}%`
}

export const getTrendColor = (v) => {
  const n = Number(v ?? 0)
  if (n > 0) return '#DC3545' // sube
  if (n < 0) return '#28A745' // baja
  return '#6B7280' // estable
}

// ============================================================
// HOOK
// ============================================================
export function useTendenciasPrecios({ fechaDesde, fechaHasta, productos = [], planta = null } = {}) {
  const [datos, setDatos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)

  const recargar = useCallback(() => setTick((t) => t + 1), [])

  const productosKey = (productos || []).join('|')

  useEffect(() => {
    let cancelado = false

    async function cargar() {
      setCargando(true)
      setError('')
      try {
        // Lectura completa de la vista + filtrado en memoria.
        // Nunca se envían booleanos ni nombres de columna dinámicos a PostgREST,
        // lo que elimina el error "column mv_tendencias_mensuales.false does not exist".
        const { data, error: err } = await supabase.from('mv_tendencias_mensuales').select('*')
        if (err) throw err

        const desde = mesClave(fechaDesde) || '0000-01'
        const hasta = mesClave(fechaHasta) || '9999-12'
        const prods = (productos || []).map(norm).filter(Boolean)
        const plantaNorm = planta ? norm(planta) : null

        const filtradas = (data || [])
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

        if (!cancelado) setDatos(filtradas)
      } catch (e) {
        if (!cancelado) {
          setDatos([])
          setError(e?.message || 'Error al consultar la vista de tendencias.')
        }
      } finally {
        if (!cancelado) setCargando(false)
      }
    }

    cargar()
    return () => { cancelado = true }
  }, [fechaDesde, fechaHasta, planta, productosKey, tick])

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
    const tendenciaGeneral = variaciones.length
      ? variaciones.reduce((a, b) => a + b, 0) / variaciones.length
      : 0

    // Volatilidad = coeficiente de variación (desv. estándar / media) por producto
    const cvs = []
    porProducto.forEach((rows) => {
      const vals = rows.map((r) => r.promedio).filter((v) => v > 0)
      if (vals.length < 2) return
      const media = vals.reduce((a, b) => a + b, 0) / vals.length
      if (media <= 0) return
      const varianza = vals.reduce((s, v) => s + (v - media) ** 2, 0) / vals.length
      cvs.push((Math.sqrt(varianza) / media) * 100
      )
    })
    const volatilidadPromedio = cvs.length ? cvs.reduce((a, b) => a + b, 0) / cvs.length : 0

    return { totalRegistros, productosAnalizados, tendenciaGeneral, volatilidadPromedio }
  }, [datos])

  return { datos, cargando, error, estadisticas, recargar }
}

export default useTendenciasPrecios