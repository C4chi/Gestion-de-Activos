import React from 'react';

export const DashboardCard = ({ title, value, icon, color, onClick, active }) => (
  <div 
    onClick={onClick}
    className={`bg-white p-5 rounded-xl shadow-sm border cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg select-none
      border-l-4 border-l-${color}-500 
      ${active ? `ring-2 ring-${color}-500 bg-${color}-50` : 'border-gray-200'}
    `}
  >
    <p className={`text-xs font-bold text-${color}-600 uppercase tracking-wider`}>{title}</p>
    <div className="flex items-end justify-between mt-2">
      <h3 className={`text-3xl font-extrabold ${active ? `text-${color}-700` : 'text-gray-800'}`}>{value}</h3>
      <span className={`text-2xl ${active ? `text-${color}-600` : `text-${color}-500`}`}>{icon}</span>
    </div>
  </div>
);