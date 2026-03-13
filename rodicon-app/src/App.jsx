import React, { useState, useMemo, Suspense, useEffect } from 'react';
import { useAppContext } from './AppContext'; // Usar contexto centralizado
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { Menu, Wifi, WifiOff } from 'lucide-react';
import { supabase } from './supabaseClient';

// Hooks
import { useNotifications } from './hooks/useNotifications';
import { useDebounce } from './hooks/useDebounce';
import { useOfflineSync } from './hooks/useOfflineSync';

// Utilidades
import { getSearchState, saveSearchState, getUserPreferences, saveUserPreferences } from './utils/storage';

// Componentes de Layout
import { Sidebar } from './Sidebar';
import { PinModal } from './PinModal';
import { FullScreenModal } from './FullScreenModal';
import { NotificationCenter } from './components/NotificationCenter';
import { ErrorBoundary, CriticalErrorBoundary } from './components/ErrorBoundary';

// Vistas Principales
import { InventoryView } from './InventoryView';
import { WorkshopMonitor } from './WorkshopMonitor';
import { PurchasingManagement } from './PurchasingManagement';
import { SafetyCenter } from './SafetyCenter';
import { AssetDetailSidebar } from './AssetDetailSidebar';

// Nuevos Módulos de Flujos - Lazy Load
const PurchaseWorkflowPanel = React.lazy(() => import('./components/PurchaseWorkflowPanel'));
const PreventiveMaintenancePanel = React.lazy(() => import('./components/PreventiveMaintenancePanel'));
const MetricsPanel = React.lazy(() => import('./components/MetricsPanel'));
const TechnicalStructurePanel = React.lazy(() => import('./components/TechnicalStructurePanel'));
const TasksPanel = React.lazy(() => import('./components/TasksPanel'));

// Módulo de Solicitudes de Mantenimiento - Lazy Load
const MaintenanceRequestForm = React.lazy(() => import('./components/MaintenanceRequestForm'));
const MaintenanceRequestValidator = React.lazy(() => import('./components/MaintenanceRequestValidator'));

// Sistema HSE Dinámico - Lazy Load
const InspectionsDashboard = React.lazy(() => import('./components/HSE/InspectionsDashboard'));
const TemplateManager = React.lazy(() => import('./components/HSE/TemplateManager'));
const InspectionStandalone = React.lazy(() => import('./components/HSE/InspectionStandalone'));

// Modales de Formularios
import { NewAssetModal } from './NewAssetModal';
import { RequisitionModal } from './RequisitionModal';
import { RequisitionMultiAssetModal } from './RequisitionMultiAssetModal'; // NUEVO: Compras multi-activo
import { CloseOrderModal } from './CloseOrderModal';
import { SafetyFormModal } from './components/Safety/SafetyFormModal';
import { PreventiveMtoModal } from './PreventiveMtoModal';
import { CorrectiveLogModal } from './CorrectiveLogModal';
import { UpdateWorkshopModal } from './UpdateWorkshopModal';
import { MtoDetailModal } from './MtoDetailModal';
import { CommentModal } from './CommentModal';
import { AssetAdminPanel } from './AssetAdminPanel';
import { UserAdminPanel } from './UserAdminPanel';
import { ReportsPanel } from './ReportsPanel';
import { EPPAlmacenPanel } from './EPPAlmacenPanel';

// Componente de fallback para lazy loading
const LazyLoadFallback = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
      <p className="text-gray-600">Cargando módulo...</p>
    </div>
  </div>
);

// NOTA: Otros componentes como FullScreenModal, StatusBadge, etc.,
// ahora son importados directamente por los componentes que los usan.

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const standaloneTemplateId = params.get('hseTemplateId');
  const standaloneInspectionId = params.get('hseInspectionId');
  const standaloneUserId = params.get('hseUserId');

  // --- ESTADO Y LÓGICA DEL CONTEXTO GLOBAL (Sin prop drilling) ---
  const {
    user,
    sessionReady,
    assets,
    allAssets, // Todos los activos para calcular KPIs
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
    generatePurchaseOrderPdf,
    handleReception,
    logout,
    can
  } = useAppContext();

  // Modo standalone para abrir la inspección en ventana nueva
  if (standaloneTemplateId) {
    return (
      <>
        <Suspense fallback={<LazyLoadFallback />}>
          <InspectionStandalone templateId={standaloneTemplateId} inspectionId={standaloneInspectionId} fallbackUserId={standaloneUserId} />
        </Suspense>
        <Toaster position="top-right" />
      </>
    );
  }

  // --- ESTADO LOCAL DE LA UI con persistencia ---
  const savedPrefs = getUserPreferences();
  const savedSearch = getSearchState();
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(savedPrefs.sidebarCollapsed);
  const [search, setSearch] = useState(savedSearch.search);
  const debouncedSearch = useDebounce(search, 300);
  const [filter, setFilter] = useState(savedSearch.filter);
  const [locationFilter, setLocationFilter] = useState(savedSearch.locationFilter);
  const [gpsFilter, setGpsFilter] = useState(savedSearch.gpsFilter || '');
  const [activeOverlay, setActiveOverlay] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [detailSidebarOpen, setDetailSidebarOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [tempAction, setTempAction] = useState(null);
  const [tempPurchase, setTempPurchase] = useState(null);
  const [viewingLog, setViewingLog] = useState(null);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [userPanelOpen, setUserPanelOpen] = useState(false);
  const [reportsPanelOpen, setReportsPanelOpen] = useState(false);
  const [eppAlmacenOpen, setEppAlmacenOpen] = useState(false);

  const canWorkshop = can(['ADMIN', 'ADMIN_GLOBAL', 'TALLER', 'GERENTE', 'GERENTE_TALLER']);
  const canPurchasing = can(['ADMIN', 'ADMIN_GLOBAL', 'COMPRAS', 'GERENTE', 'GERENTE_TALLER']);
  const canHse = can(['ADMIN', 'ADMIN_GLOBAL', 'HSE', 'GERENTE']);
  const canAdmin = can(['ADMIN', 'ADMIN_GLOBAL']);
  const isAdminGlobal = user?.rol === 'ADMIN_GLOBAL';
  const canReports = can(['ADMIN', 'ADMIN_GLOBAL', 'GERENTE', 'GERENTE_TALLER']);
  const canEpp = can(['ADMIN', 'ADMIN_GLOBAL', 'HSE', 'GERENTE', 'GERENTE_TALLER']);
  const canApprovePurchases = can(['ADMIN', 'ADMIN_GLOBAL', 'GERENTE_TALLER']); // Solo GERENTE_TALLER aprueba cotizaciones

  // --- NOTIFICACIONES ---
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    deleteAllNotifications,
  } = useNotifications(user?.auth_id || user?.id);

  const {
    isConnected,
    pendingCount,
    syncing,
    performSync,
  } = useOfflineSync();

  // --- MANEJO DE ACCIONES PROTEGIDAS ---
  const protectedAction = (fn, allowedRoles = null) => {
    const exec = (loggedUser) => {
      if (allowedRoles && !can(allowedRoles)) {
        toast.error('No tienes permiso para esta acción');
        return;
      }
      fn(loggedUser);
    };

    if (user) {
      exec(user);
    } else {
      setTempAction({ fn: exec, allowedRoles });
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

  // Persistir filtros y preferencias cuando cambien
  useEffect(() => {
    if (!sessionReady) return;

    setActiveModal((current) => {
      if (user) {
        return current === 'PIN' ? null : current;
      }

      return current ?? 'PIN';
    });
  }, [sessionReady, user]);

  useEffect(() => {
    saveSearchState({ search, filter, locationFilter, gpsFilter });
  }, [search, filter, locationFilter, gpsFilter]);

  useEffect(() => {
    if (!isAdminGlobal && gpsFilter) {
      setGpsFilter('');
    }
  }, [isAdminGlobal, gpsFilter]);

  useEffect(() => {
    if (!user || user.rol !== 'ADMIN_GLOBAL') return;

    let isMounted = true;

    const processTaskReminders = async () => {
      try {
        await supabase.rpc('process_task_reminders', { p_limit: 100 });
      } catch (error) {
        if (isMounted) {
          console.warn('No se pudieron procesar recordatorios de tareas:', error?.message || error);
        }
      }
    };

    processTaskReminders();
    const intervalId = window.setInterval(processTaskReminders, 300000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [user]);

  useEffect(() => {
    const syncSidebarForViewport = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
      }
    };

    syncSidebarForViewport();
    window.addEventListener('resize', syncSidebarForViewport);

    return () => {
      window.removeEventListener('resize', syncSidebarForViewport);
    };
  }, []);

  useEffect(() => {
    saveUserPreferences({ sidebarCollapsed });
  }, [sidebarCollapsed]);

  const handleAssetSelect = (asset) => {
    setSelectedAsset(asset);
    setDetailSidebarOpen(true);
  };

  const handleOpenModal = (modalType, data = null) => {
    const roleMap = {
      PREVENTIVE_MTO: ['ADMIN', 'TALLER', 'GERENTE_TALLER'],
      CORRECTIVE_LOG: ['ADMIN', 'TALLER', 'GERENTE_TALLER'],
      UPDATE_WORKSHOP: ['ADMIN', 'TALLER', 'GERENTE_TALLER'],
      MTO_DETAIL: ['ADMIN', 'TALLER', 'GERENTE_TALLER'],
      SAFETY_FORM: ['ADMIN', 'HSE'],
      REQ: ['ADMIN', 'COMPRAS', 'GERENTE_TALLER'],
      CLOSE_ORDER: ['ADMIN', 'TALLER', 'GERENTE_TALLER'],
      COMMENT: ['ADMIN', 'COMPRAS'],
    };

    if (modalType === 'MTO_DETAIL') {
      setViewingLog(data);
    }

    protectedAction(() => {
      setActiveModal(modalType);
    }, roleMap[modalType]);
  };

  const handleMenuClick = (overlay) => {
    if (overlay === 'TASKS' && !isAdminGlobal) {
      toast.error('No tienes permiso para esta acción');
      return;
    }

    const roleMap = {
      WORKSHOP: ['ADMIN', 'TALLER', 'GERENTE_TALLER'],
      TECHNICAL_STRUCTURE: ['ADMIN', 'TALLER', 'GERENTE_TALLER'],
      PURCHASING: ['ADMIN', 'COMPRAS', 'GERENTE_TALLER'],
      SAFETY: ['ADMIN', 'HSE'],
      HSE_INSPECTIONS: ['ADMIN', 'HSE'],
      TEMPLATE_BUILDER: ['ADMIN', 'HSE'],
      TASKS: ['ADMIN_GLOBAL'],
    };

    const allowedRoles = roleMap[overlay];
    if (allowedRoles && !can(allowedRoles)) {
      toast.error('No tienes permiso para esta acción');
      return;
    }
    setActiveOverlay(overlay);
  };

  // --- FILTROS Y CÁLCULOS MEMOIZADOS ---
  const locations = useMemo(() => {
    return Array.from(new Set((allAssets || assets).map(a => a.ubicacion_actual).filter(Boolean))).sort();
  }, [allAssets, assets]);

  const gpsOptions = useMemo(() => {
    return Array.from(new Set((allAssets || assets).map(a => (a.gps || '').trim()).filter(Boolean))).sort();
  }, [allAssets, assets]);

  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      // Excluir activos no visibles y vendidos
      // Soportar tanto 0/1 (número) como false/true (boolean)
      if (!a.visible || a.visible === 0 || a.status === 'VENDIDO') return false;
      
      // Buscar por: ficha, marca, modelo, chasis y tipo (usa debouncedSearch)
      const searchTerm = debouncedSearch.toLowerCase();
      const match = (
        (a.ficha || '').toLowerCase().includes(searchTerm) ||
        (a.marca || '').toLowerCase().includes(searchTerm) ||
        (a.modelo || '').toLowerCase().includes(searchTerm) ||
        (a.chasis || '').toLowerCase().includes(searchTerm) ||
        (a.tipo || '').toLowerCase().includes(searchTerm)
      );

      if (locationFilter && a.ubicacion_actual !== locationFilter) return false;
      if (isAdminGlobal && gpsFilter && (a.gps || '').trim() !== gpsFilter) return false;

      if (filter === 'NO_OP') {
        return match && ['NO DISPONIBLE', 'EN TALLER', 'ESPERA REPUESTO', 'MTT PREVENTIVO'].includes(a.status);
      }

      if (filter === 'EN_TALLER') {
        return match && a.status === 'EN TALLER';
      }

      if (filter === 'ESPERA_REPUESTO') {
        return match && a.status === 'ESPERA REPUESTO';
      }

      return match;
    });
  }, [assets, debouncedSearch, filter, locationFilter, gpsFilter, isAdminGlobal]);

  // KPIs calculados - usando allAssets en lugar de assets para cálculos correctos
  const kpis = useMemo(() => ({
    total: (allAssets || assets).filter(a => (a.visible !== 0 && a.visible !== false) && a.status !== 'VENDIDO').length,
    noOp: (allAssets || assets).filter(a => (a.visible !== 0 && a.visible !== false) && a.status !== 'VENDIDO' && ['NO DISPONIBLE', 'EN TALLER', 'ESPERA REPUESTO', 'MTT PREVENTIVO'].includes(a.status)).length,
    enTaller: (allAssets || assets).filter(a => (a.visible !== 0 && a.visible !== false) && a.status !== 'VENDIDO' && a.status === 'EN TALLER').length,
    esperaRepuesto: (allAssets || assets).filter(a => (a.visible !== 0 && a.visible !== false) && a.status !== 'VENDIDO' && a.status === 'ESPERA REPUESTO').length
  }), [assets, allAssets]);

  // --- RENDER ---

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
          <p className="text-gray-600">Restaurando sesión...</p>
        </div>
      </div>
    );
  }

  if (activeModal === 'PIN') {
    return <PinModal onSubmit={handlePinSubmit} onSuccess={onPinSuccess} />;
  }

  return (
    <div className="flex h-[100dvh] bg-gray-100 font-sans overflow-hidden relative">
      <Toaster position="top-right" reverseOrder={false} />

      {/* Botón hamburguesa móvil */}
      {user && (
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="fixed top-4 left-4 z-50 lg:hidden bg-white p-2 rounded-lg shadow-lg"
        >
          <Menu className="w-6 h-6 text-gray-600" />
        </button>
      )}

      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onMenuClick={handleMenuClick}
        onNewAsset={() => protectedAction(() => setActiveModal('NEW_ASSET'), ['ADMIN'])}
        onRefresh={fetchAllData}
        onLogout={() => { logout(); setActiveModal('PIN'); }}
        protectedAction={protectedAction}
        onAdminPanel={() => protectedAction(() => setAdminPanelOpen(true), ['ADMIN', 'ADMIN_GLOBAL'])}
        onUserPanel={() => protectedAction(() => setUserPanelOpen(true), ['ADMIN', 'ADMIN_GLOBAL'])}
        onReportsPanel={() => protectedAction(() => setReportsPanelOpen(true), ['ADMIN', 'ADMIN_GLOBAL', 'GERENTE'])}
        onEppAlmacen={() => protectedAction(() => setEppAlmacenOpen(true), ['ADMIN', 'ADMIN_GLOBAL', 'HSE', 'GERENTE'])}
        isAdmin={canAdmin}
        canWorkshop={canWorkshop}
        canPurchasing={canPurchasing}
        canHse={canHse}
        canEpp={canEpp}
        canReports={canReports}
        isAdminGlobal={isAdminGlobal}
        userId={user?.id}
      />

      <ErrorBoundary section="Dashboard Principal">
        <InventoryView
          userName={user?.nombre || user?.nombre_usuario || 'Usuario'}
          kpis={kpis}
          filter={filter}
          setFilter={setFilter}
          search={search}
          setSearch={setSearch}
          locations={locations}
          locationFilter={locationFilter}
          setLocationFilter={setLocationFilter}
          isAdminGlobal={isAdminGlobal}
          gpsOptions={gpsOptions}
          gpsFilter={gpsFilter}
          setGpsFilter={setGpsFilter}
          notificationCenter={user ? (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${
                  !isConnected
                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}
                title={!isConnected ? 'El dispositivo esta trabajando sin conexion' : 'El dispositivo esta en linea'}
              >
                {!isConnected ? (
                  <WifiOff className="h-4 w-4 shrink-0" />
                ) : (
                  <Wifi className="h-4 w-4 shrink-0" />
                )}
                <span>{!isConnected ? 'Offline' : 'En linea'}</span>
                {isConnected && pendingCount > 0 && (
                  <button
                    type="button"
                    onClick={performSync}
                    disabled={syncing}
                    className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700 disabled:opacity-50"
                    title={syncing ? 'Sincronizando cambios' : 'Sincronizar cambios pendientes'}
                  >
                    {syncing ? '...' : pendingCount}
                  </button>
                )}
              </div>
              <NotificationCenter
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkAsRead={markAsRead}
                onMarkAllAsRead={markAllAsRead}
                onDelete={deleteNotification}
                onDeleteAll={deleteAllNotifications}
              />
            </div>
          ) : null}
          filteredAssets={filteredAssets}
          onAssetSelect={handleAssetSelect}
        />
      </ErrorBoundary>

      {/* --- PANTALLAS SUPERPUESTAS (MODALS GRANDES) --- */}
      {activeOverlay === 'WORKSHOP' && (
        <ErrorBoundary section="Monitor de Taller">
          <WorkshopMonitor
            assets={assets}
            onClose={() => setActiveOverlay(null)}
            onSelectAsset={(asset) => {
              handleAssetSelect(asset);
              setActiveOverlay(null);
            }}
            onOpenModal={(modal, data) => handleOpenModal(modal, data)}
          />
        </ErrorBoundary>
      )}

      {activeOverlay === 'TECHNICAL_STRUCTURE' && (
        <FullScreenModal
          title="🧩 Estructura Técnica"
          color="indigo"
          onClose={() => setActiveOverlay(null)}
        >
          <Suspense fallback={<LazyLoadFallback />}>
            <TechnicalStructurePanel />
          </Suspense>
        </FullScreenModal>
      )}

      {activeOverlay === 'PURCHASING' && (
        <ErrorBoundary section="Gestión de Compras">
          <PurchasingManagement
            onClose={() => setActiveOverlay(null)}
            onDownloadPdf={generatePurchaseOrderPdf}
            canManage={canPurchasing}
            canApprove={canApprovePurchases}
          />
        </ErrorBoundary>
      )}

      {activeOverlay === 'WORKFLOW_APPROVALS' && (
        <FullScreenModal 
          title="🔄 Workflow de Aprobaciones" 
          color="purple" 
          onClose={() => setActiveOverlay(null)}
        >
          <Suspense fallback={<LazyLoadFallback />}>
            <PurchaseWorkflowPanel />
          </Suspense>
        </FullScreenModal>
      )}

      {activeOverlay === 'PREVENTIVE_MTO' && (
        <FullScreenModal 
          title="📅 Mantenimiento Preventivo" 
          color="green" 
          onClose={() => setActiveOverlay(null)}
        >
          <Suspense fallback={<LazyLoadFallback />}>
            <PreventiveMaintenancePanel />
          </Suspense>
        </FullScreenModal>
      )}

      {activeOverlay === 'SAFETY' && (
        <SafetyCenter
          onClose={() => setActiveOverlay(null)}
          canHse={canHse}
        />
      )}

      {activeOverlay === 'HSE_INSPECTIONS' && (
        <FullScreenModal title="📋 Inspecciones HSE Dinámicas" color="blue" onClose={() => setActiveOverlay(null)}>
          <ErrorBoundary>
            <Suspense fallback={<LazyLoadFallback />}>
              <InspectionsDashboard />
            </Suspense>
          </ErrorBoundary>
        </FullScreenModal>
      )}

      {activeOverlay === 'TEMPLATE_BUILDER' && (
        <div className="fixed inset-0 z-50">
          <Suspense fallback={<LazyLoadFallback />}>
            <TemplateManager
              onClose={() => setActiveOverlay(null)}
            />
          </Suspense>
        </div>
      )}

      {activeOverlay === 'METRICS' && (
        <FullScreenModal title="📊 Métricas y Reportes" color="blue" onClose={() => setActiveOverlay(null)}>
          <Suspense fallback={<LazyLoadFallback />}>
            <MetricsPanel />
          </Suspense>
        </FullScreenModal>
      )}

      {activeOverlay === 'TASKS' && isAdminGlobal && (
        <FullScreenModal title="✅ Tareas y Recordatorios" color="indigo" onClose={() => setActiveOverlay(null)}>
          <Suspense fallback={<LazyLoadFallback />}>
            <TasksPanel currentUser={user} />
          </Suspense>
        </FullScreenModal>
      )}

      {activeOverlay === 'REQUEST_MAINTENANCE' && (
        <Suspense fallback={<LazyLoadFallback />}>
          <MaintenanceRequestForm
            onClose={() => setActiveOverlay(null)}
            onSuccess={() => {
              setActiveOverlay(null);
              fetchAllData();
            }}
          />
        </Suspense>
      )}

      {activeOverlay === 'VALIDATE_REQUESTS' && (
        <FullScreenModal title="✅ Validar Solicitudes" color="orange" onClose={() => setActiveOverlay(null)}>
          <Suspense fallback={<LazyLoadFallback />}>
            <MaintenanceRequestValidator />
          </Suspense>
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
          isAdmin={canAdmin}
          onUpdate={fetchAllData}
          allLocations={locations}
        />
      )}

      {/* --- MODALES PEQUEÑOS (FORMS) --- */}
      {activeModal === 'NEW_ASSET' && (
        <NewAssetModal
          onClose={() => setActiveModal(null)}
          onSubmit={submitNewAsset}
          isAdmin={canAdmin}
        />
      )}

      {activeModal === 'REQ' && (
        <RequisitionModal
          asset={selectedAsset}
          onClose={() => setActiveModal(null)}
          onSubmit={(...args) => protectedAction(() => submitRequisition(...args, selectedAsset), ['ADMIN', 'COMPRAS'])}
        />
      )}

      {activeModal === 'REQ_MULTI' && (
        <RequisitionMultiAssetModal
          onClose={() => setActiveModal(null)}
          onSubmit={(formData) => protectedAction(() => submitRequisitionMultiAsset(formData), ['ADMIN', 'COMPRAS'])}
        />
      )}

      {activeModal === 'CLOSE_ORDER' && (
        <CloseOrderModal
          asset={selectedAsset}
          onClose={() => setActiveModal(null)}
          onSubmit={(...args) => protectedAction((u) => submitCloseOrder(...args, selectedAsset, u), ['ADMIN', 'TALLER'])}
        />
      )}

      {activeModal === 'SAFETY_FORM' && (
        <SafetyFormModal
          asset={selectedAsset}
          onClose={() => setActiveModal(null)}
          onSubmit={(...args) => protectedAction((u) => submitSafety(...args, selectedAsset, u), ['ADMIN', 'HSE'])}
        />
      )}

      {activeModal === 'PREVENTIVE_MTO' && (
        <PreventiveMtoModal
          asset={selectedAsset}
          onClose={() => setActiveModal(null)}
          onSubmit={(logData) => protectedAction((loggedUser) => submitMaintenanceLog(logData, selectedAsset, loggedUser), ['ADMIN', 'TALLER'])}
        />
      )}

      {activeModal === 'CORRECTIVE_LOG' && (
        <CorrectiveLogModal
          asset={selectedAsset}
          onClose={() => setActiveModal(null)}
          onSubmit={(...args) => protectedAction((u) => submitInitialCorrectiveLog(...args, selectedAsset, u), ['ADMIN', 'TALLER'])}
        />
      )}

      {activeModal === 'UPDATE_WORKSHOP' && (
        <UpdateWorkshopModal
          asset={selectedAsset}
          onClose={() => setActiveModal(null)}
          onSubmit={(form) => protectedAction((u) => updateWorkshopInfo(form, selectedAsset, u), ['ADMIN', 'TALLER'])}
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
          onSubmit={(comment) => protectedAction(() => handleReception('PARCIAL', comment, tempPurchase), ['ADMIN', 'COMPRAS'])}
        />
      )}

      {/* Panel de Administrador */}
      {adminPanelOpen && (
        <AssetAdminPanel onClose={() => setAdminPanelOpen(false)} isAdmin={canAdmin} />
      )}

      {userPanelOpen && (
        <UserAdminPanel onClose={() => setUserPanelOpen(false)} />
      )}

      {reportsPanelOpen && (
        <ReportsPanel 
          onClose={() => setReportsPanelOpen(false)}
          assets={assets}
          purchases={purchases}
          mtoLogs={mtoLogs}
          safetyReports={safetyReports}
        />
      )}
      {eppAlmacenOpen && (
        <EPPAlmacenPanel />
      )}
    </div>
  );
}
