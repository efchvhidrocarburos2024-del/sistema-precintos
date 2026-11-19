import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'
import { Card, Boton } from './ui'

// ... (Tus estilos cardStyle y btnHeaderStyle se mantienen igual)

const COLORS = ['#0B5FA5', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f43f5e', '#84cc16']

// Tooltip mejorado: Ordena de mayor a menor y muestra el total si es promedio
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    // Ordenar de mayor a menor
    const sortedPayload = [...payload].sort((a, b) => b.value - a.value);
    
    return (
      <div style={{ backgroundColor: '#1e293b', color: 'white', padding: '10px 15px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxHeight: '300px', overflowY: 'auto', minWidth: '200px' }}>
        <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#cbd5e1', fontWeight: 'bold', borderBottom: '1px solid #475569', paddingBottom: '5px' }}>{label}</p>
        {sortedPayload.map((entry, index) => (
          <div key={index} style={{ display: 'flex', justifyContent: 'space-between', gap: '15px', fontSize: '12px', marginBottom: '4px' }}>
            <span style={{ color: entry.color, fontWeight: 'bold' }}>● {entry.name}</span>
            <span style={{ fontWeight: 'bold' }}>S/ {Number(entry.value).toFixed(4)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function GestionPrecios({ setPantalla, rol }) {
  // ... (Tus estados se mantienen igual)
  const [vista, setVista] = useState('menu')
  const [archivos, setArchivos] = useState([])
  // ... (etc)
  
  // NUEVO ESTADO: Para manejar qué línea estamos inspeccionando en las tarjetas
  const [lineaActiva, setLineaActiva] = useState('');

  // ... (Tus funciones fetch, parseExcel, etc. se mantienen igual)

  const cargarTendencias = async () => {
    // ... (La misma lógica de cálculo que ya tienes)
    // Justo al final de la función, antes del catch, agregamos:
    
    // Cuando los datos cargan, establecemos la primera línea como activa por defecto
    const lineasArray = Array.from(nombresLineas);
    if (lineasArray.length > 0) {
      setLineaActiva(lineasArray[0]);
      actualizarMetricas(datosArray, lineasArray[0]);
    }
  };

  // NUEVA FUNCIÓN: Calcula las métricas para una línea específica
  const actualizarMetricas = (datos, nombreLinea) => {
    const precios = datos.map(d => d[nombreLinea]).filter(v => v !== undefined);
    if (precios.length === 0) return;
    
    const actual = precios[precios.length - 1];
    const anterior = precios.length > 1 ? precios[precios.length - 2] : actual;
    
    setMetricas({ 
      actual, 
      min: Math.min(...precios), 
      max: Math.max(...precios), 
      variacion: actual - anterior,
      lineaReferencia: nombreLinea
    });
  };

  // Manejador de clic en la leyenda del gráfico
  const handleLegendClick = (e) => {
    if (e && e.dataKey) {
      setLineaActiva(e.dataKey);
      actualizarMetricas(datosTendencia, e.dataKey);
    }
  };

  // ... (El resto de tus funciones se mantienen igual)

  if (vista === 'tendencias') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--gray-bg)' }}>
        {renderHeader()}
        <main style={{ padding: '40px 20px', maxWidth: '1100px', margin: '0 auto' }}>
          <Card style={{ padding: '30px', marginBottom: '20px' }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '22px', color: 'var(--text-dark)' }}>Análisis de Tendencias</h2>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>Hoja de Precio</label>
                <select value={hojaTendencia} onChange={(e) => setHojaTendencia(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', backgroundColor: '#1e293b', color: '#fff', fontWeight: 'bold' }}>
                  <option value="Precio Base">Precio Base</option>
                  <option value="Precios Planta Sin IGV">Precios Planta Sin IGV</option>
                  <option value="Precios Planta Con IGV">Precios Planta Con IGV</option>
                </select>
              </div>

              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>Planta</label>
                <select value={plantaSeleccionada} onChange={(e) => setPlantaSeleccionada(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', backgroundColor: '#1e293b', color: '#fff', fontWeight: 'bold' }}>
                  <option value="">Seleccione...</option>
                  {opcionesPlantas.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>Producto</label>
                <select value={productoSeleccionado} onChange={(e) => setProductoSeleccionado(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', backgroundColor: '#1e293b', color: '#fff', fontWeight: 'bold' }}>
                  <option value="">Seleccione...</option>
                  {opcionesProductos.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              
              <Boton variante="primary" onClick={cargarTendencias} disabled={cargandoTendencia || !plantaSeleccionada || !productoSeleccionado} style={{ height: '42px' }}>
                {cargandoTendencia ? 'Generando...' : '📈 Generar Gráfico'}
              </Boton>
            </div>
          </Card>

          {errorTendencia && (
            <Card style={{ padding: '20px', backgroundColor: '#fef2f2', border: '1px solid #f87171', marginBottom: '20px' }}>
              <p style={{ margin: 0, color: '#991b1b', fontWeight: 'bold' }}>⚠️ {errorTendencia}</p>
            </Card>
          )}

          {/* TARJETAS DINÁMICAS: Ahora muestran el nombre de la línea activa */}
          {metricas && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
              <Card style={{ padding: '20px', textAlign: 'center', borderTop: '4px solid var(--primary-blue)' }}>
                <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: 'var(--text-light)', fontWeight: 'bold', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  PRECIO ACTUAL<br/><span style={{ color: 'var(--primary-blue)', fontSize: '11px' }}>({metricas.lineaReferencia})</span>
                </p>
                <h3 style={{ margin: 0, fontSize: '24px', color: 'var(--primary-blue)' }}>S/ {metricas.actual.toFixed(4)}</h3>
              </Card>
              <Card style={{ padding: '20px', textAlign: 'center', borderTop: `4px solid ${metricas.variacion > 0 ? '#ef4444' : metricas.variacion < 0 ? '#10b981' : '#6b7280'}` }}>
                <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: 'var(--text-light)', fontWeight: 'bold', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>VARIACIÓN RECIENTE</p>
                <h3 style={{ margin: 0, fontSize: '24px', color: metricas.variacion > 0 ? '#ef4444' : metricas.variacion < 0 ? '#10b981' : '#6b7280' }}>
                  {metricas.variacion > 0 ? '+' : ''}{metricas.variacion.toFixed(4)}
                </h3>
              </Card>
              <Card style={{ padding: '20px', textAlign: 'center', borderTop: '4px solid #10b981' }}>
                <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: 'var(--text-light)', fontWeight: 'bold', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>PRECIO MÍNIMO</p>
                <h3 style={{ margin: 0, fontSize: '24px', color: '#166534' }}>S/ {metricas.min.toFixed(4)}</h3>
              </Card>
              <Card style={{ padding: '20px', textAlign: 'center', borderTop: '4px solid #ef4444' }}>
                <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: 'var(--text-light)', fontWeight: 'bold', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>PRECIO MÁXIMO</p>
                <h3 style={{ margin: 0, fontSize: '24px', color: '#991b1b' }}>S/ {metricas.max.toFixed(4)}</h3>
              </Card>
            </div>
          )}

          <Card style={{ padding: '20px', height: '500px', display: 'flex', flexDirection: 'column' }}>
            {cargandoTendencia ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>⏳</div>
                <p style={{ color: 'var(--primary-blue)', fontWeight: 'bold' }}>Analizando historial de archivos...</p>
              </div>
            ) : datosTendencia.length > 0 ? (
              <div style={{ width: '100%', height: '100%', minHeight: '350px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={datosTendencia} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    {/* FORMATO DE FECHA MEJORADO (Ej: 15 Sep) */}
                    <XAxis 
                      dataKey="fecha" 
                      tickFormatter={(val) => {
                        const [y, m, d] = val.split('-');
                        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                        return `${d} ${meses[parseInt(m)-1]}`;
                      }}
                      tick={{ fontSize: 12, fill: '#64748b' }} 
                      tickMargin={10} 
                    />
                    <YAxis domain={['auto', 'auto']} tickFormatter={(val) => val.toFixed(2)} tick={{ fontSize: 12, fill: '#64748b' }} width={60} />
                    <Tooltip content={<CustomTooltip />} />
                    {/* LEYENDA INTERACTIVA */}
                    <Legend 
                      onClick={handleLegendClick}
                      wrapperStyle={{ fontSize: '12px', paddingTop: '15px', cursor: 'pointer' }} 
                    />
                    
                    {lineasDinamicas.map((linea, index) => (
                      <Line 
                        key={linea}
                        type="monotone" 
                        dataKey={linea} 
                        name={linea} 
                        stroke={COLORS[index % COLORS.length]} 
                        strokeWidth={lineaActiva === linea ? 4 : 2} // Resalta la línea activa
                        strokeOpacity={lineaActiva === linea ? 1 : 0.5} // Difumina las demás
                        dot={{ r: 3, strokeWidth: 2, stroke: '#fff' }} 
                        activeDot={{ r: 6 }} 
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-light)' }}>
                <div style={{ fontSize: '50px', marginBottom: '15px' }}>📉</div>
                <h3 style={{ margin: 0 }}>Sin datos para mostrar</h3>
                <p>Selecciona una planta y un producto para generar el gráfico.</p>
              </div>
            )}
          </Card>
        </main>
      </div>
    )
  }

  // ... (El resto de las vistas: menu, cargar, auditoria, comparar se mantienen exactamente igual)
}