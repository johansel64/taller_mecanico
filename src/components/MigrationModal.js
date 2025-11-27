import React, { useState, useEffect } from 'react';
import { migrationService } from '../services/migrationService';
import { Database, Upload, AlertTriangle, CheckCircle } from 'lucide-react';

const MigrationModal = ({ onComplete }) => {
  const [step, setStep] = useState('check'); // 'check', 'confirm', 'migrating', 'complete'
  const [datosExistentes, setDatosExistentes] = useState({ tieneProductos: false, tieneVentas: false });
  const [datosLocales, setDatosLocales] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    verificarEstado();
  }, []);

  const verificarEstado = async () => {
    try {
      setLoading(true);
      
      // Verificar datos en Supabase
      const existentes = await migrationService.verificarDatosExistentes();
      setDatosExistentes(existentes);

      // Verificar datos en localStorage
      const datosLocalStorage = localStorage.getItem('tallerMecanicoData');
      if (datosLocalStorage) {
        const datos = JSON.parse(datosLocalStorage);
        setDatosLocales(datos);
      }

      setLoading(false);

      // Decidir qué mostrar
      if (existentes.tieneProductos || existentes.tieneVentas) {
        setStep('complete');
        setMensaje('Ya tienes datos en tu base de datos. ¡Todo listo!');
      } else if (datosLocalStorage) {
        setStep('confirm');
      } else {
        setStep('complete');
        setMensaje('No hay datos para migrar. Puedes empezar a usar la aplicación.');
      }

    } catch (error) {
      console.error('Error verificando estado:', error);
      setMensaje('Error verificando estado de la base de datos');
      setLoading(false);
    }
  };

  const realizarMigracion = async () => {
    try {
      setStep('migrating');
      setMensaje('Migrando datos...');

      const resultado = await migrationService.migrarDesdeLocalStorage();
      
      if (resultado.success) {
        setStep('complete');
        setMensaje(resultado.message);
        
        // Crear respaldo por seguridad
        await migrationService.hacerRespaldoLocal();
      } else {
        setMensaje(`Error en migración: ${resultado.message}`);
      }

    } catch (error) {
      console.error('Error en migración:', error);
      setMensaje(`Error en migración: ${error.message}`);
    }
  };

  const saltar = () => {
    setStep('complete');
    setMensaje('Migración omitida. Puedes migrar más tarde desde Respaldos.');
  };

  if (loading) {
    return (
      <div className="migration-overlay">
        <div className="migration-modal">
          <div className="migration-content">
            <Database size={48} className="migration-icon spinning" />
            <h2>Verificando base de datos...</h2>
            <p>Por favor espera mientras verificamos tu configuración.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="migration-overlay">
      <div className="migration-modal">
        <div className="migration-content">
          
          {step === 'confirm' && (
            <>
              <Upload size={48} className="migration-icon" />
              <h2>¡Datos encontrados!</h2>
              <p>Hemos encontrado datos en tu dispositivo:</p>
              
              <div className="migration-stats">
                <div className="stat-item">
                  <strong>{datosLocales?.productos?.length || 0}</strong> productos
                </div>
                <div className="stat-item">
                  <strong>{datosLocales?.ventas?.length || 0}</strong> ventas
                </div>
              </div>

              <p>¿Quieres migrar estos datos a tu nueva base de datos?</p>

              <div className="migration-actions">
                <button onClick={realizarMigracion} className="btn-primary">
                  Sí, migrar datos
                </button>
                <button onClick={saltar} className="btn-secondary">
                  No, empezar desde cero
                </button>
              </div>
            </>
          )}

          {step === 'migrating' && (
            <>
              <Database size={48} className="migration-icon spinning" />
              <h2>Migrando datos...</h2>
              <p>{mensaje}</p>
              <div className="migration-progress">
                <div className="progress-bar"></div>
              </div>
            </>
          )}

          {step === 'complete' && (
            <>
              <CheckCircle size={48} className="migration-icon success" />
              <h2>¡Listo!</h2>
              <p>{mensaje}</p>
              <button onClick={onComplete} className="btn-primary">
                Continuar a la aplicación
              </button>
            </>
          )}

        </div>
      </div>

      <style jsx>{`
        .migration-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .migration-modal {
          background: white;
          border-radius: 1rem;
          padding: 2rem;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .migration-content {
          text-align: center;
        }

        .migration-icon {
          margin: 0 auto 1rem;
          color: #2563eb;
        }

        .migration-icon.spinning {
          animation: spin 1s linear infinite;
        }

        .migration-icon.success {
          color: #16a34a;
        }

        .migration-stats {
          background: #f3f4f6;
          border-radius: 0.5rem;
          padding: 1rem;
          margin: 1rem 0;
          display: flex;
          justify-content: space-around;
        }

        .stat-item {
          text-align: center;
        }

        .migration-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 1.5rem;
        }

        .migration-actions button {
          flex: 1;
        }

        .migration-progress {
          margin: 1rem 0;
          background: #e5e7eb;
          border-radius: 0.5rem;
          height: 0.5rem;
          overflow: hidden;
        }

        .progress-bar {
          background: #2563eb;
          height: 100%;
          width: 100%;
          animation: progress 2s ease-in-out infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes progress {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }

        h2 {
          margin-bottom: 0.5rem;
          color: #1f2937;
        }

        p {
          color: #6b7280;
          margin-bottom: 1rem;
        }
      `}</style>
    </div>
  );
};

export default MigrationModal;