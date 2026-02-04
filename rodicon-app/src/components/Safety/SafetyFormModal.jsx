import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { X, Search, UploadCloud } from 'lucide-react';
import { supabase } from '../../supabaseClient';

/**
 * SafetyFormModal
 * Modal para crear/editar reportes de seguridad
 * Schema: ficha, tipo, prioridad, descripcion, asignado_a
 */
export const SafetyFormModal = ({
  onClose,
  onSubmit,
  initialData = null,
  title = '⚠️ Nuevo Reporte de Seguridad',
  assets = [],
  appUsers = [],
  asset = null,
  currentUserId = null,
}) => {
  const [formData, setFormData] = useState({
    ficha: initialData?.ficha || asset?.ficha || '',
    tipo: initialData?.tipo || 'INCIDENTE',
    prioridad: initialData?.prioridad || 'Baja',
    plazo_horas: initialData?.plazo_horas || 24,
    descripcion: initialData?.descripcion || '',
    asignado_a: initialData?.asignado_a || '',
    lugar: initialData?.lugar || '',
    turno: initialData?.turno || '',
    hora_incidente: initialData?.hora_incidente || '',
    notas: initialData?.notas || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fichaSearch, setFichaSearch] = useState('');
  const [files, setFiles] = useState([]);
  const [showAssetList, setShowAssetList] = useState(false);

  const TIPOS = [
    { value: 'ACCIDENTE', label: '🚨 Accidente' },
    { value: 'INCIDENTE', label: '⚠️ Incidente' },
    { value: 'NEAR_MISS', label: '⚡ Cuasi Accidente' },
    { value: 'SUGGESTION', label: '💡 Sugerencia' },
  ];

  const PRIORIDADES = [
    { value: 'Baja', label: '🟢 Baja', color: 'bg-green-100 border-green-300' },
    { value: 'Media', label: '🟡 Media', color: 'bg-yellow-100 border-yellow-300' },
    { value: 'Alta', label: '🔴 Alta', color: 'bg-red-100 border-red-300' },
  ];

  const PLAZOS = [
    { value: 24, label: '⏱️ 24 horas' },
    { value: 48, label: '⏱️ 48 horas' },
    { value: 72, label: '⏱️ 72 horas' },
  ];

  const filteredAssets = useMemo(() => {
    const term = fichaSearch.toLowerCase();
    return (assets || [])
      .filter((a) =>
        (a.ficha || '').toLowerCase().includes(term) ||
        (a.marca || '').toLowerCase().includes(term) ||
        (a.modelo || '').toLowerCase().includes(term)
      )
      .slice(0, 50); // limitar render pero seguir siendo lista desplegable
  }, [assets, fichaSearch]);

  const userOptions = useMemo(() => appUsers || [], [appUsers]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    // Validaciones
    // La ficha es ahora OPCIONAL
    if (!formData.descripcion.trim()) {
      toast.error('Escribe una descripción del incidente');
      return;
    }
    if (!formData.tipo) {
      toast.error('Selecciona el tipo de incidente');
      return;
    }

    setIsSubmitting(true);
    try {
      let evidenceUrls = [];
      if (files && files.length > 0) {
        evidenceUrls = (await Promise.all(files.map(uploadEvidence))).filter(Boolean);
      }

      const primaryEvidence = evidenceUrls[0] || null;
      const extraEvidences = evidenceUrls.slice(1);

      const notasPieces = [];
      if (formData.notas) notasPieces.push(formData.notas);
      if (formData.hora_incidente) notasPieces.push(`Hora del incidente: ${formData.hora_incidente}`);
      if (extraEvidences.length) notasPieces.push(`Evidencias adicionales: ${extraEvidences.join(', ')}`);
      const notas = notasPieces.join('\n');

      await onSubmit({
        ...formData,
        reportado_por: currentUserId,
        foto_url: primaryEvidence,
        notas,
      });
      resetForm();
    } catch (err) {
      toast.error(err.message || 'Error al crear reporte');
    } finally {
      setIsSubmitting(false);
    }
  };

  const uploadEvidence = async (file) => {
    try {
      const bucket = 'evidencias';
      const ext = file.name?.split('.').pop() || 'bin';
      const path = `safety/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    } catch (error) {
      console.error('Error subiendo evidencia:', error);
      toast.error('No se pudo subir la evidencia');
      return null;
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit();
    }
  };

  const resetForm = () => {
    setFormData({
      ficha: '',
      tipo: 'INCIDENTE',
      prioridad: 'Baja',
      plazo_horas: 24,
      descripcion: '',
      asignado_a: '',
      lugar: '',
      turno: '',
      hora_incidente: '',
      notas: '',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Ficha */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            📌 Número de Ficha (opcional - dejar vacío si no involucra activos)
          </label>
          <div className="mb-2 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={fichaSearch}
                onChange={(e) => setFichaSearch(e.target.value)}
                placeholder="Buscar por ficha, marca o modelo"
                className="w-full border border-gray-300 rounded-lg px-9 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                disabled={isSubmitting}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowAssetList(!showAssetList)}
                className="absolute right-2 top-2.5 px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition"
                disabled={isSubmitting}
              >
                {showAssetList ? '✕' : '▼'}
              </button>
              {showAssetList && (
                <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100 bg-white shadow-xl z-20">
                  {filteredAssets.length === 0 && (
                    <div className="p-3 text-sm text-gray-400">No hay coincidencias</div>
                  )}
                  {filteredAssets.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, ficha: a.ficha }));
                        setFichaSearch(`${a.ficha} · ${a.marca || ''} ${a.modelo || ''}`.trim());
                        setShowAssetList(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-orange-50 transition ${formData.ficha === a.ficha ? 'bg-orange-100 font-semibold' : ''}`}
                      disabled={isSubmitting}
                    >
                      <div className="flex justify-between">
                        <span className="text-gray-800">{a.ficha}</span>
                        <span className="text-xs text-gray-500">{a.tipo || '—'}</span>
                      </div>
                      <div className="text-xs text-gray-500">{[a.marca, a.modelo].filter(Boolean).join(' ')}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">Seleccionado: {formData.ficha || 'Ninguno'}</div>
        </div>

        {/* Tipo de Incidente */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Tipo de Reporte *
          </label>
          <div className="grid grid-cols-2 gap-2">
            {TIPOS.map((tipo) => (
              <button
                key={tipo.value}
                onClick={() => setFormData((prev) => ({ ...prev, tipo: tipo.value }))}
                className={`p-2 rounded-lg text-xs font-bold text-center transition ${
                  formData.tipo === tipo.value
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                {tipo.label}
              </button>
            ))}
          </div>
        </div>

        {/* Prioridad */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            ⚡ Prioridad *
          </label>
          <div className="flex gap-2">
            {PRIORIDADES.map((prioridad) => (
              <button
                key={prioridad.value}
                onClick={() =>
                  setFormData((prev) => ({ ...prev, prioridad: prioridad.value }))
                }
                className={`flex-1 p-2 rounded-lg text-xs font-bold text-center transition ${
                  formData.prioridad === prioridad.value
                    ? 'bg-orange-600 text-white border-orange-600'
                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                {prioridad.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lugar / Área */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            📍 Lugar / Área
          </label>
          <input
            type="text"
            name="lugar"
            value={formData.lugar}
            onChange={handleChange}
            placeholder="Ej: Taller de Mantenimiento, Almacén, Oficina..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            disabled={isSubmitting}
          />
        </div>

        {/* Turno y Hora del incidente */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🕐 Turno
            </label>
            <input
              type="text"
              name="turno"
              value={formData.turno}
              onChange={handleChange}
              placeholder="Ej: Diurno, Vespertino, Nocturno..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              ⏰ Hora del incidente
            </label>
            <input
              type="time"
              name="hora_incidente"
              value={formData.hora_incidente}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Plazo de Resolución */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            ⏱️ Plazo de Resolución *
          </label>
          <div className="flex gap-2">
            {PLAZOS.map((plazo) => (
              <button
                key={plazo.value}
                onClick={() =>
                  setFormData((prev) => ({ ...prev, plazo_horas: plazo.value }))
                }
                className={`flex-1 p-2 rounded-lg text-xs font-bold text-center transition ${
                  formData.plazo_horas === plazo.value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                {plazo.label}
              </button>
            ))}
          </div>
        </div>

        {/* Descripción */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            📝 Descripción Detallada *
          </label>
          <textarea
            name="descripcion"
            value={formData.descripcion}
            onChange={handleChange}
            onKeyPress={handleKeyPress}
            placeholder="Describe los detalles del incidente, qué sucedió, dónde y cómo..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
            disabled={isSubmitting}
          />
        </div>

        {/* Asignado a */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            👤 Asignado a (Responsable)
          </label>
          <select
            name="asignado_a"
            value={formData.asignado_a}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            disabled={isSubmitting}
          >
            <option value="">Sin asignar</option>
            {userOptions.map((u) => (
              <option key={u.id} value={u.nombre || u.id}>
                {u.nombre || u.id} ({u.rol})
              </option>
            ))}
          </select>
        </div>

        {/* Evidencias visuales */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            📎 Evidencias (fotos o video) - sube varias tomas / ángulos
          </label>
          <label className="flex items-center gap-2 border-2 border-dashed border-orange-200 rounded-lg px-3 py-3 text-sm text-orange-700 bg-orange-50 cursor-pointer hover:border-orange-400">
            <UploadCloud className="w-4 h-4" />
            <span>Subir archivos (máx. 5)</span>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const list = e.target.files ? Array.from(e.target.files).slice(0, 5) : [];
                setFiles(list);
              }}
              disabled={isSubmitting}
            />
          </label>
          {files && files.length > 0 && (
            <div className="mt-2 text-xs text-gray-600">
              {files.map((f) => f.name).join(', ')}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">Sugerencia: 2-3 fotos de distintos ángulos. La primera será la principal; las demás quedarán como evidencias adicionales en el reporte.</p>
        </div>

        {/* Aviso importante */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4 text-xs text-orange-700">
          <p className="font-semibold mb-1">ℹ️ Información Importante:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Reporta todos los incidentes sin importar gravedad</li>
            <li>Sé específico en la descripción</li>
            <li>Tu reporte es protegido y confidencial</li>
          </ul>
        </div>

        <div className="text-xs text-gray-400 mb-4">
          💡 Tip: Presiona Ctrl+Enter para enviar
        </div>

        {/* Botones */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              onClose?.();
              resetForm();
            }}
            disabled={isSubmitting}
            className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-lg font-bold hover:bg-gray-400 disabled:opacity-50 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 bg-orange-600 text-white py-2 rounded-lg font-bold hover:bg-orange-700 disabled:opacity-50 transition"
          >
            {isSubmitting ? 'Creando...' : 'Crear Reporte'}
          </button>
        </div>
      </div>
    </div>
  );
};
