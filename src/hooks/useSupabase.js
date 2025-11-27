import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

export const useSupabase = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const testConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('count');
      
      if (error) throw error;
      
      console.log('✅ Conectado a Supabase exitosamente');
      setLoading(false);
    } catch (error) {
      console.error('❌ Error conectando a Supabase:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return { loading, error };
};