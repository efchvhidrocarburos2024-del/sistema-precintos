export default function Tabla({ 
  columnas = [], 
  children, 
  vacio = 'No hay datos para mostrar',
  hayDatos = true 
}) {
  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            {columnas.map((col, i) => (
              <th key={i}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hayDatos ? (
            children
          ) : (
            <tr>
              <td colSpan={columnas.length} className="table-empty">
                {vacio}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}