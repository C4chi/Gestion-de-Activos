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
