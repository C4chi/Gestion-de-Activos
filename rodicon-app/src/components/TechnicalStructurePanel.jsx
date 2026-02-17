import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, ChevronDown, Search, Copy, Layers, Plus, Save, Trash2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppContext } from '../AppContext';
import {
  bulkCloneTemplateToAssets,
  cloneTemplateToAsset,
  createNode,
  deleteNode,
  getChildren,
  listTemplates,
  updateNode,
  createTemplate,
} from '../services/technicalStructureService';

const NODE_TYPES = ['EQUIPO', 'SISTEMA', 'SUBSISTEMA', 'CONJUNTO', 'COMPONENTE', 'PIEZA'];

const ROOT_KEY = 'root';

const TechnicalStructurePanel = () => {
  const { assets } = useAppContext();

  const [mode, setMode] = useState('ASSET');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [selectedNode, setSelectedNode] = useState(null);
  const [search, setSearch] = useState('');

  const [childrenByParent, setChildrenByParent] = useState({});
  const [expandedIds, setExpandedIds] = useState({});
  const [loadingByParent, setLoadingByParent] = useState({});

  const [cloneTargetAssetId, setCloneTargetAssetId] = useState('');
  const [bulkSelectedAssets, setBulkSelectedAssets] = useState([]);
  const [creating, setCreating] = useState(false);

  const [newTemplate, setNewTemplate] = useState({
    code: '',
    name: '',
    brand: '',
    model: '',
    model_year: '',
  });

  const [newNode, setNewNode] = useState({
    node_type: 'EQUIPO',
    name: '',
    description: '',
    part_number: '',
    sort_order: 0,
  });

  const [editingNode, setEditingNode] = useState(null);

  const visibleAssets = useMemo(() => {
    return (assets || [])
      .filter(a => a.visible)
      .sort((a, b) => String(a?.ficha || '').localeCompare(String(b?.ficha || '')));
  }, [assets]);

  const scopeReady = mode === 'ASSET' ? !!selectedAssetId : !!selectedTemplateId;

  const loadTemplates = async () => {
    const { data, error } = await listTemplates();
    if (error) {
      toast.error('Error cargando plantillas');
      return;
    }
    setTemplates(data);

    if (!selectedTemplateId && data.length > 0) {
      setSelectedTemplateId(data[0].id);
    }
  };

  const resetTree = () => {
    setChildrenByParent({});
    setExpandedIds({});
    setSelectedNode(null);
  };

  const loadChildren = async (parentId = null, options = {}) => {
    const key = parentId || ROOT_KEY;

    if (!scopeReady) return;
    if (!options.force && childrenByParent[key]) return;

    setLoadingByParent(prev => ({ ...prev, [key]: true }));

    const { data, error } = await getChildren({
      assetId: mode === 'ASSET' ? selectedAssetId : null,
      templateId: mode === 'TEMPLATE' ? selectedTemplateId : null,
      parentId,
      search: options.search || null,
      limit: options.search ? 500 : 200,
    });

    setLoadingByParent(prev => ({ ...prev, [key]: false }));

    if (error) {
      toast.error('Error cargando nodos');
      return;
    }

    setChildrenByParent(prev => ({
      ...prev,
      [key]: data,
    }));
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    resetTree();
    if (scopeReady) {
      loadChildren(null, { force: true });
    }
  }, [mode, selectedAssetId, selectedTemplateId]);

  const toggleNode = async (nodeId) => {
    const isOpen = !!expandedIds[nodeId];
    setExpandedIds(prev => ({ ...prev, [nodeId]: !isOpen }));

    if (!isOpen) {
      await loadChildren(nodeId);
    }
  };

  const handleSearch = async () => {
    if (!scopeReady) return;

    if (!search.trim()) {
      resetTree();
      await loadChildren(null, { force: true });
      return;
    }

    await loadChildren(null, { force: true, search: search.trim() });
  };

  const rootNodes = childrenByParent[ROOT_KEY] || [];

  const handleCloneTemplateToAsset = async () => {
    if (!selectedTemplateId || !cloneTargetAssetId) {
      toast.error('Selecciona plantilla y equipo destino');
      return;
    }

    const { error } = await cloneTemplateToAsset(selectedTemplateId, cloneTargetAssetId);
    if (error) {
      toast.error('Error clonando plantilla a equipo');
      return;
    }

    toast.success('✅ Plantilla clonada al equipo');

    if (mode === 'ASSET' && selectedAssetId === cloneTargetAssetId) {
      resetTree();
      await loadChildren(null, { force: true });
    }
  };

  const handleBulkClone = async () => {
    if (!selectedTemplateId || bulkSelectedAssets.length === 0) {
      toast.error('Selecciona plantilla y al menos un equipo');
      return;
    }

    const { data, error } = await bulkCloneTemplateToAssets(selectedTemplateId, bulkSelectedAssets);
    if (error) {
      toast.error('Error en clonación masiva');
      return;
    }

    const okCount = (data || []).filter(r => r.ok).length;
    toast.success(`✅ Clonación masiva completada: ${okCount}/${bulkSelectedAssets.length}`);
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.code || !newTemplate.name) {
      toast.error('Código y nombre de plantilla son requeridos');
      return;
    }

    const payload = {
      code: newTemplate.code.trim(),
      name: newTemplate.name.trim(),
      brand: newTemplate.brand?.trim() || null,
      model: newTemplate.model?.trim() || null,
      model_year: newTemplate.model_year ? parseInt(newTemplate.model_year, 10) : null,
      is_active: true,
    };

    const { data, error } = await createTemplate(payload);
    if (error) {
      toast.error('Error creando plantilla');
      return;
    }

    toast.success('✅ Plantilla creada');
    setNewTemplate({ code: '', name: '', brand: '', model: '', model_year: '' });
    await loadTemplates();
    setSelectedTemplateId(data.id);
    setMode('TEMPLATE');
  };

  const handleCreateNode = async () => {
    if (!scopeReady) {
      toast.error('Selecciona primero plantilla o equipo');
      return;
    }

    if (!newNode.name.trim()) {
      toast.error('Nombre del nodo requerido');
      return;
    }

    setCreating(true);

    const payload = {
      parent_id: selectedNode?.id || null,
      node_type: newNode.node_type,
      name: newNode.name.trim(),
      description: newNode.description?.trim() || null,
      part_number: newNode.part_number?.trim() || null,
      sort_order: Number(newNode.sort_order || 0),
      asset_id: mode === 'ASSET' ? selectedAssetId : null,
      template_id: mode === 'TEMPLATE' ? selectedTemplateId : null,
    };

    const { error } = await createNode(payload);
    setCreating(false);

    if (error) {
      toast.error('Error creando nodo: ' + error.message);
      return;
    }

    toast.success('✅ Nodo creado');
    setNewNode({ node_type: 'EQUIPO', name: '', description: '', part_number: '', sort_order: 0 });

    const parentKey = selectedNode?.id || ROOT_KEY;
    setChildrenByParent(prev => ({ ...prev, [parentKey]: null }));
    await loadChildren(selectedNode?.id || null, { force: true });
    setExpandedIds(prev => ({ ...prev, [selectedNode?.id]: true }));
  };

  const handleSaveNode = async () => {
    if (!editingNode?.id) return;

    const { error } = await updateNode(editingNode.id, {
      name: editingNode.name,
      description: editingNode.description || null,
      part_number: editingNode.part_number || null,
      sort_order: Number(editingNode.sort_order || 0),
    });

    if (error) {
      toast.error('Error actualizando nodo');
      return;
    }

    toast.success('✅ Nodo actualizado');
    setSelectedNode(editingNode);

    const parentKey = editingNode.parent_id || ROOT_KEY;
    setChildrenByParent(prev => ({ ...prev, [parentKey]: null }));
    await loadChildren(editingNode.parent_id || null, { force: true });
  };

  const handleDeleteNode = async () => {
    if (!selectedNode?.id) return;
    const confirmDelete = window.confirm('¿Eliminar este nodo y todos sus hijos?');
    if (!confirmDelete) return;

    const { error } = await deleteNode(selectedNode.id);
    if (error) {
      toast.error('Error eliminando nodo');
      return;
    }

    toast.success('🗑️ Nodo eliminado');
    const parentKey = selectedNode.parent_id || ROOT_KEY;
    setSelectedNode(null);
    setEditingNode(null);
    setChildrenByParent(prev => ({ ...prev, [parentKey]: null }));
    await loadChildren(selectedNode.parent_id || null, { force: true });
  };

  const renderTreeNode = (node, level = 0) => {
    const isExpanded = !!expandedIds[node.id];
    const children = childrenByParent[node.id] || [];
    const isLoading = !!loadingByParent[node.id];

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer ${
            selectedNode?.id === node.id ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100'
          }`}
          style={{ marginLeft: `${level * 14}px` }}
          onClick={() => {
            setSelectedNode(node);
            setEditingNode({ ...node });
          }}
        >
          <button
            className="p-0.5"
            onClick={(e) => {
              e.stopPropagation();
              if (node.has_children) toggleNode(node.id);
            }}
          >
            {node.has_children ? (
              isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
            ) : (
              <span className="inline-block w-4" />
            )}
          </button>

          <span className="text-xs font-semibold bg-gray-200 rounded px-1.5 py-0.5">{node.node_type}</span>
          <span className="text-sm font-medium truncate">{node.name}</span>
          {node.part_number && <span className="text-xs text-gray-500">({node.part_number})</span>}
        </div>

        {isExpanded && (
          <div>
            {isLoading && <p className="text-xs text-gray-500 ml-8 py-1">Cargando...</p>}
            {!isLoading && children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-wrap gap-2 items-center mb-4">
        <button
          onClick={() => setMode('ASSET')}
          className={`px-3 py-2 rounded-lg font-semibold text-sm ${mode === 'ASSET' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          Árbol por Equipo
        </button>
        <button
          onClick={() => setMode('TEMPLATE')}
          className={`px-3 py-2 rounded-lg font-semibold text-sm ${mode === 'TEMPLATE' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          Árbol de Plantilla
        </button>

        {mode === 'ASSET' ? (
          <select
            value={selectedAssetId}
            onChange={(e) => setSelectedAssetId(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-white"
          >
            <option value="">Selecciona equipo</option>
            {visibleAssets.map(a => (
              <option key={a.id} value={a.id}>{a.ficha} - {a.marca} {a.modelo}</option>
            ))}
          </select>
        ) : (
          <select
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-white"
          >
            <option value="">Selecciona plantilla</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.brand || 'N/A'} {t.model || ''})</option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar nombre o N° parte"
            className="px-3 py-2 border rounded-lg text-sm w-64"
          />
          <button onClick={handleSearch} className="px-3 py-2 bg-gray-800 text-white rounded-lg text-sm font-semibold flex items-center gap-2">
            <Search className="w-4 h-4" /> Buscar
          </button>
          <button onClick={() => loadChildren(null, { force: true })} className="px-3 py-2 bg-gray-200 rounded-lg text-sm font-semibold flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Refrescar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
        <div className="lg:col-span-4 bg-white border rounded-xl p-3 overflow-auto">
          <h3 className="font-bold text-gray-800 mb-2">Lista de estructura</h3>
          {!scopeReady ? (
            <p className="text-sm text-gray-500">Selecciona equipo o plantilla para cargar el árbol.</p>
          ) : rootNodes.length === 0 ? (
            <p className="text-sm text-gray-500">Sin nodos en este alcance.</p>
          ) : (
            rootNodes.map(n => renderTreeNode(n, 0))
          )}
        </div>

        <div className="lg:col-span-5 bg-white border rounded-xl p-4 overflow-auto">
          <h3 className="font-bold text-gray-800 mb-3">Detalle del nodo</h3>
          {!selectedNode ? (
            <p className="text-sm text-gray-500">Selecciona un nodo del árbol.</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <label className="text-gray-600 font-semibold">Tipo</label>
                  <p className="font-bold">{selectedNode.node_type}</p>
                </div>
                <div>
                  <label className="text-gray-600 font-semibold">Orden</label>
                  <input
                    type="number"
                    value={editingNode?.sort_order ?? 0}
                    onChange={(e) => setEditingNode(prev => ({ ...prev, sort_order: e.target.value }))}
                    className="w-full mt-1 px-2 py-1 border rounded"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-600 font-semibold text-sm">Nombre</label>
                <input
                  value={editingNode?.name || ''}
                  onChange={(e) => setEditingNode(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="text-gray-600 font-semibold text-sm">Part Number</label>
                <input
                  value={editingNode?.part_number || ''}
                  onChange={(e) => setEditingNode(prev => ({ ...prev, part_number: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="text-gray-600 font-semibold text-sm">Descripción</label>
                <textarea
                  value={editingNode?.description || ''}
                  onChange={(e) => setEditingNode(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="flex gap-2">
                <button onClick={handleSaveNode} className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold text-sm flex items-center gap-2">
                  <Save className="w-4 h-4" /> Guardar
                </button>
                <button onClick={handleDeleteNode} className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold text-sm flex items-center gap-2">
                  <Trash2 className="w-4 h-4" /> Eliminar
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-3 bg-white border rounded-xl p-4 overflow-auto space-y-5">
          <div>
            <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nuevo nodo
            </h4>
            <div className="space-y-2">
              <select
                value={newNode.node_type}
                onChange={(e) => setNewNode(prev => ({ ...prev, node_type: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                {NODE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input
                value={newNode.name}
                onChange={(e) => setNewNode(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <input
                value={newNode.part_number}
                onChange={(e) => setNewNode(prev => ({ ...prev, part_number: e.target.value }))}
                placeholder="Part number"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <input
                type="number"
                value={newNode.sort_order}
                onChange={(e) => setNewNode(prev => ({ ...prev, sort_order: e.target.value }))}
                placeholder="Sort order"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <textarea
                value={newNode.description}
                onChange={(e) => setNewNode(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
                placeholder="Descripción"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <button
                onClick={handleCreateNode}
                disabled={creating || !scopeReady}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                {creating ? 'Creando...' : selectedNode ? 'Agregar hijo al nodo seleccionado' : 'Agregar nodo raíz'}
              </button>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
              <Copy className="w-4 h-4" /> Clonar plantilla → equipo
            </h4>
            <select
              value={cloneTargetAssetId}
              onChange={(e) => setCloneTargetAssetId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm mb-2"
            >
              <option value="">Equipo destino</option>
              {visibleAssets.map(a => (
                <option key={a.id} value={a.id}>{a.ficha} - {a.marca} {a.modelo}</option>
              ))}
            </select>
            <button
              onClick={handleCloneTemplateToAsset}
              disabled={!selectedTemplateId || !cloneTargetAssetId}
              className="w-full px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              Clonar a equipo
            </button>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
              <Layers className="w-4 h-4" /> Clonación masiva
            </h4>
            <div className="max-h-36 overflow-auto border rounded-lg p-2 space-y-1">
              {visibleAssets.map(a => (
                <label key={a.id} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={bulkSelectedAssets.includes(a.id)}
                    onChange={(e) => {
                      setBulkSelectedAssets(prev =>
                        e.target.checked ? [...prev, a.id] : prev.filter(id => id !== a.id)
                      );
                    }}
                  />
                  <span>{a.ficha}</span>
                </label>
              ))}
            </div>
            <button
              onClick={handleBulkClone}
              disabled={!selectedTemplateId || bulkSelectedAssets.length === 0}
              className="w-full mt-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              Clonar masivo ({bulkSelectedAssets.length})
            </button>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-2">Nueva plantilla</h4>
            <div className="space-y-2">
              <input
                value={newTemplate.code}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, code: e.target.value }))}
                placeholder="Código"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <input
                value={newTemplate.name}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <input
                value={newTemplate.brand}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, brand: e.target.value }))}
                placeholder="Marca"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <input
                value={newTemplate.model}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, model: e.target.value }))}
                placeholder="Modelo"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <input
                type="number"
                value={newTemplate.model_year}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, model_year: e.target.value }))}
                placeholder="Año"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <button
                onClick={handleCreateTemplate}
                className="w-full px-3 py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold"
              >
                Crear plantilla
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TechnicalStructurePanel;
