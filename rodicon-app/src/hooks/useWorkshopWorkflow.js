import { useState } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

/**
 * useWorkshopWorkflow
 * Hook que gestiona el flujo de órdenes de mantenimiento/taller
 * Estados: PENDIENTE → RECIBIDO → EN REPARACION → COMPLETADO
 * 
 * Transiciones válidas:
 * - PENDIENTE → RECIBIDO (recibir orden de mantenimiento)
 * - RECIBIDO → EN REPARACION (iniciar reparación)
 * - EN REPARACION → COMPLETADO (marcar completado)
 * - EN REPARACION → RECIBIDO (devolver a recibido si hay problemas)
 */
export const useWorkshopWorkflow = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const VALID_TRANSITIONS = {
    PENDIENTE: ['RECIBIDO'],
    RECIBIDO: ['EN REPARACION'],
    EN_REPARACION: ['COMPLETADO', 'RECIBIDO'],
    COMPLETADO: [],
  };

  /**
   * Crear nueva orden de mantenimiento
   * @param {Object} workOrder - {asset_id, tipo_mantenimiento, descripcion, prioridad, fecha_creacion, usuario}
   */
  const createWorkOrder = async (workOrder) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('maintenance_logs')
        .insert([
          {
            asset_id: workOrder.asset_id,
            tipo_mantenimiento: workOrder.tipo_mantenimiento, // PREVENTIVO | CORRECTIVO
            descripcion: workOrder.descripcion,
            prioridad: workOrder.prioridad || 'Normal',
            estado: 'PENDIENTE',
            fecha_creacion: new Date().toISOString(),
            fecha_actualizacion: new Date().toISOString(),
            usuario_asignado: workOrder.usuario || null,
            observaciones: '',
          },
        ])
        .select();

      if (dbError) throw dbError;

      // Crear entrada en audit_log
      await supabase.from('audit_log').insert([
        {
          tabla_afectada: 'maintenance_logs',
          registro_id: data[0].id,
          operacion: 'INSERT',
          valores_anteriores: null,
          valores_nuevos: JSON.stringify(data[0]),
          usuario: workOrder.usuario || 'SISTEMA',
          fecha_operacion: new Date().toISOString(),
        },
      ]);

      toast.success('Orden de mantenimiento creada');
      return data[0];
    } catch (err) {
      const message = err.message || 'Error al crear orden de mantenimiento';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Actualizar estado de orden de mantenimiento
   * @param {string} workOrderId - ID de la orden de mantenimiento
   * @param {string} newStatus - Nuevo estado (RECIBIDO, EN_REPARACION, COMPLETADO)
   * @param {Object} updateData - {observaciones, tiempo_estimado, costo_estimado, usuario}
   */
  const updateWorkStatus = async (workOrderId, newStatus, updateData = {}) => {
    setLoading(true);
    setError(null);
    try {
      // Obtener estado actual
      const { data: currentData, error: fetchError } = await supabase
        .from('maintenance_logs')
        .select('*')
        .eq('id', workOrderId)
        .single();

      if (fetchError) throw fetchError;

      const currentStatus = currentData.estado;

      // Validar transición
      if (!VALID_TRANSITIONS[currentStatus]?.includes(newStatus)) {
        throw new Error(
          `Transición no válida: ${currentStatus} → ${newStatus}`
        );
      }

      // Actualizar orden de mantenimiento
      const updatePayload = {
        estado: newStatus,
        fecha_actualizacion: new Date().toISOString(),
        ...updateData,
      };

      // Si completado, registrar fecha de cierre
      if (newStatus === 'COMPLETADO') {
        updatePayload.fecha_cierre = new Date().toISOString();
      }

      const { data: updatedData, error: updateError } = await supabase
        .from('maintenance_logs')
        .update(updatePayload)
        .eq('id', workOrderId)
        .select();

      if (updateError) throw updateError;

      // Crear entrada en audit_log
      await supabase.from('audit_log').insert([
        {
          tabla_afectada: 'maintenance_logs',
          registro_id: workOrderId,
          operacion: 'UPDATE',
          valores_anteriores: JSON.stringify({ estado: currentStatus }),
          valores_nuevos: JSON.stringify({ estado: newStatus, ...updateData }),
          usuario: updateData.usuario || 'SISTEMA',
          fecha_operacion: new Date().toISOString(),
        },
      ]);

      const messages = {
        RECIBIDO: 'Orden recibida en taller',
        EN_REPARACION: 'Reparación iniciada',
        COMPLETADO: 'Reparación completada',
      };

      toast.success(messages[newStatus] || 'Estado actualizado');
      return updatedData[0];
    } catch (err) {
      const message = err.message || 'Error al actualizar orden de mantenimiento';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Obtener todas las órdenes de mantenimiento
   */
  const fetchWorkOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('maintenance_logs')
        .select(
          `
          *,
          assets:asset_id (
            id,
            nombre,
            codigo,
            ubicacion,
            estado
          )
        `
        )
        .order('fecha_creacion', { ascending: false });

      if (dbError) throw dbError;
      return data || [];
    } catch (err) {
      const message = err.message || 'Error al obtener órdenes de mantenimiento';
      setError(message);
      toast.error(message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * Obtener órdenes por estado
   * @param {string} status - PENDIENTE, RECIBIDO, EN_REPARACION, COMPLETADO
   */
  const fetchWorkOrdersByStatus = async (status) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('maintenance_logs')
        .select(
          `
          *,
          assets:asset_id (
            id,
            nombre,
            codigo,
            ubicacion
          )
        `
        )
        .eq('estado', status)
        .order('fecha_creacion', { ascending: false });

      if (dbError) throw dbError;
      return data || [];
    } catch (err) {
      const message = err.message || 'Error al filtrar órdenes';
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * Obtener detalles de una orden
   */
  const fetchWorkOrderDetail = async (workOrderId) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('maintenance_logs')
        .select(
          `
          *,
          assets:asset_id (
            id,
            nombre,
            codigo,
            ubicacion,
            estado
          )
        `
        )
        .eq('id', workOrderId)
        .single();

      if (dbError) throw dbError;
      return data;
    } catch (err) {
      const message = err.message || 'Error al obtener detalles de orden';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Agregar observación/nota a la orden
   */
  const addObservation = async (workOrderId, observation, usuario) => {
    setLoading(true);
    setError(null);
    try {
      // Obtener observaciones actuales
      const { data: current } = await supabase
        .from('maintenance_logs')
        .select('observaciones')
        .eq('id', workOrderId)
        .single();

      const timestamp = new Date().toLocaleString('es-AR');
      const newObservations = current.observaciones
        ? `${current.observaciones}\n[${timestamp}] ${usuario}: ${observation}`
        : `[${timestamp}] ${usuario}: ${observation}`;

      const { data, error: updateError } = await supabase
        .from('maintenance_logs')
        .update({
          observaciones: newObservations,
          fecha_actualizacion: new Date().toISOString(),
        })
        .eq('id', workOrderId)
        .select();

      if (updateError) throw updateError;

      toast.success('Observación agregada');
      return data[0];
    } catch (err) {
      const message = err.message || 'Error al agregar observación';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createWorkOrder,
    updateWorkStatus,
    fetchWorkOrders,
    fetchWorkOrdersByStatus,
    fetchWorkOrderDetail,
    addObservation,
    loading,
    error,
  };
};
