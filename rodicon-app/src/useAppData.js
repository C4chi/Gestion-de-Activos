import { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import toast from 'react-hot-toast';
import { generatePdf } from './PurchaseOrderPDF';

export const useAppData = () => {
  // Datos
  const [user, setUser] = useState(null);
  const [assets, setAssets] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [safetyReports, setSafetyReports] = useState([]);
  const [mtoLogs, setMtoLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- CARGA DE DATOS ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: a } = await supabase.from('assets').select('*').order('ficha');
      const { data: p } = await supabase.from('purchase_orders').select('*').order('fecha_solicitud', { ascending: false });
      const { data: s } = await supabase.from('safety_reports').select('*').order('fecha_reporte', { ascending: false });
      const { data: m } = await supabase.from('maintenance_logs').select('*').order('fecha', { ascending: false });
      
      if (a) setAssets(a.map(asset => ({ ...asset, ficha: asset.ficha ? String(asset.ficha).trim() : asset.ficha }))); // Trim ficha on load
      if (p) setPurchases(p);
      if (s) setSafetyReports(s);
      if (m) setMtoLogs(m); // Los logs de mantenimiento se cargan directamente
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error al cargar los datos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) fetchData(); }, [user]);

  // --- LÓGICA DE NEGOCIO (ACCIONES) ---

  const handlePinSubmit = async (pinInput, onSuccess, onError) => {
    const { data } = await supabase.from('app_users').select('*').eq('pin', pinInput).single();
    if (data) {
      setUser(data);
      onSuccess(data);
    } else {
      onError();
    }
  };

  const submitNewAsset = async (newAssetForm) => {
    if (!newAssetForm.ficha) {
      toast.error("El campo 'Ficha' es requerido.");
      return false;
    }
    await supabase.from('assets').insert([newAssetForm]);
    fetchData();
    return true;
  };

  const handlePurchaseStatus = async (id, newStatus) => {
    const { error } = await supabase.from('purchase_orders').update({ estado: newStatus }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    fetchData();
  };

  const submitRequisition = async (reqForm, reqItems, selectedAsset, u) => {
    const uid = `REQ-${reqForm.req}-${Date.now().toString().slice(-4)}`;
    await supabase.from('purchase_orders').insert([{
      req_id: uid, ficha: selectedAsset.ficha, solicitante: reqForm.solicitadoPor || u.nombre, proyecto: reqForm.project, prioridad: reqForm.priority,
      items_json: reqItems, items_summary: reqItems.map(i => `(${i.qty}) ${i.desc}`).join(', '), estado: 'PENDIENTE'
    }]);
    if (selectedAsset.status === 'DISPONIBLE') {
      await supabase.from('assets').update({ status: 'ESPERA REPUESTO', numero_requisicion: reqForm.req }).eq('ficha', selectedAsset.ficha);
    }
    fetchData();
  };

  const handleReception = async (mode, comment, tempPurchase, u) => {
    const newStatus = mode === 'TOTAL' ? 'RECIBIDO' : 'PARCIAL';
    // Actualiza el estado de la orden de compra
    await supabase.from('purchase_orders').update({ estado: newStatus, notas_almacen: comment }).eq('id', tempPurchase.id);
    
    // Solo si la recepción es TOTAL, se cambia el estado del activo a "EN REPARACION"
    if (mode === 'TOTAL') {
      await supabase.from('assets').update({ status: 'EN REPARACION' }).eq('ficha', tempPurchase.ficha);
    }
    // Si es PARCIAL, el estado del activo no se toca, permanece en "ESPERA REPUESTO".
    fetchData();
  };

  const submitMaintenanceLog = async (logData, asset, user) => {    
    // Construcción explícita del objeto para evitar conflictos de propiedades
    const logToInsert = {
      ficha: asset.ficha ? String(asset.ficha).trim() : null,
      tipo: logData.tipo || 'NO ESPECIFICADO',
      fecha: logData.fecha ? logData.fecha.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      mecanico: logData.mecanico || null,
      descripcion: logData.descripcion ? String(logData.descripcion) : '',
      costo: logData.costo || 0,
      km_recorrido: logData.km ? parseInt(logData.km) : null,
      proyeccion_proxima_mto: logData.proyeccion_km || null,
      created_by: user.id || null,
    };

    const { error } = await supabase.from('maintenance_logs').insert([logToInsert]);

    if (error) {
      toast.error(`Error al guardar el mantenimiento: ${error.message}`);
      return;
    }
    fetchData();
  };

  const submitInitialCorrectiveLog = async (failureData, selectedAsset, u) => {
    const initialObservation = `[${new Date(failureData.fecha_entrada).toLocaleDateString()}] FALLA INICIAL: ${failureData.observacion_mecanica}`;

    // 1. Poner el activo como NO DISPONIBLE
    await supabase.from('assets').update({ 
      status: 'NO DISPONIBLE',
      taller_responsable: failureData.mecanico,
      proyeccion_entrada: failureData.fecha_entrada,
      observacion_mecanica: initialObservation
    }).eq('id', selectedAsset.id);
    // 2. Crear el log inicial de mantenimiento correctivo
    await submitMaintenanceLog({ fecha: failureData.fecha_entrada, tipo: 'CORRECTIVO', descripcion: `FALLA INICIAL: ${failureData.observacion_mecanica}`, mecanico: failureData.mecanico }, selectedAsset, u);
  };

  const updateWorkshopInfo = async (workshopData, selectedAsset, u) => {
    const oldComments = selectedAsset.observacion_mecanica || '';
    const newCommentText = workshopData.new_comment ? `\n[${new Date().toLocaleDateString()}] ${workshopData.new_comment}` : '';
    const updatedComments = oldComments + newCommentText;

    await supabase.from('assets').update({
      taller_responsable: workshopData.taller_responsable,
      proyeccion_salida: workshopData.proyeccion_salida,
      observacion_mecanica: updatedComments
    }).eq('id', selectedAsset.id);
    fetchData();
  };

  const submitCloseOrder = async (closeOrderForm, selectedAsset, u) => {
    const finalLog = { ...closeOrderForm };

    await submitMaintenanceLog({ ...finalLog, fecha: new Date(), tipo: 'CORRECTIVO' }, selectedAsset, u);
    await supabase.from('assets').update({ status: 'DISPONIBLE', numero_requisicion: null, taller_responsable: null, observacion_mecanica: null, proyeccion_salida: null }).eq('ficha', selectedAsset.ficha);
    fetchData();
  };

  const generatePurchaseOrderPdf = (purchaseOrderId) => {
    const order = purchases.find(p => p.id === purchaseOrderId);
    if (!order) {
      toast.error("No se encontró la orden de compra.");
      return;
    }
    const asset = assets.find(a => a.ficha === order.ficha);

    toast.promise(generatePdf(order, asset), {
      loading: 'Generando PDF...',
      success: 'PDF listo para descargar.',
      error: 'Error al generar el PDF.',
    });
  };

  const submitSafety = async (safetyForm, selectedAsset, u) => {
    await supabase.from('safety_reports').insert([{ ficha: selectedAsset.ficha, tipo: safetyForm.tipo, prioridad: safetyForm.prioridad, descripcion: safetyForm.desc, reportado_por: u.id, asignado_a: safetyForm.asignado, estado: 'PENDIENTE' }]);
    fetchData();
  };

  // --- VALORES DERIVADOS (KPIs) ---
  const kpis = useMemo(() => {
    const today = new Date();
    let warnCount = 0;
    let expCount = 0;

    assets.forEach(a => {
      if (a.fecha_de_vencimiento_de_seguro) {
        const d = new Date(a.fecha_de_vencimiento_de_seguro);
        const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
        if (d < today) expCount++;
        else if (diff >= 0 && diff <= 30) warnCount++;
      }
    });

    return {
      total: assets.filter(a => a.visible !== 0).length,
      noOp: assets.filter(a => ['NO DISPONIBLE', 'EN TALLER', 'ESPERA REPUESTO', 'MTT PREVENTIVO'].includes(a.status)).length,
      warn: warnCount,
      exp: expCount,
      avail: assets.filter(a => a.status === 'DISPONIBLE').length
    };
  }, [assets]);

  return {
    // State
    user, setUser, assets, purchases, safetyReports, mtoLogs, loading,
    // Data Fetching
    fetchData,
    // KPIs
    kpis,
    // Actions
    handlePinSubmit,
    submitNewAsset,
    handlePurchaseStatus,
    submitRequisition,
    submitInitialCorrectiveLog,
    generatePurchaseOrderPdf,
    updateWorkshopInfo,
    submitMaintenanceLog,
    handleReception,
    submitCloseOrder,
    submitSafety,
  };
};