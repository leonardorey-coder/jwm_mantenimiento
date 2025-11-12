-- Esquema de base de datos (PostgreSQL)
-- Exportado el: 2025-11-11
-- Proyecto: JW Mantto - Sistema de mantenimiento de cuartos

-- Base de datos para sistema de mantenimiento de cuartos
-- JW Marriott Maintenance - PostgreSQL Version

-- Eliminar tablas si existen (en orden inverso por dependencias)
DROP TABLE IF EXISTS mantenimientos CASCADE;
DROP TABLE IF EXISTS cuartos CASCADE;
DROP TABLE IF EXISTS edificios CASCADE;

-- Tabla de edificios
CREATE TABLE edificios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para búsquedas por nombre
CREATE INDEX idx_edificios_nombre ON edificios(nombre);

-- Tabla de cuartos
CREATE TABLE cuartos (
    id SERIAL PRIMARY KEY,
    numero VARCHAR(100) NOT NULL,
    edificio_id INTEGER NOT NULL,
    descripcion TEXT,
    estado VARCHAR(50) DEFAULT 'disponible',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (edificio_id) REFERENCES edificios(id) ON DELETE CASCADE,
    UNIQUE (numero, edificio_id)
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_cuartos_edificio ON cuartos(edificio_id);
CREATE INDEX idx_cuartos_estado ON cuartos(estado);
CREATE INDEX idx_cuartos_numero ON cuartos(numero);

-- Tabla de mantenimientos
CREATE TABLE mantenimientos (
    id SERIAL PRIMARY KEY,
    cuarto_id INTEGER NOT NULL,
    descripcion TEXT NOT NULL,
    tipo VARCHAR(50) DEFAULT 'normal' CHECK (tipo IN ('normal', 'rutina')),
    estado VARCHAR(50) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_proceso', 'completado', 'cancelado')),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_programada DATE,
    hora TIME,
    dia_alerta INTEGER,
    alerta_emitida BOOLEAN DEFAULT FALSE,
    usuario_creador VARCHAR(100) DEFAULT 'sistema',
    notas TEXT,
    FOREIGN KEY (cuarto_id) REFERENCES cuartos(id) ON DELETE CASCADE
);

-- Índices para optimizar consultas frecuentes
CREATE INDEX idx_mantenimientos_cuarto ON mantenimientos(cuarto_id);
CREATE INDEX idx_mantenimientos_tipo ON mantenimientos(tipo);
CREATE INDEX idx_mantenimientos_estado ON mantenimientos(estado);
CREATE INDEX idx_mantenimientos_fecha_creacion ON mantenimientos(fecha_creacion DESC);
CREATE INDEX idx_mantenimientos_fecha_programada ON mantenimientos(fecha_programada);
CREATE INDEX idx_mantenimientos_alerta ON mantenimientos(dia_alerta, alerta_emitida) WHERE dia_alerta IS NOT NULL;

-- Comentarios para documentación
COMMENT ON TABLE edificios IS 'Edificios del hotel';
COMMENT ON TABLE cuartos IS 'Habitaciones y suites del hotel';
COMMENT ON TABLE mantenimientos IS 'Registros de mantenimiento programado y ejecutado';

COMMENT ON COLUMN mantenimientos.tipo IS 'Tipo de mantenimiento: normal (bajo demanda) o rutina (programado)';
COMMENT ON COLUMN mantenimientos.estado IS 'Estado del mantenimiento: pendiente, en_proceso, completado, cancelado';
COMMENT ON COLUMN mantenimientos.dia_alerta IS 'Día del mes para emitir alerta (1-31)';
COMMENT ON COLUMN mantenimientos.alerta_emitida IS 'Indica si la alerta del mes actual ya fue emitida';


