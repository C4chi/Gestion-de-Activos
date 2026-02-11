-- ═══════════════════════════════════════════════════════════════════════════════
-- FIX RÁPIDO: Crear tablas de cotizaciones faltantes
-- Ejecutar en: Supabase → SQL Editor → New Query → Pegar → Run
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Tabla de cotizaciones
CREATE TABLE IF NOT EXISTS purchase_quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  
  proveedor VARCHAR(200) NOT NULL,
  contacto_proveedor VARCHAR(200),
  telefono_proveedor VARCHAR(50),
  email_proveedor VARCHAR(200),
  
  numero_cotizacion VARCHAR(100),
  fecha_cotizacion DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_estimada_entrega DATE,
  dias_entrega INTEGER,
  
  archivo_cotizacion_url TEXT,
  notas TEXT,
  condiciones_pago TEXT,
  
  es_aprobada BOOLEAN DEFAULT FALSE,
  motivo_rechazo TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by BIGINT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quotations_purchase_order ON purchase_quotations(purchase_order_id);

-- 2. Tabla de items por cotización (CON updated_at)
CREATE TABLE IF NOT EXISTS purchase_quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES purchase_quotations(id) ON DELETE CASCADE,
  purchase_item_id UUID NOT NULL REFERENCES purchase_items(id) ON DELETE CASCADE,
  
  precio_unitario DECIMAL(12,2) NOT NULL DEFAULT 0,
  moneda VARCHAR(10) DEFAULT 'DOP' CHECK (moneda IN ('DOP', 'USD', 'EUR')),
  
  disponible BOOLEAN DEFAULT TRUE,
  tiempo_entrega_dias INTEGER,
  stock_disponible INTEGER,
  
  notas TEXT,
  alternativa_propuesta TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation ON purchase_quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_purchase_item ON purchase_quotation_items(purchase_item_id);

-- 3. HABILITAR RLS (Row Level Security)
ALTER TABLE purchase_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_quotation_items ENABLE ROW LEVEL SECURITY;

-- 4. ELIMINAR TODAS LAS POLÍTICAS EXISTENTES (limpiar antes de recrear)
DO $$ 
DECLARE 
  r RECORD;
BEGIN
  -- Eliminar políticas de purchase_quotations
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'purchase_quotations') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON purchase_quotations';
  END LOOP;
  
  -- Eliminar políticas de purchase_quotation_items
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'purchase_quotation_items') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON purchase_quotation_items';
  END LOOP;
END $$;

-- 5. CREAR POLÍTICAS SIMPLES (Acceso total para usuarios autenticados)
CREATE POLICY "allow_all_authenticated_quotations" ON purchase_quotations
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "allow_all_authenticated_quotation_items" ON purchase_quotation_items
  FOR ALL USING (auth.uid() IS NOT NULL);

-- 6. Agregar columnas a purchase_orders si no existen
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_orders' AND column_name='cotizacion_aprobada_id') THEN
    ALTER TABLE purchase_orders ADD COLUMN cotizacion_aprobada_id UUID;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_orders' AND column_name='aprobado_por') THEN
    ALTER TABLE purchase_orders ADD COLUMN aprobado_por BIGINT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_orders' AND column_name='fecha_aprobacion') THEN
    ALTER TABLE purchase_orders ADD COLUMN fecha_aprobacion TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- 7. REFRESCAR SCHEMA CACHE
NOTIFY pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ EJECUTADO! Ahora:
-- 1. Cierra este SQL Editor
-- 2. Recarga tu app: Ctrl+Shift+R
-- 3. Intenta guardar cotizaciones de nuevo
-- ═══════════════════════════════════════════════════════════════════════════════
