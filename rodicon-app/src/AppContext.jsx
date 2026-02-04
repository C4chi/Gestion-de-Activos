import React, { createContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { supabase } from './supabaseClient';
import { usePurchasingWorkflow } from './hooks/usePurchasingWorkflow';
import { useWorkshopWorkflow } from './hooks/useWorkshopWorkflow';
import { useSafetyWorkflow } from './hooks/useSafetyWorkflow';
import { useFormValidation } from './hooks/useFormValidation';
import { generatePdf } from './PurchaseOrderPDF';

/**
 * AppContext centraliza TODO el estado global de la app
 * Elimina necesidad de prop drilling a través de 20+ componentes
 */
export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // Estado global
  const [user, setUser] = useState(null);
  const [assets, setAssets] = useState([]);
  const [allAssets, setAllAssets] = useState([]); // Todos los activos para KPIs
  const [purchases, setPurchases] = useState([]);
  const [safetyReports, setSafetyReports] = useState([]);
  const [mtoLogs, setMtoLogs] = useState([]);
  const [appUsers, setAppUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assetsPage, setAssetsPage] = useState(1);
  const [assetsTotalCount, setAssetsTotalCount] = useState(0);
  const assetsPageSize = 20;

  // Helpers de roles
  const can = useCallback((roles) => {
    if (!roles || !user?.rol) return false;
    
    const list = Array.isArray(roles) ? roles : [roles];
    
    // Rol supremo: Admin Global
    if (user.rol === 'ADMIN_GLOBAL') return true;
    // Rol admin clásico mantiene permisos amplios
    if (user.rol === 'ADMIN') return true;
    
    // GERENTE: Acceso a todo excepto cuando SOLO se pide ADMIN/ADMIN_GLOBAL
    if (user.rol === 'GERENTE') {
      // Si GERENTE está en la lista de roles permitidos, dar acceso
      if (list.includes('GERENTE')) return true;
      // Si solo se pide ADMIN o ADMIN_GLOBAL (sin otros roles), bloquear
      const onlyAdmin = list.every(r => r === 'ADMIN' || r === 'ADMIN_GLOBAL');
      if (onlyAdmin) return false;
      // Para todo lo demás (TALLER, COMPRAS, HSE), permitir
      return true;
    }
    
    // Otros roles: verificar si están en la lista
    return list.includes(user.rol);
  }, [user]);

  const requireRole = useCallback((roles, actionLabel = 'acción') => {
    if (!can(roles)) {
      toast.error('No tienes permiso para esta acción');
      console.warn(`⛔ Acceso denegado (${actionLabel}) para rol:`, user?.rol);
      return false;
    }
    return true;
  }, [can, user]);

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

      // Fetch página actual
      const { data, count, error } = await supabase
        .from('assets')
        .select('*', { count: 'exact' })
        .order('ficha')
        .range(from, to);

      if (error) throw error;
      setAssets(data || []);
      setAssetsTotalCount(count || 0);
      setAssetsPage(page);
      
      // También fetch todos para KPIs (en background)
      const { data: allData } = await supabase
        .from('assets')
        .select('*')
        .order('ficha');
      
      if (allData) {
        setAllAssets(allData);
      }
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

      if (assetsRes.data) {
        console.log('✅ Antes de setAssets - Assets actual:', assets?.length);
        console.log('✅ Nuevos Assets a actualizar:', assetsRes.data.length, 'registros');
        const firstAsset = assetsRes.data[0];
        console.log('   Primer asset después del fetch:', {
          id: firstAsset.id,
          ficha: firstAsset.ficha,
          tipo: firstAsset.tipo,
          marca: firstAsset.marca,
          modelo: firstAsset.modelo,
          año: firstAsset.año
        });
        setAssets(assetsRes.data);
        setAllAssets(assetsRes.data);
        // Log DESPUÉS de setAssets (nota: será un log del render siguiente)
        console.log('✅ setAssets llamado - nuevo array será reflejado en siguiente render');
      }
      if (purchasesRes.data) {
        console.log('✅ Purchases actualizado:', purchasesRes.data.length, 'registros');
        setPurchases(purchasesRes.data);
      }
      if (safetyRes.data) {
        console.log('✅ Safety actualizado:', safetyRes.data.length, 'registros');
        setSafetyReports(safetyRes.data);
      }
      if (mtoRes.data) {
        console.log('✅ MtoLogs actualizado:', mtoRes.data.length, 'registros');
        setMtoLogs(mtoRes.data);
      }
    } catch (error) {
      console.error('🚨 Error fetching all data:', error);
      toast.error('Error cargando datos');
    } finally {
      setLoading(false);
      console.log('✅ Recarga completada');
    }
  }, []);

  const fetchAppUsers = useCallback(async () => {
    try {
      const isAdminGlobal = user?.rol === 'ADMIN_GLOBAL';
      const columns = isAdminGlobal ? 'id,nombre,nombre_usuario,pin,rol' : 'id,nombre,nombre_usuario,rol';
      const { data, error } = await supabase.from('app_users').select(columns).order('nombre');
      if (error) throw error;
      setAppUsers(data || []);
      return data || [];
    } catch (error) {
      console.error('Error cargando usuarios:', error.message);
      toast.error('Error al cargar usuarios');
      return [];
    }
  }, [user]);

  // Auto-fetch cuando user cambia
  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user, fetchAllData]);

  // Monitor cuando assets cambia
  useEffect(() => {
    console.log('🔔 ASSETS CAMBIÓ EN CONTEXTO:', assets?.length, 'registros');
    if (assets && assets.length > 0) {
      console.log('   Primer asset:', assets[0].ficha, '-', assets[0].marca, assets[0].modelo);
    }
  }, [assets]);

  // Métodos de negocio
  const handlePinSubmit = async (credentials, onSuccess, onError) => {
    try {
      // Soportar ambos formatos: { nombreUsuario, pin } o solo pin (legacy)
      const isLegacy = typeof credentials === 'string';
      const nombreUsuario = isLegacy ? null : credentials?.nombreUsuario?.trim();
      const pin = isLegacy ? credentials : credentials?.pin;

      if (!isLegacy && !nombreUsuario) {
        console.warn('❌ Nombre de usuario requerido');
        if (onError) onError();
        return false;
      }

      if (!pin) {
        console.warn('❌ PIN requerido');
        if (onError) onError();
        return false;
      }

      console.log('🔐 Intentando login:', isLegacy ? 'PIN mode' : `Usuario: ${nombreUsuario}`);
      
      // Construir query dinámico
      let query = supabase.from('app_users').select('*').eq('pin', pin);
      
      if (!isLegacy) {
        // Modo nuevo: nombre_usuario + PIN
        query = query.eq('nombre_usuario', nombreUsuario);
      }

      const { data, error } = await query;

      console.log('📊 Respuesta Supabase - Data:', data, 'Error:', error);

      // Si hay error en la consulta
      if (error) {
        console.warn('❌ Error en la consulta:', error.message);
        if (onError) onError();
        return false;
      }

      // Si no hay datos o array está vacío
      if (!data || data.length === 0) {
        console.warn('❌ Credenciales incorrectas');
        if (onError) onError();
        return false;
      }

      const user = data[0]; // Tomar el primer resultado
      console.log('✅ Login exitoso para usuario:', user.nombre_usuario || user.nombre || user.id);
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
      console.log('📝 Actualizando activo:', { assetId, updates });
      console.log('   Updates a enviar - marca:', updates.marca, 'tipo:', updates.tipo, 'modelo:', updates.modelo);
      
      const { error, data } = await supabase
        .from('assets')
        .update(updates)
        .eq('id', assetId)
        .select();
      
      if (error) {
        console.error('❌ Error en Supabase:', error);
        throw error;
      }
      
      console.log('✅ Activo actualizado en BD - datos retornados:');
      if (data && data[0]) {
        console.log({
          marca: data[0].marca,
          tipo: data[0].tipo,
          modelo: data[0].modelo,
          año: data[0].año
        });
      }
      toast.success('✅ Activo actualizado correctamente');
      
      // Optimistic update local (evita esperar fetch para ver el cambio)
      setAssets((prev) => {
        if (!prev || prev.length === 0) return prev;
        return prev.map((asset) => asset.id === assetId ? { ...asset, ...updates } : asset);
      });

      // Refrescar datos globales desde BD para mantener consistencia
      console.log('🔄 Recargando datos globales...');
      await fetchAllData();
      console.log('✅ Datos globales refrescados');
      
      return true;
    } catch (error) {
      console.error('🚨 Error al actualizar activo:', error.message);
      toast.error('Error: ' + error.message);
      return false;
    }
  };

  const submitRequisition = async (reqForm, reqItems, selectedAsset) => {
    if (!requireRole(['ADMIN', 'COMPRAS'], 'crear requisición')) return false;
    try {
      const uid = `REQ-${reqForm.req}-${Date.now().toString().slice(-4)}`;
      
      // 1. Insertar la orden de compra
      const { data: orderData, error: orderError } = await supabase
        .from('purchase_orders')
        .insert([{
          numero_requisicion: uid,
          ficha: selectedAsset.ficha,
          solicitante: reqForm.solicitadoPor || user.nombre,
          proyecto: reqForm.project,
          prioridad: reqForm.priority,
          estado: 'PENDIENTE',
          tipo_compra: 'ACTIVO_ESPECIFICO',
          moneda: reqForm.moneda || 'DOP', // NUEVO: campo de moneda
          created_by: user.id || null
        }])
        .select();

      if (orderError) throw orderError;
      const orderId = orderData[0].id;

      // 2. Insertar los items
      if (reqItems && reqItems.length > 0) {
        const itemsToInsert = reqItems.map(item => ({
          purchase_id: orderId,
          descripcion: item.desc || '',
          cantidad: item.qty || 1,
          codigo: item.code || null,
          ficha_ref: selectedAsset.ficha,
          estado_linea: 'PENDIENTE'
        }));

        const { error: itemsError } = await supabase
          .from('purchase_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      // 3. Actualizar el estado del activo (siempre a ESPERA REPUESTO al crear requisición)
      await supabase
        .from('assets')
        .update({ status: 'ESPERA REPUESTO', numero_requisicion: uid })
        .eq('ficha', selectedAsset.ficha);
      
      toast.success('Requisición creada');
      await fetchAllData();
      return true;
    } catch (error) {
      toast.error(error.message);
      return false;
    }
  };

  /**
   * NUEVO: Crear requisición multi-activo
   * Permite vincular múltiples activos en una sola orden de compra
   * Cada línea puede estar asociada a un activo diferente
   */
  const submitRequisitionMultiAsset = async (reqFormData) => {
    if (!requireRole(['ADMIN', 'COMPRAS'], 'crear requisición multi-activo')) return false;
    try {
      const { req, solicitadoPor, project, priority, tipoCompra, moneda, items } = reqFormData;
      
      if (!items || items.length === 0) {
        toast.error('Debe incluir al menos una línea en la requisición');
        return false;
      }

      const uid = `REQ-${req}-${Date.now().toString().slice(-4)}`;

      // 1. Insertar la orden de compra GENERAL (sin ficha específica)
      const { data: orderData, error: orderError } = await supabase
        .from('purchase_orders')
        .insert([{
          numero_requisicion: uid,
          ficha: 'MULTI', // Identificador para órdenes múltiples
          solicitante: solicitadoPor || user.nombre,
          proyecto: project,
          prioridad: priority,
          estado: 'PENDIENTE',
          tipo_compra: tipoCompra,
          moneda: moneda || 'DOP', // NUEVO: campo de moneda
          created_by: user.id || null
        }])
        .select();

      if (orderError) throw orderError;
      const orderId = orderData[0].id;

      // 2. Insertar cada línea con su activo correspondiente
      const itemsToInsert = items.map(item => ({
        purchase_id: orderId,
        descripcion: item.desc,
        cantidad: item.qty,
        codigo: item.code || null,
        ficha_ref: item.ficha || null, // Vincular cada línea a su activo
        estado_linea: 'PENDIENTE',
        observaciones: item.obsItem || null
      }));

      const { error: itemsError } = await supabase
        .from('purchase_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // 3. Actualizar estado de los activos involucrados (si es tipo ACTIVO_ESPECIFICO)
      const activosUnicos = [...new Set(items.map(i => i.ficha).filter(f => f))];
      
      if (tipoCompra === 'ACTIVO_ESPECIFICO' && activosUnicos.length > 0) {
        for (const ficha of activosUnicos) {
          await supabase
            .from('assets')
            .update({
              status: 'ESPERA REPUESTO',
              numero_requisicion: uid
            })
            .eq('ficha', ficha);
        }
      }

      toast.success(`Requisición multi-activo creada con ${items.length} línea(s)`);
      await fetchAllData();
      return true;
    } catch (error) {
      console.error('Error en submitRequisitionMultiAsset:', error);
      toast.error(`Error al crear requisición: ${error.message}`);
      return false;
    }
  };

  const handlePurchaseStatus = async (id, newStatus) => {
    if (!requireRole(['ADMIN', 'COMPRAS'], 'actualizar estado de compra')) return false;
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

  const handleReception = async (mode, comment, tempPurchase) => {
    if (!requireRole(['ADMIN', 'COMPRAS'], 'recepción de compra')) return false;

    let finalStatus = 'PENDIENTE';
    let assetStatus = null;

    if (mode === 'TOTAL') {
      finalStatus = 'RECIBIDO';
      assetStatus = 'EN REPARACION';
    } else {
      finalStatus = 'PENDIENTE';
    }

    try {
      await supabase
        .from('purchase_orders')
        .update({
          estado: finalStatus,
          comentario_recepcion: mode === 'PARCIAL' ? comment : null,
          fecha_actualizacion: new Date().toISOString(),
        })
        .eq('id', tempPurchase.id);

      if (assetStatus) {
        await supabase
          .from('assets')
          .update({
            status: assetStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('ficha', tempPurchase.ficha);
      }

      await fetchAllData();
      return true;
    } catch (error) {
      toast.error(error.message || 'Error en recepción');
      return false;
    }
  };

  const submitMaintenanceLog = async (logData, asset, user) => {
    if (!requireRole(['ADMIN', 'TALLER'], 'registrar mantenimiento')) return false;
    try {
      // Construir el log con los campos correctos de la tabla
      const fechaIso = logData.fecha instanceof Date
        ? logData.fecha.toISOString().split('T')[0]
        : (typeof logData.fecha === 'string' && logData.fecha.length >= 10
            ? logData.fecha.slice(0, 10)
            : new Date().toISOString().split('T')[0]);

      const createdByNumeric = Number.isFinite(Number(user?.id)) ? Number(user.id) : null;

      // Solo incluimos columnas válidas del esquema para evitar parseos erróneos
      const logToInsert = {
        ficha: asset && asset.ficha ? String(asset.ficha).trim() : (logData.ficha || null),
        tipo: logData.tipo || 'NO ESPECIFICADO',
        fecha: fechaIso,
        mecanico: logData.mecanico || null,
        descripcion: logData.descripcion ? String(logData.descripcion) : '',
        costo: logData.costo ? Number(logData.costo) : 0,
        km_recorrido: logData.km ? parseInt(logData.km, 10) : null,
        proyeccion_proxima_km: logData.proyeccion_km ? Number(logData.proyeccion_km) : null,
        created_by: createdByNumeric,
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
    if (!requireRole(['ADMIN', 'HSE'], 'crear reporte HSE')) return false;
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
    if (!requireRole(['ADMIN', 'HSE'], 'registrar reporte HSE')) return false;
    try {
      if (!selectedAsset || !selectedAsset.ficha) {
        throw new Error('Activo no válido');
      }

      const notas = safetyForm.notas || null;

      const { error } = await supabase.from('safety_reports').insert([{
        ficha: safetyForm.ficha || selectedAsset.ficha,
        tipo: safetyForm.tipo || 'INCIDENTE',
        prioridad: safetyForm.prioridad || 'Media',
        plazo_horas: safetyForm.plazo_horas || 24,
        descripcion: safetyForm.descripcion || safetyForm.desc || '',
        reportado_por: u.id || null,
        asignado_a: safetyForm.asignado_a || safetyForm.asignado || null,
        estado: 'PENDIENTE',
        foto_url: safetyForm.foto_url || null,
        lugar: safetyForm.lugar || null,
        turno: safetyForm.turno || null,
        notas,
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
    if (!requireRole(['ADMIN', 'TALLER'], 'registrar falla inicial')) return false;
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

  const createAppUser = async (newUser) => {
    if (!requireRole(['ADMIN', 'ADMIN_GLOBAL'], 'crear usuario')) return false;
    try {
      if (!newUser?.pin || String(newUser.pin).length < 4) {
        throw new Error('PIN de 4 dígitos requerido');
      }
      if (!newUser?.rol) {
        throw new Error('Rol requerido');
      }
      const payload = {
        nombre: newUser.nombre || null,
        pin: String(newUser.pin),
        rol: newUser.rol,
      };
      const { error } = await supabase.from('app_users').insert([payload]);
      if (error) throw error;
      toast.success('Usuario creado');
      await fetchAppUsers();
      return true;
    } catch (error) {
      toast.error(error.message);
      return false;
    }
  };

  const updateAppUser = async (userId, updates) => {
    if (!requireRole(['ADMIN_GLOBAL'], 'actualizar usuario')) return false;
    try {
      if (!userId) throw new Error('ID de usuario requerido');
      const payload = {};
      if (typeof updates.nombre !== 'undefined') payload.nombre = updates.nombre || null;
      if (typeof updates.pin !== 'undefined') {
        if (!updates.pin || String(updates.pin).length < 4) {
          throw new Error('PIN de 4 dígitos requerido');
        }
        payload.pin = String(updates.pin);
      }
      if (typeof updates.rol !== 'undefined') payload.rol = updates.rol;

      const { error } = await supabase.from('app_users').update(payload).eq('id', userId);
      if (error) throw error;
      toast.success('Usuario actualizado');
      await fetchAppUsers();
      return true;
    } catch (error) {
      toast.error(error.message);
      return false;
    }
  };

  const updateWorkshopInfo = async (workshopData, selectedAsset, u) => {
    if (!requireRole(['ADMIN', 'TALLER'], 'actualizar taller')) return false;
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
    if (!requireRole(['ADMIN', 'TALLER'], 'cerrar orden')) return false;
    try {
      if (!selectedAsset || !selectedAsset.ficha) {
        throw new Error('Activo no válido');
      }

      // Preparar evidencias si existen
      const evidenciasJson = closeOrderForm.evidencias && closeOrderForm.evidencias.length > 0 
        ? JSON.stringify(closeOrderForm.evidencias) 
        : null;

      // Registrar el log final
      const logData = {
        ficha: String(selectedAsset.ficha).trim(),
        tipo: 'CORRECTIVO',
        fecha: new Date().toISOString().split('T')[0],
        mecanico: closeOrderForm.mecanico || null,
        descripcion: closeOrderForm.descripcion || 'Orden de cierre completada',
        costo: closeOrderForm.costo || 0,
        created_by: u.id || null,
        evidencias: evidenciasJson, // Guardar evidencias como JSON
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

  const generatePurchaseOrderPdf = async (purchaseOrderId) => {
    try {
      const order = purchases.find(p => p.id === purchaseOrderId);
      if (!order) {
        toast.error("No se encontró la orden de compra.");
        return;
      }
      const asset = assets.find(a => a.ficha === order.ficha);

      await toast.promise(generatePdf(order, asset), {
        loading: 'Generando PDF...',
        success: 'PDF generado correctamente.',
        error: 'Error al generar el PDF.',
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error al generar PDF');
    }
  };

  const value = {
    // Estado
    user,
    assets,
    allAssets, // Todos los activos para KPIs
    purchases,
    safetyReports,
    mtoLogs,
    appUsers,
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
    setAppUsers,

    // Roles
    can,
    requireRole,
    
    // Métodos de negocio (antiguos)
    handlePinSubmit,
    submitNewAsset,
    updateAsset,
    submitRequisition,
    submitRequisitionMultiAsset, // NUEVO: para compras multi-activo
    handlePurchaseStatus,
    submitMaintenanceLog,
    submitSafetyReport,
    submitSafety,
    submitInitialCorrectiveLog,
    updateWorkshopInfo,
    submitCloseOrder,
    handleReception,
    generatePurchaseOrderPdf,
    fetchAppUsers,
    createAppUser,
    updateAppUser,
    
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
