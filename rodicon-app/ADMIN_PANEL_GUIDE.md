# Panel de Administrador de Activos - Guía Rápida

## 🎯 Objetivo
Separar la creación simple de activos del panel de edición avanzada para administradores.

## 📋 Flujo

### 1. **Creación Rápida de Activos (Usuarios Normales)**
- Click en botón **"Nuevo Activo"** en el sidebar
- Campos obligatorios simples:
  - 📌 Ficha Técnica (identificador único)
  - 🔧 Tipo (lista predefinida)
  - 🏷️ Marca
  - 🚗 Modelo
  - 📅 Año
  - 🔢 Chasis (opcional)
- Después de crear, el activo queda con campos extras vacíos
- Tiempo estimado: **30 segundos**

### 2. **Edición Completa (Administrador)**
- Click en **"Administrador"** en el sidebar
- Se abre un panel con dos vistas:

#### Vista de Búsqueda y Selección
- Buscar por: Ficha, Marca, Modelo o Tipo
- Ver lista de todos los activos
- Click en **"Editar Detalles"** del activo deseado

#### Vista de Edición (Cuando selecciona un activo)
- Edita TODOS los campos:
  - Información básica (Tipo, Marca, Modelo, Año, Chasis)
  - 🚙 **Matrícula** - Placa del vehículo
  - ⚙️ **Estado** - DISPONIBLE / EN_MANTENIMIENTO / DAÑADO
  - 📍 **Ubicación Actual** - Taller, Almacén, etc.
  - 📅 **Vencimiento Seguro** - Fecha vencimiento póliza
  - 🔧 **Taller Responsable** - Quién lo mantiene
  - 📋 **Número de Requisición** - Ref. de compra
  - 📥 **Proyección Entrada** - Fecha esperada
  - 📤 **Proyección Salida** - Fecha salida
  - 📝 **Observaciones Mecánicas** - Notas técnicas

## ✨ Ventajas

| Aspecto | Beneficio |
|--------|----------|
| **Para usuarios** | Crear activos rápido sin información detallada |
| **Para admin** | Control total de todos los datos |
| **Separación** | Formulario simple vs. panel profesional |
| **Eficiencia** | No saturar con 15+ campos al crear |
| **Flexibilidad** | Completar datos después según necesidad |

## 🔑 Campos Editables Solo en Panel Admin

Estos campos NO aparecen en el formulario de creación rápida:

```
✅ Matrícula
✅ Ubicación Actual
✅ Fecha Vencimiento Seguro
✅ Taller Responsable
✅ Número de Requisición
✅ Proyección Entrada/Salida
✅ Observaciones Mecánicas
✅ Estado (solo visible aquí para cambios rápidos)
```

## 📱 Ubicación en la Interfaz

```
SIDEBAR (Izquierda)
├─ Taller
├─ HSE (Seguridad)
├─ Compras
├─ Métricas
└─ ⚙️ ADMINISTRADOR ← NUEVO BOTÓN
    └─ Panel completo de activos
```

## ⚙️ Detalles Técnicos

### Base de Datos (assets)
- **Tabla:** assets
- **Total campos:** 20+ (ficha, tipo, marca, modelo, año, chasis, matrícula, ubicación, status, etc.)
- **Campos obligatorios para creación:** ficha, tipo, marca, modelo, año

### Validaciones
- Ficha: Debe ser única
- Año: Entre 1900 y año actual + 1
- Todos los campos de texto: Máximo caracters según tipo
- Fechas: Formato ISO (YYYY-MM-DD)

## 🚀 Cómo Usar

### Crear un Activo Rápido
1. Click "Nuevo Activo"
2. Llena: Ficha, Tipo, Marca, Modelo, Año
3. Click "Crear Activo"
4. ¡Listo!

### Agregar Detalles Después
1. Click "Administrador"
2. Busca el activo por ficha
3. Click "Editar Detalles"
4. Completa los campos que necesites
5. Click "Guardar Cambios"

### Cambiar Estado Rápidamente
1. Administrador → Buscar → Editar
2. Campo "Estado" (DISPONIBLE/EN_MANTENIMIENTO/DAÑADO)
3. Guardar

## 💡 Tips

- Puedes editar un activo múltiples veces
- Los cambios se guardan en tiempo real en la BD
- Busca es case-insensitive (mayúsculas o minúsculas)
- Campos vacíos son permitidos (excepto ficha al crear)

## 🔒 Seguridad

- Solo usuarios autenticados ven el panel
- Cambios registran usuario y timestamp
- Historial de cambios guardado en updated_at

---

**Última actualización:** 10 de Diciembre de 2025
**Versión:** 1.0 - Panel de Administrador de Activos
