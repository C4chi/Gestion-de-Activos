-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Agregar campos plazo_horas y numero_reporte a safety_reports
-- ═══════════════════════════════════════════════════════════════════════════════
-- Ejecutar en Supabase SQL Editor si la tabla ya existe

-- Eliminar columna antigua basada en auth.users (uuid) si existe
-- Usar CASCADE para eliminar dependencias (triggers, constraints, etc.)
ALTER TABLE safety_reports DROP COLUMN IF EXISTS usuario_id CASCADE;

-- Hacer opcional la ficha (permitir incidentes sin activo)
ALTER TABLE safety_reports ALTER COLUMN ficha DROP NOT NULL;

-- Agregar la columna updated_at si no existe (requerida por el trigger)
ALTER TABLE safety_reports 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Agregar la columna plazo_horas si no existe
ALTER TABLE safety_reports 
ADD COLUMN IF NOT EXISTS plazo_horas INTEGER DEFAULT 24;

-- Agregar la columna numero_reporte si no existe
ALTER TABLE safety_reports 
ADD COLUMN IF NOT EXISTS numero_reporte VARCHAR(20) UNIQUE;

-- Agregar las columnas lugar y turno si no existen
ALTER TABLE safety_reports 
ADD COLUMN IF NOT EXISTS lugar VARCHAR(255);

ALTER TABLE safety_reports 
ADD COLUMN IF NOT EXISTS turno VARCHAR(100);

-- Agregar comentarios a los campos
COMMENT ON COLUMN safety_reports.updated_at IS 'Fecha y hora de última actualización';
COMMENT ON COLUMN safety_reports.plazo_horas IS 'Plazo de resolución en horas: 24, 48 o 72 horas';
COMMENT ON COLUMN safety_reports.numero_reporte IS 'Número de reporte formato HSE-001, HSE-002, etc.';

-- Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_safety_reports_plazo ON safety_reports(plazo_horas);
CREATE INDEX IF NOT EXISTS idx_safety_reports_numero ON safety_reports(numero_reporte);

-- Función para generar número de reporte HSE secuencial
CREATE OR REPLACE FUNCTION generate_hse_number()
RETURNS VARCHAR AS $$
DECLARE
  v_number VARCHAR;
  v_count INTEGER;
BEGIN
  -- Obtener el conteo actual de reportes HSE
  SELECT COALESCE(COUNT(*), 0) + 1 INTO v_count FROM safety_reports;
  
  -- Generar número con formato HSE-001, HSE-002, etc.
  v_number := 'HSE-' || LPAD(v_count::TEXT, 3, '0');
  
  -- Verificar si ya existe (por si acaso hay eliminaciones)
  WHILE EXISTS (SELECT 1 FROM safety_reports WHERE numero_reporte = v_number) LOOP
    v_count := v_count + 1;
    v_number := 'HSE-' || LPAD(v_count::TEXT, 3, '0');
  END LOOP;
  
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- Actualizar reportes existentes con números HSE (opcional)
-- Ejecutar solo si quieres asignar números a reportes existentes
DO $do$
DECLARE
  r RECORD;
  counter INTEGER := 1;
BEGIN
  FOR r IN SELECT id FROM safety_reports WHERE numero_reporte IS NULL ORDER BY fecha_reporte
  LOOP
    UPDATE safety_reports 
    SET numero_reporte = 'HSE-' || LPAD(counter::TEXT, 3, '0')
    WHERE id = r.id;
    counter := counter + 1;
  END LOOP;
END;
$do$;
