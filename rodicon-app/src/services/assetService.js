/**
 * Servicio para manejo de Assets
 * Todas las operaciones CRUD de activos
 */

import { supabase } from '../supabaseClient';

/**
 * Obtiene todos los assets con paginación
 */
export const getAssets = async (page = 1, pageSize = 20) => {
  try {
    const from = (page - 1) * pageSize;
    const to = page * pageSize - 1;

    const { data, count, error } = await supabase
      .from('assets')
      .select('*', { count: 'exact' })
      .order('ficha')
      .range(from, to);

    if (error) throw error;
    
    return { data, count, error: null };
  } catch (error) {
    console.error('Error fetching assets:', error);
    return { data: null, count: 0, error };
  }
};

/**
 * Obtiene un asset por ID
 */
export const getAssetById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching asset:', error);
    return { data: null, error };
  }
};

/**
 * Crea un nuevo asset
 */
export const createAsset = async (assetData) => {
  try {
    const { data, error } = await supabase
      .from('assets')
      .insert([assetData])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error creating asset:', error);
    return { data: null, error };
  }
};

/**
 * Actualiza un asset
 */
export const updateAsset = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('assets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating asset:', error);
    return { data: null, error };
  }
};

/**
 * Elimina un asset
 */
export const deleteAsset = async (id) => {
  try {
    const { error } = await supabase
      .from('assets')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting asset:', error);
    return { error };
  }
};

/**
 * Busca assets por término
 */
export const searchAssets = async (searchTerm) => {
  try {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .or(`ficha.ilike.%${searchTerm}%,nombre.ilike.%${searchTerm}%,ubicacion.ilike.%${searchTerm}%`)
      .order('ficha');

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error searching assets:', error);
    return { data: null, error };
  }
};

/**
 * Obtiene assets por estado
 */
export const getAssetsByStatus = async (status) => {
  try {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('estado', status)
      .order('ficha');

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching assets by status:', error);
    return { data: null, error };
  }
};
