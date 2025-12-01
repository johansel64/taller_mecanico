// components/CapacitorBarcodeScanner.js
import React, { useState, useEffect } from 'react';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { Capacitor } from '@capacitor/core';
import '../styles/CapacitorBarcodeScanner.css'; // Importar estilos

const CapacitorBarcodeScanner = ({ 
  isOpen, 
  onClose, 
  onScan, 
  title = "Escanear Código de Barras" 
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [isNative, setIsNative] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Detectar si estamos en dispositivo móvil
    setIsNative(Capacitor.isNativePlatform());
    
    if (isOpen) {
      if (Capacitor.isNativePlatform()) {
        initializeScanner();
      }
    }

    // Cleanup al cerrar
    return () => {
      if (isScanning) {
        stopScanning();
      }
    };
  }, [isOpen]);

  const initializeScanner = async () => {
    try {
      setError('');
      
      // Verificar y solicitar permisos
      const status = await BarcodeScanner.checkPermission({ force: true });
      
      if (status.granted) {
        setHasPermission(true);
        await startScanning();
      } else if (status.denied) {
        setHasPermission(false);
        setError('Permisos de cámara denegados. Ve a Configuración > Aplicaciones > ' + 
                 'TallerPiolin > Permisos y activa la cámara.');
      } else {
        setHasPermission(false);
        setError('No se pudieron obtener permisos de cámara');
      }
    } catch (error) {
      console.error('Error inicializando scanner:', error);
      setError('Error al inicializar el escáner: ' + error.message);
    }
  };

  const startScanning = async () => {
    try {
      setIsScanning(true);
      setError('');
      
      console.log('🔍 Iniciando scanner...'); // Debug
      
      // PRIMERO: Agregar clase al body
      document.body.classList.add('scanner-active');
      
      // SEGUNDO: Pequeño delay para que React renderice el overlay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('📷 Iniciando BarcodeScanner.startScan()'); // Debug
      
      // TERCERO: Iniciar el escáner del plugin
      const result = await BarcodeScanner.startScan();
      
      console.log('✅ Resultado del scanner:', result); // Debug
      
      // Procesar resultado
      if (result && result.hasContent) {
        console.log('✅ Código escaneado:', result.content);
        await stopScanning();
        onScan(result.content);
        onClose();
      } else {
        console.log('❌ Escaneo cancelado o sin contenido');
        await stopScanning();
      }
    } catch (error) {
      console.error('❌ Error durante el escaneo:', error);
      setError('Error durante el escaneo: ' + error.message);
      await stopScanning();
    }
  };
  const stopScanning = async () => {
    try {
      if (isScanning) {
        setIsScanning(false);
        await BarcodeScanner.stopScan();
        document.body.classList.remove('scanner-active');
        const appElement = document.querySelector('.app') || document.querySelector('.App');
        if (appElement) {
          appElement.style.display = '';
        }
      }
    } catch (error) {
      console.error('Error deteniendo escáner:', error);
    }
  };

  const handleCancel = async () => {
    await stopScanning();
    onClose();
  };

  const handleManualInput = () => {
    const codigo = prompt('Ingresa el código de barras:');
    if (codigo && codigo.trim()) {
      onScan(codigo.trim());
      onClose();
    }
  };

  const handleRetry = async () => {
    setError('');
    setHasPermission(null);
    await initializeScanner();
  };

  if (!isOpen) return null;

  // Si estamos escaneando en dispositivo nativo, mostrar controles superpuestos
  if (isNative && isScanning && hasPermission) {
    return (
      <div className="scanner-overlay-native">
        <div className="scanner-header">
          <h3 className="scanner-title">{title}</h3>
          <button 
            className="scanner-close-btn"
            onClick={handleCancel}
          >
            ✕
          </button>
        </div>
        
        <div className="scanner-target-area">
          <div className="scanner-frame">
            <div className="scanner-corner scanner-corner-tl"></div>
            <div className="scanner-corner scanner-corner-tr"></div>
            <div className="scanner-corner scanner-corner-bl"></div>
            <div className="scanner-corner scanner-corner-br"></div>
          </div>
        </div>

        <div className="scanner-instructions">
          <p>Apunta la cámara al código de barras</p>
          <p>Mantén el código dentro del marco</p>
        </div>

        <div className="scanner-controls">
          <button 
            className="scanner-cancel-btn"
            onClick={handleCancel}
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // Modal para web o cuando hay errores/permisos
  return (
    <div className="scanner-modal-overlay">
      <div className="scanner-modal">
        <div className="scanner-modal-header">
          <h3 className="scanner-modal-title">{title}</h3>
          <button 
            className="scanner-modal-close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="scanner-modal-content">
          {error ? (
            // Estado de error
            <div className="scanner-error">
              <div className="scanner-error-icon">⚠️</div>
              <h4>Error del Scanner</h4>
              <p className="scanner-error-message">{error}</p>
              <div className="scanner-error-actions">
                <button 
                  className="scanner-retry-btn"
                  onClick={handleRetry}
                >
                  Reintentar
                </button>
                <button 
                  className="scanner-manual-btn"
                  onClick={handleManualInput}
                >
                  Ingresar Manualmente
                </button>
              </div>
            </div>
          ) : hasPermission === false ? (
            // Estado sin permisos
            <div className="scanner-permission">
              <div className="scanner-permission-icon">📷</div>
              <h4>Permisos de Cámara Necesarios</h4>
              <p>Esta aplicación necesita acceso a la cámara para escanear códigos de barras</p>
              <div className="scanner-permission-actions">
                <button 
                  className="scanner-permission-btn"
                  onClick={initializeScanner}
                >
                  Solicitar Permisos
                </button>
                <button 
                  className="scanner-manual-btn"
                  onClick={handleManualInput}
                >
                  Ingresar Manualmente
                </button>
              </div>
            </div>
          ) : !isNative ? (
            // Modo desarrollo web
            <div className="scanner-web-mode">
              <div className="scanner-web-icon">🌐</div>
              <h4>Modo Desarrollo Web</h4>
              <p>El scanner real funcionará en la aplicación móvil</p>
              
              <button 
                className="scanner-manual-input-btn"
                onClick={handleManualInput}
              >
                Ingresar Código Manualmente
              </button>

              <div className="scanner-examples">
                <h5>Códigos de ejemplo:</h5>
                <div className="scanner-example-codes">
                  {['7123456789012', '7987654321098', '7555666777888'].map((codigo) => (
                    <button 
                      key={codigo}
                      className="scanner-example-btn"
                      onClick={() => {
                        onScan(codigo);
                        onClose();
                      }}
                    >
                      {codigo}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Preparando scanner
            <div className="scanner-loading">
              <div className="scanner-loading-icon">📱</div>
              <h4>Preparando Scanner</h4>
              <p>Inicializando cámara...</p>
            </div>
          )}
        </div>

        <div className="scanner-modal-footer">
          <button 
            className="scanner-cancel-button"
            onClick={onClose}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CapacitorBarcodeScanner;