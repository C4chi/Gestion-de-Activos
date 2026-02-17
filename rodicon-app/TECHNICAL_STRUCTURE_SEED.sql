-- ============================================================================
-- TECHNICAL_STRUCTURE_SEED.sql
-- Requiere: MIGRATION_TECHNICAL_STRUCTURE_IMPLEMENTATION.sql ejecutada previamente
-- Objetivo: alias iniciales + recalcular canonical/keys + asignación/clonado masivo
-- Nota: el seed de templates genéricos y específicos está incluido en la migración.
-- ============================================================================

-- 1) Alias iniciales de normalización (editable por empresa)
WITH seed_alias(company_id, brand_raw, model_raw, brand_canonical, model_canonical, active) AS (
  VALUES
    (current_company_context_id(), 'ISUZU', 'DMAX', 'ISUZU', 'DMAX', TRUE),
    (current_company_context_id(), 'ISUZU', 'D-MAX', 'ISUZU', 'D-MAX', TRUE),
    (current_company_context_id(), 'CATERPILLAR', '330 GC', 'CATERPILLAR', '330 GC', TRUE),
    (current_company_context_id(), 'CATERPILLAR', '330-7', 'CATERPILLAR', '330-7', TRUE),
    (current_company_context_id(), 'CATERPILLAR', '330NG', 'CATERPILLAR', '330NG', TRUE),
    (current_company_context_id(), 'CATERPILLAR', '336', 'CATERPILLAR', '336', TRUE),
    (current_company_context_id(), 'CATERPILLAR', '336GC', 'CATERPILLAR', '336GC', TRUE),
    (current_company_context_id(), 'CATERPILLAR', '336 UVG', 'CATERPILLAR', '336 UVG', TRUE),
    (current_company_context_id(), 'VOLVO', 'FMX 480 8X4R', 'VOLVO', 'FMX 480 8X4R', TRUE),
    (current_company_context_id(), 'VOLVO', 'FMX480 HP 6X4T', 'VOLVO', 'FMX480 HP 6X4T', TRUE)
)
UPDATE asset_model_alias a
SET
  brand_canonical = s.brand_canonical,
  model_canonical = s.model_canonical,
  active = s.active,
  updated_at = NOW()
FROM seed_alias s
WHERE COALESCE(a.company_id, '00000000-0000-0000-0000-000000000000'::uuid)
      = COALESCE(s.company_id, '00000000-0000-0000-0000-000000000000'::uuid)
  AND normalize_text(a.brand_raw) = normalize_text(s.brand_raw)
  AND normalize_text(a.model_raw) = normalize_text(s.model_raw);

WITH seed_alias(company_id, brand_raw, model_raw, brand_canonical, model_canonical, active) AS (
  VALUES
    (current_company_context_id(), 'ISUZU', 'DMAX', 'ISUZU', 'DMAX', TRUE),
    (current_company_context_id(), 'ISUZU', 'D-MAX', 'ISUZU', 'D-MAX', TRUE),
    (current_company_context_id(), 'CATERPILLAR', '330 GC', 'CATERPILLAR', '330 GC', TRUE),
    (current_company_context_id(), 'CATERPILLAR', '330-7', 'CATERPILLAR', '330-7', TRUE),
    (current_company_context_id(), 'CATERPILLAR', '330NG', 'CATERPILLAR', '330NG', TRUE),
    (current_company_context_id(), 'CATERPILLAR', '336', 'CATERPILLAR', '336', TRUE),
    (current_company_context_id(), 'CATERPILLAR', '336GC', 'CATERPILLAR', '336GC', TRUE),
    (current_company_context_id(), 'CATERPILLAR', '336 UVG', 'CATERPILLAR', '336 UVG', TRUE),
    (current_company_context_id(), 'VOLVO', 'FMX 480 8X4R', 'VOLVO', 'FMX 480 8X4R', TRUE),
    (current_company_context_id(), 'VOLVO', 'FMX480 HP 6X4T', 'VOLVO', 'FMX480 HP 6X4T', TRUE)
)
INSERT INTO asset_model_alias(company_id, brand_raw, model_raw, brand_canonical, model_canonical, active)
SELECT s.company_id, s.brand_raw, s.model_raw, s.brand_canonical, s.model_canonical, s.active
FROM seed_alias s
WHERE NOT EXISTS (
  SELECT 1
  FROM asset_model_alias a
  WHERE COALESCE(a.company_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(s.company_id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND normalize_text(a.brand_raw) = normalize_text(s.brand_raw)
    AND normalize_text(a.model_raw) = normalize_text(s.model_raw)
);

-- 2) Recalcular canonical/keys en assets usando alias + normalización
UPDATE assets a
SET
  brand_raw = COALESCE(a.brand_raw, a.marca),
  model_raw = COALESCE(a.model_raw, a.modelo),
  type = COALESCE(a.type, a.tipo)
WHERE a.brand_raw IS NULL
   OR a.model_raw IS NULL
   OR a.type IS NULL;

UPDATE assets a
SET
  brand_canonical = x.brand_canonical,
  model_canonical = x.model_canonical,
  brand_key = x.brand_key,
  model_key = x.model_key,
  updated_at = NOW()
FROM (
  SELECT
    a2.id,
    c.brand_canonical,
    c.model_canonical,
    c.brand_key,
    c.model_key
  FROM assets a2
  CROSS JOIN LATERAL canonicalize_brand_model(
    a2.company_id,
    COALESCE(a2.brand_raw, a2.marca),
    COALESCE(a2.model_raw, a2.modelo)
  ) c
) x
WHERE a.id = x.id;

-- 3) Asignar y clonar templates para toda la flota visible
SELECT * FROM assign_and_clone_all_assets();

NOTIFY pgrst, 'reload schema';
