import React, { useState, useMemo } from 'react';
import { useAppContext } from './AppContext'; // Usar contexto centralizado
import { Toaster } from 'react-hot-toast';

// Componentes de Layout
import { Sidebar } from './Sidebar';
import { PinModal } from './PinModal';
import { FullScreenModal } from './FullScreenModal';

// Vistas Principales
import { InventoryView } from './InventoryView';
import { WorkshopMonitor } from './WorkshopMonitor';
import { PurchasingManagement } from './PurchasingManagement';
import { SafetyCenter } from './SafetyCenter';
import { AssetDetailSidebar } from './AssetDetailSidebar';

// Modales de Formularios
import { NewAssetModal } from './NewAssetModal';
import { RequisitionModal } from './RequisitionModal';
import { CloseOrderModal } from './CloseOrderModal';
import { SafetyFormModal } from './SafetyFormModal';
import { PreventiveMtoModal } from './PreventiveMtoModal';
import { CorrectiveLogModal } from './CorrectiveLogModal';
import { UpdateWorkshopModal } from './UpdateWorkshopModal';
import { MtoDetailModal } from './MtoDetailModal';
import { CommentModal } from './CommentModal';
import { AssetAdminPanel } from './AssetAdminPanel';

// NOTA: Otros componentes como FullScreenModal, StatusBadge, etc.,
// ahora son importados directamente por los componentes que los usan.

export default function App() {
  // --- ESTADO Y LÓGICA DEL CONTEXTO GLOBAL (Sin prop drilling) ---
  const {
    user,
    assets,
    purchases,
    safetyReports,
    mtoLogs,
    loading,
    fetchAllData,
    handlePinSubmit,
    submitNewAsset,
    submitRequisition,
    handlePurchaseStatus,
    submitMaintenanceLog,
    submitSafetyReport,
    submitSafety,
    submitInitialCorrectiveLog,
    updateWorkshopInfo,
    submitCloseOrder,
    logout
  } = useAppContext();

  // --- ESTADO LOCAL DE LA UI ---
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [activeOverlay, setActiveOverlay] = useState(null);
  const [activeModal, setActiveModal] = useState(user ? null : 'PIN');
  const [detailSidebarOpen, setDetailSidebarOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [tempAction, setTempAction] = useState(null);
  const [tempPurchase, setTempPurchase] = useState(null);
  const [viewingLog, setViewingLog] = useState(null);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);

  // --- MANEJO DE ACCIONES PROTEGIDAS ---
  const protectedAction = (fn) => {
    if (user) {
      fn(user);
    } else {
      setTempAction({ fn }); // Guardamos la acción para ejecutarla después del login
      setActiveModal('PIN');
    }
  };

  const onPinSuccess = async (loggedInUser) => {
    setActiveModal(null);
    if (tempAction) {
      await tempAction.fn(loggedInUser);
      setTempAction(null);
    }
  };

  const handleAssetSelect = (asset) => {
    setSelectedAsset(asset);
    setDetailSidebarOpen(true);
  };

  const handleOpenModal = (modalType, data = null) => {
    if (modalType === 'MTO_DETAIL') {
      setViewingLog(data);
    }
    protectedAction(() => {
      setActiveModal(modalType);
    });
  };

  // --- FILTROS Y CÁLCULOS MEMOIZADOS ---
  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      // Excluir activos no visibles y vendidos
      if (a.visible === 0 || a.status === 'VENDIDO') return false;
      const match = (a.ficha + a.marca + a.modelo).toLowerCase().includes(search.toLowerCase());

      if (filter === 'NO_OP') {
        return match && ['NO DISPONIBLE', 'EN TALLER', 'ESPERA REPUESTO', 'MTT PREVENTIVO'].includes(a.status);
      }

      if (filter === 'WARN') {
        if (!a.fecha_de_vencimiento_de_seguro) return false;
        const d = new Date(a.fecha_de_vencimiento_de_seguro);
        const today = new Date();
        const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
        return match && diff >= 0 && diff <= 30;
      }

      if (filter === 'EXP') {
        if (!a.fecha_de_vencimiento_de_seguro) return false;
        return match && new Date(a.fecha_de_vencimiento_de_seguro) < new Date();
      }

      return match;
    });
  }, [assets, search, filter]);

  // KPIs calculados
  const kpis = useMemo(() => ({
    total: assets.filter(a => a.status !== 'VENDIDO').length,
    noOp: assets.filter(a => a.status !== 'VENDIDO' && ['NO DISPONIBLE', 'EN TALLER', 'ESPERA REPUESTO', 'MTT PREVENTIVO'].includes(a.status)).length,
    warn: assets.filter(a => {
      if (a.status === 'VENDIDO' || !a.fecha_de_vencimiento_de_seguro) return false;
      const d = new Date(a.fecha_de_vencimiento_de_seguro);
      const today = new Date();
      const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 30;
    }).length,
    exp: assets.filter(a => a.status !== 'VENDIDO' && a.fecha_de_vencimiento_de_seguro && new Date(a.fecha_de_vencimiento_de_seguro) < new Date()).length
  }), [assets]);

  // --- RENDER ---

  if (activeModal === 'PIN') {
    return <PinModal onSubmit={handlePinSubmit} onSuccess={onPinSuccess} />;
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      <Toaster position="top-right" reverseOrder={false} />

      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onMenuClick={(overlay) => setActiveOverlay(overlay)}
        onNewAsset={() => protectedAction(() => setActiveModal('NEW_ASSET'))}
        onRefresh={fetchAllData}
        onLogout={() => { logout(); setActiveModal('PIN'); }}
        protectedAction={protectedAction}
        onAdminPanel={() => setAdminPanelOpen(true)}
        isAdmin={user?.rol === 'ADMIN'}
      />

      <InventoryView
        kpis={kpis}
        filter={filter}
        setFilter={setFilter}
        search={search}
        setSearch={setSearch}
        filteredAssets={filteredAssets}
        onAssetSelect={handleAssetSelect}
      />

      {/* --- PANTALLAS SUPERPUESTAS (MODALS GRANDES) --- */}
      {activeOverlay === 'WORKSHOP' && (
        <WorkshopMonitor
          assets={assets}
          onClose={() => setActiveOverlay(null)}
          onSelectAsset={(asset) => setSelectedAsset(asset)}
          onOpenModal={(modal) => setActiveModal(modal)}
        />
      )}

      {activeOverlay === 'PURCHASING' && (
        <PurchasingManagement
          onClose={() => setActiveOverlay(null)}
        />
      )}

      {activeOverlay === 'SAFETY' && (
        <SafetyCenter
          onClose={() => setActiveOverlay(null)}
        />
      )}

      {activeOverlay === 'METRICS' && (
        <FullScreenModal title="📊 Métricas y Reportes" color="blue" onClose={() => setActiveOverlay(null)}>
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-2xl font-bold text-gray-700 mb-2">Módulo de Métricas</h3>
            <p className="text-gray-500 mb-6">Dashboard de KPIs y reportes analíticos</p>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              Este módulo mostrará gráficas, estadísticas y reportes de:
              <br />• Activos por estado
              <br />• Órdenes de compra completadas
              <br />• Reportes HSE por prioridad
              <br />• Mantenimientos realizados
            </p>
          </div>
        </FullScreenModal>
      )}

      {/* --- SIDEBAR DETALLE (RIGHT) --- */}
      {detailSidebarOpen && selectedAsset && (
        <AssetDetailSidebar
          asset={selectedAsset}
          mtoLogs={mtoLogs.filter(log => log.ficha === selectedAsset.ficha)}
          safetyReports={safetyReports.filter(report => report.ficha === selectedAsset.ficha)}
          onClose={() => setDetailSidebarOpen(false)}
          onOpenModal={handleOpenModal}
        />
      )}

      {/* --- MODALES PEQUEÑOS (FORMS) --- */}
      {activeModal === 'NEW_ASSET' && (
        <NewAssetModal
          onClose={() => setActiveModal(null)}
          onSubmit={submitNewAsset}
          isAdmin={user?.rol === 'ADMIN'}
        />
      )}

      {activeModal === 'REQ' && (
        <RequisitionModal
          asset={selectedAsset}
          onClose={() => setActiveModal(null)}
          onSubmit={(...args) => protectedAction((u) => submitRequisition(...args, selectedAsset, u))}
        />
      )}

      {activeModal === 'CLOSE_ORDER' && (
        <CloseOrderModal
          asset={selectedAsset}
          onClose={() => setActiveModal(null)}
          onSubmit={(...args) => protectedAction((u) => submitCloseOrder(...args, selectedAsset, u))}
        />
      )}

      {activeModal === 'SAFETY_FORM' && (
        <SafetyFormModal
          asset={selectedAsset}
          onClose={() => setActiveModal(null)}
          onSubmit={(...args) => protectedAction((u) => submitSafety(...args, selectedAsset, u))}
        />
      )}

      {activeModal === 'PREVENTIVE_MTO' && (
        <PreventiveMtoModal
          asset={selectedAsset}
          onClose={() => setActiveModal(null)}
          onSubmit={(logData) => protectedAction((user) => submitMaintenanceLog(logData, selectedAsset, user))}
        />
      )}

      {activeModal === 'CORRECTIVE_LOG' && (
        <CorrectiveLogModal
          asset={selectedAsset}
          onClose={() => setActiveModal(null)}
          onSubmit={(...args) => protectedAction((u) => submitInitialCorrectiveLog(...args, selectedAsset, u))}
        />
      )}

      {activeModal === 'UPDATE_WORKSHOP' && (
        <UpdateWorkshopModal
          asset={selectedAsset}
          onClose={() => setActiveModal(null)}
          onSubmit={(form) => protectedAction((u) => updateWorkshopInfo(form, selectedAsset, u))}
        />
      )}

      {activeModal === 'MTO_DETAIL' && (
        <MtoDetailModal
          log={viewingLog}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'COMMENT' && (
        <CommentModal
          onClose={() => setActiveModal(null)}
          onSubmit={(comment) => protectedAction((u) => handleReception('PARCIAL', comment, tempPurchase, u))}
        />
      )}

      {/* Panel de Administrador */}
      {adminPanelOpen && (
        <AssetAdminPanel onClose={() => setAdminPanelOpen(false)} isAdmin={user?.rol === 'ADMIN'} />
      )}

    </div>
  );
}