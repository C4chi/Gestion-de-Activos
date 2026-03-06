import React from 'react';

const colorStyles = {
  blue: {
    border: 'border-l-blue-500',
    ring: 'ring-blue-500 bg-blue-50',
    title: 'text-blue-600',
    value: 'text-blue-700',
    icon: 'text-blue-600',
    iconMuted: 'text-blue-500'
  },
  red: {
    border: 'border-l-red-500',
    ring: 'ring-red-500 bg-red-50',
    title: 'text-red-600',
    value: 'text-red-700',
    icon: 'text-red-600',
    iconMuted: 'text-red-500'
  },
  yellow: {
    border: 'border-l-amber-500',
    ring: 'ring-amber-500 bg-amber-50',
    title: 'text-amber-600',
    value: 'text-amber-700',
    icon: 'text-amber-600',
    iconMuted: 'text-amber-500'
  }
};

export const DashboardCard = ({ title, value, icon, color, onClick, active, subtitle, footnote }) => {
  const styles = colorStyles[color] || colorStyles.blue;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left bg-white p-4 lg:p-5 rounded-xl shadow-sm border cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md select-none border-l-4 ${styles.border} ${active ? `ring-2 ${styles.ring}` : 'border-gray-200'}`}
    >
      <p className={`text-xs font-bold ${styles.title} uppercase tracking-wider`}>{title}</p>
      {subtitle && <p className="text-[11px] text-gray-500 mt-1">{subtitle}</p>}

      <div className="flex items-end justify-between mt-2">
        <h3 className={`text-2xl lg:text-3xl font-extrabold ${active ? styles.value : 'text-gray-800'}`}>{value}</h3>
        <span className={`text-xl lg:text-2xl ${active ? styles.icon : styles.iconMuted}`}>{icon}</span>
      </div>

      {footnote && <p className="text-[11px] text-gray-500 mt-2">{footnote}</p>}
    </button>
  );
};