export default function Modal({ 
  abierto, 
  onCerrar, 
  titulo, 
  children, 
  ancho = '500px' 
}) {
  if (!abierto) return null
  
  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div 
        className="modal" 
        style={{ maxWidth: ancho }} 
        onClick={(e) => e.stopPropagation()}
      >
        {titulo && (
          <div className="modal-header">
            <h3 className="modal-title">{titulo}</h3>
            <button className="modal-close" onClick={onCerrar}>✕</button>
          </div>
        )}
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  )
}