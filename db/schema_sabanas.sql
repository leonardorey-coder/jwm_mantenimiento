-- ====================================
-- ESQUEMA DE SÁBANAS DE SERVICIOS
-- Sistema de Control de Servicios por Habitación
-- ====================================

-- Tabla principal de sábanas
CREATE TABLE IF NOT EXISTS sabanas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    servicio_id VARCHAR(100) NOT NULL,
    servicio_nombre VARCHAR(200) NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_archivado TIMESTAMP DEFAULT NULL,
    archivada BOOLEAN DEFAULT FALSE,
    total_items INTEGER DEFAULT 0,
    items_completados INTEGER DEFAULT 0,
    progreso_porcentaje DECIMAL(5,2) DEFAULT 0.00,
    usuario_creador_id INTEGER REFERENCES usuarios(id),
    notas TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_sabanas_archivada ON sabanas(archivada);
CREATE INDEX IF NOT EXISTS idx_sabanas_servicio_id ON sabanas(servicio_id);
CREATE INDEX IF NOT EXISTS idx_sabanas_fecha_creacion ON sabanas(fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS idx_sabanas_usuario_creador ON sabanas(usuario_creador_id);

-- Tabla de items individuales de cada sábana
CREATE TABLE IF NOT EXISTS sabanas_items (
    id SERIAL PRIMARY KEY,
    sabana_id INTEGER NOT NULL REFERENCES sabanas(id) ON DELETE CASCADE,
    cuarto_id INTEGER NOT NULL REFERENCES cuartos(id) ON DELETE CASCADE,
    habitacion VARCHAR(100) NOT NULL,
    edificio VARCHAR(100) NOT NULL,
    edificio_id INTEGER REFERENCES edificios(id),
    fecha_programada DATE NOT NULL,
    fecha_realizado TIMESTAMP DEFAULT NULL,
    responsable VARCHAR(200) DEFAULT NULL,
    usuario_responsable_id INTEGER REFERENCES usuarios(id),
    observaciones TEXT DEFAULT NULL,
    realizado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimizar consultas de items
CREATE INDEX IF NOT EXISTS idx_sabanas_items_sabana_id ON sabanas_items(sabana_id);
CREATE INDEX IF NOT EXISTS idx_sabanas_items_cuarto_id ON sabanas_items(cuarto_id);
CREATE INDEX IF NOT EXISTS idx_sabanas_items_realizado ON sabanas_items(realizado);
CREATE INDEX IF NOT EXISTS idx_sabanas_items_fecha_realizado ON sabanas_items(fecha_realizado);
CREATE INDEX IF NOT EXISTS idx_sabanas_items_edificio_id ON sabanas_items(edificio_id);

-- Trigger para actualizar progreso de la sábana automáticamente
CREATE OR REPLACE FUNCTION actualizar_progreso_sabana()
RETURNS TRIGGER AS $$
DECLARE
    total INTEGER;
    completados INTEGER;
    progreso DECIMAL(5,2);
BEGIN
    -- Contar total y completados
    SELECT COUNT(*), COUNT(*) FILTER (WHERE realizado = TRUE)
    INTO total, completados
    FROM sabanas_items
    WHERE sabana_id = COALESCE(NEW.sabana_id, OLD.sabana_id);
    
    -- Calcular porcentaje
    IF total > 0 THEN
        progreso := (completados::DECIMAL / total::DECIMAL) * 100;
    ELSE
        progreso := 0.00;
    END IF;
    
    -- Actualizar la sábana
    UPDATE sabanas
    SET 
        total_items = total,
        items_completados = completados,
        progreso_porcentaje = progreso,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = COALESCE(NEW.sabana_id, OLD.sabana_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para INSERT, UPDATE y DELETE en sabanas_items
DROP TRIGGER IF EXISTS trigger_actualizar_progreso_sabana_insert ON sabanas_items;
CREATE TRIGGER trigger_actualizar_progreso_sabana_insert
    AFTER INSERT ON sabanas_items
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_progreso_sabana();

DROP TRIGGER IF EXISTS trigger_actualizar_progreso_sabana_update ON sabanas_items;
CREATE TRIGGER trigger_actualizar_progreso_sabana_update
    AFTER UPDATE ON sabanas_items
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_progreso_sabana();

DROP TRIGGER IF EXISTS trigger_actualizar_progreso_sabana_delete ON sabanas_items;
CREATE TRIGGER trigger_actualizar_progreso_sabana_delete
    AFTER DELETE ON sabanas_items
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_progreso_sabana();

-- Trigger para actualizar timestamp updated_at
DROP TRIGGER IF EXISTS trigger_sabanas_updated_at ON sabanas;
CREATE TRIGGER trigger_sabanas_updated_at
    BEFORE UPDATE ON sabanas
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

DROP TRIGGER IF EXISTS trigger_sabanas_items_updated_at ON sabanas_items;
CREATE TRIGGER trigger_sabanas_items_updated_at
    BEFORE UPDATE ON sabanas_items
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE sabanas IS 'Tabla principal de sábanas de servicios';
COMMENT ON TABLE sabanas_items IS 'Items individuales (habitaciones) de cada sábana';
COMMENT ON COLUMN sabanas.archivada IS 'Indica si la sábana está archivada (solo lectura)';
COMMENT ON COLUMN sabanas.progreso_porcentaje IS 'Porcentaje de items completados (0-100)';
COMMENT ON COLUMN sabanas_items.realizado IS 'Indica si el servicio se realizó en esta habitación';
COMMENT ON COLUMN sabanas_items.usuario_responsable_id IS 'Usuario que marcó el item como realizado';

-- Insertar datos de ejemplo (opcional, comentado por defecto)
-- INSERT INTO sabanas (nombre, servicio_id, servicio_nombre, usuario_creador_id)
-- VALUES ('Cambio de Chapas - Noviembre 2025', 'cambio_chapas', 'Cambio de Chapas', 1);

COMMENT ON SCHEMA public IS 'Esquema actualizado con soporte para sábanas de servicios';

