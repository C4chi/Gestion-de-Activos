import React, { useState, useEffect } from 'react';
import { 
  Plus, Save, Eye, Settings, Trash2, GripVertical, 
  Type, Hash, Calendar, Image, FileSignature, Star,
  CheckSquare, List, AlertCircle, Copy, ArrowLeft,
  ChevronDown, ChevronUp, Zap, Package, MapPin,
  Camera, Edit3
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getActiveTemplates, createTemplate, updateTemplate } from '../../services/hseService';
import FormRenderer from './FormRenderer';

// Tipos de campos disponibles
const FIELD_TYPES = [
  { type: 'text', icon: Type, label: 'Texto Corto', color: 'blue' },
  { type: 'textarea', icon: Type, label: 'Texto Largo', color: 'blue' },
  { type: 'number', icon: Hash, label: 'Número', color: 'purple' },
  { type: 'date', icon: Calendar, label: 'Fecha', color: 'green' },
  { type: 'datetime', icon: Calendar, label: 'Fecha y Hora', color: 'green' },
  { type: 'select', icon: List, label: 'Lista Desplegable', color: 'orange' },
  { type: 'single_select', icon: List, label: 'Selección Simple', color: 'orange' },
  { type: 'checkbox', icon: CheckSquare, label: 'Casilla de Verificación', color: 'teal' },
  { type: 'asset', icon: Package, label: 'Selector de Activo', color: 'indigo' },
  { type: 'location', icon: MapPin, label: 'Selector de Ubicación', color: 'cyan' },
  { type: 'area', icon: MapPin, label: 'Área de Trabajo', color: 'emerald' },
  { type: 'photo', icon: Image, label: 'Fotografía', color: 'pink' },
  { type: 'signature', icon: FileSignature, label: 'Firma', color: 'indigo' },
  { type: 'rating', icon: Star, label: 'Calificación', color: 'yellow' },
];

const TemplateBuilder = ({ templateId, onClose, onSave }) => {
  const [template, setTemplate] = useState({
    name: '',
    description: '',
    category: 'general',
    sections: [],
    version: 1,
    is_active: true,
    created_by: null,
    scoring_config: {
      enabled: false,
      max_score: 100,
      passing_score: 70
    }
  });

  const [selectedField, setSelectedField] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Cargar template existente si estamos editando
  useEffect(() => {
    if (templateId) {
      loadTemplate();
    }
  }, [templateId]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const templates = await getActiveTemplates();
      const found = templates.find(t => t.id === templateId);
      if (found) {
        setTemplate(found);
      }
    } catch (error) {
      console.error('Error loading template:', error);
      toast.error('Error al cargar la plantilla');
    } finally {
      setLoading(false);
    }
  };

  // Agregar nueva sección
  const addSection = () => {
    const newSection = {
      id: `section_${Date.now()}`,
      title: `Sección ${template.sections.length + 1}`,
      description: '',
      items: []
    };
    setTemplate(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
    setSelectedSection(newSection.id);
  };

  // Agregar campo a sección
  const addFieldToSection = (sectionId, fieldType) => {
    const defaultLabels = { 
      asset: 'Activo', 
      location: 'Ubicación',
      area: 'Área de Trabajo',
      date: 'Fecha',
      datetime: 'Fecha y Hora'
    };
    
    const defaultOptions = {
      area: [
        { value: 'Producción', label: 'Producción' },
        { value: 'Mantenimiento', label: 'Mantenimiento' },
        { value: 'Almacén', label: 'Almacén' },
        { value: 'Oficinas', label: 'Oficinas' },
        { value: 'Taller', label: 'Taller' },
        { value: 'Exterior', label: 'Exterior' }
      ]
    };
    
    const newField = {
      id: `field_${Date.now()}`,
      type: fieldType,
      label: defaultLabels[fieldType] || `Campo ${fieldType}`,
      required: false,
      scoring: {
        enabled: false,
        weight: 1,
        scoring_type: 'pass_fail'
      },
      options: defaultOptions[fieldType] || (['select', 'single_select', 'checkbox'].includes(fieldType) ? [] : undefined),
      conditional_logic: null
    };

    setTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section => 
        section.id === sectionId 
          ? { ...section, items: [...section.items, newField] }
          : section
      )
    }));

    // No auto-abrir panel de configuración para evitar saltos visuales
    setSelectedField(null);
  };

  // Actualizar campo
  const updateField = (sectionId, fieldId, updates) => {
    setTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map(item =>
                item.id === fieldId ? { ...item, ...updates } : item
              )
            }
          : section
      )
    }));
  };

  // Eliminar campo
  const deleteField = (sectionId, fieldId) => {
    setTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.filter(item => item.id !== fieldId)
            }
          : section
      )
    }));
    setSelectedField(null);
  };

  // Duplicar campo
  const duplicateField = (sectionId, fieldId) => {
    setTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section => {
        if (section.id === sectionId) {
          const fieldIndex = section.items.findIndex(item => item.id === fieldId);
          if (fieldIndex !== -1) {
            const fieldToDuplicate = section.items[fieldIndex];
            const duplicatedField = {
              ...fieldToDuplicate,
              id: `field_${Date.now()}`,
              label: `${fieldToDuplicate.label} (copia)`
            };
            const newItems = [...section.items];
            newItems.splice(fieldIndex + 1, 0, duplicatedField);
            return { ...section, items: newItems };
          }
        }
        return section;
      })
    }));
  };

  // Actualizar sección
  const updateSection = (sectionId, updates) => {
    setTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, ...updates } : section
      )
    }));
  };

  // Eliminar sección
  const deleteSection = (sectionId) => {
    setTemplate(prev => ({
      ...prev,
      sections: prev.sections.filter(s => s.id !== sectionId)
    }));
    if (selectedSection === sectionId) {
      setSelectedSection(null);
    }
  };

  // Mover sección arriba/abajo
  const moveSectionUp = (index) => {
    if (index === 0) return;
    setTemplate(prev => {
      const newSections = [...prev.sections];
      [newSections[index], newSections[index - 1]] = [newSections[index - 1], newSections[index]];
      return { ...prev, sections: newSections };
    });
  };

  const moveSectionDown = (index) => {
    if (index === template.sections.length - 1) return;
    setTemplate(prev => {
      const newSections = [...prev.sections];
      [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
      return { ...prev, sections: newSections };
    });
  };

  // Guardar plantilla
  const handleSave = async () => {
    // Validaciones
    if (!template.name.trim()) {
      toast.error('El nombre de la plantilla es requerido');
      return;
    }

    if (template.sections.length === 0) {
      toast.error('Debes agregar al menos una sección');
      return;
    }

    try {
      setSaving(true);
      
      if (templateId) {
        // Actualizar plantilla existente
        await updateTemplate(templateId, template);
      } else {
        // Crear nueva plantilla
        await createTemplate(template);
      }

      toast.success(`Plantilla ${templateId ? 'actualizada' : 'creada'} exitosamente`);
      if (onSave) onSave();
      if (onClose) onClose();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Error al guardar la plantilla');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando plantilla...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header estilo SafetyCulture */}
      <div className="bg-gradient-to-r from-indigo-700 via-blue-600 to-sky-500 text-white shadow-sm">
        <div className="px-6 py-5 flex items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <button
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition"
              title="Volver"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-white/80">Constructor de plantillas</p>
              <h1 className="text-2xl font-semibold leading-tight">
                {template.name || (templateId ? 'Editar Plantilla' : 'Nueva Plantilla')}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-white/80 mt-2">
                <span className="px-3 py-1 rounded-full bg-white/15 border border-white/20">
                  {template.sections.length} secciones
                </span>
                <span className="px-3 py-1 rounded-full bg-white/15 border border-white/20">
                  {template.sections.reduce((acc, s) => acc + s.items.length, 0)} campos
                </span>
                <span className="px-3 py-1 rounded-full bg-white/15 border border-white/20">
                  Categoría: {template.category || 'General'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 rounded-xl transition border border-white/20"
            >
              <Eye className="w-4 h-4" />
              {showPreview ? 'Ocultar vista previa' : 'Vista previa'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-white text-blue-700 hover:bg-blue-50 rounded-xl transition font-semibold disabled:opacity-50 shadow-sm"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Tipos de Campo */}
        <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">TIPOS DE CAMPO</h3>
            <div className="space-y-2">
              {FIELD_TYPES.map(({ type, icon: Icon, label, color }) => (
                <div
                  key={type}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('fieldType', type)}
                  className={`flex items-center gap-3 p-3 bg-${color}-50 border border-${color}-200 rounded-lg cursor-move hover:shadow-md transition-shadow`}
                >
                  <Icon className={`w-5 h-5 text-${color}-600`} />
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Canvas - Editor de Plantilla */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            {/* Info General */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Información General</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de la Plantilla *
                  </label>
                  <input
                    type="text"
                    value={template.name}
                    onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Inspección de Seguridad Vehicular"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={template.description}
                    onChange={(e) => setTemplate(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="3"
                    placeholder="Descripción de la plantilla..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categoría
                    </label>
                    <select
                      value={template.category}
                      onChange={(e) => setTemplate(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="general">General</option>
                      <option value="vehicular">Vehicular</option>
                      <option value="instalaciones">Instalaciones</option>
                      <option value="epp">EPP</option>
                      <option value="incidentes">Incidentes</option>
                      <option value="auditorias">Auditorías</option>
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={template.scoring_config.enabled}
                        onChange={(e) => setTemplate(prev => ({
                          ...prev,
                          scoring_config: {
                            ...prev.scoring_config,
                            enabled: e.target.checked
                          }
                        }))}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Habilitar Scoring
                      </span>
                    </label>

                    {template.scoring_config.enabled && (
                      <div className="mt-2 space-y-2">
                        <input
                          type="number"
                          value={template.scoring_config.max_score}
                          onChange={(e) => setTemplate(prev => ({
                            ...prev,
                            scoring_config: {
                              ...prev.scoring_config,
                              max_score: parseInt(e.target.value)
                            }
                          }))}
                          className="w-full px-3 py-1 text-sm border border-gray-300 rounded"
                          placeholder="Puntaje máximo"
                        />
                        <input
                          type="number"
                          value={template.scoring_config.passing_score}
                          onChange={(e) => setTemplate(prev => ({
                            ...prev,
                            scoring_config: {
                              ...prev.scoring_config,
                              passing_score: parseInt(e.target.value)
                            }
                          }))}
                          className="w-full px-3 py-1 text-sm border border-gray-300 rounded"
                          placeholder="Puntaje mínimo"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Secciones */}
            <div className="space-y-4">
              {template.sections.map((section, sectionIndex) => (
                <SectionEditor
                  key={section.id}
                  section={section}
                  sectionIndex={sectionIndex}
                  isLast={sectionIndex === template.sections.length - 1}
                  onUpdate={(updates) => updateSection(section.id, updates)}
                  onDelete={() => deleteSection(section.id)}
                  onMoveUp={() => moveSectionUp(sectionIndex)}
                  onMoveDown={() => moveSectionDown(sectionIndex)}
                  onFieldAdd={(fieldType) => addFieldToSection(section.id, fieldType)}
                  onFieldUpdate={(fieldId, updates) => updateField(section.id, fieldId, updates)}
                  onFieldDelete={(fieldId) => deleteField(section.id, fieldId)}
                  onFieldDuplicate={(fieldId) => duplicateField(section.id, fieldId)}
                  onFieldSelect={(field) => setSelectedField({ sectionId: section.id, field })}
                  selectedField={selectedField}
                  allSections={template.sections}
                />
              ))}

              <button
                onClick={addSection}
                className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 text-gray-600"
              >
                <Plus className="w-5 h-5" />
                Agregar Sección
              </button>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="w-[420px] bg-slate-100 border-l border-slate-200 overflow-y-auto p-6 hidden lg:block">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Vista previa móvil</h3>
            <p className="text-xs text-slate-500 mb-4">Así se verá para el inspector en terreno.</p>
            <div className="mx-auto w-[360px] bg-white rounded-3xl shadow-xl border border-slate-200 p-4">
              <div className="w-full h-10 rounded-full bg-slate-100 mb-3 flex items-center justify-center text-slate-400 text-xs">Barra de estado</div>
              <div className="h-[600px] overflow-y-auto rounded-2xl border border-slate-200 p-3 bg-slate-50">
                {template.sections.length === 0 ? (
                  <div className="text-sm text-slate-500 text-center py-10">
                    Agrega secciones y campos para ver la vista previa.
                  </div>
                ) : (
                  <FormRenderer
                    template={{
                      ...template,
                      schema: {
                        sections: template.sections,
                        scoring: template.scoring_config || template.scoring || {}
                      },
                      passing_threshold: template.scoring_config?.passing_score || 70,
                      scoring_enabled: template.scoring_config?.enabled
                    }}
                    onSubmit={() => {}}
                    readOnly
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Field Config Panel */}
        {selectedField && (
          <FieldConfigPanel
            field={selectedField.field}
            sectionId={selectedField.sectionId}
            allSections={template.sections}
            onUpdate={(updates) => updateField(selectedField.sectionId, selectedField.field.id, updates)}
            onClose={() => setSelectedField(null)}
          />
        )}
      </div>
    </div>
  );
};

// Componente SectionEditor
const SectionEditor = ({ 
  section, 
  sectionIndex, 
  isLast, 
  onUpdate, 
  onDelete, 
  onMoveUp, 
  onMoveDown,
  onFieldAdd,
  onFieldUpdate,
  onFieldDelete,
  onFieldDuplicate,
  onFieldSelect,
  selectedField,
  allSections
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const fieldType = e.dataTransfer.getData('fieldType');
    if (fieldType) {
      onFieldAdd(fieldType);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Section Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <input
            type="text"
            value={section.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            className="text-lg font-semibold border-0 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none w-full"
            placeholder="Nombre de la sección"
          />
          <textarea
            value={section.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            className="mt-2 text-sm text-gray-600 border-0 w-full resize-none focus:outline-none"
            rows="2"
            placeholder="Descripción de la sección (opcional)"
          />
        </div>
        <div className="flex items-center gap-1 ml-4">
          <button
            onClick={onMoveUp}
            disabled={sectionIndex === 0}
            className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 hover:bg-red-100 text-red-600 rounded ml-2"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Fields */}
      <div 
        className={`space-y-3 min-h-[100px] ${isDragOver ? 'ring-1 ring-blue-300 bg-blue-50/40 rounded-lg' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        {section.items.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Type className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Arrastra campos aquí o haz clic en "Agregar Campo"</p>
          </div>
        ) : (
          section.items.map((field) => (
            <FieldItem
              key={field.id}
              field={field}
              isSelected={selectedField?.field?.id === field.id}
              onClick={() => onFieldSelect(field)}
              onDelete={() => onFieldDelete(field.id)}
              onDuplicate={() => onFieldDuplicate && onFieldDuplicate(field.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

// Componente FieldItem
const FieldItem = ({ field, isSelected, onClick, onDelete, onDuplicate }) => {
  const fieldTypeInfo = FIELD_TYPES.find(ft => ft.type === field.type);
  const Icon = fieldTypeInfo?.icon || Type;

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
        isSelected 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
    >
      <GripVertical className="w-4 h-4 text-gray-400" />
      <Icon className="w-5 h-5 text-gray-600" />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{field.label}</span>
          {field.required && (
            <span className="text-xs text-red-600">*</span>
          )}
          {field.conditional_logic && (
            <Zap className="w-4 h-4 text-yellow-600" title="Tiene lógica condicional" />
          )}
        </div>
        <p className="text-xs text-gray-500">{fieldTypeInfo?.label}</p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDuplicate();
        }}
        className="p-1 hover:bg-blue-100 text-blue-600 rounded"
        title="Duplicar campo"
      >
        <Copy className="w-4 h-4" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="p-1 hover:bg-red-100 text-red-600 rounded"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

// Componente FieldConfigPanel
const FieldConfigPanel = ({ field, sectionId, allSections, onUpdate, onClose }) => {
  const [localField, setLocalField] = useState(field);
  const [activeOptionTab, setActiveOptionTab] = useState(0);
  const [customPresets, setCustomPresets] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('hse_custom_presets') || '{}');
    } catch {
      return {};
    }
  });
  const [newPresetName, setNewPresetName] = useState('');
  const [showSavePreset, setShowSavePreset] = useState(false);

  useEffect(() => {
    setLocalField(field);
  }, [field]);

  const saveCustomPreset = () => {
    if (!newPresetName.trim() || !localField.options?.length) return;
    const updatedPresets = {
      ...customPresets,
      [newPresetName.toLowerCase().replace(/\s+/g, '_')]: {
        name: newPresetName,
        options: localField.options
      }
    };
    localStorage.setItem('hse_custom_presets', JSON.stringify(updatedPresets));
    setCustomPresets(updatedPresets);
    setNewPresetName('');
    setShowSavePreset(false);
    toast.success(`Preset "${newPresetName}" guardado`);
  };

  const deleteCustomPreset = (presetKey) => {
    const updatedPresets = { ...customPresets };
    delete updatedPresets[presetKey];
    localStorage.setItem('hse_custom_presets', JSON.stringify(updatedPresets));
    setCustomPresets(updatedPresets);
    toast.success('Preset eliminado');
  };

  const handleUpdate = (updates) => {
    const newField = { ...localField, ...updates };
    setLocalField(newField);
    onUpdate(updates);
  };

  // Agregar opción a select/checkbox
  const addOption = () => {
    const newOptions = [...(localField.options || []), { value: '', score: 0, color: 'gray' }];
    handleUpdate({ options: newOptions });
  };

  const updateOption = (index, key, value) => {
    const newOptions = [...localField.options];
    newOptions[index][key] = value;
    handleUpdate({ options: newOptions });
  };

  const deleteOption = (index) => {
    const newOptions = localField.options.filter((_, i) => i !== index);
    handleUpdate({ options: newOptions });
  };

  return (
    <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Configuración
        </h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          ×
        </button>
      </div>

      <div className="space-y-6">
        {/* Label */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Etiqueta del Campo *
          </label>
          <input
            type="text"
            value={localField.label}
            onChange={(e) => handleUpdate({ label: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            readOnly={['date','datetime'].includes(localField.type)}
          />
          {['date','datetime'].includes(localField.type) && (
            <p className="mt-1 text-xs text-gray-500">La etiqueta de campos de fecha se mantiene fija.</p>
          )}
        </div>

        {/* Required */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={localField.required}
              onChange={(e) => handleUpdate({ required: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">
              Campo Obligatorio
            </span>
          </label>
        </div>

        {/* Placeholder (para text, textarea, number) */}
        {['text', 'textarea', 'number'].includes(localField.type) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Texto de Ayuda
            </label>
            <input
              type="text"
              value={localField.placeholder || ''}
              onChange={(e) => handleUpdate({ placeholder: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Ingrese el valor..."
            />
          </div>
        )}

        {/* Opciones (para select, selección simple y checkbox) */}
        {(localField.type === 'select' || localField.type === 'single_select' || localField.type === 'checkbox') && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Opciones
              </label>
              {localField.type === 'single_select' && (
                <div className="flex gap-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        const builtInPresets = {
                          yesno: [
                            { value: 'Yes', color: 'green', score: 1 },
                            { value: 'No', color: 'red', score: 0 },
                            { value: 'N/A', color: 'gray', score: 0 }
                          ],
                          passfail: [
                            { value: 'Pass', color: 'green', score: 1 },
                            { value: 'Fail', color: 'red', score: 0 }
                          ],
                          goodfairpoor: [
                            { value: 'Good', color: 'green', score: 2 },
                            { value: 'Fair', color: 'yellow', score: 1 },
                            { value: 'Poor', color: 'red', score: 0 }
                          ],
                          safeatrisk: [
                            { value: 'Safe', color: 'green', score: 1 },
                            { value: 'At Risk', color: 'red', score: 0 }
                          ],
                          compliant: [
                            { value: 'Compliant', color: 'green', score: 1 },
                            { value: 'Non-Compliant', color: 'red', score: 0 },
                            { value: 'N/A', color: 'gray', score: 0 }
                          ]
                        };
                        
                        const allPresets = { ...builtInPresets };
                        Object.keys(customPresets).forEach(key => {
                          allPresets[key] = customPresets[key].options;
                        });

                        if (allPresets[e.target.value]) {
                          handleUpdate({ options: allPresets[e.target.value] });
                        }
                        e.target.value = '';
                      }
                    }}
                    className="text-xs px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50"
                    defaultValue=""
                  >
                    <option value="">📥 Cargar preset</option>
                    <optgroup label="Predefinidos">
                      <option value="yesno">Yes / No / N/A</option>
                      <option value="passfail">Pass / Fail</option>
                      <option value="goodfairpoor">Good / Fair / Poor</option>
                      <option value="safeatrisk">Safe / At Risk</option>
                      <option value="compliant">Compliant / Non-Compliant</option>
                    </optgroup>
                    {Object.keys(customPresets).length > 0 && (
                      <optgroup label="Mis Presets">
                        {Object.keys(customPresets).map(key => (
                          <option key={key} value={key}>
                            {customPresets[key].name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowSavePreset(!showSavePreset)}
                    className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    title="Guardar opciones actuales como preset"
                  >
                    💾 Guardar
                  </button>
                </div>
              )}
            </div>

            {/* Guardar nuevo preset */}
            {showSavePreset && localField.type === 'single_select' && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nombre del preset:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                    placeholder="Ej: Estado de equipo"
                    onKeyDown={(e) => e.key === 'Enter' && saveCustomPreset()}
                  />
                  <button
                    type="button"
                    onClick={saveCustomPreset}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    ✔
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowSavePreset(false); setNewPresetName(''); }}
                    className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    ✖
                  </button>
                </div>
              </div>
            )}

            {/* Gestionar presets guardados */}
            {Object.keys(customPresets).length > 0 && localField.type === 'single_select' && (
              <details className="mb-3">
                <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-900">
                  ⚙️ Gestionar mis presets ({Object.keys(customPresets).length})
                </summary>
                <div className="mt-2 space-y-1 pl-2">
                  {Object.keys(customPresets).map(key => (
                    <div key={key} className="flex items-center justify-between text-xs py-1 px-2 bg-gray-50 rounded">
                      <span className="font-medium">{customPresets[key].name}</span>
                      <button
                        type="button"
                        onClick={() => deleteCustomPreset(key)}
                        className="text-red-600 hover:text-red-800"
                        title="Eliminar preset"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              </details>
            )}
            <div className="space-y-3">
              {/* Pestañas de opciones */}
              {(localField.options || []).length > 0 && (
                <div className="border-b border-gray-200">
                  <div className="flex overflow-x-auto gap-1">
                    {(localField.options || []).map((option, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setActiveOptionTab(index)}
                        className={`px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                          activeOptionTab === index
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        = {option.value || `Opción ${index + 1}`}
                        {(option.requirePhoto || option.requireNote || option.requireField) && (
                          <span className="ml-1 text-yellow-600" title="Tiene acciones configuradas">⚡</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Editor de la opción activa */}
              {(localField.options || []).map((option, index) => (
                activeOptionTab === index && (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
                    {/* Configuración básica de la opción */}
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Color</label>
                          <select
                            value={option.color || 'gray'}
                            onChange={(e) => updateOption(index, 'color', e.target.value)}
                            className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                          >
                            <option value="green">🟢 Verde</option>
                            <option value="red">🔴 Rojo</option>
                            <option value="yellow">🟡 Amarillo</option>
                            <option value="blue">🔵 Azul</option>
                            <option value="gray">⚪ Gris</option>
                            <option value="orange">🟠 Naranja</option>
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs text-gray-600 mb-1">Texto de la opción</label>
                          <input
                            type="text"
                            value={option.value}
                            onChange={(e) => updateOption(index, 'value', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                            placeholder="Ej: No, Yes, N/A"
                          />
                        </div>
                        {localField.scoring?.enabled && (
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Puntos</label>
                            <input
                              type="number"
                              value={option.score || 0}
                              onChange={(e) => updateOption(index, 'score', parseFloat(e.target.value))}
                              className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                            />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteOption(index)}
                          className="mt-5 p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Eliminar opción"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Sección de lógica condicional */}
                    {localField.type === 'single_select' && (
                      <div className="border-t pt-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                          <p className="text-sm font-medium text-blue-900 flex items-center gap-2">
                            <Zap className="w-4 h-4" />
                            Si respuesta es <span className="font-bold">{option.value || 'esta opción'}</span> entonces:
                          </p>
                        </div>

                        <div className="space-y-3 pl-4">
                          {/* Fotografía */}
                          <label className="flex items-start gap-3 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={option.requirePhoto || false}
                              onChange={(e) => updateOption(index, 'requirePhoto', e.target.checked)}
                              className="mt-0.5 w-4 h-4"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 text-sm font-medium text-gray-900 group-hover:text-blue-600">
                                <Camera className="w-4 h-4" />
                                Se requieren archivos multimedia
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">Solicitar fotografía como evidencia</p>
                            </div>
                          </label>

                          {/* Nota/Comentario */}
                          <label className="flex items-start gap-3 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={option.requireNote || false}
                              onChange={(e) => updateOption(index, 'requireNote', e.target.checked)}
                              className="mt-0.5 w-4 h-4"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 text-sm font-medium text-gray-900 group-hover:text-blue-600">
                                <Edit3 className="w-4 h-4" />
                                Se requiere comentario
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">Solicitar nota o descripción adicional</p>
                            </div>
                          </label>

                          {/* Campo adicional */}
                          <label className="flex items-start gap-3 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={option.requireField || false}
                              onChange={(e) => updateOption(index, 'requireField', e.target.checked)}
                              className="mt-0.5 w-4 h-4"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 text-sm font-medium text-gray-900 group-hover:text-blue-600">
                                <AlertCircle className="w-4 h-4" />
                                Solicitar campo personalizado
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">Agregar campo de texto o número</p>
                            </div>
                          </label>

                          {/* Configuración de etiqueta personalizada */}
                          {(option.requireNote || option.requirePhoto || option.requireField) && (
                            <div className="mt-3 pl-7 space-y-2">
                              <input
                                type="text"
                                value={option.followUpLabel || ''}
                                onChange={(e) => updateOption(index, 'followUpLabel', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
                                placeholder="Etiqueta personalizada (opcional)"
                              />
                              {option.requireField && (
                                <select
                                  value={option.fieldType || 'text'}
                                  onChange={(e) => updateOption(index, 'fieldType', e.target.value)}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
                                >
                                  <option value="text">Texto corto</option>
                                  <option value="textarea">Texto largo</option>
                                  <option value="number">Número</option>
                                  <option value="date">Fecha</option>
                                </select>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              ))}
              <button
                onClick={addOption}
                className="w-full py-2 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 text-sm text-gray-600 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Agregar Opción
              </button>
            </div>
          </div>
        )}

        {/* Scoring */}
        <div className="border-t pt-4">
          <label className="flex items-center gap-2 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={localField.scoring?.enabled || false}
              onChange={(e) => handleUpdate({ 
                scoring: { 
                  ...localField.scoring, 
                  enabled: e.target.checked 
                } 
              })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">
              Habilitar Puntuación
            </span>
          </label>

          {localField.scoring?.enabled && (
            <div className="space-y-3 pl-6">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Peso</label>
                <input
                  type="number"
                  value={localField.scoring?.weight || 1}
                  onChange={(e) => handleUpdate({ 
                    scoring: { 
                      ...localField.scoring, 
                      weight: parseFloat(e.target.value) 
                    } 
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  step="0.1"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Tipo de Puntuación</label>
                <select
                  value={localField.scoring?.scoring_type || 'pass_fail'}
                  onChange={(e) => handleUpdate({ 
                    scoring: { 
                      ...localField.scoring, 
                      scoring_type: e.target.value 
                    } 
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="pass_fail">Pasa/Falla</option>
                  <option value="weighted">Ponderado</option>
                  <option value="numeric">Numérico</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Lógica Condicional */}
        <ConditionalLogicEditor
          field={localField}
          sectionId={sectionId}
          allSections={allSections}
          onUpdate={handleUpdate}
        />
      </div>
    </div>
  );
};

// Componente ConditionalLogicEditor
const ConditionalLogicEditor = ({ field, sectionId, allSections, onUpdate }) => {
  const [enabled, setEnabled] = useState(!!field.conditional_logic);

  // Obtener todos los campos disponibles para condicionar
  const availableFields = allSections.flatMap(section => 
    section.items
      .filter(item => item.id !== field.id) // No puede condicionarse a sí mismo
      .map(item => ({
        ...item,
        sectionTitle: section.title
      }))
  );

  const toggleLogic = () => {
    if (enabled) {
      onUpdate({ conditional_logic: null });
      setEnabled(false);
    } else {
      onUpdate({ 
        conditional_logic: {
          show_if: {
            field_id: '',
            operator: 'equals',
            value: ''
          }
        }
      });
      setEnabled(true);
    }
  };

  const updateLogic = (updates) => {
    onUpdate({
      conditional_logic: {
        ...field.conditional_logic,
        show_if: {
          ...field.conditional_logic.show_if,
          ...updates
        }
      }
    });
  };

  const selectedField = availableFields.find(
    f => f.id === field.conditional_logic?.show_if?.field_id
  );

  return (
    <div className="border-t pt-4">
      <label className="flex items-center gap-2 cursor-pointer mb-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={toggleLogic}
          className="w-4 h-4 text-yellow-600 rounded"
        />
        <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
          <Zap className="w-4 h-4 text-yellow-600" />
          Lógica Condicional
        </span>
      </label>

      {enabled && field.conditional_logic && (
        <div className="space-y-3 pl-6 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
          <p className="text-xs text-gray-600 mb-2">
            Este campo se mostrará solo si:
          </p>

          {/* Campo de referencia */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">Campo</label>
            <select
              value={field.conditional_logic.show_if.field_id}
              onChange={(e) => updateLogic({ field_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Seleccionar campo...</option>
              {availableFields.map(f => (
                <option key={f.id} value={f.id}>
                  {f.sectionTitle} → {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Operador */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">Operador</label>
            <select
              value={field.conditional_logic.show_if.operator}
              onChange={(e) => updateLogic({ operator: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="equals">Es igual a</option>
              <option value="not_equals">No es igual a</option>
              <option value="contains">Contiene</option>
              <option value="greater_than">Mayor que</option>
              <option value="less_than">Menor que</option>
            </select>
          </div>

          {/* Valor */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">Valor</label>
            {(selectedField?.type === 'select' || selectedField?.type === 'single_select') ? (
              <select
                value={field.conditional_logic.show_if.value}
                onChange={(e) => updateLogic({ value: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Seleccionar...</option>
                {selectedField.options?.map((opt, i) => (
                  <option key={i} value={opt.value}>{opt.value}</option>
                ))}
              </select>
            ) : selectedField?.type === 'checkbox' ? (
              <select
                value={field.conditional_logic.show_if.value}
                onChange={(e) => updateLogic({ value: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="true">Marcado</option>
                <option value="false">No marcado</option>
              </select>
            ) : (
              <input
                type="text"
                value={field.conditional_logic.show_if.value}
                onChange={(e) => updateLogic({ value: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="Valor de comparación"
              />
            )}
          </div>

          <div className="pt-2 border-t border-yellow-300">
            <p className="text-xs text-yellow-800">
              💡 <strong>Ejemplo:</strong> Si "{selectedField?.label || 'un campo'}" {field.conditional_logic.show_if.operator === 'equals' ? 'es igual a' : field.conditional_logic.show_if.operator} "{field.conditional_logic.show_if.value || 'algún valor'}", entonces mostrar este campo.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateBuilder;
