import React, { createContext, useState, useCallback, useContext } from 'react';

/**
 * UIContext maneja todo el estado de la UI (modales, sidebars, filters)
 * Separado para evitar re-renders innecesarios en data
 */
export const UIContext = createContext();

export const UIProvider = ({ children }) => {
  // Sidebar & Layout
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeView, setActiveView] = useState('INVENTORY');
  
  // Modales
  const [activeModal, setActiveModal] = useState(null);
  const [activeOverlay, setActiveOverlay] = useState(null);
  
  // Sidebar de detalles
  const [detailSidebarOpen, setDetailSidebarOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  
  // Filters & Search
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  
  // Temp data (para modales)
  const [tempAction, setTempAction] = useState(null);
  const [tempPurchase, setTempPurchase] = useState(null);
  const [viewingLog, setViewingLog] = useState(null);
  
  // Admin panels
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [userPanelOpen, setUserPanelOpen] = useState(false);

  // Helpers para modales
  const openModal = useCallback((modalName) => {
    setActiveModal(modalName);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    // Limpiar temp data
    setTempAction(null);
    setTempPurchase(null);
    setViewingLog(null);
  }, []);

  const openOverlay = useCallback((overlayName) => {
    setActiveOverlay(overlayName);
  }, []);

  const closeOverlay = useCallback(() => {
    setActiveOverlay(null);
  }, []);

  // Helper para detail sidebar
  const openAssetDetail = useCallback((asset) => {
    setSelectedAsset(asset);
    setDetailSidebarOpen(true);
  }, []);

  const closeAssetDetail = useCallback(() => {
    setDetailSidebarOpen(false);
    setTimeout(() => setSelectedAsset(null), 300); // Delay para animación
  }, []);

  // Reset all UI state
  const resetUI = useCallback(() => {
    setActiveModal(null);
    setActiveOverlay(null);
    setDetailSidebarOpen(false);
    setSelectedAsset(null);
    setSearch('');
    setFilter('ALL');
    setTempAction(null);
    setTempPurchase(null);
    setViewingLog(null);
    setAdminPanelOpen(false);
    setUserPanelOpen(false);
  }, []);

  const value = {
    // Sidebar & Layout
    sidebarCollapsed,
    setSidebarCollapsed,
    activeView,
    setActiveView,
    
    // Modales
    activeModal,
    setActiveModal,
    openModal,
    closeModal,
    activeOverlay,
    setActiveOverlay,
    openOverlay,
    closeOverlay,
    
    // Detail sidebar
    detailSidebarOpen,
    setDetailSidebarOpen,
    selectedAsset,
    setSelectedAsset,
    openAssetDetail,
    closeAssetDetail,
    
    // Filters
    search,
    setSearch,
    filter,
    setFilter,
    
    // Temp data
    tempAction,
    setTempAction,
    tempPurchase,
    setTempPurchase,
    viewingLog,
    setViewingLog,
    
    // Admin
    adminPanelOpen,
    setAdminPanelOpen,
    userPanelOpen,
    setUserPanelOpen,
    
    // Helpers
    resetUI,
  };

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
};

// Custom hook
export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI debe ser usado dentro de UIProvider');
  }
  return context;
};
