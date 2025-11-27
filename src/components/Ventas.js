import React, { useState, useMemo } from 'react';
import { ShoppingCart, Calendar, Filter, X } from 'lucide-react';

const Ventas = ({ ventas, formatearPrecio }) => {
  const [filtroFecha, setFiltroFecha] = useState('todas'); // 'todas', 'hoy', 'ayer', 'semana', 'mes', 'personalizado'
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  console.log('Ventas recibidas en componente:', ventas.length); // Para debug

  // Calcular fechas para filtros rápidos
  const hoy = new Date();
  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);
  
  const inicioSemana = new Date(hoy);
  inicioSemana.setDate(hoy.getDate() - 7);
  
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  // Filtrar ventas según el filtro seleccionado
  const ventasFiltradas = useMemo(() => {
    console.log('Filtrando ventas:', { 
      totalVentas: ventas.length, 
      filtroFecha, 
      fechaInicio, 
      fechaFin 
    });

    let ventasParaFiltrar = [...ventas];

    switch (filtroFecha) {
      case 'hoy':
        ventasParaFiltrar = ventas.filter(venta => {
          const fechaVenta = new Date(venta.fecha || venta.created_at);
          const esHoy = fechaVenta.toDateString() === hoy.toDateString();
          console.log('Comparando fecha para hoy:', {
            fechaVenta: fechaVenta.toDateString(),
            hoy: hoy.toDateString(),
            esHoy
          });
          return esHoy;
        });
        break;
      
      case 'ayer':
        ventasParaFiltrar = ventas.filter(venta => {
          const fechaVenta = new Date(venta.fecha || venta.created_at);
          return fechaVenta.toDateString() === ayer.toDateString();
        });
        break;
      
      case 'semana':
        ventasParaFiltrar = ventas.filter(venta => {
          const fechaVenta = new Date(venta.fecha || venta.created_at);
          return fechaVenta >= inicioSemana;
        });
        break;
      
      case 'mes':
        ventasParaFiltrar = ventas.filter(venta => {
          const fechaVenta = new Date(venta.fecha || venta.created_at);
          return fechaVenta >= inicioMes;
        });
        break;
      
      case 'personalizado':
        if (fechaInicio || fechaFin) {
          ventasParaFiltrar = ventas.filter(venta => {
            const fechaVenta = new Date(venta.fecha || venta.created_at);
            const fechaVentaStr = fechaVenta.toISOString().split('T')[0];
            
            const cumpleInicio = !fechaInicio || fechaVentaStr >= fechaInicio;
            const cumpleFin = !fechaFin || fechaVentaStr <= fechaFin;
            
            return cumpleInicio && cumpleFin;
          });
        }
        break;
      
      default: // 'todas'
        ventasParaFiltrar = ventas;
        break;
    }

    console.log('Ventas después del filtro:', ventasParaFiltrar.length);

    return ventasParaFiltrar.sort((a, b) => {
      const fechaA = new Date(a.fecha || a.created_at);
      const fechaB = new Date(b.fecha || b.created_at);
      return fechaB - fechaA; // Más recientes primero
    });
  }, [ventas, filtroFecha, fechaInicio, fechaFin, hoy, ayer, inicioSemana, inicioMes]);

  // Calcular estadísticas de las ventas filtradas
  const estadisticas = useMemo(() => {
    const total = ventasFiltradas.reduce((sum, venta) => sum + (venta.total || 0), 0);
    const cantidad = ventasFiltradas.reduce((sum, venta) => sum + (venta.cantidad || 0), 0);
    
    return {
      totalVentas: ventasFiltradas.length,
      totalIngresos: total,
      cantidadProductos: cantidad
    };
  }, [ventasFiltradas]);

  const limpiarFiltros = () => {
    setFiltroFecha('todas');
    setFechaInicio('');
    setFechaFin('');
  };

  const FilterButton = ({ value, label, count = null }) => (
    <button
      onClick={() => setFiltroFecha(value)}
      className={`filter-button ${filtroFecha === value ? 'active ventas' : ''}`}
    >
      {label}
      {count !== null && <span className="filter-count">({count})</span>}
    </button>
  );

  return (
    <div>
      <div className="section-header">
        <h2>Registro de Ventas</h2>
        <button
          onClick={() => setMostrarFiltros(!mostrarFiltros)}
          className="btn-secondary"
        >
          <Filter size={20} />
          Filtros
        </button>
      </div>

      {/* Panel de filtros */}
      {mostrarFiltros && (
        <div className="card">
          <div className="filter-header">
            <h3>
              <Calendar size={20} style={{display: 'inline', marginRight: '0.5rem'}} />
              Filtrar por fecha
            </h3>
            {filtroFecha !== 'todas' && (
              <button onClick={limpiarFiltros} className="btn-clear-filters">
                <X size={16} />
                Limpiar
              </button>
            )}
          </div>

          {/* Filtros rápidos */}
          <div className="filter-grid">
            <FilterButton 
              value="todas" 
              label="Todas" 
              count={ventas.length}
            />
            <FilterButton 
              value="hoy" 
              label="Hoy" 
              count={ventas.filter(v => {
                const fechaVenta = new Date(v.fecha || v.created_at);
                return fechaVenta.toDateString() === hoy.toDateString();
              }).length}
            />
            <FilterButton 
              value="ayer" 
              label="Ayer" 
              count={ventas.filter(v => {
                const fechaVenta = new Date(v.fecha || v.created_at);
                return fechaVenta.toDateString() === ayer.toDateString();
              }).length}
            />
            <FilterButton 
              value="semana" 
              label="Última semana" 
              count={ventas.filter(v => {
                const fechaVenta = new Date(v.fecha || v.created_at);
                return fechaVenta >= inicioSemana;
              }).length}
            />
            <FilterButton 
              value="mes" 
              label="Este mes" 
              count={ventas.filter(v => {
                const fechaVenta = new Date(v.fecha || v.created_at);
                return fechaVenta >= inicioMes;
              }).length}
            />
            <FilterButton 
              value="personalizado" 
              label="Personalizado"
            />
          </div>

          {/* Filtro personalizado */}
          {filtroFecha === 'personalizado' && (
            <div className="custom-date-filter">
              <div className="form-row">
                <div>
                  <label>Desde</label>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label>Hasta</label>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="input"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Estadísticas del filtro actual */}
      {filtroFecha !== 'todas' && (
        <div className="card stats-summary">
          <h3>Resumen del filtro</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <p className="stat-label">Ventas</p>
              <p className="stat-value">{estadisticas.totalVentas}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Productos</p>
              <p className="stat-value">{estadisticas.cantidadProductos}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Ingresos</p>
              <p className="stat-value">{formatearPrecio(estadisticas.totalIngresos)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Lista de ventas */}
      {ventasFiltradas.length === 0 ? (
        <div className="empty-state">
          <ShoppingCart size={48} />
          <p>
            {filtroFecha === 'todas' 
              ? 'No hay ventas registradas' 
              : `No hay ventas para el período seleccionado`
            }
          </p>
          {filtroFecha !== 'todas' && (
            <button onClick={limpiarFiltros} className="btn-primary">
              Ver todas las ventas
            </button>
          )}
        </div>
      ) : (
        <div className="sales-list">
          {ventasFiltradas.map(venta => {
            // Manejar diferentes formatos de datos (localStorage vs Supabase)
            const nombreProducto = venta.nombre_producto || venta.nombreProducto || 'Producto sin nombre';
            const cantidad = venta.cantidad || 1;
            const precioUnitario = venta.precio_unitario || venta.precioUnitario || 0;
            const total = venta.total || (precioUnitario * cantidad);
            const fecha = venta.fecha || venta.created_at || new Date();

            return (
              <div key={venta.id} className="sale-card">
                <div className="sale-info">
                  <h3>{nombreProducto}</h3>
                  <p>Cantidad: {cantidad} × {formatearPrecio(precioUnitario)}</p>
                  <p className="sale-date">
                    {new Date(fecha).toLocaleDateString('es-CR', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div className="sale-total">
                  <p>{formatearPrecio(total)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Ventas;