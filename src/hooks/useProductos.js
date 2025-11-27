import { useState, useEffect } from 'react';
import { productosService } from '../services/productosService';

export const useProductos = () => {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar productos iniciales
  const cargarProductos = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await productosService.obtenerProductos();
      setProductos(data);
    } catch (error) {
      console.error('Error cargando productos:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Agregar producto
  const agregarProducto = async (nuevoProducto) => {
    try {
      const producto = await productosService.crearProducto(nuevoProducto);
      setProductos(prev => [...prev, producto]);
      return { success: true, data: producto };
    } catch (error) {
      console.error('Error agregando producto:', error);
      return { success: false, error: error.message };
    }
  };

  // Actualizar producto
  const actualizarProducto = async (id, datosProducto) => {
    try {
      const productoActualizado = await productosService.actualizarProducto(id, datosProducto);
      setProductos(prev => 
        prev.map(p => p.id === id ? productoActualizado : p)
      );
      return { success: true, data: productoActualizado };
    } catch (error) {
      console.error('Error actualizando producto:', error);
      return { success: false, error: error.message };
    }
  };

  // Eliminar producto
  const eliminarProducto = async (id) => {
    try {
      await productosService.eliminarProducto(id);
      setProductos(prev => prev.filter(p => p.id !== id));
      return { success: true };
    } catch (error) {
      console.error('Error eliminando producto:', error);
      return { success: false, error: error.message };
    }
  };

  // Actualizar stock directamente
  const actualizarStock = async (id, nuevoStock) => {
    try {
      const productoActualizado = await productosService.actualizarStock(id, nuevoStock);
      setProductos(prev => 
        prev.map(p => p.id === id ? productoActualizado : p)
      );
      return { success: true, data: productoActualizado };
    } catch (error) {
      console.error('Error actualizando stock:', error);
      return { success: false, error: error.message };
    }
  };

  // Actualizar producto específico en el estado local
  const actualizarProductoLocal = (productoActualizado) => {
    setProductos(prev => 
      prev.map(p => p.id === productoActualizado.id ? productoActualizado : p)
    );
  };

  // Buscar productos (ahora incluye códigos de barras)
  const buscarProductos = async (termino) => {
    try {
      if (!termino.trim()) {
        await cargarProductos();
        return;
      }
      
      setLoading(true);
      const resultados = await productosService.buscarProductos(termino);
      setProductos(resultados);
    } catch (error) {
      console.error('Error buscando productos:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ NUEVO: Buscar producto específico por código de barras
  const buscarPorCodigoBarras = async (codigoBarras) => {
    try {
      setLoading(true);
      setError(null);
      const producto = await productosService.buscarPorCodigoBarras(codigoBarras);
      
      // Mostrar solo el producto encontrado
      setProductos([producto]);
      return { success: true, data: producto };
    } catch (error) {
      console.error('Error buscando por código de barras:', error);
      setError(`No se encontró producto con código: ${codigoBarras}`);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // ✅ NUEVO: Verificar si un código de barras ya existe
  const verificarCodigoBarras = async (codigo) => {
    try {
      const productoExistente = await productosService.verificarCodigoBarras(codigo);
      return {
        existe: !!productoExistente,
        producto: productoExistente
      };
    } catch (error) {
      console.error('Error verificando código de barras:', error);
      return { existe: false, producto: null };
    }
  };

  // ✅ NUEVO: Generar código de barras único
  const generarCodigoBarras = async () => {
    try {
      return await productosService.generarCodigoBarras();
    } catch (error) {
      console.error('Error generando código de barras:', error);
      throw error;
    }
  };

  // ✅ NUEVO: Obtener datos para autocompletado
  const obtenerTipos = async () => {
    try {
      return await productosService.obtenerTipos();
    } catch (error) {
      console.error('Error obteniendo tipos:', error);
      return [];
    }
  };

  const obtenerMarcas = async () => {
    try {
      return await productosService.obtenerMarcas();
    } catch (error) {
      console.error('Error obteniendo marcas:', error);
      return [];
    }
  };

  // Obtener productos con stock bajo
  const obtenerProductosStockBajo = async () => {
    try {
      return await productosService.obtenerProductosStockBajo();
    } catch (error) {
      console.error('Error obteniendo productos stock bajo:', error);
      return [];
    }
  };

  // ✅ NUEVO: Buscar y actualizar estado basado en tipo de búsqueda
  const buscarConDeteccion = async (termino) => {
    try {
      if (!termino.trim()) {
        await cargarProductos();
        return { tipo: 'todos', resultados: productos };
      }

      setLoading(true);
      setError(null);

      // Detectar si es un código de barras (numérico y longitud específica)
      const esCodigoBarras = /^\d{8,18}$/.test(termino.trim());

      if (esCodigoBarras) {
        try {
          // Intentar buscar por código de barras específico primero
          const producto = await productosService.buscarPorCodigoBarras(termino);
          setProductos([producto]);
          return { 
            tipo: 'codigo_barras', 
            resultados: [producto],
            encontrado: true
          };
        } catch (error) {
          // Si no se encuentra por código específico, hacer búsqueda general
          console.log('No encontrado por código específico, buscando en general...');
        }
      }

      // Búsqueda general (nombre, descripción, marca, código)
      const resultados = await productosService.buscarProductos(termino);
      setProductos(resultados);
      
      return { 
        tipo: esCodigoBarras ? 'codigo_barras' : 'texto', 
        resultados,
        encontrado: resultados.length > 0
      };

    } catch (error) {
      console.error('Error en búsqueda con detección:', error);
      setError(error.message);
      return { tipo: 'error', resultados: [], encontrado: false };
    } finally {
      setLoading(false);
    }
  };

  // ✅ MEJORADO: Función para manejar productos escaneados
  const manejarProductoEscaneado = async (codigoBarras) => {
    try {
      const resultado = await buscarPorCodigoBarras(codigoBarras);
      
      if (resultado.success) {
        return {
          encontrado: true,
          producto: resultado.data,
          mensaje: `Producto encontrado: ${resultado.data.nombre}`
        };
      } else {
        return {
          encontrado: false,
          producto: null,
          mensaje: `No se encontró producto con código: ${codigoBarras}`
        };
      }
    } catch (error) {
      return {
        encontrado: false,
        producto: null,
        mensaje: `Error buscando producto: ${error.message}`
      };
    }
  };

  // Cargar productos al montar el componente
  useEffect(() => {
    cargarProductos();
  }, []);

  // Suscribirse a cambios en tiempo real
  useEffect(() => {
    const subscription = productosService.suscribirCambios((payload) => {
      console.log('Cambio en productos:', payload);
      
      switch (payload.eventType) {
        case 'INSERT':
          // Agregar el nuevo producto con información completa
          setProductos(prev => {
            // Evitar duplicados
            const exists = prev.some(p => p.id === payload.new.id);
            if (!exists) {
              return [...prev, payload.new];
            }
            return prev;
          });
          break;
        case 'UPDATE':
          setProductos(prev => 
            prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p)
          );
          break;
        case 'DELETE':
          setProductos(prev => prev.filter(p => p.id !== payload.old.id));
          break;
        default:
          break;
      }
    });

    return () => {
      if (subscription && subscription.unsubscribe) {
        subscription.unsubscribe();
      }
    };
  }, []);

  return {
    // Estados
    productos,
    loading,
    error,
    
    // Funciones originales
    cargarProductos,
    agregarProducto,
    actualizarProducto,
    eliminarProducto,
    actualizarStock,
    actualizarProductoLocal,
    buscarProductos,
    obtenerProductosStockBajo,
    
    // ✅ Nuevas funciones para códigos de barras
    buscarPorCodigoBarras,
    verificarCodigoBarras,
    generarCodigoBarras,
    manejarProductoEscaneado,
    buscarConDeteccion,
    
    // ✅ Funciones para autocompletado
    obtenerTipos,
    obtenerMarcas
  };
};