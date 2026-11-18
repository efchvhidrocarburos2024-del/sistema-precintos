import { useState } from 'react'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

export default function PanelRespaldos() {
  const [cargando, setCargando] = useState(false)

  const generarRespaldo = async () => {
    setCargando(true)
    const toastId = toast.loading('Generando respaldo completo de la base de datos...')

    try {
      // 1. Consultar todas las tablas en paralelo
      const [
        { data: precintos },
        { data: usuarios },
        { data: transacciones },
        { data: conciliaciones },
        { data: bitacora }
      ] = await Promise.all([
        supabase.from('precintos').select('*').order('fecha_recepcion', { ascending: false }),
        supabase.from('usuarios').select('id_usuario, email, nombre_completo, activo, created_at'),
        supabase.from('transacciones').select('*').order('fecha_creacion', { ascending: false }),
        supabase.from('conciliaciones').select('*').order('fecha_creacion', { ascending: false }),
        supabase.from('bitacora_eventos').select('*').order('fecha', { ascending: false })
      ])

      // 2. Crear el Libro de Excel (Workbook)
      const wb = XLSX.utils.book_new()

      // 3. Convertir cada tabla a una hoja y agregarla al libro
      if (precintos) {
        const wsPrecintos = XLSX.utils.json_to_sheet(precintos)
        XLSX.utils.book_append_sheet(wb, wsPrecintos, "Precintos")
      }

      if (usuarios) {
        const wsUsuarios = XLSX.utils.json_to_sheet(usuarios)
        XLSX.utils.book_append_sheet(wb, wsUsuarios, "Usuarios")
      }

      if (transacciones) {
        const wsTransacciones = XLSX.utils.json_to_sheet(transacciones)
        XLSX.utils.book_append_sheet(wb, wsTransacciones, "Viajes_Transacciones")
      }

      if (conciliaciones) {
        const wsConciliaciones = XLSX.utils.json_to_sheet(conciliaciones)
        XLSX.utils.book_append_sheet(wb, wsConciliaciones, "Conciliaciones")
      }

      if (bitacora) {
        const wsBitacora = XLSX.utils.json_to_sheet(bitacora)
        XLSX.utils.book_append_sheet(wb, wsBitacora, "Bitacora_Auditoria")
      }

      // 4. Generar el archivo y descargarlo
      const fecha = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(wb, `Respaldo_Sistema_Precintos_${fecha}.xlsx`)

      toast.success('Respaldo generado y descargado correctamente', { id: toastId })
    } catch (error) {
      console.error(error)
      toast.error('Error al generar el respaldo: ' + error.message, { id: toastId })
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={{ width: '90%', maxWidth: '800px', margin: '40px auto', fontFamily: 'Arial', padding: '10px', boxSizing: 'border-box' }}>
      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', textAlign: 'center' }}>
        <h2 style={{ color: '#0B5FA5', marginBottom: '20px' }}>Centro de Respaldos (Backups)</h2>
        
        <div style={{ fontSize: '50px', marginBottom: '20px' }}>💾</div>
        
        <p style={{ color: '#444', fontSize: '16px', lineHeight: '1.6', marginBottom: '30px' }}>
          Genera un archivo Excel completo con toda la información histórica de tu sistema. 
          <br /><br />
          El archivo contendrá múltiples pestañas con el listado de <strong>Precintos, Usuarios, Viajes, Conciliaciones y la Bitácora de Auditoría</strong>. 
          <br /><br />
          <em>Se recomienda descargar este respaldo al finalizar cada mes.</em>
        </p>

        <button 
          onClick={generarRespaldo} 
          disabled={cargando}
          style={{ 
            padding: '15px 40px', 
            background: cargando ? '#9CA3AF' : '#0B5FA5', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px', 
            cursor: cargando ? 'not-allowed' : 'pointer', 
            fontWeight: 'bold',
            fontSize: '18px',
            boxShadow: '0 4px 6px rgba(11, 95, 165, 0.3)',
            transition: 'all 0.2s'
          }}
        >
          {cargando ? 'Generando archivo...' : '📥 Descargar Respaldo Completo (.xlsx)'}
        </button>
      </div>
    </div>
  )
}