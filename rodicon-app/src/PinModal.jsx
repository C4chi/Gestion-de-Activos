import React, { useState } from 'react';
import toast from 'react-hot-toast';

export const PinModal = ({ onSubmit, onSuccess }) => {
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [pinInput, setPinInput] = useState('');

  const handleInternalSubmit = async () => {
    if (!nombreUsuario.trim()) {
      toast.error('Ingresa tu nombre de usuario');
      return;
    }
    if (pinInput.length !== 4) {
      toast.error('El PIN debe tener 4 dígitos');
      return;
    }

    await onSubmit({ nombreUsuario: nombreUsuario.trim(), pin: pinInput }, 
      (user) => {
        onSuccess(user);
        setNombreUsuario('');
        setPinInput('');
      },
      () => {
        toast.error('Usuario o PIN incorrecto');
        setPinInput('');
      }
    );
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: 'url(/login-bg.jpg)',
      }}
    >
      {/* Overlay oscuro para mejorar legibilidad */}
      <div className="absolute inset-0 bg-black/40"></div>
      
      <div className="relative bg-white p-6 lg:p-8 rounded-2xl shadow-2xl w-full max-w-sm text-center animate-scaleIn">
        <img 
          src="/logo.png" 
          alt="RODICON" 
          className="w-24 h-24 lg:w-32 lg:h-32 mx-auto mb-4 object-contain"
        />
        <p className="text-xs lg:text-sm text-gray-500 mb-6">Acceso Restringido</p>
        
        {/* Nombre de usuario */}
        <div className="mb-4">
          <input 
            type="text" 
            value={nombreUsuario} 
            onChange={e => setNombreUsuario(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && handleInternalSubmit()} 
            className="w-full text-center text-sm lg:text-base border-b-2 border-gray-300 py-2 mb-4 outline-none focus:border-blue-600" 
            autoFocus 
            placeholder="Nombre de usuario"
            autoComplete="username"
          />
          
          {/* PIN */}
          <input 
            type="password" 
            value={pinInput} 
            onChange={e => setPinInput(e.target.value.replace(/[^0-9]/g, ''))} 
            onKeyDown={e => e.key === 'Enter' && handleInternalSubmit()} 
            className="w-full text-center text-2xl lg:text-3xl tracking-[0.5em] font-bold border-b-2 border-gray-300 py-2 outline-none focus:border-blue-600" 
            maxLength={4} 
            placeholder="••••"
            inputMode="numeric"
            autoComplete="current-password"
          />
        </div>

        <button 
          onClick={handleInternalSubmit} 
          className="w-full bg-blue-600 text-white py-3 lg:py-4 text-base lg:text-lg rounded-xl font-bold hover:bg-blue-700 transition active:scale-95"
        >
          ENTRAR
        </button>
      </div>
    </div>
  );
};