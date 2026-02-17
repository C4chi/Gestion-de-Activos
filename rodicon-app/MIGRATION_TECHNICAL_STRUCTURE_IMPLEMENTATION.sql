-- ============================================================================
-- MIGRATION: Estructura Técnica CMMS/EAM (estilo SAP PM)
-- Fecha: 2026-02-17
-- Alcance:
--   1) Modelo de datos técnico (templates + árboles por asset)
--   2) RLS por company_id + rol
--   3) RPC de clonación y auto-asignación por Marca+Modelo (fallback por Tipo)
--   4) Seed de templates genéricos + específicos (inventario provisto)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 0) Helpers de seguridad y normalización
-- ============================================================================

CREATE OR REPLACE FUNCTION current_company_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_claim TEXT;
BEGIN
  v_claim := COALESCE(auth.jwt() ->> 'company_id', '');
  IF v_claim = '' THEN
    RETURN NULL;
  END IF;
  BEGIN
    RETURN v_claim::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION current_app_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT upper(coalesce(auth.jwt() ->> 'role', ''));
$$;

CREATE OR REPLACE FUNCTION is_admin_role()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT current_app_role() IN ('ADMIN', 'CMMS_PLANNER', 'SUPERVISOR');
$$;

CREATE OR REPLACE FUNCTION is_read_role()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT current_app_role() IN ('ADMIN', 'CMMS_PLANNER', 'SUPERVISOR', 'TECNICO', 'TECNICO_MANTENIMIENTO', 'TALLER');
$$;

CREATE OR REPLACE FUNCTION normalize_text(input_text TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT upper(trim(regexp_replace(coalesce(input_text, ''), '\s+', ' ', 'g')));
$$;

CREATE OR REPLACE FUNCTION normalize_model(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v TEXT;
BEGIN
  v := normalize_text(input_text);
  v := regexp_replace(v, '(\d)\s+([A-Z])', '\1\2', 'g');
  v := regexp_replace(v, '([A-Z])\s+(\d)', '\1\2', 'g');
  v := regexp_replace(v, '\s+', ' ', 'g');
  RETURN trim(v);
END;
$$;

-- Compatibilidad con versión previa del script
CREATE OR REPLACE FUNCTION norm_strict(input_text TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT normalize_text(input_text);
$$;

-- Normalización para tipo (sí permite simplificar caracteres)
CREATE OR REPLACE FUNCTION norm_type(input_text TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT regexp_replace(upper(coalesce(input_text, '')), '[^A-Z0-9]+', '', 'g');
$$;

CREATE OR REPLACE FUNCTION canonical_asset_type_key(p_tipo TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  t TEXT := norm_type(p_tipo);
BEGIN
  IF t LIKE '%EXCAVADORA%' THEN RETURN 'EXCAVADORA'; END IF;
  IF t LIKE '%CAMION%VOLTEO%' OR t LIKE '%VOLQUETA%' THEN RETURN 'CAMIONVOLTEO'; END IF;
  IF t LIKE '%CAMION%ARTICULADO%' THEN RETURN 'CAMIONARTICULADO'; END IF;
  IF t LIKE '%TRACTOR%ORUGA%' THEN RETURN 'TRACTORORUGA'; END IF;
  IF t LIKE '%CARGADOR%FRONTAL%' THEN RETURN 'CARGADORFRONTAL'; END IF;
  IF t LIKE '%MOTONIVELADORA%' THEN RETURN 'MOTONIVELADORA'; END IF;
  IF t LIKE '%RODILLO%' THEN RETURN 'RODILLO'; END IF;
  IF t LIKE '%RETROPALA%' OR t LIKE '%RETRO%PALA%' THEN RETURN 'RETROPALA'; END IF;
  IF t LIKE '%CAMION%CISTERNA%' THEN RETURN 'CAMIONCISTERNA'; END IF;
  IF t LIKE '%CAMION%SERVICIO%' THEN RETURN 'CAMIONSERVICIO'; END IF;
  IF t LIKE '%CAMION%COMBUSTIBLE%' THEN RETURN 'CAMIONCOMBUSTIBLE'; END IF;
  IF t LIKE '%CABEZOTE%' OR t LIKE '%CABEZA%TRACTORA%' THEN RETURN 'CABEZOTRACTORA'; END IF;
  IF t LIKE '%CAMIONETA%' THEN RETURN 'CAMIONETA'; END IF;
  IF t LIKE '%AUTOBUS%' OR t LIKE '%MINIBUS%' OR t LIKE '%FURGONETA%' THEN RETURN 'AUTOBUSMINIBUS'; END IF;
  IF t LIKE '%GENERADOR%' OR t LIKE '%MOTOSOLDADORA%' THEN RETURN 'GENERADOR'; END IF;
  IF t LIKE '%COMPRESOR%' THEN RETURN 'COMPRESOR'; END IF;
  IF t LIKE '%LUMINARIA%' OR t LIKE '%TORRE%LUZ%' THEN RETURN 'LUMINARIA'; END IF;
  IF t LIKE '%ELEVADOR%' THEN RETURN 'ELEVADOR'; END IF;
  IF t LIKE '%PLANTA%' OR t LIKE '%CRUSHER%' OR t LIKE '%CRIBADORA%' OR t LIKE '%CONVEYOR%' THEN RETURN 'PLANTACRUSHER'; END IF;
  IF t LIKE '%MONTACARGA%' THEN RETURN 'MONTACARGA'; END IF;
  IF t LIKE '%MARTILLO%' THEN RETURN 'MARTILLOHIDRAULICO'; END IF;
  IF t LIKE '%HIDROJET%' THEN RETURN 'HIDROJET'; END IF;
  IF t LIKE '%REMOLQUE%' OR t LIKE '%TRAILER%' THEN RETURN 'REMOLQUETRAILER'; END IF;
  IF t LIKE '%MINICARGADOR%' THEN RETURN 'MINICARGADOR'; END IF;

  RETURN t;
END;
$$;

CREATE TABLE IF NOT EXISTS asset_model_alias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  brand_raw TEXT NOT NULL,
  model_raw TEXT NOT NULL,
  brand_canonical TEXT NOT NULL,
  model_canonical TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_asset_model_alias_unique
  ON asset_model_alias(
    COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid),
    normalize_text(brand_raw),
    normalize_text(model_raw)
  );

CREATE INDEX IF NOT EXISTS idx_asset_model_alias_company_active
  ON asset_model_alias(company_id, active);

CREATE OR REPLACE FUNCTION canonicalize_brand_model(
  p_company_id UUID,
  p_brand_raw TEXT,
  p_model_raw TEXT
)
RETURNS TABLE(
  brand_canonical TEXT,
  model_canonical TEXT,
  brand_key TEXT,
  model_key TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_alias RECORD;
BEGIN
  SELECT a.brand_canonical, a.model_canonical
  INTO v_alias
  FROM asset_model_alias a
  WHERE a.active = TRUE
    AND COALESCE(a.company_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(p_company_id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND normalize_text(a.brand_raw) = normalize_text(p_brand_raw)
    AND normalize_text(a.model_raw) = normalize_text(p_model_raw)
  LIMIT 1;

  IF FOUND THEN
    brand_canonical := normalize_text(v_alias.brand_canonical);
    model_canonical := normalize_text(v_alias.model_canonical);
  ELSE
    brand_canonical := normalize_text(p_brand_raw);
    model_canonical := normalize_text(p_model_raw);
  END IF;

  brand_key := normalize_text(brand_canonical);
  model_key := normalize_model(model_canonical);
  RETURN NEXT;
END;
$$;

-- ============================================================================
-- 1) Tablas base (si no existen) + extensiones sobre existentes
-- ============================================================================

CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  type TEXT,
  tipo TEXT,
  brand_raw TEXT,
  model_raw TEXT,
  brand_canonical TEXT,
  model_canonical TEXT,
  brand_key TEXT,
  model_key TEXT,
  marca TEXT,
  modelo TEXT,
  visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE assets ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS tipo TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS brand_raw TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS model_raw TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS brand_canonical TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS model_canonical TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS brand_key TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS model_key TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS marca TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS modelo TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS visible BOOLEAN DEFAULT TRUE;

UPDATE assets
SET
  brand_raw = COALESCE(brand_raw, marca),
  model_raw = COALESCE(model_raw, modelo),
  type = COALESCE(type, tipo)
WHERE brand_raw IS NULL
   OR model_raw IS NULL
   OR type IS NULL;

CREATE OR REPLACE FUNCTION trg_assets_fill_canonical()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v RECORD;
BEGIN
  NEW.brand_raw := COALESCE(NEW.brand_raw, NEW.marca, '');
  NEW.model_raw := COALESCE(NEW.model_raw, NEW.modelo, '');
  NEW.type := COALESCE(NEW.type, NEW.tipo);

  SELECT * INTO v
  FROM canonicalize_brand_model(NEW.company_id, NEW.brand_raw, NEW.model_raw)
  LIMIT 1;

  NEW.brand_canonical := v.brand_canonical;
  NEW.model_canonical := v.model_canonical;
  NEW.brand_key := v.brand_key;
  NEW.model_key := v.model_key;

  NEW.marca := COALESCE(NEW.marca, NEW.brand_raw);
  NEW.modelo := COALESCE(NEW.modelo, NEW.model_raw);
  NEW.tipo := COALESCE(NEW.tipo, NEW.type);

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assets_fill_canonical_biu ON assets;
CREATE TRIGGER trg_assets_fill_canonical_biu
BEFORE INSERT OR UPDATE ON assets
FOR EACH ROW
EXECUTE FUNCTION trg_assets_fill_canonical();

UPDATE assets a
SET
  brand_canonical = x.brand_canonical,
  model_canonical = x.model_canonical,
  brand_key = x.brand_key,
  model_key = x.model_key
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
WHERE a.id = x.id
  AND (
    a.brand_canonical IS NULL
   OR a.model_canonical IS NULL
   OR a.brand_key IS NULL
   OR a.model_key IS NULL
  );

CREATE INDEX IF NOT EXISTS idx_assets_company_type ON assets(company_id, type);
CREATE INDEX IF NOT EXISTS idx_assets_brand_model_key ON assets(company_id, brand_key, model_key);

CREATE TABLE IF NOT EXISTS work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS asset_id UUID;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS node_id UUID;

ALTER TABLE work_orders
  DROP CONSTRAINT IF EXISTS work_orders_asset_id_fkey;
ALTER TABLE work_orders
  ADD CONSTRAINT work_orders_asset_id_fkey
  FOREIGN KEY (asset_id) REFERENCES assets(id);

-- ============================================================================
-- 2) Tipos de nodo y árboles técnicos
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'node_type_enum') THEN
    CREATE TYPE node_type_enum AS ENUM ('system', 'subsystem', 'assembly', 'component', 'part');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION node_type_from_logical(p_logical TEXT)
RETURNS node_type_enum
LANGUAGE SQL
STABLE
AS $$
  SELECT (
    CASE lower(coalesce(p_logical, ''))
      WHEN 'system' THEN
        CASE
          WHEN EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'node_type_enum' AND e.enumlabel = 'system') THEN 'system'
          WHEN EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'node_type_enum' AND e.enumlabel = 'SISTEMA') THEN 'SISTEMA'
          ELSE NULL
        END
      WHEN 'subsystem' THEN
        CASE
          WHEN EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'node_type_enum' AND e.enumlabel = 'subsystem') THEN 'subsystem'
          WHEN EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'node_type_enum' AND e.enumlabel = 'SUBSISTEMA') THEN 'SUBSISTEMA'
          ELSE NULL
        END
      WHEN 'assembly' THEN
        CASE
          WHEN EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'node_type_enum' AND e.enumlabel = 'assembly') THEN 'assembly'
          WHEN EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'node_type_enum' AND e.enumlabel = 'CONJUNTO') THEN 'CONJUNTO'
          ELSE NULL
        END
      WHEN 'component' THEN
        CASE
          WHEN EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'node_type_enum' AND e.enumlabel = 'component') THEN 'component'
          WHEN EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'node_type_enum' AND e.enumlabel = 'COMPONENTE') THEN 'COMPONENTE'
          ELSE NULL
        END
      WHEN 'part' THEN
        CASE
          WHEN EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'node_type_enum' AND e.enumlabel = 'part') THEN 'part'
          WHEN EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'node_type_enum' AND e.enumlabel = 'PIEZA') THEN 'PIEZA'
          ELSE NULL
        END
      ELSE NULL
    END
  )::node_type_enum;
$$;

CREATE OR REPLACE FUNCTION node_type_level(p_type node_type_enum)
RETURNS INTEGER
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE upper(p_type::text)
    WHEN 'SYSTEM' THEN 1
    WHEN 'SISTEMA' THEN 1
    WHEN 'SUBSYSTEM' THEN 2
    WHEN 'SUBSISTEMA' THEN 2
    WHEN 'ASSEMBLY' THEN 3
    WHEN 'CONJUNTO' THEN 3
    WHEN 'COMPONENT' THEN 4
    WHEN 'COMPONENTE' THEN 4
    WHEN 'PART' THEN 5
    WHEN 'PIEZA' THEN 5
  END;
$$;

CREATE TABLE IF NOT EXISTS asset_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  code TEXT NOT NULL,
  display_name TEXT,
  name TEXT NOT NULL,
  template_type TEXT,
  template_kind TEXT NOT NULL DEFAULT 'GENERICA' CHECK (template_kind IN ('GENERICA', 'ESPECIFICA')),
  equipment_type TEXT,
  asset_type_key TEXT NOT NULL,
  brand_key TEXT,
  model_key TEXT,
  brand TEXT,
  model TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE asset_templates ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE asset_templates ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE asset_templates ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE asset_templates ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE asset_templates ADD COLUMN IF NOT EXISTS template_type TEXT;
ALTER TABLE asset_templates ADD COLUMN IF NOT EXISTS template_kind TEXT DEFAULT 'GENERICA';
ALTER TABLE asset_templates ADD COLUMN IF NOT EXISTS equipment_type TEXT;
ALTER TABLE asset_templates ADD COLUMN IF NOT EXISTS asset_type_key TEXT;
ALTER TABLE asset_templates ADD COLUMN IF NOT EXISTS brand_key TEXT;
ALTER TABLE asset_templates ADD COLUMN IF NOT EXISTS model_key TEXT;
ALTER TABLE asset_templates ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE asset_templates ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE asset_templates ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE asset_templates ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE asset_templates ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::JSONB;
ALTER TABLE asset_templates ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE asset_templates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE asset_templates
  DROP CONSTRAINT IF EXISTS asset_templates_template_kind_check;
ALTER TABLE asset_templates
  ADD CONSTRAINT asset_templates_template_kind_check
  CHECK (template_kind IN ('GENERICA', 'ESPECIFICA'));

ALTER TABLE asset_templates
  DROP CONSTRAINT IF EXISTS asset_templates_template_type_check;
ALTER TABLE asset_templates
  ADD CONSTRAINT asset_templates_template_type_check
  CHECK (template_type IS NULL OR template_type IN ('generic', 'specific'));

UPDATE asset_templates
SET
  template_type = CASE WHEN template_kind = 'GENERICA' THEN 'generic' ELSE 'specific' END,
  equipment_type = COALESCE(equipment_type, asset_type_key),
  display_name = COALESCE(display_name, name),
  brand_key = COALESCE(brand_key, normalize_text(brand)),
  model_key = COALESCE(model_key, normalize_model(model));

CREATE UNIQUE INDEX IF NOT EXISTS uq_asset_templates_company_code
  ON asset_templates (COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid), code);

CREATE UNIQUE INDEX IF NOT EXISTS uq_asset_templates_specific_identity
  ON asset_templates (
    COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid),
    equipment_type,
    brand_key,
    model_key
  )
  WHERE template_kind = 'ESPECIFICA';

CREATE INDEX IF NOT EXISTS idx_asset_templates_company_kind
  ON asset_templates (company_id, template_kind, is_active);

CREATE INDEX IF NOT EXISTS idx_asset_templates_type
  ON asset_templates (asset_type_key);

CREATE TABLE IF NOT EXISTS asset_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  template_id UUID REFERENCES asset_templates(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES asset_nodes(id) ON DELETE CASCADE,
  node_type node_type_enum NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  description TEXT,
  part_number TEXT,
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(part_number, '')), 'A')
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_asset_nodes_scope_xor CHECK (num_nonnulls(template_id, asset_id) = 1)
);

ALTER TABLE asset_nodes ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE asset_nodes ADD COLUMN IF NOT EXISTS template_id UUID;
ALTER TABLE asset_nodes ADD COLUMN IF NOT EXISTS asset_id UUID;
ALTER TABLE asset_nodes ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE asset_nodes ADD COLUMN IF NOT EXISTS node_type node_type_enum;
ALTER TABLE asset_nodes ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE asset_nodes ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE asset_nodes ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE asset_nodes ADD COLUMN IF NOT EXISTS part_number TEXT;
ALTER TABLE asset_nodes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE asset_nodes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE asset_nodes
  DROP CONSTRAINT IF EXISTS chk_asset_nodes_scope_xor;
ALTER TABLE asset_nodes
  ADD CONSTRAINT chk_asset_nodes_scope_xor
  CHECK (num_nonnulls(template_id, asset_id) = 1);

ALTER TABLE work_orders
  DROP CONSTRAINT IF EXISTS work_orders_node_id_fkey;
ALTER TABLE work_orders
  ADD CONSTRAINT work_orders_node_id_fkey
  FOREIGN KEY (node_id) REFERENCES asset_nodes(id);

CREATE INDEX IF NOT EXISTS idx_asset_nodes_parent ON asset_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_asset_nodes_scope_asset_parent ON asset_nodes(asset_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_asset_nodes_scope_template_parent ON asset_nodes(template_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_asset_nodes_company ON asset_nodes(company_id);
CREATE INDEX IF NOT EXISTS idx_asset_nodes_search ON asset_nodes USING GIN(search_vector);

CREATE UNIQUE INDEX IF NOT EXISTS uq_asset_nodes_template_level_name
  ON asset_nodes(
    COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid),
    template_id,
    COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(name)
  )
  WHERE template_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_asset_nodes_asset_level_name
  ON asset_nodes(
    COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid),
    asset_id,
    COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(name)
  )
  WHERE asset_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_orders_asset_id ON work_orders(asset_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_node_id ON work_orders(node_id);

CREATE OR REPLACE FUNCTION current_company_context_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_company UUID;
BEGIN
  v_company := current_company_id();
  RETURN COALESCE(v_company, '00000000-0000-0000-0000-000000000000'::uuid);
END;
$$;

CREATE TABLE IF NOT EXISTS asset_template_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES asset_templates(id) ON DELETE RESTRICT,
  strategy TEXT NOT NULL CHECK (strategy IN ('ESPECIFICA', 'GENERICA')),
  matched_brand TEXT,
  matched_model TEXT,
  matched_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE asset_template_assignments ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE asset_template_assignments ADD COLUMN IF NOT EXISTS asset_id UUID;
ALTER TABLE asset_template_assignments ADD COLUMN IF NOT EXISTS template_id UUID;
ALTER TABLE asset_template_assignments ADD COLUMN IF NOT EXISTS strategy TEXT;
ALTER TABLE asset_template_assignments ADD COLUMN IF NOT EXISTS matched_brand TEXT;
ALTER TABLE asset_template_assignments ADD COLUMN IF NOT EXISTS matched_model TEXT;
ALTER TABLE asset_template_assignments ADD COLUMN IF NOT EXISTS matched_type TEXT;
ALTER TABLE asset_template_assignments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE asset_template_assignments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE asset_template_assignments
  DROP CONSTRAINT IF EXISTS asset_template_assignments_strategy_check;
ALTER TABLE asset_template_assignments
  ADD CONSTRAINT asset_template_assignments_strategy_check
  CHECK (strategy IN ('ESPECIFICA', 'GENERICA'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_asset_template_assignments_asset
  ON asset_template_assignments(asset_id);

CREATE INDEX IF NOT EXISTS idx_asset_template_assignments_company
  ON asset_template_assignments(company_id);

CREATE INDEX IF NOT EXISTS idx_asset_template_assignments_template
  ON asset_template_assignments(template_id);

-- Opcional: manuales (futuro import PDF)
CREATE TABLE IF NOT EXISTS manuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  template_id UUID REFERENCES asset_templates(id) ON DELETE CASCADE,
  node_id UUID REFERENCES asset_nodes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_path TEXT,
  source_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_manuals_target CHECK (num_nonnulls(template_id, node_id) = 1)
);

CREATE INDEX IF NOT EXISTS idx_manuals_company ON manuals(company_id);

-- Opcional: auditoría de cambios en nodos
CREATE TABLE IF NOT EXISTS node_audit_log (
  id BIGSERIAL PRIMARY KEY,
  company_id UUID,
  node_id UUID,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_by TEXT,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_node_audit_log_node_id ON node_audit_log(node_id);

-- ============================================================================
-- 3) Triggers de validación y auditoría
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_asset_nodes_validate()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  p asset_nodes;
  v_company UUID;
BEGIN
  IF NEW.asset_id IS NOT NULL THEN
    SELECT company_id INTO v_company FROM assets WHERE id = NEW.asset_id;
  ELSIF NEW.template_id IS NOT NULL THEN
    SELECT company_id INTO v_company FROM asset_templates WHERE id = NEW.template_id;
  END IF;

  NEW.company_id := COALESCE(NEW.company_id, v_company);

  IF NEW.parent_id IS NOT NULL THEN
    SELECT * INTO p FROM asset_nodes WHERE id = NEW.parent_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'parent_id % no existe', NEW.parent_id;
    END IF;

    IF COALESCE(p.template_id, '00000000-0000-0000-0000-000000000000'::uuid)
       <> COALESCE(NEW.template_id, '00000000-0000-0000-0000-000000000000'::uuid)
       OR COALESCE(p.asset_id, '00000000-0000-0000-0000-000000000000'::uuid)
          <> COALESCE(NEW.asset_id, '00000000-0000-0000-0000-000000000000'::uuid)
    THEN
      RAISE EXCEPTION 'parent y child deben pertenecer al mismo scope (asset/template)';
    END IF;

    IF node_type_level(NEW.node_type) <> node_type_level(p.node_type) + 1 THEN
      RAISE EXCEPTION 'Jerarquía inválida: % no puede colgar de %', NEW.node_type, p.node_type;
    END IF;

    IF COALESCE(p.company_id, '00000000-0000-0000-0000-000000000000'::uuid)
       <> COALESCE(NEW.company_id, '00000000-0000-0000-0000-000000000000'::uuid)
    THEN
      RAISE EXCEPTION 'parent y child deben pertenecer a la misma company_id';
    END IF;
  ELSE
    IF upper(NEW.node_type::text) NOT IN ('SYSTEM', 'SISTEMA') THEN
      RAISE EXCEPTION 'Nodo raíz debe ser node_type=system';
    END IF;
  END IF;

  IF NEW.parent_id IS NOT NULL AND NEW.id IS NOT NULL THEN
    IF NEW.parent_id = NEW.id THEN
      RAISE EXCEPTION 'Un nodo no puede ser su propio padre';
    END IF;

    IF EXISTS (
      WITH RECURSIVE anc AS (
        SELECT id, parent_id FROM asset_nodes WHERE id = NEW.parent_id
        UNION ALL
        SELECT n.id, n.parent_id
        FROM asset_nodes n
        JOIN anc a ON n.id = a.parent_id
      )
      SELECT 1 FROM anc WHERE id = NEW.id
    ) THEN
      RAISE EXCEPTION 'Ciclo detectado en asset_nodes';
    END IF;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_asset_nodes_validate_biu ON asset_nodes;
CREATE TRIGGER trg_asset_nodes_validate_biu
BEFORE INSERT OR UPDATE ON asset_nodes
FOR EACH ROW
EXECUTE FUNCTION trg_asset_nodes_validate();

CREATE OR REPLACE FUNCTION trg_asset_nodes_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO node_audit_log(company_id, node_id, action, changed_by, old_data, new_data)
    VALUES (NEW.company_id, NEW.id, 'INSERT', auth.uid()::TEXT, NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO node_audit_log(company_id, node_id, action, changed_by, old_data, new_data)
    VALUES (NEW.company_id, NEW.id, 'UPDATE', auth.uid()::TEXT, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO node_audit_log(company_id, node_id, action, changed_by, old_data, new_data)
    VALUES (OLD.company_id, OLD.id, 'DELETE', auth.uid()::TEXT, to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_asset_nodes_audit_aiud ON asset_nodes;
CREATE TRIGGER trg_asset_nodes_audit_aiud
AFTER INSERT OR UPDATE OR DELETE ON asset_nodes
FOR EACH ROW
EXECUTE FUNCTION trg_asset_nodes_audit();

-- ============================================================================
-- 4) RPC core: lectura lazy + clonación + asignación
-- ============================================================================

CREATE OR REPLACE FUNCTION get_children(
  p_asset_id UUID DEFAULT NULL,
  p_template_id UUID DEFAULT NULL,
  p_parent_id UUID DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 200,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  company_id UUID,
  parent_id UUID,
  node_type node_type_enum,
  sort_order INTEGER,
  name TEXT,
  description TEXT,
  part_number TEXT,
  has_children BOOLEAN
)
LANGUAGE SQL
STABLE
AS $$
  WITH scoped AS (
    SELECT n.*
    FROM asset_nodes n
    WHERE (
      (p_asset_id IS NOT NULL AND n.asset_id = p_asset_id AND p_template_id IS NULL)
      OR
      (p_template_id IS NOT NULL AND n.template_id = p_template_id AND p_asset_id IS NULL)
    )
  )
  SELECT
    n.id,
    n.company_id,
    n.parent_id,
    n.node_type,
    n.sort_order,
    n.name,
    n.description,
    n.part_number,
    EXISTS (SELECT 1 FROM scoped c WHERE c.parent_id = n.id) AS has_children
  FROM scoped n
  WHERE (
    p_search IS NOT NULL AND p_search <> ''
    AND (
      n.search_vector @@ websearch_to_tsquery('simple', p_search)
      OR n.part_number ILIKE '%' || p_search || '%'
      OR n.name ILIKE '%' || p_search || '%'
    )
  )
  OR (
    (p_search IS NULL OR p_search = '')
    AND (
      (p_parent_id IS NULL AND n.parent_id IS NULL)
      OR n.parent_id = p_parent_id
    )
  )
  ORDER BY n.sort_order, n.name
  LIMIT GREATEST(1, p_limit)
  OFFSET GREATEST(0, p_offset);
$$;

CREATE OR REPLACE FUNCTION get_children(
  p_owner_scope TEXT,
  p_owner_id UUID,
  p_parent_id UUID DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 200,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  company_id UUID,
  parent_id UUID,
  node_type node_type_enum,
  sort_order INTEGER,
  name TEXT,
  description TEXT,
  part_number TEXT,
  has_children BOOLEAN
)
LANGUAGE SQL
STABLE
AS $$
  SELECT *
  FROM get_children(
    CASE WHEN lower(coalesce(p_owner_scope, '')) = 'asset' THEN p_owner_id ELSE NULL END,
    CASE WHEN lower(coalesce(p_owner_scope, '')) = 'template' THEN p_owner_id ELSE NULL END,
    p_parent_id,
    p_search,
    p_limit,
    p_offset
  );
$$;

CREATE OR REPLACE FUNCTION clone_template_to_asset(
  p_template_id UUID,
  p_asset_id UUID
)
RETURNS TABLE(inserted_count INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
  r RECORD;
  v_new_id UUID;
  v_parent_new UUID;
  v_count INTEGER := 0;
  v_company UUID;
BEGIN
  SELECT company_id INTO v_company FROM assets WHERE id = p_asset_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Asset % no existe', p_asset_id;
  END IF;

  IF v_company IS NULL THEN
    SELECT company_id
    INTO v_company
    FROM asset_templates
    WHERE id = p_template_id;
  END IF;

  IF v_company IS NULL THEN
    v_company := current_company_context_id();
  END IF;

  v_company := COALESCE(v_company, '00000000-0000-0000-0000-000000000000'::uuid);

  UPDATE assets
  SET company_id = v_company
  WHERE id = p_asset_id
    AND company_id IS NULL;

  DELETE FROM asset_nodes WHERE asset_id = p_asset_id;

  DROP TABLE IF EXISTS tmp_node_map;
  CREATE TEMP TABLE tmp_node_map(
    src_id UUID PRIMARY KEY,
    dst_id UUID NOT NULL
  ) ON COMMIT DROP;

  FOR r IN
    WITH RECURSIVE t AS (
      SELECT n.id, n.parent_id, n.node_type, n.sort_order, n.name, n.description, n.part_number, 1 AS depth
      FROM asset_nodes n
      WHERE n.template_id = p_template_id
        AND n.parent_id IS NULL
      UNION ALL
      SELECT c.id, c.parent_id, c.node_type, c.sort_order, c.name, c.description, c.part_number, t.depth + 1
      FROM asset_nodes c
      JOIN t ON c.parent_id = t.id
      WHERE c.template_id = p_template_id
    )
    SELECT * FROM t ORDER BY depth, sort_order, name
  LOOP
    IF r.parent_id IS NULL THEN
      v_parent_new := NULL;
    ELSE
      SELECT dst_id INTO v_parent_new FROM tmp_node_map WHERE src_id = r.parent_id;
    END IF;

    INSERT INTO asset_nodes(
      company_id,
      template_id,
      asset_id,
      parent_id,
      node_type,
      sort_order,
      name,
      description,
      part_number
    ) VALUES (
      v_company,
      NULL,
      p_asset_id,
      v_parent_new,
      r.node_type,
      r.sort_order,
      r.name,
      r.description,
      r.part_number
    )
    RETURNING id INTO v_new_id;

    INSERT INTO tmp_node_map(src_id, dst_id) VALUES (r.id, v_new_id);
    v_count := v_count + 1;
  END LOOP;

  RETURN QUERY SELECT v_count;
END;
$$;

CREATE OR REPLACE FUNCTION bulk_clone_template_to_assets(
  p_template_id UUID,
  p_asset_ids UUID[]
)
RETURNS TABLE(asset_id UUID, inserted_count INTEGER, ok BOOLEAN, error_text TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_asset_id UUID;
  v_count INTEGER;
BEGIN
  FOREACH v_asset_id IN ARRAY p_asset_ids LOOP
    BEGIN
      SELECT cta.inserted_count
      INTO v_count
      FROM clone_template_to_asset(p_template_id, v_asset_id) AS cta(inserted_count);

      RETURN QUERY SELECT v_asset_id, COALESCE(v_count, 0), TRUE, NULL::TEXT;
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT v_asset_id, 0, FALSE, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- alias de compatibilidad
CREATE OR REPLACE FUNCTION bulk_clone_template(
  p_template_id UUID,
  p_asset_ids UUID[]
)
RETURNS TABLE(asset_id UUID, inserted_count INTEGER, ok BOOLEAN, error_text TEXT)
LANGUAGE SQL
AS $$
  SELECT * FROM bulk_clone_template_to_assets(p_template_id, p_asset_ids);
$$;

CREATE OR REPLACE FUNCTION clone_template_to_template(
  p_source_template_id UUID,
  p_target_template_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  r RECORD;
  v_new_id UUID;
  v_parent_new UUID;
  v_count INTEGER := 0;
  v_company UUID;
BEGIN
  SELECT company_id INTO v_company FROM asset_templates WHERE id = p_target_template_id;

  DELETE FROM asset_nodes WHERE template_id = p_target_template_id;

  DROP TABLE IF EXISTS tmp_tpl_node_map;
  CREATE TEMP TABLE tmp_tpl_node_map(
    src_id UUID PRIMARY KEY,
    dst_id UUID NOT NULL
  ) ON COMMIT DROP;

  FOR r IN
    WITH RECURSIVE t AS (
      SELECT n.id, n.parent_id, n.node_type, n.sort_order, n.name, n.description, n.part_number, 1 AS depth
      FROM asset_nodes n
      WHERE n.template_id = p_source_template_id
        AND n.parent_id IS NULL
      UNION ALL
      SELECT c.id, c.parent_id, c.node_type, c.sort_order, c.name, c.description, c.part_number, t.depth + 1
      FROM asset_nodes c
      JOIN t ON c.parent_id = t.id
      WHERE c.template_id = p_source_template_id
    )
    SELECT * FROM t ORDER BY depth, sort_order, name
  LOOP
    IF r.parent_id IS NULL THEN
      v_parent_new := NULL;
    ELSE
      SELECT dst_id INTO v_parent_new FROM tmp_tpl_node_map WHERE src_id = r.parent_id;
    END IF;

    INSERT INTO asset_nodes(
      company_id,
      template_id,
      asset_id,
      parent_id,
      node_type,
      sort_order,
      name,
      description,
      part_number
    ) VALUES (
      v_company,
      p_target_template_id,
      NULL,
      v_parent_new,
      r.node_type,
      r.sort_order,
      r.name,
      r.description,
      r.part_number
    )
    RETURNING id INTO v_new_id;

    INSERT INTO tmp_tpl_node_map(src_id, dst_id) VALUES (r.id, v_new_id);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION assign_template_for_asset(
  p_asset_id UUID
)
RETURNS TABLE(asset_id UUID, template_id UUID, strategy TEXT, cloned BOOLEAN)
LANGUAGE plpgsql
AS $$
DECLARE
  v_asset assets%ROWTYPE;
  v_template_id UUID;
  v_strategy TEXT;
  v_type_key TEXT;
  v_brand_key TEXT;
  v_model_key TEXT;
  v_has_nodes BOOLEAN;
BEGIN
  SELECT * INTO v_asset FROM assets WHERE id = p_asset_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Asset % no encontrado', p_asset_id;
  END IF;

  v_type_key := canonical_asset_type_key(COALESCE(v_asset.type, v_asset.tipo));
  v_brand_key := COALESCE(v_asset.brand_key, normalize_text(COALESCE(v_asset.brand_raw, v_asset.marca)));
  v_model_key := COALESCE(v_asset.model_key, normalize_model(COALESCE(v_asset.model_raw, v_asset.modelo)));

  -- 1) Match específico estricto por Tipo + Marca + Modelo
  SELECT t.id, 'ESPECIFICA'
  INTO v_template_id, v_strategy
  FROM asset_templates t
  WHERE t.is_active = TRUE
    AND t.template_kind = 'ESPECIFICA'
    AND COALESCE(t.company_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(v_asset.company_id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND COALESCE(t.equipment_type, t.asset_type_key) = v_type_key
    AND COALESCE(t.brand_key, normalize_text(t.brand)) = v_brand_key
    AND COALESCE(t.model_key, normalize_model(t.model)) = v_model_key
  ORDER BY t.version DESC
  LIMIT 1;

  -- 2) Fallback genérica por Tipo
  IF v_template_id IS NULL THEN
    SELECT t.id, 'GENERICA'
    INTO v_template_id, v_strategy
    FROM asset_templates t
    WHERE t.is_active = TRUE
      AND t.template_kind = 'GENERICA'
      AND COALESCE(t.company_id, '00000000-0000-0000-0000-000000000000'::uuid)
          = COALESCE(v_asset.company_id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND COALESCE(t.equipment_type, t.asset_type_key) = v_type_key
    ORDER BY t.version DESC
    LIMIT 1;
  END IF;

  IF v_template_id IS NULL THEN
    RETURN QUERY SELECT p_asset_id, NULL::UUID, NULL::TEXT, FALSE;
    RETURN;
  END IF;

  UPDATE asset_template_assignments ata
  SET
    company_id = v_asset.company_id,
    template_id = v_template_id,
    strategy = v_strategy,
    matched_brand = COALESCE(v_asset.brand_raw, v_asset.marca),
    matched_model = COALESCE(v_asset.model_raw, v_asset.modelo),
    matched_type = COALESCE(v_asset.type, v_asset.tipo),
    updated_at = NOW()
  WHERE ata.asset_id = p_asset_id;

  IF NOT EXISTS (
    SELECT 1
    FROM asset_template_assignments ata2
    WHERE ata2.asset_id = p_asset_id
  ) THEN
    INSERT INTO asset_template_assignments(
      company_id, asset_id, template_id, strategy, matched_brand, matched_model, matched_type, updated_at
    )
    VALUES (
      v_asset.company_id,
      p_asset_id,
      v_template_id,
      v_strategy,
      COALESCE(v_asset.brand_raw, v_asset.marca),
      COALESCE(v_asset.model_raw, v_asset.modelo),
      COALESCE(v_asset.type, v_asset.tipo),
      NOW()
    );
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM asset_nodes n
    WHERE n.asset_id = p_asset_id
  ) INTO v_has_nodes;
  IF NOT v_has_nodes THEN
    PERFORM * FROM clone_template_to_asset(v_template_id, p_asset_id);
  END IF;

  RETURN QUERY SELECT p_asset_id, v_template_id, v_strategy, NOT v_has_nodes;
END;
$$;

CREATE OR REPLACE FUNCTION assign_and_clone_all_assets()
RETURNS TABLE(asset_id UUID, template_id UUID, strategy TEXT, cloned BOOLEAN)
LANGUAGE plpgsql
AS $$
DECLARE
  a RECORD;
BEGIN
  FOR a IN SELECT id FROM assets WHERE COALESCE(visible, TRUE) = TRUE LOOP
    RETURN QUERY SELECT * FROM assign_template_for_asset(a.id);
  END LOOP;
END;
$$;

-- ============================================================================
-- 5) RLS por company_id + roles
-- ============================================================================

ALTER TABLE asset_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_template_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_model_alias ENABLE ROW LEVEL SECURITY;
ALTER TABLE manuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS asset_templates_read ON asset_templates;
CREATE POLICY asset_templates_read ON asset_templates
FOR SELECT
USING (
  auth.role() = 'service_role'
  OR (
    is_read_role()
    AND COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(current_company_id(), '00000000-0000-0000-0000-000000000000'::uuid)
  )
);

DROP POLICY IF EXISTS asset_templates_write ON asset_templates;
CREATE POLICY asset_templates_write ON asset_templates
FOR ALL
USING (
  auth.role() = 'service_role'
  OR (
    is_admin_role()
    AND COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(current_company_id(), '00000000-0000-0000-0000-000000000000'::uuid)
  )
)
WITH CHECK (
  auth.role() = 'service_role'
  OR (
    is_admin_role()
    AND COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(current_company_id(), '00000000-0000-0000-0000-000000000000'::uuid)
  )
);

DROP POLICY IF EXISTS asset_nodes_read ON asset_nodes;
CREATE POLICY asset_nodes_read ON asset_nodes
FOR SELECT
USING (
  auth.role() = 'service_role'
  OR (
    is_read_role()
    AND COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(current_company_id(), '00000000-0000-0000-0000-000000000000'::uuid)
  )
);

DROP POLICY IF EXISTS asset_nodes_write ON asset_nodes;
CREATE POLICY asset_nodes_write ON asset_nodes
FOR ALL
USING (
  auth.role() = 'service_role'
  OR (
    is_admin_role()
    AND COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(current_company_id(), '00000000-0000-0000-0000-000000000000'::uuid)
  )
)
WITH CHECK (
  auth.role() = 'service_role'
  OR (
    is_admin_role()
    AND COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(current_company_id(), '00000000-0000-0000-0000-000000000000'::uuid)
  )
);

DROP POLICY IF EXISTS ata_read ON asset_template_assignments;
CREATE POLICY ata_read ON asset_template_assignments
FOR SELECT
USING (
  auth.role() = 'service_role'
  OR (
    is_read_role()
    AND COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(current_company_id(), '00000000-0000-0000-0000-000000000000'::uuid)
  )
);

DROP POLICY IF EXISTS asset_model_alias_read ON asset_model_alias;
CREATE POLICY asset_model_alias_read ON asset_model_alias
FOR SELECT
USING (
  auth.role() = 'service_role'
  OR (
    is_read_role()
    AND COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(current_company_id(), '00000000-0000-0000-0000-000000000000'::uuid)
  )
);

DROP POLICY IF EXISTS asset_model_alias_write ON asset_model_alias;
CREATE POLICY asset_model_alias_write ON asset_model_alias
FOR ALL
USING (
  auth.role() = 'service_role'
  OR (
    is_admin_role()
    AND COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(current_company_id(), '00000000-0000-0000-0000-000000000000'::uuid)
  )
)
WITH CHECK (
  auth.role() = 'service_role'
  OR (
    is_admin_role()
    AND COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(current_company_id(), '00000000-0000-0000-0000-000000000000'::uuid)
  )
);

DROP POLICY IF EXISTS ata_write ON asset_template_assignments;
CREATE POLICY ata_write ON asset_template_assignments
FOR ALL
USING (
  auth.role() = 'service_role'
  OR (
    is_admin_role()
    AND COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(current_company_id(), '00000000-0000-0000-0000-000000000000'::uuid)
  )
)
WITH CHECK (
  auth.role() = 'service_role'
  OR (
    is_admin_role()
    AND COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(current_company_id(), '00000000-0000-0000-0000-000000000000'::uuid)
  )
);

DROP POLICY IF EXISTS manuals_read ON manuals;
CREATE POLICY manuals_read ON manuals
FOR SELECT
USING (
  auth.role() = 'service_role'
  OR (
    is_read_role()
    AND COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(current_company_id(), '00000000-0000-0000-0000-000000000000'::uuid)
  )
);

DROP POLICY IF EXISTS manuals_write ON manuals;
CREATE POLICY manuals_write ON manuals
FOR ALL
USING (
  auth.role() = 'service_role'
  OR (
    is_admin_role()
    AND COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(current_company_id(), '00000000-0000-0000-0000-000000000000'::uuid)
  )
)
WITH CHECK (
  auth.role() = 'service_role'
  OR (
    is_admin_role()
    AND COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(current_company_id(), '00000000-0000-0000-0000-000000000000'::uuid)
  )
);

DROP POLICY IF EXISTS node_audit_log_read ON node_audit_log;
CREATE POLICY node_audit_log_read ON node_audit_log
FOR SELECT
USING (
  auth.role() = 'service_role'
  OR (
    is_read_role()
    AND COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(current_company_id(), '00000000-0000-0000-0000-000000000000'::uuid)
  )
);

-- ============================================================================
-- 6) Seed templates genéricos + estructura mínima nivel 1/2
-- ============================================================================

CREATE OR REPLACE FUNCTION generic_systems_for_type(p_type_key TEXT)
RETURNS TEXT[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  k TEXT := norm_type(p_type_key);
BEGIN
  IF k IN ('LUMINARIA') THEN
    RETURN ARRAY[
      'Motor','Combustible','Lubricación','Enfriamiento','Eléctrico/Arranque','Chasis/Estructura'
    ];
  ELSIF k IN ('GENERADOR','COMPRESOR','HIDROJET','MONTACARGA') THEN
    RETURN ARRAY[
      'Motor','Combustible','Lubricación','Enfriamiento','Hidráulico','Eléctrico/Arranque','Chasis/Estructura','Cabina/Controles'
    ];
  ELSIF k IN ('REMOLQUETRAILER') THEN
    RETURN ARRAY[
      'Frenos','Dirección','Chasis/Estructura','Implementos/Aditamentos'
    ];
  ELSIF k IN ('ELEVADOR','MARTILLOHIDRAULICO','PLANTACRUSHER') THEN
    RETURN ARRAY[
      'Motor','Combustible','Lubricación','Enfriamiento','Hidráulico','Eléctrico/Arranque','Transmisión/Propulsión','Chasis/Estructura','Cabina/Controles','Implementos/Aditamentos'
    ];
  ELSE
    RETURN ARRAY[
      'Motor','Combustible','Lubricación','Enfriamiento','Hidráulico','Eléctrico/Arranque','Transmisión/Propulsión','Frenos','Dirección','Chasis/Estructura','Cabina/Controles','Implementos/Aditamentos'
    ];
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION seed_generic_template_tree(p_template_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_type_key TEXT;
  v_system TEXT;
  v_system_id UUID;
  v_sort INTEGER := 0;
  v_count INTEGER := 0;
BEGIN
  SELECT asset_type_key INTO v_type_key FROM asset_templates WHERE id = p_template_id;

  DELETE FROM asset_nodes WHERE template_id = p_template_id;

  FOREACH v_system IN ARRAY generic_systems_for_type(v_type_key) LOOP
    v_sort := v_sort + 10;

    INSERT INTO asset_nodes(company_id, template_id, node_type, parent_id, sort_order, name, description)
    SELECT company_id, id, node_type_from_logical('system'), NULL, v_sort, v_system, 'Sistema principal'
    FROM asset_templates
    WHERE id = p_template_id
    RETURNING asset_nodes.id INTO v_system_id;

    INSERT INTO asset_nodes(company_id, template_id, node_type, parent_id, sort_order, name, description)
    SELECT company_id, id, node_type_from_logical('subsystem'), v_system_id, 10, 'General', 'Subsistema base'
    FROM asset_templates
    WHERE id = p_template_id;

    v_count := v_count + 2;
  END LOOP;

  RETURN v_count;
END;
$$;

CREATE TEMP TABLE tmp_generic_templates(
  code TEXT,
  name TEXT,
  asset_type_key TEXT
) ON COMMIT DROP;

INSERT INTO tmp_generic_templates(code, name, asset_type_key)
VALUES
  ('GEN_EXCAVADORA', 'Excavadora Genérica', 'EXCAVADORA'),
  ('GEN_CAMION_VOLTEO', 'Camión Volteo Genérico', 'CAMIONVOLTEO'),
  ('GEN_CAMION_ARTICULADO', 'Camión Articulado Genérico', 'CAMIONARTICULADO'),
  ('GEN_TRACTOR_ORUGA', 'Tractor de Oruga Genérico', 'TRACTORORUGA'),
  ('GEN_CARGADOR_FRONTAL', 'Cargador Frontal Genérico', 'CARGADORFRONTAL'),
  ('GEN_MOTONIVELADORA', 'Motoniveladora Genérica', 'MOTONIVELADORA'),
  ('GEN_RODILLO', 'Rodillo Genérico', 'RODILLO'),
  ('GEN_RETRO_PALA', 'Retro-Pala Genérica', 'RETROPALA'),
  ('GEN_CAMION_CISTERNA', 'Camión Cistera Genérico', 'CAMIONCISTERNA'),
  ('GEN_CAMION_SERVICIO', 'Camión Servicio Genérico', 'CAMIONSERVICIO'),
  ('GEN_CAMION_COMBUSTIBLE', 'Camión Combustible Genérico', 'CAMIONCOMBUSTIBLE'),
  ('GEN_CABEZOTE', 'Cabeza Tractora (Cabezote) Genérico', 'CABEZOTRACTORA'),
  ('GEN_CAMIONETA', 'Camioneta Genérico', 'CAMIONETA'),
  ('GEN_AUTOBUS_MINIBUS', 'Autobús/Minibús Genérico', 'AUTOBUSMINIBUS'),
  ('GEN_GENERADOR', 'Generador Genérico', 'GENERADOR'),
  ('GEN_COMPRESOR', 'Compresor Genérico', 'COMPRESOR'),
  ('GEN_LUMINARIA', 'Luminaria Genérico', 'LUMINARIA'),
  ('GEN_ELEVADOR', 'Elevador Genérico', 'ELEVADOR'),
  ('GEN_PLANTA_CRUSHER', 'Planta/Crusher/Cribadora/Conveyor Genérico', 'PLANTACRUSHER'),
  ('GEN_MONTACARGA', 'Montacarga Genérico', 'MONTACARGA'),
  ('GEN_MARTILLO_HIDRAULICO', 'Martillo Hidráulico Genérico', 'MARTILLOHIDRAULICO'),
  ('GEN_HIDROJET', 'Hidrojet Genérico', 'HIDROJET'),
  ('GEN_REMOLQUE_TRAILER', 'Remolque/Trailer Genérico', 'REMOLQUETRAILER');

UPDATE asset_templates t
SET
  display_name = g.name,
  name = g.name,
  template_type = 'generic',
  template_kind = 'GENERICA',
  equipment_type = g.asset_type_key,
  asset_type_key = g.asset_type_key,
  brand_key = NULL,
  model_key = NULL,
  brand = NULL,
  model = NULL,
  is_active = TRUE,
  updated_at = NOW()
FROM tmp_generic_templates g
WHERE t.code = g.code
  AND COALESCE(t.company_id, '00000000-0000-0000-0000-000000000000'::uuid)
      = COALESCE(current_company_context_id(), '00000000-0000-0000-0000-000000000000'::uuid);

INSERT INTO asset_templates(company_id, code, display_name, name, template_type, template_kind, equipment_type, asset_type_key, is_active)
SELECT current_company_context_id(), g.code, g.name, g.name, 'generic', 'GENERICA', g.asset_type_key, g.asset_type_key, TRUE
FROM tmp_generic_templates g
WHERE NOT EXISTS (
  SELECT 1
  FROM asset_templates t
  WHERE t.code = g.code
    AND COALESCE(t.company_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(current_company_context_id(), '00000000-0000-0000-0000-000000000000'::uuid)
);

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id
    FROM asset_templates
    WHERE template_kind = 'GENERICA'
      AND COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid)
          = COALESCE(current_company_context_id(), '00000000-0000-0000-0000-000000000000'::uuid)
  LOOP
    PERFORM seed_generic_template_tree(r.id);
  END LOOP;
END $$;

-- ============================================================================
-- 7) Seed templates específicos por Marca+Modelo (inventario provisto)
--    Naming: "{TIPO} - {MARCA} {MODELO} - Base"
-- ============================================================================

CREATE TEMP TABLE tmp_specific_templates(
  asset_type_key TEXT,
  brand TEXT,
  model TEXT
) ON COMMIT DROP;

INSERT INTO tmp_specific_templates(asset_type_key, brand, model)
VALUES
  -- AUTOBUS
  ('AUTOBUSMINIBUS','FREIGHTLINER','FS-65'),
  ('AUTOBUSMINIBUS','FREIGHTLINER','THOMAS'),
  ('AUTOBUSMINIBUS','IVECO','POWER DALLY'),
  ('AUTOBUSMINIBUS','TOYOTA','COASTER'),

  -- MINIBUS / FURGONETA
  ('AUTOBUSMINIBUS','NISSAN','URVAN'),
  ('AUTOBUSMINIBUS','NISSAN','URVAN TECHO ALTO'),
  ('AUTOBUSMINIBUS','NISSAN','URVAN CARGO'),

  -- TRACTOR DE ORUGA
  ('TRACTORORUGA','CATERPILLAR','D8T'),
  ('TRACTORORUGA','CATERPILLAR','D4K2'),
  ('TRACTORORUGA','CATERPILLAR','D6T XL'),
  ('TRACTORORUGA','KOMATSU','D65EX-16'),

  -- CAMIÓN ARTICULADO
  ('CAMIONARTICULADO','JOHN DEERE','310E'),
  ('CAMIONARTICULADO','CATERPILLAR','730'),
  ('CAMIONARTICULADO','CATERPILLAR','745'),

  -- CABEZOTE
  ('CABEZOTRACTORA','SCANIA','P420'),
  ('CABEZOTRACTORA','VOLVO','FMX480 HP 6X4T'),
  ('CABEZOTRACTORA','SHACMAN','X500 6X4'),

  -- CAMIÓN DE COMBUSTIBLE
  ('CAMIONCOMBUSTIBLE','FREIGHTLINER','M2 106'),
  ('CAMIONCOMBUSTIBLE','PETERBILT','330'),
  ('CAMIONCOMBUSTIBLE','SINOTRUCK','HOWO 4X2'),
  ('CAMIONCOMBUSTIBLE','DAIHATSU','DELTA'),

  -- CAMIÓN DE SERVICIO
  ('CAMIONSERVICIO','FORD','F-550'),
  ('CAMIONSERVICIO','SINOTRUCK','HOWO 4X2'),
  ('CAMIONSERVICIO','SCANIA','P360'),
  ('CAMIONSERVICIO','KIA','K2700'),
  ('CAMIONSERVICIO','INTERNATIONAL','7500'),
  ('CAMIONSERVICIO','FORLAND','BJ3045 D9PBA'),

  -- CAMIÓN CISTERNA
  ('CAMIONCISTERNA','SCANIA','P420'),
  ('CAMIONCISTERNA','FREIGHTLINER','CL120'),
  ('CAMIONCISTERNA','KENTWORTH','T300'),
  ('CAMIONCISTERNA','INTERNATIONAL','7400'),
  ('CAMIONCISTERNA','SCANIA','P310'),
  ('CAMIONCISTERNA','SINOTRUCK','HOWO'),

  -- CAMIÓN VOLTEO
  ('CAMIONVOLTEO','SCANIA','P420'),
  ('CAMIONVOLTEO','SCANIA','P460'),
  ('CAMIONVOLTEO','SHACMAN','F-3000'),
  ('CAMIONVOLTEO','VOLVO','FMX 480 8X4R'),
  ('CAMIONVOLTEO','JAC','HFC3086K'),
  ('CAMIONVOLTEO','FORLAND','BJ3045 D9PBA'),

  -- EXCAVADORA
  ('EXCAVADORA','CASE','CX350B'),
  ('EXCAVADORA','CATERPILLAR','320'),
  ('EXCAVADORA','CATERPILLAR','330'),
  ('EXCAVADORA','CATERPILLAR','330 GC'),
  ('EXCAVADORA','CATERPILLAR','330NG'),
  ('EXCAVADORA','CATERPILLAR','330-7'),
  ('EXCAVADORA','CATERPILLAR','336'),
  ('EXCAVADORA','CATERPILLAR','336GC'),
  ('EXCAVADORA','CATERPILLAR','336 UVG'),
  ('EXCAVADORA','CATERPILLAR','345 GC'),
  ('EXCAVADORA','KOMATSU','PC500LC'),
  ('EXCAVADORA','KOMATSU','PC300'),
  ('EXCAVADORA','KOMATSU','PC200LC-8M0'),
  ('EXCAVADORA','KOMATSU','PC-200'),
  ('EXCAVADORA','JOHN DEERE','350G'),
  ('EXCAVADORA','HITACHI','ZX450LC'),
  ('EXCAVADORA','VOLVO','EC300DL'),

  -- MOTONIVELADORA
  ('MOTONIVELADORA','JOHN DEERE','670GP'),
  ('MOTONIVELADORA','JOHN DEERE','620 G'),
  ('MOTONIVELADORA','CATERPILLAR','12K'),
  ('MOTONIVELADORA','CATERPILLAR','140'),
  ('MOTONIVELADORA','CATERPILLAR','120M'),
  ('MOTONIVELADORA','CATERPILLAR','140 GC'),
  ('MOTONIVELADORA','KOMATSU','GD535-5'),

  -- MINICARGADOR
  ('MINICARGADOR','CATERPILLAR','216B'),

  -- CARGADOR FRONTAL
  ('CARGADORFRONTAL','CATERPILLAR','950'),
  ('CARGADORFRONTAL','CATERPILLAR','950GC'),
  ('CARGADORFRONTAL','CATERPILLAR','966L'),
  ('CARGADORFRONTAL','CATERPILLAR','980'),
  ('CARGADORFRONTAL','JOHN DEERE','844K-II'),

  -- RODILLO / RODILLO NEUMÁTICO
  ('RODILLO','CATERPILLAR','CS54B'),
  ('RODILLO','CATERPILLAR','CS11GC'),
  ('RODILLO','CATERPILLAR','CS78B'),
  ('RODILLO','DYNAPAC','CA25D'),
  ('RODILLO','DYNAPAC','CA250D'),
  ('RODILLO','BOMAG','BW219 D-5'),
  ('RODILLO','BOMAG','BW210'),
  ('RODILLO','SEM','522'),
  ('RODILLO','CATERPILLAR','CW34LRC'),

  -- RETRO-PALA
  ('RETROPALA','JOHN DEERE','310L'),
  ('RETROPALA','CATERPILLAR','416'),
  ('RETROPALA','KOMATSU','WB93R-5E0X'),

  -- CAMIONETA
  ('CAMIONETA','ISUZU','D-MAX'),
  ('CAMIONETA','ISUZU','DMAX'),
  ('CAMIONETA','MAZDA','BT-50'),
  ('CAMIONETA','CHANGAN','HUNTER'),
  ('CAMIONETA','NISSAN','FRONTIER'),
  ('CAMIONETA','KYC','F3'),
  ('CAMIONETA','JAC','S3'),

  -- CRIBADORA / CONVEYOR / PLANTAS
  ('PLANTACRUSHER','METSO','STT 4.8'),
  ('PLANTACRUSHER','METSO','CT 2.4'),
  ('PLANTACRUSHER','TESAB','700i'),
  ('PLANTACRUSHER','TESAB','TS1550'),
  ('PLANTACRUSHER','TRACK STACK','8042T'),

  -- MONTACARGA
  ('MONTACARGA','TOYOTA','FD40'),
  ('MONTACARGA','CATERPILLAR','DP40K1'),

  -- LUMINARIA
  ('LUMINARIA','MAGNUN','LT VTELO'),
  ('LUMINARIA','TEREX','USA LLC'),
  ('LUMINARIA','TEREX','D1105-BG'),
  ('LUMINARIA','DOOSAN','LSCWKU'),
  ('LUMINARIA','MITSUBISHI','L3E'),
  ('LUMINARIA','MITSUBISHI','L3E-W464MLD'),
  ('LUMINARIA','WANCO','WET'),
  ('LUMINARIA','MAGNUN','MLT3060MMH'),
  ('LUMINARIA','Wacker Neuson','LTN61-VS'),

  -- GENERADOR / COMPRESOR / OTROS
  ('COMPRESOR','INGERSOLL RAND','2475'),
  ('GENERADOR','MAGNUN','MMG185'),
  ('GENERADOR','MKT','240KV'),
  ('HIDROJET','MAGNUM','4000'),
  ('GENERADOR','BIG BLUE','ECO PRO 400'),
  ('GENERADOR','MILLER','RDA D302K'),

  -- ELEVADOR
  ('ELEVADOR','JLG','1230ES'),
  ('ELEVADOR','JLG','125SP'),

  -- MARTILLO
  ('MARTILLOHIDRAULICO','KOMATSU','JMHB370V-1'),
  ('MARTILLOHIDRAULICO','KOMATSU','HIDRA15 VEL'),
  ('MARTILLOHIDRAULICO','KOMATSU','MARTILLO HIDRAULICO'),
  ('MARTILLOHIDRAULICO','CATERPILLAR','H130E (USADO)'),
  ('MARTILLOHIDRAULICO','CATERPILLAR','H130ES'),
  ('MARTILLOHIDRAULICO','CATERPILLAR','H120S'),
  ('MARTILLOHIDRAULICO','OKADA','OKA316'),

  -- REMOLQUE / TRAILER
  ('REMOLQUETRAILER','LOAD KING','LOW BOY'),
  ('REMOLQUETRAILER','PJ TRAILERS','GOOSENECK 40 FT'),
  ('REMOLQUETRAILER','HENGWANG','N/A'),
  ('REMOLQUETRAILER','ETNYRE','OTHER');

-- Casos condicionados por existencia real en assets: marcas 3M/SEM para camión volteo
INSERT INTO tmp_specific_templates(asset_type_key, brand, model)
SELECT DISTINCT
  'CAMIONVOLTEO',
  COALESCE(a.brand_raw, a.marca),
  COALESCE(a.model_raw, a.modelo)
FROM assets a
WHERE upper(coalesce(a.brand_raw, a.marca, '')) IN ('3M', 'SEM')
  AND canonical_asset_type_key(COALESCE(a.type, a.tipo)) = 'CAMIONVOLTEO'
  AND coalesce(a.model_raw, a.modelo, '') <> '';

WITH dedup AS (
  SELECT DISTINCT asset_type_key, brand, model
  FROM tmp_specific_templates
)
UPDATE asset_templates t
SET
  display_name = dedup.asset_type_key || ' - ' || dedup.brand || ' ' || dedup.model || ' - Base',
  name = dedup.asset_type_key || ' - ' || dedup.brand || ' ' || dedup.model || ' - Base',
  template_type = 'specific',
  template_kind = 'ESPECIFICA',
  equipment_type = dedup.asset_type_key,
  asset_type_key = dedup.asset_type_key,
  brand_key = normalize_text(dedup.brand),
  model_key = normalize_model(dedup.model),
  brand = dedup.brand,
  model = dedup.model,
  is_active = TRUE,
  updated_at = NOW()
FROM dedup
WHERE t.template_kind = 'ESPECIFICA'
  AND COALESCE(t.company_id, '00000000-0000-0000-0000-000000000000'::uuid)
      = COALESCE(current_company_context_id(), '00000000-0000-0000-0000-000000000000'::uuid)
  AND COALESCE(t.equipment_type, t.asset_type_key) = dedup.asset_type_key
  AND COALESCE(t.brand_key, normalize_text(t.brand)) = normalize_text(dedup.brand)
  AND COALESCE(t.model_key, normalize_model(t.model)) = normalize_model(dedup.model);

WITH dedup AS (
  SELECT DISTINCT asset_type_key, brand, model
  FROM tmp_specific_templates
)
INSERT INTO asset_templates(
  company_id,
  code,
  display_name,
  name,
  template_type,
  template_kind,
  equipment_type,
  asset_type_key,
  brand_key,
  model_key,
  brand,
  model,
  is_active
)
SELECT
  current_company_context_id(),
  'SPEC_' || regexp_replace(dedup.asset_type_key || '_' || dedup.brand || '_' || dedup.model, '[^A-Z0-9]+', '_', 'g'),
  dedup.asset_type_key || ' - ' || dedup.brand || ' ' || dedup.model || ' - Base',
  dedup.asset_type_key || ' - ' || dedup.brand || ' ' || dedup.model || ' - Base',
  'specific',
  'ESPECIFICA',
  dedup.asset_type_key,
  dedup.asset_type_key,
  normalize_text(dedup.brand),
  normalize_model(dedup.model),
  dedup.brand,
  dedup.model,
  TRUE
FROM dedup
WHERE NOT EXISTS (
  SELECT 1
  FROM asset_templates t
  WHERE t.template_kind = 'ESPECIFICA'
    AND COALESCE(t.company_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(current_company_context_id(), '00000000-0000-0000-0000-000000000000'::uuid)
    AND COALESCE(t.equipment_type, t.asset_type_key) = dedup.asset_type_key
    AND COALESCE(t.brand_key, normalize_text(t.brand)) = normalize_text(dedup.brand)
    AND COALESCE(t.model_key, normalize_model(t.model)) = normalize_model(dedup.model)
);

-- Clonar estructura desde template genérico del mismo tipo a cada template específico
DO $$
DECLARE
  s RECORD;
  v_generic_id UUID;
BEGIN
  FOR s IN
    SELECT id, asset_type_key
    FROM asset_templates
    WHERE template_kind = 'ESPECIFICA'
      AND COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid)
          = COALESCE(current_company_context_id(), '00000000-0000-0000-0000-000000000000'::uuid)
  LOOP
    SELECT id INTO v_generic_id
    FROM asset_templates g
    WHERE g.template_kind = 'GENERICA'
      AND g.asset_type_key = s.asset_type_key
      AND COALESCE(g.company_id, '00000000-0000-0000-0000-000000000000'::uuid)
          = COALESCE(current_company_context_id(), '00000000-0000-0000-0000-000000000000'::uuid)
    ORDER BY g.version DESC
    LIMIT 1;

    IF v_generic_id IS NOT NULL THEN
      PERFORM clone_template_to_template(v_generic_id, s.id);
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
