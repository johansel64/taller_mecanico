import React from 'react';
import { Package, ShoppingCart, BarChart3, Database, AlertTriangle } from 'lucide-react';
import '../styles/Navigation.css';

const TabButton = ({ id, icon: Icon, label, active, onClick }) => (
  <button
    onClick={() => onClick(id)}
    className={`tab-button ${active ? 'active' : ''}`}
  >
    <Icon size={24} />
    <span>{label}</span>
  </button>
);

const Navigation = ({ activeTab, setActiveTab }) => {
  return (
    <div className="navigation">
      <TabButton 
        id="inventario" 
        icon={Package} 
        label="Inventario" 
        active={activeTab === 'inventario'}
        onClick={setActiveTab}
      />
      <TabButton 
        id="ventas" 
        icon={ShoppingCart} 
        label="Ventas" 
        active={activeTab === 'ventas'}
        onClick={setActiveTab}
      />
      <TabButton 
        id="reportes" 
        icon={BarChart3} 
        label="Reportes" 
        active={activeTab === 'reportes'}
        onClick={setActiveTab}
      />
      <TabButton 
        id="respaldos" 
        icon={Database} 
        label="Respaldos" 
        active={activeTab === 'respaldos'}
        onClick={setActiveTab}
      />
      <TabButton 
        id="notificaciones" 
        icon={AlertTriangle} 
        label="Alertas" 
        active={activeTab === 'notificaciones'}
        onClick={setActiveTab}
      />
    </div>
  );
};

export default Navigation;