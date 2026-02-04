/**
 * Barrel export para el módulo de Taller/Mantenimiento
 */

// Componentes principales
export { default as WorkshopMonitor } from './WorkshopMonitor';
export { default as UpdateWorkshopModal } from './UpdateWorkshopModal';
export { default as PreventiveMtoModal } from './PreventiveMtoModal';
export { default as CorrectiveLogModal } from './CorrectiveLogModal';
export { default as MtoDetailModal } from './MtoDetailModal';

// Sub-componentes
export { default as WorkshopDashboard } from './components/WorkshopDashboard';
export { default as WorkOrderCard } from './components/WorkOrderCard';
export { default as CreateWorkOrderModal } from './components/CreateWorkOrderModal';
export { default as UpdateWorkStatusModal } from './components/UpdateWorkStatusModal';

// Hook
export { default as useWorkshopWorkflow } from './hooks/useWorkshopWorkflow';
