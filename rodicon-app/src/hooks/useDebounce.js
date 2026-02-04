import { useState, useEffect } from 'react';

/**
 * Hook para debounce de valores
 * Útil para búsquedas, filtros y otros inputs frecuentes
 * 
 * @param {*} value - Valor a debounce
 * @param {number} delay - Delay en ms (default: 300)
 * @returns {*} Valor debounced
 */
export const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};
