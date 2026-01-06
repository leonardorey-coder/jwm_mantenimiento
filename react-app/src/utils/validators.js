export function required(value, message = 'Este campo es requerido') {
  if (value === null || value === undefined || value === '') {
    return message;
  }
  if (Array.isArray(value) && value.length === 0) {
    return message;
  }
  return null;
}

export function email(value, message = 'Email invalido') {
  if (!value) return null;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(value) ? null : message;
}

export function minLength(min, message) {
  return (value) => {
    if (!value) return null;
    const msg = message || `Minimo ${min} caracteres`;
    return value.length >= min ? null : msg;
  };
}

export function maxLength(max, message) {
  return (value) => {
    if (!value) return null;
    const msg = message || `Maximo ${max} caracteres`;
    return value.length <= max ? null : msg;
  };
}

export function min(minVal, message) {
  return (value) => {
    if (value === null || value === undefined || value === '') return null;
    const msg = message || `El valor minimo es ${minVal}`;
    return Number(value) >= minVal ? null : msg;
  };
}

export function max(maxVal, message) {
  return (value) => {
    if (value === null || value === undefined || value === '') return null;
    const msg = message || `El valor maximo es ${maxVal}`;
    return Number(value) <= maxVal ? null : msg;
  };
}

export function pattern(regex, message = 'Formato invalido') {
  return (value) => {
    if (!value) return null;
    return regex.test(value) ? null : message;
  };
}

export function password(value, message = 'La contrasena debe tener al menos 6 caracteres') {
  if (!value) return null;
  if (value.length < 6) return message;
  return null;
}

export function passwordMatch(passwordField) {
  return (value, allValues) => {
    if (!value) return null;
    const password = allValues?.[passwordField];
    return value === password ? null : 'Las contrasenas no coinciden';
  };
}

export function numeric(value, message = 'Solo se permiten numeros') {
  if (!value) return null;
  return /^\d+$/.test(value) ? null : message;
}

export function alphanumeric(value, message = 'Solo se permiten letras y numeros') {
  if (!value) return null;
  return /^[a-zA-Z0-9]+$/.test(value) ? null : message;
}

export function date(value, message = 'Fecha invalida') {
  if (!value) return null;
  const d = new Date(value);
  return !isNaN(d.getTime()) ? null : message;
}

export function futureDate(value, message = 'La fecha debe ser futura') {
  if (!value) return null;
  const d = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d >= today ? null : message;
}

export function compose(...validators) {
  return (value, allValues) => {
    for (const validator of validators) {
      const error = validator(value, allValues);
      if (error) return error;
    }
    return null;
  };
}

export function validateForm(values, schema) {
  const errors = {};
  
  for (const [field, validators] of Object.entries(schema)) {
    const value = values[field];
    const validator = Array.isArray(validators) ? compose(...validators) : validators;
    const error = validator(value, values);
    
    if (error) {
      errors[field] = error;
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
