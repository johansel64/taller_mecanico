import { supabase } from '../config/supabase';
import { productosService } from './productosService';

export const ventasService = {
  // Obtener todas las ventas
  async obtenerVentas(limite = 100) {
    try {
      const { data, error } = await supabase
        .from('ventas')
        .select('*')
        .order('fecha', { ascending: false })
        .limit(limite);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo ventas:', error);
      throw error;
    }
  },

async realizarVenta(productoId, cantidad = 1) {
  try {

    // Obtener producto actual
    const { data: producto, error: errorProducto } = await supabase
      .from('productos')
      .select('*')
      .eq('id', productoId)
      .single();


    if (errorProducto) {
      console.error('Error obteniendo producto:', errorProducto);
      throw errorProducto;
    }
    
    if (!producto) {
      throw new Error('Producto no encontrado');
    }

    if (producto.stock < cantidad) {
      throw new Error(`Stock insuficiente. Disponible: ${producto.stock}, Solicitado: ${cantidad}`);
    }

    // Calcular nuevo stock y total
    const nuevoStock = producto.stock - cantidad;
    const precioUnitario = parseFloat(producto.precio);
    const total = precioUnitario * cantidad;


    // Crear venta
    const { data: venta, error: errorVenta } = await supabase
      .from('ventas')
      .insert({
        producto_id: productoId,
        nombre_producto: producto.nombre,
        cantidad: cantidad,
        precio_unitario: precioUnitario,
        total: total,
        fecha: new Date().toISOString()
      })
      .select()
      .single();


    if (errorVenta) {
      console.error('Error creando venta:', errorVenta);
      throw errorVenta;
    }

    // Actualizar stock del producto
    const { error: errorStock } = await supabase
      .from('productos')
      .update({ stock: nuevoStock })
      .eq('id', productoId);

    if (errorStock) {
      console.error('Error actualizando stock:', errorStock);
      // Si falla actualizar stock, intentar revertir la venta
      await supabase.from('ventas').delete().eq('id', venta.id);
      throw errorStock;
    }


    // Devolver el producto actualizado con el nuevo stock
    const productoActualizado = { 
      ...producto, 
      stock: nuevoStock 
    };

    return {
      success: true,
      data: venta,
      venta: venta,
      productoActualizado
    };

  } catch (error) {
    console.error('Error realizando venta:', error);
    // ✅ Retornar error en lugar de hacer throw
    return {
      success: false,
      error: error.message || 'Error desconocido al realizar venta',
      data: null,
      venta: null,
      productoActualizado: null
    };
  }
},

  // Obtener ventas por rango de fechas
  async obtenerVentasPorFecha(fechaInicio, fechaFin) {
    try {
      let query = supabase
        .from('ventas')
        .select('*')
        .order('fecha', { ascending: false });

      if (fechaInicio) {
        query = query.gte('fecha', fechaInicio);
      }
      
      if (fechaFin) {
        // Agregar 23:59:59 al final del día
        const fechaFinCompleta = new Date(fechaFin);
        fechaFinCompleta.setHours(23, 59, 59, 999);
        query = query.lte('fecha', fechaFinCompleta.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo ventas por fecha:', error);
      throw error;
    }
  },

  // Obtener estadísticas de ventas
  async obtenerEstadisticasVentas(fechaInicio, fechaFin) {
    try {
      const ventas = await this.obtenerVentasPorFecha(fechaInicio, fechaFin);
      
      const totalVentas = ventas.length;
      const totalIngresos = ventas.reduce((sum, venta) => sum + venta.total, 0);
      const cantidadProductos = ventas.reduce((sum, venta) => sum + venta.cantidad, 0);

      // Productos más vendidos
      const productosMasVendidos = ventas.reduce((acc, venta) => {
        const key = venta.nombre_producto;
        if (!acc[key]) {
          acc[key] = {
            nombre: venta.nombre_producto,
            cantidad: 0,
            total: 0
          };
        }
        acc[key].cantidad += venta.cantidad;
        acc[key].total += venta.total;
        return acc;
      }, {});

      const topProductos = Object.values(productosMasVendidos)
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 10);

      return {
        totalVentas,
        totalIngresos,
        cantidadProductos,
        topProductos,
        ventasDetalladas: ventas
      };

    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  },

  // Obtener ventas de la última semana
  async obtenerVentasUltimaSemana() {
    try {
      const hoy = new Date();
      const unaSemanaAtras = new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      return await this.obtenerVentasPorFecha(
        unaSemanaAtras.toISOString(),
        hoy.toISOString()
      );
    } catch (error) {
      console.error('Error obteniendo ventas última semana:', error);
      throw error;
    }
  },

  // Suscribirse a cambios en tiempo real
  suscribirCambios(callback) {
    const subscription = supabase
      .channel('ventas-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'ventas' 
        }, 
        callback
      )
      .subscribe();

    return subscription;
  }
};