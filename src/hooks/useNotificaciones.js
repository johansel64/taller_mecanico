import { useState, useEffect } from 'react';
import { notificacionesService } from '../services/notificacionesService';

export const useNotificaciones = () => {
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [noLeidas, setNoLeidas] = useState(0);

  // Cargar notificaciones iniciales
  const cargarNotificaciones = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await notificacionesService.obtenerNotificaciones();
      setNotificaciones(data);
      
      // Contar no leídas
      const countNoLeidas = await notificacionesService.contarNoLeidas();
      setNoLeidas(countNoLeidas);
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Crear nueva notificación
  const crearNotificacion = async (mensaje, tipo, productoNombre = null) => {
    try {
      const notificacion = await notificacionesService.crearNotificacion(mensaje, tipo, productoNombre);
      
      // Agregar al estado local para actualización inmediata
      setNotificaciones(prev => [notificacion, ...prev.slice(0, 49)]);
      setNoLeidas(prev => prev + 1);
      
      return { success: true, data: notificacion };
    } catch (error) {
      console.error('Error creando notificación:', error);
      return { success: false, error: error.message };
    }
  };

  // Marcar como leída
  const marcarComoLeida = async (id) => {
    try {
      await notificacionesService.marcarComoLeida(id);
      
      setNotificaciones(prev => 
        prev.map(notif => 
          notif.id === id ? { ...notif, leida: true } : notif
        )
      );
      
      setNoLeidas(prev => Math.max(0, prev - 1));
      
      return { success: true };
    } catch (error) {
      console.error('Error marcando como leída:', error);
      return { success: false, error: error.message };
    }
  };

  // Marcar todas como leídas
  const marcarTodasComoLeidas = async () => {
    try {
      await notificacionesService.marcarTodasComoLeidas();
      
      setNotificaciones(prev => 
        prev.map(notif => ({ ...notif, leida: true }))
      );
      
      setNoLeidas(0);
      
      return { success: true };
    } catch (error) {
      console.error('Error marcando todas como leídas:', error);
      return { success: false, error: error.message };
    }
  };

  // Filtrar notificaciones por tipo
  const filtrarPorTipo = (tipo) => {
    if (tipo === 'todas') return notificaciones;
    if (tipo === 'stock') return notificaciones.filter(n => ['minimo', 'bajo', 'critico'].includes(n.tipo));
    if (tipo === 'ventas') return notificaciones.filter(n => n.tipo === 'success');
    if (tipo === 'errores') return notificaciones.filter(n => n.tipo === 'error');
    return notificaciones.filter(n => n.tipo === tipo);
  };

  // Cargar notificaciones al montar el componente
  useEffect(() => {
    cargarNotificaciones();
  }, []);

  // Suscribirse a cambios en tiempo real
  useEffect(() => {
    const subscription = notificacionesService.suscribirCambios((payload) => {
      console.log('Cambio en notificaciones:', payload);
      
      switch (payload.eventType) {
        case 'INSERT':
          setNotificaciones(prev => [payload.new, ...prev.slice(0, 49)]);
          if (!payload.new.leida) {
            setNoLeidas(prev => prev + 1);
          }
          break;
        case 'UPDATE':
          setNotificaciones(prev => 
            prev.map(n => n.id === payload.new.id ? payload.new : n)
          );
          // Recalcular no leídas si se marcó como leída
          if (payload.old.leida !== payload.new.leida) {
            setNoLeidas(prev => payload.new.leida ? prev - 1 : prev + 1);
          }
          break;
        case 'DELETE':
          setNotificaciones(prev => prev.filter(n => n.id !== payload.old.id));
          if (!payload.old.leida) {
            setNoLeidas(prev => Math.max(0, prev - 1));
          }
          break;
        default:
          break;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    notificaciones,
    loading,
    error,
    noLeidas,
    cargarNotificaciones,
    crearNotificacion,
    marcarComoLeida,
    marcarTodasComoLeidas,
    filtrarPorTipo
  };
};