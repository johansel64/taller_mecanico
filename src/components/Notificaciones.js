import React, { useState } from 'react';
import { AlertTriangle, Filter, Copy, List, TrendingDown } from 'lucide-react';

const Notificaciones = ({ productos, ventas, notificaciones, formatearPrecio, mostrarNotificacion }) => {
  const [filtroAlertas, setFiltroAlertas] = useState('todas');

  // Función para formatear fechas de forma segura
  const formatearFechaSafe = (notificacion) => {
    // El campo de fecha en la base de datos se llama 'created_at'
    const timestamp = notificacion;
    
    if (!timestamp) {
        return 'Fecha no disponible';
      }
      
      try {
        let fecha;
        
        // Si el timestamp es una cadena en formato PostgreSQL (2025-07-22 14:08:41.987621+00)
        if (typeof timestamp === 'string') {
          // Convertir el formato de PostgreSQL a ISO estándar
          let timestampISO = timestamp;
          
          // Si termina en +00, reemplazar con Z para formato ISO
          if (timestamp.endsWith('+00')) {
            timestampISO = timestamp.slice(0, -3) + 'Z';
          }
          
          // Crear la fecha
          fecha = new Date(timestampISO);
        } else {
          fecha = new Date(timestamp);
        }
        
        // Verificar si la fecha es válida
        if (isNaN(fecha.getTime())) {
          console.warn('Fecha inválida:', timestamp);
          return 'Fecha inválida';
        }
        
        // Formatear la fecha para Costa Rica
        return fecha.toLocaleString('es-CR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'America/Costa_Rica' // Ajustar a zona horaria de Costa Rica
        });
      } catch (error) {
        console.error('Error al formatear fecha:', timestamp, error);
        return 'Error en fecha';
      }
    };

  const notificacionesFiltradas = notificaciones.filter(notif => {
    if (filtroAlertas === 'todas') return true;
    if (filtroAlertas === 'stock') return ['minimo', 'bajo', 'critico'].includes(notif.tipo);
    if (filtroAlertas === 'ventas') return notif.tipo === 'success';
    if (filtroAlertas === 'errores') return notif.tipo === 'error';
    return true;
  });

  console.log('Notificaciones disponibles:', notificaciones);
  console.log('Filtro actual:', filtroAlertas);
  console.log('Notificaciones filtradas:', notificacionesFiltradas);
  console.log('Tipos de notificaciones encontrados:', [...new Set(notificaciones.map(n => n.tipo))]);

  const generarListaStockBajo = () => {
    const productosStockCritico = productos.filter(p => {
      const stock = parseInt(p.stock) || 0;
      return stock === 0;
    });
    
    const productosStockBajo = productos.filter(p => {
      const stock = parseInt(p.stock) || 0;
      const stockMinimo = parseInt(p.stock_minimo || p.stockMinimo) || 0;
      return stock > 0 && stock <= stockMinimo;
    });
    
    return {
      criticos: productosStockCritico,
      bajos: productosStockBajo,
      todos: [...productosStockCritico, ...productosStockBajo]
    };
  };

  const generarListaVendidos = () => {
    const hoy = new Date();
    const inicioSemana = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 7);
    
    const ventasRecientes = ventas.filter(v => {
      const fechaVenta = new Date(v.fecha || v.created_at);
      return fechaVenta >= inicioSemana && !isNaN(fechaVenta.getTime());
    });
    
    const ventasPorProducto = ventasRecientes.reduce((acc, venta) => {
      const nombreProducto = venta.nombre_producto || venta.nombreProducto || 'Producto sin nombre';
      if (!acc[nombreProducto]) {
        acc[nombreProducto] = {
          nombre: nombreProducto,
          cantidad: 0,
          total: 0
        };
      }
      acc[nombreProducto].cantidad += venta.cantidad || 1;
      acc[nombreProducto].total += venta.total || 0;
      return acc;
    }, {});

    return Object.values(ventasPorProducto).sort((a, b) => b.cantidad - a.cantidad);
  };

  const copiarLista = (lista, tipo) => {
    let texto = '';
    
    if (tipo === 'stock') {
      texto = `LISTA DE PRODUCTOS PARA PEDIR - ${new Date().toLocaleDateString('es-CR')}\n\n`;
      
      if (lista.criticos.length > 0) {
        texto += '🔴 STOCK AGOTADO (URGENTE):\n';
        lista.criticos.forEach(p => {
          texto += `• ${p.nombre} (${p.tipo} - ${p.marca}) - Stock: ${p.stock}/${p.stockMinimo}\n`;
        });
        texto += '\n';
      }
      
      if (lista.bajos.length > 0) {
        texto += '🟡 STOCK BAJO:\n';
        lista.bajos.forEach(p => {
          texto += `• ${p.nombre} (${p.tipo} - ${p.marca}) - Stock: ${p.stock}/${p.stockMinimo}\n`;
        });
      }
      
      if (lista.todos.length === 0) {
        texto += '✅ Todos los productos tienen stock adecuado';
      }
    } 
    
    if (tipo === 'vendidos') {
      texto = `PRODUCTOS MÁS VENDIDOS - ÚLTIMA SEMANA\n${new Date().toLocaleDateString('es-CR')}\n\n`;
      
      if (lista.length > 0) {
        lista.forEach((item, index) => {
          texto += `${index + 1}. ${item.nombre}\n`;
          texto += `   Cantidad vendida: ${item.cantidad}\n`;
          texto += `   Total: ${formatearPrecio(item.total)}\n\n`;
        });
      } else {
        texto += 'No hay ventas registradas en la última semana';
      }
    }

    navigator.clipboard.writeText(texto).then(() => {
      mostrarNotificacion('Lista copiada al portapapeles', 'success');
    }).catch(() => {
      mostrarNotificacion('Error al copiar la lista', 'error');
    });
  };

  return (
    <div>
      <h2>Alertas y Listas</h2>
      
      {/* Filtros */}
      <div className="card">
        <h3>
          <Filter size={20} style={{display: 'inline', marginRight: '0.5rem'}} />
          Filtrar Alertas
        </h3>
        <div className="filter-grid">
          <button
            onClick={() => setFiltroAlertas('todas')}
            className={`filter-button ${filtroAlertas === 'todas' ? 'active todas' : ''}`}
          >
            Todas
          </button>
          <button
            onClick={() => setFiltroAlertas('stock')}
            className={`filter-button ${filtroAlertas === 'stock' ? 'active stock' : ''}`}
          >
            Stock
          </button>
          <button
            onClick={() => setFiltroAlertas('ventas')}
            className={`filter-button ${filtroAlertas === 'ventas' ? 'active ventas' : ''}`}
          >
            Ventas
          </button>
          <button
            onClick={() => setFiltroAlertas('errores')}
            className={`filter-button ${filtroAlertas === 'errores' ? 'active errores' : ''}`}
          >
            Errores
          </button>
        </div>
      </div>

      {/* Generador de Listas */}
      <div className="list-section">
        {/* Lista de Stock Bajo */}
        <div className="card">
          <h3 style={{color: '#b91c1c'}}>
            <List size={20} style={{display: 'inline', marginRight: '0.5rem'}} />
            Lista para Pedir (Stock Bajo)
          </h3>
          <div className="list-preview">
            {(() => {
              const lista = generarListaStockBajo();
              return (
                <div>
                  {lista.criticos.length > 0 && (
                    <div className="alert-box critical">
                      <p className="alert-title critical">🔴 Stock Agotado ({lista.criticos.length})</p>
                      {lista.criticos.slice(0, 3).map(p => (
                        <p key={p.id} className="alert-item critical">
                          • {p.nombre} ({p.stock}/{p.stockMinimo})
                        </p>
                      ))}
                      {lista.criticos.length > 3 && (
                        <p className="alert-more critical">
                          ... y {lista.criticos.length - 3} más
                        </p>
                      )}
                    </div>
                  )}
                  
                  {lista.bajos.length > 0 && (
                    <div className="alert-box low">
                      <p className="alert-title low">🟡 Stock Bajo ({lista.bajos.length})</p>
                      {lista.bajos.slice(0, 3).map(p => (
                        <p key={p.id} className="alert-item low">
                          • {p.nombre} ({p.stock}/{p.stockMinimo})
                        </p>
                      ))}
                      {lista.bajos.length > 3 && (
                        <p className="alert-more low">
                          ... y {lista.bajos.length - 3} más
                        </p>
                      )}
                    </div>
                  )}
                  
                  {lista.todos.length === 0 && (
                    <div className="alert-box success">
                      <p className="alert-item success">✅ Todos los productos tienen stock adecuado</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          <button
            onClick={() => copiarLista(generarListaStockBajo(), 'stock')}
            className="btn-danger copy-button"
          >
            <Copy size={16} />
            Copiar Lista de Pedidos
          </button>
        </div>

        {/* Lista de Más Vendidos */}
        <div className="card">
          <h3 style={{color: '#16a34a'}}>
            <TrendingDown size={20} style={{display: 'inline', marginRight: '0.5rem'}} />
            Más Vendidos (Última Semana)
          </h3>
          <div className="list-preview">
            {(() => {
              const vendidos = generarListaVendidos();
              return (
                <div>
                  {vendidos.length > 0 ? (
                    <div className="alert-box success">
                      {vendidos.slice(0, 5).map((item, index) => (
                        <div key={index} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.875rem'
                        }}>
                          <span className="alert-item success">
                            {index + 1}. {item.nombre}
                          </span>
                          <span style={{color: '#16a34a', fontWeight: 600}}>
                            {item.cantidad}x
                          </span>
                        </div>
                      ))}
                      {vendidos.length > 5 && (
                        <p className="alert-more" style={{color: '#16a34a', marginTop: '0.5rem'}}>
                          ... y {vendidos.length - 5} productos más
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="alert-box info">
                      <p style={{color: '#6b7280'}}>No hay ventas en la última semana</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          <button
            onClick={() => copiarLista(generarListaVendidos(), 'vendidos')}
            className="btn-success copy-button"
          >
            <Copy size={16} />
            Copiar Lista de Vendidos
          </button>
        </div>
      </div>

      {/* Historial de Notificaciones */}
      <div className="card">
        <h3>
          Historial de Notificaciones 
          {filtroAlertas !== 'todas' && (
            <span style={{fontSize: '0.875rem', fontWeight: 'normal', color: '#6b7280'}}>
              ({notificacionesFiltradas.length} filtradas)
            </span>
          )}
        </h3>
        
        {notificacionesFiltradas.length === 0 ? (
          <div className="empty-state">
            <AlertTriangle size={48} />
            <p>
              {filtroAlertas === 'todas' 
                ? 'No hay notificaciones' 
                : `No hay notificaciones de ${filtroAlertas}`
              }
            </p>
          </div>
        ) : (
          <div className="scrollable">
            {notificacionesFiltradas.map(notif => {
              // Determinar el tipo de notificación y sus estilos
              let tipoClase = 'error';
              let iconoColor = 'error';
              
              switch (notif.tipo) {
                case 'minimo':
                case 'critico':
                  tipoClase = 'critical';
                  iconoColor = 'critical';
                  break;
                case 'bajo':
                  tipoClase = 'low';
                  iconoColor = 'low';
                  break;
                case 'success':
                  tipoClase = 'success';
                  iconoColor = 'success';
                  break;
                case 'error':
                default:
                  tipoClase = 'error';
                  iconoColor = 'error';
                  break;
              }

              return (
                <div key={notif.id} className={`notification-item ${tipoClase}`}>
                  <div className="notification-content">
                    <AlertTriangle 
                      size={16} 
                      className={`notification-icon ${iconoColor}`} 
                    />
                    <div className="notification-text">
                      <p className="notification-message">{notif.mensaje}</p>
                      <p className="notification-time">
                        {formatearFechaSafe(notif.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notificaciones;