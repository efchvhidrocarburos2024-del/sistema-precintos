export default function Card({ children, titulo, className = '', style, ...props }) {
  return (
    <div 
      className={`card ${className}`} 
      style={{ cursor: props.onClick ? 'pointer' : 'default', ...style }} // Añade cursor pointer si tiene onClick
      {...props} // <-- ESTO PASA EL onClick Y CUALQUIER OTRO EVENTO AL DIV
    >
      {titulo && (
        <div className="card-header">
          <h3 className="card-title">{titulo}</h3>
        </div>
      )}
      <div className="card-body">
        {children}
      </div>
    </div>
  )
}