/**
 * Barrel export para el módulo de Compras
 */

// Componentes
export { default as PurchasingManagement } from './PurchasingManagement';
export { default as RequisitionModal } from './RequisitionModal';
export { default as PurchaseOrderPDF } from './PurchaseOrderPDF';

// Sub-componentes
export { default as PurchaseCard } from './components/PurchaseCard';
export { default as QuotationModal } from './components/QuotationModal';
export { default as CommentModal } from './components/CommentModal';

// Hook
export { default as usePurchasingWorkflow } from './hooks/usePurchasingWorkflow';
