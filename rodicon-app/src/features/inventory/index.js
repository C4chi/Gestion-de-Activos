/**
 * Barrel export para el módulo de Inventario
 * Facilita imports: import { InventoryView, AssetCard } from '@/features/inventory'
 */

// Componentes principales
export { default as InventoryView } from './InventoryView';
export { default as AssetDetailSidebar } from './AssetDetailSidebar';
export { default as NewAssetModal } from './NewAssetModal';

// Re-exportar desde la carpeta actual si están ahí
// Si no existen aún, se pueden crear después
