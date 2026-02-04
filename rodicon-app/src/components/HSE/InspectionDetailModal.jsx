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
      const [inspectionData, actionsData] = await Promise.all([
        getInspectionById(inspectionId),
        getCorrectiveActions(inspectionId)
      ]);
      setInspection(inspectionData);
      setCorrectiveActions(actionsData || []);
    } catch (error) {
      console.error('Error loading inspection:', error);
      toast.error('Error al cargar inspección');
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
      return tpl.sections.map((section) => `
        <div style="background:white;border:1px solid #e2e8f0;border-radius:14px;margin-bottom:18px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,0.06);page-break-inside:avoid;break-inside:avoid;">
          <div style="background:#f8fafc;padding:14px 18px;border-bottom:1px solid #e2e8f0;">
            <h3 style="font-size:16px;font-weight:700;color:#0f172a;margin:0;letter-spacing:-0.01em;">${section.title || 'Sección'}</h3>
            ${section.description ? `<p style="font-size:13px;color:#64748b;margin-top:4px;">${section.description}</p>` : ''}
          </div>
          <div style="padding:16px 18px;display:grid;gap:16px;page-break-inside:avoid;break-inside:avoid;">
            ${(section.items || []).map(item => {
              const answer = answers[item.id];
              return `
                <div style="padding-bottom:14px;border-bottom:1px solid #f1f5f9;page-break-inside:avoid;break-inside:avoid;">
                  <div style="font-weight:700;color:#475569;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
                    ${item.label}
                    ${item.required ? '<span style="color:#ef4444;font-size:14px;">*</span>' : ''}
                  </div>
                  <div style="color:#0f172a;font-size:14px;line-height:1.6;">
                    ${renderFieldValue(item, answer)}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
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
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: #e5e7eb;
              color: #0f172a;
              padding: 0;
            }
            .page-container {
              max-width: 880px;
              margin: 24px auto;
              background: white;
              border: 1px solid #e2e8f0;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 18px 60px rgba(15,23,42,0.14);
            }
            .header-band {
              background: #0f172a;
              color: white;
              padding: 28px 32px 24px;
              border-bottom: 4px solid #2563eb;
            }
            .logo-section {
              display: flex;
              align-items: center;
              gap: 14px;
              margin-bottom: 12px;
            }
            .company-logo {
              width: 60px;
              height: 60px;
              background: white;
              border-radius: 14px;
              padding: 10px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.18);
              object-fit: contain;
            }
            .doc-title {
              font-size: 24px;
              font-weight: 700;
              letter-spacing: -0.01em;
            }
            .doc-subtitle {
              font-size: 13px;
              opacity: 0.88;
              margin-top: 3px;
            }
            .inspection-meta {
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 16px;
              flex-wrap: wrap;
              margin-top: 6px;
            }
            .meta-info { flex: 1; min-width: 260px; }
            .meta-title { font-size: 18px; font-weight: 700; margin-bottom: 6px; }
            .meta-date { font-size: 13px; color: #cbd5e1; }
            .status-badge {
              padding: 10px 14px;
              border-radius: 12px;
              font-size: 13px;
              font-weight: 700;
              letter-spacing: 0.02em;
              text-transform: uppercase;
            }
            .stats-bar {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 16px;
              padding: 18px 32px 6px;
              background: #f8fafc;
              border-bottom: 1px solid #e2e8f0;
            }
            .stat-box {
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 14px 16px;
              background: white;
              box-shadow: 0 6px 20px rgba(15,23,42,0.04);
              text-align: center;
            }
            .stat-value { font-size: 22px; font-weight: 800; color: #0f172a; display: block; }
            .stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; margin-top: 4px; font-weight: 600; }
            .content-area { padding: 28px 32px; background: #f8fafc; }
            .footer-area {
              background: white;
              padding: 22px 32px 28px;
              border-top: 1px solid #e2e8f0;
            }
            .footer-grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 14px 20px;
              font-size: 13px;
              color: #475569;
            }
            .footer-item strong { color: #0f172a; display: block; margin-bottom: 4px; }
            .page-number {
              text-align: center;
              font-size: 11px;
              color: #94a3b8;
              margin-top: 14px;
              padding-top: 10px;
              border-top: 1px solid #e2e8f0;
            }
            @media print { body { background: white; } .page-container { box-shadow: none; margin: 0; } }
          </style>
        </head>
        <body>
          <div class="page-container">
            <div class="header-band">
              <div class="logo-section">
                <img src="${window.location.origin}/logo.png" alt="RODICON" class="company-logo" onerror="this.style.display='none'" />
                <div>
                  <h1 class="doc-title">Reporte de Inspección HSE</h1>
                  <p class="doc-subtitle">Sistema de Gestión de Seguridad y Salud Ocupacional</p>
                </div>
              </div>
              <div class="inspection-meta">
                <div class="meta-info">
                  <div class="meta-title">${inspection.title}</div>
                  <div class="meta-date">📅 ${new Date(inspection.completed_at || inspection.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                </div>
                <div class="status-badge" style="background:${statusStyles.bg};color:${statusStyles.text};border:1px solid ${statusStyles.border};">
                  ${statusStyles.icon} ${statusStyles.label}
                </div>
              </div>
            </div>

            <div class="stats-bar">
              <div class="stat-box">
                <span class="stat-value">${completedItems}</span>
                <span class="stat-label">Elementos Evaluados</span>
              </div>
              <div class="stat-box">
                <span class="stat-value">${totalItems}</span>
                <span class="stat-label">Total de Ítems</span>
              </div>
              <div class="stat-box">
                <span class="stat-value">${totalItems ? Math.round((completedItems/totalItems)*100) : 0}%</span>
                <span class="stat-label">Progreso</span>
              </div>
            </div>

            <div class="content-area">
              ${buildSections()}
            </div>

            <div class="footer-area">
              <div class="footer-grid">
                <div class="footer-item">
                  <strong>👤 Realizada por:</strong>
                  ${inspection.conducted_by_name || 'No especificado'}
                </div>
                <div class="footer-item">
                  <strong>📆 Fecha generación:</strong>
                  ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
                <div class="footer-item">
                  <strong>📍 Ubicación:</strong>
                  ${formLocation}
                </div>
                <div class="footer-item">
                  <strong>🏢 Área:</strong>
                  ${formArea}
                </div>
              </div>
              <div class="page-number">
                Documento generado automáticamente por RODICON HSE
              </div>
            </div>
          </div>

          <script>
            window.onload = function() {
              const element = document.querySelector('.page-container');
              const opt = {
                margin: 0,
                filename: '${inspection.inspection_number || 'inspeccion'}.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, letterRendering: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
              };
              html2pdf().set(opt).from(element).save().then(() => {
                setTimeout(() => window.close(), 1000);
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
