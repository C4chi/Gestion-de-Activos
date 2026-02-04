import React from 'react';
import { X } from 'lucide-react';

export const FullScreenModal = ({ title, color, onClose, children }) => (
  <div className="fixed inset-0 bg-gray-900 bg-opacity-90 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden animate-scaleIn">
      <div className={`px-6 py-4 border-b border-${color}-200 bg-${color}-50 flex justify-between items-center`}>
        <h2 className={`text-xl font-bold text-${color}-800 flex items-center gap-2`}>{title}</h2>
        <button onClick={onClose} className={`p-2 rounded-full hover:bg-${color}-200 text-${color}-600 transition font-bold`}><X/></button>
      </div>
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50 custom-scroll">
        {children}
      </div>
    </div>
  </div>
);