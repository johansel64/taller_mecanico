import { supabase } from '../config/supabase';

export const notificacionesService = {
  // Crear nueva notificación
  async crearNotificacion(mensaje, tipo, productoNombre = null) {
    try {
      const { data, error } = await supabase
        .from('notificaciones')
        .insert({
          mensaje,
          tipo,
          producto_nombre: productoNombre
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creando notificación:', error);
      throw error;
    }
  },

  // Obtener notificaciones recientes
  async obtenerNotificaciones(limite = 50) {
    try {
      const { data, error } = await supabase
        .from('notificaciones')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limite);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo notificaciones:', error);
      throw error;
    }
  },

  // Obtener notificaciones por tipo
  async obtenerNotificacionesPorTipo(tipo, limite = 20) {
    try {
      const { data, error } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('tipo', tipo)
        .order('created_at', { ascending: false })
        .limit(limite);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo notificaciones por tipo:', error);
      throw error;
    }
  },

  // Marcar notificación como leída
  async marcarComoLeida(id) {
    try {
      const { data, error } = await supabase
        .from('notificaciones')
        .update({ leida: true })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error marcando notificación como leída:', error);
      throw error;
    }
  },

  // Marcar todas como leídas
  async marcarTodasComoLeidas() {
    try {
      const { data, error } = await supabase
        .from('notificaciones')
        .update({ leida: true })
        .eq('leida', false);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error marcando todas como leídas:', error);
      throw error;
    }
  },

  // Limpiar notificaciones antiguas (más de 30 días)
  async limpiarNotificacionesAntiguas() {
    try {
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - 30);

      const { data, error } = await supabase
        .from('notificaciones')
        .delete()
        .lt('created_at', fechaLimite.toISOString());

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error limpiando notificaciones antiguas:', error);
      throw error;
    }
  },

  // Contar notificaciones no leídas
  async contarNoLeidas() {
    try {
      const { count, error } = await supabase
        .from('notificaciones')
        .select('*', { count: 'exact', head: true })
        .eq('leida', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error contando notificaciones no leídas:', error);
      return 0;
    }
  },

  // Suscribirse a cambios en tiempo real
  suscribirCambios(callback) {
    const subscription = supabase
      .channel('notificaciones-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'notificaciones' 
        }, 
        callback
      )
      .subscribe();

    return subscription;
  },

  // Eliminar notificación específica
async eliminarNotificacion(id) {
  try {
    const { error } = await supabase
      .from('notificaciones')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error eliminando notificación:', error);
    throw error;
  }
},

// Eliminar todas las notificaciones
async eliminarTodas() {
  try {
    const { error } = await supabase
      .from('notificaciones')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Eliminar todas

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error eliminando todas las notificaciones:', error);
    throw error;
  }
},

// Eliminar solo las leídas
async eliminarLeidas() {
  try {
    const { error } = await supabase
      .from('notificaciones')
      .delete()
      .eq('leida', true);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error eliminando notificaciones leídas:', error);
    throw error;
  }
},

  
};