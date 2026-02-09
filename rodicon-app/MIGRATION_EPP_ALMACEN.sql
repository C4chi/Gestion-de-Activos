-- ========================================
-- MIGRACIÓN: Sistema de EPP y Almacén
-- ========================================

-- 0.5. Tabla: Almacenes
CREATE TABLE IF NOT EXISTS epp_almacenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL UNIQUE,
  ubicacion VARCHAR(255),
  responsable VARCHAR(255),
  telefono VARCHAR(20),
  email VARCHAR(255),
  activo BOOLEAN DEFAULT true,
  creado_at TIMESTAMP DEFAULT now()
);

-- 1. Tabla: Catálogo de EPP
CREATE TABLE IF NOT EXISTS epp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL UNIQUE,
  categoria VARCHAR(100) NOT NULL,
  descripcion TEXT,
  imagen_url TEXT,
  caracteristicas TEXT,
  cantidad_minima INT DEFAULT 5,
  activo BOOLEAN DEFAULT true,
  creado_at TIMESTAMP DEFAULT now(),
  actualizado_at TIMESTAMP DEFAULT now()
);

-- 2. Tabla: Stock de EPP por almacén
CREATE TABLE IF NOT EXISTS epp_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epp_id UUID NOT NULL REFERENCES epp(id) ON DELETE CASCADE,
  almacen_id UUID NOT NULL REFERENCES epp_almacenes(id) ON DELETE CASCADE,
  cantidad INT DEFAULT 0,
  actualizado_at TIMESTAMP DEFAULT now(),
  UNIQUE(epp_id, almacen_id)
);

-- 3. Tabla: Movimientos de inventario (Entradas/Salidas)
CREATE TABLE IF NOT EXISTS epp_movimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epp_id UUID NOT NULL REFERENCES epp(id) ON DELETE CASCADE,
  almacen_id UUID NOT NULL REFERENCES epp_almacenes(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ENTRADA', 'SALIDA', 'TRANSFERENCIA')), -- ENTRADA, SALIDA o TRANSFERENCIA
  cantidad INT NOT NULL,
  cantidad_anterior INT,
  cantidad_nueva INT,
  almacen_destino_id UUID REFERENCES epp_almacenes(id), -- Solo para transferencias
  fecha DATE DEFAULT CURRENT_DATE,
  observaciones TEXT,
  usuario_id UUID REFERENCES auth.users(id),
  creado_at TIMESTAMP DEFAULT now()
);

-- 4. Tabla: Empleados (sin acceso al sistema)
CREATE TABLE IF NOT EXISTS empleados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  apellido VARCHAR(255),
  cedula VARCHAR(50) UNIQUE,
  puesto VARCHAR(100),
  departamento VARCHAR(100),
  activo BOOLEAN DEFAULT true,
  creado_at TIMESTAMP DEFAULT now()
);

-- 4. Tabla: Asignaciones de EPP (a activos O empleados)
CREATE TABLE IF NOT EXISTS epp_asignaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epp_id UUID NOT NULL REFERENCES epp(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE, -- NULL si es para empleado
  empleado_id UUID REFERENCES empleados(id) ON DELETE CASCADE, -- NULL si es para activo
  empleado_nombre VARCHAR(255), -- Nombre libre si no existe en tabla empleados
  almacen_id UUID NOT NULL REFERENCES epp_almacenes(id),
  cantidad INT NOT NULL,
  fecha_asignacion DATE DEFAULT CURRENT_DATE,
  fecha_devolucion DATE, -- NULL si no ha sido devuelto
  estado VARCHAR(20) DEFAULT 'ASIGNADO' CHECK (estado IN ('ASIGNADO', 'DEVUELTO', 'PERDIDO', 'DAÑADO')),
  usuario_responsable_id UUID REFERENCES auth.users(id),
  observaciones TEXT,
  creado_at TIMESTAMP DEFAULT now(),
  CONSTRAINT check_asset_or_empleado CHECK (
    (asset_id IS NOT NULL AND empleado_id IS NULL AND empleado_nombre IS NULL) OR 
    (asset_id IS NULL AND (empleado_id IS NOT NULL OR empleado_nombre IS NOT NULL))
  )
);

-- Ajustes para instalaciones existentes
ALTER TABLE IF EXISTS epp_asignaciones
  ADD COLUMN IF NOT EXISTS empleado_nombre VARCHAR(255);
ALTER TABLE IF EXISTS epp_asignaciones
  DROP CONSTRAINT IF EXISTS check_asset_or_empleado;
ALTER TABLE IF EXISTS epp_asignaciones
  ADD CONSTRAINT check_asset_or_empleado CHECK (
    (asset_id IS NOT NULL AND empleado_id IS NULL AND empleado_nombre IS NULL) OR 
    (asset_id IS NULL AND (empleado_id IS NOT NULL OR empleado_nombre IS NOT NULL))
  );

-- 5. Tabla: Comprobantes de entrega de EPP
CREATE TABLE IF NOT EXISTS epp_entregas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asignacion_id UUID NOT NULL REFERENCES epp_asignaciones(id) ON DELETE CASCADE,
  fecha_entrega TIMESTAMP DEFAULT now(),
  firma_digital TEXT, -- Base64 o URL de imagen
  foto_comprobante_url TEXT, -- Foto de la entrega
  firma_responsable VARCHAR(255), -- Nombre de quien recibe
  observaciones TEXT,
  creado_at TIMESTAMP DEFAULT now()
);

-- 6. Tabla: Requisiciones de compra de EPP
CREATE TABLE IF NOT EXISTS epp_requisiciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epp_id UUID NOT NULL REFERENCES epp(id) ON DELETE CASCADE,
  almacen_id UUID NOT NULL REFERENCES epp_almacenes(id),
  cantidad_solicitada INT NOT NULL,
  cantidad_recibida INT,
  estado VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'RECIBIDA')),
  fecha_solicitud TIMESTAMP DEFAULT now(),
  fecha_aprobacion TIMESTAMP,
  fecha_recepcion TIMESTAMP,
  usuario_solicitante_id UUID REFERENCES auth.users(id),
  usuario_aprobador_id UUID REFERENCES auth.users(id),
  observaciones TEXT,
  creado_at TIMESTAMP DEFAULT now()
);

-- 7. Almacenes iniciales
INSERT INTO epp_almacenes (nombre, ubicacion, responsable) VALUES
  ('Almacén Principal', 'Barrick - Las Placetas', 'Gerente Almacén'),
  ('Almacén Taller', 'Taller - Santiago', 'Supervisor Taller'),
  ('Almacén HSE', 'Oficina Central - STO.DGO.', 'Coordinador HSE')
ON CONFLICT DO NOTHING;

-- Nota: Los EPP se crearán desde la app en la pestaña "⚙️ Crear EPP"
-- No hay catálogo base. Comienza vacío y agrega EPP según sea necesario.

-- ========================================
-- FIN DE LA MIGRACIÓN
-- ========================================

COMMIT;