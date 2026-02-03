import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Trash2 } from 'lucide-react';

export const RequisitionModal = ({ asset, onClose, onSubmit }) => {
  const [reqItems, setReqItems] = useState([]);
  const [reqForm, setReqForm] = useState({ 
    req: '', 
    project: '', 
    priority: 'Media', 
    solicitadoPor: '',
    moneda: 'DOP' // NUEVO: Tipo de moneda
  });
  const [currentItem, setCurrentItem] = useState({ code: '', desc: '', qty: 1 });

  const handleFormChange = (e) => {
    setReqForm({ ...reqForm, [e.target.name]: e.target.value });
  };

  const handleItemChange = (e) => {
    setCurrentItem({ ...currentItem, [e.target.name]: e.target.value });
  };

  const handleAddItem = () => {
    if (currentItem.desc && currentItem.qty > 0) {
      setReqItems([...reqItems, currentItem]);
      setCurrentItem({ code: '', desc: '', qty: 1 }); // Reset for next item
    }
  };

  const handleRemoveItem = (index) => {
    setReqItems(reqItems.filter((_, i) => i !== index));
  };

  const handleInternalSubmit = async () => {
    if (reqItems.length === 0) {
      toast.error("Debe añadir al menos un ítem a la solicitud.");
      return;
    }
    await onSubmit(reqForm, reqItems);
    toast.success("Solicitud Creada");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 animate-scaleIn">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Solicitar Repuestos: {asset?.ficha}</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input name="solicitadoPor" value={reqForm.solicitadoPor} onChange={handleFormChange} placeholder="Solicitado Por" className="w-full border p-2 rounded text-sm" />
            <input name="req" value={reqForm.req} onChange={handleFormChange} placeholder="Nro. Requisición" className="w-full border p-2 rounded text-sm bg-gray-50 font-mono" />
            <input name="project" value={reqForm.project} onChange={handleFormChange} placeholder="Proyecto" className="w-full border p-2 rounded text-sm" />
            <select name="priority" value={reqForm.priority} onChange={handleFormChange} className="w-full border p-2 rounded text-sm bg-gray-50">
              <option>Baja</option>
              <option>Media</option>
              <option>Alta</option>
            </select>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Moneda</label>
              <select 
                name="moneda" 
                value={reqForm.moneda} 
                onChange={handleFormChange} 
                className="w-full border p-2 rounded text-sm bg-white"
              >
                <option value="DOP">🇩🇴 Pesos Dominicanos (DOP)</option>
                <option value="USD">🇺🇸 Dólares Estadounidenses (USD)</option>
              </select>
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg border">
            <p className="font-bold text-sm mb-2">Ítems a Solicitar</p>
            <div className="flex items-center gap-2 mb-2">
              <input name="code" value={currentItem.code} onChange={handleItemChange} placeholder="Código" className="w-32 border p-2 rounded text-sm"/>
              <input name="desc" value={currentItem.desc} onChange={handleItemChange} placeholder="Descripción" className="flex-1 border p-2 rounded text-sm"/>
              <input name="qty" type="number" value={currentItem.qty} onChange={handleItemChange} placeholder="Cant." className="w-20 border p-2 rounded text-sm"/>
              <button onClick={handleAddItem} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700">+</button>
            </div>
            {reqItems.map((item, index) => (
              <div key={index} className="text-sm border-t py-2 flex justify-between items-center">
                <span><strong className="font-mono text-xs bg-gray-200 px-1 rounded">{item.code || 'S/C'}</strong> ({item.qty}) {item.desc}</span>
                <button onClick={() => handleRemoveItem(index)} className="text-red-500 hover:text-red-700"><Trash2 size={14}/></button>
              </div>
            ))}
          </div>
          <button onClick={handleInternalSubmit} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 shadow-md">Crear Solicitud</button>
          <button onClick={onClose} className="w-full text-gray-500 py-2 text-sm">Cancelar</button>
        </div>
      </div>
    </div>
  );
};