import { useState, useEffect, useCallback } from 'react';

/**
 * Hook de caché con Time-To-Live (TTL)
 * Reduce llamadas innecesarias a la base de datos
 * 
 * @param {string} key - Clave única para el caché
 * @param {Function} fetchFn - Función que obtiene los datos
 * @param {number} ttl - Tiempo de vida en ms (default: 5 min)
 * @returns {Object} { data, loading, error, refresh, invalidate }
 */
export const useCache = (key, fetchFn, ttl = 5 * 60 * 1000) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(0);

  // Verificar si el caché es válido
  const isCacheValid = useCallback(() => {
    if (!data || !lastFetch) return false;
    return Date.now() - lastFetch < ttl;
  }, [data, lastFetch, ttl]);

  // Obtener datos (usa caché si es válido)
  const fetch = useCallback(async (forceRefresh = false) => {
    // Si el caché es válido y no es refresh forzado, usar caché
    if (!forceRefresh && isCacheValid()) {
      console.log(`✅ Cache hit: ${key}`);
      return data;
    }

    console.log(`🔄 Cache miss: ${key} - fetching fresh data`);
    setLoading(true);
    setError(null);

    try {
      const result = await fetchFn();
      setData(result);
      setLastFetch(Date.now());
      setLoading(false);
      return result;
    } catch (err) {
      console.error(`❌ Cache error for ${key}:`, err);
      setError(err);
      setLoading(false);
      throw err;
    }
  }, [key, fetchFn, data, isCacheValid]);

  // Refrescar datos (ignorando caché)
  const refresh = useCallback(() => {
    return fetch(true);
  }, [fetch]);

  // Invalidar caché
  const invalidate = useCallback(() => {
    setData(null);
    setLastFetch(0);
  }, []);

  // Fetch inicial si no hay datos
  useEffect(() => {
    if (!data) {
      fetch();
    }
  }, []);

  return {
    data,
    loading,
    error,
    fetch,
    refresh,
    invalidate,
    isCached: isCacheValid(),
  };
};
