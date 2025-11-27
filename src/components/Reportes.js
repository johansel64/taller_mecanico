import React, { useState } from 'react';
import { DollarSign, TrendingDown } from 'lucide-react';

const Reportes = ({ productos, ventas, formatearPrecio, obtenerEstadisticas }) => {
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  const ventasFiltradas = ventas.filter(v => {
    if (!fechaInicio && !fechaFin) return true;
    const fechaVenta = new Date(v.fecha || v.created_at).toISOString().split('T')[0];
    const inicio = fechaInicio || '2020-01-01';
    const fin = fechaFin || '2030-12-31';
    return fechaVenta >= inicio && fechaVenta <= fin;
  });

  const totalVentas = ventasFiltradas.reduce((sum, v) => sum + v.total, 0);
  
  // Arreglar la lógica de productos con stock bajo
  const productosStockBajo = productos.filter(p => {
    const stock = parseInt(p.stock) || 0;
    const stockMinimo = parseInt(p.stock_minimo || p.stockMinimo) || 0;
    
    console.log(`Producto: ${p.nombre}, Stock: ${stock}, Stock Mínimo: ${stockMinimo}, Stock Bajo: ${stock <= stockMinimo * 1.2}`);
    
    return stock <= stockMinimo * 1.2;
  });

  console.log('Productos con stock bajo encontrados:', productosStockBajo.length);

  return (
    <div>
      <h2>Reportes</h2>
      
      {/* Filtros de fecha */}
      <div className="card">
        <h3>Filtrar por fecha</h3>
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

      {/* Resumen de ventas */}
      <div className="card">
        <h3>
          <DollarSign size={20} style={{display: 'inline', marginRight: '0.5rem'}} />
          Resumen de Ventas
        </h3>
        <div className="stats-grid">
          <div className="stat-card">
            <p className="stat-label">Total Ventas</p>
            <p className="stat-value">{ventasFiltradas.length}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Ingresos</p>
            <p className="stat-value">{formatearPrecio(totalVentas)}</p>
          </div>
        </div>
      </div>

      {/* Productos con stock bajo */}
      <div className="card">
        <h3>
          <TrendingDown size={20} style={{display: 'inline', marginRight: '0.5rem', color: '#dc2626'}} />
          Productos con Stock Bajo
        </h3>
        {productosStockBajo.length === 0 ? (
          <p style={{textAlign: 'center', color: '#16a34a', padding: '1rem'}}>
            ✓ Todos los productos tienen stock adecuado
          </p>
        ) : (
          <div>
            {productosStockBajo.map(producto => {
              const stock = parseInt(producto.stock) || 0;
              const stockMinimo = parseInt(producto.stock_minimo || producto.stockMinimo) || 0;
              
              return (
                <div key={producto.id} className={`stock-item ${
                  stock <= stockMinimo ? 'critical' : 'low'
                }`}>
                  <div className="stock-item-info">
                    <h4>{producto.nombre}</h4>
                    <p>{producto.tipo} - {producto.marca}</p>
                  </div>
                  <div className="stock-item-stats">
                    <p className={
                      stock <= stockMinimo ? 'critical' : 'low'
                    }>
                      {stock}/{stockMinimo}
                    </p>
                    <p>
                      {stock === 0 ? 'Agotado' : stock <= stockMinimo ? 'Crítico' : 'Bajo'}
                    </p>
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

export default Reportes;