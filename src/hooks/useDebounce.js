// hooks/useDebounce.js
import { useState, useEffect } from 'react';

/**
 * Hook personalizado para hacer debounce de un valor
 * Útil para búsquedas y evitar llamadas excesivas a la API
 * 
 * @param {any} value - Valor a aplicar debounce
 * @param {number} delay - Delay en milisegundos (default: 300ms)
 * @returns {any} Valor con debounce aplicado
 */
export const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Establecer un timeout para actualizar el valor después del delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Limpiar el timeout si el valor cambia antes de que expire el delay
    // Esto previene actualizaciones innecesarias
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};