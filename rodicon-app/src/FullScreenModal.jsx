import React from 'react';
import { X } from 'lucide-react';

const COLOR_STYLES = {
  blue: {
    header: 'border-blue-200 bg-blue-50',
    title: 'text-blue-800',
    button: 'text-blue-600 hover:bg-blue-200'
  },
  purple: {
    header: 'border-purple-200 bg-purple-50',
    title: 'text-purple-800',
    button: 'text-purple-600 hover:bg-purple-200'
  },
  green: {
    header: 'border-green-200 bg-green-50',
    title: 'text-green-800',
    button: 'text-green-600 hover:bg-green-200'
  },
  orange: {
    header: 'border-orange-200 bg-orange-50',
    title: 'text-orange-800',
    button: 'text-orange-600 hover:bg-orange-200'
  },
  indigo: {
    header: 'border-indigo-200 bg-indigo-50',
    title: 'text-indigo-800',
    button: 'text-indigo-600 hover:bg-indigo-200'
  }
};

export const FullScreenModal = ({ title, color, onClose, children }) => {
  const styles = COLOR_STYLES[color] || COLOR_STYLES.blue;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-90 z-50 flex items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full sm:max-w-7xl h-[100dvh] sm:h-[90vh] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scaleIn">
        <div className={`px-4 sm:px-6 py-3 sm:py-4 border-b flex justify-between items-center ${styles.header}`}>
          <h2 className={`text-xl sm:text-2xl font-bold flex items-center gap-2 ${styles.title}`}>{title}</h2>
          <button onClick={onClose} className={`p-2 rounded-full transition font-bold ${styles.button}`}><X /></button>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 bg-gray-50 custom-scroll">
          {children}
        </div>
      </div>
    </div>
  );
};