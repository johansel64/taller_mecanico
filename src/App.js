import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Navigation from './components/Navigation';
import Inventario from './components/Inventario';
import Ventas from './components/Ventas';
import Reportes from './components/Reportes';
import Respaldos from './components/Respaldos';
import Notificaciones from './components/Notificaciones';
import MigrationModal from './components/MigrationModal';
import { useProductos } from './hooks/useProductos';
import { useVentas } from './hooks/useVentas';
import { useNotificaciones } from './hooks/useNotificaciones';
import { config } from './config/config';
import './styles/App.css';

const TallerMecanicoApp = () => {
  const [activeTab, setActiveTab] = useState('inventario');
  const [showMigration, setShowMigration] = useState(true);
  const [appReady, setAppReady] = useState(false);

  // Hooks personalizados para manejar datos
  const {
    productos,
    loading: loadingProductos,
    error: errorProductos,
    cargarProductos,
    agregarProducto,
    actualizarProducto,
    eliminarProducto,
    actualizarProductoLocal,
    buscarProductos,
    obtenerProductosStockBajo
  } = useProductos();

  const {
    ventas: todasLasVentas,
    loading: loadingVentas,
    error: errorVentas,
    realizarVenta: realizarVentaService,
    obtenerEstadisticas,
    obtenerVentasUltimaSemana
  } = useVentas();

  // Hook de notificaciones persistentes
  const {
    notificaciones,
    loading: loadingNotificaciones,
    noLeidas,
    crearNotificacion,
    marcarComoLeida,
    marcarTodasComoLeidas,
    filtrarPorTipo
  } = useNotificaciones();

  // Verificar stock bajo al cargar productos
  useEffect(() => {
    if (productos.length > 0) {
      verificarStockBajo();
    }
  }, [productos]);

  const verificarStockBajo = async () => {
    try {
      const productosStockBajo = productos.filter(p => {
        const stock = parseInt(p.stock) || 0;
        const stockMinimo = parseInt(p.stock_minimo || p.stockMinimo) || 0;
        return stock <= stockMinimo;
      });
      
      // Crear notificaciones en Supabase para productos con stock bajo
      // Solo crear si no existen notificaciones recientes del mismo producto
      for (const producto of productosStockBajo) {
        const stock = parseInt(producto.stock) || 0;
        const stockMinimo = parseInt(producto.stock_minimo || producto.stockMinimo) || 0;
        
        // Verificar si ya existe una notificación reciente para este producto
        const notificacionExistente = notificaciones.find(n => 
          n.producto_nombre === producto.nombre && 
          ['minimo', 'bajo', 'critico'].includes(n.tipo) &&
          new Date(n.created_at) > new Date(Date.now() - 60 * 60 * 1000) // última hora
        );

        if (!notificacionExistente) {
          const tipo = stock === 0 ? 'critico' : stock <= stockMinimo ? 'minimo' : 'bajo';
          const mensaje = `${producto.nombre} - Stock: ${stock}/${stockMinimo}`;
          
          await crearNotificacion(mensaje, tipo, producto.nombre);
        }
      }
    } catch (error) {
      console.error('Error verificando stock bajo:', error);
    }
  };

  const realizarVenta = async (productoId, cantidad = 1) => {
    try {
      console.log('Iniciando venta:', { productoId, cantidad }); // Debug
      
      const resultado = await realizarVentaService(productoId, cantidad);
      
      if (resultado.success) {
        // Actualizar el producto localmente
        if (resultado.productoActualizado) {
          actualizarProductoLocal(resultado.productoActualizado);
          console.log('Producto actualizado localmente:', resultado.productoActualizado);
        }
        
        // Crear notificación de venta exitosa en Supabase
        const producto = productos.find(p => p.id === productoId);
        const mensajeVenta = `Venta: ${cantidad}x ${producto?.nombre || 'Producto'}`;
        await crearNotificacion(mensajeVenta, 'success', producto?.nombre);
        
        return resultado;
      } else {
        // Crear notificación de error en Supabase
        await crearNotificacion(resultado.error || config.messages.errorVenta, 'error');
        return resultado;
      }
    } catch (error) {
      console.error('Error realizando venta:', error);
      await crearNotificacion(config.messages.errorVenta, 'error');
      return { success: false, error: error.message };
    }
  };

  // Función legacy para compatibilidad con componentes que aún la usan
  const mostrarNotificacion = async (mensaje, tipo, productoNombre = null) => {
    console.log('Creando notificación:', { mensaje, tipo, productoNombre }); // Debug
    await crearNotificacion(mensaje, tipo, productoNombre);
  };

  const formatearPrecio = (precio) => {
    // Asegurar que el precio sea un número válido
    const precioNumerico = parseFloat(precio) || 0;
    
    return new Intl.NumberFormat(config.currency.locale, {
      style: 'currency',
      currency: config.currency.currency,
      minimumFractionDigits: 0
    }).format(precioNumerico);
  };

  const exportarDatos = async () => {
    try {
      const datos = {
        productos: productos.map(p => ({
          id: p.id,
          nombre: p.nombre,
          tipo: p.tipo,
          marca: p.marca,
          descripcion: p.descripcion,
          precio: p.precio,
          stock: p.stock,
          stockMinimo: p.stock_minimo,
          created_at: p.created_at
        })),
        ventas: todasLasVentas.map(v => ({
          id: v.id,
          nombreProducto: v.nombre_producto,
          cantidad: v.cantidad,
          precioUnitario: v.precio_unitario,
          total: v.total,
          fecha: v.fecha
        })),
        notificaciones: notificaciones.map(n => ({
          id: n.id,
          mensaje: n.mensaje,
          tipo: n.tipo,
          producto_nombre: n.producto_nombre,
          created_at: n.created_at
        })),
        fechaRespaldo: new Date().toISOString(),
        version: '2.1',
        nombreNegocio: config.appName,
        origen: 'supabase'
      };

      const dataStr = JSON.stringify(datos, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const exportFileDefaultName = `respaldo_${config.appName}_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.href = url;
      linkElement.download = exportFileDefaultName;
      document.body.appendChild(linkElement);
      linkElement.click();
      document.body.removeChild(linkElement);
      URL.revokeObjectURL(url);
      
      await mostrarNotificacion('Respaldo creado exitosamente', 'success');
    } catch (error) {
      console.error('Error exportando datos:', error);
      await mostrarNotificacion('Error creando respaldo', 'error');
    }
  };

  const importarDatos = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const datos = JSON.parse(e.target.result);
        
        if (!datos.productos || !Array.isArray(datos.productos)) {
          await mostrarNotificacion('Archivo de respaldo inválido', 'error');
          return;
        }

        if (window.confirm('¿Estás seguro de importar estos datos? Esto puede tomar un momento y reemplazará algunos datos actuales.')) {
          await mostrarNotificacion('Importando datos...', 'info');
          
          // Aquí puedes implementar la lógica de importación a Supabase
          // Por ahora solo mostramos un mensaje
          await mostrarNotificacion('Función de importación en desarrollo', 'info');
        }
      } catch (error) {
        await mostrarNotificacion('Error al leer el archivo de respaldo', 'error');
        console.error('Error al importar:', error);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const limpiarDatos = async () => {
    if (window.confirm('¿Estás seguro de eliminar TODOS los datos? Esta acción no se puede deshacer.')) {
      if (window.confirm('CONFIRMACIÓN FINAL: Esto eliminará todos los productos, ventas y datos. ¿Continuar?')) {
        try {
          // Aquí implementarías la lógica para limpiar Supabase
          await mostrarNotificacion('Función de limpieza en desarrollo', 'info');
        } catch (error) {
          await mostrarNotificacion('Error eliminando datos', 'error');
        }
      }
    }
  };

  const handleMigrationComplete = () => {
    setShowMigration(false);
    setAppReady(true);
  };

  const renderContent = () => {
    if (loadingProductos && loadingVentas) {
      return (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Cargando datos...</p>
        </div>
      );
    }

    if (errorProductos || errorVentas) {
      return (
        <div className="error-state">
          <p>Error cargando datos: {errorProductos || errorVentas}</p>
          <button onClick={() => window.location.reload()} className="btn-primary">
            Reintentar
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case 'inventario':
        return (
          <Inventario 
            productos={productos}
            agregarProducto={agregarProducto}
            actualizarProducto={actualizarProducto}
            eliminarProducto={eliminarProducto}
            realizarVenta={realizarVenta}
            mostrarNotificacion={mostrarNotificacion}
            formatearPrecio={formatearPrecio}
            buscarProductos={buscarProductos}
          />
        );
      case 'ventas':
        return (
          <Ventas 
            ventas={todasLasVentas}
            formatearPrecio={formatearPrecio}
          />
        );
      case 'reportes':
        return (
          <Reportes 
            productos={productos}
            ventas={todasLasVentas}
            formatearPrecio={formatearPrecio}
            obtenerEstadisticas={obtenerEstadisticas}
          />
        );
      case 'respaldos':
        return (
          <Respaldos 
            productos={productos}
            ventas={todasLasVentas}
            exportarDatos={exportarDatos}
            importarDatos={importarDatos}
            limpiarDatos={limpiarDatos}
          />
        );
      case 'notificaciones':
        return (
          <Notificaciones 
            productos={productos}
            ventas={todasLasVentas}
            notificaciones={notificaciones}
            formatearPrecio={formatearPrecio}
            crearNotificacion={crearNotificacion}
            marcarComoLeida={marcarComoLeida}
            marcarTodasComoLeidas={marcarTodasComoLeidas}
            filtrarPorTipo={filtrarPorTipo}
            mostrarNotificacion={mostrarNotificacion}
          />
        );
      default:
        return null;
    }
  };

  // Mostrar modal de migración si es necesario
  if (showMigration && !appReady) {
    return <MigrationModal onComplete={handleMigrationComplete} />;
  }

  return (
    <div className="app">
      <Header notificaciones={notificaciones} noLeidas={noLeidas} />
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="content">
        {renderContent()}
      </div>
    </div>
  );
};

export default TallerMecanicoApp;