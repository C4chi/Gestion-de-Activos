# 📋 PLAZO DE RESOLUCIÓN EN REPORTES HSE

## Descripción
Se ha agregado un nuevo campo **"Plazo de Resolución"** a los reportes de seguridad (HSE). Este campo permite especificar el tiempo máximo permitido para resolver cada reporte.

## Opciones Disponibles
- **24 horas** ⏱️ - Para incidentes críticos
- **48 horas** ⏱️ - Para incidentes de prioridad media
- **72 horas** ⏱️ - Para incidentes de prioridad baja

## Dónde Se Usa

### 1. Crear Nuevo Reporte
Cuando creas un nuevo reporte HSE, aparecerá una sección "Plazo de Resolución" con 3 botones:
- Selecciona el plazo que consideres apropiado
- El valor por defecto es **24 horas**

### 2. Ver Detalles del Reporte
En el modal de detalles, verás el plazo resaltado en azul:
```
⏱️ Plazo de resolución: 24 horas
```

### 3. Descargar PDF
El plazo aparece en la tarjeta de información del PDF, mostrando claramente el tiempo límite de resolución.

## Base de Datos
- **Tabla**: `safety_reports`
- **Campo**: `plazo_horas` (INTEGER)
- **Valores válidos**: 24, 48, 72
- **Valor por defecto**: 24

## Integración
- ✅ Formulario de creación (SafetyFormModal.jsx)
- ✅ Vista de detalles (SafetyReportDetail.jsx)
- ✅ Generación de PDF
- ✅ Hook de workflow (useSafetyWorkflow.js)

## Migración Supabase
Si la tabla ya existe, ejecuta el archivo:
```
MIGRATION_PLAZO_HORAS.sql
```

Este script agregará la columna automáticamente sin perder datos existentes.
