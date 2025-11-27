import { useState, useEffect } from 'react';
import { ventasService } from '../services/ventasService';

export const useVentas = () => {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar ventas iniciales
  const cargarVentas = async (limite = 100) => {
    try {
      setLoading(true);
      setError(null);
      const data = await ventasService.obtenerVentas(limite);
      setVentas(data);
    } catch (error) {
      console.error('Error cargando ventas:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Realizar venta
  const realizarVenta = async (productoId, cantidad = 1) => {
    try {
      const resultado = await ventasService.realizarVenta(productoId, cantidad);
      
      // Agregar la nueva venta al estado
      setVentas(prev => [resultado.venta, ...prev]);
      
      return { 
        success: true, 
        data: resultado.venta,
        productoActualizado: resultado.productoActualizado
      };
    } catch (error) {
      console.error('Error realizando venta:', error);
      return { success: false, error: error.message };
    }
  };

  // Obtener ventas por fecha
  const obtenerVentasPorFecha = async (fechaInicio, fechaFin) => {
    try {
      setLoading(true);
      const data = await ventasService.obtenerVentasPorFecha(fechaInicio, fechaFin);
      return data;
    } catch (error) {
      console.error('Error obteniendo ventas por fecha:', error);
      setError(error.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Obtener estadísticas
  const obtenerEstadisticas = async (fechaInicio, fechaFin) => {
    try {
      return await ventasService.obtenerEstadisticasVentas(fechaInicio, fechaFin);
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return {
        totalVentas: 0,
        totalIngresos: 0,
        cantidadProductos: 0,
        topProductos: [],
        ventasDetalladas: []
      };
    }
  };

  // Obtener ventas de la última semana
  const obtenerVentasUltimaSemana = async () => {
    try {
      return await ventasService.obtenerVentasUltimaSemana();
    } catch (error) {
      console.error('Error obteniendo ventas última semana:', error);
      return [];
    }
  };

  // Cargar ventas al montar el componente
  useEffect(() => {
    cargarVentas();
  }, []);

  // Suscribirse a cambios en tiempo real
  useEffect(() => {
    const subscription = ventasService.suscribirCambios((payload) => {
      console.log('Cambio en ventas:', payload);
      
      switch (payload.eventType) {
        case 'INSERT':
          setVentas(prev => [payload.new, ...prev]);
          break;
        case 'UPDATE':
          setVentas(prev => 
            prev.map(v => v.id === payload.new.id ? payload.new : v)
          );
          break;
        case 'DELETE':
          setVentas(prev => prev.filter(v => v.id !== payload.old.id));
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
    ventas,
    loading,
    error,
    cargarVentas,
    realizarVenta,
    obtenerVentasPorFecha,
    obtenerEstadisticas,
    obtenerVentasUltimaSemana
  };
};