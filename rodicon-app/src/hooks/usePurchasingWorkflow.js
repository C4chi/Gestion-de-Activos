import { useCallback, useState } from 'react';
import { supabase } from '../supabaseClient';

/**
 * Hook para gestionar el workflow completo de compras
 * Estados: PENDIENTE → ORDENADO → (PARCIAL|RECIBIDO)
 */
export const usePurchasingWorkflow = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Actualiza el estado de una orden de compra
   * Valida transiciones de estado permitidas
   */
  const updatePurchaseStatus = useCallback(
    async (purchaseOrderId, newStatus, comment = '', pin) => {
      setLoading(true);
      setError(null);

      try {
        console.log(`[updatePurchaseStatus] Iniciando: ${purchaseOrderId} → ${newStatus}`);

        // 1. Obtener datos actuales de la orden
        const { data: poData, error: fetchError } = await supabase
          .from('purchase_orders')
          .select('id, ficha, estado, numero_requisicion')
          .eq('id', purchaseOrderId)
          .single();

        if (fetchError) {
          throw new Error('No se encontró la orden de compra');
        }

        console.log(`[updatePurchaseStatus] Estado actual: ${poData.estado}, Nuevo: ${newStatus}`);

        // 2. Validar transición de estado
        const validTransitions = {
          'PENDIENTE': ['EN_COTIZACION', 'ORDENADO'], // Puede cotizar o saltar directo a ordenar
          'EN_COTIZACION': ['PENDIENTE_APROBACION'], // Después de cotizar
          'PENDIENTE_APROBACION': ['APROBADO', 'EN_COTIZACION'], // Gerente aprueba o regresa a cotizar
          'APROBADO': ['ORDENADO'], // Después de aprobar, COMPRAS ordena
          'ORDENADO': ['PARCIAL', 'RECIBIDO'],
          'PARCIAL': ['ORDENADO', 'RECIBIDO'], // Desde PARCIAL se puede re-ordenar o cerrar
          'RECIBIDO': [],
        };

        if (!validTransitions[poData.estado]?.includes(newStatus)) {
          console.error(`[updatePurchaseStatus] Transición inválida: ${poData.estado} → ${newStatus}`);
          throw new Error(
            `Transición inválida: ${poData.estado} → ${newStatus}`
          );
        }
        console.log(`[updatePurchaseStatus] Transición válida`);

        // 3. Actualizar purchase_orders (solo estado - campos esenciales)
        let updateData = {
          estado: newStatus,
        };

        // Agregar fecha_actualizacion solo si existe en la tabla
        // (comentado por si no existe - puedes descomentar si tu tabla lo tiene)
        // updateData.fecha_actualizacion = new Date().toISOString();

        console.log(`[updatePurchaseStatus] Actualizando con:`, updateData);

        const { error: updateError } = await supabase
          .from('purchase_orders')
          .update(updateData)
          .eq('id', purchaseOrderId);

        if (updateError) {
          console.error(`[updatePurchaseStatus] Error de Supabase:`, updateError);
          throw updateError;
        }

        console.log(`[updatePurchaseStatus] Purchase order actualizada exitosamente`);

        // 4. Actualizar asset según tipo de recepción
        if (newStatus === 'RECIBIDO') {
          // RECIBIDO TOTAL: Assets pasan a EN REPARACION (repuestos llegaron, pueden repararse)
          
          // Obtener todas las líneas de compra para esta orden (para multi-activo)
          const { data: purchaseItems } = await supabase
            .from('purchase_items')
            .select('ficha_ref')
            .eq('purchase_id', purchaseOrderId)
            .not('ficha_ref', 'is', null);

          // Actualizar cada activo vinculado
          if (purchaseItems && purchaseItems.length > 0) {
            const fichas = [...new Set(purchaseItems.map(pi => pi.ficha_ref))]; // Fichas únicas
            
            for (const ficha of fichas) {
              const { error: assetError } = await supabase
                .from('assets')
                .update({
                  status: 'EN REPARACION',
                  updated_at: new Date().toISOString(),
                })
                .eq('ficha', ficha);

              if (assetError) {
                console.warn(`Warning: Asset ${ficha} no actualizado, pero compra sí`, assetError);
              }
            }
          }
          
          // También actualizar si la orden tiene ficha principal (compras simple)
          if (poData.ficha && poData.ficha !== 'MULTI') {
            const { error: assetError } = await supabase
              .from('assets')
              .update({
                status: 'EN REPARACION',
                updated_at: new Date().toISOString(),
              })
              .eq('ficha', poData.ficha);

            if (assetError) {
              console.warn('Warning: Asset no actualizado, pero compra sí', assetError);
            }
          }
        }
        // Si es PARCIAL, el asset se queda en ESPERA REPUESTO (no cambia)

        // 5. Crear entrada de auditoría
        const { error: auditError } = await supabase
          .from('audit_log')
          .insert({
            accion: 'UPDATE_PURCHASE_STATUS',
            tabla: 'purchase_orders',
            registro_id: purchaseOrderId,
            detalles: {
              from: poData.estado,
              to: newStatus,
              comment: newStatus === 'PARCIAL' ? comment : null,
            },
            usuario_id: (await supabase.auth.getUser()).data?.user?.id,
          });

        if (auditError) {
          console.warn('Audit log error:', auditError);
        }

        return { success: true, newStatus: newStatus, previousStatus: poData.estado };
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Obtiene todas las órdenes de compra
   */
  const fetchPurchaseOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('purchase_orders')
        .select(`
          id,
          ficha,
          numero_requisicion,
          estado,
          solicitante,
          proyecto,
          prioridad,
          comentario_recepcion,
          fecha_solicitud,
          fecha_actualizacion,
          fecha_estimada_llegada,
          fecha_ordenado,
          purchase_items (
            id,
            codigo,
            descripcion,
            cantidad,
            precio_unitario,
            proveedor,
            cotizacion,
            moneda,
            ficha_ref
          )
        `)
        .order('fecha_solicitud', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      // Procesar datos para agregar itemsSummary
      const processed = data.map(po => ({
        ...po,
        rowIndex: data.indexOf(po),
        itemsSummary: (po.purchase_items && po.purchase_items.length > 0)
          ? po.purchase_items
              .map(item => `${item.descripcion} (${item.cantidad})`)
              .join(', ')
              .substring(0, 100) + '...'
          : 'Sin items',
      }));

      return processed;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Obtiene órdenes filtradas por estado
   */
  const fetchPurchaseOrdersByStatus = useCallback(async (status) => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('purchase_orders')
        .select(`
          id,
          ficha,
          numero_requisicion,
          estado,
          solicitante,
          proyecto,
          prioridad,
          fecha_solicitud,
          fecha_estimada_llegada,
          fecha_ordenado,
          comentario_recepcion,
          purchase_items (
            id,
            codigo,
            descripcion,
            cantidad,
            precio_unitario,
            proveedor,
            cotizacion,
            moneda,
            ficha_ref
          )
        `);

      if (status && status !== 'ALL') {
        query = query.eq('estado', status);
      }

      const { data, error: fetchError } = await query.order('fecha_solicitud', {
        ascending: false,
      });

      if (fetchError) {
        throw fetchError;
      }

      return data.map(po => ({
        ...po,
        itemsSummary: (po.purchase_items && po.purchase_items.length > 0)
          ? po.purchase_items
              .map(item => `${item.descripcion} (${item.cantidad})`)
              .join(', ')
              .substring(0, 100) + '...'
          : 'Sin items',
      }));
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    updatePurchaseStatus,
    fetchPurchaseOrders,
    fetchPurchaseOrdersByStatus,
    loading,
    isLoading: loading, // Alias para compatibilidad
    error,
  };
};
