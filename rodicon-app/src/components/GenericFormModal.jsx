/**
 * GenericFormModal.jsx
 * Componente reutilizable para reducir duplicación en ~7 modales de formularios
 * Reduce código en ~400 líneas
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useFormValidation } from '../hooks/useFormValidation';

export const GenericFormModal = ({
  title,
  subtitle,
  fields,
  initialValues,
  onSubmit,
  onClose,
  isLoading = false,
  submitButtonText = 'Guardar',
  submitButtonColor = 'blue'
}) => {
  const { values, errors, touched, isSubmitting, handleChange, handleBlur, handleSubmit, reset } = useFormValidation(
    initialValues,
    onSubmit,
    null // Se puede agregar validación personalizada
  );

  const colorClasses = {
    blue: 'bg-blue-600 hover:bg-blue-700',
    green: 'bg-green-600 hover:bg-green-700',
    red: 'bg-red-600 hover:bg-red-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          </div>
          <button
            onClick={() => { reset(); onClose(); }}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {fields.map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>

              {field.type === 'select' ? (
                <select
                  name={field.name}
                  value={values[field.name] || ''}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none transition ${
                    touched[field.name] && errors[field.name]
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:border-blue-500'
                  }`}
                >
                  <option value="">Seleccionar...</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : field.type === 'textarea' ? (
                <textarea
                  name={field.name}
                  value={values[field.name] || ''}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  rows={field.rows || 3}
                  placeholder={field.placeholder}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none transition resize-none ${
                    touched[field.name] && errors[field.name]
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:border-blue-500'
                  }`}
                />
              ) : field.type === 'checkbox' ? (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name={field.name}
                    checked={values[field.name] || false}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-600">{field.checkLabel}</span>
                </label>
              ) : (
                <input
                  type={field.type || 'text'}
                  name={field.name}
                  value={values[field.name] || ''}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder={field.placeholder}
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none transition ${
                    touched[field.name] && errors[field.name]
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:border-blue-500'
                  }`}
                />
              )}

              {touched[field.name] && errors[field.name] && (
                <p className="text-xs text-red-500 mt-1">{errors[field.name]}</p>
              )}
            </div>
          ))}

          {/* Botones */}
          <div className="flex gap-3 mt-6 pt-4 border-t">
            <button
              type="button"
              onClick={() => { reset(); onClose(); }}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className={`flex-1 px-4 py-2 text-white font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${colorClasses[submitButtonColor]}`}
            >
              {isSubmitting ? 'Procesando...' : submitButtonText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
