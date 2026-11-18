import { useState } from 'react'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { PageHeader, Card, Boton } from './ui'

export default function PanelRespaldos() {
  const [cargando, setCargando] = useState(false)

  const generarRespaldo = async () => {
    setCargando(true)
    const toastId = toast.loading('Generando respaldo completo de la base de datos...')

    try {
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

      const wb = XLSX.utils.book_new()

      if (precintos) {
        const wsPrecintos = XLSX.utils.json_to_sheet(precintos)
        XLSX.utils.book_append_sheet(wb, wsPrecintos, 'Precintos')
      }

      if (usuarios) {
        const wsUsuarios = XLSX.utils.json_to_sheet(usuarios)
        XLSX.utils.book_append_sheet(wb, wsUsuarios, 'Usuarios')
      }

      if (transacciones) {
        const wsTransacciones = XLSX.utils.json_to_sheet(transacciones)
        XLSX.utils.book_append_sheet(wb, wsTransacciones, 'Viajes_Transacciones')
      }

      if (conciliaciones) {
        const wsConciliaciones = XLSX.utils.json_to_sheet(conciliaciones)
        XLSX.utils.book_append_sheet(wb, wsConciliaciones, 'Conciliaciones')
      }

      if (bitacora) {
        const wsBitacora = XLSX.utils.json_to_sheet(bitacora)
        XLSX.utils.book_append_sheet(wb, wsBitacora, 'Bitacora_Auditoria')
      }

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
    <div className="page-container" style={{ maxWidth: '800px' }}>
      <PageHeader titulo="Centro de Respaldos (Backups)" />

      <Card>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: '60px', marginBottom: '20px' }}>💾</div>

          <p style={{
            color: 'var(--text-dark)',
            fontSize: '16px',
            lineHeight: '1.7',
            marginBottom: '30px'
          }}>
            Genera un archivo Excel completo con toda la información histórica de tu sistema.
            <br /><br />
            El archivo contendrá múltiples pestañas con el listado de{' '}
            <strong>Precintos, Usuarios, Viajes, Conciliaciones y la Bitácora de Auditoría</strong>.
            <br /><br />
            <em>Se recomienda descargar este respaldo al finalizar cada mes.</em>
          </p>

          <Boton
            variante="primary"
            onClick={generarRespaldo}
            disabled={cargando}
            style={{
              padding: '15px 40px',
              fontSize: '18px',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(11, 95, 165, 0.3)'
            }}
          >
            {cargando ? 'Generando archivo...' : '📥 Descargar Respaldo Completo (.xlsx)'}
          </Boton>
        </div>
      </Card>
    </div>
  )
}