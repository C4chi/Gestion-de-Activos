/**
 * InspectionCard.jsx
 * Tarjeta de inspección para la lista
 */

import React from 'react';
import { Clock, CheckCircle, AlertCircle, Award, Camera, MapPin } from 'lucide-react';

export default function InspectionCard({ inspection, onClick }) {
  const getStatusConfig = (status) => {
    const configs = {
      DRAFT: { color: 'yellow', icon: <Clock size={16} />, label: 'Borrador' },
      COMPLETED: { color: 'green', icon: <CheckCircle size={16} />, label: 'Completada' },
      APPROVED: { color: 'blue', icon: <Award size={16} />, label: 'Aprobada' },
      REJECTED: { color: 'red', icon: <AlertCircle size={16} />, label: 'Rechazada' }
    };
    return configs[status] || configs.DRAFT;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      BAJA: 'bg-gray-100 text-gray-700',
      MEDIA: 'bg-blue-100 text-blue-700',
      ALTA: 'bg-orange-100 text-orange-700',
      CRITICA: 'bg-red-100 text-red-700'
    };
    return colors[priority] || colors.MEDIA;
  };

  const statusConfig = getStatusConfig(inspection.status);
  const date = new Date(inspection.completed_at || inspection.created_at).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return (
    <button
      onClick={onClick}
      className="bg-white border rounded-lg p-4 hover:shadow-lg transition text-left w-full"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{inspection.template_category === 'SAFETY' ? '🦺' : '📋'}</span>
          <div>
            <p className="text-xs text-gray-500">{inspection.inspection_number}</p>
            <h3 className="font-semibold text-gray-900">{inspection.title}</h3>
          </div>
        </div>

        {/* Status badge */}
        <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-${statusConfig.color}-100 text-${statusConfig.color}-700`}>
          {statusConfig.icon}
          {statusConfig.label}
        </div>
      </div>

      {/* Score (si está completada) */}
      {inspection.status === 'COMPLETED' && inspection.score_percentage !== null && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600">Puntuación</span>
            <span className={`text-sm font-bold ${
              inspection.passed ? 'text-green-600' : 'text-red-600'
            }`}>
              {inspection.score_percentage}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                inspection.passed ? 'bg-green-600' : 'bg-red-600'
              }`}
              style={{ width: `${inspection.score_percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
        {inspection.ficha && (
          <div>
            <span className="font-medium">Ficha:</span> {inspection.ficha}
          </div>
        )}
        {inspection.conducted_by_name && (
          <div>
            <span className="font-medium">Inspector:</span> {inspection.conducted_by_name}
          </div>
        )}
      </div>

      {/* Prioridad */}
      <div className="flex items-center justify-between">
        <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(inspection.priority)}`}>
          {inspection.priority}
        </span>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          {inspection.has_photos && <Camera size={14} className="text-blue-500" />}
          {inspection.latitude && <MapPin size={14} className="text-green-500" />}
          <span>{date}</span>
        </div>
      </div>

      {/* Critical issues alert */}
      {inspection.has_critical_issues && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded px-3 py-2 flex items-center gap-2">
          <AlertCircle size={16} className="text-red-600" />
          <span className="text-xs text-red-700 font-medium">
            Contiene hallazgos críticos
          </span>
        </div>
      )}
    </button>
  );
}
