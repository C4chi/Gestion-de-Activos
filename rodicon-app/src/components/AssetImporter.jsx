/**
 * AssetImporter.jsx
 * Componente para importar activos desde CSV/Excel
 * Maneja parseo, validación, mapeo de columnas y carga a Supabase
 */

import React, { useState, useRef, useEffect } from 'react';
import { Upload, AlertCircle, CheckCircle, X, ArrowRight, Loader } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { supabase } from '../supabaseClient';

// Campos disponibles en la BD
const DB_FIELDS = {
  'ficha': 'Ficha (ID único)',
  'tipo': 'Tipo de vehículo',
  'marca': 'Marca',
  'modelo': 'Modelo',
  'año': 'Año',
  'chasis': 'Chasis',
  'placa': 'Placa/Matrícula',
  'matricula': 'Matrícula',
  'color': 'Color',
  'ubicacion_actual': 'Ubicación Actual',
  'aseguradora': 'Aseguradora',
  'numero_poliza': 'Número de Póliza',
  'fecha_vencimiento_seguro': 'Fecha Vencimiento Seguro',
  'gps': 'GPS',
  'señal_gps': 'Señal GPS',
  'empresa': 'Empresa',
  'status': 'Estado/Status',
  'observacion_mecanica': 'Observación Mecánica',
  'paso_rapido': 'Paso Rápido',
  'fecha_compra': 'Fecha de Compra',
  'valor_unitario': 'Valor Unitario',
  'observacion': 'Observación'
};

export default function AssetImporter({ onSuccess, onClose }) {
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Upload, 2: Map columns, 3: Preview, 4: Importing
  const [rawData, setRawData] = useState(null);
  const [detectedColumns, setDetectedColumns] = useState([]);
  const [columnMapping, setColumnMapping] = useState({}); // { dbField: excelColumn }
  const [tableColumns, setTableColumns] = useState([]); // Columnas reales de la BD
  const [requiredFields, setRequiredFields] = useState(['ficha', 'tipo', 'marca', 'modelo']);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState([]);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

  // Cargar las columnas de la tabla assets en Supabase
  useEffect(() => {
    const loadTableColumns = async () => {
      try {
        // Obtener una fila para ver cuáles columnas existen
        const { data, error } = await supabase
          .from('assets')
          .select('*')
          .limit(1);
        
        if (error && error.code !== 'PGRST116') throw error;
        
        if (data && data.length > 0) {
          const cols = Object.keys(data[0]).filter(col => col !== 'id');
          setTableColumns(cols);
        } else {
          // Fallback si la tabla está vacía
          setTableColumns([
            'ficha', 'tipo', 'marca', 'modelo', 'año', 'chasis', 'placa', 'matricula',
            'color', 'ubicacion_actual', 'aseguradora', 'numero_poliza', 
            'fecha_vencimiento_seguro', 'gps', 'señal_gps', 'empresa', 'status',
            'observacion_mecanica', 'paso_rapido', 'fecha_compra', 'valor_unitario', 'observacion'
          ]);
        }
      } catch (error) {
        console.log('No se pudo cargar columnas de BD, usando defaults');
        setTableColumns([
          'ficha', 'tipo', 'marca', 'modelo', 'año', 'chasis', 'placa', 'matricula',
          'color', 'ubicacion_actual', 'aseguradora', 'numero_poliza', 
          'fecha_vencimiento_seguro', 'gps', 'señal_gps', 'empresa', 'status',
          'observacion_mecanica', 'paso_rapido', 'fecha_compra', 'valor_unitario', 'observacion'
        ]);
      }
    };
    
    loadTableColumns();
  }, []);

  const normalizeColumnName = (name) => {
    return String(name).toLowerCase().trim().replace(/\s+/g, '_');
  };

  // Función para validar y convertir fechas de forma estricta
  const parseDate = (value) => {
    if (!value) return null;
    const str = String(value).trim();
    if (!str) return null;
    
    // Solo aceptar formatos reconocibles de fecha
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const date = new Date(str);
      if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
        return str;
      }
    }
    
    // DD/MM/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
      const parts = str.split('/');
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      
      if (day > 0 && day <= 31 && month > 0 && month <= 12 && year > 1900 && year < 2100) {
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) {
          return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }
    }
    
    // DD-MM-YYYY
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(str)) {
      const parts = str.split('-');
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      
      if (day > 0 && day <= 31 && month > 0 && month <= 12 && year > 1900 && year < 2100) {
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) {
          return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }
    }
    
    // Si no es una fecha válida reconocible, retornar null
    return null;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isExcel) {
      // Para Excel, usar XLSX
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const workbook = XLSX.read(event.target.result, { type: 'binary' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          if (jsonData.length === 0) {
            toast.error('El archivo está vacío');
            return;
          }

          const headers = Object.keys(jsonData[0] || {});
          setDetectedColumns(headers);
          setRawData(jsonData);

          // Intentar mapeo automático
          const autoMapping = {};
          headers.forEach(header => {
            const normalized = normalizeColumnName(header);
            for (const dbField of Object.keys(DB_FIELDS)) {
              if (normalized === dbField || 
                  normalized.includes(dbField.replace('_', '')) ||
                  dbField.includes(normalized.replace('_', ''))) {
                autoMapping[dbField] = header;
                break;
              }
            }
          });

          setColumnMapping(autoMapping);
          setStep(2);
          toast.success(`✓ Archivo cargado: ${jsonData.length} filas detectadas`);
        } catch (error) {
          toast.error(`Error al leer el archivo Excel: ${error.message}`);
        }
      };
      reader.readAsBinaryString(file);
    } else {
      // Para CSV, usar Papa Parse
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data.length === 0) {
            toast.error('El archivo está vacío');
            return;
          }

          const headers = Object.keys(results.data[0] || {});
          setDetectedColumns(headers);
          setRawData(results.data);

          // Intentar mapeo automático
          const autoMapping = {};
          headers.forEach(header => {
            const normalized = normalizeColumnName(header);
            for (const dbField of Object.keys(DB_FIELDS)) {
              if (normalized === dbField || 
                  normalized.includes(dbField.replace('_', '')) ||
                  dbField.includes(normalized.replace('_', ''))) {
                autoMapping[dbField] = header;
                break;
              }
            }
          });

          setColumnMapping(autoMapping);
          setStep(2);
          toast.success(`✓ Archivo cargado: ${results.data.length} filas detectadas`);
        },
        error: (error) => {
          toast.error(`Error al leer el archivo: ${error.message}`);
        }
      });
    }
  };

  const validateAndPreview = () => {
    if (!rawData || detectedColumns.length === 0) {
      toast.error('No hay datos para validar');
      return;
    }

    // Verificar que los campos MÁS críticos estén mapeados
    const criticalFields = ['ficha', 'tipo', 'marca', 'modelo'];
    const unmappedCritical = criticalFields.filter(field => !columnMapping[field]);
    if (unmappedCritical.length > 0) {
      toast.error(`Falta mapear campos críticos: ${unmappedCritical.join(', ')}`);
      return;
    }

    const rowErrors = [];
    const validRows = [];

    rawData.forEach((row, idx) => {
      if (!Object.values(row).some(v => v)) return; // Skip empty rows

      const rowErrors_idx = [];
      const processedRow = {};

      // Procesar cada campo usando el mapping
      for (const [dbField, excelColumn] of Object.entries(columnMapping)) {
        if (!excelColumn) continue; // Skip unmapped fields
        
        const value = row[excelColumn];
        
        // Validar solo los campos críticos
        if (['ficha', 'tipo', 'marca', 'modelo'].includes(dbField) && (!value || !String(value).trim())) {
          rowErrors_idx.push(`Fila ${idx + 1}: Campo "${dbField}" es obligatorio`);
        }

        // Validaciones específicas
        if (value) {
          if (dbField === 'ficha' && !/^[A-Z0-9\-\s]+$/.test(String(value).trim())) {
            // Permitir también espacios en fichas
          }
          if (dbField === 'año' && value && isNaN(parseInt(value))) {
            rowErrors_idx.push(`Fila ${idx + 1}: Año debe ser un número válido`);
          }
          if (dbField === 'valor_unitario' && value && isNaN(parseFloat(value))) {
            rowErrors_idx.push(`Fila ${idx + 1}: Valor unitario debe ser un número válido`);
          }
        }

        // Procesar y guardar
        processedRow[dbField] = String(value || '').trim() || null;
      }

      if (rowErrors_idx.length > 0) {
        rowErrors.push(...rowErrors_idx);
      } else {
        validRows.push(processedRow);
      }
    });

    setErrors(rowErrors);
    setPreview({
      totalRows: rawData.length,
      validRows: validRows.length,
      data: validRows.slice(0, 5),
      fullData: validRows
    });

    if (rowErrors.length > 0) {
      toast.error(`Se encontraron ${rowErrors.length} errores de validación`);
    } else {
      toast.success(`✓ ${validRows.length} activos listos para importar`);
      setStep(3);
    }
  };

  const handleImport = async () => {
    if (!preview?.fullData) return;

    setStep(4);
    setLoading(true);
    setImportProgress({ current: 0, total: preview.fullData.length });

    try {
      // Obtener todas las fichas existentes para evitar duplicados
      const { data: existingAssets, error: fetchError } = await supabase
        .from('assets')
        .select('ficha');
      
      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
      
      const existingFichas = new Set(
        (existingAssets || []).map(a => a.ficha).filter(f => f)
      );

      const assetsToInsert = preview.fullData.map((row, idx) => {
        const asset = {};
        
        // Solo incluir columnas que existen en la tabla
        for (const [dbField, excelColumn] of Object.entries(columnMapping)) {
          if (!excelColumn) continue; // Skip unmapped fields
          
          const value = row[dbField];
          
          // Aplicar transformaciones específicas según el tipo de campo
          if (dbField === 'ficha' && value) {
            let ficha = String(value).toUpperCase().trim();
            
            // Si es "S/F", vacío o inválido, hacerlo NULL
            if (!ficha || ficha === 'S/F' || ficha === 'SIN FICHA') {
              asset[dbField] = null;
            } else if (existingFichas.has(ficha)) {
              // Si ya existe, generarla única con sufijo
              let newFicha = ficha;
              let counter = 1;
              while (existingFichas.has(newFicha) || preview.fullData.filter((r, i) => i < idx && r.ficha === newFicha).length > 0) {
                newFicha = `${ficha}-${counter}`;
                counter++;
              }
              asset[dbField] = newFicha;
              existingFichas.add(newFicha);
            } else {
              asset[dbField] = ficha;
              existingFichas.add(ficha);
            }
          } else if (dbField === 'placa' || dbField === 'matricula') {
            asset[dbField] = value ? String(value).toUpperCase().trim() : null;
          } else if (['año'].includes(dbField) && value) {
            const num = parseInt(value);
            asset[dbField] = isNaN(num) ? null : num;
          } else if (dbField === 'valor_unitario' && value) {
            const num = parseFloat(value);
            asset[dbField] = isNaN(num) ? null : num;
          } else if (['fecha_compra', 'fecha_vencimiento_seguro'].includes(dbField)) {
            asset[dbField] = parseDate(value);
          } else {
            asset[dbField] = value ? String(value).trim() : null;
          }
        }
        
        // Agregar campos de sistema
        asset.visible = 1;
        asset.created_at = new Date().toISOString();
        
        return asset;
      });

      // Insertar en lotes (50 a la vez)
      const batchSize = 50;
      for (let i = 0; i < assetsToInsert.length; i += batchSize) {
        const batch = assetsToInsert.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from('assets')
          .insert(batch);

        if (error) throw error;

        setImportProgress({
          current: Math.min(i + batchSize, assetsToInsert.length),
          total: assetsToInsert.length
        });
      }

      toast.success(`✅ ${assetsToInsert.length} activos importados exitosamente`);
      setRawData(null);
      setDetectedColumns([]);
      setColumnMapping({});
      setPreview(null);
      setErrors([]);
      setStep(1);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error importing:', error);
      toast.error(`Error al importar: ${error.message}`);
      setStep(3);
    } finally {
      setLoading(false);
      setImportProgress({ current: 0, total: 0 });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl">
      <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
        <Upload className="text-blue-600" size={28} />
        Importar Activos desde Excel/CSV
      </h2>
      <p className="text-gray-600 mb-6">
        Carga un archivo CSV o Excel. Detectaremos automáticamente tus columnas y las mapearemos.
      </p>

      {/* Step 1: Upload */}
      {step === 1 && (
        <>
          <div className="mb-6">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              disabled={loading}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-full border-2 border-dashed border-blue-300 rounded-lg p-8 text-center hover:border-blue-500 hover:bg-blue-50 transition disabled:opacity-50"
            >
              <Upload className="mx-auto mb-2 text-blue-600" size={32} />
              <p className="font-semibold text-gray-700">Selecciona un archivo</p>
              <p className="text-sm text-gray-500">o arrastra aquí</p>
              <p className="text-xs text-gray-400 mt-2">CSV, XLSX, XLS</p>
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-semibold mb-2">💡 Tu Excel debería tener estas columnas:</p>
            <p className="text-xs">tipo, marca, placa, modelo, año, chasis, ficha, empresa, matricula, ubicacion_actual, y opcionalmente: aseguradora, paso_rapido, status, observacion_mecanica, etc.</p>
          </div>
        </>
      )}

      {/* Step 2: Map Columns */}
      {step === 2 && (
        <>
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Mapear Columnas</h3>
            <p className="text-sm text-gray-600 mb-4">Indica cuál columna de tu Excel corresponde a cada campo de la app:</p>
            
            {/* Mostrar estado de mapeo obligatorio */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-semibold text-blue-900 mb-2">Campos obligatorios a mapear:</p>
              <div className="flex flex-wrap gap-2">
                {requiredFields.map(field => (
                  <div 
                    key={field} 
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      columnMapping[field] 
                        ? 'bg-green-200 text-green-900' 
                        : 'bg-red-200 text-red-900'
                    }`}
                  >
                    {field} {columnMapping[field] ? '✓' : '✗'}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto border rounded-lg p-4 bg-gray-50">
              {tableColumns.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <Loader className="inline animate-spin mr-2" size={20} />
                  Cargando columnas de la base de datos...
                </div>
              ) : (
                tableColumns.map((dbField) => (
                  <div key={dbField} className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-700">
                        {dbField}
                        {requiredFields.includes(dbField) && (
                          <span className="text-red-600 ml-1">*</span>
                        )}
                      </label>
                    </div>
                    <select
                      value={columnMapping[dbField] || ''}
                      onChange={(e) => setColumnMapping({
                        ...columnMapping,
                        [dbField]: e.target.value
                      })}
                      className={`flex-1 px-3 py-1 border rounded text-sm ${
                        requiredFields.includes(dbField) && !columnMapping[dbField]
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-300'
                      }`}
                    >
                      <option value="">-- No usar --</option>
                      {detectedColumns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700"
            >
              ← Volver
            </button>
            <button
              onClick={validateAndPreview}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Siguiente <ArrowRight className="inline ml-2" size={16} />
            </button>
          </div>
        </>
      )}

      {/* Step 3: Preview */}
      {step === 3 && (
        <>
          {errors.length > 0 && (
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6 mb-6">
              <h3 className="font-bold text-lg text-red-900 mb-3 flex items-center gap-2">
                <AlertCircle size={24} />
                ⚠️ {errors.length} ERRORES ENCONTRADOS
              </h3>
              <p className="text-red-800 mb-3 text-sm">
                Los siguientes activos NO pueden ser importados porque les faltan campos obligatorios:
              </p>
              <div className="max-h-80 overflow-y-auto space-y-2 text-sm text-red-900 bg-white p-4 rounded border border-red-200">
                {errors.map((error, i) => (
                  <div key={i} className="font-mono text-xs bg-red-50 p-2 rounded border-l-2 border-red-500">
                    {error}
                  </div>
                ))}
              </div>
              <p className="text-red-800 mt-3 text-sm font-semibold">
                ℹ️ {preview?.fullData?.length || 0} activos pueden ser importados (sin estos errores)
              </p>
            </div>
          )}

          {preview && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <CheckCircle className="text-green-600" size={20} />
                Vista previa ({preview.validRows} activos válidos)
              </h3>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.entries(columnMapping).slice(0, 6).map(([dbField]) => (
                        <th key={dbField} className="px-3 py-2 text-left font-semibold text-gray-700">
                          {dbField}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.data.map((row, i) => (
                      <tr key={i} className="border-t hover:bg-gray-50">
                        {Object.keys(columnMapping).slice(0, 6).map((dbField) => (
                          <td key={dbField} className="px-3 py-2 text-gray-800">
                            {row[dbField] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.validRows > 5 && (
                <p className="text-sm text-gray-600 mt-2">Mostrando 5 de {preview.validRows} activos...</p>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700"
            >
              ← Cambiar Mapeo
            </button>
            <button
              onClick={handleImport}
              disabled={!preview?.fullData || errors.length > 0}
              className="flex-1 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
            >
              <CheckCircle size={18} className="inline mr-2" />
              Importar {preview?.validRows || 0} Activos
            </button>
          </div>
        </>
      )}

      {/* Step 4: Importing */}
      {step === 4 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-semibold text-gray-700 mb-2">Importando activos...</p>
          <p className="text-sm text-gray-600 mb-4">
            {importProgress.current} / {importProgress.total}
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Close button */}
      {step !== 4 && (
        <div className="mt-6 pt-4 border-t text-right">
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 font-medium"
          >
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
}
