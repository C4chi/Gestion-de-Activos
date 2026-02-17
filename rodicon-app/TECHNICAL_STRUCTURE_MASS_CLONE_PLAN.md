# Plan de Clonación Masiva – Estructura Técnica

## Objetivo
Asignar y clonar automáticamente la plantilla correcta a cada activo (`assets`) con esta prioridad:
1. Plantilla **específica** por `marca + modelo` exactos normalizados.
2. Si no hay específica, plantilla **genérica** por `tipo` normalizado.

## Precondiciones
- Ejecutar `MIGRATION_TECHNICAL_STRUCTURE_IMPLEMENTATION.sql`.
- Tener nodos cargados en los templates de `asset_nodes`.

## Paso 1: Validar match esperado sin clonar
```sql
select * from map_all_assets_to_templates(false);
```
- `strategy = SPECIFICA` cuando coincide marca/modelo exacto.
- `strategy = GENERICA` cuando cae a fallback por tipo.
- `template_id = null` si no hay plantilla para ese activo.

## Paso 2: Corregir tipos no mapeados
- Revisar `assets.tipo` y normalizar nombres para que calcen con `asset_type_key`.
- Ejemplo: `Camión Volteo` -> `CAMIONVOLTEO` (normalizado por función `ts_norm`).

## Paso 3: Ejecutar clonación masiva real
```sql
select * from map_all_assets_to_templates(true);
```
Esto:
- Guarda asignación en `asset_template_assignments`.
- Clona árbol de `asset_nodes` de plantilla al activo.

## Paso 4: Auditoría rápida
```sql
-- Activos con plantilla asignada
select count(*) from asset_template_assignments;

-- Cantidad de nodos por activo
select asset_id, count(*)
from asset_nodes
where asset_id is not null
group by asset_id
order by count(*) desc;

-- Activos sin asignación
select a.id, a.ficha, a.marca, a.modelo, a.tipo
from assets a
left join asset_template_assignments ata on ata.asset_id = a.id
where ata.asset_id is null
order by a.ficha;
```

## Clonar una plantilla puntual a varios activos
```sql
select *
from bulk_clone_template(
  'TEMPLATE_UUID_AQUI',
  array['ASSET_UUID_1', 'ASSET_UUID_2', 'ASSET_UUID_3']::uuid[]
);
```

## Nota de negocio
La lógica es estricta para evitar mezclar modelos:
- 330 ≠ 330GC ≠ 330-7 ≠ 330NG
- 336 ≠ 336GC ≠ 336 UVG
