/**
 * Utils para manejo de arrays
 */

/**
 * Filtra array por búsqueda en múltiples campos
 * @param {Array} items - Array a filtrar
 * @param {string} searchTerm - Término de búsqueda
 * @param {Array<string>} fields - Campos donde buscar
 * @returns {Array} Array filtrado
 */
export const filterBySearch = (items, searchTerm, fields) => {
  if (!searchTerm || !searchTerm.trim()) return items;
  
  const term = searchTerm.toLowerCase().trim();
  
  return items.filter(item => {
    return fields.some(field => {
      const value = getNestedValue(item, field);
      return value && value.toString().toLowerCase().includes(term);
    });
  });
};

/**
 * Obtiene valor de un campo anidado (ej: 'user.name')
 * @param {object} obj - Objeto
 * @param {string} path - Path al campo (ej: 'user.name')
 * @returns {any} Valor encontrado
 */
export const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

/**
 * Ordena array por campo
 * @param {Array} items - Array a ordenar
 * @param {string} field - Campo por el cual ordenar
 * @param {string} direction - 'asc' o 'desc'
 * @returns {Array} Array ordenado
 */
export const sortBy = (items, field, direction = 'asc') => {
  const sorted = [...items].sort((a, b) => {
    const aVal = getNestedValue(a, field);
    const bVal = getNestedValue(b, field);
    
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    
    if (typeof aVal === 'string') {
      return aVal.localeCompare(bVal);
    }
    
    return aVal - bVal;
  });
  
  return direction === 'desc' ? sorted.reverse() : sorted;
};

/**
 * Agrupa array por campo
 * @param {Array} items - Array a agrupar
 * @param {string} field - Campo por el cual agrupar
 * @returns {object} Objeto con grupos { key: [items] }
 */
export const groupBy = (items, field) => {
  return items.reduce((groups, item) => {
    const key = getNestedValue(item, field) || 'Sin categoría';
    
    if (!groups[key]) {
      groups[key] = [];
    }
    
    groups[key].push(item);
    return groups;
  }, {});
};

/**
 * Cuenta items por valor de campo
 * @param {Array} items - Array a contar
 * @param {string} field - Campo a contar
 * @returns {object} Objeto con conteos { key: count }
 */
export const countBy = (items, field) => {
  return items.reduce((counts, item) => {
    const key = getNestedValue(item, field) || 'Sin categoría';
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
};

/**
 * Remueve duplicados de array por campo
 * @param {Array} items - Array con duplicados
 * @param {string} field - Campo único
 * @returns {Array} Array sin duplicados
 */
export const uniqueBy = (items, field) => {
  const seen = new Set();
  
  return items.filter(item => {
    const value = getNestedValue(item, field);
    
    if (seen.has(value)) {
      return false;
    }
    
    seen.add(value);
    return true;
  });
};

/**
 * Pagina array
 * @param {Array} items - Array a paginar
 * @param {number} page - Número de página (1-indexed)
 * @param {number} pageSize - Tamaño de página
 * @returns {object} { items: Array, totalPages: number, currentPage: number }
 */
export const paginate = (items, page = 1, pageSize = 20) => {
  const totalPages = Math.ceil(items.length / pageSize);
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  
  return {
    items: items.slice(startIndex, endIndex),
    totalPages,
    currentPage,
    totalItems: items.length,
  };
};
