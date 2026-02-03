-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Agregar campo moneda por línea de compra
-- Permite que cada ítem tenga su propia moneda (DOP o USD)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Agregar columna moneda a purchase_items
ALTER TABLE purchase_items 
ADD COLUMN IF NOT EXISTS moneda VARCHAR(10) DEFAULT 'DOP' CHECK (moneda IN ('DOP', 'USD'));

-- 2. Crear índice para búsqueda rápida por moneda
CREATE INDEX IF NOT EXISTS idx_purchase_items_moneda ON purchase_items(moneda);

-- 3. Agregar comentario
COMMENT ON COLUMN purchase_items.moneda IS 'Moneda para este ítem: DOP (Pesos Dominicanos) o USD (Dólares Estadounidenses)';

-- 4. Rollback (si es necesario)
/*
ALTER TABLE purchase_items DROP COLUMN IF EXISTS moneda;
DROP INDEX IF EXISTS idx_purchase_items_moneda;
*/
