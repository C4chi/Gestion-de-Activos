/**
 * FormRenderer.jsx
 * Motor de renderizado dinámico de formularios basado en JSON Schema
 * Tipo SafetyCulture/iAuditor
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Camera, MapPin, Edit3, Check, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../supabaseClient';

/**
 * Evalúa una condición de forma segura sin eval()
 */
const evaluateCondition = (condition, value) => {
  // Reemplazar 'value' con el valor real en la condición
  const conditionStr = condition.replace(/value/g, JSON.stringify(value));
  
  // Parsear y evaluar condiciones simples de forma segura
  // Soporta: === !== > < >= <=
  const eqMatch = conditionStr.match(/^['"](.+)['"] === ['"](.+)['"]$/);
  if (eqMatch) return eqMatch[1] === eqMatch[2];
  
  const neqMatch = conditionStr.match(/^['"](.+)['"] !== ['"](.+)['"]$/);
  if (neqMatch) return neqMatch[1] !== neqMatch[2];
  
  const gtMatch = conditionStr.match(/^(\d+(?:\.\d+)?) > (\d+(?:\.\d+)?)$/);
  if (gtMatch) return parseFloat(gtMatch[1]) > parseFloat(gtMatch[2]);
  
  const ltMatch = conditionStr.match(/^(\d+(?:\.\d+)?) < (\d+(?:\.\d+)?)$/);
  if (ltMatch) return parseFloat(ltMatch[1]) < parseFloat(ltMatch[2]);
  
  const gteMatch = conditionStr.match(/^(\d+(?:\.\d+)?) >= (\d+(?:\.\d+)?)$/);
  if (gteMatch) return parseFloat(gteMatch[1]) >= parseFloat(gteMatch[2]);
  
  const lteMatch = conditionStr.match(/^(\d+(?:\.\d+)?) <= (\d+(?:\.\d+)?)$/);
  if (lteMatch) return parseFloat(lteMatch[1]) <= parseFloat(lteMatch[2]);
  
  return false;
};

/**
 * Evalúa las reglas condicionales del nuevo formato
 */
const evaluateConditionalRule = (rule, value) => {
  if (!rule || !rule.condition) return false;
  
  const { condition } = rule;
  const hasValue = value !== null && value !== undefined && value !== '';
  
  switch (condition) {
    case 'not_blank':
      return hasValue;
    case 'is_blank':
      return !hasValue;
    case 'equals':
      return value === rule.value;
    case 'not_equals':
      return value !== rule.value;
    default:
      return false;
  }
};

/**
 * Hook para manejar el estado del formulario dinámico
 */
const useFormState = (initialSchema, initialAnswers = {}) => {
  const [answers, setAnswers] = useState(initialAnswers);
  const [errors, setErrors] = useState({});
  const [score, setScore] = useState({ total: 0, max: 0, percentage: 0 });
  const [visibleItems, setVisibleItems] = useState(new Set());

  // Inicializar items visibles (todos los que no tienen condicionales)
  useEffect(() => {
    if (!initialSchema?.sections) return;

    const visible = new Set();
    initialSchema.sections.forEach(section => {
      section.items?.forEach(item => {
        if (!item.conditional || !item.conditional.dependsOn) {
          visible.add(item.id);
        }
      });
    });
    setVisibleItems(visible);
  }, [initialSchema]);

  // Evaluar lógica condicional
  const evaluateConditionals = useCallback((itemId, value) => {
    if (!initialSchema?.sections) return;

    const newVisible = new Set(visibleItems);

    initialSchema.sections.forEach(section => {
      section.items?.forEach(item => {
        // Soporte para formato antiguo (dependsOn)
        if (item.conditional?.dependsOn === itemId) {
          const { showWhen } = item.conditional;
          
          let shouldShow = false;
          try {
            shouldShow = evaluateCondition(showWhen, value);
          } catch (e) {
            console.error('Error evaluating conditional:', e);
          }

          if (shouldShow) {
            newVisible.add(item.id);
          } else {
            newVisible.delete(item.id);
            setAnswers(prev => {
              const updated = { ...prev };
              delete updated[item.id];
              return updated;
            });
          }
        }
        
        // Soporte para nuevo formato (conditional.enabled con rules)
        if (item.conditional?.enabled && item.conditional?.rules) {
          const rules = Array.isArray(item.conditional.rules) ? item.conditional.rules : [item.conditional.rules];
          
          // Evaluar todas las reglas (por ahora AND lógico)
          const allRulesSatisfied = rules.every(rule => evaluateConditionalRule(rule, value));
          
          if (allRulesSatisfied) {
            newVisible.add(item.id);
            
            // Ejecutar acciones si las reglas se cumplen
            rules.forEach(rule => {
              if (rule.actions?.includes('require_note')) {
                // Marcar campo como requerido si tiene la acción
                item.required = true;
              }
            });
          } else {
            newVisible.delete(item.id);
            setAnswers(prev => {
              const updated = { ...prev };
              delete updated[item.id];
              return updated;
            });
          }
        }
      });
    });

    setVisibleItems(newVisible);
  }, [initialSchema, visibleItems]);

  // Actualizar respuesta
  const updateAnswer = useCallback((itemId, value, itemConfig) => {
    setAnswers(prev => ({
      ...prev,
      [itemId]: {
        value,
        label: itemConfig?.label, // Guardar label para assets/locations
        timestamp: new Date().toISOString(),
        score: calculateItemScore(value, itemConfig)
      }
    }));

    // Evaluar condicionales
    evaluateConditionals(itemId, value);

    // Limpiar error si existe
    setErrors(prev => {
      const updated = { ...prev };
      delete updated[itemId];
      return updated;
    });
  }, [evaluateConditionals]);

  // Calcular score de un item
  const calculateItemScore = (value, itemConfig) => {
    if (!itemConfig.scoring?.enabled) return null;

    const { weight = 0, trueScore, falseScore, options } = itemConfig.scoring;

    // Para checkboxes
    if (itemConfig.type === 'checkbox') {
      return value ? trueScore : falseScore;
    }

    // Para selects con options
    if (options) {
      const option = options.find(opt => opt.value === value);
      return option?.score || 0;
    }

    return 0;
  };

  // Calcular score total
  useEffect(() => {
    if (!initialSchema?.scoring?.enabled) return;

    let totalScore = 0;
    let maxScore = 0;

    initialSchema.sections?.forEach(section => {
      section.items?.forEach(item => {
        if (item.scoring?.enabled && visibleItems.has(item.id)) {
          const answer = answers[item.id];
          if (answer?.score !== undefined && answer?.score !== null) {
            totalScore += answer.score;
          }
          maxScore += item.scoring.weight || 0;
        }
      });
    });

    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    setScore({ total: totalScore, max: maxScore, percentage: percentage.toFixed(2) });
  }, [answers, initialSchema, visibleItems]);

  // Validar formulario
  const runValidations = (sectionsToValidate) => {
    const validationErrors = {};

    sectionsToValidate?.forEach(section => {
      section.items?.forEach(item => {
        if (item.required && visibleItems.has(item.id)) {
          const answer = answers[item.id];
          if (!answer || answer.value === '' || answer.value === null || answer.value === undefined) {
            validationErrors[item.id] = 'Campo obligatorio';
          }

          if (answer && item.validation) {
            const { minLength, maxLength, min, max, pattern } = item.validation;
            const value = answer.value;

            if (minLength && value.length < minLength) {
              validationErrors[item.id] = `Mínimo ${minLength} caracteres`;
            }
            if (maxLength && value.length > maxLength) {
              validationErrors[item.id] = `Máximo ${maxLength} caracteres`;
            }
            if (min !== undefined && value < min) {
              validationErrors[item.id] = `Valor mínimo: ${min}`;
            }
            if (max !== undefined && value > max) {
              validationErrors[item.id] = `Valor máximo: ${max}`;
            }
            if (pattern && !new RegExp(pattern).test(value)) {
              validationErrors[item.id] = 'Formato inválido';
            }
          }
        }
      });
    });

    return validationErrors;
  };

  const validate = useCallback(() => {
    const newErrors = runValidations(initialSchema.sections);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [initialSchema, answers, visibleItems]);

  const validateSection = useCallback((sectionIdx) => {
    const section = initialSchema.sections?.[sectionIdx];
    if (!section) return true;

    const sectionErrors = runValidations([section]);

    setErrors(prev => {
      const cleaned = { ...prev };
      section.items?.forEach(item => {
        delete cleaned[item.id];
      });
      return { ...cleaned, ...sectionErrors };
    });

    return Object.keys(sectionErrors).length === 0;
  }, [initialSchema, answers, visibleItems]);

  return {
    answers,
    errors,
    score,
    visibleItems,
    updateAnswer,
    validate,
    validateSection
  };
};

/**
 * Componente principal de renderizado
 */
export default function FormRenderer({ 
  template, 
  initialAnswers = {}, 
  onSubmit, 
  mode = 'edit', // 'edit' | 'view'
  showScore = true 
}) {
  const schema = template?.schema || {
    sections: template?.sections || [],
    scoring: template?.scoring_config || template?.scoring || {}
  };
  const passingThreshold = template?.passing_threshold ?? schema.scoring?.passing_score ?? 70;
  const [assetOptions, setAssetOptions] = useState([]);
  const [locationOptions, setLocationOptions] = useState([]);
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);

  const { answers, errors, score, visibleItems, updateAnswer, validate, validateSection } = useFormState(
    schema,
    initialAnswers
  );

  // Navegación entre páginas/sections
  const goToSection = (nextIdx) => {
    setCurrentSectionIdx(nextIdx);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextSection = () => {
    const isValid = validateSection(currentSectionIdx);
    if (!isValid) {
      toast.error('Completa los campos obligatorios antes de continuar');
      return;
    }
    goToSection(currentSectionIdx + 1);
  };
  // Cargar activos si hay campos tipo asset
  useEffect(() => {
    const hasAssetField = schema.sections?.some(section =>
      section.items?.some(item => item.type === 'asset')
    );
    if (!hasAssetField) return;

    const loadAssets = async () => {
      try {
        const { data, error } = await supabase
          .from('assets')
          .select('id,ficha,marca,modelo,status,ubicacion_actual')
          .neq('status', 'VENDIDO');
        if (error) throw error;
        const opts = (data || []).map(a => ({
          value: a.id,
          label: a.ficha || [a.marca, a.modelo].filter(Boolean).join(' ') || `Activo ${a.id}`,
          subtitle: [a.marca, a.modelo].filter(Boolean).join(' '),
          status: a.status
        }));
        setAssetOptions(opts);
      } catch (err) {
        console.error('Error loading assets', err);
        toast.error('No se pudieron cargar los activos');
      }
    };

    loadAssets();
  }, [schema]);

  // Cargar ubicaciones si hay campos tipo location (derivadas de assets)
  useEffect(() => {
    const hasLocationField = schema.sections?.some(section =>
      section.items?.some(item => item.type === 'location')
    );
    if (!hasLocationField) return;

    const loadLocations = async () => {
      try {
        const { data, error } = await supabase
          .from('assets')
          .select('ubicacion_actual', { distinct: true })
          .not('ubicacion_actual', 'is', null);
        if (error) throw error;
        // Eliminar duplicados usando Set
        const uniqueLocations = [...new Set(
          (data || [])
            .map(r => r.ubicacion_actual)
            .filter(Boolean)
        )];
        const opts = uniqueLocations
          .sort()
          .map(u => ({ value: u, label: u }));
        setLocationOptions(opts);
      } catch (err) {
        console.error('Error loading locations', err);
        toast.error('No se pudieron cargar las ubicaciones');
      }
    };

    loadLocations();
  }, [schema]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const getFollowUpQuestions = useCallback((item) => {
    if (!item?.conditional?.enabled || !Array.isArray(item.conditional.rules)) return [];

    const currentValue = answers[item.id]?.value;

    return item.conditional.rules
      .map((rule, ruleIndex) => {
        if (!rule.actions?.includes('show_questions')) return null;
        if (!evaluateConditionalRule(rule, currentValue)) return null;

        const questionText = (rule.questionText || '').trim();
        return {
          id: `${item.id}_question_${ruleIndex}`,
          text: questionText || 'Pregunta adicional'
        };
      })
      .filter(Boolean);
  }, [answers]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        answers,
        score,
        passed: score.percentage >= passingThreshold
      });
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Error al enviar el formulario');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!schema?.sections || schema.sections.length === 0) {
    return <div className="text-red-500">Error: Template inválido</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      {/* Header con score */}
      {showScore && schema.scoring?.enabled && (
        <div className="bg-blue-50 border-b border-blue-100 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Puntuación Actual</h3>
              <p className="text-sm text-gray-600">
                {score.total} / {score.max} puntos
              </p>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-bold ${
                score.percentage >= passingThreshold ? 'text-green-600' : 'text-red-600'
              }`}>
                {score.percentage}%
              </div>
              <p className="text-xs text-gray-600">
                Mínimo requerido: {passingThreshold}%
              </p>
            </div>
          </div>
          
          {/* Barra de progreso */}
          <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                score.percentage >= passingThreshold ? 'bg-green-600' : 'bg-red-600'
              }`}
              style={{ width: `${score.percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="p-3 sm:p-6">
        {schema.sections?.map((section, sectionIdx) => (
          sectionIdx === currentSectionIdx && (
            <div key={section.id} className="mb-8">
              {/* Header de sección */}
              <div className="mb-4 flex flex-col sm:flex-row items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                    <span className="sm:hidden">Pág. {sectionIdx + 1}/{schema.sections.length}</span>
                    <span className="hidden sm:inline">Página {sectionIdx + 1} de {schema.sections.length}</span>
                    {' — '}{section.title}
                  </h3>
                  {section.description && (
                    <p className="text-sm text-gray-600 mt-1">{section.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {schema.sections.map((_, i) => (
                    <span
                      key={i}
                      className={`h-2 w-4 sm:w-6 rounded-full ${
                        i === currentSectionIdx ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Items de la sección */}
              <div className="space-y-4 pl-1">
                {section.items?.map((item) => {
                  if (!visibleItems.has(item.id)) return null;
                  const followUpQuestions = getFollowUpQuestions(item);

                  return (
                    <FormItem
                      key={item.id}
                      item={item}
                      value={answers[item.id]?.value}
                      error={errors[item.id]}
                      onChange={(value) => updateAnswer(item.id, value, item)}
                      assetOptions={assetOptions}
                      locationOptions={locationOptions}
                      answers={answers}
                      updateAnswer={updateAnswer}
                      followUpQuestions={followUpQuestions}
                      disabled={mode === 'view' || isSubmitting}
                    />
                  );
                })}
              </div>
            </div>
          )
        ))}

        {/* Botones */}
        {mode === 'edit' && (
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-6 pt-6 border-t">
            <button
              type="button"
              onClick={() => onSubmit(null)}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancelar
            </button>

            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto sm:flex-none">
              {currentSectionIdx > 0 && (
                <button
                  type="button"
                  onClick={() => goToSection(currentSectionIdx - 1)}
                  className="px-3 sm:px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm sm:text-base flex-1 sm:flex-none"
                  disabled={isSubmitting}
                >
                  Anterior
                </button>
              )}

              {currentSectionIdx < (schema.sections?.length || 1) - 1 ? (
                <button
                  type="button"
                  onClick={handleNextSection}
                  className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base flex-1 sm:flex-none"
                  disabled={isSubmitting}
                >
                  Siguiente
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-1.5 text-sm sm:text-base flex-1 sm:flex-none min-w-0"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span className="truncate">Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} className="shrink-0" />
                      <span className="truncate">Completar Inspección</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

/**
 * Componente para renderizar un item individual
 */
function FormItem({ item, value, error, onChange, disabled, assetOptions = [], locationOptions = [], answers = {}, updateAnswer, followUpQuestions = [] }) {
  const renderInput = () => {
    switch (item.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={item.placeholder}
            disabled={disabled}
            className={`w-full px-3 py-2 border rounded-lg ${
              error ? 'border-red-500' : 'border-gray-300'
            } ${disabled ? 'bg-gray-50' : ''}`}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={item.placeholder}
            rows={item.rows || 3}
            disabled={disabled}
            className={`w-full px-3 py-2 border rounded-lg ${
              error ? 'border-red-500' : 'border-gray-300'
            } ${disabled ? 'bg-gray-50' : ''}`}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            placeholder={item.placeholder}
            disabled={disabled}
            className={`w-full px-3 py-2 border rounded-lg ${
              error ? 'border-red-500' : 'border-gray-300'
            } ${disabled ? 'bg-gray-50' : ''}`}
          />
        );

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={`w-full px-3 py-2 border rounded-lg ${
              error ? 'border-red-500' : 'border-gray-300'
            } ${disabled ? 'bg-gray-50' : ''}`}
          >
            <option value="">-- Selecciona --</option>
            {item.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} {opt.score !== undefined && `(${opt.score} pts)`}
              </option>
            ))}
          </select>
        );

      case 'single_select':
        const colorMap = {
          green: { base: 'border-green-300 text-green-700 hover:bg-green-50', selected: 'bg-green-100 border-green-500 text-green-800 ring-2 ring-green-300' },
          red: { base: 'border-red-300 text-red-700 hover:bg-red-50', selected: 'bg-red-100 border-red-500 text-red-800 ring-2 ring-red-300' },
          yellow: { base: 'border-yellow-300 text-yellow-700 hover:bg-yellow-50', selected: 'bg-yellow-100 border-yellow-500 text-yellow-800 ring-2 ring-yellow-300' },
          blue: { base: 'border-blue-300 text-blue-700 hover:bg-blue-50', selected: 'bg-blue-100 border-blue-500 text-blue-800 ring-2 ring-blue-300' },
          gray: { base: 'border-gray-300 text-gray-700 hover:bg-gray-50', selected: 'bg-gray-100 border-gray-500 text-gray-800 ring-2 ring-gray-300' },
          orange: { base: 'border-orange-300 text-orange-700 hover:bg-orange-50', selected: 'bg-orange-100 border-orange-500 text-orange-800 ring-2 ring-orange-300' }
        };
        
        const selectedOption = item.options?.find(opt => opt.value === value);
        
        return (
          <div className="space-y-3">
            <div role="radiogroup" aria-label={item.label} className="grid grid-cols-1 gap-2 sm:gap-3">
              {(item.options || []).map((opt, idx) => {
                const colors = colorMap[opt.color] || colorMap.gray;
                const isSelected = value === opt.value;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onChange(opt.value)}
                    disabled={disabled}
                    className={`w-full text-center px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border transition-all text-sm sm:text-base ${isSelected ? colors.selected : colors.base} ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                  >
                    <span className="font-medium">{opt.value}</span>
                    {item.scoring?.enabled && opt.score !== undefined && (
                      <span className="ml-2 text-xs opacity-80">({opt.score} pts)</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Campos de seguimiento cuando se selecciona una opción */}
            {selectedOption && (selectedOption.requirePhoto || selectedOption.requireNote || selectedOption.requireField) && (
              <div className="pl-4 border-l-4 border-blue-400 space-y-3 pt-2">
                <p className="text-sm font-medium text-blue-700 flex items-center gap-2">
                  <span className="text-yellow-600">⚡</span>
                  {selectedOption.followUpLabel || `Información adicional para "${selectedOption.value}"`}
                </p>
                
                {selectedOption.requirePhoto && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Camera size={16} className="inline mr-1" />
                      Fotografía
                    </label>
                    {value && answers[`${item.id}_photo`]?.value ? (
                      <div className="relative inline-block">
                        <img 
                          src={answers[`${item.id}_photo`].value} 
                          alt="Preview" 
                          className="w-32 h-32 object-cover rounded-lg border" 
                        />
                        {!disabled && (
                          <button
                            type="button"
                            onClick={() => updateAnswer(`${item.id}_photo`, null, { type: 'photo' })}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <PhotoUpload 
                        value={answers[`${item.id}_photo`]?.value}
                        onChange={(val) => updateAnswer(`${item.id}_photo`, val, { type: 'photo' })}
                        disabled={disabled}
                        allowMultiple={selectedOption.allowMultiple}
                      />
                    )}
                  </div>
                )}

                {selectedOption.requireNote && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Edit3 size={16} className="inline mr-1" />
                      Nota / Comentario
                    </label>
                    <textarea
                      value={answers[`${item.id}_note`]?.value || ''}
                      onChange={(e) => updateAnswer(`${item.id}_note`, e.target.value, { type: 'textarea' })}
                      disabled={disabled}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Escriba aquí..."
                    />
                  </div>
                )}

                {selectedOption.requireField && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                      <AlertCircle size={16} />
                      {selectedOption.followUpLabel || 'Campo adicional'}
                    </label>
                    {selectedOption.fieldType === 'textarea' ? (
                      <textarea
                        value={answers[`${item.id}_field`]?.value || ''}
                        onChange={(e) => updateAnswer(`${item.id}_field`, e.target.value, { type: 'textarea' })}
                        disabled={disabled}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Ingrese la información..."
                      />
                    ) : (
                      <input
                        type={selectedOption.fieldType || 'text'}
                        value={answers[`${item.id}_field`]?.value || ''}
                        onChange={(e) => updateAnswer(`${item.id}_field`, e.target.value, { type: selectedOption.fieldType || 'text' })}
                        disabled={disabled}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Ingrese el valor..."
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'asset':
        const handleAssetChange = (e) => {
          const selectedId = e.target.value;
          const selectedAsset = assetOptions.find(opt => opt.value === selectedId);
          // Guardar tanto el ID como el label para mostrarlo en el PDF
          if (selectedAsset && updateAnswer) {
            updateAnswer(item.id, selectedId, { ...item, label: `${selectedAsset.label}${selectedAsset.subtitle ? ` - ${selectedAsset.subtitle}` : ''}` });
          } else {
            onChange(selectedId);
          }
        };
        
        return (
          <select
            value={value || ''}
            onChange={handleAssetChange}
            disabled={disabled}
            className={`w-full px-3 py-2 border rounded-lg ${
              error ? 'border-red-500' : 'border-gray-300'
            } ${disabled ? 'bg-gray-50' : ''}`}
          >
            <option value="">-- Selecciona un activo --</option>
            {assetOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} {opt.subtitle ? `- ${opt.subtitle}` : ''}
              </option>
            ))}
          </select>
        );

      case 'location':
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={`w-full px-3 py-2 border rounded-lg ${
              error ? 'border-red-500' : 'border-gray-300'
            } ${disabled ? 'bg-gray-50' : ''}`}
          >
            <option value="">-- Selecciona una ubicación --</option>
            {locationOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} {opt.subtitle ? `- ${opt.subtitle}` : ''}
              </option>
            ))}
          </select>
        );

      case 'area':
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={`w-full px-3 py-2 border rounded-lg ${
              error ? 'border-red-500' : 'border-gray-300'
            } ${disabled ? 'bg-gray-50' : ''}`}
          >
            <option value="">-- Selecciona un área --</option>
            {(item.options || []).map((opt, idx) => (
              <option key={idx} value={opt.value || opt}>
                {opt.label || opt}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => onChange(e.target.checked)}
              disabled={disabled}
              className="w-5 h-5"
            />
            <span className={disabled ? 'text-gray-500' : 'text-gray-900'}>
              {item.label}
            </span>
          </label>
        );

      case 'date':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={`w-full px-3 py-2 border rounded-lg ${
              error ? 'border-red-500' : 'border-gray-300'
            } ${disabled ? 'bg-gray-50' : ''}`}
          />
        );

      case 'datetime':
        return (
          <input
            type="datetime-local"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={`w-full px-3 py-2 border rounded-lg ${
              error ? 'border-red-500' : 'border-gray-300'
            } ${disabled ? 'bg-gray-50' : ''}`}
          />
        );

      case 'photo':
        return <PhotoUpload value={value} onChange={onChange} disabled={disabled} allowMultiple={item.allowMultiple} />;

      case 'signature':
        return <SignatureCapture value={value} onChange={onChange} disabled={disabled} />;

      case 'rating':
        return (
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => onChange(star)}
                disabled={disabled}
                className={`text-2xl ${
                  value >= star ? 'text-yellow-400' : 'text-gray-300'
                }`}
              >
                ★
              </button>
            ))}
          </div>
        );

      default:
        return <div className="text-gray-500">Tipo no soportado: {item.type}</div>;
    }
  };

  return (
    <div className="space-y-2">
      {/* Label (no se muestra si es checkbox, ya que va inline) */}
      {item.type !== 'checkbox' && (
        <label className="block text-sm font-medium text-gray-700">
          {item.label}
          {item.required && <span className="text-red-500 ml-1">*</span>}
          {item.scoring?.enabled && (
            <span className="ml-2 text-xs text-blue-600">
              ({item.scoring.weight} pts)
            </span>
          )}
        </label>
      )}

      {/* Help text */}
      {item.helpText && (
        <p className="text-xs text-gray-500">{item.helpText}</p>
      )}

      {/* Input */}
      {renderInput()}

      {followUpQuestions.length > 0 && (
        <div className="pl-4 border-l-4 border-indigo-400 space-y-3 pt-2">
          <p className="text-sm font-medium text-indigo-700 flex items-center gap-2">
            <span>💬</span>
            Preguntas adicionales
          </p>
          {followUpQuestions.map((question) => (
            <div key={question.id} className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                {question.text}
              </label>
              <input
                type="text"
                value={answers[question.id]?.value || ''}
                onChange={(e) => updateAnswer(question.id, e.target.value, { type: 'text', label: question.text })}
                disabled={disabled}
                placeholder="Escribe tu respuesta..."
                className={`w-full px-3 py-2 border rounded-lg ${disabled ? 'bg-gray-50' : ''}`}
              />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-1 text-red-600 text-sm">
          <AlertCircle size={14} />
          {error}
        </div>
      )}
    </div>
  );
}

/**
 * Componente para subir fotos
 */
function PhotoUpload({ value, onChange, disabled, allowMultiple = false }) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
        const filePath = `public/hse-inspections/${fileName}`;

        const { error } = await supabase.storage
          .from('uploads')
          .upload(filePath, file, { contentType: file.type, upsert: false });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('uploads')
          .getPublicUrl(filePath);

        return publicUrl;
      });

      const urls = await Promise.all(uploadPromises);
      
      if (allowMultiple) {
        // Si permite múltiples, agregar a la lista existente
        const currentUrls = Array.isArray(value) ? value : (value ? [value] : []);
        onChange([...currentUrls, ...urls]);
      } else {
        // Si no permite múltiples, reemplazar con el primero
        onChange(urls[0]);
      }
    } catch (error) {
      console.error('Error uploading photo:', error);

      // Fallback: si RLS bloquea el upload, guardamos base64 local para no romper flujo
      try {
        const toBase64 = (fileObj) => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(fileObj);
        });

        const dataUrlsPromises = Array.from(files).map(file => toBase64(file));
        const dataUrls = await Promise.all(dataUrlsPromises);
        
        if (allowMultiple) {
          const currentUrls = Array.isArray(value) ? value : (value ? [value] : []);
          onChange([...currentUrls, ...dataUrls]);
        } else {
          onChange(dataUrls[0]);
        }
        toast.success('Guardado local (sin subir). Revisa permisos del bucket uploads.');
      } catch (fallbackErr) {
        console.error('Error fallback base64:', fallbackErr);
        toast.error('No se pudo guardar la foto. Revisa permisos del bucket uploads.');
      }
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (urlToRemove) => {
    if (allowMultiple && Array.isArray(value)) {
      onChange(value.filter(url => url !== urlToRemove));
    } else {
      onChange(null);
    }
  };

  // Normalizar valor a array si permite múltiples
  const photos = allowMultiple 
    ? (Array.isArray(value) ? value : (value ? [value] : []))
    : (value ? [value] : []);

  return (
    <div>
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
          {photos.map((url, index) => (
            <div key={index} className="relative inline-block">
              <img src={url} alt={`Preview ${index + 1}`} className="w-full h-32 object-cover rounded-lg" />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removePhoto(url)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      
      <label className={`flex flex-col items-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg ${
        disabled ? 'bg-gray-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50 active:bg-gray-100'
      }`}>
        <Camera size={24} className="text-gray-400" />
        <span className="text-sm text-gray-600 font-medium text-center">
          {uploading ? 'Subiendo...' : (allowMultiple ? 'Tomar / Subir Fotos' : 'Tomar / Subir Foto')}
        </span>
        {allowMultiple && !uploading && (
          <span className="text-xs text-gray-500">
            {photos.length > 0 ? `${photos.length} foto${photos.length > 1 ? 's' : ''} agregada${photos.length > 1 ? 's' : ''}` : 'Selecciona múltiples archivos'}
          </span>
        )}
        <input
          type="file"
          accept="image/*,video/*"
          capture="environment"
          multiple={allowMultiple}
          onChange={handleFileChange}
          disabled={disabled || uploading}
          className="hidden"
          data-testid="photo-upload-input"
        />
      </label>
    </div>
  );
}

/**
 * Componente para captura de firma
 */
function SignatureCapture({ value, onChange, disabled }) {
  const canvasRef = React.useRef(null);
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);
  const [textSignature, setTextSignature] = React.useState(value?.startsWith?.('text:') ? value.replace('text:', '') : '');

  React.useEffect(() => {
    // Detectar si es móvil o tablet
    const checkMobile = () => {
      setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  React.useEffect(() => {
    if (value && !value.startsWith('text:') && canvasRef.current && isMobile) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = value;
    }
  }, [value, isMobile]);

  const startDrawing = (e) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing || disabled) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    onChange(canvas.toDataURL());
  };

  const clearSignature = () => {
    if (disabled) return;
    if (isMobile) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      onChange(null);
    } else {
      setTextSignature('');
      onChange(null);
    }
  };

  const handleTextChange = (e) => {
    const text = e.target.value;
    setTextSignature(text);
    onChange(text ? `text:${text}` : null);
  };

  if (isMobile) {
    // Modo canvas para móviles
    return (
      <div className="border-2 border-gray-300 rounded-lg p-4">
        <p className="text-sm text-gray-600 mb-2">Dibuje su firma con el dedo:</p>
        <canvas
          ref={canvasRef}
          width={400}
          height={200}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full border border-gray-300 rounded bg-white touch-none"
          style={{ touchAction: 'none' }}
        />
        {!disabled && (
          <button
            type="button"
            onClick={clearSignature}
            className="mt-2 text-sm text-red-600 hover:underline"
          >
            Limpiar firma
          </button>
        )}
      </div>
    );
  }

  // Modo texto para PC
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Nombre completo del inspector:
      </label>
      <input
        type="text"
        value={textSignature}
        onChange={handleTextChange}
        disabled={disabled}
        placeholder="Ej: Juan Pérez García"
        className={`w-full px-3 py-2 border rounded-lg ${disabled ? 'bg-gray-50' : ''}`}
      />
      {textSignature && (
        <div className="mt-3 p-4 bg-gray-50 border rounded-lg">
          <p className="text-xs text-gray-500 mb-2">Vista previa:</p>
          <p className="text-2xl font-signature italic text-gray-800">{textSignature}</p>
        </div>
      )}
    </div>
  );
}
