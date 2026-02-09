import React, { useEffect, useState } from 'react';
import { Plus, RefreshCw, Pencil, Copy, Archive, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { getActiveTemplates, updateTemplate, createTemplate } from '../../services/hseService';
import TemplateBuilderV2 from './TemplateBuilderV2';
import { useAppContext } from '../../AppContext';

export default function TemplateManager({ onClose }) {
  const { can, requireRole } = useAppContext();
  const isAdminGlobal = can('ADMIN_GLOBAL');
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await getActiveTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates', error);
      toast.error('No se pudieron cargar las plantillas');
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    setEditingId(null);
    setShowBuilder(true);
  };

  const handleEdit = (id) => {
    setEditingId(id);
    setShowBuilder(true);
  };

  const handleDuplicate = async (tpl) => {
    try {
      const clone = {
        ...tpl,
        id: undefined,
        name: `${tpl.name} (copia)`,
        version: 1,
        is_active: true,
        schema: undefined, // builder recreará schema desde sections
        sections: tpl.sections,
        scoring_config: tpl.scoring_config
      };
      await createTemplate(clone);
      toast.success('Plantilla duplicada');
      loadTemplates();
    } catch (error) {
      console.error('Error duplicating template', error);
      toast.error('No se pudo duplicar');
    }
  };

  const handleArchive = async (tpl) => {
    if (!requireRole(['ADMIN_GLOBAL'], 'archivar plantilla')) return;
    try {
      await updateTemplate(tpl.id, { ...tpl, is_active: false, changes: { archived: true } });
      toast.success('Plantilla archivada');
      loadTemplates();
    } catch (error) {
      console.error('Error archiving template', error);
      toast.error('No se pudo archivar');
    }
  };

  if (showBuilder) {
    return (
      <TemplateBuilderV2
        templateId={editingId}
        onClose={() => {
          setShowBuilder(false);
          setEditingId(null);
        }}
        onSave={() => {
          setShowBuilder(false);
          setEditingId(null);
          loadTemplates();
        }}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Gestionar plantillas</p>
          <h1 className="text-2xl font-semibold text-slate-900">Plantillas HSE</h1>
          <p className="text-sm text-slate-500">Crea, edita o duplica plantillas dinámicas.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadTemplates}
            className="px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-100 flex items-center gap-2 text-slate-700"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refrescar
          </button>
          <button
            onClick={handleNew}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nueva plantilla
          </button>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Listado */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500">
            Cargando plantillas...
          </div>
        ) : templates.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
            No hay plantillas. Crea la primera.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {templates.map((tpl) => (
              <div key={tpl.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="text-sm text-slate-500">Versión {tpl.version}</div>
                    <h3 className="text-lg font-semibold text-slate-900">{tpl.name}</h3>
                    <p className="text-sm text-slate-500 line-clamp-2">{tpl.description || 'Sin descripción'}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mb-3">
                  <span className="px-2 py-1 rounded-full bg-slate-100 border border-slate-200">{tpl.category || 'General'}</span>
                  <span className="px-2 py-1 rounded-full bg-slate-100 border border-slate-200">{tpl.sections?.length || 0} secciones</span>
                  <span className="px-2 py-1 rounded-full bg-slate-100 border border-slate-200">{(tpl.sections || []).reduce((a,s)=>a+(s.items?.length||0),0)} campos</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(tpl.id)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 justify-center"
                  >
                    <Pencil className="w-4 h-4" /> Editar
                  </button>
                  <button
                    onClick={() => handleDuplicate(tpl)}
                    className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                    title="Duplicar"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleArchive(tpl)}
                    className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg disabled:opacity-50"
                    title="Archivar"
                    disabled={!isAdminGlobal}
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
