/**
 * Barrel export para el módulo de Seguridad HSE
 */

// Componentes principales
export { default as SafetyCenter } from './SafetyCenter';
export { default as SafetyFormModal } from './SafetyFormModal';

// Sub-componentes
export { default as SafetyDashboard } from './components/SafetyDashboard';
export { default as SafetyReportDetail } from './components/SafetyReportDetail';

// Hook
export { default as useSafetyWorkflow } from './hooks/useSafetyWorkflow';
