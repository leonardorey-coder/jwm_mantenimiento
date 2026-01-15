import { forwardRef } from 'react';
import clsx from 'clsx';
import './FormInput.css';

const FormInput = forwardRef(function FormInput({
  label,
  type = 'text',
  error,
  hint,
  icon: Icon,
  className = '',
  required = false,
  ...props
}, ref) {
  const id = props.id || props.name || `input-${Math.random().toString(36).slice(2)}`;

  return (
    <div className={clsx('form-field', className, { 'has-error': error })}>
      {label && (
        <label htmlFor={id} className="form-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      <div className="input-wrapper">
        {Icon && <Icon size={18} className="input-icon" />}
        <input
          ref={ref}
          type={type}
          id={id}
          className={clsx('form-input', { 'has-icon': Icon })}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          required={required}
          {...props}
        />
      </div>
      {error && <p id={`${id}-error`} className="form-error">{error}</p>}
      {hint && !error && <p id={`${id}-hint`} className="form-hint">{hint}</p>}
    </div>
  );
});

export default FormInput;

export const FormTextarea = forwardRef(function FormTextarea({
  label,
  error,
  hint,
  className = '',
  required = false,
  rows = 3,
  ...props
}, ref) {
  const id = props.id || props.name || `textarea-${Math.random().toString(36).slice(2)}`;

  return (
    <div className={clsx('form-field', className, { 'has-error': error })}>
      {label && (
        <label htmlFor={id} className="form-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
        className="form-input form-textarea"
        rows={rows}
        aria-invalid={!!error}
        required={required}
        {...props}
      />
      {error && <p className="form-error">{error}</p>}
      {hint && !error && <p className="form-hint">{hint}</p>}
    </div>
  );
});

export const FormSelect = forwardRef(function FormSelect({
  label,
  error,
  hint,
  icon: Icon,
  className = '',
  required = false,
  options = [],
  placeholder,
  children,
  ...props
}, ref) {
  const id = props.id || props.name || `select-${Math.random().toString(36).slice(2)}`;

  return (
    <div className={clsx('form-field', className, { 'has-error': error })}>
      {label && (
        <label htmlFor={id} className="form-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      <div className="select-wrapper">
        {Icon && <Icon size={18} className="input-icon" />}
        <select
          ref={ref}
          id={id}
          className={clsx('form-select', { 'has-icon': Icon })}
          aria-invalid={!!error}
          required={required}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {children || options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      {error && <p className="form-error">{error}</p>}
      {hint && !error && <p className="form-hint">{hint}</p>}
    </div>
  );
});

export function FormGroup({ label, className = '', children }) {
  return (
    <fieldset className={clsx('form-group', className)}>
      {label && <legend className="form-group-label">{label}</legend>}
      {children}
    </fieldset>
  );
}

export function FormRow({ className = '', cols = 2, children }) {
  return (
    <div className={clsx('form-row', className)} style={{ '--cols': cols }}>
      {children}
    </div>
  );
}
