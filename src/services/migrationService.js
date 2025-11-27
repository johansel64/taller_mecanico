import { supabase } from '../config/supabase';

export const migrationService = {
  // Migrar datos desde localStorage a Supabase
  async migrarDesdeLocalStorage() {
    try {
      console.log('🔄 Iniciando migración...');
      
      // Obtener datos del localStorage
      const datosLocales = localStorage.getItem('tallerMecanicoData');
      if (!datosLocales) {
        console.log('ℹ️ No hay datos en localStorage para migrar');
        return { success: true, message: 'No hay datos para migrar' };
      }

      const datos = JSON.parse(datosLocales);
      
      // Migrar productos
      if (datos.productos && datos.productos.length > 0) {
        console.log(`📦 Migrando ${datos.productos.length} productos...`);
        
        for (const producto of datos.productos) {
          const { data, error } = await supabase
            .from('productos')
            .insert({
              nombre: producto.nombre,
              tipo: producto.tipo,
              marca: producto.marca,
              descripcion: producto.descripcion,
              precio: producto.precio,
              stock: producto.stock,
              stock_minimo: producto.stockMinimo
            });
          
          if (error) {
            console.error('Error migrando producto:', producto.nombre, error);
          }
        }
      }

      // Migrar ventas
      if (datos.ventas && datos.ventas.length > 0) {
        console.log(`💰 Migrando ${datos.ventas.length} ventas...`);
        
        for (const venta of datos.ventas) {
          const { data, error } = await supabase
            .from('ventas')
            .insert({
              nombre_producto: venta.nombreProducto,
              cantidad: venta.cantidad,
              precio_unitario: venta.precioUnitario,
              total: venta.total,
              fecha: venta.fecha
            });
          
          if (error) {
            console.error('Error migrando venta:', venta, error);
          }
        }
      }

      console.log('✅ Migración completada exitosamente');
      return { 
        success: true, 
        message: `Migración exitosa: ${datos.productos?.length || 0} productos y ${datos.ventas?.length || 0} ventas` 
      };

    } catch (error) {
      console.error('❌ Error en migración:', error);
      return { success: false, message: error.message };
    }
  },

  // Verificar si ya existen datos en Supabase
  async verificarDatosExistentes() {
    try {
      const { data: productos, error: errorProductos } = await supabase
        .from('productos')
        .select('id')
        .limit(1);

      const { data: ventas, error: errorVentas } = await supabase
        .from('ventas')
        .select('id')
        .limit(1);

      if (errorProductos || errorVentas) {
        throw new Error('Error verificando datos existentes');
      }

      return {
        tieneProductos: productos && productos.length > 0,
        tieneVentas: ventas && ventas.length > 0
      };

    } catch (error) {
      console.error('Error verificando datos:', error);
      return { tieneProductos: false, tieneVentas: false };
    }
  },

  // Hacer respaldo de Supabase a localStorage (por seguridad)
  async hacerRespaldoLocal() {
    try {
      const { data: productos } = await supabase
        .from('productos')
        .select('*')
        .eq('activo', true);

      const { data: ventas } = await supabase
        .from('ventas')
        .select('*')
        .order('fecha', { ascending: false });

      const respaldo = {
        productos: productos || [],
        ventas: ventas || [],
        fechaRespaldo: new Date().toISOString(),
        origen: 'supabase'
      };

      localStorage.setItem('tallerMecanicoBackup', JSON.stringify(respaldo));
      console.log('✅ Respaldo local creado');
      
      return respaldo;
    } catch (error) {
      console.error('Error creando respaldo:', error);
      throw error;
    }
  }
};