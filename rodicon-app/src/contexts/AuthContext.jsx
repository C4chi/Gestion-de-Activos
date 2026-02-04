import React, { createContext, useState, useCallback, useContext } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../supabaseClient';

/**
 * AuthContext maneja toda la autenticación y permisos
 * Separado para mejor performance y mantenibilidad
 */
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  // Login con PIN
  const handlePinSubmit = useCallback(async (pin) => {
    try {
      setLoading(true);
      console.log('🔐 Intentando login con PIN:', pin);

      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('pin', pin)
        .single();

      if (error || !data) {
        console.error('❌ PIN incorrecto:', error);
        toast.error('PIN incorrecto');
        return false;
      }

      console.log('✅ Usuario encontrado:', data.nombre, '-', data.rol);
      setUser(data);
      toast.success(`Bienvenido, ${data.nombre}!`);
      return true;
    } catch (error) {
      console.error('❌ Error en login:', error);
      toast.error('Error al iniciar sesión');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout
  const logout = useCallback(() => {
    console.log('👋 Cerrando sesión...');
    setUser(null);
    toast.success('Sesión cerrada');
  }, []);

  // Check permissions
  const can = useCallback((roles) => {
    if (!user) return false;
    if (user.rol === 'ADMIN') return true; // ADMIN puede todo
    
    const rolesList = Array.isArray(roles) ? roles : [roles];
    return rolesList.includes(user.rol);
  }, [user]);

  // Require role (with error message)
  const requireRole = useCallback((roles, actionLabel = 'acción') => {
    if (!can(roles)) {
      toast.error('No tienes permiso para esta acción');
      console.warn(`⛔ Acceso denegado (${actionLabel}) para rol:`, user?.rol);
      return false;
    }
    return true;
  }, [can, user]);

  const value = {
    user,
    loading,
    handlePinSubmit,
    logout,
    can,
    requireRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook para usar el contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};
