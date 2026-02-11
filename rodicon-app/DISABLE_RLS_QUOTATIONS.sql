-- ═══════════════════════════════════════════════════════════════════════════════
-- FIX URGENTE: Deshabilitar RLS en tablas de cotizaciones
-- Tu sistema usa app_users + PIN, NO Supabase Auth → auth.uid() = NULL
-- Ejecutar en: Supabase → SQL Editor → New Query → Pegar → Run
-- ═══════════════════════════════════════════════════════════════════════════════

-- Deshabilitar RLS
ALTER TABLE purchase_quotations DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_quotation_items DISABLE ROW LEVEL SECURITY;

-- Refrescar schema
NOTIFY pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ LISTO! Recarga tu app (Ctrl+Shift+R) y prueba guardar cotizaciones
-- ═══════════════════════════════════════════════════════════════════════════════
