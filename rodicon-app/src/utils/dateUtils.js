/**
 * Utils para formatear fechas
 */

/**
 * Formatea fecha a formato local legible
 * @param {string|Date} date - Fecha a formatear
 * @param {boolean} includeTime - Si incluir hora
 * @returns {string} Fecha formateada
 */
export const formatDate = (date, includeTime = false) => {
  if (!date) return '-';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  
  const options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  
  return d.toLocaleString('es-ES', options);
};

/**
 * Obtiene fecha actual en formato ISO (YYYY-MM-DD)
 * @returns {string} Fecha actual
 */
export const getCurrentDate = () => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Calcula días transcurridos desde una fecha
 * @param {string|Date} date - Fecha inicial
 * @returns {number} Días transcurridos
 */
export const daysSince = (date) => {
  if (!date) return 0;
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return 0;
  
  const now = new Date();
  const diffTime = Math.abs(now - d);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

/**
 * Verifica si una fecha está vencida
 * @param {string|Date} date - Fecha límite
 * @returns {boolean} True si está vencida
 */
export const isOverdue = (date) => {
  if (!date) return false;
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return false;
  
  return d < new Date();
};

/**
 * Formatea duración en horas a texto legible
 * @param {number} hours - Horas
 * @returns {string} Duración formateada
 */
export const formatDuration = (hours) => {
  if (!hours || hours === 0) return '0h';
  
  if (hours < 24) {
    return `${hours}h`;
  }
  
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  if (remainingHours === 0) {
    return `${days}d`;
  }
  
  return `${days}d ${remainingHours}h`;
};
