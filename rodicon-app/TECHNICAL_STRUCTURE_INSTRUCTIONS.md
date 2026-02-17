# Estructura Técnica (CMMS/EAM) — Instrucciones de despliegue

## 1) Ejecutar migración principal
1. Abrir Supabase SQL Editor.
2. Ejecutar completo: `MIGRATION_TECHNICAL_STRUCTURE_IMPLEMENTATION.sql`.
3. Verificar que no hubo errores.

## 2) Ejecutar seed operativo
1. Ejecutar: `TECHNICAL_STRUCTURE_SEED.sql`.
2. Esto aplica alias iniciales, recalcula `brand_key/model_key` y corre asignación+clonado masivo.

## 3) Validaciones rápidas

### Conteos de templates
```sql
select template_kind, count(*)
from asset_templates
group by template_kind
order by template_kind;
```

### Assets sin template asignado
```sql
select a.id, a.type, a.brand_raw, a.model_raw
from assets a
left join asset_template_assignments ata on ata.asset_id = a.id
where coalesce(a.visible, true) = true
  and ata.asset_id is null;
```

### Assets con template pero sin árbol clonado
```sql
select ata.asset_id, ata.template_id
from asset_template_assignments ata
left join asset_nodes n on n.asset_id = ata.asset_id
where n.id is null;
```

### Prueba lazy loading (asset)
```sql
select *
from get_children('asset', '<ASSET_UUID>'::uuid, null, null, 100, 0);
```

### Prueba lazy loading (template)
```sql
select *
from get_children('template', '<TEMPLATE_UUID>'::uuid, null, null, 100, 0);
```

## 4) Uso operativo de RPC

### Asignar y clonar un activo
```sql
select * from assign_template_for_asset('<ASSET_UUID>'::uuid);
```

### Asignar y clonar toda la flota visible
```sql
select * from assign_and_clone_all_assets();
```

### Clonar manualmente un template a varios assets
```sql
select *
from bulk_clone_template_to_assets(
  '<TEMPLATE_UUID>'::uuid,
  array['<ASSET_UUID_1>'::uuid, '<ASSET_UUID_2>'::uuid]
);
```

## 5) Mantenimiento de alias
- Tabla: `asset_model_alias`.
- Regla: si existe alias activo para (`brand_raw`, `model_raw`), ese canonical gana sobre normalización automática.
- Después de cambios masivos de alias, ejecutar:
```sql
update assets a
set
  brand_canonical = x.brand_canonical,
  model_canonical = x.model_canonical,
  brand_key = x.brand_key,
  model_key = x.model_key,
  updated_at = now()
from lateral canonicalize_brand_model(a.company_id, coalesce(a.brand_raw, a.marca), coalesce(a.model_raw, a.modelo)) x;
```

## 6) Nota de no-mezcla de modelos
La asignación específica usa `brand_key + model_key + equipment_type`.
Esto evita mezclar variantes críticas (ej. `330`, `330 GC`, `330-7`, `330NG`; `D-MAX` vs `DMAX`).
