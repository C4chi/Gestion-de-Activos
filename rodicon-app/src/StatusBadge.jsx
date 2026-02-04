import React from 'react';

export const StatusBadge = ({ status }) => {
  const s = (status || '').toUpperCase();
  let classes = 'bg-gray-100 text-gray-800 border-gray-200';
  if (s === 'DISPONIBLE') classes = 'bg-green-100 text-green-800 border-green-200';
  else if (['NO DISPONIBLE', 'EN TALLER', 'RECIBIDO'].includes(s)) classes = 'bg-red-700 text-white border-red-700';
  else if (s === 'ESPERA REPUESTO') classes = 'bg-orange-100 text-orange-800 border-orange-200 animate-pulse';
  else if (s === 'EN REPARACION') classes = 'bg-blue-100 text-blue-800 border-blue-200';
  else if (s === 'MTT PREVENTIVO') classes = 'bg-yellow-100 text-yellow-800 border-yellow-200';
  
  return <span className={`px-2 py-1 rounded text-[10px] font-bold border uppercase tracking-wider ${classes}`}>{s}</span>;
};