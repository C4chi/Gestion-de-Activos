import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Trash2, Plus, ChevronDown } from 'lucide-react';
import { useAppContext } from './AppContext';

export const RequisitionMultiAssetModal = ({ onClose, onSubmit }) => {
  const { assets } = useAppContext();
  
  // Estado del formulario principal
  const [reqForm, setReqForm] = useState({
    req: '',
    project: '',
    priority: 'Media',
    solicitadoPor: '',
    tipoCompra: 'GENERAL', // GENERAL o ACTIVO_ESPECIFICO
    moneda: 'DOP' // NUEVO: Tipo de moneda
  });

  // Líneas de compra - cada una con su propio activo
  const [reqItems, setReqItems] = useState([]);
  const [currentItem, setCurrentItem] = useState({
    code: '',
    desc: '',
    qty: 1,
    ficha: '', // NUEVA: Activo asignado a esta línea
    obsItem: ''
  });

  // Estado para expandir/contraer detalles
  const [expandedItemIndex, setExpandedItemIndex] = useState(null);

  // Cambios en el formulario principal
  const handleFormChange = (e) => {
    setReqForm({ ...reqForm, [e.target.name]: e.target.value });
  };

  // Cambios en el ítem actual
  const handleItemChange = (e) => {
    setCurrentItem({ ...currentItem, [e.target.name]: e.target.value });
  };

  // Agregar ítem a la lista
  const handleAddItem = () => {
    if (!currentItem.desc || currentItem.qty <= 0) {
      toast.error('Completa descripción y cantidad');
      return;
    }

    // Si es ACTIVO_ESPECIFICO, obligar selección de activo
    if (reqForm.tipoCompra === 'ACTIVO_ESPECIFICO' && !currentItem.ficha) {
      toast.error('Selecciona un activo para esta línea');
      return;
    }

    setReqItems([...reqItems, { ...currentItem }]);
    setCurrentItem({ code: '', desc: '', qty: 1, ficha: '', obsItem: '' });
    setExpandedItemIndex(null);
  };

  // Eliminar ítem
  const handleRemoveItem = (index) => {
    setReqItems(reqItems.filter((_, i) => i !== index));
  };

  // Editar ítem en la lista
  const handleEditItem = (index) => {
    setCurrentItem(reqItems[index]);
    setReqItems(reqItems.filter((_, i) => i !== index));
    setExpandedItemIndex(null);
  };

  // Obtener detalles del activo seleccionado
  const getAssetDetails = (ficha) => {
    if (!ficha) return null;
    return assets.find(a => a.ficha === ficha);
  };

  // Validaciones antes de enviar
  const handleInternalSubmit = async () => {
    if (!reqForm.req) {
      toast.error('Ingresa número de requisición');
      return;
    }
    if (!reqForm.solicitadoPor) {
      toast.error('Ingresa quién solicita');
      return;
    }
    if (reqItems.length === 0) {
      toast.error('Debe añadir al menos una línea a la solicitud');
      return;
    }

    // Validar que todas las líneas tengan activo si es requerido
    if (reqForm.tipoCompra === 'ACTIVO_ESPECIFICO') {
      const conFichaVacia = reqItems.some(item => !item.ficha);
      if (conFichaVacia) {
        toast.error('Todas las líneas deben tener un activo asignado');
        return;
      }
    }

    // Llamar al callback del padre
    await onSubmit({
      ...reqForm,
      items: reqItems
    });

    toast.success('Solicitud Creada');
    onClose();
  };

  // Resumen de activos involucrados
  const activosInvolucrados = useMemo(() => {
    return [...new Set(reqItems.map(item => item.ficha).filter(f => f))];
  }, [reqItems]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex items-start justify-center p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl p-6 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Solicitud de Compra Múltiple</h2>
            <p className="text-sm text-gray-500">Crea una requisición para varios activos en una sola orden</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* ═══ SECCIÓN 1: INFORMACIÓN GENERAL ═══ */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-bold text-blue-900 mb-4">📋 Información General</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nro. Requisición</label>
                <input
                  name="req"
                  value={reqForm.req}
                  onChange={handleFormChange}
                  placeholder="REQ-2026-0001"
                  className="w-full border p-3 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Solicitado Por</label>
                <input
                  name="solicitadoPor"
                  value={reqForm.solicitadoPor}
                  onChange={handleFormChange}
                  placeholder="Nombre del solicitante"
                  className="w-full border p-3 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Proyecto</label>
                <input
                  name="project"
                  value={reqForm.project}
                  onChange={handleFormChange}
                  placeholder="Mantenimiento General / Preventivo"
                  className="w-full border p-3 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Prioridad</label>
                <select
                  name="priority"
                  value={reqForm.priority}
                  onChange={handleFormChange}
                  className="w-full border p-3 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Baja">🟢 Baja</option>
                  <option value="Media">🟡 Media</option>
                  <option value="Alta">🔴 Alta</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo de Compra</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tipoCompra"
                      value="GENERAL"
                      checked={reqForm.tipoCompra === 'GENERAL'}
                      onChange={handleFormChange}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">🔹 General (sin activos específicos)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tipoCompra"
                      value="ACTIVO_ESPECIFICO"
                      checked={reqForm.tipoCompra === 'ACTIVO_ESPECIFICO'}
                      onChange={handleFormChange}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">🎯 Vinculada a Activos (obligatorio seleccionar por línea)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Moneda</label>
                <select
                  name="moneda"
                  value={reqForm.moneda}
                  onChange={handleFormChange}
                  className="w-full border p-3 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="DOP">🇩🇴 Pesos Dominicanos (DOP)</option>
                  <option value="USD">🇺🇸 Dólares Estadounidenses (USD)</option>
                </select>
              </div>
            </div>
          </div>

          {/* ═══ SECCIÓN 2: AGREGAR LÍNEAS ═══ */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="font-bold text-gray-900 mb-4">📦 Línea de Compra (Nueva)</h3>

            <div className="space-y-3">
              {/* Fila 1: Código y Descripción */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Código</label>
                  <input
                    name="code"
                    value={currentItem.code}
                    onChange={handleItemChange}
                    placeholder="OLI-001"
                    className="w-full border p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Descripción *</label>
                  <input
                    name="desc"
                    value={currentItem.desc}
                    onChange={handleItemChange}
                    placeholder="Ej: Aceite SAE 40 Premium (5L)"
                    className="w-full border p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                </div>
              </div>

              {/* Fila 2: Cantidad y Activo */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cantidad *</label>
                  <input
                    name="qty"
                    type="number"
                    value={currentItem.qty}
                    onChange={handleItemChange}
                    min="1"
                    className="w-full border p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Activo Relacionado
                    {reqForm.tipoCompra === 'ACTIVO_ESPECIFICO' && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    name="ficha"
                    value={currentItem.ficha}
                    onChange={handleItemChange}
                    className="w-full border p-2 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
                  >
                    <option value="">-- Seleccionar Activo --</option>
                    {assets.map(asset => (
                      <option key={asset.id} value={asset.ficha}>
                        {asset.ficha} - {asset.marca} {asset.modelo}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fila 3: Observaciones */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Observaciones (opcional)</label>
                <textarea
                  name="obsItem"
                  value={currentItem.obsItem}
                  onChange={handleItemChange}
                  placeholder="Ej: Marca preferida, especificaciones..."
                  rows="2"
                  className="w-full border p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              </div>

              {/* Botón agregar */}
              <button
                onClick={handleAddItem}
                className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
              >
                <Plus size={18} /> Agregar Línea
              </button>
            </div>
          </div>

          {/* ═══ SECCIÓN 3: LISTADO DE LÍNEAS ═══ */}
          {reqItems.length > 0 && (
            <div className="bg-white border-2 border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  ✅ Líneas Agregadas ({reqItems.length})
                </h3>
                {activosInvolucrados.length > 0 && (
                  <div className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full">
                    {activosInvolucrados.length} activo(s) involucrado(s)
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {reqItems.map((item, index) => (
                  <div
                    key={index}
                    className="border border-gray-300 rounded-lg overflow-hidden bg-gray-50 hover:bg-gray-100 transition"
                  >
                    {/* Encabezado línea */}
                    <div
                      className="p-3 cursor-pointer flex items-center justify-between"
                      onClick={() =>
                        setExpandedItemIndex(expandedItemIndex === index ? null : index)
                      }
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="bg-gray-300 text-gray-800 font-bold w-6 h-6 rounded-full flex items-center justify-center text-xs">
                            {index + 1}
                          </span>
                          <span className="font-semibold text-gray-900">
                            ({item.qty}x) {item.desc}
                          </span>
                          {item.ficha && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              📌 {item.ficha}
                            </span>
                          )}
                        </div>
                        {item.code && (
                          <div className="text-xs text-gray-500 mt-1 ml-8">
                            Código: <span className="font-mono">{item.code}</span>
                          </div>
                        )}
                      </div>
                      <ChevronDown
                        size={18}
                        className={`text-gray-500 transition ${
                          expandedItemIndex === index ? 'rotate-180' : ''
                        }`}
                      />
                    </div>

                    {/* Detalles expandidos */}
                    {expandedItemIndex === index && (
                      <div className="border-t border-gray-300 bg-white p-3 space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="font-semibold text-gray-700">Código:</span>
                            <div className="text-gray-600">{item.code || 'Sin código'}</div>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-700">Cantidad:</span>
                            <div className="text-gray-600">{item.qty} unidades</div>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-700">Activo:</span>
                            <div className="text-gray-600">
                              {item.ficha ? (
                                <>
                                  <div className="font-mono text-blue-600">{item.ficha}</div>
                                  {getAssetDetails(item.ficha) && (
                                    <div className="text-xs text-gray-500">
                                      {getAssetDetails(item.ficha).marca}{' '}
                                      {getAssetDetails(item.ficha).modelo}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <span className="text-gray-400 italic">Sin activo asignado</span>
                              )}
                            </div>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-700">Observaciones:</span>
                            <div className="text-gray-600">
                              {item.obsItem || 'Ninguna'}
                            </div>
                          </div>
                        </div>

                        {/* Botones de acción */}
                        <div className="flex gap-2 pt-2 border-t border-gray-200">
                          <button
                            onClick={() => handleEditItem(index)}
                            className="flex-1 bg-yellow-500 text-white px-3 py-2 rounded text-sm font-bold hover:bg-yellow-600 transition"
                          >
                            ✎ Editar
                          </button>
                          <button
                            onClick={() => handleRemoveItem(index)}
                            className="flex-1 bg-red-500 text-white px-3 py-2 rounded text-sm font-bold hover:bg-red-600 transition flex items-center justify-center gap-1"
                          >
                            <Trash2 size={14} /> Eliminar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Resumen de activos */}
              {activosInvolucrados.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-300">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Activos Involucrados:</p>
                  <div className="flex flex-wrap gap-2">
                    {activosInvolucrados.map(ficha => {
                      const asset = getAssetDetails(ficha);
                      return (
                        <div
                          key={ficha}
                          className="bg-blue-50 border border-blue-300 rounded-lg px-3 py-2 text-xs"
                        >
                          <div className="font-semibold text-blue-900">{ficha}</div>
                          <div className="text-blue-700">
                            {asset?.marca} {asset?.modelo}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ BOTONES DE ACCIÓN ═══ */}
          <div className="flex gap-3">
            <button
              onClick={handleInternalSubmit}
              className="flex-1 bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 shadow-md transition text-lg"
            >
              ✅ Crear Solicitud
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-400 transition"
            >
              ✕ Cancelar
            </button>
          </div>

          {/* Notas de ayuda */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            <p className="font-semibold mb-1">💡 Consejos:</p>
            <ul className="list-disc list-inside space-y-1 text-amber-700">
              <li>Cada línea representa un item individual de la compra</li>
              <li>
                Si seleccionas "Vinculada a Activos", cada línea {' '}
                <strong>debe tener un activo asignado</strong>
              </li>
              <li>Puedes vincular múltiples líneas al mismo activo</li>
              <li>Los activos seleccionados aparecerán en el resumen final</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
