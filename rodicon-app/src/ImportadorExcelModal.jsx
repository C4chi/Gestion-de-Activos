import React, { useState } from 'react';
import { FullScreenModal } from './FullScreenModal';
import { useAppContext } from './AppContext';
import { Upload, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export const ImportadorExcelModal = ({ onClose }) => {
  const { assets, updateAsset } = useAppContext();
  const [previewData, setPreviewData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1=upload, 2=preview, 3=done

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const workbook = XLSX.read(e.target.result, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        // Validar estructura
        if (data.length === 0) {
          toast.error('El archivo Excel está vacío');
          return;
        }

        // Mapear datos y validar
        const mapped = data
          .map((row) => {
            const ficha = String(row.ficha || row.FICHA || '').trim();
            const status = String(row.status || row.STATUS || row.Estado || '').trim().toUpperCase();
            const observacion = String(row.observacion || row.OBSERVACION || row.Observación || row.reporte || row.REPORTE || row.Reporte || '').trim();

            if (!ficha) return null;

            // Buscar el activo en la app
            const asset = assets.find(a => String(a.ficha).trim() === ficha);

            if (!asset) {
              return {
                ficha,
                status,
                observacion,
                error: `❌ Equipo no encontrado`,
                found: false,
              };
            }

            return {
              id: asset.id,
              ficha,
              status: status || asset.status,
              observacion: observacion || asset.observaciones || '',
              currentStatus: asset.status,
              currentObservacion: asset.observacion_mecanica || '',
              error: null,
              found: true,
            };
          })
          .filter(Boolean);

        if (mapped.length === 0) {
          toast.error('No se encontraron datos válidos en el Excel');
          return;
        }

        setPreviewData(mapped);
        setStep(2);
        toast.success(`${mapped.filter(m => m.found).length} equipos listos para actualizar`);
      };
      reader.readAsBinaryString(file);
    } catch (error) {
      console.error('Error leyendo Excel:', error);
      toast.error('Error al leer el archivo Excel');
    }
  };

  const handleImport = async () => {
    const toUpdate = previewData.filter(d => d.found);
    if (toUpdate.length === 0) {
      toast.error('No hay equipos para actualizar');
      return;
    }

    setLoading(true);

    try {
      // Actualizar todos en paralelo usando Promise.allSettled
      const results = await Promise.allSettled(
        toUpdate.map(item => 
          updateAsset(item.id, {
            status: item.status,
            observacion_mecanica: item.observacion,
          })
        )
      );

      // Contar éxitos y errores
      const updated = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
      const failed = results.length - updated;

      setLoading(false);
      setStep(3);
      
      if (failed > 0) {
        toast.success(`✅ ${updated} equipos actualizados, ${failed} errores`);
      } else {
        toast.success(`✅ ${updated} equipos actualizados correctamente`);
      }
    } catch (error) {
      console.error('Error en importación:', error);
      setLoading(false);
      toast.error('Error al importar equipos');
    }
  };

  const handleClear = () => {
    setPreviewData([]);
    setStep(1);
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) fileInput.value = '';
  };

  return (
    <FullScreenModal title="📤 Importador de Excel" color="blue" onClose={onClose}>
      {step === 1 && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white border-2 border-dashed border-blue-300 rounded-xl p-12 text-center">
            <Upload className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">Sube tu archivo Excel</h3>
            <p className="text-gray-600 mb-6">
              El Excel debe tener 3 columnas: <strong>ficha</strong>, <strong>status</strong>, <strong>reporte</strong>
            </p>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
              id="fileInput"
            />
            <label
              htmlFor="fileInput"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-bold cursor-pointer hover:bg-blue-700 transition"
            >
              Seleccionar archivo
            </label>

            <div className="mt-12 p-6 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-700">
                <strong>Ejemplo de formato Excel:</strong>
              </p>
              <table className="w-full text-sm mt-3 border-collapse">
                <thead>
                  <tr className="bg-blue-100">
                    <th className="border p-2 text-left">ficha</th>
                    <th className="border p-2 text-left">status</th>
                    <th className="border p-2 text-left">reporte</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border p-2">F001</td>
                    <td className="border p-2">DISPONIBLE</td>
                    <td className="border p-2">Revisado OK</td>
                  </tr>
                  <tr>
                    <td className="border p-2">F002</td>
                    <td className="border p-2">EN TALLER</td>
                    <td className="border p-2">Cambio de llantas</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-gray-800">
                  {previewData.filter(d => d.found).length} equipos serán actualizados
                </p>
                <p className="text-sm text-gray-600">
                  {previewData.filter(d => !d.found).length} equipos no fueron encontrados
                </p>
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="p-3 text-left font-bold text-gray-700">Ficha</th>
                  <th className="p-3 text-left font-bold text-gray-700">Status Actual</th>
                  <th className="p-3 text-left font-bold text-gray-700">Nuevo Status</th>
                  <th className="p-3 text-left font-bold text-gray-700">Observación</th>
                  <th className="p-3 text-left font-bold text-gray-700">Estado</th>
                </tr>
              </thead>
              <tbody>
                {previewData.map((item, idx) => (
                  <tr key={idx} className={item.found ? 'border-b hover:bg-gray-50' : 'border-b bg-red-50'}>
                    <td className="p-3 font-mono font-bold">{item.ficha}</td>
                    <td className="p-3 text-gray-600">{item.currentStatus}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-white text-xs font-bold ${
                        item.status === 'DISPONIBLE' ? 'bg-green-600' :
                        item.status === 'EN TALLER' ? 'bg-yellow-600' :
                        item.status === 'VENDIDO' ? 'bg-red-600' :
                        'bg-gray-600'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3 text-gray-600 max-w-xs truncate" title={item.observacion}>
                      {item.observacion || '—'}
                    </td>
                    <td className="p-3">
                      {item.found ? (
                        <span className="flex items-center gap-1 text-green-600 font-bold">
                          <CheckCircle className="w-4 h-4" /> OK
                        </span>
                      ) : (
                        <span className="text-red-600 font-bold text-xs">{item.error}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={handleClear}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleImport}
              disabled={loading || previewData.filter(d => d.found).length === 0}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition disabled:opacity-50"
            >
              {loading ? '⏳ Importando...' : `✅ Importar ${previewData.filter(d => d.found).length} equipos`}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="max-w-md mx-auto text-center py-12">
          <CheckCircle className="w-20 h-20 text-green-600 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-800 mb-2">¡Importación completada!</h3>
          <p className="text-gray-600 mb-8">
            Los equipos han sido actualizados correctamente en la base de datos.
          </p>
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
          >
            Cerrar
          </button>
        </div>
      )}
    </FullScreenModal>
  );
};
