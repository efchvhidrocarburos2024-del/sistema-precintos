export default function PageHeader({ titulo, children }) {
  return (
    <div className="page-header">
      <h1 className="page-title">{titulo}</h1>
      {children && <div>{children}</div>}
    </div>
  )
}