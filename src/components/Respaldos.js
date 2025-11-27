import React from 'react';
import { Download, Upload, X, AlertTriangle } from 'lucide-react';

const Respaldos = ({ productos, ventas, exportarDatos, importarDatos, limpiarDatos }) => {
  return (
    <div>
      <h2>Gestión de Respaldos</h2>
      
      {/* Información del estado actual */}
      <div className="alert-box info">
        <h3>Estado Actual</h3>
        <div>
          <p>📦 Productos registrados: <strong>{productos.length}</strong></p>
          <p>💰 Ventas realizadas: <strong>{ventas.length}</strong></p>
          <p>💾 Los datos se guardan automáticamente en tu dispositivo</p>
        </div>
      </div>

      {/* Exportar datos */}
      <div className="card">
        <h3>
          <Download size={20} style={{display: 'inline', marginRight: '0.5rem', color: '#16a34a'}} />
          Crear Respaldo
        </h3>
        <p style={{marginBottom: '1rem', color: '#6b7280'}}>
          Descarga un archivo con todos tus datos para guardar como respaldo o transferir a otro dispositivo.
        </p>
        <button
          onClick={exportarDatos}
          className="btn-success copy-button"
        >
          <Download size={20} />
          Descargar Respaldo
        </button>
      </div>

      {/* Importar datos */}
      <div className="card">
        <h3>
          <Upload size={20} style={{display: 'inline', marginRight: '0.5rem', color: '#2563eb'}} />
          Restaurar Respaldo
        </h3>
        <p style={{marginBottom: '1rem', color: '#6b7280'}}>
          Importa un archivo de respaldo para restaurar tus datos. Esto reemplazará toda la información actual.
        </p>
        <div style={{position: 'relative'}}>
          <input
            type="file"
            accept=".json"
            onChange={importarDatos}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer'
            }}
          />
          <button className="btn-primary copy-button">
            <Upload size={20} />
            Seleccionar Archivo de Respaldo
          </button>
        </div>
      </div>

      {/* Limpiar datos */}
      <div className="card" style={{borderLeft: '4px solid #dc2626'}}>
        <h3 style={{color: '#b91c1c'}}>
          <AlertTriangle size={20} style={{display: 'inline', marginRight: '0.5rem'}} />
          Zona Peligrosa
        </h3>
        <p style={{marginBottom: '1rem', color: '#6b7280'}}>
          Elimina permanentemente todos los datos de la aplicación. Esta acción no se puede deshacer.
        </p>
        <button
          onClick={limpiarDatos}
          className="btn-danger copy-button"
        >
          <X size={20} />
          Eliminar Todos los Datos
        </button>
      </div>

      {/* Instrucciones */}
      <div className="alert-box info">
        <h4>💡 Instrucciones</h4>
        <div style={{fontSize: '0.875rem', color: '#6b7280'}}>
          <p><strong>Para transferir a otro dispositivo:</strong></p>
          <p>1. Crea un respaldo en este dispositivo</p>
          <p>2. Transfiere el archivo .json al nuevo dispositivo</p>
          <p>3. Abre la app en el nuevo dispositivo</p>
          <p>4. Ve a Respaldos → Restaurar Respaldo</p>
          <p>5. Selecciona el archivo y confirma la importación</p>
        </div>
      </div>
    </div>
  );
};

export default Respaldos;