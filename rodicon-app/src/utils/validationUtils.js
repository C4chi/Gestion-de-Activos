/**
 * Utils de validación de formularios
 */

/**
 * Valida que un campo no esté vacío
 * @param {any} value - Valor a validar
 * @param {string} fieldName - Nombre del campo (para mensaje de error)
 * @returns {object} { valid: boolean, error: string }
 */
export const validateRequired = (value, fieldName = 'Campo') => {
  const isEmpty = value === null || value === undefined || value === '' || 
                 (typeof value === 'string' && value.trim() === '');
  
  return {
    valid: !isEmpty,
    error: isEmpty ? `${fieldName} es requerido` : null,
  };
};

/**
 * Valida email
 * @param {string} email - Email a validar
 * @returns {object} { valid: boolean, error: string }
 */
export const validateEmail = (email) => {
  if (!email) return { valid: false, error: 'Email es requerido' };
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email);
  
  return {
    valid: isValid,
    error: isValid ? null : 'Email inválido',
  };
};

/**
 * Valida número positivo
 * @param {any} value - Valor a validar
 * @param {string} fieldName - Nombre del campo
 * @returns {object} { valid: boolean, error: string }
 */
export const validatePositiveNumber = (value, fieldName = 'Campo') => {
  const num = parseFloat(value);
  const isValid = !isNaN(num) && num > 0;
  
  return {
    valid: isValid,
    error: isValid ? null : `${fieldName} debe ser un número positivo`,
  };
};

/**
 * Valida longitud de string
 * @param {string} value - String a validar
 * @param {number} min - Longitud mínima
 * @param {number} max - Longitud máxima
 * @param {string} fieldName - Nombre del campo
 * @returns {object} { valid: boolean, error: string }
 */
export const validateLength = (value, min = 0, max = Infinity, fieldName = 'Campo') => {
  if (!value) return { valid: false, error: `${fieldName} es requerido` };
  
  const length = value.toString().length;
  
  if (length < min) {
    return {
      valid: false,
      error: `${fieldName} debe tener al menos ${min} caracteres`,
    };
  }
  
  if (length > max) {
    return {
      valid: false,
      error: `${fieldName} no puede exceder ${max} caracteres`,
    };
  }
  
  return { valid: true, error: null };
};

/**
 * Valida múltiples campos y retorna todos los errores
 * @param {object} validations - Objeto con validaciones { fieldName: validationResult }
 * @returns {object} { valid: boolean, errors: object }
 */
export const validateForm = (validations) => {
  const errors = {};
  let isValid = true;
  
  Object.entries(validations).forEach(([field, validation]) => {
    if (!validation.valid) {
      errors[field] = validation.error;
      isValid = false;
    }
  });
  
  return { valid: isValid, errors };
};
