/**
 * Constantes del sistema RODICON
 */

// Estados de assets
export const ASSET_STATUS = {
  DISPONIBLE: 'Disponible',
  EN_USO: 'En Uso',
  EN_MANTENIMIENTO: 'En Mantenimiento',
  FUERA_SERVICIO: 'Fuera de Servicio',
  EN_REPARACION: 'En Reparación',
};

// Estados de purchase orders
export const PURCHASE_STATUS = {
  PENDIENTE: 'PENDIENTE',
  APROBADO: 'APROBADO',
  EN_COTIZACION: 'EN_COTIZACION',
  RECHAZADO: 'RECHAZADO',
  COMPLETADO: 'COMPLETADO',
};

// Roles de usuarios
export const USER_ROLES = {
  ADMIN: 'ADMIN',
  SUPERVISOR: 'SUPERVISOR',
  COMPRAS: 'COMPRAS',
  SEGURIDAD: 'SEGURIDAD',
  MECANICO: 'MECANICO',
  OPERADOR: 'OPERADOR',
};

// Severidad de safety reports
export const SAFETY_SEVERITY = {
  BAJA: 'BAJA',
  MEDIA: 'MEDIA',
  ALTA: 'ALTA',
  CRITICA: 'CRITICA',
};

// Tipos de mantenimiento
export const MAINTENANCE_TYPE = {
  PREVENTIVO: 'PREVENTIVO',
  CORRECTIVO: 'CORRECTIVO',
  PREDICTIVO: 'PREDICTIVO',
  EMERGENCIA: 'EMERGENCIA',
};

// Estados de work orders
export const WORK_ORDER_STATUS = {
  ABIERTA: 'ABIERTA',
  EN_PROGRESO: 'EN_PROGRESO',
  PAUSADA: 'PAUSADA',
  COMPLETADA: 'COMPLETADA',
  CANCELADA: 'CANCELADA',
};

// Prioridades
export const PRIORITY = {
  BAJA: 'BAJA',
  MEDIA: 'MEDIA',
  ALTA: 'ALTA',
  URGENTE: 'URGENTE',
};

// Colores por estado (Tailwind classes)
export const STATUS_COLORS = {
  // Purchase orders
  PENDIENTE: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  APROBADO: 'bg-green-100 text-green-800 border-green-200',
  EN_COTIZACION: 'bg-blue-100 text-blue-800 border-blue-200',
  RECHAZADO: 'bg-red-100 text-red-800 border-red-200',
  COMPLETADO: 'bg-gray-100 text-gray-800 border-gray-200',
  
  // Assets
  'Disponible': 'bg-green-100 text-green-800',
  'En Uso': 'bg-blue-100 text-blue-800',
  'En Mantenimiento': 'bg-yellow-100 text-yellow-800',
  'Fuera de Servicio': 'bg-red-100 text-red-800',
  'En Reparación': 'bg-orange-100 text-orange-800',
  
  // Work orders
  ABIERTA: 'bg-blue-100 text-blue-800',
  EN_PROGRESO: 'bg-purple-100 text-purple-800',
  PAUSADA: 'bg-yellow-100 text-yellow-800',
  COMPLETADA: 'bg-green-100 text-green-800',
  CANCELADA: 'bg-gray-100 text-gray-800',
  
  // Severity
  BAJA: 'bg-green-100 text-green-800',
  MEDIA: 'bg-yellow-100 text-yellow-800',
  ALTA: 'bg-orange-100 text-orange-800',
  CRITICA: 'bg-red-100 text-red-800',
};

// Íconos por tipo (usando emojis o nombres de íconos)
export const STATUS_ICONS = {
  PENDIENTE: '⏳',
  APROBADO: '✅',
  EN_COTIZACION: '💰',
  RECHAZADO: '❌',
  COMPLETADO: '✔️',
  ABIERTA: '📋',
  EN_PROGRESO: '⚙️',
  PAUSADA: '⏸️',
  COMPLETADA: '✅',
  CANCELADA: '🚫',
};

// Límites de paginación
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
};

// Timeouts (en ms)
export const TIMEOUTS = {
  TOAST_DURATION: 3000,
  DEBOUNCE_SEARCH: 300,
  AUTO_SAVE: 5000,
};
