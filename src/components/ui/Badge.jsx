export default function Badge({ children, variante = 'info' }) {
  return (
    <span className={`badge badge-${variante}`}>
      {children}
    </span>
  )
}