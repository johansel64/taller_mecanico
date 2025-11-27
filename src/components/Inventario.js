// components/Inventario.js - VERSIÓN PROFESIONAL MEJORADA

import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Save, X, Package, Scan, Barcode, ShoppingCart, Trash2, AlertTriangle } from 'lucide-react';
import { config } from '../config/config';
import { useProductos } from '../hooks/useProductos';
import { useDebounce } from '../hooks/useDebounce';
import { validarProducto, sanitizarTexto, validarVenta } from '../utils/validaciones';
import CapacitorBarcodeScanner from './CapacitorBarcodeScanner';
import '../styles/CapacitorBarcodeScanner.css';
import '../styles/inventario-profesional.css'; 

const Inventario = ({ 
  mostrarNotificacion,
  formatearPrecio,
  realizarVenta,
  recargarProductos
}) => {
  const {
    productos,
    loading,
    error,
    cargarProductos,
    agregarProducto,
    actualizarProducto,
    eliminarProducto,
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
  const [tipoEscaneo, setTipoEscaneo] = useState('');
  
  // Estados para modal de venta
  const [mostrarModalVenta, setMostrarModalVenta] = useState(false);
  const [productoParaVender, setProductoParaVender] = useState(null);
  const [cantidadVenta, setCantidadVenta] = useState(1);
  
  // Estado para confirmación de eliminación
  const [confirmarEliminar, setConfirmarEliminar] = useState(null);
  
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

  const busquedaDebounced = useDebounce(busqueda, 300);

  useEffect(() => {
    cargarTiposYMarcas();
  }, []);

  useEffect(() => {
    if (busquedaDebounced !== null) {
      ejecutarBusqueda(busquedaDebounced);
    }
  }, [busquedaDebounced]);

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
  // Validación completa antes de agregar producto
  const handleAgregarProducto = async () => {
    const productoSanitizado = {
      ...nuevoProducto,
      nombre: sanitizarTexto(nuevoProducto.nombre),
      tipo: sanitizarTexto(nuevoProducto.tipo),
      marca: sanitizarTexto(nuevoProducto.marca),
      descripcion: sanitizarTexto(nuevoProducto.descripcion)
    };

    const errores = validarProducto(productoSanitizado);
    
    if (errores.length > 0) {
      mostrarNotificacion(errores.join(', '), 'error');
      return;
    }

    if (productoSanitizado.codigo_barras) {
      const verificacion = await verificarCodigoBarras(productoSanitizado.codigo_barras);
      if (verificacion.existe) {
        mostrarNotificacion(
          `El código de barras ya existe en: ${verificacion.producto.nombre}`, 
          'error'
        );
        return;
      }
    }
    
    setLoadingAction(true);
    try {
      const resultado = await agregarProducto(productoSanitizado);
      
      if (resultado.success) {
        setNuevoProducto({
          nombre: '',
          tipo: '',
          marca: '',
          descripcion: '',
          precio: '',
          stock: '',
          stockMinimo: '',
          codigo_barras: ''
        });
        setMostrarFormulario(false);
        
        mostrarNotificacion(
          `Producto "${productoSanitizado.nombre}" agregado exitosamente`, 
          'success'
        );
        
        cargarTiposYMarcas();
      } else {
        const mensajeError = resultado.error || 'Error desconocido';
        mostrarNotificacion(`No se pudo agregar: ${mensajeError}`, 'error');
      }
    } catch (error) {
      mostrarNotificacion('Error inesperado al agregar el producto', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleActualizarProducto = async () => {
    const datosEdicionSanitizados = {
      ...datosEdicion,
      nombre: sanitizarTexto(datosEdicion.nombre),
      tipo: sanitizarTexto(datosEdicion.tipo),
      marca: sanitizarTexto(datosEdicion.marca),
      descripcion: sanitizarTexto(datosEdicion.descripcion)
    };

    const errores = validarProducto(datosEdicionSanitizados);
    
    if (errores.length > 0) {
      mostrarNotificacion(errores.join(', '), 'error');
      return;
    }

    if (datosEdicionSanitizados.codigo_barras) {
      const productoOriginal = productos.find(p => p.id === productoEditando);
      if (productoOriginal && productoOriginal.codigo_barras !== datosEdicionSanitizados.codigo_barras) {
        const verificacion = await verificarCodigoBarras(datosEdicionSanitizados.codigo_barras);
        if (verificacion.existe && verificacion.producto.id !== productoEditando) {
          mostrarNotificacion(
            `El código de barras ya existe en: ${verificacion.producto.nombre}`, 
            'error'
          );
          return;
        }
      }
    }
    
    setLoadingAction(true);
    try {
      const resultado = await actualizarProducto(productoEditando, datosEdicionSanitizados);
      
      if (resultado.success) {
        setProductoEditando(null);
        setDatosEdicion({});
        mostrarNotificacion(
          `Producto "${datosEdicionSanitizados.nombre}" actualizado exitosamente`, 
          'success'
        );
        cargarTiposYMarcas();
      } else {
        const mensajeError = resultado.error || 'Error desconocido';
        mostrarNotificacion(`No se pudo actualizar: ${mensajeError}`, 'error');
      }
    } catch (error) {
      mostrarNotificacion('Error inesperado al actualizar el producto', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  // Nueva función para abrir modal de venta
  const abrirModalVenta = (producto) => {
    setProductoParaVender(producto);
    setCantidadVenta(1);
    setMostrarModalVenta(true);
  };

  const cerrarModalVenta = () => {
    setMostrarModalVenta(false);
    setProductoParaVender(null);
    setCantidadVenta(1);
  };

const handleRealizarVentaConCantidad = async () => {
  if (!productoParaVender) return;

  const erroresVenta = validarVenta(cantidadVenta, productoParaVender.stock);
  
  if (erroresVenta.length > 0) {
    mostrarNotificacion(erroresVenta.join(', '), 'error');
    return;
  }

  setLoadingAction(true);
  try {
    console.log("Llamando realizarVenta con:", productoParaVender.id, cantidadVenta); // Debug
    
    const resultado = await realizarVenta(productoParaVender.id, cantidadVenta);
    
    console.log("Resultado recibido:", resultado); // Debug
    
    if (resultado && resultado.success) {
      const total = productoParaVender.precio * cantidadVenta;
      
      mostrarNotificacion(
        `Venta realizada: ${cantidadVenta} x ${productoParaVender.nombre} = ${formatearPrecio(total)}`, 
        'success'
      );
      
      cerrarModalVenta();
      
      // La recarga ya se hizo en App.js pero podemos forzar una adicional
      // para estar seguros
      if (recargarProductos) {
        console.log("Recargando productos desde Inventario..."); // Debug
        await recargarProductos();
      }
    } else {
      mostrarNotificacion(resultado?.error || 'Error al realizar la venta', 'error');
    }
  } catch (error) {
    console.error('Error realizando venta:', error);
    mostrarNotificacion('Error al realizar la venta', 'error');
  } finally {
    setLoadingAction(false);
  }
};

  // Nueva función para eliminar producto
  const handleEliminarProducto = async (productoId) => {
    setLoadingAction(true);
    try {
      const resultado = await eliminarProducto(productoId);
      
      if (resultado.success) {
        mostrarNotificacion('Producto eliminado exitosamente', 'success');
        setConfirmarEliminar(null);
      } else {
        mostrarNotificacion(resultado.error || 'Error al eliminar producto', 'error');
      }
    } catch (error) {
      console.error('Error eliminando producto:', error);
      mostrarNotificacion('Error al eliminar el producto', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  const ejecutarBusqueda = async (termino) => {
    try {
      const resultado = await buscarConDeteccion(termino);
      
      if (resultado.tipo === 'codigo_barras' && resultado.encontrado) {
        mostrarNotificacion(
          `Producto encontrado: ${resultado.resultados[0].nombre}`, 
          'success'
        );
      } else if (resultado.tipo === 'codigo_barras' && !resultado.encontrado) {
        mostrarNotificacion(`No se encontró producto con código: ${termino}`, 'warning');
      }
    } catch (error) {
      console.error('Error en búsqueda:', error);
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
      mostrarNotificacion('Error generando código de barras', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  const abrirScanner = (tipo) => {
    setTipoEscaneo(tipo);
    setMostrarScanner(true);
  };

  const cerrarScanner = () => {
    setMostrarScanner(false);
    setTipoEscaneo('');
  };

  const manejarCodigoEscaneado = async (codigo) => {
    if (tipoEscaneo === 'buscar') {
      setBusqueda(codigo);
      const resultado = await manejarProductoEscaneado(codigo);
      
      if (resultado.encontrado) {
        mostrarNotificacion(resultado.mensaje, 'success');
      } else {
        mostrarNotificacion(resultado.mensaje, 'error');
        await ejecutarBusqueda(codigo);
      }
    } else if (tipoEscaneo === 'agregar') {
      const verificacion = await verificarCodigoBarras(codigo);
      if (verificacion.existe) {
        mostrarNotificacion(`Código ya existe en: ${verificacion.producto.nombre}`, 'error');
        return;
      }
      
      setNuevoProducto({ ...nuevoProducto, codigo_barras: codigo });
      mostrarNotificacion(`Código capturado: ${codigo}`, 'success');
    } else if (tipoEscaneo === 'editar') {
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

  useEffect(() => {
    if (error) {
      mostrarNotificacion(error, 'error');
    }
  }, [error, mostrarNotificacion]);

  return (
    <div className="inventario-container">
      {/* Header */}
      <div className="section-header">
        <div className="header-title">
          <Package size={28} />
          <h2>Inventario</h2>
          <span className="productos-count">{productos.length} productos</span>
        </div>
        <div className="header-actions">
          <button
            onClick={() => abrirScanner('buscar')}
            className="btn-icon-header"
            disabled={loading || loadingAction}
            title="Buscar por código de barras"
          >
            <Scan size={20} />
          </button>
          <button
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
            className="btn-primary"
            disabled={loading || loadingAction}
          >
            <Plus size={20} />
            <span>Agregar Producto</span>
          </button>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="search-container-pro">
        <Search className="search-icon" size={20} />
        <input
          type="text"
          placeholder="Buscar por nombre, tipo, marca o código de barras..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="search-input-pro"
          disabled={loading || loadingAction}
        />
        {busqueda && busqueda !== busquedaDebounced && (
          <span className="search-indicator">Buscando...</span>
        )}
        {busqueda && (
          <button 
            className="btn-clear-search"
            onClick={() => setBusqueda('')}
            title="Limpiar búsqueda"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Formulario nuevo producto */}
      {mostrarFormulario && (
        <div className="card-form">
          <div className="card-form-header">
            <h3>
              <Plus size={20} />
              Nuevo Producto
            </h3>
            <button 
              onClick={() => setMostrarFormulario(false)}
              className="btn-close"
              disabled={loadingAction}
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="form-grid-pro">
            <div className="form-group">
              <label>Nombre del producto *</label>
              <input
                type="text"
                placeholder="Ej: Aceite Castrol 20W-50"
                value={nuevoProducto.nombre}
                onChange={(e) => setNuevoProducto({...nuevoProducto, nombre: e.target.value})}
                className="input-pro"
                disabled={loadingAction}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Tipo</label>
              <input
                type="text"
                list="tipos-list"
                placeholder="Ej: Aceite, Llanta, Filtro"
                value={nuevoProducto.tipo}
                onChange={(e) => setNuevoProducto({...nuevoProducto, tipo: e.target.value})}
                className="input-pro"
                disabled={loadingAction}
              />
              <datalist id="tipos-list">
                {tipos.map(tipo => (
                  <option key={tipo.id} value={tipo.nombre} />
                ))}
              </datalist>
            </div>

            <div className="form-group">
              <label>Marca</label>
              <input
                type="text"
                list="marcas-list"
                placeholder="Ej: Michelin, Bosch, Castrol"
                value={nuevoProducto.marca}
                onChange={(e) => setNuevoProducto({...nuevoProducto, marca: e.target.value})}
                className="input-pro"
                disabled={loadingAction}
              />
              <datalist id="marcas-list">
                {marcas.map(marca => (
                  <option key={marca.id} value={marca.nombre} />
                ))}
              </datalist>
            </div>

            <div className="form-group form-group-full">
              <label>Descripción</label>
              <textarea
                placeholder="Descripción detallada del producto (opcional)"
                value={nuevoProducto.descripcion}
                onChange={(e) => setNuevoProducto({...nuevoProducto, descripcion: e.target.value})}
                className="input-pro textarea-pro"
                rows="3"
                disabled={loadingAction}
              />
            </div>
            
            <div className="form-group">
              <label>Precio (₡) *</label>
              <input
                type="number"
                placeholder="0"
                value={nuevoProducto.precio}
                onChange={(e) => setNuevoProducto({...nuevoProducto, precio: e.target.value})}
                className="input-pro"
                disabled={loadingAction}
                min="0"
                step="1"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Stock inicial *</label>
              <input
                type="number"
                placeholder="0"
                value={nuevoProducto.stock}
                onChange={(e) => setNuevoProducto({...nuevoProducto, stock: e.target.value})}
                className="input-pro"
                disabled={loadingAction}
                min="0"
                step="1"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Stock mínimo</label>
              <input
                type="number"
                placeholder="5"
                value={nuevoProducto.stockMinimo}
                onChange={(e) => setNuevoProducto({...nuevoProducto, stockMinimo: e.target.value})}
                className="input-pro"
                disabled={loadingAction}
                min="0"
                step="1"
              />
            </div>

            <div className="form-group form-group-full">
              <label>Código de barras</label>
              <div className="codigo-barras-container-pro">
                <input
                  type="text"
                  placeholder="8-18 dígitos (opcional)"
                  value={nuevoProducto.codigo_barras}
                  onChange={(e) => setNuevoProducto({...nuevoProducto, codigo_barras: e.target.value})}
                  className="input-pro"
                  disabled={loadingAction}
                  pattern="\d{8,18}"
                />
                <button
                  type="button"
                  onClick={() => abrirScanner('agregar')}
                  className="btn-secondary-icon"
                  disabled={loadingAction}
                  title="Escanear código"
                >
                  <Scan size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerarCodigo('nuevo')}
                  className="btn-secondary-icon"
                  disabled={loadingAction}
                  title="Generar código"
                >
                  <Barcode size={18} />
                </button>
              </div>
            </div>
          </div>
          
          <div className="form-actions">
            <button
              onClick={handleAgregarProducto}
              className="btn-primary btn-large"
              disabled={loadingAction}
            >
              {loadingAction ? 'Guardando...' : 'Guardar Producto'}
            </button>
            <button
              onClick={() => {
                setMostrarFormulario(false);
                setNuevoProducto({
                  nombre: '',
                  tipo: '',
                  marca: '',
                  descripcion: '',
                  precio: '',
                  stock: '',
                  stockMinimo: '',
                  codigo_barras: ''
                });
              }}
              className="btn-secondary btn-large"
              disabled={loadingAction}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de productos */}
      <div className="productos-grid">
        {loading && productos.length === 0 ? (
          <div className="loading-state-pro">
            <div className="spinner-pro"></div>
            <p>Cargando productos...</p>
          </div>
        ) : productos.length === 0 ? (
          <div className="empty-state-pro">
            <Package size={64} />
            <h3>No hay productos</h3>
            <p>Comienza agregando tu primer producto al inventario</p>
            {busqueda && (
              <p className="empty-search-pro">
                No se encontraron resultados para: <strong>"{busqueda}"</strong>
              </p>
            )}
            <button 
              onClick={() => setMostrarFormulario(true)}
              className="btn-primary"
            >
              <Plus size={20} />
              Agregar Primer Producto
            </button>
          </div>
        ) : (
          productos.map(producto => (
            <div key={producto.id} className="producto-card-pro">
              {productoEditando === producto.id ? (
                /* Modo Edición */
                <div className="producto-edit-mode">
                  <div className="form-grid-pro">
                    <div className="form-group">
                      <label>Nombre *</label>
                      <input
                        type="text"
                        value={datosEdicion.nombre}
                        onChange={(e) => setDatosEdicion({...datosEdicion, nombre: e.target.value})}
                        className="input-pro"
                        disabled={loadingAction}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Tipo</label>
                      <input
                        type="text"
                        list="tipos-list-edit"
                        value={datosEdicion.tipo}
                        onChange={(e) => setDatosEdicion({...datosEdicion, tipo: e.target.value})}
                        className="input-pro"
                        disabled={loadingAction}
                      />
                      <datalist id="tipos-list-edit">
                        {tipos.map(tipo => (
                          <option key={tipo.id} value={tipo.nombre} />
                        ))}
                      </datalist>
                    </div>

                    <div className="form-group">
                      <label>Marca</label>
                      <input
                        type="text"
                        list="marcas-list-edit"
                        value={datosEdicion.marca}
                        onChange={(e) => setDatosEdicion({...datosEdicion, marca: e.target.value})}
                        className="input-pro"
                        disabled={loadingAction}
                      />
                      <datalist id="marcas-list-edit">
                        {marcas.map(marca => (
                          <option key={marca.id} value={marca.nombre} />
                        ))}
                      </datalist>
                    </div>

                    <div className="form-group form-group-full">
                      <label>Descripción</label>
                      <textarea
                        value={datosEdicion.descripcion}
                        onChange={(e) => setDatosEdicion({...datosEdicion, descripcion: e.target.value})}
                        className="input-pro textarea-pro"
                        rows="2"
                        disabled={loadingAction}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Precio (₡) *</label>
                      <input
                        type="number"
                        value={datosEdicion.precio}
                        onChange={(e) => setDatosEdicion({...datosEdicion, precio: e.target.value})}
                        className="input-pro"
                        disabled={loadingAction}
                        min="0"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Stock *</label>
                      <input
                        type="number"
                        value={datosEdicion.stock}
                        onChange={(e) => setDatosEdicion({...datosEdicion, stock: e.target.value})}
                        className="input-pro"
                        disabled={loadingAction}
                        min="0"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Stock mínimo</label>
                      <input
                        type="number"
                        value={datosEdicion.stock_minimo}
                        onChange={(e) => setDatosEdicion({...datosEdicion, stock_minimo: e.target.value})}
                        className="input-pro"
                        disabled={loadingAction}
                        min="0"
                      />
                    </div>

                    <div className="form-group form-group-full">
                      <label>Código de barras</label>
                      <div className="codigo-barras-container-pro">
                        <input
                          type="text"
                          value={datosEdicion.codigo_barras || ''}
                          onChange={(e) => setDatosEdicion({...datosEdicion, codigo_barras: e.target.value})}
                          className="input-pro"
                          disabled={loadingAction}
                        />
                        <button
                          type="button"
                          onClick={() => abrirScanner('editar')}
                          className="btn-secondary-icon"
                          disabled={loadingAction}
                        >
                          <Scan size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGenerarCodigo('edicion')}
                          className="btn-secondary-icon"
                          disabled={loadingAction}
                        >
                          <Barcode size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="form-actions">
                    <button
                      onClick={handleActualizarProducto}
                      className="btn-success"
                      disabled={loadingAction}
                    >
                      <Save size={16} />
                      {loadingAction ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button
                      onClick={() => {
                        setProductoEditando(null);
                        setDatosEdicion({});
                      }}
                      className="btn-secondary"
                      disabled={loadingAction}
                    >
                      <X size={16} />
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                /* Modo Vista Normal */
                <>
                  <div className="producto-card-header">
                    <div className="producto-badge-container">
                      {producto.tipo && (
                        <span className="producto-badge tipo">{producto.tipo}</span>
                      )}
                      {parseInt(producto.stock) <= parseInt(producto.stock_minimo || producto.stockMinimo) && (
                        <span className="producto-badge stock-bajo">Stock Bajo</span>
                      )}
                    </div>
                    <button
                      onClick={() => setConfirmarEliminar(producto.id)}
                      className="btn-delete-icon"
                      disabled={loadingAction}
                      title="Eliminar producto"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="producto-card-body">
                    <h3 className="producto-nombre">{producto.nombre}</h3>
                    
                    {producto.marca && (
                      <p className="producto-marca">
                        <strong>Marca:</strong> {producto.marca}
                      </p>
                    )}
                    
                    {producto.descripcion && (
                      <p className="producto-descripcion">{producto.descripcion}</p>
                    )}
                    
                    {producto.codigo_barras && (
                      <div className="producto-codigo-display">
                        <Barcode size={14} />
                        <span>{producto.codigo_barras}</span>
                      </div>
                    )}

                    <div className="producto-stats-grid">
                      <div className="stat-item">
                        <span className="stat-label">Precio</span>
                        <span className="stat-value precio">{formatearPrecio(producto.precio)}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Stock</span>
                        <span className={`stat-value ${parseInt(producto.stock) <= parseInt(producto.stock_minimo || producto.stockMinimo) ? 'stock-bajo' : 'stock-ok'}`}>
                          {producto.stock}
                        </span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Mínimo</span>
                        <span className="stat-value">{producto.stock_minimo || producto.stockMinimo}</span>
                      </div>
                    </div>
                  </div>

                  <div className="producto-card-actions">
                    <button
                      onClick={() => {
                        setProductoEditando(producto.id);
                        setDatosEdicion({
                          nombre: producto.nombre,
                          tipo: producto.tipo || '',
                          marca: producto.marca || '',
                          descripcion: producto.descripcion || '',
                          precio: producto.precio,
                          stock: producto.stock,
                          stock_minimo: producto.stock_minimo || producto.stockMinimo,
                          codigo_barras: producto.codigo_barras || ''
                        });
                      }}
                      className="btn-secondary"
                      disabled={loadingAction}
                    >
                      <Edit size={16} />
                      Editar
                    </button>
                    <button
                      onClick={() => abrirModalVenta(producto)}
                      className="btn-success"
                      disabled={loadingAction || parseInt(producto.stock) === 0}
                    >
                      <ShoppingCart size={16} />
                      Vender
                    </button>
                  </div>
                </>
              )}

              {/* Modal de confirmación de eliminación */}
              {confirmarEliminar === producto.id && (
                <div className="modal-overlay" onClick={() => setConfirmarEliminar(null)}>
                  <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header danger">
                      <AlertTriangle size={24} />
                      <h3>Confirmar Eliminación</h3>
                    </div>
                    <div className="modal-body">
                      <p>¿Estás seguro de que deseas eliminar este producto?</p>
                      <div className="producto-info-eliminar">
                        <strong>{producto.nombre}</strong>
                        {producto.tipo && <span>Tipo: {producto.tipo}</span>}
                        {producto.marca && <span>Marca: {producto.marca}</span>}
                      </div>
                      <p className="warning-text">Esta acción no se puede deshacer.</p>
                    </div>
                    <div className="modal-actions">
                      <button
                        onClick={() => handleEliminarProducto(producto.id)}
                        className="btn-danger"
                        disabled={loadingAction}
                      >
                        <Trash2 size={16} />
                        {loadingAction ? 'Eliminando...' : 'Sí, Eliminar'}
                      </button>
                      <button
                        onClick={() => setConfirmarEliminar(null)}
                        className="btn-secondary"
                        disabled={loadingAction}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal de Venta con Cantidad */}
      {mostrarModalVenta && productoParaVender && (
        <div className="modal-overlay" onClick={cerrarModalVenta}>
          <div className="modal-content modal-venta" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <ShoppingCart size={24} />
              <h3>Realizar Venta</h3>
              <button onClick={cerrarModalVenta} className="btn-close-modal">
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="venta-producto-info">
                <h4>{productoParaVender.nombre}</h4>
                <div className="venta-detalles">
                  {productoParaVender.tipo && (
                    <span className="detalle-item">
                      <strong>Tipo:</strong> {productoParaVender.tipo}
                    </span>
                  )}
                  {productoParaVender.marca && (
                    <span className="detalle-item">
                      <strong>Marca:</strong> {productoParaVender.marca}
                    </span>
                  )}
                  <span className="detalle-item">
                    <strong>Precio unitario:</strong> {formatearPrecio(productoParaVender.precio)}
                  </span>
                  <span className="detalle-item">
                    <strong>Stock disponible:</strong> {productoParaVender.stock} unidades
                  </span>
                </div>
              </div>

              <div className="venta-cantidad-selector">
                <label>Cantidad a vender</label>
                <div className="cantidad-controls">
                  <button
                    onClick={() => setCantidadVenta(Math.max(1, cantidadVenta - 1))}
                    className="btn-cantidad"
                    disabled={cantidadVenta <= 1 || loadingAction}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={cantidadVenta}
                    onChange={(e) => {
                      const valor = parseInt(e.target.value) || 1;
                      setCantidadVenta(Math.max(1, Math.min(productoParaVender.stock, valor)));
                    }}
                    className="input-cantidad"
                    min="1"
                    max={productoParaVender.stock}
                    disabled={loadingAction}
                  />
                  <button
                    onClick={() => setCantidadVenta(Math.min(productoParaVender.stock, cantidadVenta + 1))}
                    className="btn-cantidad"
                    disabled={cantidadVenta >= productoParaVender.stock || loadingAction}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="venta-resumen">
                <div className="resumen-row">
                  <span>Precio unitario:</span>
                  <span>{formatearPrecio(productoParaVender.precio)}</span>
                </div>
                <div className="resumen-row">
                  <span>Cantidad:</span>
                  <span>{cantidadVenta}</span>
                </div>
                <div className="resumen-row resumen-total">
                  <span>Total:</span>
                  <span className="total-amount">
                    {formatearPrecio(productoParaVender.precio * cantidadVenta)}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button
                onClick={handleRealizarVentaConCantidad}
                className="btn-success btn-large"
                disabled={loadingAction || cantidadVenta < 1 || cantidadVenta > productoParaVender.stock}
              >
                <ShoppingCart size={18} />
                {loadingAction ? 'Procesando...' : 'Confirmar Venta'}
              </button>
              <button
                onClick={cerrarModalVenta}
                className="btn-secondary btn-large"
                disabled={loadingAction}
              >
                Cancelar
              </button>
            </div>
          </div>
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