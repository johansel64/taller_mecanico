// components/CapacitorBarcodeScanner.js
import React, { useState, useEffect } from "react";
import { BarcodeScanner } from "@capacitor-community/barcode-scanner";
import { Capacitor } from "@capacitor/core";
import "../styles/CapacitorBarcodeScanner.css";

const CapacitorBarcodeScanner = ({
  isOpen,
  onClose,
  onScan,
  title = "Escanear Código de Barras",
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [isNative, setIsNative] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());

    if (isOpen && Capacitor.isNativePlatform()) {
      initializeScanner();
    }

    return () => {
      if (isScanning) stopScanning();
    };
  }, [isOpen]);

  const initializeScanner = async () => {
    try {
      setError("");

      const status = await BarcodeScanner.checkPermission({ force: true });

      if (status.granted) {
        setHasPermission(true);

        // 🔥 Necesario para inicializar la cámara CORRECTAMENTE
        await BarcodeScanner.prepare();

        await startScanning();
      } else if (status.denied) {
        setHasPermission(false);
        setError(
          "Permisos de cámara denegados. Activa la cámara en Configuración > Aplicaciones > TallerPiolin > Permisos."
        );
      } else {
        setError("No se pudieron obtener permisos de cámara");
        setHasPermission(false);
      }
    } catch (err) {
      console.error(err);
      setError("Error al inicializar el escáner");
    }
  };

  const startScanning = async () => {
    try {
      const status = await BarcodeScanner.checkPermission({ force: true });

      if (!status.granted) {
        setError("Permiso de cámara denegado");
        return;
      }

      // 🔥 Hace el WebView transparente completamente
      await BarcodeScanner.hideBackground();
      document.body.classList.add("scanner-active");

      setIsScanning(true);
      setHasPermission(true);

      const result = await BarcodeScanner.startScan();

      if (result?.hasContent) {
        // Envía el código al padre
        if (typeof onScan === "function") {
          onScan(result.content);
        }
      }
    } catch (err) {
      console.error(err);
      setError("Error durante el escaneo");
    } finally {
      stopScanning();
    }
  };

  const stopScanning = async () => {
    try {
      await BarcodeScanner.showBackground();
      await BarcodeScanner.stopScan();
      document.body.classList.remove("scanner-active");
    } catch (err) {
      console.error(err);
    }

    setIsScanning(false);
  };

  const handleCancel = async () => {
    await stopScanning();
    onClose();
  };

  const handleManualInput = () => {
    const codigo = prompt("Ingresa el código de barras:");
    if (codigo && codigo.trim()) {
      onScan(codigo.trim());
      onClose();
    }
  };

  const handleRetry = async () => {
    setError("");
    setHasPermission(null);
    await initializeScanner();
  };

  if (!isOpen) return null;

  // 🔥 Vista nativa — cámara abierta
  if (isNative && isScanning && hasPermission) {
    return (
      <div className="scanner-overlay-native">
        <div className="scanner-overlay-cut"></div>

        <div className="scanner-header">
          <h3 className="scanner-title">{title}</h3>
          <button className="scanner-close-btn" onClick={handleCancel}>
            ✕
          </button>
        </div>

        <div className="scanner-target-area">
          <div className="scanner-frame"></div>
        </div>

        <div className="scanner-instructions">
          <p>Apunta la cámara al código de barras</p>
          <p>Mantén el código dentro del marco</p>
        </div>

        <div className="scanner-controls">
          <button className="scanner-cancel-btn" onClick={handleCancel}>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // 🔥 Modal para web o cuando hay error
  return (
    <div className="scanner-modal-overlay">
      <div className="scanner-modal">
        <div className="scanner-modal-header">
          <h3 className="scanner-modal-title">{title}</h3>
          <button className="scanner-modal-close" onClick={onClose}>
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
                <button className="scanner-retry-btn" onClick={handleRetry}>
                  Reintentar
                </button>
                <button className="scanner-manual-btn" onClick={handleManualInput}>
                  Ingresar Manualmente
                </button>
              </div>
            </div>
          ) : hasPermission === false ? (
            <div className="scanner-permission">
              <div className="scanner-permission-icon">📷</div>
              <h4>Permisos de cámara necesarios</h4>
              <p>La cámara es necesaria para escanear códigos de barras.</p>
              <button className="scanner-permission-btn" onClick={initializeScanner}>
                Solicitar permisos
              </button>
            </div>
          ) : !isNative ? (
            <div className="scanner-web-mode">
              <h4>Modo Web</h4>
              <p>El escáner real solo funciona en móvil.</p>
              <button className="scanner-manual-input-btn" onClick={handleManualInput}>
                Ingresar código manualmente
              </button>
            </div>
          ) : (
            <div className="scanner-loading">
              <h4>Preparando cámara...</h4>
            </div>
          )}
        </div>

        <div className="scanner-modal-footer">
          <button className="scanner-cancel-button" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CapacitorBarcodeScanner;
