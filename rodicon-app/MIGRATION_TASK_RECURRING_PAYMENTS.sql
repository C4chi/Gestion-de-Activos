-- ==============================================
-- MIGRATION: Tareas recurrentes de pagos
-- Fecha: Marzo 13, 2026
-- Descripción:
--   1) Soporte para tareas de pago (tarjeta/préstamo)
--   2) Reglas de recurrencia (semanal/quincenal/mensual)
--   3) Configuración de recordatorios por días antes del vencimiento
-- ==============================================

BEGIN;

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS task_kind VARCHAR(30) NOT NULL DEFAULT 'GENERAL'
  CHECK (task_kind IN ('GENERAL', 'PAGO_TARJETA', 'PAGO_PRESTAMO'));

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS recurrence_type VARCHAR(20) NOT NULL DEFAULT 'NONE'
  CHECK (recurrence_type IN ('NONE', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'));

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS reminder_days_before INT[];

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(12,2);

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS source_task_id BIGINT REFERENCES tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_task_kind ON tasks(task_kind);
CREATE INDEX IF NOT EXISTS idx_tasks_recurrence_type ON tasks(recurrence_type);
CREATE INDEX IF NOT EXISTS idx_tasks_source_task_id ON tasks(source_task_id);

COMMIT;
