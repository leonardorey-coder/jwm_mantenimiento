-- Schema Proposal for Checklist Module
-- Based on mock data requirements and existing schema structure

-- el orden de aparición se manejará con el id de la tabla

-- 1. Catalog of Checklist Items (Templates)
-- Defines the standard items that should be checked for each room/area
CREATE TABLE IF NOT EXISTS checklist_catalog_items (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    categoria VARCHAR(50) NOT NULL, -- 'climatizacion', 'electronica', 'mobiliario', etc.
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Checklists (Instances)
-- Represents a specific inspection event for a room
CREATE TABLE IF NOT EXISTS room_checklists (
    id SERIAL PRIMARY KEY,
    cuarto_id INTEGER REFERENCES cuartos(id),
    usuario_id INTEGER REFERENCES usuarios(id), -- Inspector
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(20) DEFAULT 'pendiente', -- 'pendiente', 'completado', 'en_progreso', 'cancelado'
    observaciones_generales TEXT
);

-- 3. Checklist Item Results
-- The actual result of checking an item in a specific inspection
CREATE TABLE IF NOT EXISTS room_checklist_results (
    id SERIAL PRIMARY KEY,
    checklist_id INTEGER REFERENCES room_checklists(id) ON DELETE CASCADE,
    catalog_item_id INTEGER REFERENCES checklist_catalog_items(id),
    nombre_snapshot VARCHAR(100), -- Copy of name in case catalog changes
    categoria_snapshot VARCHAR(50), -- Copy of category
    estado VARCHAR(20) NOT NULL DEFAULT 'bueno', -- 'bueno', 'regular', 'malo'
    observacion TEXT, -- Details if state is not 'bueno'
    foto_url TEXT, -- Optional evidence
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initial Data Population (based on checklist-tab.js)
INSERT INTO checklist_catalog_items (nombre, categoria) VALUES
('Aire acondicionado', 'climatizacion'),
('Calefacción', 'climatizacion'),
('Ventilación', 'climatizacion'),
('Televisión', 'electronica'),
('Teléfono', 'electronica'),
('Control remoto', 'electronica'),
('Iluminación', 'electronica'),
('Sofá', 'mobiliario'),
('Cama', 'mobiliario'),
('Closet', 'mobiliario'),
('Mesa de noche', 'mobiliario'),
('Silla', 'mobiliario'),
('Baño', 'sanitarios'),
('Regadera', 'sanitarios'),
('Lavabo', 'sanitarios'),
('Inodoro', 'sanitarios'),
('Minibar', 'amenidades'),
('Caja fuerte', 'amenidades'),
('Cafetera', 'amenidades'),
('Ventanas', 'estructura'),
('Cortinas', 'estructura'),
('Puertas', 'estructura'),
('Pisos', 'estructura');
