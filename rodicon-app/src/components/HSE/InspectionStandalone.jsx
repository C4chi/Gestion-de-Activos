import React, { useEffect, useState } from 'react';
import { ArrowLeft, ClipboardCheck, CheckCircle, Download, X } from 'lucide-react';
import toast from 'react-hot-toast';
import FormRenderer from './FormRenderer';
import { getTemplateById, createInspection, completeInspection, getInspectionById } from '../../services/hseService';
import { supabase } from '../../supabaseClient';

export default function InspectionStandalone({ templateId }) {
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [completedInspection, setCompletedInspection] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const tpl = await getTemplateById(templateId);
        setTemplate(tpl);
      } catch (error) {
        console.error('Error loading template', error);
        toast.error('No se pudo cargar la plantilla');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [templateId]);

  const handleSubmit = async (formData) => {
    if (!formData) {
      window.close();
      return;
    }

    try {
      setSaving(true);
      const inspection = await createInspection({
        template_id: template.id,
        title: template.name,
        priority: 'MEDIA',
        conducted_by: 1 // TODO: obtener usuario real
      });

      await completeInspection(inspection.id, {
        ...formData,
        latitude: null,
        longitude: null
      });

      const fullInspection = await getInspectionById(inspection.id);
      setCompletedInspection(fullInspection);
      setShowSuccessModal(true);
      toast.success('✓ Inspección completada exitosamente');
    } catch (error) {
      console.error('Error saving inspection', error);
      toast.error('Error al guardar la inspección');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    if (!completedInspection) return;

    const tpl = completedInspection.template_snapshot || {};
    let answers = { ...(completedInspection.answers || {}) };

    const assetIdMap = new Map();
    const uuidsToLoad = [];

    Object.entries(answers).forEach(([key, ans]) => {
      if (!key.includes('_photo') && !key.includes('_note') && !key.includes('_field') && ans?.value) {
        const isUUID = typeof ans.value === 'string' && ans.value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        if (isUUID && !assetIdMap.has(ans.value)) {
          uuidsToLoad.push(ans.value);
          assetIdMap.set(ans.value, null);
        }
      }
    });

    if (uuidsToLoad.length > 0) {
      try {
        const { data, error } = await supabase
          .from('assets')
          .select('id, ficha, marca, modelo')
          .in('id', uuidsToLoad);

        if (!error && data) {
          data.forEach(asset => {
            const displayName = `${asset.ficha} - ${asset.marca} ${asset.modelo}`;
            assetIdMap.set(asset.id, displayName);
          });
        }
      } catch (err) {
        console.error('Error loading asset names:', err);
      }
    }

    Object.entries(answers).forEach(([key, ans]) => {
      if (!key.includes('_photo') && !key.includes('_note') && !key.includes('_field') && ans?.value) {
        const isUUID = typeof ans.value === 'string' && ans.value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        if (isUUID && assetIdMap.has(ans.value)) {
          const assetName = assetIdMap.get(ans.value);
          if (assetName) {
            answers[key] = { ...ans, label: assetName };
          }
        }
      }
    });

    let formLocation = completedInspection.location || 'No especificada';
    let formArea = completedInspection.area || 'No especificada';

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

    const statusStyles = completedInspection.status === 'COMPLETED'
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

        return `
          <div style="display:inline-flex;align-items:center;gap:8px;padding:10px 14px;background:${colors.bg};color:${colors.text};border-radius:10px;font-weight:700;font-size:14px;margin-top:4px;border:1px solid #e2e8f0;">
            ${value || '—'}
          </div>
          ${answer && answers[item.id + '_photo']?.value ? `
            <div style="margin-top:12px;">
              <p style="font-size:12px;color:#64748b;margin-bottom:6px;font-weight:600;">Evidencia</p>
              <img src="${answers[item.id + '_photo'].value}" style="max-width:100%;height:auto;border-radius:10px;border:1px solid #e2e8f0;" />
            </div>
          ` : ''}
          ${answer && answers[item.id + '_note']?.value ? `
            <div style="margin-top:8px;padding:12px 14px;background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;">
              <p style="font-size:12px;color:#92400e;margin-bottom:4px;font-weight:700;">Nota</p>
              <p style="font-size:14px;color:#0f172a;line-height:1.5;margin:0;">${answers[item.id + '_note'].value}</p>
            </div>
          ` : ''}
          ${answer && answers[item.id + '_field']?.value ? `
            <div style="margin-top:6px;padding:10px;background:#f8fafc;border-radius:10px;font-size:13px;color:#0f172a;border:1px solid #e2e8f0;">
              ${answers[item.id + '_field'].value}
            </div>
          ` : ''}
        `;
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
      return tpl.sections.map((section, sectionIdx) => `
        <div class="section-card" style="page-break-inside:avoid;break-inside:avoid;">
          <div class="section-header">
            <h3 class="section-title">${section.title || `Sección ${sectionIdx + 1}`}</h3>
            ${section.description ? `<p class="section-desc">${section.description}</p>` : ''}
          </div>
          <div class="section-body">
            ${(section.items || []).map(item => {
              const answer = answers[item.id];
              return `
                <div class="field-item" style="page-break-inside:avoid;break-inside:avoid;">
                  <div class="field-label">
                    ${item.label}
                    ${item.required ? '<span class="required-mark">*</span>' : ''}
                  </div>
                  <div class="field-value">
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
          <title>${completedInspection.title}</title>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
          <style>
            * { margin:0; padding:0; box-sizing:border-box; }
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
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
            .content-area { padding: 28px 32px; background: #f8fafc; }
            .section-card {
              background: white;
              border: 1px solid #e2e8f0;
              border-radius: 14px;
              margin-bottom: 18px;
              overflow: hidden;
              box-shadow: 0 8px 24px rgba(15,23,42,0.06);
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .section-header {
              background: #f8fafc;
              padding: 14px 18px;
              border-bottom: 1px solid #e2e8f0;
            }
            .section-title { font-size: 16px; font-weight: 700; color: #0f172a; margin: 0; letter-spacing: -0.01em; }
            .section-desc { font-size: 13px; color: #64748b; margin-top: 4px; }
            .section-body {
              padding: 16px 18px;
              display: grid;
              gap: 16px;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .field-item {
              padding-bottom: 14px;
              border-bottom: 1px solid #f1f5f9;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .field-item:last-child { border-bottom: none; padding-bottom: 0; }
            .field-label {
              font-weight: 700;
              color: #475569;
              font-size: 12px;
              letter-spacing: 0.04em;
              text-transform: uppercase;
              margin-bottom: 6px;
              display: flex;
              align-items: center;
              gap: 6px;
            }
            .required-mark { color: #ef4444; font-size: 14px; }
            .field-value { color: #0f172a; font-size: 14px; line-height: 1.6; }
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
                <img src="${window.location.origin}/logo.png" alt="RODICON" class="company-logo" />
                <div>
                  <h1 class="doc-title">Reporte de Inspección HSE</h1>
                  <p class="doc-subtitle">Sistema de Gestión de Seguridad y Salud Ocupacional</p>
                </div>
              </div>
              <div class="inspection-meta">
                <div class="meta-info">
                  <div class="meta-title">${completedInspection.title}</div>
                  <div class="meta-date">📅 ${new Date(completedInspection.completed_at || completedInspection.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                  <div class="meta-date" style="margin-top:4px;">📋 Inspección #${completedInspection.inspection_number}</div>
                </div>
                <div class="status-badge" style="background:${statusStyles.bg};color:${statusStyles.text};border:1px solid ${statusStyles.border};">
                  ${statusStyles.icon} ${statusStyles.label}
                </div>
              </div>
            </div>

            <div class="content-area">
              ${buildSections()}
            </div>

            <div class="footer-area">
              <div class="footer-grid">
                <div class="footer-item">
                  <strong>👤 Realizada por:</strong>
                  ${completedInspection.conducted_by_name || 'No especificado'}
                </div>
                <div class="footer-item">
                  <strong>📆 Fecha de generación:</strong>
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
                Documento generado automáticamente por el Sistema RODICON HSE
              </div>
            </div>
          </div>

          <script>
            window.onload = function() {
              const element = document.querySelector('.page-container');
              const opt = {
                margin: 0,
                filename: '${completedInspection.inspection_number || 'inspeccion'}.pdf',
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-600">Cargando plantilla...</p>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">No se encontró la plantilla.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-800">
            <ClipboardCheck className="text-blue-600" />
            <div>
              <p className="text-xs text-gray-500">Nueva inspección</p>
              <h1 className="text-lg font-semibold">{template.name}</h1>
              {template.description && (
                <p className="text-xs text-gray-500">{template.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.close()}
              className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50 flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Cerrar ventana
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="bg-white shadow-sm rounded-xl p-4 sm:p-6">
          <FormRenderer
            template={template}
            onSubmit={handleSubmit}
            mode="edit"
            showScore={template.scoring_enabled}
          />
          {saving && (
            <p className="text-xs text-gray-500 mt-2">Guardando...</p>
          )}
        </div>
      </main>

      {showSuccessModal && completedInspection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                ¡Inspección Completada!
              </h2>
              <p className="text-gray-600 mb-6">
                La inspección se ha guardado exitosamente.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 w-full mb-6 text-left">
                <p className="text-sm text-gray-600 mb-1">Número de inspección:</p>
                <p className="font-mono font-semibold text-gray-900">{completedInspection.inspection_number}</p>
              </div>
              <div className="flex gap-3 w-full">
                <button
                  onClick={handleExport}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 font-medium"
                >
                  <Download className="w-5 h-5" />
                  Exportar a PDF
                </button>
                <button
                  onClick={() => window.close()}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2 font-medium"
                >
                  <X className="w-5 h-5" />
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
