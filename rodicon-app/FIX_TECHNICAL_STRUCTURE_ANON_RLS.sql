-- ============================================================================
-- FIX_TECHNICAL_STRUCTURE_ANON_RLS.sql
-- Objetivo: permitir uso del módulo Estructura Técnica con cliente anon + login PIN
-- Contexto: la app usa PIN interno (sin supabase.auth session JWT de negocio)
-- ============================================================================

-- 0) Evitar recursión RLS: current_company_context_id no debe consultar tablas con políticas
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

-- 1) Grants mínimos para RPC y tablas técnicas
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE asset_templates TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE asset_nodes TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE asset_template_assignments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE asset_model_alias TO anon, authenticated;

GRANT EXECUTE ON FUNCTION get_children(UUID, UUID, UUID, TEXT, INTEGER, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_children(TEXT, UUID, UUID, TEXT, INTEGER, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION clone_template_to_asset(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION bulk_clone_template_to_assets(UUID, UUID[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION bulk_clone_template(UUID, UUID[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION assign_template_for_asset(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION assign_and_clone_all_assets() TO anon, authenticated;

-- 1.05) Hotfix: garantizar company_id no nulo al clonar template -> asset
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
    SELECT company_id INTO v_company FROM asset_templates WHERE id = p_template_id;
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

-- 1.1) Hotfix: evitar ambigüedad "inserted_count" en clonación masiva
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

CREATE OR REPLACE FUNCTION bulk_clone_template(
  p_template_id UUID,
  p_asset_ids UUID[]
)
RETURNS TABLE(asset_id UUID, inserted_count INTEGER, ok BOOLEAN, error_text TEXT)
LANGUAGE SQL
AS $$
  SELECT * FROM bulk_clone_template_to_assets(p_template_id, p_asset_ids);
$$;

-- 1.2) Hotfix: evitar ambigüedad de asset_id en assign_template_for_asset
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

-- 2) Políticas RLS adaptadas a cliente anon
--    Clave: usar current_company_context_id() para resolver company cuando no hay JWT.

DROP POLICY IF EXISTS asset_templates_read ON asset_templates;
CREATE POLICY asset_templates_read ON asset_templates
FOR SELECT
USING (
  auth.role() IN ('service_role', 'anon', 'authenticated')
  OR (
    is_read_role()
    AND COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(current_company_context_id(), '00000000-0000-0000-0000-000000000000'::uuid)
  )
);

DROP POLICY IF EXISTS asset_templates_write ON asset_templates;
CREATE POLICY asset_templates_write ON asset_templates
FOR ALL
USING (
  auth.role() IN ('service_role', 'anon', 'authenticated')
  OR (
    is_admin_role()
    AND COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(current_company_context_id(), '00000000-0000-0000-0000-000000000000'::uuid)
  )
)
WITH CHECK (
  auth.role() IN ('service_role', 'anon', 'authenticated')
  OR (
    is_admin_role()
    AND COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(current_company_context_id(), '00000000-0000-0000-0000-000000000000'::uuid)
  )
);

DROP POLICY IF EXISTS asset_nodes_read ON asset_nodes;
CREATE POLICY asset_nodes_read ON asset_nodes
FOR SELECT
USING (
  auth.role() IN ('service_role', 'anon', 'authenticated')
  OR (
    is_read_role()
    AND COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(current_company_context_id(), '00000000-0000-0000-0000-000000000000'::uuid)
  )
);

DROP POLICY IF EXISTS asset_nodes_write ON asset_nodes;
CREATE POLICY asset_nodes_write ON asset_nodes
FOR ALL
USING (
  auth.role() IN ('service_role', 'anon', 'authenticated')
  OR (
    is_admin_role()
    AND COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(current_company_context_id(), '00000000-0000-0000-0000-000000000000'::uuid)
  )
)
WITH CHECK (
  auth.role() IN ('service_role', 'anon', 'authenticated')
  OR (
    is_admin_role()
    AND COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(current_company_context_id(), '00000000-0000-0000-0000-000000000000'::uuid)
  )
);

DROP POLICY IF EXISTS ata_read ON asset_template_assignments;
CREATE POLICY ata_read ON asset_template_assignments
FOR SELECT
USING (
  auth.role() IN ('service_role', 'anon', 'authenticated')
  OR (
    is_read_role()
    AND COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(current_company_context_id(), '00000000-0000-0000-0000-000000000000'::uuid)
  )
);

DROP POLICY IF EXISTS ata_write ON asset_template_assignments;
CREATE POLICY ata_write ON asset_template_assignments
FOR ALL
USING (
  auth.role() IN ('service_role', 'anon', 'authenticated')
  OR (
    is_admin_role()
    AND COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(current_company_context_id(), '00000000-0000-0000-0000-000000000000'::uuid)
  )
)
WITH CHECK (
  auth.role() IN ('service_role', 'anon', 'authenticated')
  OR (
    is_admin_role()
    AND COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(current_company_context_id(), '00000000-0000-0000-0000-000000000000'::uuid)
  )
);

NOTIFY pgrst, 'reload schema';
