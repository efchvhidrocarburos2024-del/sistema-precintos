// src/components/precios/useTendenciasPrecios.js
import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../../supabase'

const PALETA = {
  azulProfundo: '#0033A0',
  cyanVibrante: '#00AEEF',
  exito: '#28A745',
  alerta: '#FFC107',
  peligro: '#DC3545',
  grisClaro: '#F5F5F5',
  grisMedio: '#CCCCCC',
}

export function useTendenciasPrecios({ fechaDesde, fechaHasta, productos, planta, usarVistaMaterializada = false }) {
  const [datos, setDatos] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const [estadisticas, setEstadisticas] = useState(null)

  const queryKey = useMemo(() => 
    `${fechaDesde}|${fechaHasta}|${productos?.join(',') || ''}|${planta || ''}`,
    [fechaDesde, fechaHasta, productos, planta]
  )

  const cargarDatos = useCallback(async () => {
    if (!fechaDesde || !fechaHasta || !productos?.length) {
      setDatos([])
      setEstadisticas(null)
      return
    }

    setCargando(true)
    setError(null)

    try {
      let query = supabase
        .from(usarVistaMaterializada ? 'mv_tendencias_mensuales' : 'historial_precios')
        .select('*')
        .gte('fecha_lista' in (usarVistaMaterializada ? {} : { fecha_lista: fechaDesde }), fechaDesde)
        .lte('fecha_lista' in (usarVistaMaterializada ? {} : { fecha_lista: fechaHasta }), fechaHasta)

      if (productos?.length) {
        query = query.in('producto', productos)
      }
      if (planta) {
        query = query.eq('planta', planta)
      }

      if (!usarVistaMaterializada) {
        query = query.order('fecha_lista', { ascending: true })
      }

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      // Procesamiento de datos según fuente
      let resultados
      if (usarVistaMaterializada) {
        resultados = data.map(row => ({
          mes: row.mes,
          producto: row.producto,
          planta: row.planta,
          promedio: parseFloat(row.precio_promedio) || 0,
          minimo: parseFloat(row.precio_minimo) || 0,
          maximo: parseFloat(row.precio_maximo) || 0,
          desviacion: parseFloat(row.desviacion_estandar) || 0,
          registros: parseInt(row.registros) || 0,
          inicio: parseFloat(row.precio_inicio_mes) || 0,
          fin: parseFloat(row.precio_fin_mes) || 0,
          variacion: row.precio_fin_mes && row.precio_inicio_mes 
            ? ((row.precio_fin_mes - row.precio_inicio_mes) / row.precio_inicio_mes * 100).toFixed(2)
            : 0,
        }))
      } else {
        // Agrupación manual si no usa vista materializada
        const agrupado = data.reduce((acc, row) => {
          const mes = row.fecha_lista.slice(0, 7)
          const key = `${mes}|${row.producto}|${row.planta || 'todas'}`
          if (!acc[key]) {
            acc[key] = {
              mes,
              producto: row.producto,
              planta: row.planta || 'todas',
              precios: [],
            }
          }
          acc[key].precios.push(parseFloat(row.precio) || 0)
          return acc
        }, {})

        resultados = Object.values(agrupado).map(item => {
          const avg = item.precios.reduce((a, b) => a + b, 0) / item.precios.length
          return {
            mes: item.mes,
            producto: item.producto,
            planta: item.planta,
            promedio: avg,
            minimo: Math.min(...item.precios),
            maximo: Math.max(...item.precios),
            desviacion: Math.sqrt(item.precios.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / item.precios.length),
            registros: item.precios.length,
            inicio: item.precios[0],
            fin: item.precios[item.precios.length - 1],
            variacion: ((item.precios[item.precios.length - 1] - item.precios[0]) / item.precios[0] * 100).toFixed(2),
          }
        })
      }

      setDatos(resultados.sort((a, b) => a.mes.localeCompare(b.mes)))

      // Calcular estadísticas globales
      const stats = {
        totalRegistros: resultados.reduce((sum, r) => sum + r.registros, 0),
        productosAnalizados: [...new Set(resultados.map(r => r.producto))].length,
        rangoPrecio: {
          min: Math.min(...resultados.map(r => r.minimo)),
          max: Math.max(...resultados.map(r => r.maximo)),
        },
        tendenciaGeneral: resultados.length > 1 
          ? ((resultados[resultados.length - 1].promedio - resultados[0].promedio) / resultados[0].promedio * 100).toFixed(2)
          : 0,
        volatilidadPromedio: resultados.reduce((sum, r) => sum + r.desviacion, 0) / resultados.length || 0,
      }
      setEstadisticas(stats)

    } catch (err) {
      console.error('Error cargando tendencias:', err)
      setError(err.message || 'Error desconocido al cargar datos')
    } finally {
      setCargando(false)
    }
  }, [fechaDesde, fechaHasta, productos, planta, usarVistaMaterializada])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  // Escuchar cambios en tiempo real (opcional)
  useEffect(() => {
    const channel = supabase
      .channel('tendencias_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'historial_precios' },
        () => cargarDatos()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [cargarDatos])

  return { datos, cargando, error, estadisticas, recargar: cargarDatos }
}

// Utilidades de formato con identidad Petro América
export const formatCurrency = (value) => 
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value)

export const formatPercentage = (value) => 
  `${value > 0 ? '+' : ''}${value}%`

export const getTrendColor = (variation) => {
  const num = parseFloat(variation)
  if (num > 2) return PALETA.peligro    // Subida significativa
  if (num < -2) return PALETA.exito     // Bajada significativa  
  if (num > 0) return PALETA.alerta     // Subida leve
  if (num < 0) return PALETA.cyanVibrante // Bajada leve
  return PALETA.grisMedio               // Sin cambio
}