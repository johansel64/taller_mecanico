import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import Navigation from "./components/Navigation";
import Inventario from "./components/Inventario";
import Ventas from "./components/Ventas";
import Reportes from "./components/Reportes";
import Respaldos from "./components/Respaldos";
import Notificaciones from "./components/Notificaciones";
import MigrationModal from "./components/MigrationModal";
import { useProductos } from "./hooks/useProductos";
import { useVentas } from "./hooks/useVentas";
import { useNotificaciones } from "./hooks/useNotificaciones";
import { config } from "./config/config";
import { productosService } from "./services/productosService";
import { ventasService } from "./services/ventasService";
import { notificacionesService } from "./services/notificacionesService";
import { supabase } from "./config/supabase";
import "./styles/App.css";

const TallerMecanicoApp = () => {
  const [activeTab, setActiveTab] = useState("inventario");
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
    obtenerProductosStockBajo,
  } = useProductos();

  const {
    ventas: todasLasVentas,
    loading: loadingVentas,
    error: errorVentas,
    realizarVenta: realizarVentaService,
    obtenerEstadisticas,
    obtenerVentasUltimaSemana,
  } = useVentas();

  // Hook de notificaciones persistentes
  const {
    notificaciones,
    loading: loadingNotificaciones,
    noLeidas,
    crearNotificacion,
    marcarComoLeida,
    marcarTodasComoLeidas,
    filtrarPorTipo,
  } = useNotificaciones();

  // Verificar stock bajo al cargar productos
  useEffect(() => {
    if (productos.length > 0) {
      verificarStockBajo();
    }
  }, [productos]);

  const verificarStockBajo = async () => {
    try {
      const productosStockBajo = productos.filter((p) => {
        const stock = parseInt(p.stock) || 0;
        const stockMinimo = parseInt(p.stock_minimo || p.stockMinimo) || 0;
        return stock <= stockMinimo;
      });

      // Crear notificaciones en Supabase para productos con stock bajo
      // Solo crear si no existen notificaciones recientes del mismo producto
      for (const producto of productosStockBajo) {
        const stock = parseInt(producto.stock) || 0;
        const stockMinimo =
          parseInt(producto.stock_minimo || producto.stockMinimo) || 0;

        // Verificar si ya existe una notificación reciente para este producto
        const notificacionExistente = notificaciones.find(
          (n) =>
            n.producto_nombre === producto.nombre &&
            ["minimo", "bajo", "critico"].includes(n.tipo) &&
            new Date(n.created_at) > new Date(Date.now() - 60 * 60 * 1000) // última hora
        );

        if (!notificacionExistente) {
          const tipo =
            stock === 0 ? "critico" : stock <= stockMinimo ? "minimo" : "bajo";
          const mensaje = `${producto.nombre} - Stock: ${stock}/${stockMinimo}`;

          await crearNotificacion(mensaje, tipo, producto.nombre);
        }
      }
    } catch (error) {
      console.error("Error verificando stock bajo:", error);
    }
  };

const realizarVenta = async (productoId, cantidad = 1) => {
  try {
    console.log("Iniciando venta:", { productoId, cantidad }); // Debug

    const resultado = await realizarVentaService(productoId, cantidad);
    console.log("Resultado de venta:", resultado); // Debug

    // Verificar si la venta fue exitosa
    if (resultado && resultado.success && resultado.data) {
      // PRIMERO: Recargar productos desde la base de datos
      await cargarProductos();
      
      // Crear notificación de venta exitosa
      const producto = productos.find((p) => p.id === productoId);
      const mensajeVenta = `Venta: ${cantidad}x ${
        producto?.nombre || "Producto"
      }`;
      await crearNotificacion(mensajeVenta, "success", producto?.nombre);

      // Retornar success: true para que Inventario.js lo detecte
      return { 
        success: true, 
        venta: resultado.data,
        productoActualizado: resultado.productoActualizado 
      };
    } else {
      // Venta falló
      const errorMsg = resultado?.error || config.messages.errorVenta;
      await crearNotificacion(errorMsg, "error");
      return { success: false, error: errorMsg };
    }
  } catch (error) {
    console.error("Error realizando venta:", error);
    await crearNotificacion(config.messages.errorVenta, "error");
    return { success: false, error: error.message };
  }
};

  // Función legacy para compatibilidad con componentes que aún la usan
  const mostrarNotificacion = async (mensaje, tipo, productoNombre = null) => {
    console.log("Creando notificación:", { mensaje, tipo, productoNombre }); // Debug
    await crearNotificacion(mensaje, tipo, productoNombre);
  };

  const formatearPrecio = (precio) => {
    // Asegurar que el precio sea un número válido
    const precioNumerico = parseFloat(precio) || 0;

    return new Intl.NumberFormat(config.currency.locale, {
      style: "currency",
      currency: config.currency.currency,
      minimumFractionDigits: 0,
    }).format(precioNumerico);
  };

  const exportarDatos = async () => {
    try {
      await mostrarNotificacion("Preparando respaldo...", "info");

      const datos = {
        productos: productos.map((p) => ({
          id: p.id,
          nombre: p.nombre,
          tipo: p.tipo,
          marca: p.marca,
          descripcion: p.descripcion,
          precio: p.precio,
          stock: p.stock,
          stockMinimo: p.stock_minimo || p.stockMinimo,
          codigo_barras: p.codigo_barras,
          created_at: p.created_at,
        })),
        ventas: todasLasVentas.map((v) => ({
          id: v.id,
          nombreProducto: v.nombre_producto,
          cantidad: v.cantidad,
          precioUnitario: v.precio_unitario,
          total: v.total,
          fecha: v.fecha,
        })),
        notificaciones: notificaciones.map((n) => ({
          id: n.id,
          mensaje: n.mensaje,
          tipo: n.tipo,
          producto_nombre: n.producto_nombre,
          leida: n.leida,
          created_at: n.created_at,
        })),
        fechaRespaldo: new Date().toISOString(),
        version: "2.2",
        nombreNegocio: config.appName,
        origen: "supabase",
        metadata: {
          totalProductos: productos.length,
          totalVentas: todasLasVentas.length,
          totalNotificaciones: notificaciones.length,
        },
      };

      const dataStr = JSON.stringify(datos, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const fecha = new Date().toISOString().split("T")[0];
      const hora = new Date().toTimeString().split(" ")[0].replace(/:/g, "-");
      const exportFileDefaultName = `respaldo_${config.appName}_${fecha}_${hora}.json`;

      const linkElement = document.createElement("a");
      linkElement.href = url;
      linkElement.download = exportFileDefaultName;
      document.body.appendChild(linkElement);
      linkElement.click();
      document.body.removeChild(linkElement);
      URL.revokeObjectURL(url);

      await mostrarNotificacion(
        `Respaldo creado: ${datos.metadata.totalProductos} productos, ${datos.metadata.totalVentas} ventas`,
        "success"
      );
    } catch (error) {
      console.error("Error exportando datos:", error);
      await mostrarNotificacion(
        `Error creando respaldo: ${error.message}`,
        "error"
      );
    }
  };

  const importarDatos = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const datos = JSON.parse(e.target.result);

        // Validar estructura del archivo
        if (!datos.productos || !Array.isArray(datos.productos)) {
          await mostrarNotificacion(
            "Archivo de respaldo inválido: falta sección de productos",
            "error"
          );
          return;
        }

        // Mostrar resumen de lo que se va a importar
        const totalProductos = datos.productos.length;
        const totalVentas = datos.ventas?.length || 0;
        const mensaje = `¿Importar ${totalProductos} productos y ${totalVentas} ventas?\n\nADVERTENCIA: Los productos duplicados se omitirán.`;

        if (!window.confirm(mensaje)) {
          await mostrarNotificacion("Importación cancelada", "info");
          return;
        }

        await mostrarNotificacion(
          "Importando datos... Esto puede tomar unos momentos",
          "info"
        );

        let exitososProductos = 0;
        let fallidosProductos = 0;
        let duplicadosProductos = 0;
        let exitososVentas = 0;
        let fallidosVentas = 0;

        // Importar productos
        for (const prod of datos.productos) {
          try {
            // Verificar si ya existe un producto con el mismo nombre
            const productoExistente = productos.find(
              (p) => p.nombre.toLowerCase() === prod.nombre.toLowerCase()
            );

            if (productoExistente) {
              console.log(`Producto duplicado omitido: ${prod.nombre}`);
              duplicadosProductos++;
              continue;
            }

            // Crear producto usando el servicio
            await productosService.crearProducto({
              nombre: prod.nombre,
              tipo: prod.tipo || "",
              marca: prod.marca || "",
              descripcion: prod.descripcion || "",
              precio: parseFloat(prod.precio) || 0,
              stock: parseInt(prod.stock) || 0,
              stock_minimo:
                parseInt(prod.stockMinimo || prod.stock_minimo) || 0,
              codigo_barras: prod.codigo_barras || null,
            });

            exitososProductos++;
          } catch (error) {
            console.error(`Error importando producto ${prod.nombre}:`, error);
            fallidosProductos++;
          }
        }

        // Importar ventas si existen
        if (datos.ventas && Array.isArray(datos.ventas)) {
          for (const venta of datos.ventas) {
            try {
              await ventasService.crearVenta({
                nombre_producto: venta.nombreProducto || venta.nombre_producto,
                cantidad: parseInt(venta.cantidad) || 1,
                precio_unitario:
                  parseFloat(venta.precioUnitario || venta.precio_unitario) ||
                  0,
                total: parseFloat(venta.total) || 0,
                fecha: venta.fecha || new Date().toISOString(),
              });

              exitososVentas++;
            } catch (error) {
              console.error(`Error importando venta:`, error);
              fallidosVentas++;
            }
          }
        }

        // Recargar datos
        await cargarProductos();

        // Mostrar resumen de importación
        const resumen = [
          `✅ Productos importados: ${exitososProductos}`,
          duplicadosProductos > 0
            ? `⚠️ Productos duplicados omitidos: ${duplicadosProductos}`
            : null,
          fallidosProductos > 0
            ? `❌ Productos fallidos: ${fallidosProductos}`
            : null,
          exitososVentas > 0 ? `✅ Ventas importadas: ${exitososVentas}` : null,
          fallidosVentas > 0 ? `❌ Ventas fallidas: ${fallidosVentas}` : null,
        ]
          .filter(Boolean)
          .join("\n");

        const tipoNotificacion =
          fallidosProductos > 0 || fallidosVentas > 0 ? "warning" : "success";
        await mostrarNotificacion(resumen, tipoNotificacion);

        // Crear notificación de sistema
        await crearNotificacion(
          `Importación completada: ${exitososProductos} productos, ${exitososVentas} ventas`,
          "info"
        );
      } catch (error) {
        console.error("Error al importar:", error);
        await mostrarNotificacion(
          `Error al leer el archivo: ${error.message}. Verifica que sea un archivo válido.`,
          "error"
        );
      }
    };

    reader.readAsText(file);
    event.target.value = "";
  };

  const limpiarDatos = async () => {
    const totalProductos = productos.length;
    const totalVentas = todasLasVentas.length;

    const mensaje1 = `⚠️ ADVERTENCIA CRÍTICA ⚠️\n\nEstás a punto de eliminar:\n- ${totalProductos} productos\n- ${totalVentas} ventas\n- Todas las notificaciones\n\n¿Estás ABSOLUTAMENTE seguro?`;

    if (!window.confirm(mensaje1)) {
      await mostrarNotificacion("Operación cancelada", "info");
      return;
    }

    const mensaje2 = `CONFIRMACIÓN FINAL\n\nEsta acción es IRREVERSIBLE.\n\nEscribe "ELIMINAR TODO" en el siguiente cuadro para confirmar:`;
    const confirmacion = window.prompt(mensaje2);

    if (confirmacion !== "ELIMINAR TODO") {
      await mostrarNotificacion(
        "Operación cancelada. Texto de confirmación incorrecto.",
        "info"
      );
      return;
    }

    try {
      await mostrarNotificacion("Eliminando todos los datos...", "info");

      // Eliminar todas las ventas
      const { error: errorVentas } = await supabase
        .from("ventas")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (errorVentas) throw errorVentas;

      // Eliminar todas las notificaciones
      const { error: errorNotif } = await supabase
        .from("notificaciones")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (errorNotif) throw errorNotif;

      // Marcar todos los productos como inactivos (soft delete)
      const { error: errorProductos } = await supabase
        .from("productos")
        .update({ activo: false })
        .eq("activo", true);

      if (errorProductos) throw errorProductos;

      // Recargar datos
      await cargarProductos();

      await mostrarNotificacion(
        `Datos eliminados: ${totalProductos} productos, ${totalVentas} ventas`,
        "success"
      );

      // Crear notificación de sistema
      await crearNotificacion(
        "Base de datos limpiada completamente",
        "warning"
      );
    } catch (error) {
      console.error("Error eliminando datos:", error);
      await mostrarNotificacion(
        `Error al eliminar datos: ${error.message}`,
        "error"
      );
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
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Reintentar
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case "inventario":
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
            recargarProductos={cargarProductos}
          />
        );
      case "ventas":
        return (
          <Ventas ventas={todasLasVentas} formatearPrecio={formatearPrecio} />
        );
      case "reportes":
        return (
          <Reportes
            productos={productos}
            ventas={todasLasVentas}
            formatearPrecio={formatearPrecio}
            obtenerEstadisticas={obtenerEstadisticas}
          />
        );
      case "respaldos":
        return (
          <Respaldos
            productos={productos}
            ventas={todasLasVentas}
            exportarDatos={exportarDatos}
            importarDatos={importarDatos}
            limpiarDatos={limpiarDatos}
          />
        );
      case "notificaciones":
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
      <div className="content">{renderContent()}</div>
    </div>
  );
};

export default TallerMecanicoApp;
