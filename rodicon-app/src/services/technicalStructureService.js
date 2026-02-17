import { supabase } from '../supabaseClient';

const makeError = (message, original = null) => ({
  message,
  original,
});

const isRpcMissingOrAmbiguous = (error) => {
  const msg = String(error?.message || '').toLowerCase();
  return (
    msg.includes('function')
    || msg.includes('could not choose the best candidate function')
    || msg.includes('does not exist')
    || msg.includes('pgrst')
  );
};

const loadChildrenFromTable = async ({ assetId, templateId, parentId, search, limit }) => {
  let query = supabase
    .from('asset_nodes')
    .select('id, parent_id, node_type, sort_order, name, description, part_number')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
    .limit(limit);

  if (assetId) {
    query = query.eq('asset_id', assetId);
  } else if (templateId) {
    query = query.eq('template_id', templateId);
  }

  if (search) {
    const safe = String(search).replace(/,/g, ' ');
    query = query.or(`name.ilike.%${safe}%,part_number.ilike.%${safe}%,description.ilike.%${safe}%`);
  } else if (parentId) {
    query = query.eq('parent_id', parentId);
  } else {
    query = query.is('parent_id', null);
  }

  const { data, error } = await query;
  if (error) return { data: [], error };

  if (!data || data.length === 0) {
    return { data: [], error: null };
  }

  const ids = data.map(n => n.id);
  let childrenQuery = supabase
    .from('asset_nodes')
    .select('parent_id')
    .in('parent_id', ids);

  if (assetId) {
    childrenQuery = childrenQuery.eq('asset_id', assetId);
  } else if (templateId) {
    childrenQuery = childrenQuery.eq('template_id', templateId);
  }

  const { data: childRows, error: childError } = await childrenQuery;
  if (childError) {
    return {
      data: data.map(n => ({ ...n, has_children: false })),
      error: null,
    };
  }

  const parentsWithChildren = new Set((childRows || []).map(r => r.parent_id));
  return {
    data: data.map(n => ({ ...n, has_children: parentsWithChildren.has(n.id) })),
    error: null,
  };
};

export const listTemplates = async () => {
  const { data, error } = await supabase
    .from('asset_templates')
    .select('*')
    .eq('is_active', true)
    .order('brand', { ascending: true })
    .order('model', { ascending: true })
    .order('name', { ascending: true });

  return { data: data || [], error };
};

export const createTemplate = async (payload) => {
  const { data, error } = await supabase
    .from('asset_templates')
    .insert([payload])
    .select()
    .single();

  return { data, error };
};

export const getChildren = async ({ assetId = null, templateId = null, parentId = null, search = null, limit = 200 }) => {
  const { data, error } = await supabase.rpc('get_children', {
    p_asset_id: assetId,
    p_template_id: templateId,
    p_parent_id: parentId,
    p_search: search,
    p_limit: limit,
    p_offset: 0,
  });

  if (!error) {
    return { data: data || [], error: null };
  }

  if (isRpcMissingOrAmbiguous(error)) {
    const ownerScope = assetId ? 'asset' : 'template';
    const ownerId = assetId || templateId;

    if (ownerId) {
      const alt = await supabase.rpc('get_children', {
        p_owner_scope: ownerScope,
        p_owner_id: ownerId,
        p_parent_id: parentId,
        p_search: search,
        p_limit: limit,
        p_offset: 0,
      });

      if (!alt.error) {
        return { data: alt.data || [], error: null };
      }

      const fallback = await loadChildrenFromTable({ assetId, templateId, parentId, search, limit });
      if (!fallback.error) {
        return { data: fallback.data || [], error: null };
      }

      return {
        data: [],
        error: makeError(
          'No se pudo cargar nodos: revisa que la migración técnica esté ejecutada en la base de producción.',
          { rpc: error, altRpc: alt.error, table: fallback.error }
        ),
      };
    }
  }

  return { data: [], error };
};

export const cloneTemplateToAsset = async (templateId, assetId) => {
  const { data, error } = await supabase.rpc('clone_template_to_asset', {
    p_template_id: templateId,
    p_asset_id: assetId,
  });

  return { data, error };
};

export const bulkCloneTemplateToAssets = async (templateId, assetIds) => {
  const { data, error } = await supabase.rpc('bulk_clone_template', {
    p_template_id: templateId,
    p_asset_ids: assetIds,
  });

  return { data: data || [], error };
};

export const createNode = async (payload) => {
  const { data, error } = await supabase
    .from('asset_nodes')
    .insert([payload])
    .select()
    .single();

  return { data, error };
};

export const updateNode = async (id, payload) => {
  const { data, error } = await supabase
    .from('asset_nodes')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  return { data, error };
};

export const deleteNode = async (id) => {
  const { error } = await supabase
    .from('asset_nodes')
    .delete()
    .eq('id', id);

  return { error };
};
