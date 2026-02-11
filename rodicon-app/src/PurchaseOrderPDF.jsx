import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from './supabaseClient';

const BLUE_PRIMARY = [30, 64, 175]; // #1e40af
const GRAY_DARK = [31, 41, 55]; // #1f2937
const GRAY_LIGHT = [243, 244, 246]; // #f3f4f6
const RED_PRIORITY = [220, 38, 38]; // #dc2626
const ORANGE_PRIORITY = [249, 115, 22]; // #f97316
const GREEN_PRIORITY = [22, 163, 74]; // #16a34a

export const generatePdf = async (purchaseOrder, asset) => {
    if (!purchaseOrder) {
        console.error("No se proporcionó una orden de compra para generar el PDF.");
        return;
    }

    // Cargar los items de la requisición desde purchase_items
    let items = [];
    try {
        const { data: itemsData, error: itemsError } = await supabase
            .from('purchase_items')
            .select('*')
            .eq('purchase_id', purchaseOrder.id);
        
        if (itemsError) throw itemsError;
        items = itemsData || [];
    } catch (error) {
        console.error("Error al cargar los items:", error);
        items = [];
    }

    const doc = new jsPDF('p', 'mm', 'a4'); // 'p' for portrait, 'mm' for millimeters, 'a4' for A4 size
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.get('height');
    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.get('width');
    const margin = 14;

    try {
        try {
            const img = new Image();
            img.src = '/logo.png';
            await new Promise((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = (e) => reject(new Error("Failed to load logo image."));
            });
            // Calcular el aspect ratio para evitar que se estire
            const aspectRatio = img.width / img.height;
            const imgWidth = 35; // Ancho deseado
            const imgHeight = imgWidth / aspectRatio;
            doc.addImage(img, 'PNG', margin, 15, imgWidth, imgHeight);
        } catch (error) {
            console.error("Error al cargar el logo. Asegúrate de que 'logo.png' esté en la carpeta 'public'.", error);
            doc.setFontSize(10).text("RODICON", margin, 20); // Texto si el logo no carga
        }

        // --- Información de la Empresa ---
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text("RODICON", pageWidth - margin, 18, { align: 'right' });

                // --- Encabezado tipo ficha compacta ---
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(18);
                doc.setTextColor(BLUE_PRIMARY[0], BLUE_PRIMARY[1], BLUE_PRIMARY[2]);
                doc.text('SOLICITUD DE REPUESTOS', pageWidth - margin, 30, { align: 'right' });
                doc.setFontSize(10);
                doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
                doc.text('Departamento de Mantenimiento', pageWidth - margin, 36, { align: 'right' });

                // Fecha real de solicitud
                const fechaSolicitud = purchaseOrder.fecha_solicitud
                    ? new Date(purchaseOrder.fecha_solicitud).toLocaleString()
                    : 'N/D';

                // Card principal con datos de orden y activo
                autoTable(doc, {
                        startY: 50,
                        body: [[
                            {
                                content:
                                    `SOLICITADO POR:\n${purchaseOrder.solicitante || 'N/A'}\n\n` +
                                    `PROYECTO:\n${purchaseOrder.proyecto || 'N/A'}\n\n` +
                                    `PRIORIDAD:\n${(purchaseOrder.prioridad || 'N/A').toUpperCase()}`,
                                styles: { fontSize: 9, cellPadding: 4 }
                            },
                            {
                                content:
                                    `FECHA:\n${fechaSolicitud}\n\n` +
                                    `NRO. SOLICITUD:\n${purchaseOrder.numero_requisicion || 'N/A'}\n\n` +
                                    `FICHA:\n${purchaseOrder.ficha || 'N/A'}`,
                                styles: { fontSize: 9, cellPadding: 4 }
                            },
                            {
                                content:
                                      `MARCA / MODELO:\n${asset ? `${asset.marca || ''} ${asset.modelo || ''}`.trim() : 'N/A'}\n\n` +
                                      `AÑO / CHASIS:\n${asset ? `${(asset.anio || asset['año'] || 'N/A')} / ${asset.chasis || 'N/A'}` : 'N/A'}\n\n` +
                                      `DEPARTAMENTO:\nMANTENIMIENTO`,
                                styles: { fontSize: 9, cellPadding: 4 }
                            }
                        ]],
                        theme: 'plain',
                        styles: { fontSize: 9, lineColor: [200,200,200], lineWidth: 0.2, cellPadding: 4 },
                        columnStyles: {
                            0: { cellWidth: (pageWidth - margin * 2) / 3 },
                            1: { cellWidth: (pageWidth - margin * 2) / 3 },
                            2: { cellWidth: (pageWidth - margin * 2) / 3 },
                        },
                        didDrawCell: (data) => {
                            // Underlines estilo guía
                            const y = data.cell.y + data.cell.height - 2;
                            doc.setDrawColor(200,200,200);
                            doc.setLineWidth(0.2);
                            doc.line(data.cell.x, y, data.cell.x + data.cell.width, y);
                        }
                });

        // --- Tabla de Ítems con precios y proveedores ---
        const tableColumn = ["#", "CÓDIGO", "DESCRIPCIÓN", "PROVEEDOR", "CANT.", "P. UNIT.", "MONEDA", "SUBTOTAL"];
        const tableRows = [];
        
        // Calcular totales por moneda
        const totales = { DOP: 0, USD: 0 };
        
        items.forEach((item, index) => {
            const precio = parseFloat(item.precio_unitario || 0);
            const cantidad = parseInt(item.cantidad || 0);
            const moneda = item.moneda || 'DOP';
            const subtotal = precio * cantidad;
            
            // Acumular total por moneda
            totales[moneda] += subtotal;
            
            const itemData = [
              index + 1,
              item.codigo || 'S/C',
              item.descripcion || '',
              item.proveedor || '-',
              cantidad,
              `$${precio.toFixed(2)}`,
              moneda,
              `${moneda} $${subtotal.toFixed(2)}`
            ];
            tableRows.push(itemData);
        });
        
        // Agregar fila(s) de total al final
        if (totales.DOP > 0) {
            tableRows.push(['', '', '', '', '', '', 'TOTAL DOP:', `DOP $${totales.DOP.toFixed(2)}`]);
        }
        if (totales.USD > 0) {
            tableRows.push(['', '', '', '', '', '', 'TOTAL USD:', `USD $${totales.USD.toFixed(2)}`]);
        }

        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 12,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [25, 72, 152], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', cellPadding: 3, fontSize: 8 },
            bodyStyles: { textColor: GRAY_DARK, halign: 'center', cellPadding: 2, lineColor: [220,220,220], lineWidth: 0.1, fontSize: 8 },
            alternateRowStyles: { fillColor: [247, 248, 250] },
            columnStyles: {
                0: { cellWidth: 8, halign: 'center' },   // #
                1: { cellWidth: 22, halign: 'center', fontSize: 7 },  // CÓDIGO
                2: { cellWidth: 48, halign: 'left' },    // DESCRIPCIÓN
                3: { cellWidth: 28, halign: 'left', fontSize: 7 },   // PROVEEDOR
                4: { cellWidth: 12, halign: 'center' },  // CANT
                5: { cellWidth: 18, halign: 'right' },   // P. UNIT
                6: { cellWidth: 15, halign: 'center' },  // MONEDA
                7: { cellWidth: 25, halign: 'right', fontStyle: 'bold' }, // SUBTOTAL
            },
            didDrawCell: function(data) {
                // Resaltar filas de total
                if (data.section === 'body' && data.cell.raw && 
                    (String(data.cell.raw).includes('TOTAL DOP') || String(data.cell.raw).includes('TOTAL USD'))) {
                    doc.setFillColor(220, 252, 231); // Verde claro
                    doc.setFont('helvetica', 'bold');
                }
            },
            didDrawPage: function () {
                // --- Footer de Página ---
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(
                    'Documento generado automáticamente por Sistema Rodicon',
                    margin,
                    pageHeight - 10
                );
                doc.text(
                    `Página ${doc.internal.getNumberOfPages()}`,
                    pageWidth - margin,
                    pageHeight - 10,
                    { align: 'right' }
                );
            }
        });

        // --- Firmas ---
        const signatureBaseY = doc.lastAutoTable.finalY + 8;
        
        // Agregar información de cotizaciones si existen
        const itemsConCotizacion = items.filter(item => item.cotizacion && item.cotizacion.trim());
        if (itemsConCotizacion.length > 0) {
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text('Cotizaciones:', margin, signatureBaseY);
            let yPos = signatureBaseY + 4;
            itemsConCotizacion.forEach((item, idx) => {
                doc.text(`• ${item.descripcion.substring(0, 40)}: ${item.cotizacion}`, margin + 5, yPos);
                yPos += 4;
            });
            doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
        }
        
        const lineY = signatureBaseY + 25 + (itemsConCotizacion.length * 4);
        
        if (lineY < pageHeight - 40) { // Solo añadir si hay espacio
            doc.setDrawColor(BLUE_PRIMARY[0], BLUE_PRIMARY[1], BLUE_PRIMARY[2]);
            doc.line(margin + 10, lineY, margin + 80, lineY); // Solicitado
            doc.line(pageWidth - margin - 80, lineY, pageWidth - margin - 10, lineY); // Aprobado
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
            doc.text('Solicitado por', margin + 45, lineY + 5, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(purchaseOrder.solicitante || 'N/A', margin + 45, lineY + 10, { align: 'center' });
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text('Aprobado por', pageWidth - margin - 45, lineY + 5, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text('Compras', pageWidth - margin - 45, lineY + 10, { align: 'center' });
        }

        doc.save(`Requisicion_${purchaseOrder.numero_requisicion}.pdf`);
    } catch (e) {
        console.error("Error durante la generación del PDF:", e);
        throw new Error("Error durante la generación del PDF."); // Re-throw para que toast.promise lo capture
    }
};