-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: Agregar tipo de medición a maintenance_logs
-- Permite registrar mantenimientos en KM o HORAS según el equipo
-- Fecha: 2026-02-12
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Agregar campo tipo_medicion a maintenance_logs
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE maintenance_logs
ADD COLUMN IF NOT EXISTS tipo_medicion VARCHAR(20) DEFAULT 'KILOMETRAJE' CHECK (tipo_medicion IN ('KILOMETRAJE', 'HOROMETRO'));

COMMENT ON COLUMN maintenance_logs.tipo_medicion IS 'Tipo de medición del mantenimiento: KILOMETRAJE para vehículos, HOROMETRO para equipos';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Actualizar vista de estado de mantenimiento
-- ─────────────────────────────────────────────────────────────────────────────

DROP VIEW IF EXISTS asset_maintenance_status;

CREATE OR REPLACE VIEW asset_maintenance_status AS
SELECT 
  a.id AS asset_id,
  a.ficha,
  a.kilometraje_actual,
  a.horometro_actual,
  a.tipo_medicion,
  
  -- Último mantenimiento
  (SELECT fecha 
   FROM maintenance_logs 
   WHERE ficha = a.ficha 
   ORDER BY fecha DESC, created_at DESC 
   LIMIT 1) AS ultimo_mto_fecha,
   
  (SELECT km_recorrido 
   FROM maintenance_logs 
   WHERE ficha = a.ficha 
   AND tipo_medicion = 'KILOMETRAJE'
   ORDER BY fecha DESC, created_at DESC 
   LIMIT 1) AS ultimo_mto_km,
   
  (SELECT km_recorrido 
   FROM maintenance_logs 
   WHERE ficha = a.ficha 
   AND tipo_medicion = 'HOROMETRO'
   ORDER BY fecha DESC, created_at DESC 
   LIMIT 1) AS ultimo_mto_horas,
   
  (SELECT tipo 
   FROM maintenance_logs 
   WHERE ficha = a.ficha 
   ORDER BY fecha DESC, created_at DESC 
   LIMIT 1) AS ultimo_mto_tipo,
   
  (SELECT tipo_medicion 
   FROM maintenance_logs 
   WHERE ficha = a.ficha 
   ORDER BY fecha DESC, created_at DESC 
   LIMIT 1) AS ultimo_mto_tipo_medicion,
  
  -- Próximo mantenimiento proyectado (km)
  (SELECT proyeccion_proxima_mto 
   FROM maintenance_logs 
   WHERE ficha = a.ficha 
   AND proyeccion_proxima_mto IS NOT NULL
   AND tipo_medicion = 'KILOMETRAJE'
   ORDER BY fecha DESC, created_at DESC 
   LIMIT 1) AS proximo_mto_fecha_km,
   
  (SELECT proyeccion_proxima_km 
   FROM maintenance_logs 
   WHERE ficha = a.ficha 
   AND proyeccion_proxima_km IS NOT NULL
   AND tipo_medicion = 'KILOMETRAJE'
   ORDER BY fecha DESC, created_at DESC 
   LIMIT 1) AS proximo_mto_km,
   
  -- Próximo mantenimiento proyectado (horas)
  (SELECT proyeccion_proxima_mto 
   FROM maintenance_logs 
   WHERE ficha = a.ficha 
   AND proyeccion_proxima_mto IS NOT NULL
   AND tipo_medicion = 'HOROMETRO'
   ORDER BY fecha DESC, created_at DESC 
   LIMIT 1) AS proximo_mto_fecha_horas,
   
  (SELECT proyeccion_proxima_km 
   FROM maintenance_logs 
   WHERE ficha = a.ficha 
   AND proyeccion_proxima_km IS NOT NULL
   AND tipo_medicion = 'HOROMETRO'
   ORDER BY fecha DESC, created_at DESC 
   LIMIT 1) AS proximo_mto_horas,
  
  -- Cálculo de estado basado en tipo de medición del activo
  CASE 
    WHEN a.tipo_medicion = 'KILOMETRAJE' THEN
      CASE 
        WHEN a.kilometraje_actual >= (
          SELECT proyeccion_proxima_km 
          FROM maintenance_logs 
          WHERE ficha = a.ficha 
          AND proyeccion_proxima_km IS NOT NULL
          AND tipo_medicion = 'KILOMETRAJE'
          ORDER BY fecha DESC 
          LIMIT 1
        ) THEN 'VENCIDO'
        WHEN a.kilometraje_actual >= (
          SELECT proyeccion_proxima_km 
          FROM maintenance_logs 
          WHERE ficha = a.ficha 
          AND proyeccion_proxima_km IS NOT NULL
          AND tipo_medicion = 'KILOMETRAJE'
          ORDER BY fecha DESC 
          LIMIT 1
        ) * 0.9 THEN 'PROXIMO'
        ELSE 'OK'
      END
    WHEN a.tipo_medicion = 'HOROMETRO' THEN
      CASE 
        WHEN a.horometro_actual >= (
          SELECT proyeccion_proxima_km 
          FROM maintenance_logs 
          WHERE ficha = a.ficha 
          AND proyeccion_proxima_km IS NOT NULL
          AND tipo_medicion = 'HOROMETRO'
          ORDER BY fecha DESC 
          LIMIT 1
        ) THEN 'VENCIDO'
        WHEN a.horometro_actual >= (
          SELECT proyeccion_proxima_km 
          FROM maintenance_logs 
          WHERE ficha = a.ficha 
          AND proyeccion_proxima_km IS NOT NULL
          AND tipo_medicion = 'HOROMETRO'
          ORDER BY fecha DESC 
          LIMIT 1
        ) * 0.9 THEN 'PROXIMO'
        ELSE 'OK'
      END
    ELSE 'OK'
  END AS estado_mantenimiento,
  
  -- Días desde último mantenimiento
  CASE 
    WHEN (SELECT fecha FROM maintenance_logs WHERE ficha = a.ficha ORDER BY fecha DESC LIMIT 1) IS NOT NULL
    THEN CURRENT_DATE - (SELECT fecha FROM maintenance_logs WHERE ficha = a.ficha ORDER BY fecha DESC LIMIT 1)
    ELSE NULL
  END AS dias_desde_ultimo_mto,
  
  -- Días hasta próximo mantenimiento (usa el próximo más cercano)
  CASE 
    WHEN a.tipo_medicion = 'KILOMETRAJE' THEN
      CASE 
        WHEN (SELECT proyeccion_proxima_mto FROM maintenance_logs WHERE ficha = a.ficha AND proyeccion_proxima_mto IS NOT NULL AND tipo_medicion = 'KILOMETRAJE' ORDER BY fecha DESC LIMIT 1) IS NOT NULL
        THEN (SELECT proyeccion_proxima_mto FROM maintenance_logs WHERE ficha = a.ficha AND proyeccion_proxima_mto IS NOT NULL AND tipo_medicion = 'KILOMETRAJE' ORDER BY fecha DESC LIMIT 1) - CURRENT_DATE
        ELSE NULL
      END
    WHEN a.tipo_medicion = 'HOROMETRO' THEN
      CASE 
        WHEN (SELECT proyeccion_proxima_mto FROM maintenance_logs WHERE ficha = a.ficha AND proyeccion_proxima_mto IS NOT NULL AND tipo_medicion = 'HOROMETRO' ORDER BY fecha DESC LIMIT 1) IS NOT NULL
        THEN (SELECT proyeccion_proxima_mto FROM maintenance_logs WHERE ficha = a.ficha AND proyeccion_proxima_mto IS NOT NULL AND tipo_medicion = 'HOROMETRO' ORDER BY fecha DESC LIMIT 1) - CURRENT_DATE
        ELSE NULL
      END
    ELSE NULL
  END AS dias_hasta_proximo_mto
  
FROM assets a
WHERE a.visible = TRUE;

COMMENT ON VIEW asset_maintenance_status IS 'Vista consolidada del estado de mantenimiento por activo (soporta KM y HORAS)';

-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ MIGRACIÓN COMPLETADA
-- 
-- CAMBIOS:
-- 1. Campo tipo_medicion agregado a maintenance_logs
-- 2. Vista asset_maintenance_status actualizada para soportar KM y HORAS
-- 3. Cálculos de estado separados según tipo de medición
-- ═══════════════════════════════════════════════════════════════════════════════
