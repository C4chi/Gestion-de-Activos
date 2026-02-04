/**
 * Servicio para manejo de Safety Reports
 * Operaciones CRUD de reportes de seguridad HSE
 */

import { supabase } from '../supabaseClient';

/**
 * Obtiene todos los safety reports
 */
export const getSafetyReports = async () => {
  try {
    const { data, error } = await supabase
      .from('safety_reports')
      .select('*')
      .order('fecha_reporte', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching safety reports:', error);
    return { data: null, error };
  }
};

/**
 * Obtiene safety reports por severidad
 */
export const getSafetyReportsBySeverity = async (severity) => {
  try {
    const { data, error } = await supabase
      .from('safety_reports')
      .select('*')
      .eq('severidad', severity)
      .order('fecha_reporte', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching safety reports by severity:', error);
    return { data: null, error };
  }
};

/**
 * Crea un nuevo safety report
 */
export const createSafetyReport = async (reportData) => {
  try {
    const { data, error } = await supabase
      .from('safety_reports')
      .insert([reportData])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error creating safety report:', error);
    return { data: null, error };
  }
};

/**
 * Actualiza un safety report
 */
export const updateSafetyReport = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('safety_reports')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating safety report:', error);
    return { data: null, error };
  }
};

/**
 * Marca safety report como resuelto
 */
export const resolveSafetyReport = async (id, resolutionNotes) => {
  try {
    const { data, error } = await supabase
      .from('safety_reports')
      .update({
        estado: 'RESUELTO',
        notas_resolucion: resolutionNotes,
        fecha_resolucion: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error resolving safety report:', error);
    return { data: null, error };
  }
};

/**
 * Obtiene estadísticas de safety reports
 */
export const getSafetyStatistics = async () => {
  try {
    const { data, error } = await supabase
      .from('safety_reports')
      .select('severidad, estado');

    if (error) throw error;
    
    // Calcular estadísticas
    const stats = {
      total: data.length,
      porSeveridad: {},
      porEstado: {},
      resueltos: 0,
      pendientes: 0,
    };
    
    data.forEach(report => {
      // Contar por severidad
      stats.porSeveridad[report.severidad] = 
        (stats.porSeveridad[report.severidad] || 0) + 1;
      
      // Contar por estado
      stats.porEstado[report.estado] = 
        (stats.porEstado[report.estado] || 0) + 1;
      
      // Contar resueltos/pendientes
      if (report.estado === 'RESUELTO') {
        stats.resueltos++;
      } else {
        stats.pendientes++;
      }
    });
    
    return { data: stats, error: null };
  } catch (error) {
    console.error('Error fetching safety statistics:', error);
    return { data: null, error };
  }
};
