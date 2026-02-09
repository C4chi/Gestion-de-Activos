-- ============================================================
-- Configuración de Supabase Storage para fotos de activos
-- ============================================================
-- Solución: Crear políticas permisivas sin tocar tabla del sistema
-- ============================================================

-- Eliminar políticas previas si existen (evita conflictos)
DROP POLICY IF EXISTS "allow_public_read" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_delete" ON storage.objects;
DROP POLICY IF EXISTS "allow_public_read_asset_photos" ON storage.objects;
DROP POLICY IF EXISTS "allow_auth_upload_asset_photos" ON storage.objects;
DROP POLICY IF EXISTS "allow_auth_delete_asset_photos" ON storage.objects;
DROP POLICY IF EXISTS "allow_auth_update_asset_photos" ON storage.objects;
DROP POLICY IF EXISTS "public_read_asset_photos" ON storage.objects;
DROP POLICY IF EXISTS "public_insert_asset_photos" ON storage.objects;
DROP POLICY IF EXISTS "public_update_asset_photos" ON storage.objects;
DROP POLICY IF EXISTS "public_delete_asset_photos" ON storage.objects;

-- Crear políticas permisivas SOLO para el bucket asset-photos
CREATE POLICY "asset_photos_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'asset-photos');

CREATE POLICY "asset_photos_insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'asset-photos');

CREATE POLICY "asset_photos_update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'asset-photos')
WITH CHECK (bucket_id = 'asset-photos');

CREATE POLICY "asset_photos_delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'asset-photos');
