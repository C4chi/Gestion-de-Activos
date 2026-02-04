/**
 * Servicio para manejo de Maintenance Logs & Work Orders
 * Operaciones CRUD de logs de mantenimiento y órdenes de trabajo
 */

import { supabase } from '../supabaseClient';

/**
 * Obtiene todos los maintenance logs
 */
export const getMaintenanceLogs = async () => {
  try {
    const { data, error } = await supabase
      .from('maintenance_logs')
      .select('*')
      .order('fecha', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching maintenance logs:', error);
    return { data: null, error };
  }
};

/**
 * Obtiene logs por asset
 */
export const getMaintenanceLogsByAsset = async (assetId) => {
  try {
    const { data, error } = await supabase
      .from('maintenance_logs')
      .select('*')
      .eq('asset_id', assetId)
      .order('fecha', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching maintenance logs by asset:', error);
    return { data: null, error };
  }
};

/**
 * Crea un nuevo maintenance log
 */
export const createMaintenanceLog = async (logData) => {
  try {
    const { data, error } = await supabase
      .from('maintenance_logs')
      .insert([logData])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error creating maintenance log:', error);
    return { data: null, error };
  }
};

/**
 * Obtiene todas las work orders
 */
export const getWorkOrders = async () => {
  try {
    const { data, error } = await supabase
      .from('work_orders')
      .select('*')
      .order('fecha_creacion', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching work orders:', error);
    return { data: null, error };
  }
};

/**
 * Obtiene work orders por estado
 */
export const getWorkOrdersByStatus = async (status) => {
  try {
    const { data, error } = await supabase
      .from('work_orders')
      .select('*')
      .eq('estado', status)
      .order('fecha_creacion', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching work orders by status:', error);
    return { data: null, error };
  }
};

/**
 * Crea una nueva work order y actualiza el estado del asset
 */
export const createWorkOrder = async (orderData) => {
  try {
    console.log('🔵 createWorkOrder - orderData:', orderData);
    
    // Crear la work order
    const { data, error } = await supabase
      .from('work_orders')
      .insert([{
        ...orderData,
        fecha_creacion: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;
    console.log('✅ Work order creada:', data);

    // Si tiene asset_id, actualizar el estado del asset y crear log
    if (orderData.asset_id) {
      console.log('🔄 Actualizando asset_id:', orderData.asset_id, 'a NO DISPONIBLE');
      
      // Obtener la ficha del asset (requerida para el log)
      const { data: assetData, error: assetFetchError } = await supabase
        .from('assets')
        .select('ficha')
        .eq('id', orderData.asset_id)
        .single();

      if (assetFetchError) {
        console.error('❌ Error obteniendo asset:', assetFetchError);
        throw assetFetchError;
      }

      // Marcar el activo como NO DISPONIBLE al crear la orden (alineado con flujo antiguo)
      const { data: updatedAsset, error: assetError } = await supabase
        .from('assets')
        .update({ 
          status: 'NO DISPONIBLE'
        })
        .eq('id', orderData.asset_id)
        .select()
        .single();

      if (assetError) {
        console.error('❌ Error updating asset status:', assetError);
        throw assetError;
      }
      console.log('✅ Asset actualizado:', updatedAsset);

      // Crear maintenance_log inicial
      const logData = {
        ficha: assetData.ficha,
        tipo: orderData.tipo || 'CORRECTIVO',
        fecha: new Date().toISOString().split('T')[0],
        mecanico: null,
        descripcion: `[WORK ORDER #${data.id}] ${orderData.titulo}: ${orderData.descripcion || 'En proceso'}`,
        costo: 0,
        created_by: orderData.created_by || null,
      };

      const { error: logError } = await supabase
        .from('maintenance_logs')
        .insert([logData]);

      if (logError) {
        console.error('❌ Error creando log:', logError);
        throw logError;
      }
      console.log('✅ Maintenance log creado');
    }

    return { data, error: null };
  } catch (error) {
    console.error('❌ Error creating work order:', error);
    return { data: null, error };
  }
};

/**
 * Asigna work order a un mecánico
 */
export const assignWorkOrder = async (id, userId, userName) => {
  try {
    const { data, error } = await supabase
      .from('work_orders')
      .update({
        asignado_a_id: userId,
        asignado_a: userName,
        fecha_asignacion: new Date().toISOString(),
        estado: 'ASIGNADA',
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error assigning work order:', error);
    return { data: null, error };
  }
};

/**
 * Inicia trabajo en work order y asegura que asset esté EN TALLER
 */
export const startWorkOrder = async (id) => {
  try {
    // Obtener la work order para saber el asset_id
    const { data: workOrder, error: fetchError } = await supabase
      .from('work_orders')
      .select('asset_id')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Actualizar la work order
    const { data, error } = await supabase
      .from('work_orders')
      .update({
        estado: 'EN_PROGRESO',
        fecha_inicio: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Asegurar que el asset esté EN TALLER cuando se inicia el trabajo
    if (workOrder.asset_id) {
      const { error: assetError } = await supabase
        .from('assets')
        .update({ 
          status: 'EN TALLER'
        })
        .eq('id', workOrder.asset_id);

      if (assetError) {
        console.error('Error updating asset status:', assetError);
      }
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error starting work order:', error);
    return { data: null, error };
  }
};

/**
 * Pausa work order y actualiza asset a ESPERA REPUESTO
 */
export const pauseWorkOrder = async (id, reason = 'Esperando repuestos') => {
  try {
    // Obtener la work order para saber el asset_id
    const { data: workOrder, error: fetchError } = await supabase
      .from('work_orders')
      .select('asset_id')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Actualizar la work order
    const { data, error } = await supabase
      .from('work_orders')
      .update({
        estado: 'PAUSADA',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Actualizar el asset a ESPERA REPUESTO cuando se pausa
    if (workOrder.asset_id) {
      const { error: assetError } = await supabase
        .from('assets')
        .update({ 
          status: 'ESPERA REPUESTO'
        })
        .eq('id', workOrder.asset_id);

      if (assetError) {
        console.error('Error updating asset status:', assetError);
      }
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error pausing work order:', error);
    return { data: null, error };
  }
};

/**
 * Reanuda work order (cuando llegan repuestos) y actualiza asset a EN TALLER
 */
export const resumeWorkOrder = async (id) => {
  try {
    // Obtener la work order para saber el asset_id
    const { data: workOrder, error: fetchError } = await supabase
      .from('work_orders')
      .select('asset_id')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Actualizar la work order a EN_PROGRESO
    const { data, error } = await supabase
      .from('work_orders')
      .update({
        estado: 'EN_PROGRESO',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Actualizar el asset a EN TALLER cuando se reanuda
    if (workOrder.asset_id) {
      const { error: assetError } = await supabase
        .from('assets')
        .update({ 
          status: 'EN TALLER'
        })
        .eq('id', workOrder.asset_id);

      if (assetError) {
        console.error('Error updating asset status:', assetError);
      }
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error resuming work order:', error);
    return { data: null, error };
  }
};

/**
 * Actualiza una work order
 */
export const updateWorkOrder = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('work_orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating work order:', error);
    return { data: null, error };
  }
};

/**
 * Cierra una work order y devuelve el asset a operativo
 */
export const closeWorkOrder = async (id, closeData) => {
  try {
    // Primero obtener la work order completa
    const { data: workOrder, error: fetchError } = await supabase
      .from('work_orders')
      .select('asset_id, tipo, titulo')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Actualizar la work order
    const { data, error } = await supabase
      .from('work_orders')
      .update({
        estado: 'COMPLETADA',
        notas_cierre: closeData.notas,
        horas_reales: closeData.horasReales,
        costo_real: closeData.costoReal,
        partes_usadas: closeData.partesUsadas,
        fecha_cierre: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Actualizar el asset a OPERATIVO y crear log de cierre
    if (workOrder.asset_id) {
      // Obtener ficha del asset
      const { data: assetData, error: assetFetchError } = await supabase
        .from('assets')
        .select('ficha')
        .eq('id', workOrder.asset_id)
        .single();

      if (!assetFetchError && assetData) {
        // Actualizar estado
        const { error: assetError } = await supabase
          .from('assets')
          .update({ 
            status: 'OPERATIVO'
          })
          .eq('id', workOrder.asset_id);

        if (assetError) {
          console.error('Error updating asset status:', assetError);
        }

        // Crear log de cierre
        const logData = {
          ficha: assetData.ficha,
          tipo: workOrder.tipo || 'CORRECTIVO',
          fecha: new Date().toISOString().split('T')[0],
          mecanico: closeData.mecanico || null,
          descripcion: `[WORK ORDER #${id} COMPLETADA] ${workOrder.titulo}: ${closeData.notas || 'Trabajo finalizado'}`,
          costo: closeData.costoReal || 0,
          created_by: closeData.created_by || null,
        };

        const { error: logError } = await supabase
          .from('maintenance_logs')
          .insert([logData]);

        if (logError) {
          console.error('Error creando log de cierre:', logError);
        } else {
          console.log('✅ Log de cierre creado');
        }
      }
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error closing work order:', error);
    return { data: null, error };
  }
};

/**
 * Cancela una work order y devuelve el asset a operativo
 */
export const cancelWorkOrder = async (id, reason) => {
  try {
    // Obtener la work order para saber el asset_id
    const { data: workOrder, error: fetchError } = await supabase
      .from('work_orders')
      .select('asset_id')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Actualizar la work order
    const { data, error } = await supabase
      .from('work_orders')
      .update({
        estado: 'CANCELADA',
        notas_cierre: `CANCELADA: ${reason}`,
        fecha_cierre: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Actualizar el asset a OPERATIVO cuando se cancela
    if (workOrder.asset_id) {
      const { error: assetError } = await supabase
        .from('assets')
        .update({ 
          status: 'OPERATIVO'
        })
        .eq('id', workOrder.asset_id);

      if (assetError) {
        console.error('Error updating asset status:', assetError);
      }
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error canceling work order:', error);
    return { data: null, error };
  }
};

/**
 * Obtiene work orders atrasadas (más de 48 horas)
 */
export const getOverdueWorkOrders = async () => {
  try {
    const twoDaysAgo = new Date();
    twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);

    const { data, error } = await supabase
      .from('work_orders')
      .select('*')
      .in('estado', ['ABIERTA', 'ASIGNADA', 'EN_PROGRESO', 'PAUSADA'])
      .lt('fecha_creacion', twoDaysAgo.toISOString())
      .order('fecha_creacion', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching overdue work orders:', error);
    return { data: null, error };
  }
};

/**
 * Obtiene estadísticas de mantenimiento
 */
export const getMaintenanceStatistics = async () => {
  try {
    const [logsRes, ordersRes] = await Promise.all([
      supabase.from('maintenance_logs').select('tipo, asset_id'),
      supabase.from('work_orders').select('estado, prioridad'),
    ]);

    if (logsRes.error) throw logsRes.error;
    if (ordersRes.error) throw ordersRes.error;

    const stats = {
      totalLogs: logsRes.data.length,
      totalOrders: ordersRes.data.length,
      logsPorTipo: {},
      ordenesPorEstado: {},
      ordenesPorPrioridad: {},
    };

    // Contar logs por tipo
    logsRes.data.forEach(log => {
      stats.logsPorTipo[log.tipo] = (stats.logsPorTipo[log.tipo] || 0) + 1;
    });

    // Contar órdenes por estado
    ordersRes.data.forEach(order => {
      stats.ordenesPorEstado[order.estado] = 
        (stats.ordenesPorEstado[order.estado] || 0) + 1;
      stats.ordenesPorPrioridad[order.prioridad] = 
        (stats.ordenesPorPrioridad[order.prioridad] || 0) + 1;
    });

    return { data: stats, error: null };
  } catch (error) {
    console.error('Error fetching maintenance statistics:', error);
    return { data: null, error };
  }
};
