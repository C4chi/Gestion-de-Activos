/**
 * InspectionDetailModal.jsx
 * Modal para ver el detalle completo de una inspección con PDF moderno
 */

import React, { useState, useEffect } from 'react';
import { X, Download, Trash2, CheckCircle, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../supabaseClient';
import {
  getInspectionById,
  getCorrectiveActions,
  deleteInspection
} from '../../services/hseService';

export default function InspectionDetailModal({ inspectionId, onClose, onUpdate }) {
  const [inspection, setInspection] = useState(null);
  const [correctiveActions, setCorrectiveActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('form');

  useEffect(() => {
    loadData();
  }, [inspectionId]);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('Loading inspection:', inspectionId);
      const [inspectionData, actionsData] = await Promise.all([
        getInspectionById(inspectionId),
        getCorrectiveActions(inspectionId)
      ]);
      console.log('Inspection loaded:', inspectionData);
      setInspection(inspectionData);
      setCorrectiveActions(actionsData || []);
    } catch (error) {
      console.error('Error loading inspection:', error);
      toast.error(`Error al cargar inspección: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('¿Eliminar esta inspección permanentemente?')) return;
    
    try {
      await deleteInspection(inspectionId);
      toast.success('✓ Inspección eliminada');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error(error.message || 'Error al eliminar');
    }
  };

  const handleExport = () => {
    if (!inspection) return;

    const tpl = inspection.template_snapshot || {};
    const answers = inspection.answers || {};
    const totalItems = tpl.sections?.flatMap(s => s.items || []).length || 0;
    const completedItems = Object.keys(answers).filter(k => !k.includes('_photo') && !k.includes('_note') && !k.includes('_field')).length;

    let formLocation = inspection.location || 'No especificada';
    let formArea = inspection.area || 'No especificada';
    if (tpl.sections) {
      tpl.sections.forEach(section => {
        section.items?.forEach(item => {
          if (item.type === 'location' && answers[item.id]?.value) {
            formLocation = answers[item.id].label || answers[item.id].value || formLocation;
          }
          if (item.type === 'area' && answers[item.id]?.value) {
            formArea = answers[item.id].value;
          }
        });
      });
    }

    const statusStyles = inspection.status === 'COMPLETED'
      ? { bg: 'rgba(34,197,94,0.12)', text: '#16a34a', border: 'rgba(34,197,94,0.45)', label: 'Completada', icon: '✓' }
      : { bg: 'rgba(249,115,22,0.12)', text: '#ea580c', border: 'rgba(249,115,22,0.35)', label: 'Incompleta', icon: '⏱' };

    const renderFieldValue = (item, answer) => {
      const value = answer?.value;

      if (item.type === 'asset' || item.type === 'location' || item.type === 'area') {
        const label = answer?.label || value;
        return `<div style="margin-top:6px;color:#0f172a;font-size:15px;font-weight:600;">${label || '—'}</div>`;
      }

      if (item.type === 'signature') {
        if (value?.startsWith?.('text:')) {
          const signatureName = value.replace('text:', '');
          return `<div style="margin-top:8px;padding:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;"><p style="font-size:22px;font-style:italic;color:#0f172a;font-family:cursive;margin:0;">${signatureName}</p></div>`;
        } else if (value) {
          return `<div style="margin-top:8px;"><img src="${value}" style="max-width:280px;max-height:140px;border:1px solid #e2e8f0;border-radius:10px;" /></div>`;
        }
        return '<div style="margin-top:4px;color:#9ca3af;">Sin firma</div>';
      }

      if (item.type === 'single_select') {
        const option = item.options?.find(opt => opt.value === value);
        const colorMap = {
          green: { bg: '#ecfdf3', text: '#166534' },
          red: { bg: '#fef2f2', text: '#991b1b' },
          yellow: { bg: '#fefce8', text: '#854d0e' },
          blue: { bg: '#eff6ff', text: '#1e3a8a' },
          orange: { bg: '#fff7ed', text: '#9a3412' },
          gray: { bg: '#f8fafc', text: '#475569' }
        };
        const colors = colorMap[option?.color] || colorMap.gray;

        return `<div style="display:inline-flex;align-items:center;gap:8px;padding:10px 14px;background:${colors.bg};color:${colors.text};border-radius:10px;font-weight:700;font-size:14px;margin-top:4px;border:1px solid #e2e8f0;">${value || '—'}</div>`;
      }

      if (item.type === 'photo' || value?.startsWith?.('data:image') || value?.includes?.('http')) {
        return `<div style="margin-top:8px;"><img src="${value}" style="max-width:100%;height:auto;border-radius:10px;border:1px solid #e2e8f0;" /></div>`;
      }

      if (item.type === 'checkbox') {
        return `<div style="margin-top:4px;color:#059669;font-weight:700;">${value ? '✓ Sí' : '✗ No'}</div>`;
      }

      if (item.type === 'text' || item.type === 'textarea' || item.type === 'number') {
        return `<div style="margin-top:6px;color:#0f172a;font-size:14px;line-height:1.6;">${value || '—'}</div>`;
      }

      return `<div style="margin-top:6px;color:#0f172a;font-size:14px;">${value ?? '—'}</div>`;
    };

    const buildSections = () => {
      if (!tpl.sections) return '';
      return tpl.sections.map((section, idx) => `
        <div style="margin-bottom:24px;page-break-inside:avoid;break-inside:avoid;">
          <div style="background:#1e293b;color:white;padding:12px 16px;margin-bottom:2px;">
            <h3 style="font-size:15px;font-weight:700;margin:0;">${section.title || 'Sección'}</h3>
            ${section.description ? `<p style="font-size:12px;margin-top:4px;opacity:0.9;">${section.description}</p>` : ''}
          </div>
          <table style="width:100%;border-collapse:collapse;background:white;">
            ${(section.items || []).map(item => {
              const answer = answers[item.id];
              return `
                <tr style="border-bottom:1px solid #e5e7eb;">
                  <td style="padding:12px 16px;width:35%;vertical-align:top;font-weight:600;color:#475569;font-size:13px;">
                    ${item.label}${item.required ? '<span style="color:#ef4444;"> *</span>' : ''}
                  </td>
                  <td style="padding:12px 16px;color:#0f172a;font-size:13px;">
                    ${renderFieldValue(item, answer)}
                  </td>
                </tr>
              `;
            }).join('')}
          </table>
        </div>
      `).join('');
    };

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${inspection.title}</title>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
          <style>
            * { margin:0; padding:0; box-sizing:border-box; }
            body {
              font-family: Arial, Helvetica, sans-serif;
              background: white;
              color: #1f2937;
              padding: 0;
              line-height: 1.5;
            }
            .page-container {
              max-width: 210mm;
              margin: 0 auto;
              background: white;
              padding: 20mm;
            }
            .header {
              border-bottom: 3px solid #1e293b;
              padding-bottom: 16px;
              margin-bottom: 24px;
            }
            .header-title {
              font-size: 24px;
              font-weight: bold;
              color: #1e293b;
              margin-bottom: 8px;
            }
            .header-subtitle {
              font-size: 14px;
              color: #64748b;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-bottom: 24px;
              padding: 16px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
            }
            .info-item {
              font-size: 13px;
            }
            .info-label {
              font-weight: 600;
              color: #475569;
              display: block;
              margin-bottom: 4px;
            }
            .info-value {
              color: #1f2937;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 2px;
            }
            td {
              border: 1px solid #e5e7eb;
            }
            .footer {
              margin-top: 32px;
              padding-top: 16px;
              border-top: 2px solid #e5e7eb;
            }
            .footer-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-bottom: 16px;
            }
            .footer-item {
              font-size: 12px;
              color: #475569;
            }
            .footer-label {
              font-weight: 600;
              color: #1f2937;
              display: block;
              margin-bottom: 2px;
            }
            .footer-text {
              text-align: center;
              font-size: 10px;
              color: #94a3b8;
              margin-top: 12px;
            }
            @media print {
              body { margin: 0; }
              .page-container { margin: 0; padding: 15mm; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
            }
          </style>
        </head>
        <body>
          <div class="page-container">
            <!-- Header -->
            <div class="header">
              <div class="header-title">${inspection.title || 'Inspección HSE'}</div>
              <div class="header-subtitle">
                ${inspection.inspection_number || ''} - 
                ${new Date(inspection.completed_at || inspection.created_at).toLocaleDateString('es-ES', { 
                  day: '2-digit', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </div>
            </div>

            <!-- Info General -->
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Estado</span>
                <span class="info-value">${statusStyles.label}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Prioridad</span>
                <span class="info-value">${inspection.priority || 'MEDIA'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Inspector</span>
                <span class="info-value">${inspection.conducted_by_name || 'No especificado'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Categoría</span>
                <span class="info-value">${tpl.category || 'General'}</span>
              </div>
            </div>

            <!-- Secciones -->
            ${buildSections()}

            <!-- Footer -->
            <div class="footer">
              <div class="footer-grid">
                <div class="footer-item">
                  <span class="footer-label">Realizada por:</span>
                  ${inspection.conducted_by_name || 'No especificado'}
                </div>
                <div class="footer-item">
                  <span class="footer-label">Fecha generación:</span>
                  ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
                <div class="footer-item">
                  <span class="footer-label">Ubicación:</span>
                  ${formLocation}
                </div>
                <div class="footer-item">
                  <span class="footer-label">Área:</span>
                  ${formArea}
                </div>
              </div>
              <div class="footer-text">
                Documento generado automáticamente por RODICON HSE
              </div>
            </div>
          </div>

          <script>
            window.onload = function() {
              const element = document.querySelector('.page-container');
              const opt = {
                margin: [10, 10, 10, 10],
                filename: '${inspection.inspection_number || 'inspeccion'}.pdf',
                image: { type: 'jpeg', quality: 0.95 },
                html2canvas: { 
                  scale: 2, 
                  useCORS: true, 
                  letterRendering: true,
                  logging: false,
                  windowWidth: 900
                },
                jsPDF: { 
                  unit: 'mm', 
                  format: 'a4', 
                  orientation: 'portrait',
                  compress: true
                },
                pagebreak: { 
                  mode: ['avoid-all', 'css', 'legacy'],
                  before: '.page-break-before',
                  after: '.page-break-after',
                  avoid: ['.stat-box', '.footer-area']
                }
              };
              html2pdf().set(opt).from(element).save().then(() => {
                setTimeout(() => window.close(), 1000);
              }).catch(err => {
                console.error('Error generating PDF:', err);
                alert('Error generando PDF: ' + err.message);
              });
            };
          </script>
        </body>
      </html>
    `;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      toast.error('Permite ventanas emergentes para descargar');
      return;
    }
    win.document.write(html);
    win.document.close();
    toast.success('Generando PDF para descarga...');
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <p className="text-red-600">Inspección no encontrada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Detalles de Inspección</h2>
          <button onClick={onClose} className="text-white hover:bg-blue-700 p-2 rounded">
            <X size={24} />
          </button>
        </div>

        <div className="border-b border-gray-200 bg-white flex">
          <TabButton active={activeTab === 'form'} onClick={() => setActiveTab('form')} label="Formulario" />
          <TabButton active={activeTab === 'actions'} onClick={() => setActiveTab('actions')} label="Acciones" />
          <TabButton active={activeTab === 'info'} onClick={() => setActiveTab('info')} label="Información" />
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50">
          {activeTab === 'form' && (
            <div className="p-6">
              <InspectionSections inspection={inspection} />
            </div>
          )}

          {activeTab === 'actions' && (
            <div className="p-6">
              {correctiveActions.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle size={64} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No hay acciones correctivas</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {correctiveActions.map(action => (
                    <CorrectiveActionCard key={action.id} action={action} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'info' && (
            <div className="p-6">
              <InspectionInfo inspection={inspection} />
            </div>
          )}
        </div>

        <div className="bg-white border-t border-gray-200 px-6 py-4 flex gap-3 justify-end">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Download size={18} /> Descargar PDF
          </button>
          <button onClick={handleDelete} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            <Trash2 size={18} /> Eliminar
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 text-gray-900 rounded-lg hover:bg-gray-400">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 font-medium border-b-2 transition ${active ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>
      {label}
    </button>
  );
}

function InspectionSections({ inspection }) {
  const [expandedSections, setExpandedSections] = React.useState({});
  const tpl = inspection.template_snapshot || {};
  const answers = inspection.answers || {};

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({...prev, [sectionId]: !prev[sectionId]}));
  };

  if (!tpl.sections || tpl.sections.length === 0) {
    return <div className="text-gray-500 text-center py-8">Sin secciones</div>;
  }

  return (
    <div className="space-y-4">
      {tpl.sections.map((section, idx) => (
        <div key={idx} className="bg-white rounded-lg border border-gray-200">
          <button onClick={() => toggleSection(idx)} className="w-full px-6 py-4 text-left hover:bg-gray-50 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">{section.title || `Sección ${idx + 1}`}</h3>
            <span className="text-gray-500">{expandedSections[idx] ? '▼' : '▶'}</span>
          </button>

          {expandedSections[idx] && (
            <div className="px-6 py-4 border-t border-gray-200 space-y-4">
              {section.items?.map(item => (
                <div key={item.id} className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    {item.label}
                    {item.required && <span className="text-red-500 ml-1">*</span>}
                  </p>
                  <div className="text-gray-600 text-sm">
                    {renderAnswerValue(item, answers[item.id])}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function renderAnswerValue(item, answer) {
  if (!answer) return '—';
  const value = answer.value;
  const label = answer.label;

  if (item.type === 'asset' || item.type === 'location' || item.type === 'area') {
    return label || value || '—';
  }
  if (item.type === 'photo' || (typeof value === 'string' && (value.startsWith('data:image') || value.includes('http')))) {
    return '📷 Foto adjunta';
  }
  if (item.type === 'signature') {
    if (typeof value === 'string' && value.startsWith('text:')) return value.replace('text:', '');
    return '✍️ Firma adjunta';
  }
  if (item.type === 'checkbox') return value ? '✓ Sí' : '✗ No';
  if (item.type === 'single_select') {
    const option = item.options?.find(opt => opt.value === value);
    return option?.label || value || '—';
  }
  return value || '—';
}

function InspectionInfo({ inspection }) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-6 space-y-3">
        <div>
          <p className="text-sm font-medium text-gray-600">ID</p>
          <p className="text-gray-900 font-mono text-xs break-all">{inspection.id}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600">Estado</p>
          <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${inspection.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
            {inspection.status === 'COMPLETED' ? 'Completada' : 'Incompleta'}
          </span>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600">Realizada por</p>
          <p className="text-gray-900">{inspection.conducted_by_name || 'No especificado'}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600">Ubicación</p>
          <p className="text-gray-900">{inspection.location || 'No especificada'}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600">Fecha de creación</p>
          <p className="text-gray-900">{new Date(inspection.created_at).toLocaleDateString('es-ES')}</p>
        </div>
      </div>
    </div>
  );
}

function CorrectiveActionCard({ action }) {
  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">{action.title || 'Sin título'}</h4>
          <p className="text-sm text-gray-600 mt-1">{action.description || ''}</p>
          {action.due_date && (
            <p className="text-xs text-gray-500 mt-2">
              <Calendar size={14} className="inline mr-1" />
              Vencimiento: {new Date(action.due_date).toLocaleDateString('es-ES')}
            </p>
          )}
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${action.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
          {action.status === 'COMPLETED' ? 'Completada' : 'Pendiente'}
        </span>
      </div>
    </div>
  );
}
