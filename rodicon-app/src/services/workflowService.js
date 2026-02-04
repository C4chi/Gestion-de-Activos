/**
 * Servicio para manejo de Workflows de Aprobación
 * Sistema multi-nivel para Purchase Orders y otros procesos
 */

import { supabase } from '../supabaseClient';

/**
 * Obtiene el workflow activo para un tipo de entidad
 */
export const getActiveWorkflow = async (entityType = 'PURCHASE_ORDER') => {
  try {
    const { data, error } = await supabase
      .from('approval_workflows')
      .select('*')
      .eq('entity_type', entityType)
      .eq('active', true)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching workflow:', error);
    return { data: null, error };
  }
};

/**
 * Determina el nivel de aprobación requerido según el monto
 */
export const determineApprovalLevel = (workflow, amount) => {
  if (!workflow || !workflow.levels) return 1;
  
  const levels = Array.isArray(workflow.levels) ? workflow.levels : JSON.parse(workflow.levels);
  
  // Encontrar el nivel más alto que se requiere según el monto
  let requiredLevel = 0;
  
  levels.forEach(level => {
    if (amount >= (level.threshold || 0)) {
      requiredLevel = Math.max(requiredLevel, level.level);
    }
  });
  
  return requiredLevel || 1;
};

/**
 * Verifica si un usuario puede aprobar en un nivel específico
 */
export const canUserApproveLevel = (workflow, level, userRole) => {
  if (!workflow || !workflow.levels) return false;
  
  const levels = Array.isArray(workflow.levels) ? workflow.levels : JSON.parse(workflow.levels);
  const levelConfig = levels.find(l => l.level === level);
  
  if (!levelConfig) return false;
  
  return levelConfig.roles.includes(userRole);
};

/**
 * Obtiene el historial de aprobaciones de una entidad
 */
export const getApprovalHistory = async (entityType, entityId) => {
  try {
    const { data, error } = await supabase
      .from('approval_history')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching approval history:', error);
    return { data: null, error };
  }
};

/**
 * Registra una aprobación
 */
export const recordApproval = async (approvalData) => {
  try {
    const { data, error } = await supabase
      .from('approval_history')
      .insert([{
        entity_type: approvalData.entityType,
        entity_id: approvalData.entityId,
        level: approvalData.level,
        level_name: approvalData.levelName,
        approver_id: approvalData.approverId,
        approver_name: approvalData.approverName,
        action: approvalData.action, // 'APPROVED', 'REJECTED', 'PENDING'
        comments: approvalData.comments,
      }])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error recording approval:', error);
    return { data: null, error };
  }
};

/**
 * Aprueba una purchase order en un nivel específico
 */
export const approvePurchaseAtLevel = async (purchaseId, level, userId, userName, comments = null) => {
  try {
    // Obtener workflow activo
    const { data: workflow } = await getActiveWorkflow('PURCHASE_ORDER');
    if (!workflow) throw new Error('No se encontró workflow activo');

    const levels = Array.isArray(workflow.levels) ? workflow.levels : JSON.parse(workflow.levels);
    const levelConfig = levels.find(l => l.level === level);

    // Registrar en historial
    await recordApproval({
      entityType: 'PURCHASE_ORDER',
      entityId: purchaseId,
      level: level,
      levelName: levelConfig?.name || `Nivel ${level}`,
      approverId: userId,
      approverName: userName,
      action: 'APPROVED',
      comments: comments,
    });

    // Determinar nuevo estado
    let newStatus = 'PENDIENTE';
    if (level === 1) {
      newStatus = 'APROBADO_SUPERVISOR';
    } else if (level === 2) {
      newStatus = 'APROBADO_GERENTE';
    } else if (level === 4) {
      newStatus = 'EN_COTIZACION';
    } else if (level === 5) {
      newStatus = 'APROBADO_COTIZACION';
    }

    // Actualizar purchase order
    const { data, error } = await supabase
      .from('purchase_orders')
      .update({
        estado: newStatus,
        nivel_aprobacion_actual: level,
        aprobado_por_id: userId,
        aprobado_por: userName,
        fecha_aprobacion: new Date().toISOString(),
      })
      .eq('id', purchaseId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error approving purchase:', error);
    return { data: null, error };
  }
};

/**
 * Rechaza una purchase order
 */
export const rejectPurchaseAtLevel = async (purchaseId, level, userId, userName, reason) => {
  try {
    const { data: workflow } = await getActiveWorkflow('PURCHASE_ORDER');
    if (!workflow) throw new Error('No se encontró workflow activo');

    const levels = Array.isArray(workflow.levels) ? workflow.levels : JSON.parse(workflow.levels);
    const levelConfig = levels.find(l => l.level === level);

    // Registrar en historial
    await recordApproval({
      entityType: 'PURCHASE_ORDER',
      entityId: purchaseId,
      level: level,
      levelName: levelConfig?.name || `Nivel ${level}`,
      approverId: userId,
      approverName: userName,
      action: 'REJECTED',
      comments: reason,
    });

    // Actualizar purchase order
    const { data, error } = await supabase
      .from('purchase_orders')
      .update({
        estado: 'RECHAZADO',
        motivo_rechazo: reason,
        fecha_rechazo: new Date().toISOString(),
      })
      .eq('id', purchaseId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error rejecting purchase:', error);
    return { data: null, error };
  }
};

/**
 * Obtiene el siguiente nivel de aprobación requerido
 */
export const getNextApprovalLevel = async (purchaseId) => {
  try {
    // Obtener purchase order
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchase_orders')
      .select('monto_cotizado, nivel_aprobacion_actual, workflow_id')
      .eq('id', purchaseId)
      .single();

    if (purchaseError) throw purchaseError;

    // Obtener workflow
    const { data: workflow } = await getActiveWorkflow('PURCHASE_ORDER');
    if (!workflow) return { data: null, error: null };

    const amount = purchase.monto_cotizado || 0;
    const currentLevel = purchase.nivel_aprobacion_actual || 0;
    
    const maxLevel = determineApprovalLevel(workflow, amount);
    const nextLevel = currentLevel + 1;

    if (nextLevel > maxLevel) {
      return { data: null, error: null }; // No hay más niveles
    }

    const levels = Array.isArray(workflow.levels) ? workflow.levels : JSON.parse(workflow.levels);
    const nextLevelConfig = levels.find(l => l.level === nextLevel);

    return { data: nextLevelConfig, error: null };
  } catch (error) {
    console.error('Error getting next approval level:', error);
    return { data: null, error };
  }
};

/**
 * Obtiene estadísticas de aprobaciones
 */
export const getApprovalStatistics = async (startDate = null, endDate = null) => {
  try {
    let query = supabase
      .from('approval_history')
      .select('action, entity_type, created_at');

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    const stats = {
      total: data.length,
      approved: data.filter(a => a.action === 'APPROVED').length,
      rejected: data.filter(a => a.action === 'REJECTED').length,
      pending: data.filter(a => a.action === 'PENDING').length,
      byEntityType: {},
    };

    data.forEach(approval => {
      if (!stats.byEntityType[approval.entity_type]) {
        stats.byEntityType[approval.entity_type] = {
          total: 0,
          approved: 0,
          rejected: 0,
          pending: 0,
        };
      }
      stats.byEntityType[approval.entity_type].total++;
      if (approval.action === 'APPROVED') stats.byEntityType[approval.entity_type].approved++;
      if (approval.action === 'REJECTED') stats.byEntityType[approval.entity_type].rejected++;
      if (approval.action === 'PENDING') stats.byEntityType[approval.entity_type].pending++;
    });

    return { data: stats, error: null };
  } catch (error) {
    console.error('Error fetching approval statistics:', error);
    return { data: null, error };
  }
};
