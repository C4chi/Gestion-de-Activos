import { supabase } from '../supabaseClient';

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
  });

  return { data: data || [], error };
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
