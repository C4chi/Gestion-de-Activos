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

        // --- Tabla de Ítems estilo limpio ---
        const tableColumn = ["#", "CÓDIGO", "CANT.", "FICHA", "DESCRIPCIÓN"];
        const tableRows = [];
        items.forEach((item, index) => {
            const itemData = [
              index + 1,
              item.codigo || 'S/C',
              item.cantidad || '',
              purchaseOrder.ficha || '',
              item.descripcion || ''
            ];
            tableRows.push(itemData);
        });

        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 12,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [25, 72, 152], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', cellPadding: 4 },
            bodyStyles: { textColor: GRAY_DARK, halign: 'center', cellPadding: 3, lineColor: [220,220,220], lineWidth: 0.1 },
            alternateRowStyles: { fillColor: [247, 248, 250] },
            columnStyles: {
                0: { cellWidth: 12, halign: 'center' },
                1: { cellWidth: 30, halign: 'center' },
                2: { cellWidth: 20, halign: 'center' },
                3: { cellWidth: 30, halign: 'center' },
                4: { halign: 'left' },
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
        const signatureBaseY = doc.lastAutoTable.finalY;
        const lineY = signatureBaseY + 20;
        doc.setDrawColor(0,0,0);
        doc.line(margin + 10, lineY, margin + 80, lineY); // Solicitado
        doc.line(pageWidth - margin - 80, lineY, pageWidth - margin - 10, lineY); // Aprobado
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Solicitado por', margin + 45, lineY + 7, { align: 'center' });
        doc.text('Firma autorización', pageWidth - margin - 45, lineY + 7, { align: 'center' });
        doc.setTextColor(BLUE_PRIMARY[0], BLUE_PRIMARY[1], BLUE_PRIMARY[2]);
        doc.text(`Total de ítems: ${items.length}`, pageWidth - margin, doc.lastAutoTable.finalY + 10, { align: 'right' });
        doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]); // Reset color

        // --- Sección de Firmas ---
        if (signatureBaseY < pageHeight - 60) { // Solo añadir si hay espacio
            doc.setFontSize(10);
            doc.setTextColor(0);
            doc.setFont('helvetica', 'normal');

            const signatureY = signatureBaseY + 40;
            doc.setDrawColor(BLUE_PRIMARY[0], BLUE_PRIMARY[1], BLUE_PRIMARY[2]);
            doc.line(margin + 10, signatureY, margin + 80, signatureY); // Línea para Solicitado
            doc.text(purchaseOrder.solicitante, margin + 45, signatureY - 2, { align: 'center' });
            doc.text("Firma Solicitante", margin + 45, signatureY + 5, { align: 'center' });

            doc.line(pageWidth - margin - 80, signatureY, pageWidth - margin - 10, signatureY); // Línea para Aprobado
            doc.text("Firma Aprobación (Compras)", pageWidth - margin - 45, signatureY + 5, { align: 'center' });
        }

        doc.save(`Requisicion_${purchaseOrder.numero_requisicion}.pdf`);
    } catch (e) {
        console.error("Error durante la generación del PDF:", e);
        throw new Error("Error durante la generación del PDF."); // Re-throw para que toast.promise lo capture
    }
};