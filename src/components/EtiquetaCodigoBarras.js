// components/EtiquetaCodigoBarras.js
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Printer, Share2, Download, X, Plus, Minus, Copy } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import '../styles/EtiquetaCodigoBarras.css';

// Importamos JsBarcode dinámicamente
let JsBarcode = null;

const EtiquetaCodigoBarras = ({
  isOpen,
  onClose,
  producto,
  formatearPrecio
}) => {
  const [cantidad, setCantidad] = useState(1);
  const [tamano, setTamano] = useState('mediano'); // pequeno, mediano, grande
  const [mostrarPrecio, setMostrarPrecio] = useState(true);
  const [mostrarNombre, setMostrarNombre] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [barcodeLoaded, setBarcodeLoaded] = useState(false);
  const canvasRef = useRef(null);
  const etiquetaRef = useRef(null);

  // Cargar JsBarcode
  useEffect(() => {
    const loadJsBarcode = async () => {
      if (!JsBarcode) {
        try {
          const module = await import('jsbarcode');
          JsBarcode = module.default;
          setBarcodeLoaded(true);
        } catch (error) {
          console.error('Error cargando JsBarcode:', error);
          setMensaje('Error cargando generador de códigos');
        }
      } else {
        setBarcodeLoaded(true);
      }
    };
    
    if (isOpen) {
      loadJsBarcode();
    }
  }, [isOpen]);

  // Generar código de barras cuando cambian las opciones
  useEffect(() => {
    if (isOpen && producto?.codigo_barras && barcodeLoaded && canvasRef.current) {
      generarCodigoBarras();
    }
  }, [isOpen, producto, tamano, barcodeLoaded]);

  const generarCodigoBarras = () => {
    if (!JsBarcode || !canvasRef.current || !producto?.codigo_barras) return;

    const dimensiones = {
      pequeno: { width: 1.5, height: 40, fontSize: 12 },
      mediano: { width: 2, height: 60, fontSize: 14 },
      grande: { width: 2.5, height: 80, fontSize: 16 }
    };

    const config = dimensiones[tamano];

    try {
      JsBarcode(canvasRef.current, producto.codigo_barras, {
        format: 'CODE128',
        width: config.width,
        height: config.height,
        displayValue: true,
        fontSize: config.fontSize,
        margin: 10,
        background: '#ffffff',
        lineColor: '#000000',
        textAlign: 'center',
        textMargin: 5
      });
    } catch (error) {
      console.error('Error generando código de barras:', error);
      setMensaje('Error generando código de barras');
    }
  };

  // Generar imagen de la etiqueta completa
  const generarImagenEtiqueta = async () => {
    if (!etiquetaRef.current) return null;

    try {
      // Crear un canvas temporal para la etiqueta completa
      const etiquetaElement = etiquetaRef.current;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Dimensiones según tamaño
      const dimensiones = {
        pequeno: { width: 200, height: 120 },
        mediano: { width: 280, height: 160 },
        grande: { width: 350, height: 200 }
      };

      const dim = dimensiones[tamano];
      canvas.width = dim.width;
      canvas.height = dim.height + (mostrarNombre ? 30 : 0) + (mostrarPrecio ? 25 : 0);

      // Fondo blanco
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      let yPos = 10;

      // Nombre del producto
      if (mostrarNombre) {
        ctx.fillStyle = '#000000';
        ctx.font = `bold ${tamano === 'pequeno' ? '12' : tamano === 'mediano' ? '14' : '16'}px Arial`;
        ctx.textAlign = 'center';
        
        // Truncar nombre si es muy largo
        let nombreMostrar = producto.nombre;
        const maxChars = tamano === 'pequeno' ? 20 : tamano === 'mediano' ? 28 : 35;
        if (nombreMostrar.length > maxChars) {
          nombreMostrar = nombreMostrar.substring(0, maxChars - 3) + '...';
        }
        
        ctx.fillText(nombreMostrar, canvas.width / 2, yPos + 15);
        yPos += 25;
      }

      // Código de barras
      if (canvasRef.current) {
        const barcodeCanvas = canvasRef.current;
        const barcodeWidth = Math.min(barcodeCanvas.width, canvas.width - 20);
        const barcodeHeight = (barcodeCanvas.height / barcodeCanvas.width) * barcodeWidth;
        const barcodeX = (canvas.width - barcodeWidth) / 2;
        
        ctx.drawImage(barcodeCanvas, barcodeX, yPos, barcodeWidth, barcodeHeight);
        yPos += barcodeHeight + 5;
      }

      // Precio
      if (mostrarPrecio && producto.precio) {
        ctx.fillStyle = '#000000';
        ctx.font = `bold ${tamano === 'pequeno' ? '14' : tamano === 'mediano' ? '18' : '22'}px Arial`;
        ctx.textAlign = 'center';
        const precioTexto = formatearPrecio ? formatearPrecio(producto.precio) : `₡${producto.precio}`;
        ctx.fillText(precioTexto, canvas.width / 2, yPos + 20);
      }

      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error generando imagen:', error);
      return null;
    }
  };

  // Imprimir etiquetas
  const handleImprimir = async () => {
    setIsLoading(true);
    setMensaje('');

    try {
      const imagenBase64 = await generarImagenEtiqueta();
      if (!imagenBase64) throw new Error('No se pudo generar la imagen');

      // Crear ventana de impresión
      const ventanaImpresion = window.open('', '_blank');
      if (!ventanaImpresion) {
        throw new Error('No se pudo abrir ventana de impresión. Permite ventanas emergentes.');
      }

      // Generar HTML con las etiquetas
      let etiquetasHTML = '';
      for (let i = 0; i < cantidad; i++) {
        etiquetasHTML += `<img src="${imagenBase64}" class="etiqueta" />`;
      }

      ventanaImpresion.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Imprimir Etiquetas - ${producto.nombre}</title>
          <style>
            @page {
              margin: 5mm;
            }
            body {
              margin: 0;
              padding: 10px;
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
              justify-content: flex-start;
            }
            .etiqueta {
              border: 1px dashed #ccc;
              page-break-inside: avoid;
            }
            @media print {
              .etiqueta {
                border: none;
              }
            }
          </style>
        </head>
        <body>
          ${etiquetasHTML}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
        </html>
      `);

      ventanaImpresion.document.close();
      setMensaje('Ventana de impresión abierta');

    } catch (error) {
      console.error('Error imprimiendo:', error);
      setMensaje(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Compartir imagen (para impresoras Bluetooth, WhatsApp, etc.)
  const handleCompartir = async () => {
    setIsLoading(true);
    setMensaje('');

    try {
      const imagenBase64 = await generarImagenEtiqueta();
      if (!imagenBase64) throw new Error('No se pudo generar la imagen');

      if (Capacitor.isNativePlatform()) {
        // En móvil, guardar archivo y compartir
        const nombreArchivo = `etiqueta_${producto.codigo_barras}_${Date.now()}.png`;
        
        // Guardar en el sistema de archivos
        await Filesystem.writeFile({
          path: nombreArchivo,
          data: imagenBase64.split(',')[1], // Remover el prefijo data:image/png;base64,
          directory: Directory.Cache
        });

        // Obtener URI del archivo
        const fileUri = await Filesystem.getUri({
          path: nombreArchivo,
          directory: Directory.Cache
        });

        // Compartir
        await Share.share({
          title: `Etiqueta - ${producto.nombre}`,
          text: `Código: ${producto.codigo_barras}`,
          url: fileUri.uri,
          dialogTitle: 'Compartir etiqueta'
        });

        setMensaje('¡Etiqueta compartida!');
      } else {
        // En web, usar Web Share API si está disponible
        if (navigator.share) {
          const blob = await fetch(imagenBase64).then(r => r.blob());
          const file = new File([blob], `etiqueta_${producto.codigo_barras}.png`, { type: 'image/png' });
          
          await navigator.share({
            title: `Etiqueta - ${producto.nombre}`,
            files: [file]
          });
          setMensaje('¡Etiqueta compartida!');
        } else {
          // Fallback: descargar
          handleDescargar();
        }
      }
    } catch (error) {
      console.error('Error compartiendo:', error);
      if (error.message !== 'Share canceled') {
        setMensaje(`Error: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Descargar imagen
  const handleDescargar = async () => {
    setIsLoading(true);
    setMensaje('');

    try {
      const imagenBase64 = await generarImagenEtiqueta();
      if (!imagenBase64) throw new Error('No se pudo generar la imagen');

      if (Capacitor.isNativePlatform()) {
        // En móvil, guardar en Documents
        const nombreArchivo = `etiqueta_${producto.codigo_barras}_${Date.now()}.png`;
        
        await Filesystem.writeFile({
          path: nombreArchivo,
          data: imagenBase64.split(',')[1],
          directory: Directory.Documents
        });

        setMensaje(`Guardado: ${nombreArchivo}`);
      } else {
        // En web, descargar
        const link = document.createElement('a');
        link.href = imagenBase64;
        link.download = `etiqueta_${producto.codigo_barras}.png`;
        link.click();
        setMensaje('¡Imagen descargada!');
      }
    } catch (error) {
      console.error('Error descargando:', error);
      setMensaje(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Copiar código al portapapeles
  const handleCopiarCodigo = async () => {
    try {
      await navigator.clipboard.writeText(producto.codigo_barras);
      setMensaje('¡Código copiado!');
      setTimeout(() => setMensaje(''), 2000);
    } catch (error) {
      setMensaje('Error copiando código');
    }
  };

  if (!isOpen || !producto) return null;

  const contenido = (
    <div className="etiqueta-modal-overlay">
      <div className="etiqueta-modal">
        {/* Header */}
        <div className="etiqueta-modal-header">
          <h3>🏷️ Generar Etiqueta</h3>
          <button className="etiqueta-close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Contenido */}
        <div className="etiqueta-modal-content">
          {/* Vista previa */}
          <div className="etiqueta-preview-container">
            <h4>Vista Previa</h4>
            <div className={`etiqueta-preview etiqueta-${tamano}`} ref={etiquetaRef}>
              {mostrarNombre && (
                <div className="etiqueta-nombre">{producto.nombre}</div>
              )}
              <canvas ref={canvasRef} className="etiqueta-barcode"></canvas>
              {mostrarPrecio && producto.precio && (
                <div className="etiqueta-precio">
                  {formatearPrecio ? formatearPrecio(producto.precio) : `₡${producto.precio}`}
                </div>
              )}
            </div>
          </div>

          {/* Código */}
          <div className="etiqueta-codigo-info">
            <span className="etiqueta-codigo">{producto.codigo_barras}</span>
            <button className="btn-copiar" onClick={handleCopiarCodigo} title="Copiar código">
              <Copy size={16} />
            </button>
          </div>

          {/* Opciones */}
          <div className="etiqueta-opciones">
            {/* Tamaño */}
            <div className="opcion-grupo">
              <label>Tamaño:</label>
              <div className="opcion-botones">
                <button 
                  className={`opcion-btn ${tamano === 'pequeno' ? 'activo' : ''}`}
                  onClick={() => setTamano('pequeno')}
                >
                  Pequeño
                </button>
                <button 
                  className={`opcion-btn ${tamano === 'mediano' ? 'activo' : ''}`}
                  onClick={() => setTamano('mediano')}
                >
                  Mediano
                </button>
                <button 
                  className={`opcion-btn ${tamano === 'grande' ? 'activo' : ''}`}
                  onClick={() => setTamano('grande')}
                >
                  Grande
                </button>
              </div>
            </div>

            {/* Cantidad */}
            <div className="opcion-grupo">
              <label>Cantidad:</label>
              <div className="cantidad-control">
                <button 
                  className="cantidad-btn"
                  onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                >
                  <Minus size={18} />
                </button>
                <input 
                  type="number" 
                  value={cantidad} 
                  onChange={(e) => setCantidad(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                  min="1"
                  max="50"
                  className="cantidad-input"
                />
                <button 
                  className="cantidad-btn"
                  onClick={() => setCantidad(Math.min(50, cantidad + 1))}
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="opcion-grupo checkbox-grupo">
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={mostrarNombre}
                  onChange={(e) => setMostrarNombre(e.target.checked)}
                />
                Mostrar nombre
              </label>
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={mostrarPrecio}
                  onChange={(e) => setMostrarPrecio(e.target.checked)}
                />
                Mostrar precio
              </label>
            </div>
          </div>

          {/* Mensaje */}
          {mensaje && (
            <div className={`etiqueta-mensaje ${mensaje.includes('Error') ? 'error' : 'success'}`}>
              {mensaje}
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="etiqueta-modal-footer">
          <button 
            className="etiqueta-btn btn-imprimir"
            onClick={handleImprimir}
            disabled={isLoading}
          >
            <Printer size={20} />
            Imprimir ({cantidad})
          </button>
          
          <button 
            className="etiqueta-btn btn-compartir"
            onClick={handleCompartir}
            disabled={isLoading}
          >
            <Share2 size={20} />
            Compartir
          </button>
          
          <button 
            className="etiqueta-btn btn-descargar"
            onClick={handleDescargar}
            disabled={isLoading}
          >
            <Download size={20} />
            Guardar
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(contenido, document.body);
};

export default EtiquetaCodigoBarras;