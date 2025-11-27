
import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Save, X, Package, BarChart3, Scan } from 'lucide-react';
import { config } from '../config/config';
import { useProductos } from '../hooks/useProductos';
import CapacitorBarcodeScanner from './CapacitorBarcodeScanner';
import '../styles/CapacitorBarcodeScanner.css'; // Importar estilos del scanner

const Inventario = ({ 
  mostrarNotificacion,
  formatearPrecio,
  realizarVenta
}) => {
  // Usar el hook actualizado
  const {
    productos,
    loading,
    error,
    agregarProducto,
    actualizarProducto,
    buscarConDeteccion,
    manejarProductoEscaneado,
    generarCodigoBarras,
    verificarCodigoBarras,
    obtenerTipos,
    obtenerMarcas
  } = useProductos();

  const [busqueda, setBusqueda] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);
  const [datosEdicion, setDatosEdicion] = useState({});
  const [loadingAction, setLoadingAction] = useState(false);
  
  // Estados para tipos y marcas
  const [tipos, setTipos] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  
  // Estados para el scanner
  const [mostrarScanner, setMostrarScanner] = useState(false);
  const [tipoEscaneo, setTipoEscaneo] = useState(''); // 'buscar', 'agregar', 'editar'
  
  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: '',
    tipo: '',
    marca: '',
    descripcion: '',
    precio: '',
    stock: '',
    stockMinimo: '',
    codigo_barras: ''
  });

  // Cargar tipos y marcas al montar el componente
  useEffect(() => {
    cargarTiposYMarcas();
  }, []);

  const cargarTiposYMarcas = async () => {
    try {
      setLoadingData(true);
      const [tiposData, marcasData] = await Promise.all([
        obtenerTipos(),
        obtenerMarcas()
      ]);
      setTipos(tiposData || []);
      setMarcas(marcasData || []);
    } catch (error) {
      console.error('Error cargando tipos y marcas:', error);
      mostrarNotificacion('Error cargando datos de tipos y marcas', 'error');
    } finally {
      setLoadingData(false);
    }
  };

  const handleAgregarProducto = async () => {
    if (!nuevoProducto.nombre || !nuevoProducto.precio) {
      mostrarNotificacion('Nombre y precio son obligatorios', 'error');
      return;
    }

    // Verificar código de barras si se proporcionó
    if (nuevoProducto.codigo_barras) {
      const verificacion = await verificarCodigoBarras(nuevoProducto.codigo_barras);
      if (verificacion.existe) {
        mostrarNotificacion(`El código de barras ya existe en: ${verificacion.producto.nombre}`, 'error');
        return;
      }
    }
    
    setLoadingAction(true);
    
    // Si no hay código de barras, generar uno automáticamente
    if (!nuevoProducto.codigo_barras) {
      try {
        const codigoGenerado = await generarCodigoBarras();
        nuevoProducto.codigo_barras = codigoGenerado;
      } catch (error) {
        console.error('Error generando código:', error);
      }
    }
    
    const resultado = await agregarProducto(nuevoProducto);
    
    if (resultado.success) {
      setNuevoProducto({
        nombre: '', tipo: '', marca: '', descripcion: '', precio: '', stock: '', stockMinimo: '', codigo_barras: ''
      });
      setMostrarFormulario(false);
      mostrarNotificacion(config.messages.productoAgregado, 'success');
      cargarTiposYMarcas(); // Recargar por si se creó nuevo tipo/marca
    } else {
      mostrarNotificacion(resultado.error || 'Error agregando producto', 'error');
    }
    setLoadingAction(false);
  };

  const iniciarEdicion = (producto) => {
    setProductoEditando(producto.id);
    setDatosEdicion({ 
      nombre: producto.nombre,
      tipo: producto.tipo,
      marca: producto.marcaInfo?.nombre || producto.marca,
      descripcion: producto.descripcion,
      precio: producto.precio,
      stock: producto.stock,
      stockMinimo: producto.stock_minimo || producto.stockMinimo,
      codigo_barras: producto.codigo_barras || ''
    });
  };

  const cancelarEdicion = () => {
    setProductoEditando(null);
    setDatosEdicion({});
  };

  const handleGuardarEdicion = async () => {
    if (!datosEdicion.nombre || !datosEdicion.precio) {
      mostrarNotificacion('Nombre y precio son obligatorios', 'error');
      return;
    }

    // Verificar código de barras si cambió
    if (datosEdicion.codigo_barras) {
      const productoOriginal = productos.find(p => p.id === productoEditando);
      if (productoOriginal && productoOriginal.codigo_barras !== datosEdicion.codigo_barras) {
        const verificacion = await verificarCodigoBarras(datosEdicion.codigo_barras);
        if (verificacion.existe) {
          mostrarNotificacion(`El código de barras ya existe en: ${verificacion.producto.nombre}`, 'error');
          return;
        }
      }
    }
    
    setLoadingAction(true);
    const resultado = await actualizarProducto(productoEditando, datosEdicion);
    
    if (resultado.success) {
      setProductoEditando(null);
      setDatosEdicion({});
      const mensajeProdEdit = `Producto: ${datosEdicion?.nombre || 'Producto'} actualizado exitosamente`;
      mostrarNotificacion(mensajeProdEdit, 'success', datosEdicion.tipo, datosEdicion.nombre);
      cargarTiposYMarcas(); // Recargar por si se creó nuevo tipo/marca
    } else {
      mostrarNotificacion(resultado.error || 'Error actualizando producto', 'error');
    }
    setLoadingAction(false);
  };

  const handleBusqueda = async (termino) => {
    setBusqueda(termino);
    
    try {
      const resultado = await buscarConDeteccion(termino);
      
      if (resultado.tipo === 'codigo_barras' && resultado.encontrado) {
        mostrarNotificacion(`Producto encontrado por código: ${resultado.resultados[0].nombre}`, 'success');
      } else if (resultado.tipo === 'codigo_barras' && !resultado.encontrado) {
        mostrarNotificacion(`No se encontró producto con código: ${termino}`, 'warning');
      }
    } catch (error) {
      console.error('Error en búsqueda:', error);
    }
  };

  const handleRealizarVenta = async (productoId) => {
    if (realizarVenta) {
      setLoadingAction(true);
      await realizarVenta(productoId, 1);
      setLoadingAction(false);
    } else {
      mostrarNotificacion('Funcionalidad de venta no disponible', 'warning');
    }
  };

  const handleGenerarCodigo = async (tipo) => {
    try {
      setLoadingAction(true);
      const codigo = await generarCodigoBarras();
      
      if (tipo === 'nuevo') {
        setNuevoProducto({ ...nuevoProducto, codigo_barras: codigo });
      } else if (tipo === 'edicion') {
        setDatosEdicion({ ...datosEdicion, codigo_barras: codigo });
      }
      
      mostrarNotificacion(`Código generado: ${codigo}`, 'success');
    } catch (error) {
      mostrarNotificacion('Error generando código', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  // Funciones del scanner
  const abrirScanner = (tipo) => {
    setTipoEscaneo(tipo);
    setMostrarScanner(true);
  };

  const cerrarScanner = () => {
    setMostrarScanner(false);
    setTipoEscaneo('');
  };

  const manejarCodigoEscaneado = async (codigo) => {
    console.log('Código escaneado:', codigo);
    
    if (tipoEscaneo === 'buscar') {
      // Buscar producto existente por código
      setBusqueda(codigo);
      const resultado = await manejarProductoEscaneado(codigo);
      
      if (resultado.encontrado) {
        mostrarNotificacion(resultado.mensaje, 'success');
      } else {
        mostrarNotificacion(resultado.mensaje, 'error');
        // Hacer búsqueda general por si está en descripción/nombre
        await handleBusqueda(codigo);
      }
    } else if (tipoEscaneo === 'agregar') {
      // Verificar si el código ya existe
      const verificacion = await verificarCodigoBarras(codigo);
      if (verificacion.existe) {
        mostrarNotificacion(`Código ya existe en: ${verificacion.producto.nombre}`, 'error');
        return;
      }
      
      setNuevoProducto({ ...nuevoProducto, codigo_barras: codigo });
      mostrarNotificacion(`Código capturado: ${codigo}`, 'success');
    } else if (tipoEscaneo === 'editar') {
      // Verificar si el código ya existe (excluyendo el producto actual)
      const verificacion = await verificarCodigoBarras(codigo);
      if (verificacion.existe && verificacion.producto.id !== productoEditando) {
        mostrarNotificacion(`Código ya existe en: ${verificacion.producto.nombre}`, 'error');
        return;
      }
      
      setDatosEdicion({ ...datosEdicion, codigo_barras: codigo });
      mostrarNotificacion(`Código capturado: ${codigo}`, 'success');
    }
  };

  const getTitulo = () => {
    switch (tipoEscaneo) {
      case 'buscar':
        return 'Buscar Producto por Código';
      case 'agregar':
        return 'Capturar Código para Nuevo Producto';
      case 'editar':
        return 'Capturar Código para Producto';
      default:
        return 'Escanear Código de Barras';
    }
  };

  // Mostrar error del hook si existe
  useEffect(() => {
    if (error) {
      mostrarNotificacion(error, 'error');
    }
  }, [error, mostrarNotificacion]);

  return (
    <div>
      <div className="section-header">
        <h2>Inventario</h2>
        <div className="header-actions">
          <button
            onClick={() => abrirScanner('buscar')}
            className="btn-secondary"
            disabled={loading || loadingAction}
            title="Buscar producto por código de barras"
          >
            <Scan size={20} />
          </button>
          <button
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
            className="btn-primary"
            disabled={loading || loadingAction}
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="search-container">
        <Search className="search-icon" size={20} />
        <input
          type="text"
          placeholder="Buscar productos o escanear código..."
          value={busqueda}
          onChange={(e) => handleBusqueda(e.target.value)}
          className="search-input"
          disabled={loading || loadingAction}
        />
      </div>

      {/* Formulario nuevo producto */}
      {mostrarFormulario && (
        <div className="card">
          <h3>Nuevo Producto</h3>
          <div className="form-grid">
            <input
              type="text"
              placeholder="Nombre del producto"
              value={nuevoProducto.nombre}
              onChange={(e) => setNuevoProducto({...nuevoProducto, nombre: e.target.value})}
              className="input"
              disabled={loadingAction}
            />
            <div className="form-row">
              <div className="input-with-suggestions">
                <input
                  type="text"
                  placeholder="Tipo"
                  value={nuevoProducto.tipo}
                  onChange={(e) => setNuevoProducto({...nuevoProducto, tipo: e.target.value})}
                  className="input"
                  disabled={loadingAction || loadingData}
                  list="tipos-datalist"
                />
                <datalist id="tipos-datalist">
                  {tipos.map((tipo) => (
                    <option key={tipo.id} value={tipo.nombre} />
                  ))}
                </datalist>
              </div>
              <div className="input-with-suggestions">
                <input
                  type="text"
                  placeholder="Marca"
                  value={nuevoProducto.marca}
                  onChange={(e) => setNuevoProducto({...nuevoProducto, marca: e.target.value})}
                  className="input"
                  disabled={loadingAction || loadingData}
                  list="marcas-datalist"
                />
                <datalist id="marcas-datalist">
                  {marcas.map((marca) => (
                    <option key={marca.id} value={marca.nombre} />
                  ))}
                </datalist>
              </div>
            </div>
            <input
              type="text"
              placeholder="Descripción"
              value={nuevoProducto.descripcion}
              onChange={(e) => setNuevoProducto({...nuevoProducto, descripcion: e.target.value})}
              className="input"
              disabled={loadingAction}
            />
            
            {/* Código de barras */}
            <div className="codigo-barras-section">
              <div className="input-with-actions">
                <input
                  type="text"
                  placeholder="Código de barras"
                  value={nuevoProducto.codigo_barras}
                  onChange={(e) => setNuevoProducto({...nuevoProducto, codigo_barras: e.target.value})}
                  className="input"
                  disabled={loadingAction}
                />
                <div className="codigo-actions">
                  <button
                    type="button"
                    onClick={() => handleGenerarCodigo('nuevo')}
                    className="btn-icon"
                    disabled={loadingAction}
                    title="Generar código automáticamente"
                  >
                    <BarChart3 size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => abrirScanner('agregar')}
                    className="btn-icon"
                    disabled={loadingAction}
                    title="Escanear código con cámara"
                  >
                    <Scan size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="form-row three-cols">
              <input
                type="number"
                placeholder="Precio"
                value={nuevoProducto.precio}
                onChange={(e) => setNuevoProducto({...nuevoProducto, precio: e.target.value})}
                className="input"
                disabled={loadingAction}
              />
              <input
                type="number"
                placeholder="Stock"
                value={nuevoProducto.stock}
                onChange={(e) => setNuevoProducto({...nuevoProducto, stock: e.target.value})}
                className="input"
                disabled={loadingAction}
              />
              <input
                type="number"
                placeholder="Stock Mín"
                value={nuevoProducto.stockMinimo}
                onChange={(e) => setNuevoProducto({...nuevoProducto, stockMinimo: e.target.value})}
                className="input"
                disabled={loadingAction}
              />
            </div>
            <div className="form-actions">
              <button 
                onClick={handleAgregarProducto} 
                className="btn-success"
                disabled={loadingAction}
              >
                {loadingAction ? 'Agregando...' : 'Agregar'}
              </button>
              <button 
                onClick={() => setMostrarFormulario(false)} 
                className="btn-secondary"
                disabled={loadingAction}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de productos */}
      <div className="products-list">
        {loading && productos.length === 0 ? (
          <div className="loading-state">
            <Package size={48} />
            <p>Cargando productos...</p>
          </div>
        ) : (
          productos.map(producto => (
            <div key={producto.id} className="product-card">
              {productoEditando === producto.id ? (
                // Formulario de edición
                <div className="form-grid">
                  <input
                    type="text"
                    value={datosEdicion.nombre || ''}
                    onChange={(e) => setDatosEdicion({...datosEdicion, nombre: e.target.value})}
                    className="input"
                    placeholder="Nombre del producto"
                    disabled={loadingAction}
                  />
                  <div className="form-row">
                    <div className="input-with-suggestions">
                      <input
                        type="text"
                        value={datosEdicion.tipo || ''}
                        onChange={(e) => setDatosEdicion({...datosEdicion, tipo: e.target.value})}
                        className="input"
                        placeholder="Tipo"
                        disabled={loadingAction || loadingData}
                        list="tipos-datalist-edit"
                      />
                      <datalist id="tipos-datalist-edit">
                        {tipos.map((tipo) => (
                          <option key={tipo.id} value={tipo.nombre} />
                        ))}
                      </datalist>
                    </div>
                    <div className="input-with-suggestions">
                      <input
                        type="text"
                        value={datosEdicion.marca || ''}
                        onChange={(e) => setDatosEdicion({...datosEdicion, marca: e.target.value})}
                        className="input"
                        placeholder="Marca"
                        disabled={loadingAction || loadingData}
                        list="marcas-datalist-edit"
                      />
                      <datalist id="marcas-datalist-edit">
                        {marcas.map((marca) => (
                          <option key={marca.id} value={marca.nombre} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={datosEdicion.descripcion || ''}
                    onChange={(e) => setDatosEdicion({...datosEdicion, descripcion: e.target.value})}
                    className="input"
                    placeholder="Descripción"
                    disabled={loadingAction}
                  />
                  
                  {/* Código de barras en edición */}
                  <div className="codigo-barras-section">
                    <div className="input-with-actions">
                      <input
                        type="text"
                        value={datosEdicion.codigo_barras || ''}
                        onChange={(e) => setDatosEdicion({...datosEdicion, codigo_barras: e.target.value})}
                        className="input"
                        placeholder="Código de barras"
                        disabled={loadingAction}
                      />
                      <div className="codigo-actions">
                        <button
                          type="button"
                          onClick={() => handleGenerarCodigo('edicion')}
                          className="btn-icon"
                          disabled={loadingAction}
                          title="Generar código automáticamente"
                        >
                          <BarChart3 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => abrirScanner('editar')}
                          className="btn-icon"
                          disabled={loadingAction}
                          title="Escanear código con cámara"
                        >
                          <Scan size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="form-row three-cols">
                    <input
                      type="number"
                      value={datosEdicion.precio || ''}
                      onChange={(e) => setDatosEdicion({...datosEdicion, precio: e.target.value})}
                      className="input"
                      placeholder="Precio"
                      disabled={loadingAction}
                    />
                    <input
                      type="number"
                      value={datosEdicion.stock || ''}
                      onChange={(e) => setDatosEdicion({...datosEdicion, stock: e.target.value})}
                      className="input"
                      placeholder="Stock"
                      disabled={loadingAction}
                    />
                    <input
                      type="number"
                      value={datosEdicion.stockMinimo || ''}
                      onChange={(e) => setDatosEdicion({...datosEdicion, stockMinimo: e.target.value})}
                      className="input"
                      placeholder="Stock Mín"
                      disabled={loadingAction}
                    />
                  </div>
                  <div className="form-actions">
                    <button 
                      onClick={handleGuardarEdicion} 
                      className="btn-success"
                      disabled={loadingAction}
                    >
                      <Save size={16} />
                      {loadingAction ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button 
                      onClick={cancelarEdicion} 
                      className="btn-secondary"
                      disabled={loadingAction}
                    >
                      <X size={16} />
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                // Vista normal del producto
                <>
                  <div className="product-info">
                    <div className="product-details">
                      <h3>{producto.nombre}</h3>
                      <p className="product-meta">
                        {producto.tipo} - {producto.marcaInfo?.nombre || producto.marca}
                      </p>
                      <p className="product-description">{producto.descripcion}</p>
                      {producto.codigo_barras && (
                        <p className="product-barcode">📱 {producto.codigo_barras}</p>
                      )}
                    </div>
                    <div className="product-stats">
                      <p className="price">{formatearPrecio(producto.precio)}</p>
                      <p className={`stock ${
                        producto.stock <= (producto.stock_minimo || producto.stockMinimo)
                          ? 'stock-critical' 
                          : producto.stock <= (producto.stock_minimo || producto.stockMinimo) * 1.2
                          ? 'stock-low'
                          : 'stock-ok'
                      }`}>
                        Stock: {producto.stock}/{producto.stock_minimo || producto.stockMinimo}
                      </p>
                    </div>
                  </div>
                  <div className="product-actions">
                    <button
                      onClick={() => iniciarEdicion(producto)}
                      className="btn-secondary"
                      disabled={loadingAction}
                    >
                      <Edit size={16} />
                      Editar
                    </button>
                    <button
                      onClick={() => handleRealizarVenta(producto.id)}
                      disabled={producto.stock === 0 || loadingAction}
                      className={`btn-primary ${(producto.stock === 0 || loadingAction) ? 'disabled' : ''}`}
                    >
                      {loadingAction ? 'Vendiendo...' : 'Vender'}
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {!loading && productos.length === 0 && (
        <div className="empty-state">
          <Package size={48} />
          <p>No hay productos en el inventario</p>
          {busqueda && (
            <p className="empty-search">
              No se encontraron resultados para: "{busqueda}"
            </p>
          )}
        </div>
      )}

      {/* Scanner de códigos de barras */}
      <CapacitorBarcodeScanner
        isOpen={mostrarScanner}
        onClose={cerrarScanner}
        onScan={manejarCodigoEscaneado}
        title={getTitulo()}
      />
    </div>
  );
};

export default Inventario;