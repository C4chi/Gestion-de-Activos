import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * QuotationModal
 * Modal para ingresar precios y cotizaciones cuando se marca una orden como ORDENADO
 */
export const QuotationModal = ({ isOpen, onClose, onConfirm, purchaseOrder }) => {
  const [items, setItems] = useState([]);
  const [fechaEstimada, setFechaEstimada] = useState('');

  useEffect(() => {
    if (isOpen && purchaseOrder?.purchase_items) {
      // Inicializar con los items existentes
      setItems(
        purchaseOrder.purchase_items.map(item => ({
          id: item.id,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          codigo: item.codigo,
          precio_unitario: item.precio_unitario || 0,
          proveedor: item.proveedor || '',
          cotizacion: item.cotizacion || '',
          moneda: item.moneda || 'DOP', // NUEVO: moneda por línea
        }))
      );
    }
    if (isOpen && purchaseOrder?.fecha_estimada_llegada) {
      setFechaEstimada(purchaseOrder.fecha_estimada_llegada);
    }
  }, [isOpen, purchaseOrder]);

  const handlePriceChange = (index, value) => {
    const newItems = [...items];
    newItems[index].precio_unitario = parseFloat(value) || 0;
    setItems(newItems);
  };

  const handleProveedorChange = (index, value) => {
    const newItems = [...items];
    newItems[index].proveedor = value;
    setItems(newItems);
  };

  const handleCotizacionChange = (index, value) => {
    const newItems = [...items];
    newItems[index].cotizacion = value;
    setItems(newItems);
  };

  const handleMonedaChange = (index, value) => {
    const newItems = [...items];
    newItems[index].moneda = value;
    setItems(newItems);
  };

  const handleSubmit = () => {
    if (!fechaEstimada) {
      alert('Debe indicar la fecha estimada de llegada');
      return;
    }
    onConfirm({ items, fechaEstimada }); // Moneda ahora está por línea en items
    onClose();
  };

  const total = items.reduce((sum, item) => {
    return sum + (item.precio_unitario * item.cantidad);
  }, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">💰 Ingresar Cotizaciones</h2>
            <p className="text-sm text-blue-100">
              Orden: {purchaseOrder?.numero_requisicion || 'N/A'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/20 p-2 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <label className="block text-sm font-semibold text-blue-800 mb-2">
              📅 Fecha Estimada de Llegada *
            </label>
            <input
              type="date"
              value={fechaEstimada}
              onChange={(e) => setFechaEstimada(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full p-2 border rounded-lg"
              required
            />
          </div>

          <div className="mb-3 text-sm text-gray-600">
            📋 Ingresa los precios unitarios, proveedores y referencias de cotización para cada ítem.
          </div>

          <table className="w-full text-sm">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="text-left p-2">#</th>
                <th className="text-left p-2">Descripción</th>
                <th className="text-center p-2">Cant.</th>
                <th className="text-left p-2 w-28">Proveedor</th>
                <th className="text-right p-2 w-24">Precio Unit.</th>
                <th className="text-center p-2 w-20">Moneda</th>
                <th className="text-left p-2 w-32">Cotización</th>
                <th className="text-right p-2 w-20">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const subtotal = item.precio_unitario * item.cantidad;
                return (
                  <tr key={item.id || idx} className="border-b hover:bg-gray-50">
                    <td className="p-2">{idx + 1}</td>
                    <td className="p-2">
                      <div className="font-medium">{item.descripcion}</div>
                      {item.codigo && (
                        <div className="text-xs text-gray-500">Cód: {item.codigo}</div>
                      )}
                    </td>
                    <td className="text-center p-2">{item.cantidad}</td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.proveedor}
                        onChange={(e) => handleProveedorChange(idx, e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:border-blue-400 focus:outline-none text-sm"
                        placeholder="Proveedor"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.precio_unitario}
                        onChange={(e) => handlePriceChange(idx, e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-right focus:border-blue-400 focus:outline-none"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="p-2">
                      <select
                        value={item.moneda}
                        onChange={(e) => handleMonedaChange(idx, e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-white focus:border-blue-400 focus:outline-none"
                      >
                        <option value="DOP">DOP</option>
                        <option value="USD">USD</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.cotizacion}
                        onChange={(e) => handleCotizacionChange(idx, e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:border-blue-400 focus:outline-none text-xs"
                        placeholder="COT-2025-001"
                      />
                    </td>
                    <td className="text-right p-2 font-semibold">
                      ${subtotal.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 font-bold">
              <tr>
                <td colSpan="6" className="text-right p-3">TOTAL ESTIMADO:</td>
                <td colSpan="2" className="text-right p-3 text-lg text-blue-600">
                  ${total.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex gap-3 justify-end bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition font-semibold"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            ✓ Confirmar y Marcar como ORDENADO
          </button>
        </div>
      </div>
    </div>
  );
};
