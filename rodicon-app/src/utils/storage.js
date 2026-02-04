/**
 * Utilidades para persistir datos en localStorage
 * Maneja serialización, expiración y fallbacks
 */

const PREFIX = 'rodicon_';

/**
 * Guardar en localStorage de forma segura
 */
export const saveToStorage = (key, value, expiresIn = null) => {
  try {
    const item = {
      value,
      timestamp: Date.now(),
      expiresIn, // tiempo en ms
    };
    localStorage.setItem(PREFIX + key, JSON.stringify(item));
    return true;
  } catch (error) {
    console.error('Error saving to localStorage:', error);
    return false;
  }
};

/**
 * Obtener de localStorage con validación de expiración
 */
export const getFromStorage = (key, defaultValue = null) => {
  try {
    const itemStr = localStorage.getItem(PREFIX + key);
    if (!itemStr) return defaultValue;

    const item = JSON.parse(itemStr);
    
    // Verificar expiración
    if (item.expiresIn) {
      const elapsed = Date.now() - item.timestamp;
      if (elapsed > item.expiresIn) {
        localStorage.removeItem(PREFIX + key);
        return defaultValue;
      }
    }

    return item.value;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return defaultValue;
  }
};

/**
 * Remover de localStorage
 */
export const removeFromStorage = (key) => {
  try {
    localStorage.removeItem(PREFIX + key);
    return true;
  } catch (error) {
    console.error('Error removing from localStorage:', error);
    return false;
  }
};

/**
 * Limpiar todos los datos expirados
 */
export const cleanExpiredStorage = () => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(PREFIX)) {
        const shortKey = key.replace(PREFIX, '');
        getFromStorage(shortKey); // Esto eliminará automáticamente si expiró
      }
    });
  } catch (error) {
    console.error('Error cleaning storage:', error);
  }
};

/**
 * Guardar preferencias del usuario
 */
export const saveUserPreferences = (preferences) => {
  return saveToStorage('user_preferences', preferences);
};

/**
 * Obtener preferencias del usuario
 */
export const getUserPreferences = () => {
  return getFromStorage('user_preferences', {
    filter: 'ALL',
    locationFilter: '',
    sidebarCollapsed: false,
  });
};

/**
 * Guardar estado de filtros/búsqueda
 */
export const saveSearchState = (searchState) => {
  // Expira en 1 hora
  return saveToStorage('search_state', searchState, 60 * 60 * 1000);
};

/**
 * Obtener estado de filtros/búsqueda
 */
export const getSearchState = () => {
  return getFromStorage('search_state', {
    search: '',
    filter: 'ALL',
    locationFilter: '',
  });
};

// Limpiar storage al cargar la app
if (typeof window !== 'undefined') {
  cleanExpiredStorage();
}
