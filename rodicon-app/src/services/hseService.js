/**
 * hseService.js
 * Servicio para manejar inspecciones HSE dinámicas con templates
 */

import { supabase } from '../supabaseClient';

/**
 * ==========================================
 * TEMPLATES
 * ==========================================
 */

// Obtener todos los templates activos
export const getActiveTemplates = async () => {
  const { data, error } = await supabase
    .from('hse_templates')
    .select('*')
    .eq('is_active', true)
    .eq('is_archived', false)
    .order('name');

  if (error) throw error;
  
  // Mapear schema a formato de TemplateBuilder
  return data.map(template => ({
    ...template,
    sections: template.schema?.sections || [],
    scoring_config: template.schema?.scoring || {
      enabled: template.scoring_enabled,
      max_score: template.max_score,
      passing_score: template.passing_threshold
    }
  }));
};

// Obtener templates por categoría
export const getTemplatesByCategory = async (category) => {
  const { data, error } = await supabase
    .from('hse_templates')
    .select('*')
    .eq('category', category)
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data;
};

// Obtener un template específico
export const getTemplateById = async (id) => {
  const { data, error } = await supabase
    .from('hse_templates')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  
  // Mapear schema a formato de TemplateBuilder
  return {
    ...data,
    sections: data.schema?.sections || [],
    scoring_config: data.schema?.scoring || {
      enabled: data.scoring_enabled,
      max_score: data.max_score,
      passing_score: data.passing_threshold
    }
  };
};

// Crear nuevo template
export const createTemplate = async (templateData) => {
  // Construir el schema a partir de las sections
  const schema = {
    sections: templateData.sections || [],
    scoring: templateData.scoring_config || {
      enabled: false,
      max_score: 100,
      passing_score: 70
    }
  };

  const { data, error } = await supabase
    .from('hse_templates')
    .insert([{
      name: templateData.name,
      description: templateData.description,
      category: templateData.category || 'general',
      icon: templateData.icon || '📋',
      schema: schema,
      scoring_enabled: schema.scoring.enabled || false,
      max_score: schema.scoring.max_score || 100,
      passing_threshold: schema.scoring.passing_score || 70,
      is_active: templateData.is_active !== false,
      version: templateData.version || 1,
      created_by: templateData.created_by,
      tags: templateData.tags || []
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Actualizar template (crea nueva versión)
export const updateTemplate = async (id, updates) => {
  // Obtener el template actual
  const current = await getTemplateById(id);

  // Construir el nuevo schema
  const newSchema = {
    sections: updates.sections || current.schema?.sections || [],
    scoring: updates.scoring_config || current.schema?.scoring || {
      enabled: false,
      max_score: 100,
      passing_score: 70
    }
  };

  // Crear nueva versión
  const { data, error } = await supabase
    .from('hse_templates')
    .insert([{
      name: updates.name || current.name,
      description: updates.description || current.description,
      category: updates.category || current.category,
      icon: updates.icon || current.icon,
      schema: newSchema,
      scoring_enabled: newSchema.scoring.enabled || false,
      max_score: newSchema.scoring.max_score || 100,
      passing_threshold: newSchema.scoring.passing_score || 70,
      is_active: updates.is_active !== false,
      version: current.version + 1,
      parent_template_id: id,
      created_by: current.created_by,
      tags: updates.tags || current.tags
    }])
    .select()
    .single();

  if (error) throw error;

  // Registrar en changelog
  await supabase
    .from('hse_template_changelog')
    .insert([{
      template_id: id,
      version: current.version + 1,
      changes: updates.changes || { updated: 'template schema' },
      changed_by: updates.changed_by
    }]);

  // Desactivar versión anterior
  await supabase
    .from('hse_templates')
    .update({ is_active: false })
    .eq('id', id);

  return data;
};

// Archivar template
export const archiveTemplate = async (id) => {
  const { error } = await supabase
    .from('hse_templates')
    .update({ is_archived: true, is_active: false })
    .eq('id', id);

  if (error) throw error;
  return true;
};

// Obtener estadísticas de templates
export const getTemplateStats = async () => {
  const { data, error } = await supabase
    .from('hse_template_stats')
    .select('*')
    .order('total_inspections', { ascending: false });

  if (error) throw error;
  return data;
};

/**
 * ==========================================
 * INSPECCIONES
 * ==========================================
 */

// Generar número de inspección único
const generateInspectionNumber = async () => {
  const { data, error } = await supabase
    .from('hse_inspections')
    .select('inspection_number')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw error;

  let lastNumber = 0;
  if (data && data.length > 0) {
    const match = data[0].inspection_number.match(/INS-(\d+)/);
    if (match) {
      lastNumber = parseInt(match[1]);
    }
  }

  const nextNumber = lastNumber + 1;
  return `HSE-INS-${String(nextNumber).padStart(4, '0')}`;
};

// Crear nueva inspección (draft)
export const createInspection = async (inspectionData) => {
  const template = await getTemplateById(inspectionData.template_id);
  const inspectionNumber = await generateInspectionNumber();

  const { data, error } = await supabase
    .from('hse_inspections')
    .insert([{
      template_id: inspectionData.template_id,
      template_version: template.version,
      template_snapshot: template.schema, // Copia inmutable
      inspection_number: inspectionNumber,
      title: inspectionData.title || template.name,
      status: 'DRAFT',
      priority: inspectionData.priority || 'MEDIA',
      asset_id: inspectionData.asset_id,
      ficha: inspectionData.ficha,
      location: inspectionData.location,
      area: inspectionData.area,
      conducted_by: inspectionData.conducted_by,
      assigned_to: inspectionData.assigned_to || [],
      scheduled_date: inspectionData.scheduled_date,
      started_at: new Date().toISOString(),
      answers: {},
      is_synced: true
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Guardar progreso de inspección (auto-save)
export const saveInspectionProgress = async (id, answers) => {
  const { error } = await supabase
    .from('hse_inspections')
    .update({
      answers,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) throw error;
  return true;
};

// Completar inspección
export const completeInspection = async (id, finalData) => {
  const { answers, score, passed, latitude, longitude } = finalData;

  // Calcular flags automáticos
  const hasPhotos = Object.values(answers).some(
    a => a.value && typeof a.value === 'string' && a.value.startsWith('http')
  );
  const hasSignature = Object.values(answers).some(
    a => a.value && typeof a.value === 'string' && a.value.includes('signature')
  );

  const { data, error } = await supabase
    .from('hse_inspections')
    .update({
      answers,
      total_score: score.total,
      max_possible_score: score.max,
      score_percentage: score.percentage,
      passed,
      status: 'COMPLETED',
      completed_at: new Date().toISOString(),
      has_photos: hasPhotos,
      has_signature: hasSignature,
      latitude,
      longitude,
      is_synced: true
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Crear acciones correctivas automáticas si hay items fallidos
  await createAutomaticCorrectiveActions(id, answers);

  return data;
};

// Crear acciones correctivas automáticas
const createAutomaticCorrectiveActions = async (inspectionId, answers) => {
  const inspection = await getInspectionById(inspectionId);
  const template = inspection.template_snapshot;
  
  const actions = [];

  template.sections?.forEach(section => {
    section.items?.forEach(item => {
      const answer = answers[item.id];
      
      // Si el item tiene conditional.triggerActions.createAction y la condición se cumple
      if (
        item.conditional?.triggerActions?.createAction &&
        answer?.value === true // Para checkboxes que indican problemas
      ) {
        actions.push({
          inspection_id: inspectionId,
          item_id: item.id,
          description: `Acción correctiva para: ${item.label}`,
          priority: 'ALTA',
          status: 'OPEN'
        });
      }

      // Si el item tiene scoring bajo
      if (item.scoring?.enabled && answer?.score !== undefined) {
        const threshold = item.scoring.weight * 0.5; // 50% del peso
        if (answer.score < threshold) {
          actions.push({
            inspection_id: inspectionId,
            item_id: item.id,
            description: `Puntaje bajo en: ${item.label} (${answer.score}/${item.scoring.weight})`,
            priority: 'MEDIA',
            status: 'OPEN'
          });
        }
      }
    });
  });

  if (actions.length > 0) {
    const { error } = await supabase
      .from('hse_corrective_actions')
      .insert(actions);

    if (error) console.error('Error creating corrective actions:', error);
  }
};

// Obtener inspección por ID
export const getInspectionById = async (id) => {
  const { data, error } = await supabase
    .from('hse_inspections')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

// Obtener inspecciones con filtros
export const getInspections = async (filters = {}) => {
  // Primero intentar con la tabla directa sin joins complejos
  let query = supabase
    .from('hse_inspections')
    .select('*');

  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.priority) {
    query = query.eq('priority', filters.priority);
  }
  if (filters.template_id) {
    query = query.eq('template_id', filters.template_id);
  }
  if (filters.conducted_by) {
    query = query.eq('conducted_by', filters.conducted_by);
  }
  if (filters.ficha) {
    query = query.eq('ficha', filters.ficha);
  }
  if (filters.date_from) {
    query = query.gte('created_at', filters.date_from);
  }
  if (filters.date_to) {
    query = query.lte('created_at', filters.date_to);
  }
  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,inspection_number.ilike.%${filters.search}%`);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching inspections:', error);
    throw error;
  }
  
  // Si tenemos datos, hacer las consultas adicionales de forma segura
  if (!data || data.length === 0) {
    return [];
  }

  // Obtener nombres de templates y usuarios en paralelo
  const templateIds = [...new Set(data.map(i => i.template_id).filter(Boolean))];
  const userIds = [...new Set(data.map(i => i.conducted_by).filter(Boolean))];

  let templatesMap = {};
  let usersMap = {};

  try {
    if (templateIds.length > 0) {
      const { data: templates } = await supabase
        .from('hse_templates')
        .select('id, name, category')
        .in('id', templateIds);
      templatesMap = (templates || []).reduce((acc, t) => ({ ...acc, [t.id]: t }), {});
    }

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('app_users')
        .select('id, nombre')
        .in('id', userIds);
      usersMap = (users || []).reduce((acc, u) => ({ ...acc, [u.id]: u }), {});
    }
  } catch (err) {
    console.warn('Error loading related data:', err);
    // Continuar sin los datos relacionados
  }
  
  // Mapear los datos para incluir información relacionada
  return data.map(item => ({
    ...item,
    template_name: templatesMap[item.template_id]?.name || 'N/A',
    template_category: templatesMap[item.template_id]?.category || 'general',
    conducted_by_name: usersMap[item.conducted_by]?.nombre || 'No especificado'
  }));
};

// Eliminar inspección (solo drafts)
export const deleteInspection = async (id) => {
  // Verificar que esté en DRAFT
  const inspection = await getInspectionById(id);
  if (inspection.status !== 'DRAFT') {
    throw new Error('Solo se pueden eliminar borradores');
  }

  const { error } = await supabase
    .from('hse_inspections')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
};

/**
 * ==========================================
 * ACCIONES CORRECTIVAS
 * ==========================================
 */

// Obtener acciones correctivas de una inspección
export const getCorrectiveActions = async (inspectionId) => {
  const { data, error } = await supabase
    .from('hse_corrective_actions')
    .select('*')
    .eq('inspection_id', inspectionId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

// Crear acción correctiva manual
export const createCorrectiveAction = async (actionData) => {
  const { data, error } = await supabase
    .from('hse_corrective_actions')
    .insert([actionData])
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Actualizar acción correctiva
export const updateCorrectiveAction = async (id, updates) => {
  const { data, error } = await supabase
    .from('hse_corrective_actions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Resolver acción correctiva
export const resolveCorrectiveAction = async (id, resolutionNotes, resolvedBy) => {
  const { data, error } = await supabase
    .from('hse_corrective_actions')
    .update({
      status: 'RESOLVED',
      resolved_at: new Date().toISOString(),
      resolution_notes: resolutionNotes
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * ==========================================
 * OFFLINE SYNC
 * ==========================================
 */

// Guardar inspección para sync offline
export const saveOfflineInspection = async (inspectionData) => {
  // Usar IndexedDB para almacenamiento local
  const db = await openOfflineDB();
  const tx = db.transaction('inspections', 'readwrite');
  const store = tx.objectStore('inspections');
  
  const offlineRecord = {
    ...inspectionData,
    is_synced: false,
    sync_attempts: 0,
    last_modified: new Date().toISOString()
  };

  await store.put(offlineRecord);
  return offlineRecord;
};

// Obtener inspecciones pendientes de sync
export const getUnsyncedInspections = async () => {
  const db = await openOfflineDB();
  const tx = db.transaction('inspections', 'readonly');
  const store = tx.objectStore('inspections');
  const index = store.index('is_synced');
  
  return await index.getAll(false);
};

// Sincronizar inspecciones pendientes
export const syncPendingInspections = async () => {
  const unsynced = await getUnsyncedInspections();
  const results = { success: [], failed: [] };

  for (const inspection of unsynced) {
    try {
      if (inspection.id && inspection.status !== 'DRAFT') {
        // Actualizar existente
        await completeInspection(inspection.id, {
          answers: inspection.answers,
          score: {
            total: inspection.total_score,
            max: inspection.max_possible_score,
            percentage: inspection.score_percentage
          },
          passed: inspection.passed,
          latitude: inspection.latitude,
          longitude: inspection.longitude
        });
      } else {
        // Crear nueva
        await createInspection(inspection);
      }

      // Marcar como sincronizada en IndexedDB
      inspection.is_synced = true;
      const db = await openOfflineDB();
      const tx = db.transaction('inspections', 'readwrite');
      await tx.objectStore('inspections').put(inspection);

      results.success.push(inspection.inspection_number);
    } catch (error) {
      console.error('Error syncing inspection:', error);
      inspection.sync_attempts += 1;
      inspection.last_sync_attempt = new Date().toISOString();
      
      const db = await openOfflineDB();
      const tx = db.transaction('inspections', 'readwrite');
      await tx.objectStore('inspections').put(inspection);

      results.failed.push({
        inspection: inspection.inspection_number,
        error: error.message
      });
    }
  }

  return results;
};

// Abrir base de datos offline (IndexedDB)
const openOfflineDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('HSEOfflineDB', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('inspections')) {
        const store = db.createObjectStore('inspections', { keyPath: 'id' });
        store.createIndex('is_synced', 'is_synced', { unique: false });
        store.createIndex('last_modified', 'last_modified', { unique: false });
      }
    };
  });
};

/**
 * ==========================================
 * EXPORTACIÓN
 * ==========================================
 */

// Exportar inspección a PDF (simplificado)
export const exportInspectionToPDF = async (inspectionId) => {
  const inspection = await getInspectionById(inspectionId);
  // Aquí iría la lógica de generación de PDF
  // Por ahora retornamos los datos para que el componente los renderice
  return inspection;
};

// Exportar estadísticas a Excel
export const exportStatsToExcel = async (filters) => {
  const inspections = await getInspections(filters);
  // Aquí iría la lógica de generación de Excel
  return inspections;
};
