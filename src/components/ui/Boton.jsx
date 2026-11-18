export default function Boton({ 
  children, 
  onClick, 
  variante = 'primary', 
  tipo = 'button', 
  disabled = false,
  tamano = 'md',
  className = '',
  ...props 
}) {
  const clases = `btn btn-${variante} btn-${tamano} ${className}`.trim()
  
  return (
    <button 
      type={tipo} 
      onClick={onClick} 
      disabled={disabled}
      className={clases}
      {...props}
    >
      {children}
    </button>
  )
}