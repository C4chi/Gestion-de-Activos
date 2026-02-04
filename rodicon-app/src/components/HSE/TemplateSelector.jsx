/**
 * TemplateSelector.jsx
 * Modal para seleccionar un template de inspección
 */

import React, { useState } from 'react';
import { X, Search, Star, TrendingUp } from 'lucide-react';

export default function TemplateSelector({ templates, onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Filtrar templates
  const filteredTemplates = templates.filter(t => {
    if (categoryFilter !== 'ALL' && t.category !== categoryFilter) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      return t.name.toLowerCase().includes(searchLower) || 
             t.description?.toLowerCase().includes(searchLower);
    }
    return true;
  });

  // Obtener categorías únicas
  const categories = [...new Set(templates.map(t => t.category))];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Seleccionar Tipo de Inspección
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Elige un template para comenzar
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Filtros */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex gap-4">
            {/* Búsqueda */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar templates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>

            {/* Categorías */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="ALL">Todas las categorías</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Lista de templates */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No se encontraron templates</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onClick={() => onSelect(template.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TemplateCard({ template, onClick }) {
  const sectionCount = template.schema?.sections?.length || 0;
  const itemCount = template.schema?.sections?.reduce((sum, s) => sum + (s.items?.length || 0), 0) || 0;

  return (
    <button
      onClick={onClick}
      className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-lg transition text-left w-full"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="text-4xl">{template.icon}</div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">
            {template.name}
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            {template.description || 'Sin descripción'}
          </p>

          {/* Metadata */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
              {template.category}
            </span>
            <span>{sectionCount} secciones</span>
            <span>{itemCount} preguntas</span>
            {template.scoring_enabled && (
              <span className="flex items-center gap-1 text-green-600">
                <Star size={12} />
                Puntuación
              </span>
            )}
          </div>

          {/* Tags */}
          {template.tags && template.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {template.tags.slice(0, 3).map(tag => (
                <span key={tag} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
