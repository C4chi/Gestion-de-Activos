import React from 'react';
import { X, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';

export const SafetyReportDetail = ({ report, appUsers = [], onClose }) => {
  if (!report) return null;

  const typeLabel = (tipo) => {
    const map = {
      ACCIDENTE: 'Accidente',
      INCIDENTE: 'Incidente',
      NEAR_MISS: 'Casi accidente',
      SUGGESTION: 'Sugerencia',
    };
    return map[tipo] || tipo || 'Sin tipo';
  };

  const shortId = (value) => {
    if (!value) return 'N/A';
    const str = String(value);
    if (str.includes('-')) return str.split('-')[0];
    return str.slice(0, 8);
  };

  const formatDate = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const reporterName = () => {
    const fromLookup = appUsers?.find((u) => String(u.id) === String(report.reportado_por));
    return fromLookup?.nombre || report.reportado_por_nombre || report.reportado_por || 'N/A';
  };

  const priorityColor = () => {
    if (report.prioridad === 'Alta') return { r: 230, g: 57, b: 70 };
    if (report.prioridad === 'Media') return { r: 245, g: 166, b: 35 };
    if (report.prioridad === 'Baja') return { r: 76, g: 175, b: 80 };
    return { r: 100, g: 116, b: 139 }; // slate-ish fallback
  };

  const statusColor = () => {
    if (report.estado === 'CORREGIDO') return { r: 46, g: 204, b: 113 };
    return { r: 245, g: 166, b: 35 }; // pending/default
  };

  const getImageFormat = (url = '') => {
    const clean = url.split('?')[0].toLowerCase();
    if (clean.endsWith('.png')) return 'PNG';
    return 'JPEG';
  };

  const fetchImageAsDataUrl = async (url) => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const priorityBadge = priorityColor();
  const statusBadge = statusColor();

  const generatePdf = async () => {
    try {
      const doc = new jsPDF();
    
    // ========== COLORES PREMIUM ==========
    const primary = { r: 255, g: 138, b: 76 }; // Naranja corporativo
    const darkBg = { r: 25, g: 35, b: 50 }; // Azul muy oscuro
    const cardBg = { r: 255, g: 255, b: 255 }; // Blanco puro
    const softBg = { r: 248, g: 250, b: 252 }; // Gris ultra suave
    const accent = { r: 59, g: 130, b: 246 }; // Azul moderno
    const border = { r: 229, g: 231, b: 235 }; // Gris frontera
    const shadow = { r: 0, g: 0, b: 0 }; // Para sombras
    // Header más claro para permitir logo visible
    const headerLight = { r: 236, g: 242, b: 248 }; // Azul muy claro
    const headerText = { r: 25, g: 35, b: 50 }; // Texto oscuro para contraste
    
    const pColor = priorityColor();
    const sColor = statusColor();

    // ========== FONDO GENERAL ==========
    doc.setFillColor(softBg.r, softBg.g, softBg.b);
    doc.rect(0, 0, 210, 297, 'F');

    // ========== HEADER PREMIUM (CLARO CON LOGO) ==========
    // Fondo principal del header (más claro)
    doc.setFillColor(headerLight.r, headerLight.g, headerLight.b);
    doc.rect(0, 0, 210, 50, 'F');

    // Línea decorativa superior (gradiente simulado)
    doc.setFillColor(primary.r, primary.g, primary.b);
    doc.rect(0, 0, 210, 3, 'F');

    // Título del reporte
    doc.setTextColor(headerText.r, headerText.g, headerText.b);
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('REPORTE DE SEGURIDAD', 15, 20);

    // Subtítulo con información
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(90, 100, 110);
    doc.text(`${report.numero_reporte || 'HSE-000'} • Ficha: ${report.ficha || 'N/A'} • ${formatDate(report.fecha_reporte)}`, 15, 32);

    // Logo de empresa (derecha). Busca report.logo_url o /logo.png
    try {
      const pageWidth = doc.internal.pageSize.width;
      const logoUrl = report.logo_url || `${window.location.origin}/logo.png`;
      // Carga el logo y devuelve base64 + dimensiones originales en px
      const loadLogo = (url) => new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = function () {
          const canvas = document.createElement('canvas');
          canvas.width = this.width;
          canvas.height = this.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(this, 0, 0);
          resolve({ dataUrl: canvas.toDataURL('image/png'), widthPx: this.width, heightPx: this.height });
        };
        img.onerror = reject;
        img.src = url;
      });

      if (logoUrl) {
        const { dataUrl, widthPx, heightPx } = await loadLogo(logoUrl);
        const pxToMm = (px) => px * 0.264583; // 96 DPI aproximado
        let logoWmm = pxToMm(widthPx);
        let logoHmm = pxToMm(heightPx);

        // Limites para no invadir el header
        const maxW = 70; // mm
        const maxH = 22; // mm
        const scale = Math.min(1, maxW / logoWmm, maxH / logoHmm);
        logoWmm *= scale;
        logoHmm *= scale;

        const posX = pageWidth - 12 - logoWmm; // margen derecho 12mm
        const posY = 12; // posición vertical segura en el header
        doc.addImage(dataUrl, 'PNG', posX, posY, logoWmm, logoHmm);
      }
    } catch (e) {
      // Si el logo no carga, continuamos sin bloquear el PDF
      console.warn('Logo no disponible para el PDF:', e);
    }

    let y = 58;
    const margin = 12;
    const boxWidth = 90; // Ancho de cada caja (2 columnas)
    const spacing = 6; // Espacio entre cajas

    // ========== COLUMNA IZQUIERDA ==========
    
    // CAJA 1: Prioridad
    doc.setFillColor(cardBg.r, cardBg.g, cardBg.b);
    doc.setDrawColor(border.r, border.g, border.b);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, y, boxWidth, 10, 1.5, 1.5, 'FD');
    
    doc.setTextColor(darkBg.r, darkBg.g, darkBg.b);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(8);
    doc.text('Prioridad:', margin + 3, y + 4);
    
    doc.setFillColor(pColor.r, pColor.g, pColor.b);
    doc.roundedRect(margin + 3, y + 5, 30, 4, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(7);
    doc.text(report.prioridad || 'N/A', margin + 5, y + 8);

    // CAJA 2: Plazo de resolucion
    let leftY = y + 12;
    doc.setFillColor(cardBg.r, cardBg.g, cardBg.b);
    doc.roundedRect(margin, leftY, boxWidth, 10, 1.5, 1.5, 'FD');
    
    doc.setTextColor(darkBg.r, darkBg.g, darkBg.b);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(8);
    doc.text('Plazo de resolucion:', margin + 3, leftY + 4);
    
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(accent.r, accent.g, accent.b);
    doc.text(`${report.plazo_horas || 24} horas`, margin + 3, leftY + 8);

    // CAJA 3: Tipo de reporte
    leftY += 12;
    doc.setFillColor(cardBg.r, cardBg.g, cardBg.b);
    doc.setTextColor(darkBg.r, darkBg.g, darkBg.b);
    doc.roundedRect(margin, leftY, boxWidth, 10, 1.5, 1.5, 'FD');
    
    doc.setFont(undefined, 'bold');
    doc.setFontSize(8);
    doc.text('Tipo de reporte:', margin + 3, leftY + 4);
    
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.text(typeLabel(report.tipo), margin + 3, leftY + 8);

    // CAJA 4: Lugar / Área
    leftY += 12;
    doc.setFillColor(cardBg.r, cardBg.g, cardBg.b);
    doc.setTextColor(darkBg.r, darkBg.g, darkBg.b);
    doc.roundedRect(margin, leftY, boxWidth, 10, 1.5, 1.5, 'FD');
    
    doc.setFont(undefined, 'bold');
    doc.setFontSize(8);
    doc.text('Lugar / Área:', margin + 3, leftY + 4);
    
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    const lugarArea = report.lugar || report.area || 'N/A';
    doc.text(lugarArea, margin + 3, leftY + 8);

    // ========== COLUMNA DERECHA ==========
    
    // CAJA 4: Estado
    doc.setFillColor(cardBg.r, cardBg.g, cardBg.b);
    doc.roundedRect(margin + boxWidth + spacing, y, boxWidth, 10, 1.5, 1.5, 'FD');
    
    doc.setTextColor(darkBg.r, darkBg.g, darkBg.b);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(8);
    doc.text('Estado:', margin + boxWidth + spacing + 3, y + 4);
    
    doc.setFillColor(sColor.r, sColor.g, sColor.b);
    doc.roundedRect(margin + boxWidth + spacing + 3, y + 5, 35, 4, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(7);
    doc.text(report.estado || 'N/A', margin + boxWidth + spacing + 5, y + 8);

    // CAJA 5: Reportado por
    let rightY = y + 12;
    doc.setFillColor(cardBg.r, cardBg.g, cardBg.b);
    doc.setTextColor(darkBg.r, darkBg.g, darkBg.b);
    doc.roundedRect(margin + boxWidth + spacing, rightY, boxWidth, 10, 1.5, 1.5, 'FD');
    
    doc.setFont(undefined, 'bold');
    doc.setFontSize(8);
    doc.text('Reportado por:', margin + boxWidth + spacing + 3, rightY + 4);
    
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.text(reporterName(), margin + boxWidth + spacing + 3, rightY + 8);

    // CAJA 6: Asignado a
    rightY += 12;
    doc.setFillColor(cardBg.r, cardBg.g, cardBg.b);
    doc.roundedRect(margin + boxWidth + spacing, rightY, boxWidth, 10, 1.5, 1.5, 'FD');
    
    doc.setFont(undefined, 'bold');
    doc.setFontSize(8);
    doc.text('Asignado a:', margin + boxWidth + spacing + 3, rightY + 4);
    
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    const asignados = report.asignado_a || 'Sin asignar';
    doc.text(asignados, margin + boxWidth + spacing + 3, rightY + 8);

    // CAJA 7: Turno
    rightY += 12;
    doc.setFillColor(cardBg.r, cardBg.g, cardBg.b);
    doc.roundedRect(margin + boxWidth + spacing, rightY, boxWidth, 10, 1.5, 1.5, 'FD');
    
    doc.setFont(undefined, 'bold');
    doc.setFontSize(8);
    doc.text('Turno:', margin + boxWidth + spacing + 3, rightY + 4);
    
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    const turno = report.turno || 'N/A';
    doc.text(turno, margin + boxWidth + spacing + 3, rightY + 8);

    // CAJA 8: Fecha de reporte (ancho completo abajo)
    y = Math.max(leftY, rightY) + 12;
    const fullWidth = boxWidth * 2 + spacing;
    doc.setFillColor(cardBg.r, cardBg.g, cardBg.b);
    doc.roundedRect(margin, y, fullWidth, 10, 1.5, 1.5, 'FD');
    
    doc.setFont(undefined, 'bold');
    doc.setFontSize(8);
    doc.text('Fecha de reporte:', margin + 3, y + 4);
    
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.text(formatDate(report.fecha_reporte), margin + 3, y + 8);

    y += 14;

    // ========== DESCRIPCION ==========
    const contentWidth = fullWidth;
    
    doc.setFillColor(darkBg.r, darkBg.g, darkBg.b);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.text('DESCRIPCION', 105, y + 5, { align: 'center' });
    y += 12;

    doc.setTextColor(40, 40, 40);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    const descLines = doc.splitTextToSize(report.descripcion || 'Sin descripción', contentWidth - 12);
    doc.text(descLines, margin + 6, y);
    y += descLines.length * 5 + 10;

    // ========== EVIDENCIA FOTOGRAFICA ==========
    doc.setFillColor(darkBg.r, darkBg.g, darkBg.b);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.text('EVIDENCIA FOTOGRAFICA', 105, y + 5, { align: 'center' });
    y += 12;

    if (report.foto_url) {
      try {
        // Función para convertir imagen a base64
        const toDataURL = (url) => {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = function() {
              const canvas = document.createElement('canvas');
              canvas.width = this.width;
              canvas.height = this.height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(this, 0, 0);
              resolve(canvas.toDataURL('image/jpeg'));
            };
            img.onerror = reject;
            img.src = url;
          });
        };
        
        const imgData = await toDataURL(report.foto_url);
        const imgWidth = contentWidth - 12;
        const imgHeight = 100;
        doc.addImage(imgData, 'JPEG', margin + 6, y, imgWidth, imgHeight);
        y += imgHeight + 10;
      } catch (error) {
        console.error('Error al cargar imagen:', error);
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(9);
        doc.text('Error al cargar la imagen', 105, y, { align: 'center' });
        y += 10;
      }
    } else if (report.archivo_url) {
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(9);
      doc.text('Archivo: ' + report.archivo_url.split('/').pop(), margin + 6, y);
      y += 8;
    } else {
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(9);
      doc.text('Sin evidencia adjunta', 105, y, { align: 'center' });
      y += 10;
    }

    // ========== FOOTER PREMIUM ==========
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    
    // Línea divisoria elegante
    doc.setDrawColor(primary.r, primary.g, primary.b);
    doc.setLineWidth(1.2);
    doc.line(margin, pageHeight - 16, pageWidth - margin, pageHeight - 16);

    // Fondo sutil del footer
    doc.setFillColor(darkBg.r, darkBg.g, darkBg.b);
    doc.rect(0, pageHeight - 14, pageWidth, 14, 'F');

    // Contenido del footer
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 190);
    doc.setFont(undefined, 'normal');
    
    const timestamp = new Date().toLocaleString('es-ES', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    doc.text(`Generado: ${timestamp}`, margin, pageHeight - 8);
    doc.text(`RODICON SRL • ${report.numero_reporte || 'HSE-000'}`, pageWidth / 2 - 20, pageHeight - 8);
    
    // Disclaimer profesional
    doc.setFontSize(6);
    doc.setTextColor(130, 130, 140);
    doc.text('Este documento es confidencial y de uso exclusivo de RODICON SRL', margin, pageHeight - 2);

    doc.save(`reporte-${report.numero_reporte || 'HSE-000'}.pdf`);
    console.log('PDF descargado exitosamente');
    } catch (error) {
      console.error('Error al generar PDF:', error);
      alert('Error al generar el PDF. Por favor intenta de nuevo.');
    }
  };

  const isImage = (url) => {
    if (!url) return false;
    const clean = url.split('?')[0].toLowerCase();
    return /(\.png|\.jpe?g|\.gif|\.webp)$/i.test(clean);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 hover:bg-gray-100 rounded-full"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-gray-500">Reporte HSE</p>
            <h2 className="text-xl font-bold text-gray-800">{report.ficha || 'Sin ficha'}</h2>
            <p className="text-sm text-gray-500">
              <span className="font-mono text-orange-600 font-bold">{report.numero_reporte || 'HSE-000'}</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className="px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm"
              style={{ backgroundColor: `rgb(${priorityBadge.r}, ${priorityBadge.g}, ${priorityBadge.b})` }}
            >
              Prioridad: {report.prioridad || 'N/A'}
            </span>
            <span
              className="px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm"
              style={{ backgroundColor: `rgb(${statusBadge.r}, ${statusBadge.g}, ${statusBadge.b})` }}
            >
              Estado: {report.estado || 'N/A'}
            </span>
          </div>
        </div>

        <div className="space-y-3 text-sm text-gray-700">
          <div className="flex justify-between">
            <span className="font-semibold">Tipo:</span>
            <span>{typeLabel(report.tipo)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Plazo de resolución:</span>
            <span className="font-bold text-blue-600">⏱️ {report.plazo_horas || 24} horas</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Asignado a:</span>
            <span>{report.asignado_a || 'No asignado'}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Reportado por:</span>
            <span>{reporterName()}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Fecha reporte:</span>
            <span>{formatDate(report.fecha_reporte)}</span>
          </div>
          <div>
            <span className="font-semibold block mb-1">Descripción</span>
            <p className="bg-gray-50 border border-gray-200 rounded-lg p-3 whitespace-pre-wrap">{report.descripcion || 'Sin descripción'}</p>
          </div>
          <div>
            <span className="font-semibold block mb-1">Evidencia</span>
            {report.foto_url ? (
              <>
                {isImage(report.foto_url) && (
                  <div className="mb-3">
                    <img
                      src={report.foto_url}
                      alt="Evidencia"
                      className="max-h-64 rounded-lg border border-gray-200 object-contain"
                    />
                  </div>
                )}
                {(() => {
                  const filename = report.foto_url.split('/').pop()?.split('?')[0] || 'evidencia.jpg';
                  return (
                    <a 
                      href={report.foto_url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-orange-600 underline text-sm truncate block hover:text-orange-700"
                      title={report.foto_url}
                    >
                      📎 {filename}
                    </a>
                  );
                })()}
              </>
            ) : (
              <p className="text-gray-500">No adjunta</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={() => generatePdf().catch(err => console.error('Error generando PDF:', err))}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Descargar PDF
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
