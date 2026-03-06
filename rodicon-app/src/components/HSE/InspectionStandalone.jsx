import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ClipboardCheck, CheckCircle, Download, X } from 'lucide-react';
import toast from 'react-hot-toast';
import FormRenderer from './FormRenderer';
import { getTemplateById, createInspection, completeInspection, getInspectionById } from '../../services/hseService';
import { supabase } from '../../supabaseClient';
import { useAppContext } from '../../AppContext';
import { isOnline, saveInspectionOffline } from '../../utils/offlineSync';

export default function InspectionStandalone({ templateId, inspectionId = null, fallbackUserId = null }) {
  const { user } = useAppContext();
  const [template, setTemplate] = useState(null);
  const [initialAnswers, setInitialAnswers] = useState({});
  const [draftInspection, setDraftInspection] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [completedInspection, setCompletedInspection] = useState(null);

  const extractContextFromAnswers = (schema, answers) => {
    let location = null;
    let area = null;

    schema?.sections?.forEach(section => {
      section.items?.forEach(item => {
        if (item.type === 'location' && answers[item.id]?.value) {
          location = answers[item.id].label || answers[item.id].value;
        }
        if (item.type === 'area' && answers[item.id]?.value) {
          area = answers[item.id].label || answers[item.id].value;
        }
      });
    });

    return { location, area };
  };

  const isDraftMode = useMemo(() => Boolean(inspectionId), [inspectionId]);
  const resolvedUserId = useMemo(() => {
    if (user?.id) return String(user.id);
    if (fallbackUserId) return String(fallbackUserId);
    return null;
  }, [user?.id, fallbackUserId]);

  useEffect(() => {
    const load = async () => {
      try {
        setAccessDenied(false);

        if (inspectionId) {
          const existingInspection = await getInspectionById(inspectionId);

          if (!existingInspection || existingInspection.status !== 'DRAFT') {
            toast.error('El borrador no está disponible para continuar');
            setAccessDenied(true);
            return;
          }

          if (!resolvedUserId || String(existingInspection.conducted_by) !== String(resolvedUserId)) {
            toast.error('Solo el usuario que inició el borrador puede continuarlo');
            setAccessDenied(true);
            return;
          }

          const draftTemplate = existingInspection.template_snapshot
            ? {
                id: existingInspection.template_id || templateId,
                name: existingInspection.title || 'Inspección HSE',
                description: '',
                schema: existingInspection.template_snapshot,
                scoring_enabled: existingInspection.template_snapshot?.scoring?.enabled ?? true
              }
            : await getTemplateById(existingInspection.template_id || templateId);

          setTemplate(draftTemplate);
          setInitialAnswers(existingInspection.answers || {});
          setDraftInspection(existingInspection);
          return;
        }

        const tpl = await getTemplateById(templateId);
        setTemplate(tpl);
        setInitialAnswers({});
        setDraftInspection(null);
      } catch (error) {
        console.error('Error loading template', error);
        toast.error('No se pudo cargar la plantilla');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [templateId, inspectionId, resolvedUserId]);

  const handleSubmit = async (formData) => {
    if (!formData) {
      window.close();
      return;
    }

    try {
      setSaving(true);

      if (!resolvedUserId) {
        toast.error('No se pudo identificar el usuario que realiza la inspección. Cierra y abre de nuevo desde el panel.');
        return;
      }
      
      // Extraer asset_id si hay un campo tipo 'asset' en las respuestas
      let assetId = null;
      let ficha = null;
      
      if (formData.answers && template?.schema?.sections) {
        template.schema.sections.forEach(section => {
          section.items?.forEach(item => {
            if (item.type === 'asset' && formData.answers[item.id]?.value) {
              assetId = formData.answers[item.id].value;
              ficha = formData.answers[item.id].label?.split(' - ')[0]; // Extraer la ficha
            }
          });
        });
      }

      const contextData = extractContextFromAnswers(template?.schema, formData.answers || {});

      const completePayload = {
        ...formData,
        latitude: null,
        longitude: null,
        conducted_by: resolvedUserId || null
      };

      if (isDraftMode && draftInspection) {
        if (!isOnline()) {
          toast.error('Debes tener conexión para continuar un borrador existente');
          return;
        }

        await completeInspection(draftInspection.id, completePayload);
        const fullInspection = await getInspectionById(draftInspection.id);
        setCompletedInspection(fullInspection);
        setShowSuccessModal(true);
        toast.success('✓ Borrador completado exitosamente');
        return;
      }

      const createPayload = {
        template_id: template.id,
        title: template.name,
        priority: 'MEDIA',
        conducted_by: resolvedUserId || null,
        asset_id: assetId,
        ficha,
        location: contextData.location,
        area: contextData.area
      };

      if (!isOnline()) {
        const queued = await saveInspectionOffline({
          createPayload,
          completePayload
        });

        const localInspection = {
          id: `offline-${queued.id}`,
          inspection_number: `OFF-${String(Date.now()).slice(-6)}`,
          title: template.name,
          status: 'COMPLETED',
          conducted_by_name: user?.nombre || user?.nombre_usuario || 'No especificado',
          location: contextData.location,
          area: contextData.area,
          template_snapshot: template.schema,
          answers: formData.answers || {},
          created_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        };

        setCompletedInspection(localInspection);
        setShowSuccessModal(true);
        toast.success('✓ Inspección guardada sin conexión. Se sincronizará automáticamente.');
        return;
      }
      
      const inspection = await createInspection(createPayload);

      await completeInspection(inspection.id, completePayload);

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
    let hasLocationQuestion = false;
    let hasAreaQuestion = false;

    if (tpl.sections) {
      tpl.sections.forEach(section => {
        section.items?.forEach(item => {
          if (item.type === 'location') {
            hasLocationQuestion = true;
          }
          if (item.type === 'area') {
            hasAreaQuestion = true;
          }
          if (item.type === 'location' && answers[item.id]?.value) {
            formLocation = answers[item.id].label || answers[item.id].value || formLocation;
          }
          if (item.type === 'area' && answers[item.id]?.value) {
            formArea = answers[item.id].value;
          }
        });
      });
    }

    const performedBy = completedInspection.conducted_by_name || user?.nombre || user?.nombre_usuario || 'No especificado';

    const formatDate = (input) => {
      if (!input) return '—';
      const date = new Date(input);
      if (Number.isNaN(date.getTime())) return String(input);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    };

    const formatDateTime = (input) => {
      if (!input) return '—';
      const date = new Date(input);
      if (Number.isNaN(date.getTime())) return String(input);
      const datePart = formatDate(date);
      const timePart = date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      return `${datePart} ${timePart}`;
    };

    const formatPossibleDateTimeValue = (input) => {
      if (typeof input !== 'string') return input;
      const trimmed = input.trim();

      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed)) {
        return formatDateTime(trimmed);
      }

      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return formatDate(trimmed);
      }

      return input;
    };

    const statusStyles = completedInspection.status === 'COMPLETED'
      ? { bg: 'rgba(34,197,94,0.12)', text: '#16a34a', border: 'rgba(34,197,94,0.45)', label: 'Completada', icon: '✓' }
      : { bg: 'rgba(249,115,22,0.12)', text: '#ea580c', border: 'rgba(249,115,22,0.35)', label: 'Incompleta', icon: '⏱' };

    const renderFollowUpDetails = (itemId) => {
      if (!itemId) return '';

      const questions = Object.entries(answers)
        .filter(([key, ans]) => key.startsWith(`${itemId}_question_`) && ans?.value)
        .sort(([a], [b]) => a.localeCompare(b));

      const note = answers[`${itemId}_followup_note`]?.value;
      const filesValue = answers[`${itemId}_followup_files`]?.value;
      const files = Array.isArray(filesValue) ? filesValue : (filesValue ? [filesValue] : []);

      if (questions.length === 0 && !note && files.length === 0) return '';

      const questionsHtml = questions.map(([, ans], idx) => `
        <div style="margin-top:8px;padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
          <p style="font-size:12px;color:#475569;margin:0 0 4px 0;font-weight:700;">${ans?.label || `Pregunta adicional ${idx + 1}`}</p>
          <p style="font-size:13px;color:#0f172a;margin:0;line-height:1.5;">${ans?.value || '—'}</p>
        </div>
      `).join('');

      const noteHtml = note ? `
        <div style="margin-top:8px;padding:12px 14px;background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;">
          <p style="font-size:12px;color:#92400e;margin-bottom:4px;font-weight:700;">Nota de seguimiento</p>
          <p style="font-size:14px;color:#0f172a;line-height:1.5;margin:0;">${note}</p>
        </div>
      ` : '';

      const filesHtml = files.length > 0 ? `
        <div class="photo-block" style="margin-top:10px;">
          <p style="font-size:12px;color:#64748b;margin-bottom:6px;font-weight:600;">Archivos de seguimiento (${files.length})</p>
          <div class="photo-grid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;">
            ${files.map((url, idx) => `
              <div class="photo-cell" style="position:relative;">
                <img src="${url}" style="width:100%;height:160px;object-fit:contain;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;image-rendering:auto;" />
                <span style="position:absolute;bottom:4px;left:4px;background:rgba(0,0,0,0.7);color:white;padding:2px 6px;border-radius:4px;font-size:10px;">Archivo ${idx + 1}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : '';

      return `
        <div style="margin-top:10px;">
          ${questionsHtml}
          ${noteHtml}
          ${filesHtml}
        </div>
      `;
    };

    const hasFollowUpData = (itemId) => {
      if (!itemId) return false;

      const hasQuestions = Object.entries(answers).some(([key, ans]) => key.startsWith(`${itemId}_question_`) && !!ans?.value);
      const hasNote = !!answers[`${itemId}_followup_note`]?.value;

      const filesValue = answers[`${itemId}_followup_files`]?.value;
      const files = Array.isArray(filesValue) ? filesValue : (filesValue ? [filesValue] : []);
      const hasFiles = files.length > 0;

      return hasQuestions || hasNote || hasFiles;
    };

    const renderFieldValue = (item, answer) => {
      const value = answer?.value;

      if (item.type === 'asset' || item.type === 'location' || item.type === 'area') {
        const label = answer?.label || value;
        return `<div style="margin-top:6px;color:#0f172a;font-size:15px;font-weight:600;">${label || '—'}</div>${renderFollowUpDetails(item.id)}`;
      }

      if (item.type === 'signature') {
        if (value?.startsWith?.('text:')) {
          const signatureName = value.replace('text:', '');
          return `<div style="margin-top:8px;padding:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;min-height:90px;display:flex;align-items:center;"><p style="font-size:26px;font-style:italic;color:#0f172a;font-family:cursive;margin:0;">${signatureName}</p></div>${renderFollowUpDetails(item.id)}`;
        } else if (value) {
          return `<div style="margin-top:8px;padding:10px;border:1px solid #e2e8f0;border-radius:10px;background:#ffffff;min-height:120px;display:flex;align-items:center;justify-content:center;"><img src="${value}" style="max-width:100%;max-height:130px;width:auto;height:auto;object-fit:contain;" /></div>${renderFollowUpDetails(item.id)}`;
        }
        return `<div style="margin-top:4px;color:#9ca3af;">Sin firma</div>${renderFollowUpDetails(item.id)}`;
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

        // Manejar múltiples fotos en evidencia
        const photoValue = answers[item.id + '_photo']?.value;
        const photos = Array.isArray(photoValue) ? photoValue : (photoValue ? [photoValue] : []);
        const photoHTML = photos.length > 0 ? `
          <div class="photo-block" style="margin-top:12px;">
            <p style="font-size:12px;color:#64748b;margin-bottom:6px;font-weight:600;">Evidencia (${photos.length} foto${photos.length > 1 ? 's' : ''})</p>
            <div class="photo-grid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;">
              ${photos.map((url, idx) => `
                <div class="photo-cell" style="position:relative;">
                  <img src="${url}" style="width:100%;height:170px;object-fit:contain;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;image-rendering:auto;" />
                  <span style="position:absolute;bottom:4px;left:4px;background:rgba(0,0,0,0.7);color:white;padding:2px 6px;border-radius:4px;font-size:10px;">Foto ${idx + 1}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : '';

        return `
          <div style="display:inline-flex;align-items:center;gap:8px;padding:10px 14px;background:${colors.bg};color:${colors.text};border-radius:10px;font-weight:700;font-size:14px;margin-top:4px;border:1px solid #e2e8f0;">
            ${value || '—'}
          </div>
          ${photoHTML}
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
          ${renderFollowUpDetails(item.id)}
        `;
      }

      if (item.type === 'photo' || value?.startsWith?.('data:image') || value?.includes?.('http')) {
        const photos = Array.isArray(value) ? value : (value ? [value] : []);
        if (photos.length === 0) return `<div style="margin-top:4px;color:#9ca3af;">Sin fotos</div>${renderFollowUpDetails(item.id)}`;
        
        if (photos.length === 1) {
          return `<div class="photo-block" style="margin-top:8px;"><img src="${photos[0]}" style="width:100%;max-height:320px;object-fit:contain;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;image-rendering:auto;" /></div>${renderFollowUpDetails(item.id)}`;
        }
        
        return `
          <div class="photo-block" style="margin-top:8px;">
            <p style="font-size:12px;color:#64748b;margin-bottom:6px;font-weight:600;">${photos.length} fotos</p>
            <div class="photo-grid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;">
              ${photos.map((url, idx) => `
                <div class="photo-cell" style="position:relative;">
                  <img src="${url}" style="width:100%;height:170px;object-fit:contain;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;image-rendering:auto;" />
                  <span style="position:absolute;bottom:4px;left:4px;background:rgba(0,0,0,0.7);color:white;padding:2px 6px;border-radius:4px;font-size:10px;">Foto ${idx + 1}</span>
                </div>
              `).join('')}
            </div>
          </div>
          ${renderFollowUpDetails(item.id)}
        `;
      }

      if (item.type === 'checkbox') {
        return `<div style="margin-top:4px;color:#059669;font-weight:700;">${value ? '✓ Sí' : '✗ No'}</div>${renderFollowUpDetails(item.id)}`;
      }

      if (item.type === 'text' || item.type === 'textarea' || item.type === 'number') {
        const formattedValue = formatPossibleDateTimeValue(value);
        return `<div style="margin-top:6px;color:#0f172a;font-size:14px;line-height:1.6;">${formattedValue || '—'}</div>${renderFollowUpDetails(item.id)}`;
      }

      const formattedValue = formatPossibleDateTimeValue(value);
      return `<div style="margin-top:6px;color:#0f172a;font-size:14px;">${formattedValue ?? '—'}</div>${renderFollowUpDetails(item.id)}`;
    };

    const buildSections = () => {
      if (!tpl.sections) return '';

      const shouldRenderItem = (item, answer) => {
        const value = answer?.value;

        if (hasFollowUpData(item?.id)) return true;

        if (item?.type === 'photo') {
          const photos = Array.isArray(value) ? value : (value ? [value] : []);
          return photos.length > 0;
        }

        if (value === null || value === undefined) return !!item?.required;
        if (typeof value === 'string' && value.trim() === '') return !!item?.required;
        if (Array.isArray(value) && value.length === 0) return !!item?.required;

        return true;
      };

      return tpl.sections.map((section, sectionIdx) => `
        <div class="section-card">
          <div class="section-header">
            <h3 class="section-title">${section.title || `Sección ${sectionIdx + 1}`}</h3>
            ${section.description ? `<p class="section-desc">${section.description}</p>` : ''}
          </div>
          <div class="section-body">
            ${(section.items || []).map(item => {
              const answer = answers[item.id];
              if (!shouldRenderItem(item, answer)) return '';
              return `
                <div class="field-item">
                  <div class="field-label">
                    ${(item.label || '').trim() || 'Pregunta'}
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
              font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
              background: white;
              color: #1f2937;
              padding: 0;
            }
            .page-container {
              width: 100%;
              max-width: 794px;
              margin: 0 auto;
              background: white;
              border: 1px solid #d1d5db;
              overflow: hidden;
              box-shadow: none;
            }
            .header-band {
              background: #ffffff;
              color: #1f2937;
              padding: 18px 20px 14px;
              border-bottom: 2px solid #194898;
            }
            .logo-section {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 16px;
              margin-bottom: 10px;
            }
            .company-logo {
              width: 52px;
              height: 52px;
              padding: 6px;
              object-fit: contain;
            }
            .doc-title {
              font-size: 19px;
              font-weight: 700;
              color: #194898;
              text-transform: uppercase;
              letter-spacing: 0.04em;
            }
            .doc-subtitle {
              font-size: 11px;
              color: #6b7280;
              margin-top: 2px;
            }
            .inspection-meta {
              display: grid;
              grid-template-columns: 1fr auto;
              align-items: start;
              gap: 10px;
              margin-top: 8px;
            }
            .meta-info {
              flex: 1;
              min-width: 260px;
              border: 1px solid #d1d5db;
              background: #f9fafb;
              padding: 10px 12px;
            }
            .meta-title { font-size: 14px; font-weight: 700; margin-bottom: 4px; color: #111827; }
            .meta-date { font-size: 12px; color: #374151; }
            .status-badge {
              padding: 6px 10px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.02em;
              text-transform: uppercase;
            }
            .content-area { padding: 14px; background: #ffffff; }
            .section-card {
              background: white;
              border: 1px solid #d1d5db;
              border-radius: 0;
              margin-bottom: 10px;
              overflow: hidden;
              box-shadow: none;
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .section-header {
              background: #eff6ff;
              padding: 8px 10px;
              border-bottom: 1px solid #d1d5db;
            }
            .section-title { font-size: 13px; font-weight: 700; color: #1e3a8a; margin: 0; text-transform: uppercase; letter-spacing: 0.03em; }
            .section-desc { font-size: 11px; color: #6b7280; margin-top: 3px; }
            .section-body {
              padding: 10px;
              display: grid;
              gap: 10px;
            }
            .field-item {
              padding-bottom: 8px;
              border-bottom: 1px solid #e5e7eb;
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .field-item:last-child { border-bottom: none; padding-bottom: 0; }
            .photo-block,
            .photo-grid,
            .photo-cell,
            img {
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .field-label {
              font-weight: 600;
              color: #374151;
              font-size: 10px;
              letter-spacing: 0.03em;
              text-transform: uppercase;
              margin-bottom: 4px;
              display: flex;
              align-items: center;
              gap: 6px;
            }
            .required-mark { color: #ef4444; font-size: 14px; }
            .field-value { color: #111827; font-size: 12px; line-height: 1.5; }
            .footer-area {
              background: white;
              padding: 10px 14px 12px;
              border-top: 2px solid #194898;
            }
            .footer-grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 10px 12px;
              font-size: 11px;
              color: #374151;
            }
            .footer-item strong { color: #111827; display: block; margin-bottom: 2px; font-size: 10px; text-transform: uppercase; }
            .page-number {
              text-align: center;
              font-size: 10px;
              color: #6b7280;
              margin-top: 10px;
              padding-top: 8px;
              border-top: 1px solid #d1d5db;
            }
            @media print { body { background: white; } .page-container { box-shadow: none; margin: 0; } }
          </style>
        </head>
        <body>
          <div class="page-container">
            <div class="header-band">
              <div class="logo-section">
                <div>
                  <h1 class="doc-title">Reporte de Inspección HSE</h1>
                  <p class="doc-subtitle">Formato de inspección | Sistema RODICON</p>
                </div>
                <img src="${window.location.origin}/logo.png" alt="RODICON" class="company-logo" />
              </div>
              <div class="inspection-meta">
                <div class="meta-info">
                  <div class="meta-title">${completedInspection.title}</div>
                  <div class="meta-date">📅 ${formatDateTime(completedInspection.completed_at || completedInspection.created_at)}</div>
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
                  ${performedBy}
                </div>
                <div class="footer-item">
                  <strong>📆 Fecha de generación:</strong>
                  ${formatDate(new Date())}
                </div>
                ${hasLocationQuestion ? `
                <div class="footer-item">
                  <strong>📍 Ubicación:</strong>
                  ${formLocation}
                </div>
                ` : ''}
                ${hasAreaQuestion ? `
                <div class="footer-item">
                  <strong>🏢 Área:</strong>
                  ${formArea}
                </div>
                ` : ''}
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
                margin: [6, 6, 6, 6],
                filename: '${completedInspection.inspection_number || 'inspeccion'}.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 3, useCORS: true, letterRendering: true, backgroundColor: '#ffffff' },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak: { mode: ['css', 'legacy'], avoid: ['.section-card', '.field-item', '.photo-block', '.photo-cell', 'img'] }
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
    if (accessDenied) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="bg-white border border-red-200 rounded-xl p-6 text-center max-w-md w-full">
            <p className="text-red-700 font-semibold">No tienes permisos para continuar este borrador.</p>
            <button
              type="button"
              onClick={() => window.close()}
              className="mt-4 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
            >
              Cerrar ventana
            </button>
          </div>
        </div>
      );
    }

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
              <p className="text-xs text-gray-500">{isDraftMode ? 'Continuación de borrador' : 'Nueva inspección'}</p>
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
            initialAnswers={initialAnswers}
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
