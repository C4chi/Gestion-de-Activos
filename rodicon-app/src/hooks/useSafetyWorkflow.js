import { useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

/**
 * useSafetyWorkflow
 * Hook que gestiona reportes de seguridad/incidentes
 * Crear, actualizar, listar reportes de seguridad
 */
export const useSafetyWorkflow = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Crear nuevo reporte de seguridad
   * @param {Object} report - {ficha, tipo, prioridad, plazo_horas, descripcion, asignado_a}
   */
  const createSafetyReport = useCallback(async (report) => {
    setLoading(true);
    setError(null);
    try {
      let numeroReporte = null;

      // Intentar usar la función de Supabase primero
      try {
        const { data: numeroData, error: numeroError } = await supabase.rpc('generate_hse_number');
        if (!numeroError && numeroData) {
          numeroReporte = numeroData;
        }
      } catch (rpcError) {
        console.log('Función generate_hse_number no disponible, generando número localmente');
      }

      // Si la función RPC falla, generar número localmente
      if (!numeroReporte) {
        const { data: existingReports, error: countError } = await supabase
          .from('safety_reports')
          .select('numero_reporte')
          .order('fecha_reporte', { ascending: false })
          .limit(1);

        if (countError) {
          console.error('Error contando reportes:', countError);
        }

        // Generar siguiente número
        let nextNumber = 1;
        if (existingReports && existingReports.length > 0 && existingReports[0].numero_reporte) {
          const lastNum = existingReports[0].numero_reporte.replace('HSE-', '');
          nextNumber = parseInt(lastNum, 10) + 1;
        } else {
          // Contar todos los reportes como fallback
          const { count } = await supabase
            .from('safety_reports')
            .select('*', { count: 'exact', head: true });
          nextNumber = (count || 0) + 1;
        }

        numeroReporte = `HSE-${String(nextNumber).padStart(3, '0')}`;
      }

      const { data, error: dbError } = await supabase
        .from('safety_reports')
        .insert([
          {
            numero_reporte: numeroReporte,
            ficha: report.ficha || null,
            tipo: report.tipo,
            prioridad: report.prioridad || 'Baja',
            plazo_horas: report.plazo_horas || 24,
            descripcion: report.descripcion,
            asignado_a: report.asignado_a || null,
            estado: 'PENDIENTE',
            reportado_por: report.reportado_por || null,
            foto_url: report.foto_url || null,
            notas: report.notas || null,
            lugar: report.lugar || null,
            turno: report.turno || null,
          },
        ])
        .select();

      if (dbError) throw dbError;

      toast.success(`Reporte ${numeroReporte} creado exitosamente`);
      return data[0];
    } catch (err) {
      const message = err.message || 'Error al crear reporte de seguridad';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Obtener todos los reportes de seguridad
   */
  const fetchSafetyReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('safety_reports')
        .select('*')
        .order('fecha_reporte', { ascending: false });

      if (dbError) throw dbError;
      return data || [];
    } catch (err) {
      const message = err.message || 'Error al obtener reportes de seguridad';
      setError(message);
      toast.error(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Obtener reportes por estado
   * @param {string} estado - ABIERTO, EN_INVESTIGACION, CERRADO
   */
  const fetchSafetyReportsByStatus = async (estado) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('safety_reports')
        .select('*')
        .eq('estado', estado)
        .order('fecha_creacion', { ascending: false });

      if (dbError) throw dbError;
      return data || [];
    } catch (err) {
      const message = err.message || 'Error al filtrar reportes';
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * Actualizar reporte de seguridad
   * @param {string} reportId - ID del reporte
   * @param {Object} updates - Campos a actualizar
   * @param {string} pin - PIN del usuario
   */
  const updateSafetyReport = useCallback(async (reportId, updates, pin = null) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('safety_reports')
        .update({
          ...updates,
          fecha_actualizacion: new Date().toISOString(),
        })
        .eq('id', reportId)
        .select();

      if (dbError) throw dbError;

      toast.success('Reporte actualizado');
      return data[0];
    } catch (err) {
      const message = err.message || 'Error al actualizar reporte';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Obtener detalles de un reporte
   */
  const fetchSafetyReportDetail = useCallback(async (reportId) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('safety_reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (dbError) throw dbError;
      return data;
    } catch (err) {
      const message = err.message || 'Error al obtener detalles del reporte';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createSafetyReport,
    fetchSafetyReports,
    updateSafetyReport,
    loading,
    isLoading: loading, // Alias para compatibilidad
    error,
  };
};
