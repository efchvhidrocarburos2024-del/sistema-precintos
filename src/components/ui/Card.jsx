export default function Card({ children, titulo, className = '' }) {
  return (
    <div className={`card ${className}`}>
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