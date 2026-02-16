-- ==============================================
-- MIGRATION: Suscripciones Push Web
-- Fecha: 2026-02-16
-- Descripción: Tabla para guardar suscripciones PushManager por usuario
-- ==============================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  endpoint TEXT,
  user_agent TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(active);

ALTER TABLE push_subscriptions DISABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION update_push_subscriptions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS push_subscriptions_update_timestamp ON push_subscriptions;
CREATE TRIGGER push_subscriptions_update_timestamp
BEFORE UPDATE ON push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_push_subscriptions_timestamp();

COMMENT ON TABLE push_subscriptions IS 'Suscripciones de navegadores para Web Push por usuario';
COMMENT ON COLUMN push_subscriptions.subscription IS 'Objeto JSON de PushSubscription del navegador';

NOTIFY pgrst, 'reload schema';
