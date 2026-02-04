/**
 * TestConnection.jsx
 * Componente para debuggear conexión a Supabase
 * Eliminar después de verificar que funciona
 */

import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export const TestConnection = () => {
  const [status, setStatus] = useState('Probando conexión...');
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const testConnection = async () => {
      try {
        console.log('🔌 Probando conexión a Supabase...');
        const { data, error } = await supabase.from('app_users').select('*');
        
        if (error) {
          setStatus(`❌ Error: ${error.message}`);
          console.error('Error:', error);
          return;
        }

        console.log('✅ Conexión exitosa. Usuarios encontrados:', data);
        setUsers(data || []);
        setStatus(`✅ Conectado. ${data?.length || 0} usuarios encontrados`);
      } catch (err) {
        setStatus(`🚨 Exception: ${err.message}`);
        console.error('Exception:', err);
      }
    };

    testConnection();
  }, []);

  return (
    <div className="fixed top-4 right-4 bg-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
      <h3 className="font-bold text-sm mb-2">Test de Conexión</h3>
      <p className="text-xs mb-2">{status}</p>
      {users.length > 0 && (
        <div className="text-xs bg-gray-100 p-2 rounded max-h-40 overflow-y-auto">
          <p className="font-bold mb-1">Usuarios en BD:</p>
          {users.map((u) => (
            <div key={u.id} className="py-1 border-b text-gray-700">
              <strong>{u.nombre || u.id}</strong> - PIN: {u.pin}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
