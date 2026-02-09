/**
 * TemplateBuilderV2.jsx
 * Editor visual de plantillas HSE estilo Google Forms
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, Save, Eye, X, GripVertical, MoreVertical,
  Copy, Trash2, Edit3, ChevronDown, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';
import { createTemplate, updateTemplate, getTemplateById } from '../../services/hseService';

// Tipos de campo disponibles
const FIELD_TYPES = [
  { value: 'text', label: 'Respuesta de texto', icon: '📝', description: 'Texto corto en una línea' },
  { value: 'textarea', label: 'Párrafo', icon: '📄', description: 'Texto largo en varias líneas' },
  { value: 'number', label: 'Número', icon: '🔢', description: 'Respuesta numérica' },
  { value: 'date', label: 'Fecha de la inspección', icon: '📅', description: 'Seleccionar fecha' },
  { value: 'datetime', label: 'Fecha y hora', icon: '🕐', description: 'Seleccionar fecha y hora' },
  { value: 'single_select', label: 'Selección única', icon: '🔘', description: 'Opciones de respuesta única' },
  { value: 'checkbox', label: 'Casilla de verificación', icon: '☑️', description: 'Sí/No' },
  { value: 'asset', label: 'Activo', icon: '📦', description: 'Selector de activo' },
  { value: 'location', label: 'Ubicación', icon: '📍', description: 'Selector de ubicación' },
  { value: 'area', label: 'Sitio', icon: '🏢', description: 'Área o sitio de trabajo' },
  { value: 'photo', label: 'Archivos multimedia', icon: '📷', description: 'Foto o video' },
  { value: 'signature', label: 'Firma', icon: '✍️', description: 'Firma digital' },
  { value: 'rating', label: 'Control deslizante', icon: '⭐', description: 'Calificación o escala' },
  { value: 'instruction', label: 'Instrucción', icon: 'ℹ️', description: 'Texto informativo (no es pregunta)' },
  { value: 'file_number', label: 'Número del archivo', icon: '🔢', description: 'Número de archivo o folio' },
  { value: 'company', label: 'Empresa', icon: '🏭', description: 'Nombre de empresa' },
  { value: 'annotation', label: 'Anotación', icon: '✏️', description: 'Campo de anotaciones' },
];

// Presets predefinidos para selección simple
const DEFAULT_PRESETS = [
  {
    id: 'quality',
    name: 'Calidad',
    options: [
      { value: 'Buena', label: 'Buena', color: 'green' },
      { value: 'Razonable', label: 'Razonable', color: 'yellow' },
      { value: 'Deficiente', label: 'Deficiente', color: 'red' }
    ]
  },
  {
    id: 'safety',
    name: 'Seguridad',
    options: [
      { value: 'Seguro', label: 'Seguro', color: 'green' },
      { value: 'En riesgo', label: 'En riesgo', color: 'red' },
      { value: 'N/A', label: 'N/A', color: 'gray' }
    ]
  },
  {
    id: 'approval',
    name: 'Aprobación',
    options: [
      { value: 'Aprueba', label: 'Aprueba', color: 'green' },
      { value: 'Falla', label: 'Falla', color: 'red' },
      { value: 'N/A', label: 'N/A', color: 'gray' }
    ]
  },
  {
    id: 'yesno',
    name: 'Sí/No',
    options: [
      { value: 'Sí', label: 'Sí', color: 'green' },
      { value: 'No', label: 'No', color: 'red' }
    ]
  },
  {
    id: 'compliance',
    name: 'Cumplimiento',
    options: [
      { value: 'Cumple', label: 'Cumple', color: 'green' },
      { value: 'No cumple', label: 'No cumple', color: 'red' },
      { value: 'N/A', label: 'N/A', color: 'gray' }
    ]
  }
];

export default function TemplateBuilderV2({ templateId, onClose, onSave }) {
  const [template, setTemplate] = useState({
    name: 'Plantilla sin título',
    description: '',
    category: 'general',
    sections: [{
      id: 'section_1',
      title: 'Sección sin título',
      description: '',
      items: []
    }],
    scoring_config: {
      enabled: false,
      max_score: 100,
      passing_score: 70
    }
  });

  const [selectedItem, setSelectedItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [customPresets, setCustomPresets] = useState([]);
  const [showNewPresetModal, setShowNewPresetModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  // Cargar presets personalizados del localStorage
  useEffect(() => {
    const saved = localStorage.getItem('hse_select_presets');
    if (saved) {
      try {
        setCustomPresets(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading presets:', error);
      }
    }
  }, []);

  // Combinar presets predefinidos con personalizados
  const allPresets = [...DEFAULT_PRESETS, ...customPresets];

  useEffect(() => {
    if (templateId) {
      loadTemplate();
    }
  }, [templateId]);

  const loadTemplate = async () => {
    try {
      const data = await getTemplateById(templateId);
      setTemplate(data);
    } catch (error) {
      console.error('Error loading template:', error);
      toast.error('Error al cargar plantilla');
    }
  };

  // Agregar nueva sección
  const addSection = () => {
    const newSection = {
      id: `section_${Date.now()}`,
      title: 'Sección sin título',
      description: '',
      items: []
    };
    
    setTemplate(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
    
    toast.success('Sección agregada');
  };

  // Eliminar sección
  const deleteSection = (sectionId) => {
    if (template.sections.length === 1) {
      toast.error('Debe haber al menos una sección');
      return;
    }
    
    if (!window.confirm('¿Eliminar esta sección y todas sus preguntas?')) {
      return;
    }
    
    setTemplate(prev => ({
      ...prev,
      sections: prev.sections.filter(s => s.id !== sectionId)
    }));
    
    toast.success('Sección eliminada');
  };

  // Agregar campo
  const addField = (sectionId, type = 'text') => {
    const newItem = {
      id: `item_${Date.now()}`,
      type,
      label: 'Pregunta sin título',
      required: false,
      placeholder: '',
      helpText: '',
      options: type === 'single_select' || type === 'select' ? [
        { value: 'Sí', label: 'Sí', color: 'green' },
        { value: 'No', label: 'No', color: 'red' }
      ] : [],
      validation: {},
      conditional: null
    };

    setTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? { ...section, items: [...section.items, newItem] }
          : section
      )
    }));

    setSelectedItem({ sectionId, itemId: newItem.id });
  };

  // Duplicar campo
  const duplicateField = (sectionId, itemId) => {
    setTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section => {
        if (section.id === sectionId) {
          const itemIndex = section.items.findIndex(i => i.id === itemId);
          if (itemIndex !== -1) {
            const itemToDuplicate = section.items[itemIndex];
            const duplicated = {
              ...itemToDuplicate,
              id: `item_${Date.now()}`,
              label: `${itemToDuplicate.label} (copia)`
            };
            const newItems = [...section.items];
            newItems.splice(itemIndex + 1, 0, duplicated);
            return { ...section, items: newItems };
          }
        }
        return section;
      })
    }));
  };

  // Eliminar campo
  const deleteField = (sectionId, itemId) => {
    setTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? { ...section, items: section.items.filter(i => i.id !== itemId) }
          : section
      )
    }));
    if (selectedItem?.itemId === itemId) {
      setSelectedItem(null);
    }
  };

  // Actualizar campo
  const updateField = (sectionId, itemId, updates) => {
    setTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map(item =>
                item.id === itemId ? { ...item, ...updates } : item
              )
            }
          : section
      )
    }));
  };

  // Agregar opción a campo de selección
  const addOption = (sectionId, itemId) => {
    const section = template.sections.find(s => s.id === sectionId);
    const item = section?.items.find(i => i.id === itemId);
    if (!item) return;

    const newOption = {
      value: `Opción ${(item.options?.length || 0) + 1}`,
      label: `Opción ${(item.options?.length || 0) + 1}`,
      color: 'gray'
    };

    updateField(sectionId, itemId, {
      options: [...(item.options || []), newOption]
    });
  };

  // Actualizar opción
  const updateOption = (sectionId, itemId, optionIndex, updates) => {
    const section = template.sections.find(s => s.id === sectionId);
    const item = section?.items.find(i => i.id === itemId);
    if (!item) return;

    const newOptions = [...(item.options || [])];
    newOptions[optionIndex] = { ...newOptions[optionIndex], ...updates };

    updateField(sectionId, itemId, { options: newOptions });
  };

  // Eliminar opción
  const deleteOption = (sectionId, itemId, optionIndex) => {
    const section = template.sections.find(s => s.id === sectionId);
    const item = section?.items.find(i => i.id === itemId);
    if (!item) return;

    const newOptions = item.options.filter((_, idx) => idx !== optionIndex);
    updateField(sectionId, itemId, { options: newOptions });
  };

  // Aplicar preset a campo
  const applyPreset = (sectionId, itemId, presetId) => {
    const preset = allPresets.find(p => p.id === presetId);
    if (!preset) return;

    updateField(sectionId, itemId, {
      options: JSON.parse(JSON.stringify(preset.options)) // Deep copy
    });
    toast.success(`Preset "${preset.name}" aplicado`);
  };

  // Guardar opciones actuales como nuevo preset
  const saveAsPreset = () => {
    if (!selectedItem || !newPresetName.trim()) {
      toast.error('Ingresa un nombre para el preset');
      return;
    }

    const section = template.sections.find(s => s.id === selectedItem.sectionId);
    const item = section?.items.find(i => i.id === selectedItem.itemId);
    if (!item || !item.options || item.options.length === 0) {
      toast.error('Agrega al menos una opción antes de guardar');
      return;
    }

    const newPreset = {
      id: `custom_${Date.now()}`,
      name: newPresetName.trim(),
      options: JSON.parse(JSON.stringify(item.options))
    };

    const updatedPresets = [...customPresets, newPreset];
    setCustomPresets(updatedPresets);
    localStorage.setItem('hse_select_presets', JSON.stringify(updatedPresets));

    setNewPresetName('');
    setShowNewPresetModal(false);
    toast.success(`Preset "${newPreset.name}" guardado`);
  };

  // Eliminar preset personalizado
  const deletePreset = (presetId) => {
    if (!window.confirm('¿Eliminar este preset?')) return;

    const updatedPresets = customPresets.filter(p => p.id !== presetId);
    setCustomPresets(updatedPresets);
    localStorage.setItem('hse_select_presets', JSON.stringify(updatedPresets));
    toast.success('Preset eliminado');
  };

  // Guardar plantilla
  const handleSave = async () => {
    if (!template.name.trim()) {
      toast.error('El nombre de la plantilla es requerido');
      return;
    }

    try {
      setSaving(true);
      
      const templateData = {
        ...template,
        sections: template.sections.map(section => ({
          ...section,
          items: section.items.map(item => ({
            ...item,
            // Asegurar que los campos tengan la estructura correcta
            options: item.options || [],
            validation: item.validation || {},
            conditional: item.conditional || null
          }))
        }))
      };

      if (templateId) {
        await updateTemplate(templateId, templateData);
        toast.success('Plantilla actualizada');
      } else {
        await createTemplate(templateData);
        toast.success('Plantilla creada');
      }

      if (onSave) onSave();
      if (onClose) onClose();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Error al guardar plantilla');
    } finally {
      setSaving(false);
    }
  };

  const getSelectedItemData = () => {
    if (!selectedItem) return null;
    const section = template.sections.find(s => s.id === selectedItem.sectionId);
    const item = section?.items.find(i => i.id === selectedItem.itemId);
    return { section, item };
  };

  const { section: selectedSection, item: selectedItemData } = getSelectedItemData() || {};

  return (
    <div className="fixed inset-0 bg-gray-100 z-50 overflow-hidden">
      {/* Top Bar */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900"
          >
            <X size={24} />
          </button>
          <div>
            <input
              type="text"
              value={template.name}
              onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
              className="text-2xl font-bold border-none focus:outline-none focus:ring-0 bg-transparent"
              placeholder="Plantilla sin título"
            />
            <input
              type="text"
              value={template.description}
              onChange={(e) => setTemplate(prev => ({ ...prev, description: e.target.value }))}
              className="text-sm text-gray-600 border-none focus:outline-none focus:ring-0 bg-transparent mt-1 block"
              placeholder="Descripción de la plantilla"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 flex items-center gap-2"
          >
            <Save size={18} />
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Editor Principal */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-3xl mx-auto space-y-4">
            {template.sections.map((section, sectionIdx) => (
              <div key={section.id} className="space-y-4">
                {/* Section Header */}
                <div className="bg-white rounded-lg border-t-4 border-purple-600 p-6">
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => setTemplate(prev => ({
                      ...prev,
                      sections: prev.sections.map((s, idx) =>
                        idx === sectionIdx ? { ...s, title: e.target.value } : s
                      )
                    }))}
                    className="text-xl font-bold w-full border-none focus:outline-none focus:ring-0 bg-transparent"
                    placeholder="Título de la sección"
                  />
                  <input
                    type="text"
                    value={section.description}
                    onChange={(e) => setTemplate(prev => ({
                      ...prev,
                      sections: prev.sections.map((s, idx) =>
                        idx === sectionIdx ? { ...s, description: e.target.value } : s
                      )
                    }))}
                    className="text-sm text-gray-600 w-full border-none focus:outline-none focus:ring-0 bg-transparent mt-2"
                    placeholder="Descripción de la sección"
                  />
                </div>

                {/* Fields */}
                {section.items.map((item, itemIdx) => (
                  <FieldCard
                    key={item.id}
                    item={item}
                    section={section}
                    isSelected={selectedItem?.itemId === item.id}
                    onClick={() => setSelectedItem({ sectionId: section.id, itemId: item.id })}
                    onUpdate={(updates) => updateField(section.id, item.id, updates)}
                    onDuplicate={() => duplicateField(section.id, item.id)}
                    onDelete={() => deleteField(section.id, item.id)}
                  />
                ))}

                {/* Add Field Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => addField(section.id)}
                    className="flex-1 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 text-gray-600 hover:text-purple-600 flex items-center justify-center gap-2 font-medium"
                  >
                    <Plus size={20} />
                    Agregar pregunta
                  </button>
                  
                  {sectionIdx === template.sections.length - 1 && (
                    <button
                      onClick={addSection}
                      className="flex-1 py-3 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 text-blue-600 hover:text-blue-700 flex items-center justify-center gap-2 font-medium"
                    >
                      <Plus size={20} />
                      Agregar sección
                    </button>
                  )}
                </div>

                {/* Delete Section Button */}
                {template.sections.length > 1 && (
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => deleteSection(section.id)}
                      className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                    >
                      <Trash2 size={14} />
                      Eliminar sección
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Panel Lateral Derecho */}
        {selectedItem && selectedItemData && (
          <div className="w-96 bg-white border-l overflow-y-auto p-6">
            <h3 className="text-lg font-bold mb-4">Configuración del campo</h3>

            {/* Tipo de campo */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de respuesta
              </label>
              <select
                value={selectedItemData.type}
                onChange={(e) => updateField(selectedItem.sectionId, selectedItem.itemId, { type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                {FIELD_TYPES.map(ft => (
                  <option key={ft.value} value={ft.value}>
                    {ft.icon} {ft.label}
                  </option>
                ))}
              </select>
              {FIELD_TYPES.find(f => f.value === selectedItemData.type)?.description && (
                <p className="text-xs text-gray-500 mt-1">
                  {FIELD_TYPES.find(f => f.value === selectedItemData.type)?.description}
                </p>
              )}
            </div>

            {/* Opciones para select con presets */}
            {(selectedItemData.type === 'single_select' || selectedItemData.type === 'select') && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Opciones de respuesta
                  </label>
                  <button
                    onClick={() => setShowNewPresetModal(true)}
                    className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
                  >
                    <Save size={12} />
                    Guardar preset
                  </button>
                </div>

                {/* Selector de presets */}
                <div className="mb-3">
                  <label className="block text-xs text-gray-600 mb-1">Usar preset:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {allPresets.map(preset => (
                      <button
                        key={preset.id}
                        onClick={() => applyPreset(selectedItem.sectionId, selectedItem.itemId, preset.id)}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-purple-50 hover:border-purple-400 text-left relative group"
                      >
                        {preset.name}
                        {preset.id.startsWith('custom_') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePreset(preset.id);
                            }}
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-700"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-3">
                  <label className="block text-xs text-gray-600 mb-2">Opciones personalizadas:</label>
                  {(selectedItemData.options || []).map((option, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        value={option.label}
                        onChange={(e) => updateOption(selectedItem.sectionId, selectedItem.itemId, idx, { label: e.target.value, value: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder={`Opción ${idx + 1}`}
                      />
                      <select
                        value={option.color}
                        onChange={(e) => updateOption(selectedItem.sectionId, selectedItem.itemId, idx, { color: e.target.value })}
                        className="px-2 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="gray">⚪</option>
                        <option value="green">🟢</option>
                        <option value="red">🔴</option>
                        <option value="yellow">🟡</option>
                        <option value="blue">🔵</option>
                      </select>
                      <button
                        onClick={() => deleteOption(selectedItem.sectionId, selectedItem.itemId, idx)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addOption(selectedItem.sectionId, selectedItem.itemId)}
                    className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                  >
                    <Plus size={16} />
                    Agregar opción
                  </button>
                </div>
              </div>
            )}

            {/* Requerido */}
            <div className="mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedItemData.required || false}
                  onChange={(e) => updateField(selectedItem.sectionId, selectedItem.itemId, { required: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm font-medium text-gray-700">Campo obligatorio</span>
              </label>
            </div>

            {/* Texto de ayuda */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Texto de ayuda
              </label>
              <input
                type="text"
                value={selectedItemData.helpText || ''}
                onChange={(e) => updateField(selectedItem.sectionId, selectedItem.itemId, { helpText: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Instrucciones adicionales..."
              />
            </div>

            {/* Permitir múltiples fotos */}
            {selectedItemData.type === 'photo' && (
              <div className="mb-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedItemData.allowMultiple || false}
                    onChange={(e) => updateField(selectedItem.sectionId, selectedItem.itemId, { allowMultiple: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Permitir múltiples archivos</span>
                </label>
              </div>
            )}

            {/* Lógica Condicional */}
            <div className="mb-4 border-t pt-4 mt-6">
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => {
                    const hasLogic = selectedItemData.conditional;
                    if (hasLogic) {
                      updateField(selectedItem.sectionId, selectedItem.itemId, { conditional: null });
                    } else {
                      updateField(selectedItem.sectionId, selectedItem.itemId, {
                        conditional: {
                          enabled: true,
                          rules: [{
                            condition: 'not_blank',
                            value: '',
                            actions: []
                          }]
                        }
                      });
                    }
                  }}
                  className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1 font-medium"
                >
                  <Zap size={16} />
                  {selectedItemData.conditional ? 'Quitar lógica' : 'Agregar lógica'}
                </button>
                
                {selectedItemData.conditional && (
                  <button
                    onClick={() => {
                      const currentRules = selectedItemData.conditional.rules || [];
                      const newConditional = {
                        ...selectedItemData.conditional,
                        rules: [...currentRules, {
                          condition: 'equals',
                          value: '',
                          actions: []
                        }]
                      };
                      updateField(selectedItem.sectionId, selectedItem.itemId, { conditional: newConditional });
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus size={14} />
                    Agregar regla
                  </button>
                )}
              </div>

              {selectedItemData.conditional && (
                <div className="mt-4 space-y-4">
                  {/* Loop por cada regla */}
                  {(selectedItemData.conditional.rules || []).map((rule, ruleIndex) => (
                    <div key={ruleIndex} className="border border-gray-200 rounded-lg p-3 bg-gray-50 relative">
                      {/* Botón eliminar regla */}
                      {selectedItemData.conditional.rules.length > 1 && (
                        <button
                          onClick={() => {
                            const newRules = selectedItemData.conditional.rules.filter((_, idx) => idx !== ruleIndex);
                            updateField(selectedItem.sectionId, selectedItem.itemId, {
                              conditional: { ...selectedItemData.conditional, rules: newRules }
                            });
                          }}
                          className="absolute top-2 right-2 text-red-600 hover:text-red-700"
                        >
                          <X size={16} />
                        </button>
                      )}

                      <div className="space-y-3">
                        {/* Condición */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Si respuesta
                          </label>
                          <select
                            value={rule.condition || 'not_blank'}
                            onChange={(e) => {
                              const newRules = [...selectedItemData.conditional.rules];
                              newRules[ruleIndex] = { ...newRules[ruleIndex], condition: e.target.value };
                              updateField(selectedItem.sectionId, selectedItem.itemId, {
                                conditional: { ...selectedItemData.conditional, rules: newRules }
                              });
                            }}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white"
                          >
                            <option value="not_blank">no es en blanco</option>
                            <option value="is_blank">es en blanco</option>
                            <option value="equals">es igual a</option>
                            <option value="not_equals">no es igual a</option>
                          </select>
                        </div>

                        {/* Campo de valor para equals/not_equals */}
                        {(rule.condition === 'equals' || rule.condition === 'not_equals') && (
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Valor
                            </label>
                            {(selectedItemData.type === 'single_select' || selectedItemData.type === 'select') && selectedItemData.options?.length > 0 ? (
                              <select
                                value={rule.value || ''}
                                onChange={(e) => {
                                  const newRules = [...selectedItemData.conditional.rules];
                                  newRules[ruleIndex] = { ...newRules[ruleIndex], value: e.target.value };
                                  updateField(selectedItem.sectionId, selectedItem.itemId, {
                                    conditional: { ...selectedItemData.conditional, rules: newRules }
                                  });
                                }}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white"
                              >
                                <option value="">Selecciona una opción...</option>
                                {selectedItemData.options.map((opt, idx) => (
                                  <option key={idx} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                value={rule.value || ''}
                                onChange={(e) => {
                                  const newRules = [...selectedItemData.conditional.rules];
                                  newRules[ruleIndex] = { ...newRules[ruleIndex], value: e.target.value };
                                  updateField(selectedItem.sectionId, selectedItem.itemId, {
                                    conditional: { ...selectedItemData.conditional, rules: newRules }
                                  });
                                }}
                                placeholder="Ingresa el valor..."
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white"
                              />
                            )}
                          </div>
                        )}

                        {/* Acciones */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">
                            entonces
                          </label>
                          <div className="space-y-2">
                            {/* Hacer preguntas */}
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={rule.actions?.includes('show_questions') || false}
                                onChange={(e) => {
                                  const newRules = [...selectedItemData.conditional.rules];
                                  const currentActions = newRules[ruleIndex].actions || [];
                                  newRules[ruleIndex].actions = e.target.checked 
                                    ? [...currentActions, 'show_questions']
                                    : currentActions.filter(a => a !== 'show_questions');
                                  updateField(selectedItem.sectionId, selectedItem.itemId, {
                                    conditional: { ...selectedItemData.conditional, rules: newRules }
                                  });
                                }}
                                className="rounded"
                              />
                              <span>💬 Haga preguntas</span>
                            </label>

                            {/* Notificar */}
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={rule.actions?.includes('notify') || false}
                                onChange={(e) => {
                                  const newRules = [...selectedItemData.conditional.rules];
                                  const currentActions = newRules[ruleIndex].actions || [];
                                  newRules[ruleIndex].actions = e.target.checked 
                                    ? [...currentActions, 'notify']
                                    : currentActions.filter(a => a !== 'notify');
                                  updateField(selectedItem.sectionId, selectedItem.itemId, {
                                    conditional: { ...selectedItemData.conditional, rules: newRules }
                                  });
                                }}
                                className="rounded"
                              />
                              <span>🔔 Notificar</span>
                            </label>

                            {/* Requerir nota */}
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={rule.actions?.includes('require_note') || false}
                                onChange={(e) => {
                                  const newRules = [...selectedItemData.conditional.rules];
                                  const currentActions = newRules[ruleIndex].actions || [];
                                  newRules[ruleIndex].actions = e.target.checked 
                                    ? [...currentActions, 'require_note']
                                    : currentActions.filter(a => a !== 'require_note');
                                  updateField(selectedItem.sectionId, selectedItem.itemId, {
                                    conditional: { ...selectedItemData.conditional, rules: newRules }
                                  });
                                }}
                                className="rounded"
                              />
                              <span>📝 Se requiere nota</span>
                            </label>

                            {/* Requerir archivos */}
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={rule.actions?.includes('require_files') || false}
                                onChange={(e) => {
                                  const newRules = [...selectedItemData.conditional.rules];
                                  const currentActions = newRules[ruleIndex].actions || [];
                                  newRules[ruleIndex].actions = e.target.checked 
                                    ? [...currentActions, 'require_files']
                                    : currentActions.filter(a => a !== 'require_files');
                                  updateField(selectedItem.sectionId, selectedItem.itemId, {
                                    conditional: { ...selectedItemData.conditional, rules: newRules }
                                  });
                                }}
                                className="rounded"
                              />
                              <span>📎 Se requieren archivos multimedia</span>
                            </label>

                            {/* Requerir acción */}
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={rule.actions?.includes('require_action') || false}
                                onChange={(e) => {
                                  const newRules = [...selectedItemData.conditional.rules];
                                  const currentActions = newRules[ruleIndex].actions || [];
                                  newRules[ruleIndex].actions = e.target.checked 
                                    ? [...currentActions, 'require_action']
                                    : currentActions.filter(a => a !== 'require_action');
                                  updateField(selectedItem.sectionId, selectedItem.itemId, {
                                    conditional: { ...selectedItemData.conditional, rules: newRules }
                                  });
                                }}
                                className="rounded"
                              />
                              <span>⚡ Se requiere acción</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal para guardar nuevo preset */}
      {showNewPresetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Guardar como preset</h3>
            <p className="text-sm text-gray-600 mb-4">
              Las opciones actuales se guardarán como un preset reutilizable.
            </p>
            <input
              type="text"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="Nombre del preset (ej: Estados de equipo)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
              autoFocus
              onKeyPress={(e) => e.key === 'Enter' && saveAsPreset()}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowNewPresetModal(false);
                  setNewPresetName('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={saveAsPreset}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Guardar preset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente de tarjeta de campo
function FieldCard({ item, section, isSelected, onClick, onUpdate, onDuplicate, onDelete }) {
  const fieldTypeInfo = FIELD_TYPES.find(ft => ft.value === item.type);

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg p-6 border-2 cursor-pointer transition-all ${
        isSelected ? 'border-purple-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{fieldTypeInfo?.icon}</span>
            <span className="text-xs text-gray-500">{fieldTypeInfo?.label}</span>
          </div>
          <input
            type="text"
            value={item.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            className="text-base font-medium w-full border-none focus:outline-none bg-transparent"
            placeholder="Pregunta sin título"
            onClick={(e) => e.stopPropagation()}
          />
          {item.helpText && (
            <p className="text-sm text-gray-500 mt-1">{item.helpText}</p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
            title="Duplicar"
          >
            <Copy size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
            title="Eliminar"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Indicador de lógica condicional */}
      {item.conditional?.enabled && (
        <div className="mt-3 mb-2">
          <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
            <Zap size={12} />
            Tiene lógica condicional
          </div>
        </div>
      )}

      {/* Indicador de fotos múltiples */}
      {item.type === 'photo' && item.allowMultiple && (
        <div className="mt-3 mb-2">
          <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            📸 Permite múltiples fotos
          </div>
        </div>
      )}

      {/* Preview del campo */}
      <div className="mt-4">
        {item.type === 'instruction' && (
          <div className="p-3 bg-blue-50 border-l-4 border-blue-400 text-sm text-blue-800">
            ℹ️ Campo informativo (no requiere respuesta)
          </div>
        )}
        
        {item.type === 'single_select' && (
          <div className="space-y-2">
            {(item.options || []).map((option, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  option.color === 'green' ? 'border-green-500' :
                  option.color === 'red' ? 'border-red-500' :
                  option.color === 'yellow' ? 'border-yellow-500' :
                  option.color === 'blue' ? 'border-blue-500' :
                  'border-gray-400'
                }`}></div>
                <span className="text-sm text-gray-700">{option.label}</span>
              </div>
            ))}
          </div>
        )}
        
        {item.type === 'checkbox' && (
          <div className="flex items-center gap-2">
            <input type="checkbox" disabled className="rounded" />
            <span className="text-sm text-gray-600">Casilla de verificación</span>
          </div>
        )}
        
        {item.type === 'rating' && (
          <div className="flex gap-1">
            {[1,2,3,4,5].map(star => (
              <span key={star} className="text-2xl text-gray-300">⭐</span>
            ))}
          </div>
        )}
        
        {(item.type === 'text' || item.type === 'textarea' || item.type === 'company' || 
          item.type === 'annotation' || item.type === 'file_number') && (
          <input
            type="text"
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
            placeholder={item.placeholder || 'Respuesta...'}
          />
        )}
        
        {(item.type === 'asset' || item.type === 'location' || item.type === 'area') && (
          <select disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
            <option>Seleccionar...</option>
          </select>
        )}
        
        {item.type === 'photo' && (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            <span className="text-4xl">📷</span>
            <p className="text-sm text-gray-500 mt-2">Tomar foto o subir archivo</p>
          </div>
        )}
        
        {item.type === 'signature' && (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            <span className="text-4xl">✍️</span>
            <p className="text-sm text-gray-500 mt-2">Espacio para firma</p>
          </div>
        )}
        
        {(item.type === 'date' || item.type === 'datetime') && (
          <input
            type="date"
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
          />
        )}
        
        {item.type === 'number' && (
          <input
            type="number"
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
            placeholder="0"
          />
        )}
      </div>

      {item.required && (
        <span className="text-xs text-red-600 mt-2 block">* Obligatorio</span>
      )}
    </div>
  );
}
