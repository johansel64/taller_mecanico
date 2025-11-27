import { supabase } from '../config/supabase';

export const productosService = {
  // Obtener todos los tipos
  async obtenerTipos() {
    try {
      const { data, error } = await supabase
        .from('tipos')
        .select('*')
        .order('nombre');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo tipos:', error);
      throw error;
    }
  },

  // Obtener todas las marcas
  async obtenerMarcas() {
    try {
      const { data, error } = await supabase
        .from('marcas')
        .select('*')
        .eq('activo', true)
        .order('nombre');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo marcas:', error);
      return [];
    }
  },

  // Crear nuevo tipo si no existe
  async crearTipoSiNoExiste(nombreTipo) {
    try {
      const { data: tipoExistente, error: errorBuscar } = await supabase
        .from('tipos')
        .select('id, nombre, stock_minimo_default')
        .ilike('nombre', nombreTipo)
        .single();

      if (errorBuscar && errorBuscar.code !== 'PGRST116') {
        throw errorBuscar;
      }

      if (tipoExistente) {
        return tipoExistente;
      }

      const { data: nuevoTipo, error: errorCrear } = await supabase
        .from('tipos')
        .insert({ 
          nombre: nombreTipo,
          stock_minimo_default: 5
        })
        .select('id, nombre, stock_minimo_default')
        .single();

      if (errorCrear) throw errorCrear;
      return nuevoTipo;
    } catch (error) {
      console.error('Error creando tipo:', error);
      throw error;
    }
  },

  // Crear nueva marca si no existe
  async crearMarcaSiNoExiste(nombreMarca) {
    try {
      const { data: marcaExistente, error: errorBuscar } = await supabase
        .from('marcas')
        .select('id, nombre')
        .ilike('nombre', nombreMarca)
        .single();

      if (errorBuscar && errorBuscar.code !== 'PGRST116') {
        throw errorBuscar;
      }

      if (marcaExistente) {
        return marcaExistente;
      }

      const { data: nuevaMarca, error: errorCrear } = await supabase
        .from('marcas')
        .insert({ 
          nombre: nombreMarca,
          descripcion: 'Creada automáticamente'
        })
        .select('id, nombre')
        .single();

      if (errorCrear) throw errorCrear;
      return nuevaMarca;
    } catch (error) {
      console.error('Error creando marca:', error);
      return null;
    }
  },

  // Obtener todos los productos activos
  async obtenerProductos() {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select(`
          *,
          tipos(id, nombre, stock_minimo_default),
          marcas(id, nombre)
        `)
        .eq('activo', true)
        .order('nombre');

      if (error) throw error;
      
      return (data || []).map(producto => ({
        ...producto,
        tipo: producto.tipos?.nombre || 'Sin tipo',
        tipoInfo: producto.tipos,
        marcaInfo: producto.marcas
      }));
    } catch (error) {
      console.error('Error obteniendo productos:', error);
      throw error;
    }
  },

  // Buscar productos
  async buscarProductos(termino) {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select(`
          *,
          tipos(nombre),
          marcas(nombre)
        `)
        .eq('activo', true)
        .or(`nombre.ilike.%${termino}%,descripcion.ilike.%${termino}%,codigo_barras.eq.${termino}`)
        .order('nombre');

      if (error) throw error;
      
      return (data || []).map(producto => ({
        ...producto,
        tipo: producto.tipos?.nombre || 'Sin tipo',
        marcaInfo: producto.marcas
      }));
    } catch (error) {
      console.error('Error buscando productos:', error);
      throw error;
    }
  },

  // Buscar producto por código de barras
  async buscarPorCodigoBarras(codigoBarras) {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select(`
          *,
          tipos(nombre),
          marcas(nombre)
        `)
        .eq('codigo_barras', codigoBarras)
        .eq('activo', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Producto no encontrado');
        }
        throw error;
      }
      
      return {
        ...data,
        tipo: data.tipos?.nombre || 'Sin tipo',
        marcaInfo: data.marcas
      };
    } catch (error) {
      console.error('Error buscando por código de barras:', error);
      throw error;
    }
  },

  // Verificar si un código de barras ya existe
  async verificarCodigoBarras(codigo) {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('id, nombre')
        .eq('codigo_barras', codigo)
        .eq('activo', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error verificando código de barras:', error);
      return null;
    }
  },

  // Generar código de barras único
  async generarCodigoBarras() {
    let codigoUnico = false;
    let codigo = '';

    while (!codigoUnico) {
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
      codigo = '7' + timestamp + random;

      const { data } = await supabase
        .from('productos')
        .select('id')
        .eq('codigo_barras', codigo)
        .single();

      if (!data) {
        codigoUnico = true;
      }
    }

    return codigo;
  },

  // Crear nuevo producto
  async crearProducto(producto) {
    try {
      let tipoInfo = null;
      let marcaInfo = null;

      // Manejar tipo
      if (producto.tipo && typeof producto.tipo === 'string') {
        tipoInfo = await this.crearTipoSiNoExiste(producto.tipo);
      }

      // Manejar marca
      if (producto.marca && typeof producto.marca === 'string') {
        marcaInfo = await this.crearMarcaSiNoExiste(producto.marca);
      }

      // Generar código de barras si no se proporciona
      let codigoBarras = producto.codigo_barras;
      if (!codigoBarras) {
        codigoBarras = await this.generarCodigoBarras();
      }

      const stockMinimo = producto.stock_minimo || producto.stockMinimo || tipoInfo?.stock_minimo_default || 5;

      const insertData = {
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        precio: parseFloat(producto.precio),
        stock: parseInt(producto.stock) || 0,
        stock_minimo: parseInt(stockMinimo),
        codigo_barras: codigoBarras
      };

      // Agregar relaciones solo si existen
      if (tipoInfo) {
        insertData.tipo_id = tipoInfo.id;
      }

      if (marcaInfo) {
        insertData.marca_id = marcaInfo.id;
      }

      const { data, error } = await supabase
        .from('productos')
        .insert(insertData)
        .select(`
          *,
          tipos(id, nombre, stock_minimo_default),
          marcas(id, nombre)
        `)
        .single();

      if (error) throw error;
      
      return {
        ...data,
        tipo: data.tipos?.nombre || 'Sin tipo',
        tipoInfo: data.tipos,
        marcaInfo: data.marcas
      };
    } catch (error) {
      console.error('Error creando producto:', error);
      throw error;
    }
  },

  // Actualizar producto existente
  async actualizarProducto(id, producto) {
    try {
      let tipoInfo = null;
      let marcaInfo = null;

      // Manejar tipo
      if (producto.tipo && typeof producto.tipo === 'string') {
        tipoInfo = await this.crearTipoSiNoExiste(producto.tipo);
      }

      // Manejar marca
      if (producto.marca && typeof producto.marca === 'string') {
        marcaInfo = await this.crearMarcaSiNoExiste(producto.marca);
      }

      const updateData = {
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        precio: parseFloat(producto.precio),
        stock: parseInt(producto.stock),
        stock_minimo: parseInt(producto.stock_minimo || producto.stockMinimo)
      };

      // Solo actualizar si se proporcionan nuevos valores
      if (tipoInfo) {
        updateData.tipo_id = tipoInfo.id;
      }

      if (marcaInfo) {
        updateData.marca_id = marcaInfo.id;
      }

      if (producto.codigo_barras !== undefined) {
        updateData.codigo_barras = producto.codigo_barras;
      }

      const { data, error } = await supabase
        .from('productos')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          tipos(id, nombre, stock_minimo_default),
          marcas(id, nombre)
        `)
        .single();

      if (error) throw error;
      
      return {
        ...data,
        tipo: data.tipos?.nombre || 'Sin tipo',
        tipoInfo: data.tipos,
        marcaInfo: data.marcas
      };
    } catch (error) {
      console.error('Error actualizando producto:', error);
      throw error;
    }
  },

  async eliminarProducto(id) {
    try {
      const { data, error } = await supabase
        .from('productos')
        .update({ activo: false })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error eliminando producto:', error);
      throw error;
    }
  },

  async actualizarStock(id, nuevoStock) {
    try {
      const { data, error } = await supabase
        .from('productos')
        .update({ stock: nuevoStock })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error actualizando stock:', error);
      throw error;
    }
  },

  async obtenerProductosStockBajo() {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select(`
          *,
          tipos(nombre),
          marcas(nombre)
        `)
        .eq('activo', true)
        .filter('stock', 'lte', supabase.raw('stock_minimo * 1.2'))
        .order('stock');

      if (error) throw error;
      
      return (data || []).map(producto => ({
        ...producto,
        tipo: producto.tipos?.nombre || 'Sin tipo',
        marcaInfo: producto.marcas
      }));
    } catch (error) {
      console.error('Error obteniendo productos con stock bajo:', error);
      throw error;
    }
  },

  suscribirCambios(callback) {
    const subscription = supabase
      .channel('productos-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'productos' 
        }, 
        callback
      )
      .subscribe();

    return subscription;
  }
};