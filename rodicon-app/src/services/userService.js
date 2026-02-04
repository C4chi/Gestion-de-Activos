/**
 * Servicio para manejo de Usuarios
 * Operaciones CRUD de app_users
 */

import { supabase } from '../supabaseClient';

/**
 * Obtiene todos los usuarios
 */
export const getUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .order('nombre');

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching users:', error);
    return { data: null, error };
  }
};

/**
 * Obtiene un usuario por ID
 */
export const getUserById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching user:', error);
    return { data: null, error };
  }
};

/**
 * Crea un nuevo usuario
 */
export const createUser = async (userData) => {
  try {
    const { data, error } = await supabase
      .from('app_users')
      .insert([userData])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error creating user:', error);
    return { data: null, error };
  }
};

/**
 * Actualiza un usuario
 */
export const updateUser = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('app_users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating user:', error);
    return { data: null, error };
  }
};

/**
 * Elimina un usuario
 */
export const deleteUser = async (id) => {
  try {
    const { error } = await supabase
      .from('app_users')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting user:', error);
    return { error };
  }
};

/**
 * Verifica si un PIN ya existe
 */
export const checkPinExists = async (pin, excludeUserId = null) => {
  try {
    let query = supabase
      .from('app_users')
      .select('id')
      .eq('pin', pin);

    if (excludeUserId) {
      query = query.neq('id', excludeUserId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { exists: data && data.length > 0, error: null };
  } catch (error) {
    console.error('Error checking PIN:', error);
    return { exists: false, error };
  }
};

/**
 * Obtiene usuarios por rol
 */
export const getUsersByRole = async (role) => {
  try {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('rol', role)
      .order('nombre');

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching users by role:', error);
    return { data: null, error };
  }
};
