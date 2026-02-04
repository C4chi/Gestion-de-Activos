/**
 * Servicio para Planes de Mantenimiento Preventivo
 * Gestión de programación y recordatorios automáticos
 */

import { supabase } from '../supabaseClient';

/**
 * Obtiene todos los planes de mantenimiento
 */
export const getMaintenancePlans = async () => {
  try {
    const { data, error } = await supabase
      .from('maintenance_plans')
      .select(`
        *,
        assets (
          ficha,
          nombre,
          ubicacion,
          estado
        )
      `)
      .order('proxima_ejecucion', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching maintenance plans:', error);
    return { data: null, error };
  }
};

/**
 * Obtiene planes de mantenimiento próximos (7 días)
 */
export const getUpcomingMaintenance = async (days = 7) => {
  try {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const { data, error } = await supabase
      .from('maintenance_plans')
      .select(`
        *,
        assets (
          ficha,
          nombre,
          ubicacion,
          estado
        )
      `)
      .eq('activo', true)
      .lte('proxima_ejecucion', futureDate.toISOString().split('T')[0])
      .order('proxima_ejecucion', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching upcoming maintenance:', error);
    return { data: null, error };
  }
};

/**
 * Obtiene planes de mantenimiento vencidos
 */
export const getOverdueMaintenance = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('maintenance_plans')
      .select(`
        *,
        assets (
          ficha,
          nombre,
          ubicacion,
          estado
        )
      `)
      .eq('activo', true)
      .lt('proxima_ejecucion', today)
      .order('proxima_ejecucion', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching overdue maintenance:', error);
    return { data: null, error };
  }
};

/**
 * Obtiene planes por asset
 */
export const getMaintenancePlansByAsset = async (assetId) => {
  try {
    const { data, error } = await supabase
      .from('maintenance_plans')
      .select('*')
      .eq('asset_id', assetId)
      .order('proxima_ejecucion', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching maintenance plans by asset:', error);
    return { data: null, error };
  }
};

/**
 * Crea un nuevo plan de mantenimiento
 */
export const createMaintenancePlan = async (planData) => {
  try {
    // Calcular próxima ejecución si no viene
    if (!planData.proxima_ejecucion) {
      const today = new Date();
      today.setDate(today.getDate() + (planData.frecuencia_dias || 30));
      planData.proxima_ejecucion = today.toISOString().split('T')[0];
    }

    const { data, error } = await supabase
      .from('maintenance_plans')
      .insert([planData])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error creating maintenance plan:', error);
    return { data: null, error };
  }
};

/**
 * Actualiza un plan de mantenimiento
 */
export const updateMaintenancePlan = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('maintenance_plans')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating maintenance plan:', error);
    return { data: null, error };
  }
};

/**
 * Elimina un plan de mantenimiento
 */
export const deleteMaintenancePlan = async (id) => {
  try {
    const { error } = await supabase
      .from('maintenance_plans')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting maintenance plan:', error);
    return { error };
  }
};

/**
 * Ejecuta un mantenimiento (crea work order y actualiza próxima fecha)
 */
export const executeMaintenancePlan = async (planId, userId, userName) => {
  try {
    // Obtener plan
    const { data: plan, error: planError } = await supabase
      .from('maintenance_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError) throw planError;

    // Crear work order usando el servicio (que actualiza el asset automáticamente)
    const { createWorkOrder } = await import('./maintenanceService');
    const { data: workOrder, error: woError } = await createWorkOrder({
      asset_id: plan.asset_id,
      titulo: plan.nombre,
      descripcion: plan.descripcion,
      tipo: 'PREVENTIVO',
      prioridad: 'MEDIA',
      estado: 'ABIERTA',
      plan_mto_id: planId,
      horas_estimadas: plan.estimado_horas,
      checklist: plan.tareas,
      created_by: userId,
    });

    if (woError) throw woError;

    // Calcular próxima fecha
    const nextDate = new Date(plan.proxima_ejecucion);
    nextDate.setDate(nextDate.getDate() + plan.frecuencia_dias);

    // Actualizar plan
    const { error: updateError } = await supabase
      .from('maintenance_plans')
      .update({
        ultima_ejecucion: plan.proxima_ejecucion,
        proxima_ejecucion: nextDate.toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })
      .eq('id', planId);

    if (updateError) throw updateError;

    return { data: workOrder, error: null };
  } catch (error) {
    console.error('Error executing maintenance plan:', error);
    return { data: null, error };
  }
};

/**
 * Obtiene estadísticas de mantenimiento preventivo
 */
export const getMaintenanceStatistics = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [plansRes, overdueRes, upcomingRes, workOrdersRes] = await Promise.all([
      supabase.from('maintenance_plans').select('activo').eq('activo', true),
      supabase.from('maintenance_plans').select('id').eq('activo', true).lt('proxima_ejecucion', today),
      supabase.from('maintenance_plans').select('id').eq('activo', true).gte('proxima_ejecucion', today),
      supabase.from('work_orders').select('tipo, estado').eq('tipo', 'PREVENTIVO'),
    ]);

    const stats = {
      totalPlanes: plansRes.data?.length || 0,
      vencidos: overdueRes.data?.length || 0,
      proximos: upcomingRes.data?.length || 0,
      completados: workOrdersRes.data?.filter(wo => wo.estado === 'COMPLETADA').length || 0,
      cumplimiento: 0,
    };

    // Calcular % de cumplimiento
    const totalPreventivos = workOrdersRes.data?.length || 0;
    if (totalPreventivos > 0) {
      stats.cumplimiento = Math.round((stats.completados / totalPreventivos) * 100);
    }

    return { data: stats, error: null };
  } catch (error) {
    console.error('Error fetching maintenance statistics:', error);
    return { data: null, error };
  }
};

/**
 * Crea recordatorios para mantenimientos próximos
 */
export const createMaintenanceReminders = async (daysAhead = 7) => {
  try {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    // Obtener planes próximos sin recordatorio
    const { data: plans, error: plansError } = await supabase
      .from('maintenance_plans')
      .select('*')
      .eq('activo', true)
      .lte('proxima_ejecucion', futureDate.toISOString().split('T')[0]);

    if (plansError) throw plansError;

    const reminders = plans.map(plan => ({
      plan_id: plan.id,
      asset_id: plan.asset_id,
      tipo: 'PREVENTIVO',
      mensaje: `Mantenimiento "${plan.nombre}" programado para ${plan.proxima_ejecucion}`,
      fecha_recordatorio: plan.proxima_ejecucion,
      enviado: false,
    }));

    if (reminders.length > 0) {
      const { data, error } = await supabase
        .from('maintenance_reminders')
        .insert(reminders)
        .select();

      if (error) throw error;
      return { data, error: null };
    }

    return { data: [], error: null };
  } catch (error) {
    console.error('Error creating maintenance reminders:', error);
    return { data: null, error };
  }
};
