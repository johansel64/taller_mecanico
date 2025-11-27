import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { config } from '../config/config';
import '../styles/Header.css';

const Header = ({ notificaciones }) => {
  return (
    <div className="header">
      <h1>{config.appName}</h1>
      {notificaciones.length > 0 && (
        <div className="notification-badge">
          <AlertTriangle size={16} />
          <span>{notificaciones.length} notificación(es)</span>
        </div>
      )}
    </div>
  );
};

export default Header;