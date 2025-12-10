import React, { createContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { supabase } from './supabaseClient';
import { usePurchasingWorkflow } from './hooks/usePurchasingWorkflow';
import { useWorkshopWorkflow } from './hooks/useWorkshopWorkflow';
import { useSafetyWorkflow } from './hooks/useSafetyWorkflow';
import { useFormValidation } from './hooks/useFormValidation';

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

  // Integrar los tres nuevos hooks
  const purchasingWorkflow = usePurchasingWorkflow();
  const workshopWorkflow = useWorkshopWorkflow();
  const safetyWorkflow = useSafetyWorkflow();
  const formValidation = useFormValidation();

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
        supabase.from('purchase_orders').select('*').order('fecha_solicitud', { ascending: false }),
        supabase.from('safety_reports').select('*').order('fecha_reporte', { ascending: false }),
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
  const handlePinSubmit = async (pinInput, onSuccess, onError) => {
    try {
      console.log('🔐 Intentando login con PIN:', pinInput);
      
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('pin', pinInput);

      console.log('📊 Respuesta Supabase - Data:', data, 'Error:', error);

      // Si hay error en la consulta
      if (error) {
        console.warn('❌ Error en la consulta:', error.message);
        if (onError) onError();
        return false;
      }

      // Si no hay datos o array está vacío
      if (!data || data.length === 0) {
        console.warn('❌ PIN incorrecto - No se encontró usuario');
        if (onError) onError();
        return false;
      }

      const user = data[0]; // Tomar el primer resultado
      console.log('✅ Login exitoso para usuario:', user.nombre || user.id);
      setUser(user);
      if (onSuccess) onSuccess(user);
      return true;
    } catch (error) {
      console.error('🚨 Error al autenticar:', error.message);
      if (onError) onError();
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
        ficha: selectedAsset.ficha,
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
          .update({ status: 'ESPERA REPUESTO', numero_requisicion: reqForm.req })
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

  const submitMaintenanceLog = async (logData, asset, user) => {
    try {
      // Construir el log con los campos correctos de la tabla
      const logToInsert = {
        ficha: asset && asset.ficha ? String(asset.ficha).trim() : (logData.ficha || null),
        tipo: logData.tipo || 'NO ESPECIFICADO',
        fecha: logData.fecha ? (logData.fecha instanceof Date ? logData.fecha.toISOString().split('T')[0] : String(logData.fecha)) : new Date().toISOString().split('T')[0],
        mecanico: logData.mecanico || null,
        descripcion: logData.descripcion ? String(logData.descripcion) : '',
        costo: logData.costo || 0,
        km_recorrido: logData.km ? parseInt(logData.km) : null,
        proyeccion_proxima_mto: logData.proyeccion_km || null,
        created_by: user && user.id ? user.id : null,
      };

      if (!logToInsert.ficha) {
        throw new Error('Ficha del activo es requerida');
      }

      const { error } = await supabase.from('maintenance_logs').insert([logToInsert]);
      if (error) throw error;
      toast.success('Log de mantenimiento registrado');
      await fetchAllData();
      return true;
    } catch (error) {
      toast.error(`Error: ${error.message}`);
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

  const submitSafety = async (safetyForm, selectedAsset, u) => {
    try {
      if (!selectedAsset || !selectedAsset.ficha) {
        throw new Error('Activo no válido');
      }

      const { error } = await supabase.from('safety_reports').insert([{
        ficha: selectedAsset.ficha,
        tipo: safetyForm.tipo || 'INCIDENTE',
        prioridad: safetyForm.prioridad || 'Media',
        descripcion: safetyForm.desc || '',
        reportado_por: u.id || null,
        asignado_a: safetyForm.asignado || null,
        estado: 'PENDIENTE'
      }]);

      if (error) throw error;
      toast.success('Reporte de Seguridad registrado');
      await fetchAllData();
      return true;
    } catch (error) {
      toast.error(`Error al registrar reporte: ${error.message}`);
      return false;
    }
  };

  const submitInitialCorrectiveLog = async (failureData, selectedAsset, u) => {
    try {
      if (!selectedAsset || !selectedAsset.id || !selectedAsset.ficha) {
        throw new Error('Activo no válido');
      }
      
      const initialObservation = `[${new Date(failureData.fecha_entrada).toLocaleDateString()}] FALLA INICIAL: ${failureData.observacion_mecanica}`;

      // 1. Poner el activo como NO DISPONIBLE
      const { error: updateError } = await supabase.from('assets').update({ 
        status: 'NO DISPONIBLE',
        taller_responsable: failureData.mecanico,
        proyeccion_entrada: failureData.fecha_entrada,
        observacion_mecanica: initialObservation
      }).eq('id', selectedAsset.id);

      if (updateError) throw updateError;

      // 2. Crear el log inicial de mantenimiento correctivo
      const logData = {
        ficha: String(selectedAsset.ficha).trim(),
        tipo: 'CORRECTIVO',
        fecha: failureData.fecha_entrada,
        mecanico: failureData.mecanico || null,
        descripcion: `FALLA INICIAL: ${failureData.observacion_mecanica}`,
        costo: 0,
        created_by: u.id || null,
      };

      const { error: logError } = await supabase.from('maintenance_logs').insert([logData]);
      if (logError) throw logError;
      
      toast.success('Falla registrada correctamente');
      await fetchAllData();
      return true;
    } catch (error) {
      toast.error(`Error al registrar falla: ${error.message}`);
      return false;
    }
  };

  const updateWorkshopInfo = async (workshopData, selectedAsset, u) => {
    try {
      const oldComments = selectedAsset.observacion_mecanica || '';
      const newCommentText = workshopData.new_comment ? `\n[${new Date().toLocaleDateString()}] ${workshopData.new_comment}` : '';
      const updatedComments = oldComments + newCommentText;

      await supabase.from('assets').update({
        taller_responsable: workshopData.taller_responsable,
        proyeccion_salida: workshopData.proyeccion_salida,
        observacion_mecanica: updatedComments
      }).eq('id', selectedAsset.id);

      toast.success('Información del taller actualizada');
      await fetchAllData();
      return true;
    } catch (error) {
      toast.error(`Error: ${error.message}`);
      return false;
    }
  };

  const submitCloseOrder = async (closeOrderForm, selectedAsset, u) => {
    try {
      if (!selectedAsset || !selectedAsset.ficha) {
        throw new Error('Activo no válido');
      }

      // Registrar el log final
      const logData = {
        ficha: String(selectedAsset.ficha).trim(),
        tipo: 'CORRECTIVO',
        fecha: new Date().toISOString().split('T')[0],
        mecanico: closeOrderForm.mecanico || null,
        descripcion: closeOrderForm.descripcion || 'Orden de cierre completada',
        costo: closeOrderForm.costo || 0,
        created_by: u.id || null,
      };

      const { error: logError } = await supabase.from('maintenance_logs').insert([logData]);
      if (logError) throw logError;

      // Marcar el activo como disponible
      const { error: updateError } = await supabase.from('assets').update({
        status: 'DISPONIBLE',
        numero_requisicion: null,
        taller_responsable: null,
        observacion_mecanica: null,
        proyeccion_salida: null
      }).eq('id', selectedAsset.id);

      if (updateError) throw updateError;

      toast.success('Orden de cierre registrada');
      await fetchAllData();
      return true;
    } catch (error) {
      toast.error(`Error: ${error.message}`);
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
    
    // Métodos de negocio (antiguos)
    handlePinSubmit,
    submitNewAsset,
    updateAsset,
    submitRequisition,
    handlePurchaseStatus,
    submitMaintenanceLog,
    submitSafetyReport,
    submitSafety,
    submitInitialCorrectiveLog,
    updateWorkshopInfo,
    submitCloseOrder,
    
    // Métodos de negocio (nuevos hooks)
    ...purchasingWorkflow,
    ...workshopWorkflow,
    ...safetyWorkflow,
    ...formValidation,
    
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
