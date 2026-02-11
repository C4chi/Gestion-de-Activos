-- ═══════════════════════════════════════════════════════════════════════════════
-- FIX: Agregar columna updated_at a tablas existentes
-- ═══════════════════════════════════════════════════════════════════════════════

-- Agregar updated_at a purchase_quotation_items si no existe
ALTER TABLE purchase_quotation_items 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Agregar updated_at a purchase_quotations si no existe
ALTER TABLE purchase_quotations 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Refrescar schema cache (CRÍTICO)
NOTIFY pgrst, 'reload schema';

-- Verificar que las columnas existan
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name IN ('purchase_quotations', 'purchase_quotation_items') 
  AND column_name IN ('updated_at', 'created_at')
ORDER BY table_name, column_name;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ Si ves las 4 filas (2 tablas x 2 columnas), está OK
-- Recarga tu app: Ctrl+Shift+R
-- ═══════════════════════════════════════════════════════════════════════════════
