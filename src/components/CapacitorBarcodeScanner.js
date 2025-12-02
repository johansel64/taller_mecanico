// components/CapacitorBarcodeScanner.js
import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { Capacitor } from '@capacitor/core';
import '../styles/CapacitorBarcodeScanner.css';

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

  // Función para preparar el DOM para el escaneo
  const prepareBodyForScanning = useCallback(() => {
    document.body.classList.add('scanner-active');
    document.documentElement.classList.add('scanner-active');
  }, []);

  // Función para restaurar el DOM después del escaneo
  const restoreBodyAfterScanning = useCallback(() => {
    document.body.classList.remove('scanner-active');
    document.documentElement.classList.remove('scanner-active');
  }, []);

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
    
    if (isOpen) {
      if (Capacitor.isNativePlatform()) {
        initializeScanner();
      }
    }

    return () => {
      if (isScanning) {
        stopScanning();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const initializeScanner = async () => {
    try {
      setError('');
      
      const status = await BarcodeScanner.checkPermission({ force: true });
      
      if (status.granted) {
        setHasPermission(true);
        await startScanning();
      } else if (status.denied) {
        setHasPermission(false);
        setError('Permisos de cámara denegados. Ve a Configuración > Aplicaciones > TallerPiolin > Permisos y activa la cámara.');
      } else if (status.neverAsked || status.restricted || status.unknown) {
        const newStatus = await BarcodeScanner.checkPermission({ force: true });
        if (newStatus.granted) {
          setHasPermission(true);
          await startScanning();
        } else {
          setHasPermission(false);
          setError('No se pudieron obtener permisos de cámara.');
        }
      } else {
        setHasPermission(false);
        setError('No se pudieron obtener permisos de cámara');
      }
    } catch (err) {
      console.error('Error inicializando scanner:', err);
      setError('Error al inicializar el escáner: ' + err.message);
    }
  };

  const startScanning = async () => {
    try {
      setIsScanning(true);
      setError('');
      
      // Preparar el DOM
      prepareBodyForScanning();
      
      // Ocultar WebView para mostrar cámara nativa
      await BarcodeScanner.hideBackground();
      
      // Iniciar el escáner
      const result = await BarcodeScanner.startScan();
      
      if (result && result.hasContent) {
        console.log('Código escaneado:', result.content);
        await stopScanning();
        onScan(result.content);
        onClose();
      } else {
        console.log('Escaneo cancelado o sin contenido');
        await stopScanning();
      }
    } catch (err) {
      console.error('Error durante el escaneo:', err);
      setError('Error durante el escaneo: ' + err.message);
      await stopScanning();
    }
  };

  const stopScanning = async () => {
    try {
      setIsScanning(false);
      await BarcodeScanner.stopScan();
      await BarcodeScanner.showBackground();
      restoreBodyAfterScanning();
    } catch (err) {
      console.error('Error deteniendo escáner:', err);
      restoreBodyAfterScanning();
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

  // Contenido del scanner para modo nativo activo
  const nativeScannerContent = (
    <div className="scanner-overlay-native">
      <div className="scanner-header">
        <h3 className="scanner-title">{title}</h3>
        <button 
          className="scanner-close-btn"
          onClick={handleCancel}
          type="button"
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
          <div className="scanner-line"></div>
        </div>
      </div>

      <div className="scanner-instructions">
        <p>📷 Apunta la cámara al código de barras</p>
        <p>Mantén el código dentro del marco verde</p>
      </div>

      <div className="scanner-controls">
        <button 
          className="scanner-cancel-btn"
          onClick={handleCancel}
          type="button"
        >
          ✕ Cancelar
        </button>
      </div>
    </div>
  );

  // Modal para web o cuando hay errores/permisos
  const modalContent = (
    <div className="scanner-modal-overlay">
      <div className="scanner-modal">
        <div className="scanner-modal-header">
          <h3 className="scanner-modal-title">{title}</h3>
          <button 
            className="scanner-modal-close"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="scanner-modal-content">
          {error ? (
            <div className="scanner-error">
              <div className="scanner-error-icon">⚠️</div>
              <h4>Error del Scanner</h4>
              <p className="scanner-error-message">{error}</p>
              <div className="scanner-error-actions">
                <button className="scanner-retry-btn" onClick={handleRetry} type="button">
                  🔄 Reintentar
                </button>
                <button className="scanner-manual-btn" onClick={handleManualInput} type="button">
                  ⌨️ Ingresar Manualmente
                </button>
              </div>
            </div>
          ) : hasPermission === false ? (
            <div className="scanner-permission">
              <div className="scanner-permission-icon">📷</div>
              <h4>Permisos de Cámara Necesarios</h4>
              <p>Esta aplicación necesita acceso a la cámara para escanear códigos de barras</p>
              <div className="scanner-permission-actions">
                <button className="scanner-permission-btn" onClick={initializeScanner} type="button">
                  ✓ Solicitar Permisos
                </button>
                <button className="scanner-manual-btn" onClick={handleManualInput} type="button">
                  ⌨️ Ingresar Manualmente
                </button>
              </div>
            </div>
          ) : !isNative ? (
            <div className="scanner-web-mode">
              <div className="scanner-web-icon">🌐</div>
              <h4>Modo Desarrollo Web</h4>
              <p>El scanner real funcionará en la aplicación móvil (APK)</p>
              
              <button className="scanner-manual-input-btn" onClick={handleManualInput} type="button">
                ⌨️ Ingresar Código Manualmente
              </button>

              <div className="scanner-examples">
                <h5>Códigos de ejemplo:</h5>
                <div className="scanner-example-codes">
                  {['7123456789012', '7987654321098', '7555666777888'].map((codigo) => (
                    <button 
                      key={codigo}
                      className="scanner-example-btn"
                      onClick={() => { onScan(codigo); onClose(); }}
                      type="button"
                    >
                      {codigo}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="scanner-loading">
              <div className="scanner-loading-icon">📱</div>
              <h4>Preparando Scanner</h4>
              <p>Inicializando cámara...</p>
            </div>
          )}
        </div>

        <div className="scanner-modal-footer">
          <button className="scanner-cancel-button" onClick={onClose} type="button">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );

  // CRÍTICO: Usar Portal para renderizar directamente en el body
  const content = (isNative && isScanning && hasPermission) 
    ? nativeScannerContent 
    : modalContent;

  return ReactDOM.createPortal(content, document.body);
};

export default CapacitorBarcodeScanner;