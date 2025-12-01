import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Filter, 
  Copy, 
  List, 
  TrendingDown, 
  Trash2, 
  CheckCircle,
  XCircle,
  Bell,
  BellOff,
  Check  
} from 'lucide-react';
import '../styles/Notificaciones.css';

const Notificaciones = ({ 
  productos, 
  ventas, 
  notificaciones,
  formatearPrecio,
  marcarComoLeida,
  marcarTodasComoLeidas,
  eliminarNotificacion,
  eliminarTodas,
  eliminarLeidas,
  mostrarNotificacion
}) => {
  const [filtroAlertas, setFiltroAlertas] = useState('todas');
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [tipoConfirmacion, setTipoConfirmacion] = useState('');

  const formatearFechaSafe = (timestamp) => {
    try {
      const fecha = new Date(timestamp);
      if (isNaN(fecha.getTime())) {
        return 'Fecha inválida';
      }
      return fecha.toLocaleString('es-CR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Costa_Rica'
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

  const handleEliminarNotificacion = async (id) => {
    await eliminarNotificacion(id);
  };

  const handleMarcarComoLeida = async (id) => {
    await marcarComoLeida(id);
  };

  const handleMarcarTodasLeidas = async () => {
    await marcarTodasComoLeidas();
  };

  const abrirConfirmacion = (tipo) => {
    setTipoConfirmacion(tipo);
    setMostrarConfirmacion(true);
  };

  const cerrarConfirmacion = () => {
    setMostrarConfirmacion(false);
    setTipoConfirmacion('');
  };

  const confirmarEliminacion = async () => {
    let resultado;
    
    if (tipoConfirmacion === 'todas') {
      resultado = await eliminarTodas();
      // if (resultado.success) {
      //   mostrarNotificacion('Todas las notificaciones eliminadas', 'success');
      // }
    } else if (tipoConfirmacion === 'leidas') {
      resultado = await eliminarLeidas();
      // if (resultado.success) {
      //   mostrarNotificacion('Notificaciones leídas eliminadas', 'success');
      // }
    }
    
    // if (!resultado.success) {
    //   mostrarNotificacion('Error al eliminar notificaciones', 'error');
    // }
    
    cerrarConfirmacion();
  };

  const getTituloConfirmacion = () => {
    if (tipoConfirmacion === 'todas') return '¿Eliminar TODAS las notificaciones?';
    if (tipoConfirmacion === 'leidas') return '¿Eliminar notificaciones leídas?';
    return '';
  };

  const getMensajeConfirmacion = () => {
    if (tipoConfirmacion === 'todas') {
      return `Se eliminarán ${notificaciones.length} notificaciones permanentemente.`;
    }
    if (tipoConfirmacion === 'leidas') {
      const leidas = notificaciones.filter(n => n.leida).length;
      return `Se eliminarán ${leidas} notificaciones leídas permanentemente.`;
    }
    return '';
  };

  return (
    <div className="notificaciones-container">
      <div className="notificaciones-header">
        <h2>
          <Bell size={24} />
          Alertas y Listas
        </h2>
      </div>
      
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
            className="btn-copy danger"
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
                        <div key={index} className="vendido-item">
                          <span className="alert-item success">
                            {index + 1}. {item.nombre}
                          </span>
                          <span className="vendido-cantidad">
                            {item.cantidad}x
                          </span>
                        </div>
                      ))}
                      {vendidos.length > 5 && (
                        <p className="alert-more success">
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
            className="btn-copy success"
          >
            <Copy size={16} />
            Copiar Lista de Vendidos
          </button>
        </div>
      </div>

      {/* Historial de Notificaciones */}
      <div className="card notificaciones-card">
        <div className="notificaciones-card-header">
          <h3>
            Historial de Notificaciones 
            {filtroAlertas !== 'todas' && (
              <span className="count-badge">
                {notificacionesFiltradas.length}
              </span>
            )}
          </h3>
          
        {notificaciones.length > 0 && (
        <div className="header-actions">
          <button
            onClick={handleMarcarTodasLeidas}
            className="btn-action marcar"
            title="Marcar todas como leídas"
          >
            <Check size={18} />
            Marcar Leídas
          </button>
          <button
            onClick={() => abrirConfirmacion('leidas')}
            className="btn-action limpiar"
            title="Eliminar leídas"
          >
            <CheckCircle size={18} />
            Limpiar Leídas
          </button>
          <button
            onClick={() => abrirConfirmacion('todas')}
            className="btn-action eliminar"
            title="Eliminar todas"
          >
            <Trash2 size={18} />
            Eliminar Todas
          </button>
        </div>
      )}
        </div>
        
        {notificacionesFiltradas.length === 0 ? (
          <div className="empty-state">
            <BellOff size={48} />
            <p>
              {filtroAlertas === 'todas' 
                ? 'No hay notificaciones' 
                : `No hay notificaciones de ${filtroAlertas}`
              }
            </p>
          </div>
        ) : (
          <div className="notificaciones-list">
            {notificacionesFiltradas.map(notif => {
              let tipoClase = 'error';
              let IconoTipo = AlertTriangle;
              
              switch (notif.tipo) {
                case 'minimo':
                case 'critico':
                  tipoClase = 'critical';
                  IconoTipo = XCircle;
                  break;
                case 'bajo':
                  tipoClase = 'warning';
                  IconoTipo = AlertTriangle;
                  break;
                case 'success':
                  tipoClase = 'success';
                  IconoTipo = CheckCircle;
                  break;
                case 'error':
                default:
                  tipoClase = 'error';
                  IconoTipo = XCircle;
                  break;
              }

              return (
                <div 
                  key={notif.id} 
                  className={`notification-item ${tipoClase} ${notif.leida ? 'leida' : 'no-leida'}`}
                >
                  <div className="notification-icon-container">
                    <IconoTipo size={20} className={`icon-${tipoClase}`} />
                  </div>
                  
                  <div className="notification-body">
                    <p className="notification-message">{notif.mensaje}</p>
                    <p className="notification-time">
                      {formatearFechaSafe(notif.created_at)}
                    </p>
                  </div>
                  
                  <div className="notification-actions">
                    {!notif.leida && (
                      <button
                        onClick={() => handleMarcarComoLeida(notif.id)}
                        className="btn-mark-read"
                        title="Marcar como leída"
                      >
                        <Check size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => handleEliminarNotificacion(notif.id)}
                      className="btn-delete-notif"
                      title="Eliminar notificación"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Confirmación */}
      {mostrarConfirmacion && (
        <div className="modal-overlay" onClick={cerrarConfirmacion}>
          <div className="modal-content confirmacion" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header danger">
              <AlertTriangle size={24} />
              <h3>{getTituloConfirmacion()}</h3>
            </div>
            
            <div className="modal-body">
              <p>{getMensajeConfirmacion()}</p>
              <p className="warning-text">Esta acción no se puede deshacer.</p>
            </div>
            
            <div className="modal-actions">
              <button
                onClick={confirmarEliminacion}
                className="btn-confirm danger"
              >
                Sí, Eliminar
              </button>
              <button
                onClick={cerrarConfirmacion}
                className="btn-cancel"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notificaciones;