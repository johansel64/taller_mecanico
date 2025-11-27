// utils/validaciones.js

/**
 * Valida los datos de un producto antes de guardarlo
 * @param {Object} producto - Datos del producto a validar
 * @returns {Array} Array de mensajes de error (vacío si no hay errores)
 */
export const validarProducto = (producto) => {
  const errores = [];
  
  // Validar nombre
  if (!producto.nombre || !producto.nombre.trim()) {
    errores.push('El nombre es obligatorio');
  } else if (producto.nombre.trim().length < 2) {
    errores.push('El nombre debe tener al menos 2 caracteres');
  } else if (producto.nombre.trim().length > 100) {
    errores.push('El nombre no puede exceder 100 caracteres');
  }
  
  // Validar precio
  const precio = parseFloat(producto.precio);
  if (!producto.precio && producto.precio !== 0) {
    errores.push('El precio es obligatorio');
  } else if (isNaN(precio)) {
    errores.push('El precio debe ser un número válido');
  } else if (precio <= 0) {
    errores.push('El precio debe ser mayor a 0');
  } else if (precio > 99999999) {
    errores.push('El precio es demasiado alto');
  }
  
  // Validar stock
  const stock = parseInt(producto.stock);
  if (producto.stock === undefined || producto.stock === null || producto.stock === '') {
    errores.push('El stock es obligatorio');
  } else if (isNaN(stock)) {
    errores.push('El stock debe ser un número válido');
  } else if (stock < 0) {
    errores.push('El stock no puede ser negativo');
  } else if (stock > 999999) {
    errores.push('El stock es demasiado alto');
  }
  
  // Validar stock mínimo
  const stockMinimo = parseInt(producto.stock_minimo || producto.stockMinimo || 0);
  if (isNaN(stockMinimo)) {
    errores.push('El stock mínimo debe ser un número válido');
  } else if (stockMinimo < 0) {
    errores.push('El stock mínimo no puede ser negativo');
  } else if (stockMinimo > stock) {
    errores.push('El stock mínimo no puede ser mayor al stock actual');
  }
  
  // Validar código de barras si existe
  if (producto.codigo_barras && producto.codigo_barras.trim()) {
    const codigoLimpio = producto.codigo_barras.trim();
    if (!/^\d{8,18}$/.test(codigoLimpio)) {
      errores.push('El código de barras debe contener entre 8 y 18 dígitos numéricos');
    }
  }
  
  // Validar tipo (opcional pero si existe debe ser válido)
  if (producto.tipo && typeof producto.tipo === 'string') {
    if (producto.tipo.trim().length > 50) {
      errores.push('El tipo no puede exceder 50 caracteres');
    }
  }
  
  // Validar marca (opcional pero si existe debe ser válida)
  if (producto.marca && typeof producto.marca === 'string') {
    if (producto.marca.trim().length > 50) {
      errores.push('La marca no puede exceder 50 caracteres');
    }
  }
  
  // Validar descripción (opcional)
  if (producto.descripcion && producto.descripcion.trim().length > 500) {
    errores.push('La descripción no puede exceder 500 caracteres');
  }
  
  return errores;
};

/**
 * Valida los datos de una venta
 * @param {number} cantidad - Cantidad a vender
 * @param {number} stockDisponible - Stock disponible del producto
 * @returns {Array} Array de mensajes de error
 */
export const validarVenta = (cantidad, stockDisponible) => {
  const errores = [];
  
  const cant = parseInt(cantidad);
  
  if (!cantidad || isNaN(cant)) {
    errores.push('La cantidad debe ser un número válido');
  } else if (cant <= 0) {
    errores.push('La cantidad debe ser mayor a 0');
  } else if (cant > stockDisponible) {
    errores.push(`Stock insuficiente. Disponible: ${stockDisponible}`);
  }
  
  return errores;
};

/**
 * Valida formato de código de barras
 * @param {string} codigo - Código de barras a validar
 * @returns {Object} { valido: boolean, error: string }
 */
export const validarCodigoBarras = (codigo) => {
  if (!codigo || !codigo.trim()) {
    return { valido: false, error: 'El código de barras no puede estar vacío' };
  }
  
  const codigoLimpio = codigo.trim();
  
  if (!/^\d+$/.test(codigoLimpio)) {
    return { valido: false, error: 'El código de barras solo puede contener números' };
  }
  
  if (codigoLimpio.length < 8 || codigoLimpio.length > 18) {
    return { valido: false, error: 'El código de barras debe tener entre 8 y 18 dígitos' };
  }
  
  return { valido: true, error: null };
};

/**
 * Sanitiza una cadena de texto eliminando caracteres peligrosos
 * @param {string} texto - Texto a sanitizar
 * @returns {string} Texto sanitizado
 */
export const sanitizarTexto = (texto) => {
  if (!texto) return '';
  return texto.trim().replace(/[<>]/g, '');
};

/**
 * Formatea un número a precio en colones
 * @param {number} precio - Precio a formatear
 * @returns {string} Precio formateado
 */
export const formatearPrecio = (precio) => {
  const precioNumerico = parseFloat(precio) || 0;
  
  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    minimumFractionDigits: 0
  }).format(precioNumerico);
};