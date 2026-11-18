export default function Select({ 
  label, 
  value, 
  onChange, 
  options = [],
  placeholder = 'Seleccione...',
  required = false,
  disabled = false,
  id,
  ...props 
}) {
  const selectId = id || `select-${label?.toLowerCase().replace(/\s+/g, '-') || Math.random()}`
  
  return (
    <div className="form-group">
      {label && (
        <label htmlFor={selectId} className="form-label">
          {label} {required && <span className="required">*</span>}
        </label>
      )}
      <select
        id={selectId}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className="form-select"
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt, i) => (
          <option key={opt.value ?? i} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}