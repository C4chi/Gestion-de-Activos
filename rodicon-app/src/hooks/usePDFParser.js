import * as pdfjsLib from 'pdfjs-dist';

// Configurar worker local desde public folder
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

/**
 * Hook para parsear PDFs y extraer información de fichas
 * Detecta fichas, estados y observaciones
 */
export const usePDFParser = () => {
  const extractTextFromPDF = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      // Extraer texto de todas las páginas con saltos de línea inteligentes
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Agrupar items por altura (Y) para detectar cambios de línea
        let lastY = null;
        let currentLine = '';
        const pageText = [];
        
        for (const item of textContent.items) {
          if (lastY !== null && Math.abs(item.y - lastY) > 5) {
            // Nueva línea detectada
            if (currentLine.trim()) {
              pageText.push(currentLine.trim());
            }
            currentLine = item.str;
          } else {
            currentLine += ' ' + item.str;
          }
          lastY = item.y;
        }
        
        if (currentLine.trim()) {
          pageText.push(currentLine.trim());
        }
        
        fullText += pageText.join('\n') + '\n';
      }

      return fullText;
    } catch (err) {
      console.error('Error parsing PDF:', err);
      throw new Error('Error al leer el PDF');
    }
  };

  /**
   * Parsea el texto del PDF de Rodicon
   * La ficha es el CÓDIGO: CA-011, CV-004, etc.
   * Estados: DISPONIBLE, TALLER, NO DISPONIBLE, ESPERA REPUESTO
   * 
   * IMPORTANTE: El PDF SOBREESCRIBE los datos existentes
   */
  const parseAssetStatus = (text) => {
    const updates = [];

    console.log('📄 Texto completo del PDF:');
    console.log(text.substring(0, 800));
    console.log('...');

    // Buscar TODAS las fichas en el texto completo
    // Patrón: 2 letras + guión + 1-3 dígitos
    const fichaPattern = /([A-Z]{2}-\d{1,3})/g;
    const fichasEncontradas = text.match(fichaPattern) || [];
    
    console.log(`📋 Fichas encontradas (global): ${fichasEncontradas.length} únicas: ${[...new Set(fichasEncontradas)].join(', ')}`);

    // Procesar línea por línea para extraer contexto
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    console.log(`📋 Total de líneas: ${lines.length}`);

    lines.forEach((line, idx) => {
      const codigoMatch = line.match(/([A-Z]{2}-\d{1,3})/);
      if (!codigoMatch) return;

      const ficha = codigoMatch[1];
      console.log(`✅ [Línea ${idx}] Detectada ficha: ${ficha} | ${line.substring(0, 80)}`);

      // Determinar estado basado en palabras clave
      let status = 'DISPONIBLE'; // default
      const lineLower = line.toLowerCase();

      // Evaluar estado de forma más específica
      if (lineLower.includes('no disponible')) {
        status = 'EN_MANTENIMIENTO';
      } else if (lineLower.includes('espera repuesto')) {
        status = 'EN_MANTENIMIENTO';
      } else if (lineLower.includes('taller') && !lineLower.includes('taller - sto')) {
        // Si dice "TALLER" pero no está en contexto de ubicación
        if (!line.match(/\bDISPONIBLE\b/i)) {
          status = 'EN_MANTENIMIENTO';
        }
      }

      // Extraer observaciones solo si NO está disponible
      let observation = '';
      
      if (status === 'EN_MANTENIMIENTO') {
        // Buscar el patrón de fechas
        const datePattern = /\d{1,2}\/\d{1,2}\/\d{4}/g;
        const matches = line.match(datePattern);
        
        if (matches) {
          // Encontrar donde empieza la última fecha
          const lastDateIdx = line.lastIndexOf(matches[matches.length - 1]);
          const afterDate = line.substring(lastDateIdx + matches[matches.length - 1].length).trim();
          
          // Ubicaciones típicas
          const palabrasUbicacion = [
            'BARRICK', 'TALLER', 'LAS PLACETAS', 'LA CUABA', 
            'SANTIAGO', 'STO.DGO.', 'PLACETAS', 'EN PRUEBA'
          ];
          
          let obsText = afterDate;
          for (const ubicacion of palabrasUbicacion) {
            const ubicIdx = obsText.toUpperCase().lastIndexOf(ubicacion);
            if (ubicIdx !== -1) {
              obsText = obsText.substring(0, ubicIdx).trim();
              break;
            }
          }
          
          observation = obsText.substring(0, 300).trim();
        }
      } else {
        // Si está disponible, limpiar observación
        observation = '';
      }

      updates.push({
        ficha: ficha.toUpperCase(),
        status,
        observacion_mecanica: observation,
        source: line.substring(0, 100),
      });
    });

    // Eliminar duplicados (último valor gana)
    const seen = new Map();
    updates.forEach(u => {
      seen.set(u.ficha, u);
    });

    return Array.from(seen.values());
  };

  return { extractTextFromPDF, parseAssetStatus };
};
