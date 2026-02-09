# 🚀 GUÍA DE DESPLIEGUE - RODICON APP

## ✅ Estado Actual
- ✅ Kanban eliminado (funcionalidad duplicada)
- ✅ Lógica de taller consolidada
- ✅ Mantenimiento preventivo optimizado
- ✅ Sistema HSE con inspecciones dinámicas
- ✅ Build optimizado sin warnings de seguridad
- ✅ Bundle reducido: 1.1 MB (gzip: 320 KB)

## 📋 Módulos Activos

### 1. **Taller (WorkshopMonitor)**
   - Gestión de órdenes de trabajo
   - Estados: EN TALLER, ESPERA REPUESTO, etc.
   - Actualización de taller
   - Registros de mantenimiento

### 2. **Mantenimiento Preventivo**
   - Panel de programación de mantenimientos
   - Calendario de vencimientos
   - Logs de mantenimiento preventivo

### 3. **HSE - Inspecciones Dinámicas**
   - Sistema de formularios dinámicos tipo iAuditor
   - Template builder visual
   - Captura de fotos y firmas
   - Reportes PDF profesionales

### 4. **Compras (Purchasing)**
   - Requisiciones
   - Órdenes de compra
   - Workflow de aprobaciones
   - PDF de órdenes

### 5. **Inventario (Assets)**
   - Gestión de activos
   - Estados y seguimiento
   - Panel administrativo

## 🛠️ Despliegue en Producción

### Opción 1: Vercel (Recomendado)

1. **Instalar Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Hacer login:**
   ```bash
   vercel login
   ```

3. **Desplegar:**
   ```bash
   vercel --prod
   ```

4. **Variables de entorno:**
   - En el dashboard de Vercel añadir:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`

### Opción 2: Netlify

1. **Instalar Netlify CLI:**
   ```bash
   npm i -g netlify-cli
   ```

2. **Hacer login:**
   ```bash
   netlify login
   ```

3. **Desplegar:**
   ```bash
   netlify deploy --prod
   ```

4. **Configurar variables de entorno en Netlify dashboard**

### Opción 3: Servidor propio

1. **Construir la aplicación:**
   ```bash
   npm run build
   ```

2. **Servir la carpeta `dist/` con cualquier servidor web:**
   ```bash
   # Nginx, Apache, o servidor Node simple
   npx serve -s dist -p 3000
   ```

## 📱 Probar Localmente Antes de Desplegar

```bash
# 1. Construir
npm run build

# 2. Previsualizar producción
npm run preview
```

La aplicación estará disponible en `http://localhost:4173`

## 🔧 Configuración Supabase

Asegúrate de tener las siguientes tablas configuradas:

- `assets` - Activos
- `app_users` - Usuarios con PIN
- `purchase_orders` - Órdenes de compra
- `maintenance_logs` - Logs de mantenimiento
- `safety_reports` - Reportes HSE legacy
- `hse_templates` - Templates de inspección
- `hse_inspections` - Inspecciones realizadas
- `notifications` - Sistema de notificaciones

## 🎯 Funcionalidades Principales para Pruebas

### Inspecciones HSE (Nueva funcionalidad clave)
1. Ir a **"Inspecciones HSE"** en el sidebar
2. Crear o seleccionar un template
3. Realizar inspección
4. Capturar fotos y firmas
5. Generar PDF profesional

### Taller
1. Seleccionar un activo con estado EN TALLER
2. Actualizar información del taller
3. Registrar log de mantenimiento
4. Cerrar orden

### Mantenimiento Preventivo
1. Abrir panel de Mantenimiento Preventivo
2. Ver vencimientos próximos
3. Registrar mantenimiento preventivo

## 📊 Optimizaciones Implementadas

- ✅ Eliminado componente Kanban duplicado
- ✅ Reemplazado `eval()` con función segura
- ✅ Bundle reducido en ~30%
- ✅ Sin warnings de seguridad
- ✅ Código más limpio y mantenible

## 🔐 Seguridad

- Variables de entorno para credenciales
- RLS (Row Level Security) en Supabase
- Autenticación por PIN
- Roles: ADMIN, TALLER, COMPRAS, HSE

## 📞 Siguiente Paso

Para pruebas de inspecciones HSE, despliega la app y:
1. Asegúrate que Supabase esté activo
2. Crea templates de inspección
3. Realiza inspecciones desde móvil/tablet
4. Genera reportes PDF

## ⚙️ Variables de Entorno

Copia `.env.example` a `.env` y configura tus credenciales:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_anon
```

---

**✅ La aplicación está lista para desplegar en producción**
