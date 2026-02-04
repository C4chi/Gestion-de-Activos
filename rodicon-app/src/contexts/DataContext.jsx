import React, { createContext, useState, useCallback, useContext, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';

/**
 * DataContext maneja todo el estado de datos (assets, purchases, etc)
 * Separado para mejor organización y performance
 */
export const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const { user } = useAuth();
  
  // Estado de datos
  const [assets, setAssets] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [safetyReports, setSafetyReports] = useState([]);
  const [mtoLogs, setMtoLogs] = useState([]);
  const [appUsers, setAppUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Paginación para assets
  const [assetsPage, setAssetsPage] = useState(1);
  const [assetsTotalCount, setAssetsTotalCount] = useState(0);
  const assetsPageSize = 20;

  // Fetch assets paginado
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
      
      console.log(`✅ Assets cargados: ${data?.length || 0} (página ${page})`);
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast.error('Error cargando activos');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch todos los datos
  const fetchAllData = useCallback(async () => {
    try {
      console.log('🔄 Recargando todos los datos...');
      setLoading(true);
      
      const [assetsRes, purchasesRes, safetyRes, mtoRes] = await Promise.all([
        supabase.from('assets').select('*').order('ficha'),
        supabase.from('purchase_orders').select('*').order('fecha_solicitud', { ascending: false }),
        supabase.from('safety_reports').select('*').order('fecha_reporte', { ascending: false }),
        supabase.from('maintenance_logs').select('*').order('fecha', { ascending: false }),
      ]);

      console.log('📊 Resultados de fetch:');
      console.log('  - Assets:', assetsRes.data?.length || 0);
      console.log('  - Purchases:', purchasesRes.data?.length || 0);
      console.log('  - Safety:', safetyRes.data?.length || 0);
      console.log('  - MtoLogs:', mtoRes.data?.length || 0);

      if (assetsRes.data) setAssets(assetsRes.data);
      if (purchasesRes.data) setPurchases(purchasesRes.data);
      if (safetyRes.data) setSafetyReports(safetyRes.data);
      if (mtoRes.data) setMtoLogs(mtoRes.data);

      console.log('✅ Todos los datos actualizados');
    } catch (error) {
      console.error('Error fetching all data:', error);
      toast.error('Error cargando datos');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch usuarios (solo para admin)
  const fetchUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .order('nombre');

      if (error) throw error;
      setAppUsers(data || []);
      console.log('✅ Usuarios cargados:', data?.length || 0);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error cargando usuarios');
    }
  }, []);

  // Auto-fetch cuando usuario hace login
  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user, fetchAllData]);

  const value = {
    // Estado
    assets,
    purchases,
    safetyReports,
    mtoLogs,
    appUsers,
    loading,
    assetsPage,
    assetsTotalCount,
    assetsPageSize,
    
    // Setters (para actualizaciones directas)
    setAssets,
    setPurchases,
    setSafetyReports,
    setMtoLogs,
    setAppUsers,
    
    // Fetchers
    fetchAssets,
    fetchAllData,
    fetchUsers,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

// Custom hook
export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData debe ser usado dentro de DataProvider');
  }
  return context;
};
