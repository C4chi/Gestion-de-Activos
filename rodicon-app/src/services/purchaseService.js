/**
 * Servicio para manejo de Purchase Orders
 * Operaciones CRUD y workflow de órdenes de compra
 */

import { supabase } from '../supabaseClient';

/**
 * Obtiene todas las purchase orders
 */
export const getPurchaseOrders = async () => {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*')
      .order('fecha_solicitud', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return { data: null, error };
  }
};

/**
 * Obtiene purchase orders por estado
 */
export const getPurchaseOrdersByStatus = async (status) => {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('estado', status)
      .order('fecha_solicitud', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching purchase orders by status:', error);
    return { data: null, error };
  }
};

/**
 * Crea una nueva purchase order
 */
export const createPurchaseOrder = async (orderData) => {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .insert([orderData])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error creating purchase order:', error);
    return { data: null, error };
  }
};

/**
 * Actualiza una purchase order
 */
export const updatePurchaseOrder = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating purchase order:', error);
    return { data: null, error };
  }
};

/**
 * Aprueba una purchase order
 */
export const approvePurchaseOrder = async (id, userId, userName) => {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .update({
        estado: 'APROBADO',
        aprobado_por_id: userId,
        aprobado_por: userName,
        fecha_aprobacion: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error approving purchase order:', error);
    return { data: null, error };
  }
};

/**
 * Rechaza una purchase order
 */
export const rejectPurchaseOrder = async (id, reason) => {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .update({
        estado: 'RECHAZADO',
        motivo_rechazo: reason,
        fecha_rechazo: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error rejecting purchase order:', error);
    return { data: null, error };
  }
};

/**
 * Añade cotización a purchase order
 */
export const addQuotation = async (id, quotationData) => {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .update({
        estado: 'EN_COTIZACION',
        proveedor: quotationData.proveedor,
        monto_cotizado: quotationData.monto,
        fecha_cotizacion: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error adding quotation:', error);
    return { data: null, error };
  }
};

/**
 * Completa una purchase order
 */
export const completePurchaseOrder = async (id) => {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .update({
        estado: 'COMPLETADO',
        fecha_completado: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error completing purchase order:', error);
    return { data: null, error };
  }
};
