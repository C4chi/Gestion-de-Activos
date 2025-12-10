import React, { createContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { supabase } from './supabaseClient';

/**
 * AppContext centraliza TODO el estado global de la app
 * Elimina necesidad de prop drilling a través de 20+ componentes
 */
export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // Estado global
  const [user, setUser] = useState(null);
  const [assets, setAssets] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [safetyReports, setSafetyReports] = useState([]);
  const [mtoLogs, setMtoLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assetsPage, setAssetsPage] = useState(1);
  const [assetsTotalCount, setAssetsTotalCount] = useState(0);
  const assetsPageSize = 20;

  // Fetch paginado de assets
  const fetchAssets = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const from = (page - 1) * assetsPageSize;
      const to = page * assetsPageSize - 1;

      const { data, count, error } = await supabase
        .from('assets')
        .select('*', { count: 'exact' })
        .order('ficha')
        .range(from, to);

      if (error) throw error;
      setAssets(data || []);
      setAssetsTotalCount(count || 0);
      setAssetsPage(page);
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast.error('Error cargando activos');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch de todos los datos (non-paginated)
  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [assetsRes, purchasesRes, safetyRes, mtoRes] = await Promise.all([
        supabase.from('assets').select('*').order('ficha'),
        supabase.from('purchase_orders').select('*').order('created_at', { ascending: false }),
        supabase.from('safety_reports').select('*').order('created_at', { ascending: false }),
        supabase.from('maintenance_logs').select('*').order('fecha', { ascending: false }),
      ]);

      if (assetsRes.data) setAssets(assetsRes.data);
      if (purchasesRes.data) setPurchases(purchasesRes.data);
      if (safetyRes.data) setSafetyReports(safetyRes.data);
      if (mtoRes.data) setMtoLogs(mtoRes.data);
    } catch (error) {
      console.error('Error fetching all data:', error);
      toast.error('Error cargando datos');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch cuando user cambia
  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user, fetchAllData]);

  // Métodos de negocio
  const handlePinSubmit = async (pinInput) => {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('pin', pinInput)
        .single();

      if (error || !data) {
        toast.error('PIN incorrecto');
        return false;
      }
      setUser(data);
      return true;
    } catch (error) {
      toast.error('Error al autenticar');
      return false;
    }
  };

  const submitNewAsset = async (assetData) => {
    try {
      if (!assetData.ficha) {
        toast.error("El campo 'Ficha' es requerido");
        return false;
      }
      const { error } = await supabase.from('assets').insert([assetData]);
      if (error) throw error;
      toast.success('Activo creado exitosamente');
      await fetchAllData();
      return true;
    } catch (error) {
      toast.error(error.message);
      return false;
    }
  };

  const updateAsset = async (assetId, updates) => {
    try {
      const { error } = await supabase.from('assets').update(updates).eq('id', assetId);
      if (error) throw error;
      toast.success('Activo actualizado');
      await fetchAllData();
      return true;
    } catch (error) {
      toast.error(error.message);
      return false;
    }
  };

  const submitRequisition = async (reqForm, reqItems, selectedAsset) => {
    try {
      const uid = `REQ-${reqForm.req}-${Date.now().toString().slice(-4)}`;
      const { error } = await supabase.from('purchase_orders').insert([{
        req_id: uid,
        ficha_ref: selectedAsset.ficha,
        solicitante: reqForm.solicitadoPor || user.nombre,
        proyecto: reqForm.project,
        prioridad: reqForm.priority,
        items_json: reqItems,
        items_summary: reqItems.map(i => `(${i.qty}) ${i.desc}`).join(', '),
        estado: 'PENDIENTE'
      }]);
      if (error) throw error;

      if (selectedAsset.status === 'DISPONIBLE') {
        await supabase
          .from('assets')
          .update({ status: 'ESPERA REPUESTO', numero_de_requisicion: reqForm.req })
          .eq('ficha', selectedAsset.ficha);
      }
      toast.success('Requisición creada');
      await fetchAllData();
      return true;
    } catch (error) {
      toast.error(error.message);
      return false;
    }
  };

  const handlePurchaseStatus = async (id, newStatus) => {
    try {
      const { error } = await supabase.from('purchase_orders').update({ estado: newStatus }).eq('id', id);
      if (error) throw error;
      toast.success('Estado actualizado');
      await fetchAllData();
      return true;
    } catch (error) {
      toast.error(error.message);
      return false;
    }
  };

  const submitMaintenanceLog = async (logData, assetId) => {
    try {
      const { error } = await supabase.from('maintenance_logs').insert([logData]);
      if (error) throw error;
      toast.success('Log de mantenimiento registrado');
      await fetchAllData();
      return true;
    } catch (error) {
      toast.error(error.message);
      return false;
    }
  };

  const submitSafetyReport = async (reportData) => {
    try {
      const { error } = await supabase.from('safety_reports').insert([reportData]);
      if (error) throw error;
      toast.success('Reporte HSE creado');
      await fetchAllData();
      return true;
    } catch (error) {
      toast.error(error.message);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setAssets([]);
    setPurchases([]);
    setSafetyReports([]);
    setMtoLogs([]);
  };

  const value = {
    // Estado
    user,
    assets,
    purchases,
    safetyReports,
    mtoLogs,
    loading,
    assetsPage,
    assetsTotalCount,
    assetsPageSize,
    
    // Setters directos (para acciones rápidas)
    setUser,
    setAssets,
    setPurchases,
    setSafetyReports,
    setMtoLogs,
    
    // Métodos de negocio
    handlePinSubmit,
    submitNewAsset,
    updateAsset,
    submitRequisition,
    handlePurchaseStatus,
    submitMaintenanceLog,
    submitSafetyReport,
    
    // Fetch/Refresh
    fetchAssets,
    fetchAllData,
    logout,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

// Hook custom para usar el context
export const useAppContext = () => {
  const context = React.useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext debe usarse dentro de AppProvider');
  }
  return context;
};
