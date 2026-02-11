import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X, DollarSign, Calendar, User, Phone } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { toast } from 'react-hot-toast';

/**
 * ItemQuotationModal
 * Gestiona cotizaciones de múltiples proveedores para UN item específico
 */
export const ItemQuotationModal = ({ isOpen, onClose, item, purchaseOrder, onComplete }) => {
  const [quotations, setQuotations] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && item) {
      loadQuotations();
    }
  }, [isOpen, item]);

  const loadQuotations = async () => {
    setLoading(true);
    try {
      // Cargar cotizaciones existentes de este item
      const { data, error } = await supabase
        .from('purchase_quotation_items')
        .select(`
          *,
          purchase_quotations (*)
        `)
        .eq('purchase_item_id', item.id);

      if (error) throw error;

      if (data && data.length > 0) {
        const formatted = data.map(qi => ({
          id: qi.purchase_quotations.id,
          quotation_item_id: qi.id,
          proveedor: qi.purchase_quotations.proveedor,
          contacto_proveedor: qi.purchase_quotations.contacto_proveedor || '',
          telefono_proveedor: qi.purchase_quotations.telefono_proveedor || '',
          numero_cotizacion: qi.purchase_quotations.numero_cotizacion || '',
          precio_unitario: qi.precio_unitario,
          moneda: qi.moneda,
          disponible: qi.disponible,
          dias_entrega: qi.purchase_quotations.dias_entrega || '',
          notas: qi.purchase_quotations.notas || '',
          fecha_cotizacion: qi.purchase_quotations.fecha_cotizacion
        }));
        setQuotations(formatted);
      } else {
        // Inicializar con una cotización vacía
        setQuotations([createEmptyQuotation()]);
      }
    } catch (error) {
      console.error('Error cargando cotizaciones:', error);
      setQuotations([createEmptyQuotation()]);
    } finally {
      setLoading(false);
    }
  };

  const createEmptyQuotation = () => ({
    id: crypto.randomUUID(),
    proveedor: '',
    contacto_proveedor: '',
    telefono_proveedor: '',
    numero_cotizacion: '',
    precio_unitario: 0,
    moneda: 'DOP',
    disponible: true,
    dias_entrega: '',
    notas: '',
    fecha_cotizacion: new Date().toISOString().split('T')[0]
  });

  const handleAdd = () => {
    setQuotations([...quotations, createEmptyQuotation()]);
  };

  const handleRemove = (index) => {
    if (quotations.length <= 1) {
      toast.error('Debe haber al menos 1 cotización');
      return;
    }
    setQuotations(quotations.filter((_, i) => i !== index));
  };

  const updateQuotation = (index, field, value) => {
    const updated = [...quotations];
    updated[index][field] = value;
    setQuotations(updated);
  };

  const handleSave = async () => {
    // Validar
    const incompletas = quotations.filter(q => !q.proveedor || !q.numero_cotizacion);
    if (incompletas.length > 0) {
      toast.error('Todas las cotizaciones deben tener Proveedor y Número de Cotización');
      return;
    }

    const sinPrecio = quotations.filter(q => !q.precio_unitario || parseFloat(q.precio_unitario) <= 0);
    if (sinPrecio.length > 0) {
      toast.error('Todas las cotizaciones deben tener un precio válido');
      return;
    }

    setSaving(true);

    try {
      // Guardar cada cotización
      for (const quot of quotations) {
        // 1. Crear/actualizar purchase_quotation
        const { data: quotationData, error: quotationError } = await supabase
          .from('purchase_quotations')
          .upsert({
            id: typeof quot.id === 'string' && quot.id.includes('-') ? undefined : quot.id,
            purchase_order_id: purchaseOrder.id,
            proveedor: quot.proveedor,
            contacto_proveedor: quot.contacto_proveedor,
            telefono_proveedor: quot.telefono_proveedor,
            numero_cotizacion: quot.numero_cotizacion,
            fecha_cotizacion: quot.fecha_cotizacion,
            dias_entrega: parseInt(quot.dias_entrega) || null,
            notas: quot.notas,
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (quotationError) throw quotationError;

        // 2. Crear/actualizar purchase_quotation_items
        const { error: itemError } = await supabase
          .from('purchase_quotation_items')
          .upsert({
            id: quot.quotation_item_id,
            quotation_id: quotationData.id,
            purchase_item_id: item.id,
            precio_unitario: parseFloat(quot.precio_unitario),
            moneda: quot.moneda,
            disponible: quot.disponible,
            updated_at: new Date().toISOString()
          });

        if (itemError) throw itemError;
      }

      toast.success(`${quotations.length} cotización(es) guardada(s) para ${item.descripcion}`);
      onComplete?.();
    } catch (error) {
      console.error('Error guardando cotizaciones:', error);
      toast.error('Error al guardar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-5 rounded-t-xl flex-shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                <DollarSign className="w-6 h-6" />
                Cotizaciones: {item?.descripcion}
              </h3>
              <p className="text-sm text-purple-100 mt-1">
                Cantidad: {item?.cantidad} | Código: {item?.codigo || 'N/A'}
              </p>
            </div>
            <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-lg transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Cargando...</div>
          ) : (
            <div className="space-y-4">
              {quotations.map((quot, idx) => (
                <div key={quot.id || idx} className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
                  {/* Header cotización */}
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-purple-900">
                      Cotización #{idx + 1}
                      {idx === 0 && <span className="ml-2 text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">OBLIGATORIA</span>}
                    </h4>
                    {quotations.length > 1 && (
                      <button
                        onClick={() => handleRemove(idx)}
                        className="text-red-600 hover:bg-red-100 p-2 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Campos */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Proveedor */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        <User className="w-4 h-4 inline mr-1" />
                        Proveedor *
                      </label>
                      <input
                        type="text"
                        value={quot.proveedor}
                        onChange={(e) => updateQuotation(idx, 'proveedor', e.target.value)}
                        placeholder="Nombre del proveedor"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400"
                        required
                      />
                    </div>

                    {/* Número Cotización */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Nº Cotización *
                      </label>
                      <input
                        type="text"
                        value={quot.numero_cotizacion}
                        onChange={(e) => updateQuotation(idx, 'numero_cotizacion', e.target.value)}
                        placeholder="COT-2026-001"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400"
                        required
                      />
                    </div>

                    {/* Contacto */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Contacto
                      </label>
                      <input
                        type="text"
                        value={quot.contacto_proveedor}
                        onChange={(e) => updateQuotation(idx, 'contacto_proveedor', e.target.value)}
                        placeholder="Nombre del contacto"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400"
                      />
                    </div>

                    {/* Teléfono */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        <Phone className="w-4 h-4 inline mr-1" />
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        value={quot.telefono_proveedor}
                        onChange={(e) => updateQuotation(idx, 'telefono_proveedor', e.target.value)}
                        placeholder="809-555-5555"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400"
                      />
                    </div>

                    {/* Precio */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        <DollarSign className="w-4 h-4 inline mr-1" />
                        Precio Unitario *
                      </label>
                      <input
                        type="number"
                        value={quot.precio_unitario}
                        onChange={(e) => updateQuotation(idx, 'precio_unitario', e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400"
                        required
                      />
                    </div>

                    {/* Moneda */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Moneda
                      </label>
                      <select
                        value={quot.moneda}
                        onChange={(e) => updateQuotation(idx, 'moneda', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 bg-white"
                      >
                        <option value="DOP">DOP</option>
                        <option value="USD">USD</option>
                      </select>
                    </div>

                    {/* Días Entrega */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Días de Entrega
                      </label>
                      <input
                        type="number"
                        value={quot.dias_entrega}
                        onChange={(e) => updateQuotation(idx, 'dias_entrega', e.target.value)}
                        placeholder="5"
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400"
                      />
                    </div>

                    {/* Disponible */}
                    <div className="flex items-center gap-2 mt-6">
                      <input
                        type="checkbox"
                        checked={quot.disponible}
                        onChange={(e) => updateQuotation(idx, 'disponible', e.target.checked)}
                        className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <label className="text-sm font-semibold text-gray-700">
                        Disponible en stock
                      </label>
                    </div>
                  </div>

                  {/* Notas */}
                  <div className="mt-3">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Notas / Condiciones
                    </label>
                    <textarea
                      value={quot.notas}
                      onChange={(e) => updateQuotation(idx, 'notas', e.target.value)}
                      placeholder="Ej: Incluye IVA, garantía 6 meses..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 text-sm"
                      rows={2}
                    />
                  </div>

                  {/* Subtotal */}
                  <div className="mt-3 p-3 bg-white rounded-lg border border-purple-300">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-700">Subtotal ({item?.cantidad} unidades):</span>
                      <span className="text-lg font-bold text-purple-700">
                        {quot.moneda} ${(parseFloat(quot.precio_unitario || 0) * item?.cantidad).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Botón agregar */}
              <button
                onClick={handleAdd}
                className="w-full py-3 border-2 border-dashed border-purple-300 rounded-xl text-purple-600 hover:bg-purple-50 transition font-semibold flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Agregar Otra Cotización ({quotations.length} actual{quotations.length !== 1 ? 'es' : ''})
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t flex-shrink-0 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {quotations.length} cotización(es) para este item
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition font-bold disabled:opacity-50 shadow-lg"
            >
              {saving ? 'Guardando...' : '💾 Guardar Cotizaciones'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemQuotationModal;
