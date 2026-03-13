import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

/**
 * Hook para gestionar notificaciones en tiempo real
 * Usa Supabase Realtime para actualizaciones instantáneas
 */
const isUuid = (v) => typeof v === 'string' && /^[0-9a-fA-F-]{32,36}$/.test(v);
const isNumericId = (v) => {
  if (typeof v === 'number') return Number.isFinite(v);
  if (typeof v === 'string' && v.trim() !== '') return /^\d+$/.test(v.trim());
  return false;
};

export const useNotifications = (userId) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tableAvailable, setTableAvailable] = useState(true);

  // Soportar ambos modelos de usuario_id: UUID (auth.users) o BIGINT (app_users)
  const normalizedUserId = isUuid(userId)
    ? userId
    : isNumericId(userId)
      ? Number(userId)
      : null;

  // Cargar notificaciones iniciales
  useEffect(() => {
    if (!normalizedUserId) {
      setLoading(false);
      return;
    }

    const fetchNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('usuario_id', normalizedUserId)
          .order('fecha_creacion', { ascending: false })
          .limit(50);

        if (error) throw error;
        setTableAvailable(true);
        setNotifications(data || []);
        
        // Contar no leídas
        const unread = data?.filter(n => !n.leida).length || 0;
        setUnreadCount(unread);
        setLoading(false);
      } catch (err) {
        if (err?.code === 'PGRST205' || (err?.message || '').includes("Could not find the table 'public.notifications'")) {
          console.warn('Tabla notifications no existe aún en este proyecto');
          setTableAvailable(false);
          setNotifications([]);
          setUnreadCount(0);
          setLoading(false);
          return;
        }
        console.error('Error cargando notificaciones:', err);
        toast.error('Error al cargar notificaciones');
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [normalizedUserId]);

  // Escuchar cambios en tiempo real
  useEffect(() => {
    if (!normalizedUserId || !tableAvailable) return;

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `usuario_id=eq.${normalizedUserId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Nueva notificación
            setNotifications(prev => [payload.new, ...prev]);
            setUnreadCount(prev => prev + 1);
            
            // Notificación del sistema
            const content = payload.new.contenido || '';
            const shortContent = content.length > 90 ? `${content.slice(0, 90)}…` : content;
            const toastMessage = shortContent
              ? `${payload.new.titulo} — ${shortContent}`
              : payload.new.titulo;

            toast.success(toastMessage, {
              duration: 5000,
              icon: getIconForType(payload.new.tipo),
            });
          } else if (payload.eventType === 'UPDATE') {
            // Actualización (ej: marcar como leída)
            setNotifications(prev =>
              prev.map(n => n.id === payload.new.id ? payload.new : n)
            );
            
            if (payload.old.leida === false && payload.new.leida === true) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [normalizedUserId, tableAvailable]);

  // Marcar como leída
  const markAsRead = useCallback(async (notificationId) => {
    if (!tableAvailable) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ leida: true, fecha_lectura: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('usuario_id', normalizedUserId);

      if (error) throw error;
    } catch (err) {
      console.error('Error marcando notificación como leída:', err);
      toast.error('Error actualizando notificación');
    }
  }, [normalizedUserId, tableAvailable]);

  // Marcar todas como leídas
  const markAllAsRead = useCallback(async () => {
    if (!tableAvailable) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ leida: true, fecha_lectura: new Date().toISOString() })
        .eq('usuario_id', normalizedUserId)
        .eq('leida', false);

      if (error) throw error;
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marcando todas como leídas:', err);
      toast.error('Error actualizando notificaciones');
    }
  }, [normalizedUserId, tableAvailable]);

  // Filtrar por tipo (HSE, COMPRAS, TALLER, etc)
  const filterByType = useCallback((type) => {
    return notifications.filter(n => n.tipo === type);
  }, [notifications]);

  // Eliminar notificación
  const deleteNotification = useCallback(async (notificationId) => {
    if (!tableAvailable) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('usuario_id', normalizedUserId);

      if (error) throw error;
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('Error eliminando notificación:', err);
      toast.error('Error eliminando notificación');
    }
  }, [normalizedUserId, tableAvailable]);

  // Eliminar todas las notificaciones del usuario
  const deleteAllNotifications = useCallback(async () => {
    if (!tableAvailable) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('usuario_id', normalizedUserId);

      if (error) throw error;
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('Error eliminando todas las notificaciones:', err);
      toast.error('Error eliminando notificaciones');
    }
  }, [normalizedUserId, tableAvailable]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    filterByType,
    deleteNotification,
    deleteAllNotifications,
  };
};

// Iconos según tipo
function getIconForType(tipo) {
  const icons = {
    'HSE': '🚨',
    'COMPRAS': '📦',
    'TALLER': '🔧',
    'GENERAL': 'ℹ️',
  };
  return icons[tipo] || 'ℹ️';
}

export { getIconForType };
