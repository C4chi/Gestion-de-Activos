import React, { useState } from 'react';
import { FullScreenModal } from './FullScreenModal';
import { Download, BarChart3, FileText, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

/**
 * ReportsPanel
 * Panel de generación de reportes con exportación a Excel y PDF
 */
export const ReportsPanel = ({ onClose, assets, purchases, mtoLogs, safetyReports }) => {
  const [selectedReport, setSelectedReport] = useState(null);
  const [filters, setFilters] = useState({});

  // Exportar a Excel
  const exportToExcel = (data, fileName, sheetName = 'Datos') => {
    try {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(data);
      
      // Ajustar ancho de columnas
      const columnWidths = Object.keys(data[0] || {}).map(() => 15);
      worksheet['!cols'] = columnWidths.map(w => ({ wch: w }));
      
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success(`✅ Reporte exportado: ${fileName}`);
    } catch (err) {
      toast.error('Error al exportar a Excel');
      console.error(err);
    }
  };

  // Exportar a PDF (usando canvas HTML5)
  const exportToPDF = (htmlContent, fileName) => {
    try {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>${fileName}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1 { color: #333; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { background-color: #4f46e5; color: white; padding: 12px; text-align: left; }
              td { padding: 10px; border-bottom: 1px solid #ddd; }
              tr:nth-child(even) { background-color: #f9fafb; }
              .summary { background-color: #f3f4f6; padding: 15px; margin: 20px 0; border-radius: 8px; }
              .footer { margin-top: 40px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            ${htmlContent}
            <div class="footer">
              <p>Generado el: ${new Date().toLocaleString()}</p>
              <p>Sistema Rodicon - Gestión de Activos</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    } catch (err) {
      toast.error('Error al exportar a PDF');
      console.error(err);
    }
  };

  // ===== REPORTES =====

  const generateInventoryReport = () => {
    const data = assets.map((asset) => ({
      'Ficha': asset.ficha,
      'Tipo': asset.tipo || '—',
      'Marca': asset.marca || '—',
      'Modelo': asset.modelo || '—',
      'Año': asset.año || '—',
      'Chasis': asset.chasis || '—',
      'Estado': asset.status || 'DISPONIBLE',
      'Ubicación': asset.ubicacion_actual || '—',
      'Observaciones': asset.observacion_mecanica || '—',
    }));

    exportToExcel(data, 'Inventario_Completo', 'Inventario');

    // Versión PDF
    const statsHtml = `
      <h1>📊 Reporte de Inventario Completo</h1>
      <div class="summary">
        <p><strong>Total de Activos:</strong> ${assets.length}</p>
        <p><strong>Disponibles:</strong> ${assets.filter(a => a.status === 'DISPONIBLE').length}</p>
        <p><strong>En Mantenimiento:</strong> ${assets.filter(a => a.status === 'EN_MANTENIMIENTO').length}</p>
        <p><strong>Generado:</strong> ${new Date().toLocaleString()}</p>
      </div>
      <table>
        <tr>
          <th>Ficha</th><th>Tipo</th><th>Marca</th><th>Modelo</th><th>Estado</th><th>Ubicación</th>
        </tr>
        ${assets.map(a => `
          <tr>
            <td>${a.ficha}</td>
            <td>${a.tipo || '—'}</td>
            <td>${a.marca || '—'}</td>
            <td>${a.modelo || '—'}</td>
            <td>${a.status || 'DISPONIBLE'}</td>
            <td>${a.ubicacion_actual || '—'}</td>
          </tr>
        `).join('')}
      </table>
    `;
    exportToPDF(statsHtml, 'Inventario_Completo');
  };

  const generateStatusReport = () => {
    const statusGroups = {
      'DISPONIBLE': assets.filter(a => a.status === 'DISPONIBLE'),
      'EN_MANTENIMIENTO': assets.filter(a => a.status === 'EN_MANTENIMIENTO'),
      'VENDIDO': assets.filter(a => a.status === 'VENDIDO'),
    };

    const data = [];
    Object.entries(statusGroups).forEach(([status, items]) => {
      items.forEach((asset) => {
        data.push({
          'Estado': status,
          'Ficha': asset.ficha,
          'Tipo': asset.tipo,
          'Marca': asset.marca,
          'Ubicación': asset.ubicacion_actual || '—',
        });
      });
    });

    exportToExcel(data, 'Reporte_Por_Estado', 'Por Estado');

    // PDF
    const statsHtml = `
      <h1>📈 Reporte por Estado</h1>
      <div class="summary">
        <p><strong>Disponibles:</strong> ${statusGroups['DISPONIBLE'].length}</p>
        <p><strong>En Mantenimiento:</strong> ${statusGroups['EN_MANTENIMIENTO'].length}</p>
        <p><strong>Vendidos:</strong> ${statusGroups['VENDIDO'].length}</p>
      </div>
      <table>
        <tr>
          <th>Estado</th><th>Cantidad</th><th>Porcentaje</th>
        </tr>
        ${Object.entries(statusGroups).map(([status, items]) => `
          <tr>
            <td>${status}</td>
            <td>${items.length}</td>
            <td>${((items.length / assets.length) * 100).toFixed(1)}%</td>
          </tr>
        `).join('')}
      </table>
    `;
    exportToPDF(statsHtml, 'Reporte_Por_Estado');
  };

  const generateLocationReport = () => {
    const locationGroups = {};
    assets.forEach((asset) => {
      const loc = asset.ubicacion_actual || 'SIN UBICACIÓN';
      if (!locationGroups[loc]) locationGroups[loc] = [];
      locationGroups[loc].push(asset);
    });

    const data = [];
    Object.entries(locationGroups).forEach(([location, items]) => {
      items.forEach((asset) => {
        data.push({
          'Ubicación': location,
          'Ficha': asset.ficha,
          'Tipo': asset.tipo,
          'Estado': asset.status,
        });
      });
    });

    exportToExcel(data, 'Reporte_Por_Ubicacion', 'Por Ubicación');

    // PDF
    const statsHtml = `
      <h1>🏢 Reporte por Ubicación</h1>
      <table>
        <tr>
          <th>Ubicación</th><th>Cantidad de Activos</th>
        </tr>
        ${Object.entries(locationGroups).map(([location, items]) => `
          <tr>
            <td>${location}</td>
            <td>${items.length}</td>
          </tr>
        `).join('')}
      </table>
    `;
    exportToPDF(statsHtml, 'Reporte_Por_Ubicacion');
  };

  const generatePurchasesReport = () => {
    const data = purchases.map((purchase) => ({
      'Orden': purchase.numero_orden || '—',
      'Fecha': purchase.fecha_creacion?.split('T')[0] || '—',
      'Proveedor': purchase.proveedor || '—',
      'Estado': purchase.estado || 'PENDIENTE',
      'Monto': `$${parseFloat(purchase.monto_total || 0).toFixed(2)}`,
      'Solicitante': purchase.nombre_usuario || '—',
    }));

    exportToExcel(data, 'Reporte_Compras', 'Compras');

    // PDF
    const totalMonto = purchases.reduce((sum, p) => sum + (parseFloat(p.monto_total) || 0), 0);
    const statsHtml = `
      <h1>💰 Reporte de Compras</h1>
      <div class="summary">
        <p><strong>Total de Órdenes:</strong> ${purchases.length}</p>
        <p><strong>Monto Total:</strong> $${totalMonto.toFixed(2)}</p>
        <p><strong>Pendientes:</strong> ${purchases.filter(p => p.estado === 'PENDIENTE').length}</p>
        <p><strong>Completadas:</strong> ${purchases.filter(p => p.estado === 'COMPLETADA').length}</p>
      </div>
      <table>
        <tr>
          <th>Orden</th><th>Fecha</th><th>Proveedor</th><th>Monto</th><th>Estado</th>
        </tr>
        ${purchases.map(p => `
          <tr>
            <td>${p.numero_orden || '—'}</td>
            <td>${p.fecha_creacion?.split('T')[0] || '—'}</td>
            <td>${p.proveedor || '—'}</td>
            <td>$${parseFloat(p.monto_total || 0).toFixed(2)}</td>
            <td>${p.estado || 'PENDIENTE'}</td>
          </tr>
        `).join('')}
      </table>
    `;
    exportToPDF(statsHtml, 'Reporte_Compras');
  };

  const generateMaintenanceReport = () => {
    const data = mtoLogs.map((log) => ({
      'Ficha': log.ficha || '—',
      'Tipo': log.tipo_mantenimiento || '—',
      'Fecha': log.fecha_mantenimiento?.split('T')[0] || '—',
      'Mecánico': log.nombre_usuario || '—',
      'Descripción': log.descripcion || '—',
      'Horas': log.horas_trabajadas || 0,
      'Estado': log.estado || 'COMPLETADO',
    }));

    exportToExcel(data, 'Reporte_Mantenimiento', 'Mantenimiento');

    // PDF
    const totalHours = mtoLogs.reduce((sum, log) => sum + (parseFloat(log.horas_trabajadas) || 0), 0);
    const statsHtml = `
      <h1>🔧 Reporte de Mantenimiento</h1>
      <div class="summary">
        <p><strong>Total de Registros:</strong> ${mtoLogs.length}</p>
        <p><strong>Horas Trabajadas:</strong> ${totalHours.toFixed(1)}</p>
        <p><strong>Preventivos:</strong> ${mtoLogs.filter(l => l.tipo_mantenimiento === 'PREVENTIVO').length}</p>
        <p><strong>Correctivos:</strong> ${mtoLogs.filter(l => l.tipo_mantenimiento === 'CORRECTIVO').length}</p>
      </div>
      <table>
        <tr>
          <th>Ficha</th><th>Tipo</th><th>Fecha</th><th>Mecánico</th><th>Horas</th>
        </tr>
        ${mtoLogs.map(log => `
          <tr>
            <td>${log.ficha || '—'}</td>
            <td>${log.tipo_mantenimiento || '—'}</td>
            <td>${log.fecha_mantenimiento?.split('T')[0] || '—'}</td>
            <td>${log.nombre_usuario || '—'}</td>
            <td>${log.horas_trabajadas || 0}</td>
          </tr>
        `).join('')}
      </table>
    `;
    exportToPDF(statsHtml, 'Reporte_Mantenimiento');
  };

  const generateHSEReport = () => {
    const data = safetyReports.map((report) => ({
      'Ficha': report.ficha || '—',
      'Fecha': report.fecha_inspeccion?.split('T')[0] || '—',
      'Inspector': report.nombre_usuario || '—',
      'Hallazgos': report.hallazgos_identificados || 'NINGUNO',
      'Riesgo': report.nivel_riesgo || 'BAJO',
      'Estado': report.cumplimiento === true ? 'CUMPLE' : 'NO CUMPLE',
    }));

    exportToExcel(data, 'Reporte_HSE_Inspecciones', 'HSE');

    // PDF
    const statsHtml = `
      <h1>🛡️ Reporte HSE - Inspecciones de Seguridad</h1>
      <div class="summary">
        <p><strong>Total de Inspecciones:</strong> ${safetyReports.length}</p>
        <p><strong>Conformes:</strong> ${safetyReports.filter(r => r.cumplimiento === true).length}</p>
        <p><strong>No Conformes:</strong> ${safetyReports.filter(r => r.cumplimiento === false).length}</p>
        <p><strong>Riesgo Alto:</strong> ${safetyReports.filter(r => r.nivel_riesgo === 'ALTO').length}</p>
      </div>
      <table>
        <tr>
          <th>Ficha</th><th>Fecha</th><th>Inspector</th><th>Riesgo</th><th>Cumplimiento</th>
        </tr>
        ${safetyReports.map(r => `
          <tr>
            <td>${r.ficha || '—'}</td>
            <td>${r.fecha_inspeccion?.split('T')[0] || '—'}</td>
            <td>${r.nombre_usuario || '—'}</td>
            <td>${r.nivel_riesgo || 'BAJO'}</td>
            <td>${r.cumplimiento === true ? '✅ CUMPLE' : '❌ NO CUMPLE'}</td>
          </tr>
        `).join('')}
      </table>
    `;
    exportToPDF(statsHtml, 'Reporte_HSE_Inspecciones');
  };

  const reportOptions = [
    {
      id: 'inventory',
      title: '📋 Inventario Completo',
      description: 'Todos los activos con detalles',
      action: generateInventoryReport,
    },
    {
      id: 'status',
      title: '📈 Por Estado',
      description: 'Activos agrupados por estado',
      action: generateStatusReport,
    },
    {
      id: 'location',
      title: '🏢 Por Ubicación',
      description: 'Activos agrupados por ubicación',
      action: generateLocationReport,
    },
    {
      id: 'purchases',
      title: '💰 Compras',
      description: 'Órdenes de compra con montos',
      action: generatePurchasesReport,
    },
    {
      id: 'maintenance',
      title: '🔧 Mantenimiento',
      description: 'Historial de mantenimientos realizados',
      action: generateMaintenanceReport,
    },
    {
      id: 'hse',
      title: '🛡️ HSE - Inspecciones',
      description: 'Inspecciones de seguridad',
      action: generateHSEReport,
    },
  ];

  return (
    <FullScreenModal
      title="📊 Generador de Reportes"
      color="blue"
      onClose={onClose}
    >
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <p className="text-gray-600">
            Selecciona el tipo de reporte que deseas generar. Puedes descargar en Excel o PDF.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportOptions.map((report) => (
            <div
              key={report.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition cursor-pointer"
              onClick={() => report.action()}
            >
              <div className="text-2xl mb-2">{report.title}</div>
              <p className="text-gray-600 text-sm mb-4">{report.description}</p>
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    report.action();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
                >
                  <Download size={16} />
                  Descargar
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-bold text-blue-900 mb-2">💡 Consejos:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>✓ Los reportes se descargan automáticamente en Excel</li>
            <li>✓ También puedes ver una versión imprimible en PDF</li>
            <li>✓ Los datos se actualizan en tiempo real desde la base de datos</li>
            <li>✓ Puedes abrir los Excel en Google Sheets o Excel para editar</li>
          </ul>
        </div>
      </div>
    </FullScreenModal>
  );
};
