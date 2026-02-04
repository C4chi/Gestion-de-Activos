/**
 * Utilidades de validación robusta
 * Maneja null, undefined, y valores vacíos de forma segura
 */

/**
 * Convierte un valor a string de forma segura
 */
export const safeString = (value) => {
  return (value ?? '').toString().trim();
};

/**
 * Compara strings de forma segura (case-insensitive)
 */
export const safeIncludes = (text, searchTerm) => {
  return safeString(text).toLowerCase().includes(safeString(searchTerm).toLowerCase());
};

/**
 * Valida que un campo no esté vacío
 */
export const isNotEmpty = (value) => {
  return value !== null && value !== undefined && value !== '';
};

/**
 * Obtiene un valor seguro con fallback
 */
export const getSafeValue = (value, fallback = '-') => {
  return isNotEmpty(value) ? value : fallback;
};

/**
 * Valida un email básicamente
 */
export const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(safeString(email));
};

/**
 * Valida que sea un número
 */
export const isValidNumber = (value) => {
  return !isNaN(Number(value)) && value !== '';
};

/**
 * Valida una fecha en formato YYYY-MM-DD
 */
export const isValidDate = (dateString) => {
  if (!isNotEmpty(dateString)) return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

/**
 * Sanea un objeto, removiendo valores null/undefined
 */
export const sanitizeObject = (obj) => {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      acc[key] = value;
    }
    return acc;
  }, {});
};

/**
 * Valida que un asset tenga datos básicos válidos
 */
export const isValidAsset = (asset) => {
  return (
    isNotEmpty(asset?.id) &&
    isNotEmpty(asset?.ficha)
  );
};
