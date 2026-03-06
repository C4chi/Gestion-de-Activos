-- DIAGNOSTIC_HSE_FOLLOWUP_COVERAGE.sql
-- Objetivo: detectar inspecciones viejas que no muestran follow-up (preguntas/nota/archivos)
-- Ejecutar en Supabase SQL Editor

BEGIN;

-- =========================================================
-- 1) RESUMEN GLOBAL
-- =========================================================
WITH flags AS (
  SELECT
    i.id,
    i.inspection_number,
    i.title,
    i.status,
    i.created_at,
    i.completed_at,
    EXISTS (
      SELECT 1
      FROM jsonb_each(COALESCE(i.answers::jsonb, '{}'::jsonb)) a
      WHERE a.key LIKE '%_question_%'
         OR a.key LIKE '%_followup_note'
         OR a.key LIKE '%_followup_files'
    ) AS has_followup_answers,
    EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(i.template_snapshot::jsonb->'sections', '[]'::jsonb)) sec,
           jsonb_array_elements(COALESCE(sec->'items', '[]'::jsonb)) itm,
           jsonb_array_elements(COALESCE(itm->'conditional'->'rules', '[]'::jsonb)) rule
      WHERE COALESCE(rule->'actions', '[]'::jsonb) ?| ARRAY['show_questions','require_note','require_files']
    ) AS template_has_followup_rules
  FROM hse_inspections i
)
SELECT
  COUNT(*) AS total_inspections,
  COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed_inspections,
  COUNT(*) FILTER (WHERE template_has_followup_rules) AS with_followup_rules_in_snapshot,
  COUNT(*) FILTER (WHERE has_followup_answers) AS with_followup_answers,
  COUNT(*) FILTER (WHERE template_has_followup_rules AND NOT has_followup_answers) AS missing_followup_answers
FROM flags;

-- =========================================================
-- 2) INSPECCIONES PROBLEMÁTICAS
-- (tenían reglas follow-up en snapshot, pero no tienen respuestas follow-up)
-- =========================================================
WITH flags AS (
  SELECT
    i.id,
    i.inspection_number,
    i.title,
    i.status,
    i.created_at,
    i.completed_at,
    i.conducted_by,
    (
      SELECT COUNT(*)
      FROM jsonb_each(COALESCE(i.answers::jsonb, '{}'::jsonb))
    ) AS answer_keys_count,
    EXISTS (
      SELECT 1
      FROM jsonb_each(COALESCE(i.answers::jsonb, '{}'::jsonb)) a
      WHERE a.key LIKE '%_question_%'
         OR a.key LIKE '%_followup_note'
         OR a.key LIKE '%_followup_files'
    ) AS has_followup_answers,
    EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(i.template_snapshot::jsonb->'sections', '[]'::jsonb)) sec,
           jsonb_array_elements(COALESCE(sec->'items', '[]'::jsonb)) itm,
           jsonb_array_elements(COALESCE(itm->'conditional'->'rules', '[]'::jsonb)) rule
      WHERE COALESCE(rule->'actions', '[]'::jsonb) ?| ARRAY['show_questions','require_note','require_files']
    ) AS template_has_followup_rules
  FROM hse_inspections i
)
SELECT
  id,
  inspection_number,
  title,
  status,
  conducted_by,
  answer_keys_count,
  created_at,
  completed_at
FROM flags
WHERE template_has_followup_rules
  AND NOT has_followup_answers
ORDER BY created_at DESC;

-- =========================================================
-- 3) DETALLE DE UNA INSPECCIÓN (AJUSTAR NÚMERO)
-- =========================================================
SELECT
  i.id,
  i.inspection_number,
  i.title,
  i.status,
  i.conducted_by,
  i.created_at,
  i.completed_at,
  a.key,
  a.value->>'label' AS label,
  a.value->>'value' AS value
FROM hse_inspections i
LEFT JOIN LATERAL jsonb_each(COALESCE(i.answers::jsonb, '{}'::jsonb)) a ON TRUE
WHERE i.inspection_number = 'HSE-INS-0008'
ORDER BY a.key;

COMMIT;
