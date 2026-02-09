-- Agregar TODOS los campos del Excel a la tabla assets
ALTER TABLE assets 
-- Modificar ficha para que sea nullable
ALTER COLUMN ficha DROP NOT NULL,
-- Agregar nuevas columnas
ADD COLUMN IF NOT EXISTS tipo VARCHAR(255),
ADD COLUMN IF NOT EXISTS marca VARCHAR(255),
ADD COLUMN IF NOT EXISTS modelo VARCHAR(255),
ADD COLUMN IF NOT EXISTS año INT,
ADD COLUMN IF NOT EXISTS chasis VARCHAR(255),
ADD COLUMN IF NOT EXISTS placa VARCHAR(255),
ADD COLUMN IF NOT EXISTS matricula VARCHAR(255),
ADD COLUMN IF NOT EXISTS color VARCHAR(255),
ADD COLUMN IF NOT EXISTS ubicacion_actual VARCHAR(255),
ADD COLUMN IF NOT EXISTS aseguradora VARCHAR(255),
ADD COLUMN IF NOT EXISTS numero_poliza VARCHAR(255),
ADD COLUMN IF NOT EXISTS fecha_vencimiento_seguro DATE,
ADD COLUMN IF NOT EXISTS gps VARCHAR(255),
ADD COLUMN IF NOT EXISTS señal_gps VARCHAR(255),
ADD COLUMN IF NOT EXISTS empresa VARCHAR(255),
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'DISPONIBLE',
ADD COLUMN IF NOT EXISTS paso_rapido VARCHAR(255),
ADD COLUMN IF NOT EXISTS observacion_mecanica TEXT,
ADD COLUMN IF NOT EXISTS observacion TEXT,
ADD COLUMN IF NOT EXISTS fecha_compra DATE,
ADD COLUMN IF NOT EXISTS valor_unitario DECIMAL(12,2);

-- Crear índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_assets_ficha ON assets(ficha);
CREATE INDEX IF NOT EXISTS idx_assets_placa ON assets(placa);
CREATE INDEX IF NOT EXISTS idx_assets_matricula ON assets(matricula);
CREATE INDEX IF NOT EXISTS idx_assets_aseguradora ON assets(aseguradora);
CREATE INDEX IF NOT EXISTS idx_assets_numero_poliza ON assets(numero_poliza);
CREATE INDEX IF NOT EXISTS idx_assets_empresa ON assets(empresa);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_ubicacion ON assets(ubicacion_actual);