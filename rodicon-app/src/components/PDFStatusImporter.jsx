import React, { useState } from 'react';
import { FullScreenModal } from '../FullScreenModal';
import { Upload, AlertCircle, CheckCircle, FileText, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePDFParser } from '../hooks/usePDFParser';
import { supabase } from '../supabaseClient';

/**
 * PDFStatusImporter
 * Importa estados y observaciones desde un PDF
 * Detecta automáticamente fichas y estados
 */
export const PDFStatusImporter = ({ assets, onSuccess, onClose }) => {
  const { extractTextFromPDF, parseAssetStatus } = usePDFParser();
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview, 3: Confirmar
  const [file, setFile] = useState(null);
  const [extractedData, setExtractedData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUpdates, setSelectedUpdates] = useState(new Set());

  // Paso 1: Procesar PDF
  const handleFilePicked = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.type.includes('pdf')) {
      toast.error('Por favor selecciona un archivo PDF');
      return;
    }

    setLoading(true);
    try {
      const text = await extractTextFromPDF(selectedFile);
      const parsed = parseAssetStatus(text);

      if (parsed.length === 0) {
        toast.error('No se encontraron fichas en el PDF');
        setLoading(false);
        return;
      }

      // Validar fichas contra activos existentes
      const validUpdates = parsed
        .map((update) => {
          const asset = assets.find((a) => a.ficha === update.ficha);
          return {
            ...update,
            exists: !!asset,
            currentStatus: asset?.status,
            currentObservation: asset?.observacion_mecanica,
            willChange: asset?.status !== update.status || asset?.observacion_mecanica !== update.observacion_mecanica,
          };
        })
        .sort((a, b) => (b.exists ? 1 : -1)); // Primero los que existen

      setExtractedData(validUpdates);
      setSelectedUpdates(new Set(validUpdates.filter((u) => u.exists).map((_, i) => i)));
      setFile(selectedFile);
      setStep(2);
      toast.success(`✅ Se encontraron ${validUpdates.filter((u) => u.exists).length} activos`);
    } catch (err) {
      toast.error('Error al procesar PDF');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Paso 2: Procesar actualizaciones
  const handleApplyUpdates = async () => {
    const updates = Array.from(selectedUpdates).map((i) => extractedData[i]);

    if (updates.length === 0) {
      toast.error('Selecciona al menos un activo para actualizar');
      return;
    }

    setLoading(true);
    try {
      const errors = [];

      for (const update of updates) {
        const { error } = await supabase
          .from('activos')
          .update({
            status: update.status,
            observacion_mecanica: update.observacion_mecanica,
            updated_at: new Date().toISOString(),
          })
          .eq('ficha', update.ficha);

        if (error) {
          errors.push(`${update.ficha}: ${error.message}`);
        }
      }

      if (errors.length === 0) {
        toast.success(`✅ ${updates.length} activos actualizados exitosamente`);
        onSuccess?.();
        onClose();
      } else {
        toast.error(`⚠️ ${errors.length} errores, ${updates.length - errors.length} exitosos`);
        console.error(errors);
        onSuccess?.();
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleUpdate = (idx) => {
    const newSet = new Set(selectedUpdates);
    if (newSet.has(idx)) {
      newSet.delete(idx);
    } else {
      newSet.add(idx);
    }
    setSelectedUpdates(newSet);
  };

  const toggleAll = () => {
    if (selectedUpdates.size === extractedData.filter((u) => u.exists).length) {
      setSelectedUpdates(new Set());
    } else {
      setSelectedUpdates(new Set(extractedData.filter((u) => u.exists).map((_, i) => i)));
    }
  };

  return (
    <FullScreenModal title="📄 Importar Estados desde PDF" color="blue" onClose={onClose}>
      {step === 1 && (
        <div className="max-w-2xl mx-auto py-8">
          <div className="text-center">
            <FileText className="w-16 h-16 mx-auto text-blue-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Sube tu PDF de Estados</h2>
            <p className="text-gray-600 mb-6">
              El sistema buscará fichas automáticamente y extraerá estados y observaciones
            </p>

            <label className="block">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFilePicked}
                disabled={loading}
                className="hidden"
              />
              <div className="border-2 border-dashed border-blue-300 rounded-xl p-8 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition">
                {loading ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                    <p className="text-gray-600">Procesando PDF...</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                    <p className="font-semibold text-blue-900">Arrastra tu PDF aquí</p>
                    <p className="text-sm text-gray-600">o haz clic para seleccionar</p>
                  </>
                )}
              </div>
            </label>

            <div className="mt-8 bg-blue-50 rounded-lg p-4 text-left">
              <h3 className="font-bold text-blue-900 mb-3">📋 Formato esperado:</h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>✓ Fichas: ABC123, XYZ789 (letras/números de 3-10 caracteres)</li>
                <li>✓ Estados: DISPONIBLE, EN_MANTENIMIENTO, VENDIDO</li>
                <li>✓ Obs: Después de palabras clave (obs:, observacion:, etc.)</li>
                <li>✓ Ej: "ABC123 Estado: DISPONIBLE. Obs: Cambio de aceite realizado"</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {step === 2 && extractedData.length > 0 && (
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-bold">
                Vista Previa de Cambios ({extractedData.filter((u) => u.exists).length} de {extractedData.length})
              </h2>
            </div>

            {extractedData.some((u) => !u.exists) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 flex gap-3">
                <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-semibold text-yellow-900">⚠️ Fichas no encontradas:</p>
                  <p className="text-sm text-yellow-800">
                    {extractedData
                      .filter((u) => !u.exists)
                      .map((u) => u.ficha)
                      .join(', ')}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedUpdates.size === extractedData.filter((u) => u.exists).length}
                  onChange={toggleAll}
                  className="w-4 h-4"
                />
                <span className="text-sm font-semibold">Seleccionar todos los válidos</span>
              </label>
            </div>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {extractedData.map((update, idx) => (
              <div
                key={idx}
                className={`border rounded-lg p-4 transition ${
                  update.exists
                    ? selectedUpdates.has(idx)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                    : 'border-red-200 bg-red-50 opacity-60'
                }`}
              >
                <div className="flex gap-4">
                  {update.exists && (
                    <input
                      type="checkbox"
                      checked={selectedUpdates.has(idx)}
                      onChange={() => toggleUpdate(idx)}
                      className="w-4 h-4 mt-1 flex-shrink-0"
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-2">
                      <div>
                        <p className="font-bold text-lg">
                          {update.ficha}
                          {update.exists ? (
                            <CheckCircle className="inline ml-2 text-green-600" size={18} />
                          ) : (
                            <X className="inline ml-2 text-red-600" size={18} />
                          )}
                        </p>
                      </div>
                    </div>

                    {update.exists && (
                      <>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Estado Actual</p>
                            <p className="font-semibold text-gray-900">{update.currentStatus || '—'}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Nuevo Estado</p>
                            <p className="font-semibold text-blue-600">{update.status}</p>
                          </div>
                        </div>

                        {update.observacion_mecanica && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-600">Observación nueva:</p>
                            <p className="text-sm text-gray-900 bg-white p-2 rounded border border-gray-200">
                              {update.observacion_mecanica}
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    {!update.exists && (
                      <p className="text-sm text-red-700">No encontrada en el sistema</p>
                    )}

                    {update.source && (
                      <p className="text-xs text-gray-500 mt-2 italic">"{update.source}"</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setStep(1)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-semibold"
            >
              Volver
            </button>
            <button
              onClick={handleApplyUpdates}
              disabled={selectedUpdates.size === 0 || loading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition font-semibold"
            >
              {loading ? '⏳ Actualizando...' : `✅ Aplicar ${selectedUpdates.size} cambios`}
            </button>
          </div>
        </div>
      )}
    </FullScreenModal>
  );
};
