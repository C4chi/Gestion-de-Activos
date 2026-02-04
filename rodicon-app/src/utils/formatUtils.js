/**
 * Utils para formatear números y moneda
 */

/**
 * Formatea número como moneda chilena (CLP)
 * @param {number} amount - Monto a formatear
 * @returns {string} Monto formateado
 */
export const formatCurrency = (amount) => {
  if (amount == null || isNaN(amount)) return '$0';
  
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Formatea número con separadores de miles
 * @param {number} num - Número a formatear
 * @returns {string} Número formateado
 */
export const formatNumber = (num) => {
  if (num == null || isNaN(num)) return '0';
  
  return new Intl.NumberFormat('es-CL').format(num);
};

/**
 * Parsea string de moneda a número
 * @param {string} currencyString - String con formato de moneda
 * @returns {number} Número parseado
 */
export const parseCurrency = (currencyString) => {
  if (!currencyString) return 0;
  
  // Eliminar símbolos y separadores
  const cleaned = currencyString.toString().replace(/[$.]/g, '').replace(/,/g, '');
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Calcula porcentaje
 * @param {number} value - Valor
 * @param {number} total - Total
 * @returns {number} Porcentaje (0-100)
 */
export const calculatePercentage = (value, total) => {
  if (!total || total === 0) return 0;
  
  return Math.round((value / total) * 100);
};

/**
 * Formatea porcentaje con símbolo %
 * @param {number} value - Valor
 * @param {number} total - Total
 * @returns {string} Porcentaje formateado
 */
export const formatPercentage = (value, total) => {
  return `${calculatePercentage(value, total)}%`;
};
