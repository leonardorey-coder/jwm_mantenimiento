-- ============================================
-- Migración: Schema para módulo de Checklist
-- Fecha: 2025-11-27
-- Descripción: Crea las tablas necesarias para el módulo de checklist de inspecciones
-- ============================================

-- 1. Tabla de Categorías del Catálogo de Checklist
-- Define las categorías disponibles para los ítems del checklist
CREATE TABLE IF NOT EXISTS checklist_categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE,
    icono VARCHAR(50) DEFAULT 'fa-layer-group',
    activo BOOLEAN DEFAULT TRUE,
    orden INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Catálogo de Ítems de Checklist (Templates)
-- Define los ítems estándar que deben ser verificados para cada cuarto/área
CREATE TABLE IF NOT EXISTS checklist_catalog_items (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    categoria_id INTEGER REFERENCES checklist_categorias(id) ON DELETE SET NULL,
    activo BOOLEAN DEFAULT TRUE,
    orden INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Checklists (Instancias de inspección)
-- Representa un evento específico de inspección para un cuarto
CREATE TABLE IF NOT EXISTS room_checklists (
    id SERIAL PRIMARY KEY,
    cuarto_id INTEGER REFERENCES cuartos(id) ON DELETE CASCADE,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_progreso', 'completado', 'cancelado')),
    observaciones_generales TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Resultados de Ítems del Checklist
-- El resultado real de verificar un ítem en una inspección específica
CREATE TABLE IF NOT EXISTS room_checklist_results (
    id SERIAL PRIMARY KEY,
    cuarto_id INTEGER REFERENCES cuartos(id) ON DELETE CASCADE,
    catalog_item_id INTEGER REFERENCES checklist_catalog_items(id) ON DELETE CASCADE,
    nombre_snapshot VARCHAR(100), -- Copia del nombre por si el catálogo cambia
    categoria_id INTEGER REFERENCES checklist_categorias(id) ON DELETE SET NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'bueno' CHECK (estado IN ('bueno', 'regular', 'malo')),
    observacion TEXT,
    foto_url TEXT,
    ultimo_editor_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cuarto_id, catalog_item_id)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_checklist_results_cuarto ON room_checklist_results(cuarto_id);
CREATE INDEX IF NOT EXISTS idx_checklist_results_estado ON room_checklist_results(estado);
CREATE INDEX IF NOT EXISTS idx_checklist_catalog_categoria ON checklist_catalog_items(categoria_id);

-- ============================================
-- Datos iniciales: Categorías
-- ============================================
INSERT INTO checklist_categorias (nombre, slug, icono, orden) VALUES
('Climatización', 'climatizacion', 'fa-temperature-half', 1),
('Electrónica', 'electronica', 'fa-plug', 2),
('Mobiliario', 'mobiliario', 'fa-couch', 3),
('Sanitarios', 'sanitarios', 'fa-shower', 4),
('Amenidades', 'amenidades', 'fa-concierge-bell', 5),
('Estructura', 'estructura', 'fa-door-open', 6)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- Datos iniciales: Ítems del Catálogo
-- ============================================
INSERT INTO checklist_catalog_items (nombre, categoria_id, orden) 
SELECT 'Aire acondicionado', id, 1 FROM checklist_categorias WHERE slug = 'climatizacion'
ON CONFLICT DO NOTHING;

INSERT INTO checklist_catalog_items (nombre, categoria_id, orden) 
SELECT 'Calefacción', id, 2 FROM checklist_categorias WHERE slug = 'climatizacion'
ON CONFLICT DO NOTHING;

INSERT INTO checklist_catalog_items (nombre, categoria_id, orden) 
SELECT 'Ventilación', id, 3 FROM checklist_categorias WHERE slug = 'climatizacion'
ON CONFLICT DO NOTHING;

INSERT INTO checklist_catalog_items (nombre, categoria_id, orden) 
SELECT 'Televisión', id, 1 FROM checklist_categorias WHERE slug = 'electronica'
ON CONFLICT DO NOTHING;

INSERT INTO checklist_catalog_items (nombre, categoria_id, orden) 
SELECT 'Teléfono', id, 2 FROM checklist_categorias WHERE slug = 'electronica'
ON CONFLICT DO NOTHING;

INSERT INTO checklist_catalog_items (nombre, categoria_id, orden) 
SELECT 'Control remoto', id, 3 FROM checklist_categorias WHERE slug = 'electronica'
ON CONFLICT DO NOTHING;

INSERT INTO checklist_catalog_items (nombre, categoria_id, orden) 
SELECT 'Iluminación', id, 4 FROM checklist_categorias WHERE slug = 'electronica'
ON CONFLICT DO NOTHING;

INSERT INTO checklist_catalog_items (nombre, categoria_id, orden) 
SELECT 'Sofá', id, 1 FROM checklist_categorias WHERE slug = 'mobiliario'
ON CONFLICT DO NOTHING;

INSERT INTO checklist_catalog_items (nombre, categoria_id, orden) 
SELECT 'Cama', id, 2 FROM checklist_categorias WHERE slug = 'mobiliario'
ON CONFLICT DO NOTHING;

INSERT INTO checklist_catalog_items (nombre, categoria_id, orden) 
SELECT 'Closet', id, 3 FROM checklist_categorias WHERE slug = 'mobiliario'
ON CONFLICT DO NOTHING;

INSERT INTO checklist_catalog_items (nombre, categoria_id, orden) 
SELECT 'Mesa de noche', id, 4 FROM checklist_categorias WHERE slug = 'mobiliario'
ON CONFLICT DO NOTHING;

INSERT INTO checklist_catalog_items (nombre, categoria_id, orden) 
SELECT 'Silla', id, 5 FROM checklist_categorias WHERE slug = 'mobiliario'
ON CONFLICT DO NOTHING;

INSERT INTO checklist_catalog_items (nombre, categoria_id, orden) 
SELECT 'Baño', id, 1 FROM checklist_categorias WHERE slug = 'sanitarios'
ON CONFLICT DO NOTHING;

INSERT INTO checklist_catalog_items (nombre, categoria_id, orden) 
SELECT 'Regadera', id, 2 FROM checklist_categorias WHERE slug = 'sanitarios'
ON CONFLICT DO NOTHING;

INSERT INTO checklist_catalog_items (nombre, categoria_id, orden) 
SELECT 'Lavabo', id, 3 FROM checklist_categorias WHERE slug = 'sanitarios'
ON CONFLICT DO NOTHING;

INSERT INTO checklist_catalog_items (nombre, categoria_id, orden) 
SELECT 'Inodoro', id, 4 FROM checklist_categorias WHERE slug = 'sanitarios'
ON CONFLICT DO NOTHING;

INSERT INTO checklist_catalog_items (nombre, categoria_id, orden) 
SELECT 'Minibar', id, 1 FROM checklist_categorias WHERE slug = 'amenidades'
ON CONFLICT DO NOTHING;

INSERT INTO checklist_catalog_items (nombre, categoria_id, orden) 
SELECT 'Caja fuerte', id, 2 FROM checklist_categorias WHERE slug = 'amenidades'
ON CONFLICT DO NOTHING;

INSERT INTO checklist_catalog_items (nombre, categoria_id, orden) 
SELECT 'Cafetera', id, 3 FROM checklist_categorias WHERE slug = 'amenidades'
ON CONFLICT DO NOTHING;

INSERT INTO checklist_catalog_items (nombre, categoria_id, orden) 
SELECT 'Ventanas', id, 1 FROM checklist_categorias WHERE slug = 'estructura'
ON CONFLICT DO NOTHING;

INSERT INTO checklist_catalog_items (nombre, categoria_id, orden) 
SELECT 'Cortinas', id, 2 FROM checklist_categorias WHERE slug = 'estructura'
ON CONFLICT DO NOTHING;

INSERT INTO checklist_catalog_items (nombre, categoria_id, orden) 
SELECT 'Puertas', id, 3 FROM checklist_categorias WHERE slug = 'estructura'
ON CONFLICT DO NOTHING;

INSERT INTO checklist_catalog_items (nombre, categoria_id, orden) 
SELECT 'Pisos', id, 4 FROM checklist_categorias WHERE slug = 'estructura'
ON CONFLICT DO NOTHING;

-- ============================================
-- Vista para obtener datos completos de checklist por cuarto
-- ============================================
CREATE OR REPLACE VIEW vista_checklist_cuartos AS
SELECT 
    c.id as cuarto_id,
    c.numero,
    c.estado as estado_cuarto,
    e.id as edificio_id,
    e.nombre as edificio_nombre,
    ci.id as item_id,
    ci.nombre as item_nombre,
    ci.orden as item_orden,
    cat.id as categoria_id,
    cat.slug as categoria_slug,
    cat.nombre as categoria_nombre,
    cat.icono as categoria_icono,
    cat.orden as categoria_orden,
    COALESCE(rcr.estado, 'bueno') as item_estado,
    rcr.observacion,
    rcr.foto_url,
    rcr.updated_at as fecha_ultima_edicion,
    u.nombre as ultimo_editor
FROM cuartos c
LEFT JOIN edificios e ON c.edificio_id = e.id
CROSS JOIN checklist_catalog_items ci
LEFT JOIN checklist_categorias cat ON ci.categoria_id = cat.id
LEFT JOIN room_checklist_results rcr ON rcr.cuarto_id = c.id AND rcr.catalog_item_id = ci.id
LEFT JOIN usuarios u ON rcr.ultimo_editor_id = u.id
WHERE ci.activo = TRUE AND (cat.activo = TRUE OR cat.activo IS NULL)
ORDER BY c.numero, cat.orden, ci.orden;
