-- ==============================================
-- MIGRATION: Estructura Técnica CMMS/EAM (SAP PM style)
-- Fecha: 2026-02-17
-- ==============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ---------------------------------------------------------------------
-- Helpers de contexto (company/role) con fallback para entornos sin auth
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_current_company_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_claims JSONB;
  v_company TEXT;
BEGIN
  v_claims := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
  v_company := v_claims ->> 'company_id';

  IF v_company IS NULL OR v_company = '' THEN
    RETURN '00000000-0000-0000-0000-000000000001'::uuid;
  END IF;

  RETURN v_company::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN '00000000-0000-0000-0000-000000000001'::uuid;
END;
$$;

CREATE OR REPLACE FUNCTION app_current_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_claims JSONB;
  v_role TEXT;
BEGIN
  v_claims := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
  v_role := COALESCE(v_claims ->> 'role', 'ADMIN');
  RETURN UPPER(v_role);
EXCEPTION WHEN OTHERS THEN
  RETURN 'ADMIN';
END;
$$;

-- ---------------------------------------------------------------------
-- Enum de tipos de nodo
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'node_type_enum') THEN
    CREATE TYPE node_type_enum AS ENUM (
      'EQUIPO',
      'SISTEMA',
      'SUBSISTEMA',
      'CONJUNTO',
      'COMPONENTE',
      'PIEZA'
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- Plantillas por modelo
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS asset_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL DEFAULT app_current_company_id(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  model_year INTEGER,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT REFERENCES app_users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_asset_templates_code UNIQUE (company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_asset_templates_company ON asset_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_asset_templates_brand_model ON asset_templates(company_id, brand, model, model_year);

-- ---------------------------------------------------------------------
-- Nodos de estructura (Template o Asset, XOR)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS asset_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL DEFAULT app_current_company_id(),

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
    setweight(to_tsvector('simple', coalesce(part_number, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B')
  ) STORED,

  created_by BIGINT REFERENCES app_users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_asset_nodes_scope_xor CHECK (num_nonnulls(template_id, asset_id) = 1)
);

-- Índices requeridos
CREATE INDEX IF NOT EXISTS idx_asset_nodes_company_asset_parent
  ON asset_nodes(company_id, asset_id, parent_id);

CREATE INDEX IF NOT EXISTS idx_asset_nodes_company_template_parent
  ON asset_nodes(company_id, template_id, parent_id);

CREATE INDEX IF NOT EXISTS idx_asset_nodes_search
  ON asset_nodes USING GIN(search_vector);

-- Evitar duplicados por nivel (misma jerarquía + mismo nombre)
CREATE UNIQUE INDEX IF NOT EXISTS uq_asset_nodes_template_level_name
  ON asset_nodes (
    company_id,
    template_id,
    COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(name)
  )
  WHERE template_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_asset_nodes_asset_level_name
  ON asset_nodes (
    company_id,
    asset_id,
    COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(name)
  )
  WHERE asset_id IS NOT NULL;

-- OT asociada a nodo técnico
ALTER TABLE work_orders
ADD COLUMN IF NOT EXISTS asset_node_id UUID REFERENCES asset_nodes(id);

CREATE INDEX IF NOT EXISTS idx_work_orders_asset_node_id
  ON work_orders(asset_node_id);

-- ---------------------------------------------------------------------
-- Validaciones de árbol (jerarquía, scope, ciclo)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION node_type_level(p_type node_type_enum)
RETURNS INTEGER
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE p_type
    WHEN 'EQUIPO' THEN 1
    WHEN 'SISTEMA' THEN 2
    WHEN 'SUBSISTEMA' THEN 3
    WHEN 'CONJUNTO' THEN 4
    WHEN 'COMPONENTE' THEN 5
    WHEN 'PIEZA' THEN 6
  END;
$$;

CREATE OR REPLACE FUNCTION trg_asset_nodes_validate()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  p asset_nodes;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    SELECT * INTO p FROM asset_nodes WHERE id = NEW.parent_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'parent_id % no existe', NEW.parent_id;
    END IF;

    IF p.company_id <> NEW.company_id THEN
      RAISE EXCEPTION 'parent.company_id distinto a child.company_id';
    END IF;

    IF COALESCE(p.template_id, '00000000-0000-0000-0000-000000000000'::uuid)
       <> COALESCE(NEW.template_id, '00000000-0000-0000-0000-000000000000'::uuid)
       OR
       COALESCE(p.asset_id, '00000000-0000-0000-0000-000000000000'::uuid)
       <> COALESCE(NEW.asset_id, '00000000-0000-0000-0000-000000000000'::uuid)
    THEN
      RAISE EXCEPTION 'parent y child deben pertenecer al mismo scope (template o asset)';
    END IF;

    IF node_type_level(NEW.node_type) <> node_type_level(p.node_type) + 1 THEN
      RAISE EXCEPTION 'Jerarquía inválida: % no puede colgar de %', NEW.node_type, p.node_type;
    END IF;
  ELSE
    IF NEW.node_type <> 'EQUIPO' THEN
      RAISE EXCEPTION 'Nodo raíz debe ser EQUIPO';
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

-- ---------------------------------------------------------------------
-- RPC: clone_template_to_asset(template_id, asset_id)
-- ---------------------------------------------------------------------
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
  v_company_id UUID := app_current_company_id();
  v_count INTEGER := 0;
BEGIN
  -- Reemplazar estructura previa del equipo para evitar duplicados por nivel
  DELETE FROM asset_nodes
  WHERE company_id = v_company_id
    AND asset_id = p_asset_id;

  CREATE TEMP TABLE tmp_node_map(
    src_id UUID PRIMARY KEY,
    dst_id UUID NOT NULL
  ) ON COMMIT DROP;

  FOR r IN
    WITH RECURSIVE t AS (
      SELECT
        n.id,
        n.parent_id,
        n.node_type,
        n.sort_order,
        n.name,
        n.description,
        n.part_number,
        1 AS depth
      FROM asset_nodes n
      WHERE n.company_id = v_company_id
        AND n.template_id = p_template_id
        AND n.parent_id IS NULL

      UNION ALL

      SELECT
        c.id,
        c.parent_id,
        c.node_type,
        c.sort_order,
        c.name,
        c.description,
        c.part_number,
        t.depth + 1
      FROM asset_nodes c
      JOIN t ON c.parent_id = t.id
      WHERE c.company_id = v_company_id
        AND c.template_id = p_template_id
    )
    SELECT *
    FROM t
    ORDER BY depth, sort_order, name
  LOOP
    IF r.parent_id IS NULL THEN
      v_parent_new := NULL;
    ELSE
      SELECT dst_id INTO v_parent_new
      FROM tmp_node_map
      WHERE src_id = r.parent_id;
    END IF;

    INSERT INTO asset_nodes (
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
      v_company_id,
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

    INSERT INTO tmp_node_map(src_id, dst_id)
    VALUES (r.id, v_new_id);

    v_count := v_count + 1;
  END LOOP;

  RETURN QUERY SELECT v_count;
END;
$$;

-- ---------------------------------------------------------------------
-- RPC: bulk_clone_template_to_assets(template_id, asset_ids[])
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION bulk_clone_template_to_assets(
  p_template_id UUID,
  p_asset_ids UUID[]
)
RETURNS TABLE(asset_id UUID, inserted_count INTEGER, ok BOOLEAN, error_text TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_asset_id UUID;
  v_inserted_count INTEGER;
BEGIN
  FOREACH v_asset_id IN ARRAY p_asset_ids LOOP
    BEGIN
      SELECT inserted_count
      INTO v_inserted_count
      FROM clone_template_to_asset(p_template_id, v_asset_id);

      RETURN QUERY SELECT v_asset_id, COALESCE(v_inserted_count, 0), TRUE, NULL::TEXT;
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT v_asset_id, 0, FALSE, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------
-- RPC: get_children(asset_id/template_id, parent_id, search)
-- Lazy loading por parent_id
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_children(
  p_asset_id UUID DEFAULT NULL,
  p_template_id UUID DEFAULT NULL,
  p_parent_id UUID DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 200
)
RETURNS TABLE(
  id UUID,
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
    WHERE n.company_id = app_current_company_id()
      AND (
        (p_asset_id IS NOT NULL AND n.asset_id = p_asset_id AND p_template_id IS NULL)
        OR
        (p_template_id IS NOT NULL AND n.template_id = p_template_id AND p_asset_id IS NULL)
      )
  )
  SELECT
    n.id,
    n.parent_id,
    n.node_type,
    n.sort_order,
    n.name,
    n.description,
    n.part_number,
    EXISTS (
      SELECT 1
      FROM scoped c
      WHERE c.parent_id = n.id
    ) AS has_children
  FROM scoped n
  WHERE (
      p_search IS NOT NULL
      AND p_search <> ''
      AND (
        n.search_vector @@ websearch_to_tsquery('simple', p_search)
        OR n.part_number ILIKE '%' || p_search || '%'
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
  LIMIT p_limit;
$$;

-- ---------------------------------------------------------------------
-- RLS por company_id + rol
-- ---------------------------------------------------------------------
ALTER TABLE asset_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_nodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS asset_templates_select_company ON asset_templates;
CREATE POLICY asset_templates_select_company
ON asset_templates
FOR SELECT
USING (company_id = app_current_company_id());

DROP POLICY IF EXISTS asset_templates_write_company ON asset_templates;
CREATE POLICY asset_templates_write_company
ON asset_templates
FOR ALL
USING (
  company_id = app_current_company_id()
  AND app_current_role() IN ('ADMIN', 'CMMS_PLANNER', 'SUPERVISOR', 'TALLER')
)
WITH CHECK (
  company_id = app_current_company_id()
  AND app_current_role() IN ('ADMIN', 'CMMS_PLANNER', 'SUPERVISOR', 'TALLER')
);

DROP POLICY IF EXISTS asset_nodes_select_company ON asset_nodes;
CREATE POLICY asset_nodes_select_company
ON asset_nodes
FOR SELECT
USING (company_id = app_current_company_id());

DROP POLICY IF EXISTS asset_nodes_write_company ON asset_nodes;
CREATE POLICY asset_nodes_write_company
ON asset_nodes
FOR ALL
USING (
  company_id = app_current_company_id()
  AND app_current_role() IN ('ADMIN', 'CMMS_PLANNER', 'SUPERVISOR', 'TALLER')
)
WITH CHECK (
  company_id = app_current_company_id()
  AND app_current_role() IN ('ADMIN', 'CMMS_PLANNER', 'SUPERVISOR', 'TALLER')
);

COMMENT ON TABLE asset_templates IS 'Plantillas técnicas por marca/modelo para clonado a equipos';
COMMENT ON TABLE asset_nodes IS 'Nodos jerárquicos de estructura técnica (template o asset)';
COMMENT ON COLUMN asset_nodes.search_vector IS 'Índice FTS para búsqueda por nombre/part_number/description';

NOTIFY pgrst, 'reload schema';
